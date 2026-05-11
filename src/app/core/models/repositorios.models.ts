import { Tone } from './management.models';

export type ProveedorRepositorio = 'GitHub' | 'GitLab' | 'AzureDevOps' | 'Bitbucket' | 'Otro';
export type EstadoPipeline = 'Passing' | 'Failed' | 'Desconocido' | 'EnEjecucion';

export interface Repositorio {
  id: string;
  nombre: string;
  proyectoId: string;
  proyectoNombre: string;
  clienteNombre: string;
  proveedor: ProveedorRepositorio;
  ramaPrincipal: string;
  url: string;
  estadoPipeline: EstadoPipeline;
  activo: boolean;
  fechaCreacion: string;
}

export interface CreateRepositorioRequest {
  nombre: string;
  proyectoId: string;
  proveedor: ProveedorRepositorio;
  ramaPrincipal: string;
  url: string;
  estadoPipeline: EstadoPipeline;
}

export type UpdateRepositorioRequest = CreateRepositorioRequest;

export interface RepositorioOption<TValue extends string> {
  value: TValue;
  label: string;
  help?: string;
}

export const PROVEEDOR_REPOSITORIO_OPTIONS: RepositorioOption<ProveedorRepositorio>[] = [
  { value: 'GitHub', label: 'GitHub', help: 'github.com' },
  { value: 'GitLab', label: 'GitLab', help: 'gitlab.com' },
  { value: 'AzureDevOps', label: 'Azure DevOps', help: 'dev.azure.com' },
  { value: 'Bitbucket', label: 'Bitbucket', help: 'bitbucket.org' },
  { value: 'Otro', label: 'Otro', help: 'Otro proveedor de repositorios.' }
];

export const ESTADO_PIPELINE_OPTIONS: RepositorioOption<EstadoPipeline>[] = [
  { value: 'Passing', label: 'Passing', help: 'Pipeline en verde.' },
  { value: 'Failed', label: 'Failed', help: 'Pipeline en rojo.' },
  { value: 'EnEjecucion', label: 'En ejecución', help: 'Pipeline en progreso.' },
  { value: 'Desconocido', label: 'Desconocido', help: 'Estado no determinado.' }
];

export function proveedorLabel(proveedor: ProveedorRepositorio): string {
  return PROVEEDOR_REPOSITORIO_OPTIONS.find(option => option.value === proveedor)?.label ?? proveedor;
}

export function proveedorTone(proveedor: ProveedorRepositorio): Tone {
  const tones: Record<ProveedorRepositorio, Tone> = {
    GitHub: 'gray',
    GitLab: 'amber',
    AzureDevOps: 'blue',
    Bitbucket: 'blue',
    Otro: 'gray'
  };
  return tones[proveedor] ?? 'gray';
}

export function pipelineLabel(estado: EstadoPipeline): string {
  return ESTADO_PIPELINE_OPTIONS.find(option => option.value === estado)?.label ?? estado;
}

export function pipelineTone(estado: EstadoPipeline): Tone {
  const tones: Record<EstadoPipeline, Tone> = {
    Passing: 'green',
    Failed: 'red',
    Desconocido: 'gray',
    EnEjecucion: 'amber'
  };
  return tones[estado] ?? 'gray';
}
