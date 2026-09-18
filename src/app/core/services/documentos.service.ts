import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import {
  ActualizarDocumentoPayload,
  CarpetaDocumento,
  DocumentacionProyecto,
  Documento,
  NuevaVersionPayload,
  SubirDocumentoPayload
} from '../models/documentos.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

/** Evento de subida: progreso 0–100 o el documento resultante al terminar. */
export type UploadEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; documento: Documento };

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/documentos`;

  getByProject(proyectoId: string): Observable<DocumentacionProyecto> {
    return this.http.get<ApiResponse<DocumentacionProyecto>>(`${this.api}/proyecto/${proyectoId}`).pipe(extractData());
  }

  upload(payload: SubirDocumentoPayload): Observable<UploadEvent> {
    const form = new FormData();
    form.append('proyectoId', payload.proyectoId);
    form.append('carpetaId', payload.carpetaId);
    form.append('titulo', payload.titulo);
    form.append('tipo', payload.tipo);
    form.append('estado', payload.estado);
    form.append('version', payload.version);
    form.append('descripcion', payload.descripcion);
    payload.etiquetas.forEach(e => form.append('etiquetas', e));
    form.append('file', payload.file);
    return this.withProgress(this.http.post<ApiResponse<Documento>>(this.api, form, { reportProgress: true, observe: 'events' }));
  }

  uploadVersion(documentoId: string, payload: NuevaVersionPayload): Observable<UploadEvent> {
    const form = new FormData();
    form.append('version', payload.version);
    form.append('nota', payload.nota);
    if (payload.estado) form.append('estado', payload.estado);
    form.append('file', payload.file);
    return this.withProgress(
      this.http.post<ApiResponse<Documento>>(`${this.api}/${documentoId}/versiones`, form, { reportProgress: true, observe: 'events' })
    );
  }

  update(documentoId: string, payload: ActualizarDocumentoPayload): Observable<Documento> {
    return this.http.put<ApiResponse<Documento>>(`${this.api}/${documentoId}`, payload).pipe(extractData());
  }

  delete(documentoId: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/${documentoId}`).pipe(map(() => void 0));
  }

  /**
   * Descarga autenticada (Bearer) con el nombre original. Se usa blob porque un <a href> directo
   * no enviaría el token.
   */
  download(documentoId: string, fileName: string, versionId?: string): Observable<void> {
    const params: Record<string, string> = versionId ? { versionId } : {};
    return this.http.get(`${this.api}/${documentoId}/descargar`, { params, responseType: 'blob' }).pipe(
      map(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
    );
  }

  createFolder(proyectoId: string, parentId: string | null, nombre: string, descripcion: string): Observable<CarpetaDocumento> {
    return this.http
      .post<ApiResponse<CarpetaDocumento>>(`${this.api}/carpetas`, { proyectoId, parentId, nombre, descripcion })
      .pipe(extractData());
  }

  renameFolder(carpetaId: string, nombre: string, descripcion: string): Observable<CarpetaDocumento> {
    return this.http
      .put<ApiResponse<CarpetaDocumento>>(`${this.api}/carpetas/${carpetaId}`, { nombre, descripcion })
      .pipe(extractData());
  }

  deleteFolder(carpetaId: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.api}/carpetas/${carpetaId}`).pipe(map(() => void 0));
  }

  private withProgress(events$: Observable<HttpEvent<ApiResponse<Documento>>>): Observable<UploadEvent> {
    return events$.pipe(
      filter(e => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e): UploadEvent => {
        if (e.type === HttpEventType.UploadProgress) {
          return { kind: 'progress', percent: e.total ? Math.round((e.loaded / e.total) * 100) : 0 };
        }
        return { kind: 'done', documento: (e as { body: ApiResponse<Documento> }).body.data as Documento };
      })
    );
  }
}
