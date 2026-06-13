export interface Alerta {
  id: string;
  tipo: 'CredencialVencimiento' | 'ProyectoVencimiento' | 'AmbienteAlerta' | string;
  mensaje: string;
  tone: 'info' | 'warn' | 'red' | 'amber' | string;
  esCritica: boolean;
  referenciaId: string;
  fechaReferencia?: string;
  leida?: boolean; // Local tracking
}
