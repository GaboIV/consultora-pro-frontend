import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  CreateRolRequest,
  CreateUsuarioRequest,
  PermisoModulo,
  PagedResult,
  RolDetalle,
  RolListItem,
  UpdateRolPermisosRequest,
  UpdateRolRequest,
  UpdateUsuarioPasswordRequest,
  UpdateUsuarioRequest,
  UsuarioDetalle,
  UsuarioListItem
} from '../models/security.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class SecurityAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getUsuarios(page = 1, pageSize = 20, rol?: string): Observable<PagedResult<UsuarioListItem>> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (rol) params = params.set('rol', rol);
    return this.http.get<ApiResponse<PagedResult<UsuarioListItem>>>(`${this.api}/usuarios`, { params }).pipe(extractData());
  }

  getUsuario(id: string): Observable<UsuarioDetalle> {
    return this.http.get<ApiResponse<UsuarioDetalle>>(`${this.api}/usuarios/${id}`).pipe(extractData());
  }

  createUsuario(request: CreateUsuarioRequest): Observable<UsuarioListItem> {
    return this.http.post<ApiResponse<UsuarioListItem>>(`${this.api}/usuarios`, request).pipe(extractData());
  }

  updateUsuario(id: string, request: UpdateUsuarioRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/usuarios/${id}`, request).pipe(map(() => void 0));
  }

  updateUsuarioPassword(id: string, request: UpdateUsuarioPasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/usuarios/${id}/password`, request).pipe(map(() => void 0));
  }

  toggleUsuario(id: string): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/usuarios/${id}/toggle`, {}).pipe(map(() => void 0));
  }

  deleteUsuario(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/usuarios/${id}`).pipe(map(() => void 0));
  }

  getRoles(): Observable<RolListItem[]> {
    return this.http.get<ApiResponse<RolListItem[]>>(`${this.api}/roles`).pipe(extractData());
  }

  getRol(id: string): Observable<RolDetalle> {
    return this.http.get<ApiResponse<RolDetalle>>(`${this.api}/roles/${id}`).pipe(extractData());
  }

  createRol(request: CreateRolRequest): Observable<RolListItem> {
    return this.http.post<ApiResponse<RolListItem>>(`${this.api}/roles`, request).pipe(extractData());
  }

  updateRol(id: string, request: UpdateRolRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/roles/${id}`, request).pipe(map(() => void 0));
  }

  updateRolPermisos(id: string, request: UpdateRolPermisosRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/roles/${id}/permisos`, request).pipe(map(() => void 0));
  }

  deleteRol(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/roles/${id}`).pipe(map(() => void 0));
  }

  getPermisos(): Observable<PermisoModulo[]> {
    return this.http.get<ApiResponse<PermisoModulo[]>>(`${this.api}/permisos`).pipe(extractData());
  }
}
