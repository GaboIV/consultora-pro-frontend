import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, interval, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Notificacion,
  PreferenciaNotificacion,
  ResumenNotificaciones,
  UpdatePreferenciaNotificacion
} from '../models/notificaciones.models';
import { ApiResponse, PagedResult } from '../models/security.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly api = `${environment.apiBaseUrl}/notificaciones`;

  /** Contador para el badge; se refresca por polling liviano. */
  readonly noLeidas = signal(0);
  readonly notificaciones = signal<Notificacion[]>([]);
  readonly cargando = signal(false);
  readonly hayMas = signal(false);

  private page = 1;
  private readonly pageSize = 15;
  private pollingSub: Subscription | null = null;

  constructor() {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  startPolling(): void {
    this.stopPolling();
    this.fetchResumen();
    // Solo el contador cada 60 s; la lista se carga al abrir la campana.
    this.pollingSub = interval(60000).subscribe(() => this.fetchResumen());
  }

  stopPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
    this.noLeidas.set(0);
    this.notificaciones.set([]);
  }

  fetchResumen(): void {
    this.http.get<ApiResponse<ResumenNotificaciones>>(`${this.api}/resumen`).subscribe({
      next: (res) => this.noLeidas.set(res.data?.noLeidas ?? 0),
      error: (err) => console.error('Error consultando notificaciones:', err)
    });
  }

  fetchNotificaciones(reset = true): void {
    if (reset) {
      this.page = 1;
    }
    this.cargando.set(true);
    this.http
      .get<ApiResponse<PagedResult<Notificacion>>>(this.api, {
        params: { page: this.page, pageSize: this.pageSize }
      })
      .subscribe({
        next: (res) => {
          const data = res.data;
          if (data) {
            this.notificaciones.set(reset ? data.data : [...this.notificaciones(), ...data.data]);
            this.hayMas.set(data.page < data.totalPages);
          }
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando notificaciones:', err);
          this.cargando.set(false);
        }
      });
  }

  cargarMas(): void {
    if (this.cargando() || !this.hayMas()) {
      return;
    }
    this.page += 1;
    this.fetchNotificaciones(false);
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) {
      return;
    }
    this.notificaciones.update((items) =>
      items.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n))
    );
    this.noLeidas.update((count) => Math.max(0, count - 1));
    this.http.put<ApiResponse<unknown>>(`${this.api}/${notificacion.id}/leer`, {}).subscribe({
      error: (err) => console.error('Error marcando notificación:', err)
    });
  }

  marcarTodasLeidas(): void {
    this.notificaciones.update((items) => items.map((n) => ({ ...n, leida: true })));
    this.noLeidas.set(0);
    this.http.put<ApiResponse<unknown>>(`${this.api}/leer-todas`, {}).subscribe({
      error: (err) => console.error('Error marcando notificaciones:', err)
    });
  }

  getPreferencias(): Observable<PreferenciaNotificacion[]> {
    return this.http
      .get<ApiResponse<PreferenciaNotificacion[]>>(`${this.api}/preferencias`)
      .pipe(map((res) => res.data ?? []));
  }

  updatePreferencias(preferencias: UpdatePreferenciaNotificacion[]): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/preferencias`, { preferencias });
  }
}
