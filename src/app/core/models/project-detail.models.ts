import { Tone } from './management.models';
import { Ambiente } from './ambientes.models';
import { Repositorio } from './repositorios.models';
import { CredencialListItem } from './credenciales.models';
import { DespliegueListItem } from './despliegues.models';
import { Screenshot } from './screenshots.models';

export interface ProjectMiembro {
  usuarioId: string;
  nombreCompleto: string;
  iniciales: string;
  rol: 'Principal' | 'Apoyo';
  correo: string;
  puesto: string;
}

export interface ProjectDetailInfo {
  id: string;
  name: string;
  clientName: string;
  tipoSolucionNombre: string;
  stage: string;
  stageTone: Tone;
  status: string;
  statusTone: Tone;
  startDate: string;
  endDate: string;
  progress: number;
  description?: string;
  miembros: ProjectMiembro[];
}

export interface ProjectTabData {
  info: ProjectDetailInfo;
  ambientes: Ambiente[];
  repositorios: Repositorio[];
  credenciales: CredencialListItem[];
  despliegues: DespliegueListItem[];
  screenshots: Screenshot[];
}

export type ProjectTabKey = 'info' | 'ambientes' | 'repositorios' | 'credenciales' | 'despliegues' | 'tableros' | 'equipo' | 'screenshots';

export interface ProjectTab {
  key: ProjectTabKey;
  label: string;
  icon: string;
  count?: number;
}
