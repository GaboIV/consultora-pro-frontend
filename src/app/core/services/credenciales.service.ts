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

  updateValor(id: string, valor: string): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/credenciales/${id}/valor`, { valor }).pipe(map(() => void 0));
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
}
