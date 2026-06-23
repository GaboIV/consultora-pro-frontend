import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';

export interface TipoSolucionAdmin {
  id: string;
  nombre: string;
  activo: boolean;
  totalProyectos: number;
}

export interface TipoSolucionPayload {
  nombre: string;
  activo: boolean;
}

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class TiposSolucionService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/tipos-solucion`;

  getAll(): Observable<TipoSolucionAdmin[]> {
    return this.http.get<ApiResponse<TipoSolucionAdmin[]>>(this.api).pipe(extractData());
  }

  create(payload: TipoSolucionPayload): Observable<TipoSolucionAdmin> {
    return this.http.post<ApiResponse<TipoSolucionAdmin>>(this.api, payload).pipe(extractData());
  }

  update(id: string, payload: TipoSolucionPayload): Observable<void> {
    return this.http.put<ApiResponse<undefined>>(`${this.api}/${id}`, payload).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<undefined>>(`${this.api}/${id}`).pipe(map(() => void 0));
  }
}
