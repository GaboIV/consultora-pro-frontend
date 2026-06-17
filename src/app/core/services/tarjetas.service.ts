import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  TarjetaDetalle,
  Responsable,
  Etiqueta,
  ChecklistItem,
  Comentario,
  Adjunto,
  Actividad,
  CreateTarjeta,
  UpdateTarjeta,
  MoverTarjeta,
  CreateComentario,
  CreateChecklistItem,
  UpdateChecklistItem
} from '../models/kanban.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class TarjetasService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getById(id: string): Observable<TarjetaDetalle> {
    return this.http.get<ApiResponse<TarjetaDetalle>>(`${this.api}/tarjetas/${id}`).pipe(extractData());
  }

  create(request: CreateTarjeta): Observable<TarjetaDetalle> {
    return this.http.post<ApiResponse<TarjetaDetalle>>(`${this.api}/tarjetas`, request).pipe(extractData());
  }

  update(id: string, request: UpdateTarjeta): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}`, request).pipe(map(() => void 0));
  }

  mover(id: string, request: MoverTarjeta): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}/mover`, request).pipe(map(() => void 0));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}`).pipe(map(() => void 0));
  }

  setResponsables(id: string, usuarioIds: string[]): Observable<Responsable[]> {
    return this.http
      .put<ApiResponse<Responsable[]>>(`${this.api}/tarjetas/${id}/responsables`, { usuarioIds })
      .pipe(extractData());
  }

  setEtiquetas(id: string, etiquetaIds: string[]): Observable<Etiqueta[]> {
    return this.http
      .put<ApiResponse<Etiqueta[]>>(`${this.api}/tarjetas/${id}/etiquetas`, { etiquetaIds })
      .pipe(extractData());
  }

  // ---- Checklist ----

  addChecklistItem(id: string, request: CreateChecklistItem): Observable<ChecklistItem> {
    return this.http
      .post<ApiResponse<ChecklistItem>>(`${this.api}/tarjetas/${id}/checklist`, request)
      .pipe(extractData());
  }

  updateChecklistItem(id: string, itemId: string, request: UpdateChecklistItem): Observable<ChecklistItem> {
    return this.http
      .put<ApiResponse<ChecklistItem>>(`${this.api}/tarjetas/${id}/checklist/${itemId}`, request)
      .pipe(extractData());
  }

  deleteChecklistItem(id: string, itemId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}/checklist/${itemId}`)
      .pipe(map(() => void 0));
  }

  // ---- Comentarios ----

  addComentario(id: string, request: CreateComentario): Observable<Comentario> {
    return this.http
      .post<ApiResponse<Comentario>>(`${this.api}/tarjetas/${id}/comentarios`, request)
      .pipe(extractData());
  }

  deleteComentario(id: string, comentarioId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}/comentarios/${comentarioId}`)
      .pipe(map(() => void 0));
  }

  // ---- Adjuntos ----

  addAdjunto(id: string, file: File): Observable<Adjunto> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<Adjunto>>(`${this.api}/tarjetas/${id}/adjuntos`, form)
      .pipe(extractData());
  }

  uploadImagenInline(id: string, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string }>>(`${this.api}/tarjetas/${id}/imagenes`, form)
      .pipe(extractData());
  }

  deleteAdjunto(id: string, adjuntoId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/tarjetas/${id}/adjuntos/${adjuntoId}`)
      .pipe(map(() => void 0));
  }

  // ---- Actividad ----

  getActividad(id: string): Observable<Actividad[]> {
    return this.http.get<ApiResponse<Actividad[]>>(`${this.api}/tarjetas/${id}/actividad`).pipe(extractData());
  }
}
