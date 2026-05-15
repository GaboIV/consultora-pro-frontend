import { Tone } from './management.models';

export type EstadoDespliegue = 'Exitoso' | 'Fallido' | 'EnCurso' | 'Cancelado';

export interface Despliegue {
  id: string;
  proyectoId: string;
  proyectoNombre: string;
  clienteNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  version: string;
  ejecutadoPorId: string;
  ejecutadoPorNombre: string;
  fechaHora: string;
  estado: EstadoDespliegue;
  duracionSegundos: number;
  notas: string;
}

export interface DespliegueListItem {
  id: string;
  proyectoNombre: string;
  clienteNombre: string;
  ambienteNombre: string;
  version: string;
  ejecutadoPorNombre: string;
  fechaHora: string;
  estado: EstadoDespliegue;
  duracionSegundos: number;
}

export interface CreateDespliegueRequest {
  proyectoId: string;
  ambienteId: string;
  version: string;
  duracionSegundos: number;
  notas: string;
}

export interface UpdateDespliegueEstadoRequest {
  estado: EstadoDespliegue;
  duracionSegundos?: number;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ESTADO_DESPLIEGUE_OPTIONS: { value: EstadoDespliegue; label: string; tone: Tone }[] = [
  { value: 'Exitoso', label: 'Exitoso', tone: 'green' },
  { value: 'Fallido', label: 'Fallido', tone: 'red' },
  { value: 'EnCurso', label: 'En curso', tone: 'amber' },
  { value: 'Cancelado', label: 'Cancelado', tone: 'gray' }
];

export function estadoDespliegueLabel(estado: EstadoDespliegue): string {
  return ESTADO_DESPLIEGUE_OPTIONS.find(o => o.value === estado)?.label ?? estado;
}

export function estadoDespliegueTone(estado: EstadoDespliegue): Tone {
  return ESTADO_DESPLIEGUE_OPTIONS.find(o => o.value === estado)?.tone ?? 'gray';
}

export function duracionLabel(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}m ${segundos % 60}s`;
  return `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60)}m`;
}
