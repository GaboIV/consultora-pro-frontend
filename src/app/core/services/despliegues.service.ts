import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  DespliegueListItem,
  Despliegue,
  CreateDespliegueRequest,
  UpdateDespliegueEstadoRequest,
  PagedResult
} from '../models/despliegues.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class DesplieguesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getAll(page = 1, pageSize = 50): Observable<PagedResult<DespliegueListItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http.get<ApiResponse<PagedResult<DespliegueListItem>>>(`${this.api}/despliegues`, { params }).pipe(extractData());
  }

  getByProject(proyectoId: string, page = 1, pageSize = 50): Observable<PagedResult<DespliegueListItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http.get<ApiResponse<PagedResult<DespliegueListItem>>>(`${this.api}/despliegues/proyecto/${proyectoId}`, { params }).pipe(extractData());
  }

  getRecent(): Observable<DespliegueListItem[]> {
    return this.http.get<ApiResponse<DespliegueListItem[]>>(`${this.api}/despliegues/recientes`).pipe(extractData());
  }

  getById(id: string): Observable<Despliegue> {
    return this.http.get<ApiResponse<Despliegue>>(`${this.api}/despliegues/${id}`).pipe(extractData());
  }

  create(request: CreateDespliegueRequest): Observable<Despliegue> {
    return this.http.post<ApiResponse<Despliegue>>(`${this.api}/despliegues`, request).pipe(extractData());
  }

  updateEstado(id: string, request: UpdateDespliegueEstadoRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/despliegues/${id}/estado`, request).pipe(map(() => void 0));
  }
}
