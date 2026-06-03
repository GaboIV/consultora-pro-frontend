import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ManagementSnapshot, CreateClientCommand, UpdateClientCommand, CreateProjectCommand, UpdateProjectCommand } from '../models/management.models';
import { ManagementRepository } from './management.repository';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: string[];
}

function extractData<T>() {
  return map((res: ApiResponse<T>) => res.data as T);
}

@Injectable()
export class ApiManagementRepository implements ManagementRepository {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getSnapshot(period?: string): Observable<ManagementSnapshot> {
    let url = `${this.api}/management/snapshot`;
    if (period) {
      url += `?period=${period}`;
    }
    return this.http.get<ApiResponse<ManagementSnapshot>>(url).pipe(extractData());
  }

  createClient(command: CreateClientCommand): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.api}/clientes`, command).pipe(extractData());
  }

  updateClient(id: string, command: UpdateClientCommand): Observable<void> {
    return this.http.put<ApiResponse<undefined>>(`${this.api}/clientes/${id}`, command).pipe(map(() => void 0));
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<ApiResponse<undefined>>(`${this.api}/clientes/${id}`).pipe(map(() => void 0));
  }

  createProject(command: CreateProjectCommand): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.api}/proyectos`, command).pipe(extractData());
  }

  updateProject(id: string, command: UpdateProjectCommand): Observable<void> {
    return this.http.put<ApiResponse<undefined>>(`${this.api}/proyectos/${id}`, command).pipe(map(() => void 0));
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<ApiResponse<undefined>>(`${this.api}/proyectos/${id}`).pipe(map(() => void 0));
  }
}
