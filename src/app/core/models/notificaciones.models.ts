export type TipoNotificacion =
  | 'UsuarioBienvenida'
  | 'PasswordCambiadaPorAdmin'
  | 'PasswordCambiada'
  | 'RolCambiado'
  | 'ProyectoAsignado'
  | 'ProyectoDesasignado'
  | 'TableroCompartido'
  | 'TarjetaAsignada'
  | 'TarjetaDesasignada'
  | 'TarjetaMovida'
  | 'TarjetaCompletada'
  | 'TarjetaComentario'
  | 'CredencialSolicitud'
  | 'CredencialSolicitudResuelta';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  url: string | null;
  actorNombre: string | null;
  actorIniciales: string | null;
  leida: boolean;
  fechaCreacion: string;
}

export interface ResumenNotificaciones {
  noLeidas: number;
}

export interface PreferenciaNotificacion {
  tipo: TipoNotificacion;
  grupo: string;
  nombre: string;
  descripcion: string;
  agrupable: boolean;
  correoObligatorio: boolean;
  enApp: boolean;
  porCorreo: boolean;
}

export interface UpdatePreferenciaNotificacion {
  tipo: TipoNotificacion;
  enApp: boolean;
  porCorreo: boolean;
}
