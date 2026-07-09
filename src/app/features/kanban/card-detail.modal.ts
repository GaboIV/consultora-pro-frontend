import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TarjetasService } from '../../core/services/tarjetas.service';
import { TablerosService } from '../../core/services/tableros.service';
import { AuthService } from '../../core/services/auth.service';
import {
  TableroDetalle, TarjetaDetalle, Actividad, PrioridadTarjeta,
  PRIORIDAD_OPTIONS, ETIQUETA_COLORS, actividadLabel, Etiqueta, Comentario, Adjunto
} from '../../core/models/kanban.models';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { applyMarkdown, renderMarkdown, htmlToMarkdown, MarkdownFormat } from '../../core/utils/markdown';
import { ImageViewerComponent, ImageViewerData, ImageViewerMeta } from './image-viewer.component';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';

interface UsuarioOpcion { id: string; nombre: string; iniciales: string; }
interface CardDialogData {
  tarjetaId: string;
  tablero: TableroDetalle;
  usuarios: UsuarioOpcion[];
  canEdit: boolean;
}

/** Acción de la barra de herramientas markdown (icono + formato). */
interface ToolButton { format: MarkdownFormat; icon: string; title: string; }

@Component({
  selector: 'cp-card-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, MatDialogModule, ImageViewerComponent, CloseOnBackDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-detail.modal.html',
  styleUrls: ['./card-detail.modal.scss']
})
export class CardDetailModalComponent implements OnInit {
  protected readonly data = inject<CardDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CardDetailModalComponent>);
  private readonly tarjetasService = inject(TarjetasService);
  private readonly tablerosService = inject(TablerosService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly descEditor = viewChild<ElementRef<HTMLTextAreaElement>>('descEditor');
  private readonly commentEditor = viewChild<ElementRef<HTMLTextAreaElement>>('commentEditor');
  private readonly descImageInput = viewChild<ElementRef<HTMLInputElement>>('descImageInput');
  private readonly commentImageInput = viewChild<ElementRef<HTMLInputElement>>('commentImageInput');
  private readonly commentsList = viewChild<ElementRef<HTMLUListElement>>('commentsList');

  protected readonly tarjeta = signal<TarjetaDetalle | null>(null);
  protected readonly actividad = signal<Actividad[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeTab = signal<'comentarios' | 'actividad'>('comentarios');
  private changed = false;

  protected readonly canEdit = this.data.canEdit;
  protected readonly usuarios = this.data.usuarios;
  protected readonly columnas = this.data.tablero.columnas;
  protected readonly etiquetasCatalogo = signal(this.data.tablero.etiquetas);
  protected readonly prioridadOptions = PRIORIDAD_OPTIONS;
  protected readonly colorOptions = [
    { value: 'green' }, { value: 'green-dark' }, { value: 'emerald' }, { value: 'teal' }, { value: 'cyan' }, { value: 'sky' },
    { value: 'blue' }, { value: 'blue-dark' }, { value: 'indigo' }, { value: 'purple' }, { value: 'purple-dark' }, { value: 'magenta' },
    { value: 'pink' }, { value: 'rose' }, { value: 'red' }, { value: 'red-dark' }, { value: 'orange' }, { value: 'orange-dark' },
    { value: 'amber' }, { value: 'yellow' }, { value: 'lime' }, { value: 'lime-dark' }, { value: 'gray' }, { value: 'black' }
  ];
  protected readonly actividadLabel = actividadLabel;
  protected readonly renderMarkdown = renderMarkdown;

  // Barra de herramientas WYSIWYG (markdown).
  protected readonly toolbar: ToolButton[] = [
    { format: 'bold', icon: 'bold', title: 'Negrita' },
    { format: 'italic', icon: 'italic', title: 'Itálica' },
    { format: 'underline', icon: 'underline', title: 'Subrayado' },
    { format: 'strike', icon: 'strikethrough', title: 'Tachado' },
    { format: 'code', icon: 'code', title: 'Código en línea' },
    { format: 'codeblock', icon: 'square-code', title: 'Bloque de código' },
    { format: 'ul', icon: 'list', title: 'Lista' },
    { format: 'ol', icon: 'list-ordered', title: 'Lista numerada' },
    { format: 'link', icon: 'link', title: 'Enlace' },
    { format: 'image', icon: 'image', title: 'Imagen' }
  ];

  // Campos editables
  protected editingTitle = signal(false);
  protected titulo = '';
  protected descripcion = '';
  protected descPreview = signal(false);
  protected editingDesc = signal(false);
  protected isDescLong = signal(false);
  protected descExpanded = signal(false);
  protected activeCommentEdit = signal(false);
  protected editingCommentId = signal<string | null>(null);
  protected editCommentTexto = signal<string>('');

  protected toggleDescExpand(): void {
    this.descExpanded.update((v) => !v);
  }

  protected checkDescHeight(): void {
    setTimeout(() => {
      const el = document.getElementById('desc-content');
      if (el) {
        this.isDescLong.set(el.scrollHeight > 200);
      } else {
        this.isDescLong.set(false);
      }
    }, 50);
  }
  protected get hasDescChanged(): boolean {
    return this.descripcion.trim() !== (this.tarjeta()?.descripcion || '').trim();
  }
  protected prioridad: PrioridadTarjeta = 'Media';
  protected fechaLimite = '';
  protected fechaInicio = '';
  protected completada = false;

  protected nuevoComentario = '';

  // Checklists (múltiples, con nombre)
  protected readonly editingChecklistsMode = signal(false);
  protected nuevoChecklistNombre = '';
  protected readonly nuevoItemTexto: Record<string, string> = {};
  protected readonly showItemInput = signal<string | null>(null);
  protected readonly editingChecklistId = signal<string | null>(null);
  protected editChecklistNombre = '';
  protected readonly editingItemId = signal<string | null>(null);
  protected editItemTexto = '';

  // Menú de etiquetas estilo Trello
  protected readonly showEtiquetasMenu = signal(false);
  protected readonly etiquetasMenuMode = signal<'select' | 'create' | 'edit'>('select');
  protected readonly etiquetaFilterText = signal('');
  protected nuevaEtiquetaNombre = '';
  protected nuevaEtiquetaColor = 'blue';
  protected editEtiquetaId = '';
  protected editEtiquetaNombre = '';
  protected editEtiquetaColor = 'blue';

  private savedRange: Range | null = null;
  protected readonly uploadingDesc = signal(false);
  protected readonly uploadingComment = signal(false);
  protected readonly isUploading = computed(() => this.uploadingDesc() || this.uploadingComment());

  // Estado cosmético de acciones globales (sin backend todavía).
  protected watching = signal(false);
  protected moreOpen = signal(false);

  // ── Secciones maquetadas (UI estática, pendientes de backend) ──
  protected readonly conexiones = [
    { tipo: 'github', icon: 'github', titulo: 'feature/board #128', detalle: 'Pull request abierto' },
    { tipo: 'jira', icon: 'square-kanban', titulo: 'Enlazar incidencia', detalle: 'Conectar con Jira' }
  ];
  protected readonly registroTrabajo = [
    { horas: '1.5h', fecha: '13/Jun, 10:00', detalle: 'UI adjustments' },
    { horas: '1.5h', fecha: '13/Jun, 10:00', detalle: 'UI adjustments' },
    { horas: '1.5h', fecha: '13/Jun, 10:00', detalle: 'UI adjustments' },
    { horas: '1.5h', fecha: '13/Jun, 10:00', detalle: 'UI adjustments' }
  ];

  protected readonly responsableIds = computed(() =>
    new Set(this.tarjeta()?.responsables.map((r) => r.usuarioId) ?? []));
  protected readonly unassignedUsuarios = computed(() => {
    const assigned = this.responsableIds();
    return this.usuarios.filter((u) => !assigned.has(u.id));
  });
  protected readonly etiquetaIds = computed(() =>
    new Set(this.tarjeta()?.etiquetas.map((e) => e.id) ?? []));

  protected readonly filteredEtiquetas = computed(() => {
    const filter = this.etiquetaFilterText().toLowerCase().trim();
    const catalog = this.etiquetasCatalogo();
    if (!filter) return catalog;
    return catalog.filter((et) => et.nombre.toLowerCase().includes(filter));
  });

  protected readonly columnaNombre = computed(() => {
    const t = this.tarjeta();
    if (!t) return '';
    return this.columnas.find((c) => c.id === t.columnaId)?.nombre ?? '';
  });

  protected readonly responsablePrincipal = computed(() => this.tarjeta()?.responsables[0] ?? null);

  protected readonly sortedComentarios = computed(() => {
    const comments = this.tarjeta()?.comentarios ?? [];
    return [...comments].reverse();
  });

  protected readonly showNewChecklistInput = signal(false);
  protected readonly hasChecklists = computed(() => (this.tarjeta()?.checklists.length ?? 0) > 0);
  protected readonly isChecklistVisible = computed(() => this.hasChecklists() || this.showNewChecklistInput());

  ngOnInit(): void {
    this.tarjetasService.getById(this.data.tarjetaId).subscribe({
      next: (t) => {
        this.tarjeta.set(t);
        this.titulo = t.titulo;
        this.descripcion = t.descripcion ?? '';
        this.prioridad = t.prioridad;
        this.fechaLimite = this.toDateInput(t.fechaLimite);
        this.fechaInicio = this.toDateInput(t.fechaInicio);
        this.completada = t.completada;
        this.loading.set(false);
        this.checkDescHeight();
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo cargar la tarjeta.'), 'Cerrar', { duration: 4200 });
        this.loading.set(false);
      }
    });
  }

  protected close(): void {
    this.dialogRef.close(this.changed);
  }

  // ---- Acciones globales cosméticas ----

  protected toggleWatch(): void {
    this.watching.update((v) => !v);
  }

  /**
   * Enlace directo a esta tarjeta: la ruta del tablero con `?tarjeta={id}`.
   * Es el mismo formato que usan los correos de notificación, así que al abrirlo
   * el tablero carga y despliega automáticamente la tarjeta.
   */
  protected shareUrl(): string {
    const t = this.data.tablero;
    const boardPath = t.proyectoId
      ? `/proyectos/${t.proyectoId}/tableros/${t.id}`
      : `/mis-tableros/${t.id}`;
    return `${window.location.origin}${boardPath}?tarjeta=${this.data.tarjetaId}`;
  }

  protected compartir(): void {
    const url = this.shareUrl();
    navigator.clipboard.writeText(url).then(
      () => this.snackBar.open('Enlace de la tarjeta copiado al portapapeles.', 'Cerrar', { duration: 2500 }),
      () => this.snackBar.open('No se pudo copiar el enlace.', 'Cerrar', { duration: 3000 })
    );
  }

  protected toggleMore(): void {
    this.moreOpen.update((v) => !v);
  }

  // ---- Campos principales ----

  protected startEditTitle(): void {
    if (this.canEdit) this.editingTitle.set(true);
  }

  protected commitTitle(): void {
    this.editingTitle.set(false);
    const t = this.tarjeta();
    if (t && this.titulo.trim() && this.titulo.trim() !== t.titulo) this.saveFields();
  }

  protected applyDescFormat(format: MarkdownFormat): void {
    if (format === 'image') { this.triggerImagePick('desc'); return; }
    this.applyRichFormat(format);
    this.updateDescFromEditor();
  }

  protected applyCommentFormat(format: MarkdownFormat): void {
    if (format === 'image') { this.triggerImagePick('comment'); return; }
    this.applyRichFormat(format);
    this.updateCommentFromEditor();
  }

  private applyRichFormat(format: MarkdownFormat): void {
    if (format === 'bold') document.execCommand('bold');
    else if (format === 'italic') document.execCommand('italic');
    else if (format === 'underline') document.execCommand('underline');
    else if (format === 'strike') document.execCommand('strikeThrough');
    else if (format === 'ul') document.execCommand('insertUnorderedList');
    else if (format === 'ol') document.execCommand('insertOrderedList');
    else if (format === 'code') {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`);
      }
    } else if (format === 'codeblock') {
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        document.execCommand('insertHTML', false, `<pre><code>${selection.toString()}</code></pre>`);
      }
    } else if (format === 'link') {
      const url = prompt('Introduce la URL del enlace:');
      if (url) document.execCommand('createLink', false, url);
    }
  }

  private triggerImagePick(editor: 'desc' | 'comment' | 'comment-edit'): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0).cloneRange();
    const input = editor === 'desc' ? this.descImageInput() : this.commentImageInput();
    input?.nativeElement.click();
  }

  protected onDescImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadAndInsertImage(file, 'desc');
    input.value = '';
  }

  protected onCommentImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadAndInsertImage(file, 'comment');
    input.value = '';
  }

  private uploadAndInsertImage(file: File, editor: 'desc' | 'comment' | 'comment-edit'): void {
    const t = this.tarjeta();
    if (!t) return;
    const sig = editor === 'desc' ? this.uploadingDesc : this.uploadingComment;
    let elId = 'comment-editor-content';
    if (editor === 'desc') elId = 'desc-editor-content';
    else if (editor === 'comment-edit') elId = 'comment-edit-editor-content';
    sig.set(true);

    this.tarjetasService.uploadImagenInline(t.id, file).subscribe({
      next: ({ url }) => {
        const el = document.getElementById(elId);
        if (el) {
          el.focus();
          const sel = window.getSelection();
          if (this.savedRange && sel) {
            sel.removeAllRanges();
            sel.addRange(this.savedRange);
          }
        }
        document.execCommand('insertImage', false, url);
        this.savedRange = null;
        if (editor === 'desc') this.updateDescFromEditor();
        else if (editor === 'comment') this.updateCommentFromEditor();
        else if (editor === 'comment-edit') this.updateEditCommentFromEditor();
        sig.set(false);
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo subir la imagen.'), 'Cerrar', { duration: 4200 });
        sig.set(false);
      }
    });
  }

  protected onDescPaste(event: ClipboardEvent): void {
    this.handleImagePaste(event, 'desc');
  }

  protected onCommentPaste(event: ClipboardEvent): void {
    this.handleImagePaste(event, 'comment');
  }

  private handleImagePaste(event: ClipboardEvent, editor: 'desc' | 'comment' | 'comment-edit'): void {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        event.preventDefault();
        const file = items[i].getAsFile();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0).cloneRange();
        if (file) this.uploadAndInsertImage(file, editor);
        return;
      }
    }
  }

  protected updateDescFromEditor(): void {
    const el = document.getElementById('desc-editor-content');
    if (el) {
      this.descripcion = htmlToMarkdown(el.innerHTML);
    }
  }

  protected onCommentFocus(): void {
    this.activeCommentEdit.set(true);
  }

  protected updateCommentFromEditor(): void {
    const el = document.getElementById('comment-editor-content');
    if (el) {
      this.nuevoComentario = htmlToMarkdown(el.innerHTML);
    }
  }

  protected cancelCommentEdit(): void {
    this.nuevoComentario = '';
    this.activeCommentEdit.set(false);
    const el = document.getElementById('comment-editor-content');
    if (el) el.innerHTML = '';
  }

  protected saveFields(): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.update(t.id, {
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim() || undefined,
      prioridad: this.prioridad,
      fechaLimite: this.fromDateInput(this.fechaLimite),
      fechaInicio: this.fromDateInput(this.fechaInicio),
      completada: this.completada
    }).subscribe({
      next: () => {
        this.changed = true;
        this.tarjeta.set({ ...t, titulo: this.titulo.trim(), descripcion: this.descripcion.trim() || undefined });
        this.snackBar.open('Tarjeta actualizada.', 'Cerrar', { duration: 2500 });
        this.editingDesc.set(false);
        this.checkDescHeight();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected startEditDesc(): void {
    if (this.canEdit) {
      this.editingDesc.set(true);
      setTimeout(() => {
        const el = document.getElementById('desc-editor-content');
        if (el) {
          el.innerHTML = renderMarkdown(this.descripcion);
          el.focus();
        }
      }, 50);
    }
  }

  protected toggleEditDesc(): void {
    if (!this.canEdit) return;
    if (this.editingDesc()) {
      this.cancelEdits();
    } else {
      this.startEditDesc();
    }
  }

  protected cancelEdits(): void {
    const t = this.tarjeta();
    if (!t) return;
    this.titulo = t.titulo;
    this.descripcion = t.descripcion ?? '';
    this.prioridad = t.prioridad;
    this.fechaLimite = this.toDateInput(t.fechaLimite);
    this.fechaInicio = this.toDateInput(t.fechaInicio);
    this.completada = t.completada;
    this.editingTitle.set(false);
    this.descPreview.set(false);
    this.editingDesc.set(false);
    this.checkDescHeight();
  }

  protected onEstadoChange(columnaId: string): void {
    const t = this.tarjeta();
    if (!t || columnaId === t.columnaId) return;
    this.tarjetasService.mover(t.id, { columnaDestinoId: columnaId }).subscribe({
      next: () => {
        this.tarjeta.set({ ...t, columnaId });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo cambiar el estado.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected archive(): void {
    const t = this.tarjeta();
    if (!t) return;
    this.moreOpen.set(false);
    if (!confirm(`¿Archivar la tarjeta ${t.codigo}?`)) return;
    this.tarjetasService.delete(t.id).subscribe({
      next: () => {
        this.changed = true;
        this.dialogRef.close(true);
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo archivar.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Responsables ----

  protected toggleResponsable(usuarioId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    const ids = new Set(this.responsableIds());
    if (ids.has(usuarioId)) ids.delete(usuarioId);
    else ids.add(usuarioId);

    this.tarjetasService.setResponsables(t.id, [...ids]).subscribe({
      next: (resp) => {
        this.tarjeta.set({ ...t, responsables: resp });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar responsables.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected onAssignResponsable(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    if (val) {
      this.toggleResponsable(val);
      select.value = '';
    }
  }

  // ---- Etiquetas ----

  protected toggleEtiquetasMenu(): void {
    const state = this.showEtiquetasMenu();
    this.showEtiquetasMenu.set(!state);
    if (!state) {
      this.etiquetasMenuMode.set('select');
      this.etiquetaFilterText.set('');
      this.nuevaEtiquetaNombre = '';
      this.nuevaEtiquetaColor = 'blue';
    }
  }

  protected toggleEtiqueta(etiquetaId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    const ids = new Set(this.etiquetaIds());
    if (ids.has(etiquetaId)) ids.delete(etiquetaId);
    else ids.add(etiquetaId);

    this.tarjetasService.setEtiquetas(t.id, [...ids]).subscribe({
      next: (ets) => {
        this.tarjeta.set({ ...t, etiquetas: ets });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar etiquetas.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected crearEtiqueta(): void {
    const nombre = this.nuevaEtiquetaNombre.trim();
    if (!nombre) return;
    this.tablerosService.createEtiqueta(this.data.tablero.id, { nombre, colorClass: this.nuevaEtiquetaColor }).subscribe({
      next: (et) => {
        this.etiquetasCatalogo.update((list) => [...list, et]);
        this.nuevaEtiquetaNombre = '';
        this.toggleEtiqueta(et.id);
        this.etiquetasMenuMode.set('select');
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo crear la etiqueta.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected startEditEtiqueta(etiqueta: Etiqueta): void {
    this.editEtiquetaId = etiqueta.id;
    this.editEtiquetaNombre = etiqueta.nombre;
    this.editEtiquetaColor = etiqueta.colorClass;
    this.etiquetasMenuMode.set('edit');
  }

  protected guardarEtiqueta(): void {
    const nombre = this.editEtiquetaNombre.trim();
    if (!nombre || !this.editEtiquetaId) return;
    this.tablerosService.updateEtiqueta(this.data.tablero.id, this.editEtiquetaId, {
      nombre,
      colorClass: this.editEtiquetaColor
    }).subscribe({
      next: (updatedEt) => {
        this.etiquetasCatalogo.update((list) =>
          list.map((et) => et.id === updatedEt.id ? updatedEt : et)
        );
        const t = this.tarjeta();
        if (t) {
          const updatedCardEtiquetas = t.etiquetas.map((et) => et.id === updatedEt.id ? updatedEt : et);
          this.tarjeta.set({ ...t, etiquetas: updatedCardEtiquetas });
        }
        this.etiquetasMenuMode.set('select');
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar la etiqueta.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected eliminarEtiqueta(): void {
    if (!this.editEtiquetaId) return;
    if (!confirm('¿Seguro que deseas eliminar esta etiqueta? Se quitará de todas las tarjetas.')) return;
    this.tablerosService.deleteEtiqueta(this.data.tablero.id, this.editEtiquetaId).subscribe({
      next: () => {
        const idToDelete = this.editEtiquetaId;
        this.etiquetasCatalogo.update((list) => list.filter((et) => et.id !== idToDelete));
        const t = this.tarjeta();
        if (t) {
          this.tarjeta.set({
            ...t,
            etiquetas: t.etiquetas.filter((et) => et.id !== idToDelete)
          });
        }
        this.etiquetasMenuMode.set('select');
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar la etiqueta.'), 'Cerrar', { duration: 4200 })
    });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const wrapper = document.querySelector('.cm-tag-selector-wrapper');
    if (wrapper && !wrapper.contains(target)) {
      this.showEtiquetasMenu.set(false);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected onEscapeKey(event: Event): void {
    event.preventDefault();
    this.close();
  }


  // ---- Checklists ----

  /** Recalcula los conteos globales (badges) a partir de todos los checklists. */
  private withChecklists(t: TarjetaDetalle, checklists: TarjetaDetalle['checklists']): TarjetaDetalle {
    const items = checklists.flatMap((c) => c.items);
    return {
      ...t,
      checklists,
      checklistTotal: items.length,
      checklistCompletados: items.filter((i) => i.completado).length
    };
  }

  protected checklistProgreso(cl: { items: { completado: boolean }[] }): { done: number; total: number } {
    return { done: cl.items.filter((i) => i.completado).length, total: cl.items.length };
  }

  protected addChecklist(): void {
    const t = this.tarjeta();
    const nombre = this.nuevoChecklistNombre.trim();
    if (!t || !nombre) return;
    this.tarjetasService.addChecklist(t.id, { nombre }).subscribe({
      next: (cl) => {
        this.tarjeta.set(this.withChecklists(t, [...t.checklists, cl]));
        this.nuevoChecklistNombre = '';
        this.showNewChecklistInput.set(false);
        this.showItemInput.set(cl.id);
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo crear el checklist.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected startRenameChecklist(cl: { id: string; nombre: string }): void {
    if (!this.canEdit) return;
    this.editingChecklistId.set(cl.id);
    this.editChecklistNombre = cl.nombre;
  }

  protected saveRenameChecklist(checklistId: string): void {
    const t = this.tarjeta();
    const nombre = this.editChecklistNombre.trim();
    if (!t || !nombre) { this.editingChecklistId.set(null); return; }
    this.tarjetasService.updateChecklist(t.id, checklistId, { nombre }).subscribe({
      next: (updated) => {
        const checklists = t.checklists.map((c) => (c.id === checklistId ? { ...c, nombre: updated.nombre } : c));
        this.tarjeta.set({ ...t, checklists });
        this.editingChecklistId.set(null);
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo renombrar el checklist.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected cancelRenameChecklist(): void {
    this.editingChecklistId.set(null);
    this.editChecklistNombre = '';
  }

  protected deleteChecklist(checklistId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    if (!confirm('¿Eliminar este checklist y todos sus ítems?')) return;
    this.tarjetasService.deleteChecklist(t.id, checklistId).subscribe({
      next: () => {
        this.tarjeta.set(this.withChecklists(t, t.checklists.filter((c) => c.id !== checklistId)));
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el checklist.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Ítems de checklist ----

  protected addItem(checklistId: string): void {
    const t = this.tarjeta();
    const texto = (this.nuevoItemTexto[checklistId] ?? '').trim();
    if (!t || !texto) return;
    this.tarjetasService.addChecklistItem(t.id, checklistId, { texto }).subscribe({
      next: (item) => {
        const checklists = t.checklists.map((c) =>
          c.id === checklistId ? { ...c, items: [...c.items, item] } : c);
        this.tarjeta.set(this.withChecklists(t, checklists));
        this.nuevoItemTexto[checklistId] = '';
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo añadir el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected toggleItem(checklistId: string, itemId: string, completado: boolean): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.updateChecklistItem(t.id, checklistId, itemId, { completado }).subscribe({
      next: (item) => {
        const checklists = t.checklists.map((c) =>
          c.id === checklistId ? { ...c, items: c.items.map((i) => (i.id === itemId ? item : i)) } : c);
        this.tarjeta.set(this.withChecklists(t, checklists));
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteItem(checklistId: string, itemId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.deleteChecklistItem(t.id, checklistId, itemId).subscribe({
      next: () => {
        const checklists = t.checklists.map((c) =>
          c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c);
        this.tarjeta.set(this.withChecklists(t, checklists));
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected startEditItem(item: { id: string; texto: string }): void {
    if (!this.canEdit) return;
    this.editingItemId.set(item.id);
    this.editItemTexto = item.texto;
  }

  protected saveEditItem(checklistId: string, itemId: string): void {
    const t = this.tarjeta();
    const texto = this.editItemTexto.trim();
    if (!t || !texto) { this.editingItemId.set(null); return; }
    this.tarjetasService.updateChecklistItem(t.id, checklistId, itemId, { texto }).subscribe({
      next: (updated) => {
        const checklists = t.checklists.map((c) =>
          c.id === checklistId
            ? { ...c, items: c.items.map((i) => (i.id === itemId ? updated : i)) }
            : c
        );
        this.tarjeta.set(this.withChecklists(t, checklists));
        this.editingItemId.set(null);
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo editar el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected cancelEditItem(): void {
    this.editingItemId.set(null);
    this.editItemTexto = '';
  }

  // ---- Comentarios ----

  private scrollCommentsToBottom(): void {
    setTimeout(() => {
      const list = this.commentsList();
      if (list) {
        list.nativeElement.scrollTo({
          top: list.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  }

  protected addComentario(): void {
    this.updateCommentFromEditor();
    const t = this.tarjeta();
    const texto = this.nuevoComentario.trim();
    if (!t || !texto) return;
    this.tarjetasService.addComentario(t.id, { texto }).subscribe({
      next: (c) => {
        this.tarjeta.set({ ...t, comentarios: [c, ...t.comentarios], totalComentarios: t.totalComentarios + 1 });
        this.nuevoComentario = '';
        this.changed = true;
        this.activeCommentEdit.set(false);
        const el = document.getElementById('comment-editor-content');
        if (el) el.innerHTML = '';
        this.scrollCommentsToBottom();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo comentar.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteComentario(comentarioId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.deleteComentario(t.id, comentarioId).subscribe({
      next: () => {
        const comentarios = t.comentarios.filter((c) => c.id !== comentarioId);
        this.tarjeta.set({ ...t, comentarios, totalComentarios: comentarios.length });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el comentario.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected canEditComentario(c: Comentario): boolean {
    const currentUser = this.auth.getUser();
    if (!currentUser) return false;
    if (c.autorId !== currentUser.userId) return false;

    const created = new Date(c.fechaCreacion);
    const now = new Date();
    return created.getUTCDate() === now.getUTCDate() &&
           created.getUTCMonth() === now.getUTCMonth() &&
           created.getUTCFullYear() === now.getUTCFullYear();
  }

  protected startEditComentario(c: Comentario): void {
    this.editingCommentId.set(c.id);
    this.editCommentTexto.set(c.texto);
    setTimeout(() => {
      const el = document.getElementById('comment-edit-editor-content');
      if (el) {
        el.innerHTML = renderMarkdown(c.texto);
        el.focus();
      }
    }, 50);
  }

  protected updateEditCommentFromEditor(): void {
    const el = document.getElementById('comment-edit-editor-content');
    if (el) {
      this.editCommentTexto.set(htmlToMarkdown(el.innerHTML));
    }
  }

  protected cancelEditComentario(): void {
    this.editingCommentId.set(null);
    this.editCommentTexto.set('');
  }

  protected saveComentarioEdit(c: Comentario): void {
    const t = this.tarjeta();
    const texto = this.editCommentTexto().trim();
    if (!t || !texto) return;

    this.tarjetasService.updateComentario(t.id, c.id, { texto }).subscribe({
      next: (updatedComentario) => {
        const comentarios = t.comentarios.map((x) => x.id === c.id ? updatedComentario : x);
        this.tarjeta.set({ ...t, comentarios });
        this.editingCommentId.set(null);
        this.editCommentTexto.set('');
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo editar el comentario.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected applyEditCommentFormat(format: MarkdownFormat): void {
    if (format === 'image') { this.triggerImagePick('comment-edit'); return; }
    this.applyRichFormat(format);
    this.updateEditCommentFromEditor();
  }

  protected onEditCommentPaste(event: ClipboardEvent): void {
    this.handleImagePaste(event, 'comment-edit');
  }

  // ---- Visor de imágenes ----

  protected readonly viewerData = signal<ImageViewerData | null>(null);

  /** Abre el visor para un adjunto de imagen; los demás archivos siguen abriéndose en una pestaña. */
  protected openAdjuntoViewer(adj: Adjunto, event: Event): void {
    if (!this.isImage(adj)) return;
    event.preventDefault();
    const meta: ImageViewerMeta[] = [
      { label: 'Archivo', value: adj.nombre },
      { label: 'Tamaño', value: this.formatBytes(adj.tamanoBytes) }
    ];
    if (adj.contentType) meta.push({ label: 'Tipo', value: adj.contentType });
    if (adj.subidoPorNombre) meta.push({ label: 'Subido por', value: adj.subidoPorNombre });
    meta.push({ label: 'Fecha', value: this.formatDateTime(adj.fechaSubida) });
    this.viewerData.set({
      url: adj.url,
      alt: adj.nombre,
      kind: 'adjunto',
      contextLabel: 'Adjunto',
      contextIcon: 'paperclip',
      title: adj.nombre,
      meta,
      downloadName: adj.nombre
    });
  }

  /** Abre el visor cuando se hace clic sobre una imagen incrustada en la descripción. */
  protected onDescImageClick(event: Event): void {
    const img = this.imageFromEvent(event);
    if (!img) return;
    const t = this.tarjeta();
    this.viewerData.set({
      url: img.src,
      alt: img.alt,
      kind: 'descripcion',
      contextLabel: 'Descripción',
      contextIcon: 'align-left',
      title: t ? `${t.codigo} · ${t.titulo}` : 'Descripción',
      bodyHtml: renderMarkdown(this.descripcion)
    });
  }

  /** Abre el visor cuando se hace clic sobre una imagen incrustada en un comentario. */
  protected onComentarioImageClick(event: Event, c: Comentario): void {
    const img = this.imageFromEvent(event);
    if (!img) return;
    this.viewerData.set({
      url: img.src,
      alt: img.alt,
      kind: 'comentario',
      contextLabel: 'Comentario',
      contextIcon: 'message-square',
      author: { nombre: c.autorNombre, iniciales: c.autorIniciales, fecha: this.formatDateTime(c.fechaCreacion) },
      bodyHtml: renderMarkdown(c.texto)
    });
  }

  /** Devuelve el elemento `<img>` si el clic recayó sobre una imagen; si no, `null`. */
  private imageFromEvent(event: Event): HTMLImageElement | null {
    const target = event.target as HTMLElement;
    return target?.tagName === 'IMG' ? (target as HTMLImageElement) : null;
  }

  protected closeViewer(): void {
    this.viewerData.set(null);
  }

  // ---- Adjuntos ----

  protected isImage(adj: { contentType?: string | null }): boolean {
    return !!adj.contentType && adj.contentType.startsWith('image/');
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const t = this.tarjeta();
    if (!file || !t) return;
    this.tarjetasService.addAdjunto(t.id, file).subscribe({
      next: (adj) => {
        this.tarjeta.set({ ...t, adjuntos: [adj, ...t.adjuntos], totalAdjuntos: t.totalAdjuntos + 1 });
        this.changed = true;
        input.value = '';
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo subir el adjunto.'), 'Cerrar', { duration: 4200 });
        input.value = '';
      }
    });
  }

  protected deleteAdjunto(adjuntoId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.deleteAdjunto(t.id, adjuntoId).subscribe({
      next: () => {
        const adjuntos = t.adjuntos.filter((a) => a.id !== adjuntoId);
        this.tarjeta.set({ ...t, adjuntos, totalAdjuntos: adjuntos.length });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el adjunto.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Actividad ----

  protected selectTab(tab: 'comentarios' | 'actividad'): void {
    this.activeTab.set(tab);
    if (tab === 'actividad' && this.actividad().length === 0) {
      this.tarjetasService.getActividad(this.data.tarjetaId).subscribe({
        next: (acts) => this.actividad.set(acts)
      });
    }
  }

  protected toggleActividad(): void {
    this.moreOpen.set(false);
    this.selectTab('actividad');
  }

  // ---- Helpers ----

  protected getEtiquetaColor(colorClass: string): string {
    const colors: Record<string, string> = {
      'green': '#3ecf8e',
      'green-dark': '#15803d',
      'emerald': '#10b981',
      'teal': '#2dd4bf',
      'cyan': '#06b6d4',
      'sky': '#0ea5e9',
      'blue': '#4f8ef7',
      'blue-dark': '#1d4ed8',
      'indigo': '#6366f1',
      'purple': '#9f7afa',
      'purple-dark': '#6d28d9',
      'magenta': '#d946ef',
      'pink': '#ec4899',
      'rose': '#f43f5e',
      'red': '#e55353',
      'red-dark': '#b91c1c',
      'orange': '#f97316',
      'orange-dark': '#c2410c',
      'amber': '#f5a623',
      'yellow': '#eab308',
      'lime': '#84cc16',
      'lime-dark': '#4d7c0f',
      'gray': '#9ba3b8',
      'black': '#374151'
    };
    return colors[colorClass] || '#626a7e';
  }

  protected getEtiquetaBgColor(colorClass: string): string {
    const color = this.getEtiquetaColor(colorClass);
    if (color.startsWith('#') && color.length === 7) {
      return color + '2e'; // Approximately 18% opacity hex transparency
    }
    return color;
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDateTime(value: string): string {
    return new Date(value).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().substring(0, 10);
  }

  private fromDateInput(value: string): string | null {
    return value ? value : null;
  }
}
