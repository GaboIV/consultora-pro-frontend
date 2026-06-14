import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TarjetasService } from '../../core/services/tarjetas.service';
import { TablerosService } from '../../core/services/tableros.service';
import {
  TableroDetalle, TarjetaDetalle, Actividad, PrioridadTarjeta,
  PRIORIDAD_OPTIONS, ETIQUETA_COLORS, actividadLabel
} from '../../core/models/kanban.models';
import { apiErrorMessage } from '../../core/utils/api-error-message';

interface UsuarioOpcion { id: string; nombre: string; iniciales: string; }
interface CardDialogData {
  tarjetaId: string;
  tablero: TableroDetalle;
  usuarios: UsuarioOpcion[];
  canEdit: boolean;
}

@Component({
  selector: 'cp-card-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-detail.modal.html',
  styleUrls: ['./card-detail.modal.scss']
})
export class CardDetailModalComponent implements OnInit {
  protected readonly data = inject<CardDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CardDetailModalComponent>);
  private readonly tarjetasService = inject(TarjetasService);
  private readonly tablerosService = inject(TablerosService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly tarjeta = signal<TarjetaDetalle | null>(null);
  protected readonly actividad = signal<Actividad[]>([]);
  protected readonly loading = signal(true);
  protected readonly showActividad = signal(false);
  private changed = false;

  protected readonly canEdit = this.data.canEdit;
  protected readonly usuarios = this.data.usuarios;
  protected readonly etiquetasCatalogo = signal(this.data.tablero.etiquetas);
  protected readonly prioridadOptions = PRIORIDAD_OPTIONS;
  protected readonly colorOptions = ETIQUETA_COLORS;
  protected readonly actividadLabel = actividadLabel;

  // Campos editables
  protected titulo = '';
  protected descripcion = '';
  protected prioridad: PrioridadTarjeta = 'Media';
  protected fechaLimite = '';
  protected fechaInicio = '';
  protected completada = false;

  protected nuevoChecklist = '';
  protected nuevoComentario = '';
  protected showNuevaEtiqueta = false;
  protected nuevaEtiquetaNombre = '';
  protected nuevaEtiquetaColor = 'blue';

  protected readonly responsableIds = computed(() =>
    new Set(this.tarjeta()?.responsables.map((r) => r.usuarioId) ?? []));
  protected readonly etiquetaIds = computed(() =>
    new Set(this.tarjeta()?.etiquetas.map((e) => e.id) ?? []));

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

  // ---- Campos principales ----

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
        this.snackBar.open('Tarjeta actualizada.', 'Cerrar', { duration: 2500 });
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected archive(): void {
    const t = this.tarjeta();
    if (!t) return;
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

  // ---- Etiquetas ----

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
        this.showNuevaEtiqueta = false;
        this.toggleEtiqueta(et.id);
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo crear la etiqueta.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Checklist ----

  protected addChecklist(): void {
    const t = this.tarjeta();
    const texto = this.nuevoChecklist.trim();
    if (!t || !texto) return;
    this.tarjetasService.addChecklistItem(t.id, { texto }).subscribe({
      next: (item) => {
        this.tarjeta.set({ ...t, checklist: [...t.checklist, item], checklistTotal: t.checklistTotal + 1 });
        this.nuevoChecklist = '';
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo añadir el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected toggleChecklist(itemId: string, completado: boolean): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.updateChecklistItem(t.id, itemId, { completado }).subscribe({
      next: (item) => {
        const checklist = t.checklist.map((c) => (c.id === itemId ? item : c));
        this.tarjeta.set({ ...t, checklist, checklistCompletados: checklist.filter((c) => c.completado).length });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteChecklist(itemId: string): void {
    const t = this.tarjeta();
    if (!t) return;
    this.tarjetasService.deleteChecklistItem(t.id, itemId).subscribe({
      next: () => {
        const checklist = t.checklist.filter((c) => c.id !== itemId);
        this.tarjeta.set({
          ...t,
          checklist,
          checklistTotal: checklist.length,
          checklistCompletados: checklist.filter((c) => c.completado).length
        });
        this.changed = true;
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar el ítem.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Comentarios ----

  protected addComentario(): void {
    const t = this.tarjeta();
    const texto = this.nuevoComentario.trim();
    if (!t || !texto) return;
    this.tarjetasService.addComentario(t.id, { texto }).subscribe({
      next: (c) => {
        this.tarjeta.set({ ...t, comentarios: [c, ...t.comentarios], totalComentarios: t.totalComentarios + 1 });
        this.nuevoComentario = '';
        this.changed = true;
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

  // ---- Adjuntos ----

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

  protected toggleActividad(): void {
    const next = !this.showActividad();
    this.showActividad.set(next);
    if (next && this.actividad().length === 0) {
      this.tarjetasService.getActividad(this.data.tarjetaId).subscribe({
        next: (acts) => this.actividad.set(acts)
      });
    }
  }

  // ---- Helpers ----

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
