import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  Tablero,
  TableroDetalle,
  TableroMiembro,
  Etiqueta,
  Columna,
  CreateTablero,
  UpdateTablero,
  CreateColumna,
  UpdateColumna,
  ReordenarColumna,
  CreateEtiqueta,
  UpdateMiembros
} from '../models/kanban.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class TablerosService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getByProyecto(proyectoId: string): Observable<Tablero[]> {
    return this.http
      .get<ApiResponse<Tablero[]>>(`${this.api}/tableros/proyecto/${proyectoId}`)
      .pipe(extractData());
  }

  getMisTableros(): Observable<Tablero[]> {
    return this.http
      .get<ApiResponse<Tablero[]>>(`${this.api}/tableros/mis-tableros`)
      .pipe(extractData());
  }

  getById(id: string): Observable<TableroDetalle> {
    return this.http.get<ApiResponse<TableroDetalle>>(`${this.api}/tableros/${id}`).pipe(extractData());
  }

  create(request: CreateTablero): Observable<Tablero> {
    return this.http.post<ApiResponse<Tablero>>(`${this.api}/tableros`, request).pipe(extractData());
  }

  update(id: string, request: UpdateTablero): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/tableros/${id}`, request).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/tableros/${id}`).pipe(map(() => void 0));
  }

  updateMiembros(id: string, request: UpdateMiembros): Observable<TableroMiembro[]> {
    return this.http
      .put<ApiResponse<TableroMiembro[]>>(`${this.api}/tableros/${id}/miembros`, request)
      .pipe(extractData());
  }

  // ---- Etiquetas ----

  getEtiquetas(tableroId: string): Observable<Etiqueta[]> {
    return this.http
      .get<ApiResponse<Etiqueta[]>>(`${this.api}/tableros/${tableroId}/etiquetas`)
      .pipe(extractData());
  }

  createEtiqueta(tableroId: string, request: CreateEtiqueta): Observable<Etiqueta> {
    return this.http
      .post<ApiResponse<Etiqueta>>(`${this.api}/tableros/${tableroId}/etiquetas`, request)
      .pipe(extractData());
  }

  updateEtiqueta(tableroId: string, etiquetaId: string, request: CreateEtiqueta): Observable<Etiqueta> {
    return this.http
      .put<ApiResponse<Etiqueta>>(`${this.api}/tableros/${tableroId}/etiquetas/${etiquetaId}`, request)
      .pipe(extractData());
  }

  deleteEtiqueta(tableroId: string, etiquetaId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/tableros/${tableroId}/etiquetas/${etiquetaId}`)
      .pipe(map(() => void 0));
  }

  // ---- Columnas ----

  createColumna(request: CreateColumna): Observable<Columna> {
    return this.http.post<ApiResponse<Columna>>(`${this.api}/columnas`, request).pipe(extractData());
  }

  updateColumna(id: string, request: UpdateColumna): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/columnas/${id}`, request).pipe(map(() => void 0));
  }

  reordenarColumna(id: string, request: ReordenarColumna): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.api}/columnas/${id}/reordenar`, request)
      .pipe(map(() => void 0));
  }

  deleteColumna(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/columnas/${id}`).pipe(map(() => void 0));
  }
}
