import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';

export interface OrganigramaResumen {
  id: string;
  nombre: string;
  descripcion: string;
  totalNodos: number;
  totalAsignados: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface OrganigramaUsuario {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  correo: string;
  puesto: string;
  activo: boolean;
  avatarUrl: string | null;
}

export interface OrganigramaNodo {
  id: string;
  parentId: string | null;
  cargo: string;
  area: string;
  nombreLibre: string;
  usuarioId: string | null;
  usuario: OrganigramaUsuario | null;
  notas: string;
  color: string;
  orden: number;
}

export interface Organigrama {
  id: string;
  nombre: string;
  descripcion: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  nodos: OrganigramaNodo[];
}

export type OrganigramaNodoPayload = Omit<OrganigramaNodo, 'usuario'>;

/** El árbol completo viaja en cada guardado; los ids de nodo los genera el cliente. */
export interface OrganigramaPayload {
  nombre: string;
  descripcion: string;
  nodos: OrganigramaNodoPayload[];
}

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class OrganigramasService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiBaseUrl}/organigramas`;

  getAll(): Observable<OrganigramaResumen[]> {
    return this.http.get<ApiResponse<OrganigramaResumen[]>>(this.api).pipe(extractData());
  }

  getById(id: string): Observable<Organigrama> {
    return this.http.get<ApiResponse<Organigrama>>(`${this.api}/${id}`).pipe(extractData());
  }

  getUsuariosDisponibles(): Observable<OrganigramaUsuario[]> {
    return this.http.get<ApiResponse<OrganigramaUsuario[]>>(`${this.api}/usuarios-disponibles`).pipe(extractData());
  }

  create(payload: OrganigramaPayload): Observable<Organigrama> {
    return this.http.post<ApiResponse<Organigrama>>(this.api, payload).pipe(extractData());
  }

  update(id: string, payload: OrganigramaPayload): Observable<Organigrama> {
    return this.http.put<ApiResponse<Organigrama>>(`${this.api}/${id}`, payload).pipe(extractData());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<undefined>>(`${this.api}/${id}`).pipe(map(() => void 0));
  }
}
