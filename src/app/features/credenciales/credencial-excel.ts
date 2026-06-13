import * as XLSX from 'xlsx';

import {
  CampoEspecifico,
  TipoCredencialSchema,
  schemaDe,
  validarCamposPorTipo
} from '../../core/models/credencial-schema';
import {
  CredencialListItem,
  ImportCredencialRow,
  TipoCredencial,
  expirationLabel,
  tipoCredencialMeta
} from '../../core/models/credenciales.models';

/**
 * Pipeline Excel del módulo de credenciales: plantilla multipestaña generada
 * desde CREDENCIAL_SCHEMAS, parseo con validación por fila y exportación de
 * metadatos (nunca secretos).
 */

export const MARCA_FILA_EJEMPLO = 'EJEMPLO — elimina esta fila antes de importar';

/** Pestañas de la plantilla (los nombres de hoja no admiten / \\ ? * [ ]). */
export const HOJAS_PLANTILLA: { hoja: string; tipo: TipoCredencial }[] = [
  { hoja: 'SSH Contraseña', tipo: 'Servidor' },
  { hoja: 'SSH Key', tipo: 'SSHKey' },
  { hoja: 'RDP', tipo: 'RDP' },
  { hoja: 'VPN', tipo: 'VPN' },
  { hoja: 'Tunel SSH', tipo: 'Tunel' },
  { hoja: 'Base de Datos', tipo: 'BaseDatos' },
  { hoja: 'Cloud API Keys', tipo: 'APIKey' }
];

const COMUNES = {
  nombre: 'Nombre *',
  proyecto: 'Proyecto *',
  ambiente: 'Ambiente',
  vencimiento: 'Vencimiento * (AAAA-MM-DD)',
  notas: 'Notas'
};

export interface ProyectoRef {
  id: string;
  name: string;
  clientName: string;
}

export interface FilaImportada {
  fila: number;
  hoja: string;
  tipo: TipoCredencial;
  nombre: string;
  proyectoTexto: string;
  proyectoId: string | null;
  ambienteTexto: string;
  ambienteId: string | null;
  fechaVencimiento: string | null;
  notas: string;
  host: string | null;
  puerto: number | null;
  usuario: string | null;
  url: string | null;
  camposExtra: Record<string, string> | null;
  valor: string;
  secretosExtra: Record<string, string> | null;
  errores: string[];
}

// ─── Plantilla ─────────────────────────────────────────────────────────────

export function descargarPlantilla(): void {
  const wb = XLSX.utils.book_new();

  const guia = XLSX.utils.aoa_to_sheet([
    ['Plantilla de importación de credenciales — ConsultoraPro'],
    [],
    ['Cómo usarla:'],
    ['1. Cada pestaña corresponde a un tipo de credencial con sus columnas específicas.'],
    ['2. Los campos marcados con * son obligatorios para ese tipo.'],
    ['3. Proyecto: usa el nombre exacto del proyecto o su ID.'],
    ['4. Ambiente (opcional): nombre exacto del ambiente dentro del proyecto.'],
    ['5. Vencimiento: formato AAAA-MM-DD (ej. 2027-06-30).'],
    ['6. La primera fila de datos de cada pestaña es un ejemplo guía: elimínala o se omitirá al importar.'],
    ['7. Máximo 500 filas por importación.'],
    [],
    ['Pestañas disponibles:'],
    ...HOJAS_PLANTILLA.map(h => [`· ${h.hoja} → ${tipoCredencialMeta(h.tipo).label}`])
  ]);
  guia['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, guia, 'Guía');

  for (const { hoja, tipo } of HOJAS_PLANTILLA) {
    const schema = schemaDe(tipo);
    const headers = buildHeaders(schema);
    const ejemplo = buildEjemplo(schema, hoja);
    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(16, h.length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, hoja);
  }

  XLSX.writeFile(wb, 'plantilla-credenciales.xlsx');
}

function buildHeaders(schema: TipoCredencialSchema): string[] {
  return [
    COMUNES.nombre,
    COMUNES.proyecto,
    COMUNES.ambiente,
    COMUNES.vencimiento,
    COMUNES.notas,
    ...schema.campos.map(headerDeCampo),
    `${schema.valorLabel} *`
  ];
}

function headerDeCampo(campo: CampoEspecifico): string {
  const label = campo.label.replace(/\s*\(opcional\)\s*/i, '');
  return campo.required ? `${label} *` : label;
}

function buildEjemplo(schema: TipoCredencialSchema, hoja: string): string[] {
  return [
    `Ejemplo ${hoja} producción`,
    'Nombre exacto del proyecto',
    '',
    '2027-06-30',
    MARCA_FILA_EJEMPLO,
    ...schema.campos.map(c => c.ejemplo ?? ''),
    schema.valorEjemplo ?? ''
  ];
}

// ─── Parseo e importación ──────────────────────────────────────────────────

export function parsearExcel(data: ArrayBuffer, proyectos: ProyectoRef[]): FilaImportada[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const filas: FilaImportada[] = [];

  for (const { hoja, tipo } of HOJAS_PLANTILLA) {
    const ws = wb.Sheets[hoja];
    if (!ws) continue;

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    if (matriz.length < 2) continue;

    const headers = (matriz[0] as unknown[]).map(h => normalizar(String(h ?? '')));
    const schema = schemaDe(tipo);
    const indice = construirIndice(headers, schema);

    for (let i = 1; i < matriz.length; i++) {
      const celdas = matriz[i] as unknown[];
      if (!celdas || celdas.every(c => esVacio(c))) continue;

      const fila = parsearFila(celdas, indice, schema, tipo, hoja, i + 1, proyectos);
      if (fila) filas.push(fila);
    }
  }

  return filas;
}

interface IndiceColumnas {
  nombre: number;
  proyecto: number;
  ambiente: number;
  vencimiento: number;
  notas: number;
  valor: number;
  campos: { campo: CampoEspecifico; col: number }[];
}

function construirIndice(headers: string[], schema: TipoCredencialSchema): IndiceColumnas {
  const buscar = (etiqueta: string): number => headers.indexOf(normalizar(etiqueta));

  return {
    nombre: buscar(COMUNES.nombre),
    proyecto: buscar(COMUNES.proyecto),
    ambiente: buscar(COMUNES.ambiente),
    vencimiento: buscar(COMUNES.vencimiento),
    notas: buscar(COMUNES.notas),
    valor: buscar(`${schema.valorLabel} *`),
    campos: schema.campos
      .map(campo => ({ campo, col: buscar(headerDeCampo(campo)) }))
      .filter(entry => entry.col >= 0)
  };
}

function parsearFila(
  celdas: unknown[],
  indice: IndiceColumnas,
  schema: TipoCredencialSchema,
  tipo: TipoCredencial,
  hoja: string,
  numeroFila: number,
  proyectos: ProyectoRef[]
): FilaImportada | null {
  const celda = (col: number): string => (col >= 0 ? textoDe(celdas[col]) : '');

  const notas = celda(indice.notas);
  if (notas.includes('elimina esta fila')) return null;

  const errores: string[] = [];
  const nombre = celda(indice.nombre);
  const proyectoTexto = celda(indice.proyecto);
  const ambienteTexto = celda(indice.ambiente);
  const vencimientoRaw = indice.vencimiento >= 0 ? celdas[indice.vencimiento] : '';
  const valor = celda(indice.valor);

  if (!nombre) errores.push('El campo [Nombre] es obligatorio');

  const proyectoId = resolverProyecto(proyectoTexto, proyectos, errores);
  const fechaVencimiento = parsearFecha(vencimientoRaw);
  if (!fechaVencimiento) errores.push('El campo [Vencimiento] es obligatorio en formato AAAA-MM-DD');
  if (!valor) errores.push(`El campo [${schema.valorLabel}] es obligatorio para el tipo ${tipoCredencialMeta(tipo).label}`);

  let host: string | null = null;
  let puerto: number | null = null;
  let usuario: string | null = null;
  let url: string | null = null;
  const camposExtra: Record<string, string> = {};
  const secretosExtra: Record<string, string> = {};

  for (const { campo, col } of indice.campos) {
    const raw = celda(col);
    if (!raw) continue;

    if (campo.base === 'host') host = raw;
    else if (campo.base === 'puerto') {
      puerto = Number(raw) || null;
      if (raw && puerto == null) errores.push(`El campo [${campo.label}] debe ser numérico`);
    } else if (campo.base === 'usuario') usuario = raw;
    else if (campo.base === 'url') url = raw;
    else if (campo.secreto) secretosExtra[campo.key] = raw;
    else camposExtra[campo.key] = raw;
  }

  const extra = Object.keys(camposExtra).length ? camposExtra : null;
  errores.push(...validarCamposPorTipo(tipo, { host, puerto, usuario, url, camposExtra: extra }));

  return {
    fila: numeroFila,
    hoja,
    tipo,
    nombre,
    proyectoTexto,
    proyectoId,
    ambienteTexto,
    ambienteId: null,
    fechaVencimiento,
    notas: notas === MARCA_FILA_EJEMPLO ? '' : notas,
    host,
    puerto,
    usuario,
    url,
    camposExtra: extra,
    valor,
    secretosExtra: Object.keys(secretosExtra).length ? secretosExtra : null,
    errores
  };
}

export function aImportRow(fila: FilaImportada): ImportCredencialRow {
  return {
    fila: fila.fila,
    nombre: fila.nombre,
    tipo: fila.tipo,
    servidor: fila.nombre,
    host: fila.host,
    puerto: fila.puerto,
    usuario: fila.usuario,
    url: fila.url,
    notas: fila.notas || null,
    camposExtra: fila.camposExtra,
    proyectoId: fila.proyectoId!,
    ambienteId: fila.ambienteId,
    valor: fila.valor,
    secretosExtra: fila.secretosExtra,
    fechaVencimiento: fila.fechaVencimiento!
  };
}

// ─── Exportación (metadatos, nunca secretos) ───────────────────────────────

export function exportarCredenciales(items: CredencialListItem[]): void {
  const filas = items.map(item => ({
    Nombre: item.nombre,
    Tipo: tipoCredencialMeta(item.tipo).label,
    'Host / IP': item.host ?? '',
    Puerto: item.puerto ?? '',
    Usuario: item.usuario ?? '',
    URL: item.url ?? '',
    Proyecto: item.proyectoNombre,
    Ambiente: item.ambienteNombre ?? '',
    Vencimiento: item.fechaVencimiento ? item.fechaVencimiento.slice(0, 10) : '',
    Estado: expirationLabel(item),
    Notas: item.notas ?? ''
  }));

  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = Object.keys(filas[0] ?? { _: '' }).map(key => ({ wch: Math.max(14, key.length + 6) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Credenciales');
  XLSX.writeFile(wb, `credenciales-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*\(aaaa-mm-dd\)\s*/gi, '')
    .replace(/\s*\(opcional\)\s*/gi, '')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase();
}

function esVacio(celda: unknown): boolean {
  return celda == null || String(celda).trim() === '';
}

function textoDe(celda: unknown): string {
  if (celda == null) return '';
  if (celda instanceof Date) return fechaLocal(celda);
  return String(celda).trim();
}

function resolverProyecto(texto: string, proyectos: ProyectoRef[], errores: string[]): string | null {
  if (!texto) {
    errores.push('El campo [Proyecto] es obligatorio');
    return null;
  }

  const porId = proyectos.find(p => p.id === texto);
  if (porId) return porId.id;

  const buscado = normalizar(texto);
  const coincidencias = proyectos.filter(p =>
    normalizar(p.name) === buscado || normalizar(`${p.clientName} · ${p.name}`) === buscado
  );

  if (coincidencias.length === 1) return coincidencias[0].id;
  errores.push(coincidencias.length === 0
    ? `Proyecto "${texto}" no encontrado`
    : `Proyecto "${texto}" es ambiguo: usa el ID`);
  return null;
}

function parsearFecha(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return fechaLocal(raw);

  if (typeof raw === 'number' && raw > 0) {
    // Serial de Excel (días desde 1900-01-01, época 25569 = 1970-01-01)
    const date = new Date(Math.round((raw - 25569) * 86_400_000));
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const texto = String(raw ?? '').trim();
  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const ddmmyyyy = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

function fechaLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
