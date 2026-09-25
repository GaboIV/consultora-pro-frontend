/**
 * Salidas del organigrama (impresión/PDF, Excel y texto). Se generan desde los datos y no desde el
 * DOM del editor, para que el resultado no dependa del zoom, del tema oscuro ni de ramas contraídas.
 */

export interface ExportNodo {
  id: string;
  parentId: string | null;
  orden: number;
  cargo: string;
  area: string;
  persona: string | null;
  correo: string;
  iniciales: string;
  color: string;
  notas: string;
}

export interface ExportOrganigrama {
  nombre: string;
  descripcion: string;
  nodos: ExportNodo[];
}

/** Colores de impresión (más oscuros que los del tema para que se lean sobre papel blanco). */
const COLORES_PRINT: Record<string, string> = {
  '': '#2563eb',
  green: '#059669',
  amber: '#d97706',
  purple: '#7c3aed',
  teal: '#0d9488',
  red: '#dc2626'
};

/** Área imprimible de un A4 horizontal con márgenes de 8 mm, en px CSS (96 dpi). */
const PAGINA_ANCHO_PX = 1060;
const PAGINA_ALTO_PX = 730;

function escapar(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hijosPorPadre(nodos: ExportNodo[]): Map<string | null, ExportNodo[]> {
  const map = new Map<string | null, ExportNodo[]>();
  for (const n of nodos) {
    const grupo = map.get(n.parentId) ?? [];
    grupo.push(n);
    map.set(n.parentId, grupo);
  }
  for (const grupo of map.values()) grupo.sort((a, b) => a.orden - b.orden);
  return map;
}

/** Recorre el árbol en profundidad devolviendo cada nodo con su nivel (0 = raíz). */
function recorrer(nodos: ExportNodo[], raizId: string | null = null): { nodo: ExportNodo; nivel: number }[] {
  const hijos = hijosPorPadre(nodos);
  const result: { nodo: ExportNodo; nivel: number }[] = [];
  const visitar = (n: ExportNodo, nivel: number) => {
    result.push({ nodo: n, nivel });
    for (const h of hijos.get(n.id) ?? []) visitar(h, nivel + 1);
  };
  const raices = raizId ? nodos.filter((n) => n.id === raizId) : hijos.get(null) ?? [];
  for (const r of raices) visitar(r, 0);
  return result;
}

// ── Impresión / PDF ─────────────────────────────────────────────────────────

/** Documento HTML autocontenido (tema claro) con el árbol completo o la rama que cuelga de `raizId`. */
export function construirHtmlImpresion(org: ExportOrganigrama, raizId: string | null = null): string {
  const hijos = hijosPorPadre(org.nodos);

  const tarjeta = (n: ExportNodo): string => {
    const color = COLORES_PRINT[n.color] ?? COLORES_PRINT[''];
    const persona = n.persona
      ? `<div class="name">${escapar(n.persona)}</div>`
      : `<div class="name is-vacante">Vacante</div>`;
    const area = n.area ? `<div class="area">${escapar(n.area)}</div>` : '';
    return (
      `<div class="card" style="--c:${color}">` +
      `<div class="head"><span class="avatar">${escapar(n.iniciales || '?')}</span>${persona}</div>` +
      `<div class="cargo">${escapar(n.cargo)}</div>${area}</div>`
    );
  };

  const rama = (lista: ExportNodo[]): string =>
    lista.length === 0
      ? ''
      : `<ul>${lista.map((n) => `<li>${tarjeta(n)}${rama(hijos.get(n.id) ?? [])}</li>`).join('')}</ul>`;

  const raices = raizId ? org.nodos.filter((n) => n.id === raizId) : hijos.get(null) ?? [];
  const subtitulo = raizId && raices[0] ? `Rama: ${raices[0].cargo}` : org.descripcion;
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(org.nombre)}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #111827; font-family: 'DM Sans', sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { align-items: baseline; border-bottom: 1px solid #e5e7eb; display: flex; gap: 16px;
    justify-content: space-between; margin-bottom: 18px; padding-bottom: 8px; }
  h1 { font-family: 'Syne', sans-serif; font-size: 20px; margin: 0; }
  header p { color: #6b7280; font-size: 12px; margin: 2px 0 0; }
  header small { color: #9ca3af; font-size: 11px; white-space: nowrap; }
  .tree { margin: 0 auto; width: max-content; }
  .tree ul { display: flex; justify-content: center; list-style: none; margin: 0; padding: 22px 0 0; position: relative; }
  .tree li { align-items: center; break-inside: avoid; display: flex; flex-direction: column; padding: 22px 6px 0; position: relative; }
  .tree li::before, .tree li::after { border-top: 1.5px solid #9ca3af; content: ''; height: 22px; position: absolute; right: 50%; top: 0; width: 50%; }
  .tree li::after { border-left: 1.5px solid #9ca3af; left: 50%; right: auto; }
  .tree li:only-child::before, .tree li:only-child::after { display: none; }
  .tree li:only-child { padding-top: 0; }
  .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
  .tree li:last-child::before { border-radius: 0 6px 0 0; border-right: 1.5px solid #9ca3af; }
  .tree li:first-child::after { border-radius: 6px 0 0 0; }
  .tree ul ul::before { border-left: 1.5px solid #9ca3af; content: ''; height: 22px; left: calc(50% - 0.75px); position: absolute; top: 0; }
  .tree > ul { gap: 28px; padding-top: 0; }
  .tree > ul > li { padding-top: 0; }
  .tree > ul > li::before, .tree > ul > li::after { display: none; }
  .card { background: #fff; border: 1px solid #d1d5db; border-radius: 10px; border-top: 3px solid var(--c);
    display: flex; flex-direction: column; gap: 5px; padding: 9px 11px 10px; text-align: left; width: 200px; }
  .head { align-items: center; display: flex; gap: 8px; }
  .avatar { align-items: center; background: color-mix(in srgb, var(--c) 14%, #fff); border-radius: 50%; color: var(--c);
    display: inline-flex; flex: 0 0 auto; font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 800;
    height: 28px; justify-content: center; width: 28px; }
  .name { font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700; line-height: 1.25; }
  .name.is-vacante { color: #9ca3af; font-style: italic; font-weight: 600; }
  .cargo { color: #4b5563; font-size: 11.5px; line-height: 1.3; }
  .area { align-self: flex-start; background: color-mix(in srgb, var(--c) 12%, #fff); border-radius: 999px;
    color: var(--c); font-size: 9.5px; font-weight: 700; padding: 1px 7px; }
</style>
</head>
<body>
<header>
  <div><h1>${escapar(org.nombre)}</h1>${subtitulo ? `<p>${escapar(subtitulo)}</p>` : ''}</div>
  <small>${escapar(fecha)}</small>
</header>
<div class="tree">${rama(raices)}</div>
</body>
</html>`;
}

/** Escala el árbol del documento de impresión para que entre en una página A4 horizontal. */
export function ajustarImpresionAPagina(doc: Document): void {
  const tree = doc.querySelector<HTMLElement>('.tree');
  const header = doc.querySelector<HTMLElement>('header');
  if (!tree) return;

  tree.style.zoom = '1';
  const rect = tree.getBoundingClientRect();
  const altoDisponible = PAGINA_ALTO_PX - (header?.getBoundingClientRect().height ?? 0) - 24;
  const escala = Math.min(1, PAGINA_ANCHO_PX / rect.width, altoDisponible / rect.height);
  tree.style.zoom = String(Math.floor(escala * 100) / 100);
}

/**
 * Imprime mediante un iframe oculto (sin abrir ventanas). El diálogo del navegador permite
 * además "Guardar como PDF".
 */
export function imprimirOrganigrama(org: ExportOrganigrama, raizId: string | null = null): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none;';
  iframe.srcdoc = construirHtmlImpresion(org, raizId);

  iframe.onload = async () => {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) return;
    try {
      await doc.fonts.ready;
    } catch {
      // Si las fuentes no cargan se imprime con las de respaldo.
    }
    ajustarImpresionAPagina(doc);
    win.addEventListener('afterprint', () => setTimeout(() => iframe.remove()));
    win.focus();
    win.print();
    // Respaldo por si el navegador no emite afterprint.
    setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
  };

  document.body.appendChild(iframe);
}

// ── Excel ───────────────────────────────────────────────────────────────────

export async function exportarExcel(org: ExportOrganigrama): Promise<void> {
  const XLSX = await import('xlsx');
  const porId = new Map(org.nodos.map((n) => [n.id, n]));

  const filas = recorrer(org.nodos).map(({ nodo, nivel }) => {
    const jefe = nodo.parentId ? porId.get(nodo.parentId) : undefined;
    return {
      Nivel: nivel + 1,
      Persona: nodo.persona ?? 'Vacante',
      Cargo: nodo.cargo,
      Área: nodo.area,
      Correo: nodo.correo,
      'Depende de': jefe ? (jefe.persona ? `${jefe.persona} (${jefe.cargo})` : jefe.cargo) : '',
      Notas: nodo.notas
    };
  });

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 40 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Organigrama');
  XLSX.writeFile(libro, `${nombreArchivo(org.nombre)}.xlsx`);
}

// ── Texto ───────────────────────────────────────────────────────────────────

/** Esquema indentado, útil para pegar en un correo o documento. */
export function construirTexto(org: ExportOrganigrama): string {
  const lineas = recorrer(org.nodos).map(({ nodo, nivel }) => {
    const persona = nodo.persona ?? 'Vacante';
    const area = nodo.area ? ` [${nodo.area}]` : '';
    return `${'    '.repeat(nivel)}${nivel > 0 ? '└ ' : ''}${persona} — ${nodo.cargo}${area}`;
  });
  return [org.nombre, '', ...lineas].join('\n');
}

function nombreArchivo(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'organigrama'
  );
}
