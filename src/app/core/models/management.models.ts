export type Tone = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'gray' | 'teal';
export type AlertTone = 'info' | 'warn';

export interface Metric {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  detailTone?: 'default' | 'up' | 'warn' | 'danger';
}

export interface AlertMessage {
  tone: AlertTone;
  text: string;
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  projectsCount: number;
  sector: string;
  status: string;
  statusTone: Tone;
  logoTone: Tone;
}

export interface TipoSolucion {
  id: string;
  nombre: string;
}

export interface UsuarioSnapshot {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  iniciales: string;
  puesto: string;
}

export interface ProyectoMiembro {
  id: string;
  usuarioId: string;
  nombreCompleto: string;
  iniciales: string;
  rol: 'Principal' | 'Apoyo';
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  clientName: string;
  tipoSolucionId: string;
  tipoSolucionNombre: string;
  stage: string;
  stageValue?: string;
  stageTone: Tone;
  lead: {
    initials: string;
    name: string;
    tone: Tone;
  };
  progress: number;
  progressTone: Tone;
  startDate: string;
  endDate: string;
  status: string;
  statusValue?: string;
  statusTone: Tone;
  teamSize: number;
  miembros: ProyectoMiembro[];
}

export interface GanttItem {
  label: string;
  caption: string;
  start: number;
  width: number;
  tone: Tone;
}

export interface EnvironmentItem {
  id?: string;
  projectId?: string;
  name: string;
  type?: string;
  url: string;
  stack: string;
  state: string;
  stateTone: Tone;
  availability?: string;
}

export interface EnvironmentSummary {
  total: number;
  online: number;
  alertas: number;
  offline: number;
  configurando: number;
}

export interface EnvironmentGroup {
  projectId?: string;
  projectName: string;
  items: EnvironmentItem[];
}

export interface Deployment {
  projectName: string;
  target: string;
  when: string;
  actor: string;
  duration: string;
  version: string;
  status: string;
  tone: Tone;
}

export interface RepositoryHealth {
  name: string;
  provider: string;
  branch: string;
  stack: string;
  status: string;
  tone: Tone;
}

export interface Credential {
  service: string;
  environment: string;
  environmentTone: Tone;
  kind: string;
  expiresIn: string;
  tone: Tone;
}

export interface TeamMember {
  initials: string;
  name: string;
  title: string;
  projects: string;
  role: string;
  roleTone: Tone;
  avatarTone: Tone;
}

export interface Permission {
  label: string;
  granted: boolean;
}

export interface Role {
  code: string;
  name: string;
  description: string;
  usersLabel: string;
  tone: Tone;
  permissions: Permission[];
}

export interface ProjectPreview {
  title: string;
  kind: 'desktop' | 'mobile' | 'upload';
  tone: Tone;
}

export interface ExecutiveOverview {
  metrics: Metric[];
  alerts: AlertMessage[];
  spotlightProjects: Project[];
  gantt: GanttItem[];
  milestones: AlertMessage[];
}

export interface InfrastructureOverview {
  environmentSummary: EnvironmentSummary;
  environmentGroups: EnvironmentGroup[];
  deployments: Deployment[];
  repositories: RepositoryHealth[];
  credentials: Credential[];
}

export interface TeamOverview {
  members: TeamMember[];
  roles: Role[];
  previews: ProjectPreview[];
}

export interface ManagementSnapshot {
  generatedAt: string;
  periodLabel: string;
  executive: ExecutiveOverview;
  clients: Client[];
  projects: Project[];
  tiposSolucion: TipoSolucion[];
  usuarios: UsuarioSnapshot[];
  infrastructure: InfrastructureOverview;
  team: TeamOverview;
}

export interface CreateClientCommand {
  nombre: string;
  industria: string;
  iniciales: string;
  colorClass: string;
}

export interface UpdateClientCommand {
  nombre: string;
  industria: string;
  iniciales: string;
  colorClass: string;
}

export interface AsignarMiembroCommand {
  usuarioId: string;
  rol: 'Principal' | 'Apoyo';
}

export interface CreateProjectCommand {
  nombre: string;
  clienteId: string;
  tipoSolucionId: string;
  etapa: string;
  estado: string;
  miembros: AsignarMiembroCommand[];
}

export interface UpdateProjectCommand {
  nombre: string;
  clienteId: string;
  tipoSolucionId: string;
  etapa: string;
  estado: string;
  miembros: AsignarMiembroCommand[];
}
