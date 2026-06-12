import { TipoCredencial, tipoCredencialMeta } from './credenciales.models';

/**
 * Motor de formulario dinámico: cada tipo de credencial declara sus campos
 * específicos. El formulario, la validación contextual, la plantilla Excel y
 * el validador de importación se derivan de este único esquema.
 */

export type CampoTipo = 'text' | 'number' | 'password' | 'select' | 'textarea';

export interface CampoEspecifico {
  /** Clave de almacenamiento. Si `base` está definido se mapea a la columna base. */
  key: string;
  /** Columna base de la credencial a la que se mapea (host, puerto, usuario, url). */
  base?: 'host' | 'puerto' | 'usuario' | 'url';
  label: string;
  type: CampoTipo;
  required?: boolean;
  /** true ⇒ se guarda cifrado en secretosExtra, nunca en texto plano. */
  secreto?: boolean;
  placeholder?: string;
  options?: string[];
  mono?: boolean;
  /** Ocupa las dos columnas del grid del formulario. */
  span2?: boolean;
  help?: string;
  /** Valor de ejemplo para la fila guía de la plantilla Excel. */
  ejemplo?: string;
}

export interface TipoCredencialSchema {
  tipo: TipoCredencial;
  /** Etiqueta del secreto principal (campo `valor`, siempre cifrado). */
  valorLabel: string;
  valorPlaceholder: string;
  /** El secreto principal acepta arrastrar archivos .pem/.ppk/.key/.json. */
  valorFileDrop?: boolean;
  valorEjemplo?: string;
  defaultPort?: number;
  /** Puerto por defecto según el motor seleccionado (solo Base de Datos). */
  puertosPorMotor?: Record<string, number>;
  campos: CampoEspecifico[];
}

export const MOTORES_BD = ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'MongoDB'] as const;

export const PUERTOS_POR_MOTOR: Record<string, number> = {
  PostgreSQL: 5432,
  MySQL: 3306,
  'SQL Server': 1433,
  Oracle: 1521,
  MongoDB: 27017
};

const HOST = (label = 'Host / IP', placeholder = '10.0.4.21 · srv.acme.com'): CampoEspecifico =>
  ({ key: 'host', base: 'host', label, type: 'text', required: true, mono: true, placeholder, ejemplo: '10.0.4.21' });

const PUERTO = (label = 'Puerto', ejemplo = '22'): CampoEspecifico =>
  ({ key: 'puerto', base: 'puerto', label, type: 'number', placeholder: ejemplo, ejemplo });

const USUARIO = (label = 'Usuario', ejemplo = 'admin'): CampoEspecifico =>
  ({ key: 'usuario', base: 'usuario', label, type: 'text', required: true, mono: true, placeholder: 'root · svc-deploy', ejemplo });

export const CREDENCIAL_SCHEMAS: Record<TipoCredencial, TipoCredencialSchema> = {
  Servidor: {
    tipo: 'Servidor',
    valorLabel: 'Contraseña',
    valorPlaceholder: 'Contraseña del usuario SSH',
    valorEjemplo: 'P4ssw0rd!seguro',
    defaultPort: 22,
    campos: [
      HOST(),
      PUERTO(),
      USUARIO(undefined, 'root'),
      { key: 'jumpHost', label: 'Jump Host (opcional)', type: 'text', mono: true, placeholder: 'bastion.acme.com', help: 'Bastión intermedio para el salto SSH.', ejemplo: '' }
    ]
  },
  SSHKey: {
    tipo: 'SSHKey',
    valorLabel: 'Clave privada',
    valorPlaceholder: 'Pega la clave o arrastra el archivo .pem / .ppk / .key…',
    valorFileDrop: true,
    valorEjemplo: '-----BEGIN OPENSSH PRIVATE KEY-----…',
    defaultPort: 22,
    campos: [
      HOST(),
      PUERTO(),
      USUARIO(undefined, 'ubuntu'),
      { key: 'passphrase', label: 'Passphrase (opcional)', type: 'password', secreto: true, placeholder: 'Passphrase de la clave', ejemplo: '' },
      { key: 'clavePublica', label: 'Clave pública (opcional)', type: 'textarea', mono: true, span2: true, placeholder: 'ssh-ed25519 AAAA…', ejemplo: '' },
      { key: 'jumpHost', label: 'Jump Host (opcional)', type: 'text', mono: true, placeholder: 'bastion.acme.com', ejemplo: '' }
    ]
  },
  RDP: {
    tipo: 'RDP',
    valorLabel: 'Contraseña',
    valorPlaceholder: 'Contraseña del usuario de Windows',
    valorEjemplo: 'P4ssw0rd!seguro',
    defaultPort: 3389,
    campos: [
      HOST('Host / IP', '192.168.1.40 · ts.acme.com'),
      PUERTO('Puerto', '3389'),
      { key: 'dominio', label: 'Dominio (opcional)', type: 'text', mono: true, placeholder: 'ACME', ejemplo: 'ACME' },
      USUARIO(undefined, 'soporte.ti')
    ]
  },
  VPN: {
    tipo: 'VPN',
    valorLabel: 'Contraseña',
    valorPlaceholder: 'Contraseña del usuario VPN',
    valorEjemplo: 'P4ssw0rd!seguro',
    campos: [
      { key: 'url', base: 'url', label: 'URL de Gateway / Portal', type: 'text', required: true, mono: true, span2: true, placeholder: 'https://vpn.acme.com', ejemplo: 'https://vpn.acme.com' },
      { key: 'vpnTipo', label: 'Tipo de VPN', type: 'select', required: true, options: ['Forticlient', 'Cisco AnyConnect', 'GlobalProtect', 'OpenVPN', 'WireGuard', 'Citrix', 'Otro'], ejemplo: 'Forticlient' },
      { key: 'grupo', label: 'Grupo / Región (opcional)', type: 'text', placeholder: 'LATAM · split-tunnel', ejemplo: '' },
      USUARIO(undefined, 'gabriel.r'),
      { key: 'sharedSecret', label: 'Secreto compartido / PSK (opcional)', type: 'password', secreto: true, placeholder: 'Pre-shared key', ejemplo: '' }
    ]
  },
  Tunel: {
    tipo: 'Tunel',
    valorLabel: 'Clave / contraseña del bastión',
    valorPlaceholder: 'Contraseña o clave privada del bastión (arrastra el archivo si aplica)',
    valorFileDrop: true,
    valorEjemplo: 'P4ssw0rd!bastion',
    defaultPort: 22,
    campos: [
      HOST('IP Bastión', 'bastion.acme.com'),
      PUERTO('Puerto Bastión', '22'),
      USUARIO('Usuario Bastión', 'tunnel-svc'),
      { key: 'puertoLocal', label: 'Puerto local', type: 'number', required: true, placeholder: '5433', ejemplo: '5433' },
      { key: 'destinoHost', label: 'IP destino final', type: 'text', required: true, mono: true, placeholder: 'db.interna.acme.local', ejemplo: '10.0.8.15' },
      { key: 'destinoPuerto', label: 'Puerto destino final', type: 'number', required: true, placeholder: '5432', ejemplo: '5432' }
    ]
  },
  BaseDatos: {
    tipo: 'BaseDatos',
    valorLabel: 'Contraseña',
    valorPlaceholder: 'Contraseña del usuario de BD',
    valorEjemplo: 'P4ssw0rd!seguro',
    defaultPort: 5432,
    puertosPorMotor: PUERTOS_POR_MOTOR,
    campos: [
      { key: 'motor', label: 'Motor', type: 'select', required: true, options: [...MOTORES_BD], ejemplo: 'PostgreSQL' },
      HOST('Host / IP', 'db.prod.acme.com'),
      PUERTO('Puerto', '5432'),
      { key: 'nombreBd', label: 'Nombre de BD', type: 'text', required: true, mono: true, placeholder: 'erp_prod', ejemplo: 'erp_prod' },
      { key: 'schema', label: 'Schema (opcional)', type: 'text', mono: true, placeholder: 'public', ejemplo: '' },
      USUARIO(undefined, 'app_user'),
      { key: 'sslMode', label: 'SSL Mode', type: 'select', options: ['disable', 'prefer', 'require', 'verify-ca', 'verify-full'], ejemplo: 'require' }
    ]
  },
  APIKey: {
    tipo: 'APIKey',
    valorLabel: 'Secret Key / Client Secret',
    valorPlaceholder: 'Secreto del acceso programático',
    valorEjemplo: 'wJalrXUtnFEMI/K7MDENG…',
    campos: [
      { key: 'proveedor', label: 'Proveedor', type: 'select', required: true, options: ['AWS', 'Azure', 'GCP', 'Cloudflare', 'DigitalOcean', 'Otro'], ejemplo: 'AWS' },
      { key: 'accessKeyId', label: 'Access Key ID / Client ID', type: 'text', required: true, mono: true, placeholder: 'AKIA…', ejemplo: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'tenantId', label: 'Tenant / Subscription ID (opcional)', type: 'text', mono: true, placeholder: '00000000-0000-…', ejemplo: '' },
      { key: 'url', base: 'url', label: 'Endpoint (opcional)', type: 'text', mono: true, placeholder: 'https://api.proveedor.com', ejemplo: '' }
    ]
  },
  FTP: {
    tipo: 'FTP',
    valorLabel: 'Contraseña',
    valorPlaceholder: 'Contraseña del usuario FTP/SFTP',
    valorEjemplo: 'P4ssw0rd!seguro',
    defaultPort: 22,
    campos: [
      HOST('Host / IP', 'ftp.acme.com'),
      PUERTO('Puerto', '22'),
      USUARIO(undefined, 'ftpuser')
    ]
  },
  ServiceAccount: {
    tipo: 'ServiceAccount',
    valorLabel: 'Clave / JSON de la cuenta',
    valorPlaceholder: 'Pega el JSON o arrastra el archivo de la service account…',
    valorFileDrop: true,
    valorEjemplo: '{ "type": "service_account", … }',
    campos: [
      { key: 'usuario', base: 'usuario', label: 'Cuenta', type: 'text', mono: true, placeholder: 'svc-ci@proyecto.iam.gserviceaccount.com', ejemplo: 'svc-ci@acme.iam' },
      { key: 'url', base: 'url', label: 'Consola / Endpoint (opcional)', type: 'text', mono: true, placeholder: 'https://console.cloud.google.com', ejemplo: '' }
    ]
  },
  CertificadoSSL: {
    tipo: 'CertificadoSSL',
    valorLabel: 'Certificado / clave privada',
    valorPlaceholder: 'Pega el PEM o arrastra el archivo .crt / .pem / .key…',
    valorFileDrop: true,
    valorEjemplo: '-----BEGIN CERTIFICATE-----…',
    campos: [
      { key: 'host', base: 'host', label: 'Dominio', type: 'text', mono: true, placeholder: '*.acme.com', ejemplo: '*.acme.com' },
      { key: 'passphrase', label: 'Passphrase (opcional)', type: 'password', secreto: true, placeholder: 'Passphrase de la clave', ejemplo: '' },
      { key: 'url', base: 'url', label: 'Emisor / panel (opcional)', type: 'text', mono: true, placeholder: 'https://acme.sslprovider.com', ejemplo: '' }
    ]
  },
  Otro: {
    tipo: 'Otro',
    valorLabel: 'Valor / secreto',
    valorPlaceholder: 'Contraseña, token, contenido sensible…',
    valorEjemplo: 'token-o-secreto',
    campos: [
      { key: 'host', base: 'host', label: 'Host / IP (opcional)', type: 'text', mono: true, placeholder: '10.0.0.1', ejemplo: '' },
      { key: 'puerto', base: 'puerto', label: 'Puerto (opcional)', type: 'number', placeholder: '8080', ejemplo: '' },
      { key: 'usuario', base: 'usuario', label: 'Usuario (opcional)', type: 'text', mono: true, ejemplo: '' },
      { key: 'url', base: 'url', label: 'URL (opcional)', type: 'text', mono: true, ejemplo: '' }
    ]
  }
};

export function schemaDe(tipo: TipoCredencial): TipoCredencialSchema {
  return CREDENCIAL_SCHEMAS[tipo] ?? CREDENCIAL_SCHEMAS['Otro'];
}

/**
 * Validación contextual por tipo. Devuelve los errores en el formato que exige
 * la spec de importación: "El campo [X] es obligatorio para el tipo Y".
 */
export function validarCamposPorTipo(
  tipo: TipoCredencial,
  valores: { host?: string | null; puerto?: number | null; usuario?: string | null; url?: string | null; camposExtra?: Record<string, string> | null }
): string[] {
  const schema = schemaDe(tipo);
  const tipoLabel = tipoCredencialMeta(tipo).label;
  const errores: string[] = [];

  for (const campo of schema.campos) {
    if (!campo.required) continue;

    const raw = campo.base
      ? (campo.base === 'puerto' ? valores.puerto?.toString() : valores[campo.base])
      : valores.camposExtra?.[campo.key];

    if (!raw || !String(raw).trim()) {
      errores.push(`El campo [${campo.label.replace(/\s*\(opcional\)\s*/i, '')}] es obligatorio para el tipo ${tipoLabel}`);
    }
  }

  return errores;
}

/** Puerto sugerido al cambiar tipo o motor. */
export function puertoSugerido(tipo: TipoCredencial, motor?: string | null): number | undefined {
  const schema = schemaDe(tipo);
  if (motor && schema.puertosPorMotor) return schema.puertosPorMotor[motor] ?? schema.defaultPort;
  return schema.defaultPort;
}
