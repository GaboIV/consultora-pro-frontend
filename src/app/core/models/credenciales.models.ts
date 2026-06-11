import { Tone } from './management.models';

export type TipoCredencial =
  | 'BaseDatos'
  | 'SSHKey'
  | 'APIKey'
  | 'ServiceAccount'
  | 'CertificadoSSL'
  | 'VPN'
  | 'RDP'
  | 'FTP'
  | 'Servidor'
  | 'Otro';

export interface CredencialListItem {
  id: string;
  nombre: string;
  tipo: TipoCredencial;
  servidor: string;
  host?: string | null;
  puerto?: number | null;
  usuario?: string | null;
  url?: string | null;
  notas?: string | null;
  proyectoId: string;
  proyectoNombre: string;
  ambienteId: string | null;
  ambienteNombre?: string | null;
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
  host?: string | null;
  puerto?: number | null;
  usuario?: string | null;
  url?: string | null;
  notas?: string | null;
  proyectoId: string;
  ambienteId?: string | null;
  valor: string;
  fechaVencimiento: string;
}

export interface UpdateCredencialRequest {
  nombre: string;
  tipo: TipoCredencial;
  servidor: string;
  host?: string | null;
  puerto?: number | null;
  usuario?: string | null;
  url?: string | null;
  notas?: string | null;
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
  /** Lucide icon name used in lists and the type picker. */
  icon: string;
  /** Badge tone for visual grouping. */
  tone: Tone;
  /** Default port suggested when this type is selected (optional). */
  defaultPort?: number;
}

export const TIPO_CREDENCIAL_OPTIONS: TipoCredencialOption[] = [
  { value: 'Servidor', label: 'Servidor / SSH', icon: 'server', tone: 'blue', defaultPort: 22 },
  { value: 'SSHKey', label: 'SSH Key', icon: 'terminal', tone: 'blue', defaultPort: 22 },
  { value: 'VPN', label: 'VPN', icon: 'shield', tone: 'teal' },
  { value: 'RDP', label: 'Escritorio remoto (RDP)', icon: 'monitor', tone: 'purple', defaultPort: 3389 },
  { value: 'BaseDatos', label: 'Base de datos', icon: 'database', tone: 'amber', defaultPort: 5432 },
  { value: 'FTP', label: 'FTP / SFTP', icon: 'folder-tree', tone: 'green', defaultPort: 22 },
  { value: 'APIKey', label: 'API Key', icon: 'key-round', tone: 'purple' },
  { value: 'ServiceAccount', label: 'Service Account', icon: 'user-cog', tone: 'teal' },
  { value: 'CertificadoSSL', label: 'Certificado SSL', icon: 'badge-check', tone: 'green' },
  { value: 'Otro', label: 'Otro', icon: 'lock', tone: 'gray' }
];

const TIPO_MAP = new Map(TIPO_CREDENCIAL_OPTIONS.map(option => [option.value, option]));

export function tipoCredencialMeta(tipo: TipoCredencial): TipoCredencialOption {
  return TIPO_MAP.get(tipo) ?? { value: tipo, label: tipo, icon: 'lock', tone: 'gray' };
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

// ─── Secret format detection ──────────────────────────────────────────────

export type FormatoSecreto = 'ppk' | 'openssh' | 'pem' | 'json';

export interface FormatoSecretoMeta {
  label: string;
  ext: string;
  icon: string;
  mime: string;
}

export const FORMATO_SECRETO_META: Record<FormatoSecreto, FormatoSecretoMeta> = {
  ppk:     { label: 'PuTTY PPK',   ext: 'ppk',  icon: 'key-round',   mime: 'text/plain' },
  openssh: { label: 'OpenSSH Key', ext: 'pem',  icon: 'terminal',    mime: 'text/plain' },
  pem:     { label: 'Certificado', ext: 'crt',  icon: 'badge-check', mime: 'text/plain' },
  json:    { label: 'JSON',        ext: 'json', icon: 'file-text',   mime: 'application/json' },
};

export function detectarFormatoSecreto(valor: string): FormatoSecreto | null {
  const v = valor.trim();
  if (!v) return null;
  if (v.startsWith('PuTTY-User-Key-File')) return 'ppk';
  if (v.startsWith('-----BEGIN') && v.includes('PRIVATE KEY')) return 'openssh';
  if (v.startsWith('-----BEGIN CERTIFICATE')) return 'pem';
  try {
    const parsed = JSON.parse(v);
    if (typeof parsed === 'object' && parsed !== null) return 'json';
  } catch { /* not json */ }
  return null;
}

// ─── Connection string ─────────────────────────────────────────────────────

/** Builds a ready-to-use connection hint for the reveal panel based on the type and fields. */
export function connectionString(item: Pick<CredencialListItem, 'tipo' | 'host' | 'servidor' | 'puerto' | 'usuario' | 'url'>): string | null {
  const host = (item.host || item.servidor || '').trim();
  const user = (item.usuario || '').trim();
  const port = item.puerto ?? null;

  switch (item.tipo) {
    case 'Servidor':
    case 'SSHKey': {
      if (!host) return null;
      const target = user ? `${user}@${host}` : host;
      return port ? `ssh -p ${port} ${target}` : `ssh ${target}`;
    }
    case 'BaseDatos': {
      if (!host) return null;
      const auth = user ? `${user}@` : '';
      return port ? `${auth}${host}:${port}` : `${auth}${host}`;
    }
    case 'RDP': {
      if (!host) return null;
      return port ? `${host}:${port}` : host;
    }
    case 'FTP': {
      if (!host) return null;
      const auth = user ? `${user}@` : '';
      return port ? `sftp://${auth}${host}:${port}` : `sftp://${auth}${host}`;
    }
    default:
      return (item.url || '').trim() || null;
  }
}
