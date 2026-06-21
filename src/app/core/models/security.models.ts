export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: string[];
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CurrentUser {
  userId: string;
  nombres: string;
  apellidos: string;
  iniciales: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: string;
  fechaAlta: string;
  ultimoAcceso: string | null;
  permisos: string[];
}

export interface AuthUserResponse {
  id: string;
  nombres: string;
  apellidos: string;
  iniciales: string;
  email: string;
  telefono: string;
  puesto: string;
  rol: string;
  fechaAlta: string;
  ultimoAcceso: string | null;
  permisos: string[];
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUserResponse;
}

export interface AuthConfig {
  credentialsEnabled: boolean;
  googleEnabled: boolean;
}

export interface UsuarioListItem {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  iniciales: string;
  puesto: string;
  rolId: string | null;
  rol: string;
  activo: boolean;
  fechaAlta: string;
  ultimoAcceso: string | null;
}

export interface UsuarioDetalle extends UsuarioListItem {
  permisos: string[];
  proyectosIds?: string[];
}

export interface CreateUsuarioRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  iniciales?: string;
  rolId: string;
  password?: string | null;
  proyectosIds?: string[];
}

export interface UpdateUsuarioRequest {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  iniciales?: string;
  rolId: string;
  proyectosIds?: string[];
}

export interface UpdateUsuarioPasswordRequest {
  password: string;
}

export interface Permiso {
  id: number;
  clave: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  concedido: boolean;
}

export interface PermisoModulo {
  modulo: string;
  permisos: Permiso[];
}

export interface RolListItem {
  id: string;
  nombre: string;
  descripcion: string;
  esActivo: boolean;
  usuariosCount: number;
  permisos: PermisoModulo[];
}

export interface RolDetalle extends RolListItem {
  permisosIds: number[];
}

export interface CreateRolRequest {
  nombre: string;
  descripcion: string;
}

export interface UpdateRolRequest {
  nombre: string;
  descripcion: string;
  esActivo: boolean;
}

export interface UpdateRolPermisosRequest {
  permisosIds: number[];
}
