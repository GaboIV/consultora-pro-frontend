import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/security.models';
import { Project } from '../models/management.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getProjects(page = 1, pageSize = 20, estado?: string, clienteId?: string): Observable<PagedResult<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (estado) params = params.set('estado', estado);
    if (clienteId) params = params.set('clienteId', clienteId);
    return this.http.get<ApiResponse<PagedResult<Project>>>(`${this.api}/proyectos`, { params }).pipe(extractData());
  }
}
