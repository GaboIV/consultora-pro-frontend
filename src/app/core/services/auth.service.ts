import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUserResponse, CurrentUser, LoginResponse } from '../models/security.models';

interface JwtPayload {
  exp?: number;
  userId?: string;
  nombres?: string;
  apellidos?: string;
  iniciales?: string;
  email?: string;
  telefono?: string;
  puesto?: string;
  fechaAlta?: string;
  ultimoAcceso?: string;
  role?: string;
  permisos?: string[] | string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.apiBaseUrl;
  private readonly tokenKey = 'consultorapro_token';

  readonly currentUser$ = new BehaviorSubject<CurrentUser | null>(this.getUser());

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        this.currentUser$.next(this.mapResponseUser(response.user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('cp_search_history');
    this.currentUser$.next(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): CurrentUser | null {
    const payload = this.getPayload();
    if (!payload || this.isExpired(payload)) {
      return null;
    }

    return {
      userId: payload.userId ?? '',
      nombres: payload.nombres ?? '',
      apellidos: payload.apellidos ?? '',
      iniciales: payload.iniciales ?? '',
      email: payload.email ?? '',
      telefono: payload.telefono ?? '',
      puesto: payload.puesto ?? '',
      rol: payload.role ?? '',
      fechaAlta: payload.fechaAlta ?? '',
      ultimoAcceso: payload.ultimoAcceso ?? null,
      permisos: this.normalizePermissions(payload.permisos)
    };
  }

  hasPermission(clave: string): boolean {
    return this.getUser()?.permisos.includes(clave) ?? false;
  }

  hasRole(rol: string): boolean {
    return this.getUser()?.rol.toLowerCase() === rol.toLowerCase();
  }

  isAuthenticated(): boolean {
    const payload = this.getPayload();
    return !!payload && !this.isExpired(payload);
  }

  refreshCurrentUser(): Observable<CurrentUser> {
    return this.http.get<AuthUserResponse>(`${this.api}/auth/me`).pipe(
      map((user) => this.mapResponseUser(user)),
      tap((user) => this.currentUser$.next(user))
    );
  }

  updatePerfil(request: { nombres: string; apellidos: string; telefono: string; iniciales: string }): Observable<LoginResponse> {
    return this.http.put<ApiResponse<LoginResponse>>(`${this.api}/auth/perfil`, request).pipe(
      map((res) => res.data!),
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.token);
        this.currentUser$.next(this.mapResponseUser(response.user));
      })
    );
  }

  cambiarPassword(request: { passwordActual: string; passwordNueva: string }): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/auth/cambiar-password`, request);
  }

  private mapResponseUser(user: AuthUserResponse): CurrentUser {
    return {
      userId: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      iniciales: user.iniciales,
      email: user.email,
      telefono: user.telefono,
      puesto: user.puesto,
      rol: user.rol,
      fechaAlta: user.fechaAlta,
      ultimoAcceso: user.ultimoAcceso,
      permisos: user.permisos ?? []
    };
  }

  private getPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    try {
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      return JSON.parse(decodeURIComponent(escape(atob(padded)))) as JwtPayload;
    } catch {
      return null;
    }
  }

  private normalizePermissions(value: JwtPayload['permisos']): string[] {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [value];
    }
  }

  private isExpired(payload: JwtPayload): boolean {
    if (!payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }
}
