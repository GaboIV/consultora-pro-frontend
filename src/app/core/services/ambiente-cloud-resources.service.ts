import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  AmbienteCloudResource,
  CreateAmbienteCloudResourceRequest,
  UpdateAmbienteCloudResourceRequest,
  ImportCloudResourcesCsvRequest,
  ImportCloudResourcesCsvResponse
} from '../models/ambientes.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class AmbienteCloudResourcesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByAmbiente(ambienteId: string): Observable<AmbienteCloudResource[]> {
    return this.http.get<ApiResponse<AmbienteCloudResource[]>>(`${this.api}/ambientes/${ambienteId}/cloud-resources`).pipe(extractData());
  }

  create(request: CreateAmbienteCloudResourceRequest): Observable<AmbienteCloudResource> {
    return this.http.post<ApiResponse<AmbienteCloudResource>>(`${this.api}/ambientes/${request.ambienteId}/cloud-resources`, request).pipe(extractData());
  }

  update(ambienteId: string, id: string, request: UpdateAmbienteCloudResourceRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/cloud-resources/${id}`, request).pipe(map(() => void 0));
  }

  delete(ambienteId: string, id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/ambientes/${ambienteId}/cloud-resources/${id}`).pipe(map(() => void 0));
  }

  importCsv(ambienteId: string, request: ImportCloudResourcesCsvRequest): Observable<ImportCloudResourcesCsvResponse> {
    return this.http.post<ApiResponse<ImportCloudResourcesCsvResponse>>(`${this.api}/ambientes/${ambienteId}/cloud-resources/import-csv`, request).pipe(extractData());
  }
}
