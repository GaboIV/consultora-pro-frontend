import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  AmbienteTestUser,
  CreateAmbienteTestUserRequest,
  UpdateAmbienteTestUserRequest
} from '../models/ambientes.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class AmbienteTestUsersService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByAmbiente(ambienteId: string): Observable<AmbienteTestUser[]> {
    return this.http.get<ApiResponse<AmbienteTestUser[]>>(`${this.api}/ambientes/${ambienteId}/test-users`).pipe(extractData());
  }

  create(request: CreateAmbienteTestUserRequest): Observable<AmbienteTestUser> {
    return this.http.post<ApiResponse<AmbienteTestUser>>(`${this.api}/ambientes/${request.ambienteId}/test-users`, request).pipe(extractData());
  }

  update(ambienteId: string, id: string, request: UpdateAmbienteTestUserRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/test-users/${id}`, request).pipe(map(() => void 0));
  }

  delete(ambienteId: string, id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/test-users/${id}`).pipe(map(() => void 0));
  }
}
