import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  CarpetaDocumento,
  CarpetaNodo,
  DocumentacionProyecto,
  Documento,
  ESTADOS_DOCUMENTO,
  ETIQUETAS_SUGERIDAS,
  EstadoDocumento,
  TIPOS_DOCUMENTO,
  TipoDocumento,
  estadoDocumentoLabel,
  estadoDocumentoTone,
  fileVisual,
  formatBytes,
  isPreviewable,
  normalizeText,
  tipoDocumentoLabel
} from '../../../core/models/documentos.models';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentosService } from '../../../core/services/documentos.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { CloseOnBackDirective } from '../../../shared/directives/close-on-back.directive';
import { DocumentoDetailDialogComponent } from './documento-detail-dialog.component';
import { DocumentoUploadDialogComponent } from './documento-upload-dialog.component';

const ALL = 'all';
const DOC_DRAG_TYPE = 'application/x-cp-documento';
const MAX_DEPTH = 3;

type SortKey = 'recent' | 'name' | 'code';

interface FolderDialogState {
  mode: 'create' | 'rename';
  parentId: string | null;
  carpeta?: CarpetaDocumento;
}

@Component({
  selector: 'cp-project-documentos',
  imports: [
    FormsModule,
    DatePipe,
    NgTemplateOutlet,
    LucideAngularModule,
    BadgeComponent,
    CloseOnBackDirective,
    DocumentoUploadDialogComponent,
    DocumentoDetailDialogComponent
  ],
  templateUrl: './project-documentos.component.html',
  styleUrls: ['./project-documentos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDocumentosComponent {
  private readonly documentosService = inject(DocumentosService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly proyectoId = input.required<string>();
  /** Documento a abrir al cargar (p. ej. al llegar desde el buscador global). */
  readonly focusDocumentoId = input<string | null>(null);
  readonly countChange = output<number>();

  protected readonly ALL = ALL;
  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly estados = ESTADOS_DOCUMENTO;
  protected readonly fileVisual = fileVisual;
  protected readonly formatBytes = formatBytes;
  protected readonly estadoLabel = estadoDocumentoLabel;
  protected readonly estadoTone = estadoDocumentoTone;
  protected readonly tipoLabel = tipoDocumentoLabel;
  protected readonly isPreviewable = isPreviewable;

  protected readonly canEdit = this.auth.hasPermission('documentos.editar');
  protected readonly canDelete = this.auth.hasPermission('documentos.eliminar');

  protected readonly data = signal<DocumentacionProyecto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedFolder = signal<string>(ALL);
  protected readonly expanded = signal<Set<string>>(new Set());
  protected readonly query = signal('');
  protected readonly tipoFilter = signal<TipoDocumento | ''>('');
  protected readonly estadoFilter = signal<EstadoDocumento | ''>('');
  protected readonly tagFilter = signal<string[]>([]);
  protected readonly sort = signal<SortKey>('recent');
  protected readonly highlightId = signal<string | null>(null);

  protected readonly dragActive = signal(false);
  protected readonly dropFolderId = signal<string | null>(null);
  private dragDepth = 0;

  protected readonly uploadFiles = signal<File[] | null>(null);
  protected readonly uploadFolderId = signal<string | null>(null);
  protected readonly detail = signal<Documento | null>(null);
  protected readonly folderDialog = signal<FolderDialogState | null>(null);
  protected readonly folderName = signal('');
  protected readonly folderDesc = signal('');
  protected readonly savingFolder = signal(false);

  private handledFocusId: string | null = null;

  // ------------------------------------------------------------------ derivados

  private readonly docs = computed(() => this.data()?.documentos ?? []);

  /** Árbol ordenado con conteos acumulados (carpeta + subcarpetas). */
  protected readonly tree = computed<CarpetaNodo[]>(() => {
    const carpetas = this.data()?.carpetas ?? [];
    const direct = new Map<string, number>();
    for (const d of this.docs()) direct.set(d.carpetaId, (direct.get(d.carpetaId) ?? 0) + 1);

    const build = (parentId: string | null, nivel: number, rutaPadre: string): CarpetaNodo[] =>
      carpetas
        .filter(c => (c.parentId ?? null) === parentId)
        .sort((a, b) => Number(b.esSistema) - Number(a.esSistema) || a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map(c => {
          const ruta = rutaPadre ? `${rutaPadre} / ${c.nombre}` : c.nombre;
          const hijas = build(c.id, nivel + 1, ruta);
          const total = (direct.get(c.id) ?? 0) + hijas.reduce((acc, h) => acc + h.totalDocumentos, 0);
          return { ...c, nivel, hijas, totalDocumentos: total, ruta };
        });

    return build(null, 0, '');
  });

  protected readonly flatFolders = computed<CarpetaNodo[]>(() => {
    const out: CarpetaNodo[] = [];
    const walk = (nodes: CarpetaNodo[]) => nodes.forEach(n => { out.push(n); walk(n.hijas); });
    walk(this.tree());
    return out;
  });

  private readonly folderById = computed(() => new Map(this.flatFolders().map(f => [f.id, f])));

  protected readonly selectedNode = computed(() => this.folderById().get(this.selectedFolder()) ?? null);

  private readonly selectedFolderIds = computed<Set<string> | null>(() => {
    const node = this.selectedNode();
    if (!node) return null;
    const ids = new Set<string>();
    const walk = (n: CarpetaNodo) => { ids.add(n.id); n.hijas.forEach(walk); };
    walk(node);
    return ids;
  });

  /** Documentos que cumplen búsqueda y filtros, sin considerar la carpeta. */
  private readonly matching = computed(() => {
    const tokens = normalizeText(this.query()).split(/\s+/).filter(Boolean);
    const tipo = this.tipoFilter();
    const estado = this.estadoFilter();
    const tags = this.tagFilter().map(normalizeText);
    const folders = this.folderById();

    return this.docs().filter(d => {
      if (tipo && d.tipo !== tipo) return false;
      if (estado && d.estado !== estado) return false;
      const docTags = d.etiquetas.map(normalizeText);
      if (tags.length && !tags.every(t => docTags.includes(t))) return false;
      if (!tokens.length) return true;

      const haystack = normalizeText([
        d.titulo, d.codigo, d.nombreArchivo, d.descripcion, tipoDocumentoLabel(d.tipo), estadoDocumentoLabel(d.estado),
        d.creadoPorNombre, d.actualizadoPorNombre, `v${d.versionActual}`, folders.get(d.carpetaId)?.ruta ?? '', ...d.etiquetas
      ].join(' '));
      // "#sunat" busca solo en etiquetas; el resto de términos en cualquier campo (AND).
      return tokens.every(t => t.startsWith('#') && t.length > 1
        ? docTags.some(tag => tag.includes(t.slice(1)))
        : haystack.includes(t));
    });
  });

  protected readonly filtered = computed(() => {
    const ids = this.selectedFolderIds();
    const list = ids ? this.matching().filter(d => ids.has(d.carpetaId)) : [...this.matching()];
    switch (this.sort()) {
      case 'name': return list.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
      case 'code': return list.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
      default: return list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }
  });

  /** Coincidencias fuera de la carpeta seleccionada: se ofrecen para no "perder" resultados. */
  protected readonly outsideCount = computed(() => (this.selectedFolderIds() ? this.matching().length - this.filtered().length : 0));

  protected readonly hasFilters = computed(() =>
    !!this.query().trim() || !!this.tipoFilter() || !!this.estadoFilter() || this.tagFilter().length > 0);

  protected readonly tagStats = computed(() => {
    const counts = new Map<string, number>();
    for (const d of this.docs()) for (const t of d.etiquetas) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, count]) => ({ tag, count }));
  });

  protected readonly tagSuggestions = computed(() => {
    const seen = new Set<string>();
    return [...this.tagStats().map(t => t.tag), ...ETIQUETAS_SUGERIDAS].filter(t => {
      const k = normalizeText(t);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

  protected readonly stats = computed(() => {
    const docs = this.filtered();
    return {
      total: docs.length,
      aprobados: docs.filter(d => d.estado === 'Aprobado').length,
      revision: docs.filter(d => d.estado === 'EnRevision').length,
      bytes: docs.reduce((acc, d) => acc + d.tamanoBytes, 0)
    };
  });

  constructor() {
    effect(() => {
      const id = this.proyectoId();
      untracked(() => this.load(id));
    });

    // Abre el documento pedido (buscador global) cuando los datos están disponibles.
    effect(() => {
      const focusId = this.focusDocumentoId();
      const docs = this.docs();
      if (!focusId || focusId === this.handledFocusId || !this.data()) return;
      const doc = docs.find(d => d.id === focusId);
      this.handledFocusId = focusId;
      if (!doc) {
        untracked(() => this.snackBar.open('El documento ya no está disponible.', 'Cerrar', { duration: 3000 }));
        return;
      }
      untracked(() => {
        this.clearFilters();
        this.selectFolder(doc.carpetaId);
        this.highlightId.set(doc.id);
        this.detail.set(doc);
        setTimeout(() => this.host.nativeElement.querySelector(`[data-doc="${doc.id}"]`)?.scrollIntoView({ block: 'center' }), 50);
      });
    });
  }

  // ------------------------------------------------------------------ carga

  protected load(proyectoId: string = this.proyectoId()): void {
    this.loading.set(true);
    this.error.set(null);
    this.documentosService.getByProject(proyectoId).subscribe({
      next: data => {
        this.data.set(data);
        this.loading.set(false);
        this.countChange.emit(data.documentos.length);
        // Por defecto se despliega el primer nivel para mostrar la estructura corporativa.
        if (this.expanded().size === 0) {
          this.expanded.set(new Set(data.carpetas.filter(c => !c.parentId).map(c => c.id)));
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'No se pudo cargar la documentación del proyecto.'));
      }
    });
  }

  private patchDocs(fn: (docs: Documento[]) => Documento[]): void {
    const current = this.data();
    if (!current) return;
    const documentos = fn(current.documentos);
    this.data.set({ ...current, documentos });
    this.countChange.emit(documentos.length);
  }

  // ------------------------------------------------------------------ árbol

  protected selectFolder(id: string): void {
    this.selectedFolder.set(id);
    // Asegura que la carpeta seleccionada quede visible en el árbol.
    const map = this.folderById();
    const next = new Set(this.expanded());
    let node = map.get(id);
    while (node?.parentId) {
      next.add(node.parentId);
      node = map.get(node.parentId);
    }
    this.expanded.set(next);
  }

  protected toggle(id: string, event?: Event): void {
    event?.stopPropagation();
    const next = new Set(this.expanded());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.expanded.set(next);
  }

  protected canAddSubfolder(node: CarpetaNodo | null): boolean {
    return this.canEdit && (!node || node.nivel + 1 < MAX_DEPTH);
  }

  protected openCreateFolder(parent: CarpetaNodo | null, event?: Event): void {
    event?.stopPropagation();
    this.folderName.set('');
    this.folderDesc.set('');
    this.folderDialog.set({ mode: 'create', parentId: parent?.id ?? null });
  }

  protected openRenameFolder(node: CarpetaNodo, event?: Event): void {
    event?.stopPropagation();
    this.folderName.set(node.nombre);
    this.folderDesc.set(node.descripcion);
    this.folderDialog.set({ mode: 'rename', parentId: node.parentId, carpeta: node });
  }

  protected folderDialogParentLabel(): string {
    const parentId = this.folderDialog()?.parentId;
    return parentId ? this.folderById().get(parentId)?.ruta ?? '' : 'Raíz del proyecto';
  }

  protected saveFolder(): void {
    const state = this.folderDialog();
    const nombre = this.folderName().trim();
    if (!state || !nombre || this.savingFolder()) return;
    this.savingFolder.set(true);

    const request$ = state.mode === 'create'
      ? this.documentosService.createFolder(this.proyectoId(), state.parentId, nombre, this.folderDesc().trim())
      : this.documentosService.renameFolder(state.carpeta!.id, nombre, this.folderDesc().trim());

    request$.subscribe({
      next: carpeta => {
        this.savingFolder.set(false);
        this.folderDialog.set(null);
        const current = this.data();
        if (!current) return;
        const carpetas = state.mode === 'create'
          ? [...current.carpetas, carpeta]
          : current.carpetas.map(c => (c.id === carpeta.id ? carpeta : c));
        this.data.set({ ...current, carpetas });
        if (state.mode === 'create') {
          if (state.parentId) this.expanded.set(new Set(this.expanded()).add(state.parentId));
          this.selectFolder(carpeta.id);
        }
        this.snackBar.open(state.mode === 'create' ? 'Carpeta creada.' : 'Carpeta actualizada.', 'Cerrar', { duration: 2500 });
      },
      error: err => {
        this.savingFolder.set(false);
        this.snackBar.open(apiErrorMessage(err, 'No se pudo guardar la carpeta.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected deleteFolder(node: CarpetaNodo, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`¿Eliminar la carpeta «${node.nombre}»? Solo se permite si está vacía.`)) return;
    this.documentosService.deleteFolder(node.id).subscribe({
      next: () => {
        const current = this.data();
        if (current) this.data.set({ ...current, carpetas: current.carpetas.filter(c => c.id !== node.id) });
        if (this.selectedFolder() === node.id) this.selectedFolder.set(node.parentId ?? ALL);
        this.snackBar.open('Carpeta eliminada.', 'Cerrar', { duration: 2500 });
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar la carpeta.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ------------------------------------------------------------------ filtros

  protected toggleTag(tag: string): void {
    const tags = this.tagFilter();
    this.tagFilter.set(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.tipoFilter.set('');
    this.estadoFilter.set('');
    this.tagFilter.set([]);
  }

  protected folderRuta(carpetaId: string): string {
    return this.folderById().get(carpetaId)?.ruta ?? '';
  }

  // ------------------------------------------------------------------ subida / drag & drop

  protected openUpload(files: File[], folderId: string | null = null): void {
    if (!this.canEdit || !files.length || !this.data()) return;
    const selected = this.selectedFolder();
    this.uploadFolderId.set(folderId ?? (selected !== ALL ? selected : null));
    this.uploadFiles.set(files);
  }

  protected onPick(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.openUpload(files);
  }

  protected onUploadClosed(count: number): void {
    this.uploadFiles.set(null);
    if (count > 0) {
      this.snackBar.open(`${count} documento${count === 1 ? '' : 's'} subido${count === 1 ? '' : 's'}.`, 'Cerrar', { duration: 3000 });
      this.load();
    }
  }

  private isFileDrag(event: DragEvent): boolean {
    return !!event.dataTransfer?.types.includes('Files');
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.canEdit || !this.isFileDrag(event) || this.uploadFiles()) return;
    event.preventDefault();
    this.dragDepth++;
    this.dragActive.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.canEdit || !this.isFileDrag(event) || this.uploadFiles()) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragActive.set(false);
      this.dropFolderId.set(null);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.isFileDrag(event)) return;
    event.preventDefault();
    const target = this.dropFolderId();
    this.resetDrag();
    this.openUpload(Array.from(event.dataTransfer?.files ?? []), target);
  }

  private resetDrag(): void {
    this.dragDepth = 0;
    this.dragActive.set(false);
    this.dropFolderId.set(null);
  }

  /** Arrastrar una fila de documento a una carpeta del árbol la mueve. */
  protected onDocDragStart(event: DragEvent, doc: Documento): void {
    if (!this.canEdit || !event.dataTransfer) return;
    event.dataTransfer.setData(DOC_DRAG_TYPE, doc.id);
    event.dataTransfer.effectAllowed = 'move';
  }

  protected onFolderDragOver(event: DragEvent, folderId: string): void {
    if (!this.canEdit) return;
    const types = event.dataTransfer?.types ?? [];
    if (!types.includes('Files') && !types.includes(DOC_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = types.includes('Files') ? 'copy' : 'move';
    this.dropFolderId.set(folderId);
  }

  protected onFolderDragLeave(folderId: string): void {
    if (this.dropFolderId() === folderId && !this.dragActive()) this.dropFolderId.set(null);
  }

  protected onFolderDrop(event: DragEvent, folderId: string): void {
    if (!this.canEdit) return;
    const docId = event.dataTransfer?.getData(DOC_DRAG_TYPE);
    if (this.isFileDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
      this.resetDrag();
      this.openUpload(Array.from(event.dataTransfer?.files ?? []), folderId);
    } else if (docId) {
      event.preventDefault();
      event.stopPropagation();
      this.dropFolderId.set(null);
      this.moveDocument(docId, folderId);
    }
  }

  private moveDocument(docId: string, folderId: string): void {
    const doc = this.docs().find(d => d.id === docId);
    if (!doc || doc.carpetaId === folderId) return;
    this.documentosService.update(doc.id, {
      carpetaId: folderId,
      titulo: doc.titulo,
      descripcion: doc.descripcion,
      tipo: doc.tipo,
      estado: doc.estado,
      etiquetas: doc.etiquetas
    }).subscribe({
      next: updated => {
        this.patchDocs(docs => docs.map(d => (d.id === updated.id ? updated : d)));
        this.snackBar.open(`«${updated.titulo}» movido a ${this.folderRuta(folderId)}.`, 'Cerrar', { duration: 3000 });
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'No se pudo mover el documento.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ------------------------------------------------------------------ acciones de documento

  protected openDetail(doc: Documento): void {
    this.highlightId.set(doc.id);
    this.detail.set(doc);
  }

  protected onDocumentChanged(doc: Documento): void {
    this.patchDocs(docs => docs.map(d => (d.id === doc.id ? doc : d)));
  }

  protected download(doc: Documento, event?: Event): void {
    event?.stopPropagation();
    this.documentosService.download(doc.id, doc.nombreArchivo).subscribe({
      error: err => this.snackBar.open(apiErrorMessage(err, 'No se pudo descargar el archivo.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteDocument(doc: Documento): void {
    if (!confirm(`¿Eliminar «${doc.codigo} · ${doc.titulo}»? Se conservará en el archivo histórico, pero dejará de mostrarse.`)) return;
    this.documentosService.delete(doc.id).subscribe({
      next: () => {
        this.detail.set(null);
        this.patchDocs(docs => docs.filter(d => d.id !== doc.id));
        this.snackBar.open('Documento eliminado.', 'Cerrar', { duration: 2500 });
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el documento.'), 'Cerrar', { duration: 4200 })
    });
  }
}
