import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/security.models';
import {
  AuditoriaCredencial,
  CreateCredencialRequest,
  CredencialListItem,
  CredencialReveal,
  EstadoSolicitudRevelacion,
  ImportCredencialRow,
  ImportResult,
  SolicitudRevelacion,
  UpdateCredencialRequest
} from '../models/credenciales.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class CredencialesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getCredenciales(proyectoId?: string | null): Observable<CredencialListItem[]> {
    let params = new HttpParams().set('page', '1').set('pageSize', '500');
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http
      .get<ApiResponse<PagedResult<CredencialListItem>>>(`${this.api}/credenciales`, { params })
      .pipe(map(response => response.data?.data ?? []));
  }

  create(request: CreateCredencialRequest): Observable<CredencialListItem> {
    return this.http.post<ApiResponse<CredencialListItem>>(`${this.api}/credenciales`, request).pipe(extractData());
  }

  update(id: string, request: UpdateCredencialRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/credenciales/${id}`, request).pipe(map(() => void 0));
  }

  updateValor(id: string, valor: string, secretosExtra?: Record<string, string> | null): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.api}/credenciales/${id}/valor`, { valor, secretosExtra: secretosExtra ?? null })
      .pipe(map(() => void 0));
  }

  /** Audita en segundo plano que el usuario copió un dato sensible. */
  registrarCopiado(id: string, campo?: string): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.api}/credenciales/${id}/copiado`, { campo: campo ?? null })
      .pipe(map(() => void 0));
  }

  importar(filas: ImportCredencialRow[]): Observable<ImportResult> {
    return this.http.post<ApiResponse<ImportResult>>(`${this.api}/credenciales/importar`, { filas }).pipe(extractData());
  }

  reveal(id: string): Observable<CredencialReveal> {
    return this.http.get<ApiResponse<CredencialReveal>>(`${this.api}/credenciales/${id}/revelar`).pipe(extractData());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/credenciales/${id}`).pipe(map(() => void 0));
  }

  getAudit(id: string): Observable<AuditoriaCredencial[]> {
    return this.http.get<ApiResponse<AuditoriaCredencial[]>>(`${this.api}/credenciales/${id}/auditoria`).pipe(extractData());
  }

  // ─── Solicitudes de revelación ────────────────────────────────────────────

  /** Nivel básico: solicita autorización para revelar los secretos de una credencial. */
  solicitarRevelacion(id: string, motivo?: string | null): Observable<SolicitudRevelacion> {
    return this.http
      .post<ApiResponse<SolicitudRevelacion>>(`${this.api}/credenciales/${id}/solicitudes`, { motivo: motivo ?? null })
      .pipe(extractData());
  }

  /** Solicitudes creadas por el usuario actual (para ver su estado). */
  getMisSolicitudes(): Observable<SolicitudRevelacion[]> {
    return this.http
      .get<ApiResponse<SolicitudRevelacion[]>>(`${this.api}/credenciales/mis-solicitudes`)
      .pipe(extractData());
  }

  /** Bandeja del aprobador (requiere credenciales.solicitud.aprobar). */
  getSolicitudes(estado?: EstadoSolicitudRevelacion): Observable<SolicitudRevelacion[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http
      .get<ApiResponse<SolicitudRevelacion[]>>(`${this.api}/credenciales/solicitudes`, { params })
      .pipe(extractData());
  }

  aprobarSolicitud(solicitudId: string, nota?: string | null): Observable<SolicitudRevelacion> {
    return this.http
      .post<ApiResponse<SolicitudRevelacion>>(`${this.api}/credenciales/solicitudes/${solicitudId}/aprobar`, { nota: nota ?? null })
      .pipe(extractData());
  }

  rechazarSolicitud(solicitudId: string, nota?: string | null): Observable<SolicitudRevelacion> {
    return this.http
      .post<ApiResponse<SolicitudRevelacion>>(`${this.api}/credenciales/solicitudes/${solicitudId}/rechazar`, { nota: nota ?? null })
      .pipe(extractData());
  }
}
