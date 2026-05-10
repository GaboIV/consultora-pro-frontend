import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  Ambiente,
  CreateAmbienteRequest,
  UpdateAmbienteEstadoRequest,
  UpdateAmbienteRequest
} from '../models/ambientes.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class AmbientesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getAmbientes(proyectoId?: string | null): Observable<Ambiente[]> {
    let params = new HttpParams();
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<ApiResponse<Ambiente[]>>(`${this.api}/ambientes`, { params }).pipe(extractData());
  }

  getByProject(proyectoId: string): Observable<Ambiente[]> {
    return this.http.get<ApiResponse<Ambiente[]>>(`${this.api}/ambientes/proyecto/${proyectoId}`).pipe(extractData());
  }

  create(request: CreateAmbienteRequest): Observable<Ambiente> {
    return this.http.post<ApiResponse<Ambiente>>(`${this.api}/ambientes`, request).pipe(extractData());
  }

  update(id: string, request: UpdateAmbienteRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/ambientes/${id}`, request).pipe(map(() => void 0));
  }

  updateEstado(id: string, request: UpdateAmbienteEstadoRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/ambientes/${id}/estado`, request).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/ambientes/${id}`).pipe(map(() => void 0));
  }
}
