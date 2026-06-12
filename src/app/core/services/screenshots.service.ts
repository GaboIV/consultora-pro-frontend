import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import { Screenshot } from '../models/screenshots.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class ScreenshotsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByProject(proyectoId: string): Observable<Screenshot[]> {
    return this.http.get<ApiResponse<Screenshot[]>>(`${this.api}/screenshots/proyecto/${proyectoId}`).pipe(extractData());
  }

  upload(proyectoId: string, nombre: string, version: string, descripcion: string, file: File): Observable<Screenshot> {
    const formData = new FormData();
    formData.append('proyectoId', proyectoId);
    formData.append('nombre', nombre);
    formData.append('version', version);
    formData.append('descripcion', descripcion);
    formData.append('file', file);

    return this.http.post<ApiResponse<Screenshot>>(`${this.api}/screenshots`, formData).pipe(extractData());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/screenshots/${id}`).pipe(map(() => void 0));
  }
}
