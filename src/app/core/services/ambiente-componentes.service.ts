import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  AmbienteComponente,
  CreateAmbienteComponenteRequest,
  UpdateAmbienteComponenteRequest
} from '../models/ambientes.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class AmbienteComponentesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByAmbiente(ambienteId: string): Observable<AmbienteComponente[]> {
    return this.http.get<ApiResponse<AmbienteComponente[]>>(`${this.api}/ambientes/${ambienteId}/componentes`).pipe(extractData());
  }

  create(request: CreateAmbienteComponenteRequest): Observable<AmbienteComponente> {
    return this.http.post<ApiResponse<AmbienteComponente>>(`${this.api}/ambientes/${request.ambienteId}/componentes`, request).pipe(extractData());
  }

  update(ambienteId: string, id: string, request: UpdateAmbienteComponenteRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/componentes/${id}`, request).pipe(map(() => void 0));
  }

  delete(ambienteId: string, id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/componentes/${id}`).pipe(map(() => void 0));
  }
}
