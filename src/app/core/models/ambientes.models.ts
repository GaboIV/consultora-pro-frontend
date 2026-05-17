import { Tone } from './management.models';

export type TipoAmbiente = 'Produccion' | 'Staging' | 'Desarrollo' | 'QA';
export type EstadoAmbiente = 'Online' | 'Offline' | 'Alerta' | 'Configurando';

export interface Ambiente {
  id: string;
  nombre: string;
  tipo: TipoAmbiente;
  url: string;
  healthCheckUrl?: string;
  proyectoId: string;
  proyectoNombre: string;
  clienteNombre: string;
  tecnologia: string;
  estado: EstadoAmbiente;
  uptimePorcentaje: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface CreateAmbienteRequest {
  nombre: string;
  tipo: TipoAmbiente;
  url: string;
  healthCheckUrl?: string;
  proyectoId: string;
  tecnologia: string;
  estado: EstadoAmbiente;
  uptimePorcentaje: number;
}

export type UpdateAmbienteRequest = CreateAmbienteRequest;

export interface UpdateAmbienteEstadoRequest {
  estado: EstadoAmbiente;
  uptimePorcentaje?: number;
}

export interface AmbienteComponente {
  id: string;
  ambienteId: string;
  rol: string;
  ipPublica?: string;
  ipPrivada?: string;
  hostname?: string;
  tecnologia?: string;
  especificaciones?: string;
}

export interface CreateAmbienteComponenteRequest {
  ambienteId: string;
  rol: string;
  ipPublica?: string;
  ipPrivada?: string;
  hostname?: string;
  tecnologia?: string;
  especificaciones?: string;
}

export type UpdateAmbienteComponenteRequest = Omit<CreateAmbienteComponenteRequest, 'ambienteId'>;

export interface AmbienteTestUser {
  id: string;
  ambienteId: string;
  rolAplicacion: string;
  correo: string;
  passwordCifrado: string;
  notas?: string;
}

export interface CreateAmbienteTestUserRequest {
  ambienteId: string;
  rolAplicacion: string;
  correo: string;
  password: string;
  notas?: string;
}

export interface UpdateAmbienteTestUserRequest {
  rolAplicacion: string;
  correo: string;
  password?: string;
  notas?: string;
}

export interface AmbienteCloudResource {
  id: string;
  ambienteId: string;
  tipoRecurso: string;
  nombreRecurso: string;
  deepLink?: string;
}

export interface CreateAmbienteCloudResourceRequest {
  ambienteId: string;
  tipoRecurso: string;
  nombreRecurso: string;
  deepLink?: string;
}

export type UpdateAmbienteCloudResourceRequest = Omit<CreateAmbienteCloudResourceRequest, 'ambienteId'>;

export interface AmbienteOption<TValue extends string> {
  value: TValue;
  label: string;
  help?: string;
}

export const TIPO_AMBIENTE_OPTIONS: AmbienteOption<TipoAmbiente>[] = [
  { value: 'Produccion', label: 'Producción', help: 'Ambiente de uso real por usuarios o clientes.' },
  { value: 'Staging', label: 'Staging', help: 'Preproducción para validación funcional y técnica.' },
  { value: 'Desarrollo', label: 'Desarrollo', help: 'Trabajo interno del equipo técnico.' },
  { value: 'QA', label: 'QA', help: 'Pruebas controladas antes de liberar.' }
];

export const ESTADO_AMBIENTE_OPTIONS: AmbienteOption<EstadoAmbiente>[] = [
  { value: 'Online', label: 'Online', help: 'Disponible y operando normalmente.' },
  { value: 'Alerta', label: 'Alerta', help: 'Disponible con incidentes o degradación.' },
  { value: 'Offline', label: 'Offline', help: 'No disponible o apagado.' },
  { value: 'Configurando', label: 'Configurando', help: 'En preparación, sin operación completa.' }
];

export function tipoAmbienteLabel(tipo: TipoAmbiente): string {
  return TIPO_AMBIENTE_OPTIONS.find(option => option.value === tipo)?.label ?? tipo;
}

export function tipoAmbienteTone(tipo: TipoAmbiente): Tone {
  const tones: Record<TipoAmbiente, Tone> = {
    Produccion: 'red',
    Staging: 'amber',
    Desarrollo: 'blue',
    QA: 'purple'
  };

  return tones[tipo] ?? 'gray';
}

export function estadoAmbienteLabel(estado: EstadoAmbiente): string {
  return ESTADO_AMBIENTE_OPTIONS.find(option => option.value === estado)?.label ?? estado;
}

export function estadoAmbienteTone(estado: EstadoAmbiente): Tone {
  const tones: Record<EstadoAmbiente, Tone> = {
    Online: 'green',
    Alerta: 'amber',
    Offline: 'red',
    Configurando: 'blue'
  };

  return tones[estado] ?? 'gray';
}
