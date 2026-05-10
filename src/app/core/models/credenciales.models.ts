import { Tone } from './management.models';

export type TipoCredencial =
  | 'BaseDatos'
  | 'SSHKey'
  | 'APIKey'
  | 'ServiceAccount'
  | 'CertificadoSSL'
  | 'Otro';

export interface CredencialListItem {
  id: string;
  nombre: string;
  tipo: TipoCredencial;
  servidor: string;
  proyectoId: string;
  proyectoNombre: string;
  ambienteId: string | null;
  fechaVencimiento: string;
  diasParaVencer: number;
  estadoVencimiento: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface CreateCredencialRequest {
  nombre: string;
  tipo: TipoCredencial;
  servidor: string;
  proyectoId: string;
  ambienteId?: string | null;
  valor: string;
  fechaVencimiento: string;
}

export interface UpdateCredencialRequest {
  nombre: string;
  tipo: TipoCredencial;
  servidor: string;
  proyectoId: string;
  ambienteId?: string | null;
  fechaVencimiento: string;
}

export interface CredencialReveal {
  id: string;
  nombre: string;
  valor: string;
  reveladoEn: string;
  visiblePorSegundos: number;
}

export interface AuditoriaCredencial {
  id: string;
  credencialId: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaRevelacion: string;
  ip: string;
  userAgent: string;
}

export interface TipoCredencialOption {
  value: TipoCredencial;
  label: string;
}

export function expirationTone(item: Pick<CredencialListItem, 'diasParaVencer'>): Tone {
  if (item.diasParaVencer < 7) return 'red';
  if (item.diasParaVencer <= 30) return 'amber';
  return 'green';
}

export function expirationLabel(item: Pick<CredencialListItem, 'diasParaVencer'>): string {
  if (item.diasParaVencer < 0) return `Vencida hace ${Math.abs(item.diasParaVencer)} día(s)`;
  if (item.diasParaVencer === 0) return 'Vence hoy';
  if (item.diasParaVencer === 1) return 'Vence mañana';
  return `Vence en ${item.diasParaVencer} días`;
}
