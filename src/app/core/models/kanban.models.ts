import { Tone } from './management.models';

export type PrioridadTarjeta = 'Baja' | 'Media' | 'Alta' | 'Critica';
export type RolTablero = 'Owner' | 'Colaborador';
export type TipoActividadTarjeta =
  | 'Creada' | 'Editada' | 'Movida' | 'Asignada' | 'Desasignada'
  | 'Comentada' | 'EtiquetaAgregada' | 'EtiquetaQuitada'
  | 'Completada' | 'Reabierta' | 'Archivada' | 'Restaurada';

export interface Tablero {
  id: string;
  proyectoId: string;
  nombre: string;
  clave: string;
  descripcion?: string;
  colorClass: string;
  orden: number;
  totalColumnas: number;
  totalTarjetas: number;
  totalMiembros: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface TableroDetalle {
  id: string;
  proyectoId: string;
  proyectoNombre: string;
  proyectoClave: string;
  nombre: string;
  clave: string;
  descripcion?: string;
  colorClass: string;
  orden: number;
  columnas: Columna[];
  etiquetas: Etiqueta[];
  miembros: TableroMiembro[];
}

export interface TableroMiembro {
  usuarioId: string;
  nombreCompleto: string;
  iniciales: string;
  rol: RolTablero;
}

export interface Columna {
  id: string;
  tableroId: string;
  nombre: string;
  orden: number;
  limiteWip?: number | null;
  tarjetas: Tarjeta[];
}

export interface Responsable {
  usuarioId: string;
  nombreCompleto: string;
  iniciales: string;
}

export interface Etiqueta {
  id: string;
  nombre: string;
  colorClass: string;
}

export interface Tarjeta {
  id: string;
  columnaId: string;
  tableroId: string;
  numero: number;
  codigo: string;
  titulo: string;
  orden: number;
  prioridad: PrioridadTarjeta;
  fechaLimite?: string | null;
  completada: boolean;
  responsables: Responsable[];
  etiquetas: Etiqueta[];
  checklistCompletados: number;
  checklistTotal: number;
  totalComentarios: number;
  totalAdjuntos: number;
}

export interface TarjetaDetalle extends Tarjeta {
  descripcion?: string;
  fechaInicio?: string | null;
  fechaCreacion: string;
  updatedAt: string;
  creadaPorId?: string | null;
  creadaPorNombre?: string | null;
  checklist: ChecklistItem[];
  comentarios: Comentario[];
  adjuntos: Adjunto[];
}

export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  orden: number;
}

export interface Comentario {
  id: string;
  texto: string;
  autorId: string;
  autorNombre: string;
  autorIniciales: string;
  fechaCreacion: string;
  editadoEn?: string | null;
}

export interface Adjunto {
  id: string;
  nombre: string;
  url: string;
  contentType?: string | null;
  tamanoBytes: number;
  subidoPorId?: string | null;
  subidoPorNombre?: string | null;
  fechaSubida: string;
}

export interface Actividad {
  id: string;
  tipo: TipoActividadTarjeta;
  detalle?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  fecha: string;
}

// ---- Request types (espejan los DTOs del backend) ----

export interface CreateTablero {
  proyectoId: string;
  nombre: string;
  clave?: string;
  descripcion?: string;
  colorClass?: string;
  crearColumnasPorDefecto?: boolean;
}

export interface UpdateTablero {
  nombre: string;
  clave: string;
  descripcion?: string;
  colorClass: string;
}

export interface CreateColumna {
  tableroId: string;
  nombre: string;
  limiteWip?: number | null;
}

export interface UpdateColumna {
  nombre: string;
  limiteWip?: number | null;
}

export interface ReordenarColumna {
  antesDeColumnaId?: string | null;
  despuesDeColumnaId?: string | null;
}

export interface CreateTarjeta {
  columnaId: string;
  titulo: string;
  descripcion?: string;
  prioridad?: PrioridadTarjeta;
  fechaLimite?: string | null;
  fechaInicio?: string | null;
  responsableIds?: string[];
  etiquetaIds?: string[];
}

export interface UpdateTarjeta {
  titulo: string;
  descripcion?: string;
  prioridad: PrioridadTarjeta;
  fechaLimite?: string | null;
  fechaInicio?: string | null;
  completada: boolean;
}

export interface MoverTarjeta {
  columnaDestinoId: string;
  antesDeTarjetaId?: string | null;
  despuesDeTarjetaId?: string | null;
}

export interface CreateEtiqueta {
  nombre: string;
  colorClass: string;
}

export interface CreateComentario {
  texto: string;
}

export interface CreateChecklistItem {
  texto: string;
}

export interface UpdateChecklistItem {
  texto?: string;
  completado?: boolean;
}

export interface UpdateMiembros {
  miembros: { usuarioId: string; rol: RolTablero }[];
}

// ---- Helpers de presentación ----

export const PRIORIDAD_OPTIONS: { value: PrioridadTarjeta; label: string; tone: Tone }[] = [
  { value: 'Baja', label: 'Baja', tone: 'gray' },
  { value: 'Media', label: 'Media', tone: 'blue' },
  { value: 'Alta', label: 'Alta', tone: 'amber' },
  { value: 'Critica', label: 'Crítica', tone: 'red' }
];

export function prioridadLabel(p: PrioridadTarjeta): string {
  return PRIORIDAD_OPTIONS.find(o => o.value === p)?.label ?? p;
}

export function prioridadTone(p: PrioridadTarjeta): Tone {
  return PRIORIDAD_OPTIONS.find(o => o.value === p)?.tone ?? 'gray';
}

export const ETIQUETA_COLORS: { value: string; tone: Tone }[] = [
  { value: 'blue', tone: 'blue' },
  { value: 'green', tone: 'green' },
  { value: 'amber', tone: 'amber' },
  { value: 'purple', tone: 'purple' },
  { value: 'red', tone: 'red' },
  { value: 'teal', tone: 'teal' },
  { value: 'gray', tone: 'gray' }
];

export function actividadLabel(tipo: TipoActividadTarjeta): string {
  const map: Record<TipoActividadTarjeta, string> = {
    Creada: 'creó la tarjeta',
    Editada: 'editó la tarjeta',
    Movida: 'movió la tarjeta',
    Asignada: 'actualizó responsables',
    Desasignada: 'quitó un responsable',
    Comentada: 'comentó',
    EtiquetaAgregada: 'actualizó etiquetas',
    EtiquetaQuitada: 'quitó una etiqueta',
    Completada: 'completó la tarjeta',
    Reabierta: 'reabrió la tarjeta',
    Archivada: 'archivó la tarjeta',
    Restaurada: 'restauró la tarjeta'
  };
  return map[tipo] ?? tipo;
}
