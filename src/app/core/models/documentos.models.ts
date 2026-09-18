import { Tone } from './management.models';

export type TipoDocumento =
  | 'ActaReunion'
  | 'PlanProyecto'
  | 'Cronograma'
  | 'InformeAvance'
  | 'Requerimiento'
  | 'EspecificacionFuncional'
  | 'EspecificacionTecnica'
  | 'Arquitectura'
  | 'MatrizIntegracion'
  | 'PlanPruebas'
  | 'CasoPrueba'
  | 'EvidenciaPruebas'
  | 'GuiaDespliegue'
  | 'ManualUsuario'
  | 'ManualTecnico'
  | 'Presentacion'
  | 'Contractual'
  | 'Otro';

export type EstadoDocumento = 'Borrador' | 'EnRevision' | 'Aprobado' | 'Obsoleto';

export interface CarpetaDocumento {
  id: string;
  parentId: string | null;
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: number;
  esSistema: boolean;
}

export interface DocumentoVersion {
  id: string;
  numero: number;
  version: string;
  nombreArchivo: string;
  tamanoBytes: number;
  nota: string;
  subidoPorNombre: string;
  fechaSubida: string;
  esActual: boolean;
}

export interface Documento {
  id: string;
  proyectoId: string;
  carpetaId: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  versionActual: string;
  nombreArchivo: string;
  extension: string;
  contentType: string;
  tamanoBytes: number;
  url: string;
  etiquetas: string[];
  creadoPorNombre: string;
  actualizadoPorNombre: string;
  fechaCreacion: string;
  updatedAt: string;
  versiones: DocumentoVersion[];
}

export interface DocumentacionProyecto {
  carpetas: CarpetaDocumento[];
  documentos: Documento[];
  maxBytes: number;
  extensionesPermitidas: string[];
}

export interface SubirDocumentoPayload {
  proyectoId: string;
  carpetaId: string;
  titulo: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  version: string;
  descripcion: string;
  etiquetas: string[];
  file: File;
}

export interface NuevaVersionPayload {
  version: string;
  nota: string;
  estado: EstadoDocumento | null;
  file: File;
}

export interface ActualizarDocumentoPayload {
  carpetaId: string;
  titulo: string;
  descripcion: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  etiquetas: string[];
}

/** Nodo de carpeta ya resuelto para pintar el árbol (con conteos acumulados). */
export interface CarpetaNodo extends CarpetaDocumento {
  nivel: number;
  hijas: CarpetaNodo[];
  totalDocumentos: number;
  ruta: string;
}

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string; sigla: string }[] = [
  { value: 'ActaReunion', label: 'Acta de reunión', sigla: 'ACT' },
  { value: 'PlanProyecto', label: 'Plan de proyecto', sigla: 'PLN' },
  { value: 'Cronograma', label: 'Cronograma', sigla: 'CRO' },
  { value: 'InformeAvance', label: 'Informe de avance', sigla: 'INF' },
  { value: 'Requerimiento', label: 'Requerimiento', sigla: 'REQ' },
  { value: 'EspecificacionFuncional', label: 'Especificación funcional', sigla: 'EF' },
  { value: 'EspecificacionTecnica', label: 'Especificación técnica', sigla: 'ET' },
  { value: 'Arquitectura', label: 'Arquitectura', sigla: 'ARQ' },
  { value: 'MatrizIntegracion', label: 'Matriz de integración', sigla: 'INT' },
  { value: 'PlanPruebas', label: 'Plan de pruebas', sigla: 'PP' },
  { value: 'CasoPrueba', label: 'Casos de prueba', sigla: 'CP' },
  { value: 'EvidenciaPruebas', label: 'Evidencia de pruebas', sigla: 'EVI' },
  { value: 'GuiaDespliegue', label: 'Guía de despliegue', sigla: 'DEP' },
  { value: 'ManualUsuario', label: 'Manual de usuario', sigla: 'MU' },
  { value: 'ManualTecnico', label: 'Manual técnico', sigla: 'MT' },
  { value: 'Presentacion', label: 'Presentación', sigla: 'PRE' },
  { value: 'Contractual', label: 'Contractual', sigla: 'CON' },
  { value: 'Otro', label: 'Otro', sigla: 'DOC' }
];

export const ESTADOS_DOCUMENTO: { value: EstadoDocumento; label: string; tone: Tone }[] = [
  { value: 'Borrador', label: 'Borrador', tone: 'blue' },
  { value: 'EnRevision', label: 'En revisión', tone: 'amber' },
  { value: 'Aprobado', label: 'Aprobado', tone: 'green' },
  { value: 'Obsoleto', label: 'Obsoleto', tone: 'gray' }
];

/** Etiquetas frecuentes en proyectos SAP con integraciones; se combinan con las ya usadas en el proyecto. */
export const ETIQUETAS_SUGERIDAS = [
  'SAP', 'SUNAT', 'S/4HANA', 'FI', 'CO', 'MM', 'SD', 'PP', 'PM', 'HCM',
  'CPI', 'PI/PO', 'IDoc', 'RFC', 'BAPI', 'OData', 'ABAP', 'Fiori',
  'CPE', 'GRE', 'OSE', 'PSE', 'UBL 2.1', 'CDR', 'Factura', 'Nota de crédito',
  'Bancos', 'API', 'UAT', 'Go-live', 'Hypercare', 'Cliente'
];

export function tipoDocumentoLabel(tipo: TipoDocumento): string {
  return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label ?? tipo;
}

export function estadoDocumentoLabel(estado: EstadoDocumento): string {
  return ESTADOS_DOCUMENTO.find(e => e.value === estado)?.label ?? estado;
}

export function estadoDocumentoTone(estado: EstadoDocumento): Tone {
  return ESTADOS_DOCUMENTO.find(e => e.value === estado)?.tone ?? 'gray';
}

export interface FileVisual {
  icon: string;
  color: string;
  label: string;
}

/** Ícono y color por familia de archivo (Word azul, Excel verde, PDF rojo, etc.). */
export function fileVisual(extension: string): FileVisual {
  const ext = (extension || '').toLowerCase().replace(/^\./, '');
  if (ext === 'pdf') return { icon: 'file-text', color: '#f06a6a', label: 'PDF' };
  if (['doc', 'docx', 'dot', 'dotx', 'rtf', 'odt'].includes(ext)) return { icon: 'file-text', color: '#5b9bff', label: 'Word' };
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'ods'].includes(ext)) return { icon: 'file-spreadsheet', color: '#3ecf8e', label: 'Excel' };
  if (['ppt', 'pptx', 'odp'].includes(ext)) return { icon: 'presentation', color: '#f59e4b', label: 'PowerPoint' };
  if (['mpp', 'mpt'].includes(ext)) return { icon: 'chart-gantt', color: '#2dd4bf', label: 'Project' };
  if (['vsd', 'vsdx', 'bpmn', 'drawio'].includes(ext)) return { icon: 'waypoints', color: '#9f7afa', label: 'Diagrama' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'file-image', color: '#e879c9', label: 'Imagen' };
  if (['zip', '7z', 'rar'].includes(ext)) return { icon: 'file-archive', color: '#c9a86a', label: 'Comprimido' };
  if (['xml', 'xsd', 'xsl', 'xslt', 'wsdl', 'json', 'yaml', 'yml', 'edmx', 'sql', 'abap'].includes(ext)) return { icon: 'file-code', color: '#2dd4bf', label: 'Técnico' };
  if (['msg', 'eml'].includes(ext)) return { icon: 'mail', color: '#9ba3b8', label: 'Correo' };
  return { icon: 'file-text', color: '#9ba3b8', label: ext ? ext.toUpperCase() : 'Archivo' };
}

/** Tipos que el navegador puede mostrar en una pestaña nueva sin descargar. */
export function isPreviewable(extension: string): boolean {
  return ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt'].includes((extension || '').toLowerCase());
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function normalizeText(value: string): string {
  return (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Sugerencia de tipo a partir del nombre de archivo y la carpeta destino, para que la subida
 * masiva quede bien clasificada sin tener que elegir el tipo archivo por archivo.
 */
export function guessTipoDocumento(fileName: string, carpeta?: CarpetaDocumento | null): TipoDocumento {
  const n = normalizeText(fileName);
  const ext = n.split('.').pop() ?? '';
  const rules: [RegExp, TipoDocumento][] = [
    [/\bacta\b|minuta|kick.?off|comite/, 'ActaReunion'],
    [/cronograma|gantt|schedule/, 'Cronograma'],
    [/informe|reporte de avance|status report|estado semanal/, 'InformeAvance'],
    [/plan de proyecto|project plan|charter|constitucion/, 'PlanProyecto'],
    [/\bef[\s_-]|funcional|functional spec|\bfs[\s_-]/, 'EspecificacionFuncional'],
    [/\bet[\s_-]|tecnic|technical spec|\bts[\s_-]/, 'EspecificacionTecnica'],
    [/arquitectura|architecture|diagrama/, 'Arquitectura'],
    [/mapeo|mapping|interfaz|interface|integracion|idoc|wsdl|xsd|ubl/, 'MatrizIntegracion'],
    [/plan de pruebas|test plan|estrategia de pruebas/, 'PlanPruebas'],
    [/casos? de prueba|test cases?|script de prueba/, 'CasoPrueba'],
    [/evidencia|resultado de prueba|uat/, 'EvidenciaPruebas'],
    [/despliegue|deploy|pase a produccion|go.?live|rollback|cutover/, 'GuiaDespliegue'],
    [/manual de usuario|user manual|guia de usuario|capacitacion/, 'ManualUsuario'],
    [/manual tecnico|runbook|operacion/, 'ManualTecnico'],
    [/contrato|propuesta|orden de compra|\boc\b|conformidad|cotizacion/, 'Contractual'],
    [/requerimiento|requisito|requirement|\bbrd\b|levantamiento|gap/, 'Requerimiento']
  ];
  for (const [regex, tipo] of rules) {
    if (regex.test(n)) return tipo;
  }
  if (['mpp', 'mpt'].includes(ext)) return 'Cronograma';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'Presentacion';
  if (['xml', 'xsd', 'wsdl', 'edmx'].includes(ext)) return 'MatrizIntegracion';

  // Sin pistas en el nombre: se infiere de la carpeta corporativa destino.
  const byFolder: Record<string, TipoDocumento> = {
    '01.1': 'ActaReunion', '01.2': 'InformeAvance', '01': 'PlanProyecto',
    '02': 'Requerimiento', '03': 'EspecificacionFuncional', '04': 'EspecificacionTecnica',
    '05': 'MatrizIntegracion', '05.1': 'MatrizIntegracion', '05.2': 'MatrizIntegracion', '05.3': 'MatrizIntegracion',
    '07.1': 'CasoPrueba', '07.2': 'EvidenciaPruebas', '07': 'PlanPruebas',
    '08': 'GuiaDespliegue', '09': 'ManualUsuario', '10': 'ManualTecnico', '11': 'Contractual'
  };
  return (carpeta?.codigo && byFolder[carpeta.codigo]) || 'Otro';
}

/** Etiquetas sugeridas por la carpeta destino (p. ej. 05.2 → SUNAT). */
export function etiquetasPorCarpeta(carpeta?: CarpetaDocumento | null): string[] {
  switch (carpeta?.codigo) {
    case '05.1': return ['SAP'];
    case '05.2': return ['SUNAT'];
    case '05.3': return ['API'];
    case '07.2': return ['UAT'];
    case '08': return ['Go-live'];
    case '10': return ['Hypercare'];
    default: return [];
  }
}
