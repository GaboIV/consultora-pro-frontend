import { Tone } from './management.models';

export type TipoCredencial =
  | 'BaseDatos'
  | 'SSHKey'
  | 'APIKey'
  | 'ServiceAccount'
  | 'CertificadoSSL'
  | 'VPN'
  | 'RDP'
  | 'Tunel'
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
  camposExtra?: Record<string, string> | null;
  proyectoId: string;
  proyectoNombre: string;
  ambienteId: string | null;
  ambienteNombre?: string | null;
  ambienteTipo?: string | null;
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
  camposExtra?: Record<string, string> | null;
  proyectoId: string;
  ambienteId?: string | null;
  valor: string;
  secretosExtra?: Record<string, string> | null;
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
  camposExtra?: Record<string, string> | null;
  proyectoId: string;
  ambienteId?: string | null;
  fechaVencimiento: string;
}

export interface CredencialReveal {
  id: string;
  nombre: string;
  valor: string;
  secretosExtra?: Record<string, string> | null;
  reveladoEn: string;
  visiblePorSegundos: number;
}

export interface AuditoriaCredencial {
  id: string;
  credencialId: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  detalle?: string | null;
  fechaRevelacion: string;
  ip: string;
  userAgent: string;
}

// ─── Solicitudes de revelación (nivel básico) ──────────────────────────────

export type EstadoSolicitudRevelacion = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Expirada';

export interface SolicitudRevelacion {
  id: string;
  credencialId: string;
  credencialNombre: string;
  proyectoId: string;
  proyectoNombre: string;
  solicitanteId: string;
  solicitanteNombre: string;
  aprobadorId?: string | null;
  aprobadorNombre?: string | null;
  estado: EstadoSolicitudRevelacion;
  motivo?: string | null;
  notaResolucion?: string | null;
  fechaSolicitud: string;
  fechaResolucion?: string | null;
  vigenteHasta?: string | null;
}

/** Código que devuelve el backend (HTTP 409) cuando revelar requiere una solicitud aprobada. */
export const REVELACION_REQUIERE_SOLICITUD = 'REVELACION_REQUIERE_SOLICITUD';

// ─── Importación masiva ────────────────────────────────────────────────────

export interface ImportCredencialRow extends CreateCredencialRequest {
  fila: number;
}

export interface ImportRowError {
  fila: number;
  nombre: string;
  error: string;
}

export interface ImportResult {
  total: number;
  importadas: number;
  errores: ImportRowError[];
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
  { value: 'Servidor', label: 'Servidor / SSH (Contraseña)', icon: 'server', tone: 'blue', defaultPort: 22 },
  { value: 'SSHKey', label: 'Servidor / SSH (Key)', icon: 'terminal', tone: 'blue', defaultPort: 22 },
  { value: 'RDP', label: 'Escritorio remoto (RDP)', icon: 'monitor', tone: 'purple', defaultPort: 3389 },
  { value: 'VPN', label: 'VPN (Forticlient, Citrix…)', icon: 'shield', tone: 'teal' },
  { value: 'Tunel', label: 'Túnel SSH / Port Forwarding', icon: 'waypoints', tone: 'teal', defaultPort: 22 },
  { value: 'BaseDatos', label: 'Base de datos', icon: 'database', tone: 'green', defaultPort: 5432 },
  { value: 'APIKey', label: 'Cloud / API Keys', icon: 'cloud', tone: 'purple' },
  { value: 'FTP', label: 'FTP / SFTP', icon: 'folder-tree', tone: 'amber', defaultPort: 22 },
  { value: 'ServiceAccount', label: 'Service Account', icon: 'user-cog', tone: 'teal' },
  { value: 'CertificadoSSL', label: 'Certificado SSL', icon: 'badge-check', tone: 'green' },
  { value: 'Otro', label: 'Otro', icon: 'lock', tone: 'gray' }
];

/** Tonos de ambiente para la tabla de credenciales: Producción verde, QA/Staging cian-ámbar, Dev gris. */
export function ambienteCredencialTone(ambienteTipo: string | null | undefined): Tone {
  switch (ambienteTipo) {
    case 'Produccion': return 'green';
    case 'QA': return 'teal';
    case 'Staging': return 'amber';
    case 'Desarrollo': return 'gray';
    default: return 'teal';
  }
}

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

// ─── Cadenas de conexión listas para usar ──────────────────────────────────

export interface ConnCommand {
  /** Etiqueta corta del formato (ssh, URI, JDBC, ADO.NET…). */
  label: string;
  command: string;
}

type ConnSource = Pick<CredencialListItem, 'tipo' | 'host' | 'servidor' | 'puerto' | 'usuario' | 'url' | 'camposExtra'>;

/**
 * Computa los comandos/cadenas listos para usar según el tipo.
 * Nunca incluye el secreto: las contraseñas se copian por separado.
 */
export function connectionCommands(item: ConnSource): ConnCommand[] {
  const extra = item.camposExtra ?? {};
  const host = (item.host || '').trim();
  const user = (item.usuario || '').trim();
  const port = item.puerto ?? null;
  const url = (item.url || '').trim();

  switch (item.tipo) {
    case 'Servidor':
    case 'SSHKey': {
      if (!host) return [];
      const jump = (extra['jumpHost'] || '').trim();
      const parts = ['ssh'];
      if (item.tipo === 'SSHKey') parts.push('-i <clave.pem>');
      if (jump) parts.push(`-J ${jump}`);
      if (port && port !== 22) parts.push(`-p ${port}`);
      parts.push(user ? `${user}@${host}` : host);
      return [{ label: 'ssh', command: parts.join(' ') }];
    }
    case 'Tunel': {
      if (!host) return [];
      const local = (extra['puertoLocal'] || '').trim();
      const destino = (extra['destinoHost'] || '').trim();
      const destinoPuerto = (extra['destinoPuerto'] || '').trim();
      const forward = local && destino && destinoPuerto ? ` -L ${local}:${destino}:${destinoPuerto}` : '';
      const p = port && port !== 22 ? ` -p ${port}` : '';
      return [{ label: 'túnel', command: `ssh -N${forward} ${user ? `${user}@` : ''}${host}${p}` }];
    }
    case 'BaseDatos':
      return databaseCommands(host, port, user, extra);
    case 'RDP': {
      if (!host) return [];
      const target = port && port !== 3389 ? `${host}:${port}` : host;
      return [{ label: 'mstsc', command: `mstsc /v:${target}` }];
    }
    case 'FTP': {
      if (!host) return [];
      const p = port && port !== 22 ? ` -P ${port}` : '';
      return [{ label: 'sftp', command: `sftp${p} ${user ? `${user}@` : ''}${host}` }];
    }
    default:
      return url ? [{ label: 'URL', command: url }] : [];
  }
}

function databaseCommands(host: string, port: number | null, user: string, extra: Record<string, string>): ConnCommand[] {
  if (!host) return [];

  const motor = (extra['motor'] || '').trim();
  const db = (extra['nombreBd'] || '').trim() || '<bd>';
  const ssl = (extra['sslMode'] || '').trim();
  const auth = user ? `${user}@` : '';

  switch (motor) {
    case 'PostgreSQL': {
      const p = port ?? 5432;
      const sslParam = ssl ? `?sslmode=${ssl}` : '';
      return [
        { label: 'URI', command: `postgresql://${auth}${host}:${p}/${db}${sslParam}` },
        { label: 'JDBC', command: `jdbc:postgresql://${host}:${p}/${db}${sslParam}` },
        { label: 'psql', command: `psql -h ${host} -p ${p}${user ? ` -U ${user}` : ''} -d ${db}` }
      ];
    }
    case 'MySQL': {
      const p = port ?? 3306;
      return [
        { label: 'URI', command: `mysql://${auth}${host}:${p}/${db}` },
        { label: 'JDBC', command: `jdbc:mysql://${host}:${p}/${db}${ssl ? `?sslMode=${ssl.toUpperCase()}` : ''}` },
        { label: 'mysql', command: `mysql -h ${host} -P ${p}${user ? ` -u ${user}` : ''} -p ${db}` }
      ];
    }
    case 'SQL Server': {
      const p = port ?? 1433;
      return [
        { label: 'ADO.NET', command: `Server=${host},${p};Database=${db};User Id=${user || '<usuario>'};Password=********;Encrypt=True;` },
        { label: 'JDBC', command: `jdbc:sqlserver://${host}:${p};databaseName=${db};encrypt=true` }
      ];
    }
    case 'Oracle': {
      const p = port ?? 1521;
      return [
        { label: 'JDBC', command: `jdbc:oracle:thin:@//${host}:${p}/${db}` },
        { label: 'EZConnect', command: `${user || '<usuario>'}@${host}:${p}/${db}` }
      ];
    }
    case 'MongoDB': {
      const p = port ?? 27017;
      return [
        { label: 'URI', command: `mongodb://${auth}${host}:${p}/${db}${ssl ? '?tls=true' : ''}` },
        { label: 'mongosh', command: `mongosh "mongodb://${auth}${host}:${p}/${db}"` }
      ];
    }
    default: {
      const target = port ? `${host}:${port}` : host;
      return [{ label: 'host', command: `${auth}${target}` }];
    }
  }
}

/** Compatibilidad: primera cadena de conexión disponible. */
export function connectionString(item: ConnSource): string | null {
  return connectionCommands(item)[0]?.command ?? null;
}

// ─── Archivo .rdp para Escritorio Remoto ───────────────────────────────────

/** Genera el contenido de un archivo .rdp para abrir la herramienta nativa preconfigurada. */
export function buildRdpFileContent(item: Pick<CredencialListItem, 'host' | 'puerto' | 'usuario' | 'camposExtra'>): string | null {
  const host = (item.host || '').trim();
  if (!host) return null;

  const dominio = (item.camposExtra?.['dominio'] || '').trim();
  const usuario = (item.usuario || '').trim();
  const fullUser = usuario ? (dominio ? `${dominio}\\${usuario}` : usuario) : '';
  const target = item.puerto && item.puerto !== 3389 ? `${host}:${item.puerto}` : host;

  const lines = [
    `full address:s:${target}`,
    ...(fullUser ? [`username:s:${fullUser}`] : []),
    'prompt for credentials:i:1',
    'screen mode id:i:2',
    'authentication level:i:2',
    'redirectclipboard:i:1'
  ];

  return lines.join('\r\n') + '\r\n';
}
