import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  Repositorio,
  CreateRepositorioRequest,
  UpdateRepositorioRequest
} from '../models/repositorios.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class RepositoriosService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getAll(proyectoId?: string | null): Observable<Repositorio[]> {
    let params = new HttpParams();
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<ApiResponse<Repositorio[]>>(`${this.api}/repositorios`, { params }).pipe(extractData());
  }

  getByProject(proyectoId: string): Observable<Repositorio[]> {
    return this.http.get<ApiResponse<Repositorio[]>>(`${this.api}/repositorios/proyecto/${proyectoId}`).pipe(extractData());
  }

  create(request: CreateRepositorioRequest): Observable<Repositorio> {
    return this.http.post<ApiResponse<Repositorio>>(`${this.api}/repositorios`, request).pipe(extractData());
  }

  update(id: string, request: UpdateRepositorioRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/repositorios/${id}`, request).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/repositorios/${id}`).pipe(map(() => void 0));
  }
}
