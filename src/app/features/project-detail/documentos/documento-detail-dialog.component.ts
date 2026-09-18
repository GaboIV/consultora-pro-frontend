import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  CarpetaNodo,
  Documento,
  DocumentoVersion,
  ESTADOS_DOCUMENTO,
  EstadoDocumento,
  TIPOS_DOCUMENTO,
  TipoDocumento,
  estadoDocumentoLabel,
  estadoDocumentoTone,
  fileVisual,
  formatBytes,
  isPreviewable,
  tipoDocumentoLabel
} from '../../../core/models/documentos.models';
import { DocumentosService } from '../../../core/services/documentos.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { TagInputComponent } from '../../../shared/components/tag-input/tag-input.component';

/** Sugiere la siguiente versión menor: 1.0 → 1.1, 2 → 2.1. */
function nextVersion(actual: string): string {
  const m = /^(\d+)(?:\.(\d+))?$/.exec((actual || '').trim());
  if (!m) return '';
  return `${m[1]}.${m[2] ? Number(m[2]) + 1 : 1}`;
}

@Component({
  selector: 'cp-documento-detail-dialog',
  imports: [FormsModule, DatePipe, LucideAngularModule, BadgeComponent, TagInputComponent],
  templateUrl: './documento-detail-dialog.component.html',
  styleUrls: ['./documento-upload-dialog.component.scss', './documento-detail-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentoDetailDialogComponent implements OnInit {
  private readonly documentosService = inject(DocumentosService);
  private readonly snackBar = inject(MatSnackBar);

  readonly documento = input.required<Documento>();
  readonly carpetas = input.required<CarpetaNodo[]>();
  readonly sugerenciasEtiquetas = input<string[]>([]);
  readonly canEdit = input(false);
  readonly canDelete = input(false);
  readonly maxBytes = input(50 * 1024 * 1024);
  readonly extensiones = input<string[]>([]);

  /** Documento actualizado (metadatos o versión nueva). */
  readonly changed = output<Documento>();
  readonly deleteRequested = output<Documento>();
  readonly closed = output<void>();

  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly estados = ESTADOS_DOCUMENTO;
  protected readonly formatBytes = formatBytes;
  protected readonly estadoLabel = estadoDocumentoLabel;
  protected readonly estadoTone = estadoDocumentoTone;
  protected readonly tipoLabel = tipoDocumentoLabel;

  protected readonly current = signal<Documento | null>(null);
  protected readonly tab = signal<'detalle' | 'versiones'>('detalle');
  protected readonly saving = signal(false);

  // Formulario de metadatos
  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly tipo = signal<TipoDocumento>('Otro');
  protected readonly estado = signal<EstadoDocumento>('Borrador');
  protected readonly carpetaId = signal('');
  protected readonly etiquetas = signal<string[]>([]);

  // Nueva versión
  protected readonly newFile = signal<File | null>(null);
  protected readonly newVersion = signal('');
  protected readonly newNota = signal('');
  protected readonly newEstado = signal<EstadoDocumento | ''>('');
  protected readonly versionProgress = signal<number | null>(null);
  protected readonly versionError = signal<string | null>(null);

  protected readonly doc = computed(() => this.current() ?? this.documento());
  protected readonly visual = computed(() => fileVisual(this.doc().extension));
  protected readonly previewable = computed(() => isPreviewable(this.doc().extension));
  protected readonly carpetaRuta = computed(() => this.carpetas().find(c => c.id === this.doc().carpetaId)?.ruta ?? '—');
  protected readonly dirty = computed(() => {
    const d = this.doc();
    return this.titulo().trim() !== d.titulo
      || this.descripcion().trim() !== (d.descripcion ?? '')
      || this.tipo() !== d.tipo
      || this.estado() !== d.estado
      || this.carpetaId() !== d.carpetaId
      || this.etiquetas().join('|') !== d.etiquetas.join('|');
  });

  ngOnInit(): void {
    this.resetForm(this.documento());
  }

  protected folderLabel(c: CarpetaNodo): string {
    return `${'   '.repeat(c.nivel)}${c.codigo ? c.codigo + ' · ' : ''}${c.nombre}`;
  }

  protected save(): void {
    if (!this.canEdit() || !this.dirty() || !this.titulo().trim() || this.saving()) return;
    this.saving.set(true);
    this.documentosService.update(this.doc().id, {
      carpetaId: this.carpetaId(),
      titulo: this.titulo().trim(),
      descripcion: this.descripcion().trim(),
      tipo: this.tipo(),
      estado: this.estado(),
      etiquetas: this.etiquetas()
    }).subscribe({
      next: doc => {
        this.saving.set(false);
        this.applyUpdate(doc);
        this.snackBar.open('Documento actualizado.', 'Cerrar', { duration: 2500 });
      },
      error: err => {
        this.saving.set(false);
        this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar el documento.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected download(version?: DocumentoVersion): void {
    const d = this.doc();
    this.documentosService.download(d.id, version?.nombreArchivo ?? d.nombreArchivo, version?.id).subscribe({
      error: err => this.snackBar.open(apiErrorMessage(err, 'No se pudo descargar el archivo.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected onPickVersion(input: HTMLInputElement): void {
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.versionError.set(null);
    if (!file) return;
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    if (file.size > this.maxBytes()) {
      this.versionError.set(`El archivo supera el máximo de ${formatBytes(this.maxBytes())}.`);
      return;
    }
    if (this.extensiones().length && !this.extensiones().includes(ext)) {
      this.versionError.set(`Tipo de archivo no permitido (${ext || 'sin extensión'}).`);
      return;
    }
    this.newFile.set(file);
  }

  protected uploadVersion(): void {
    const file = this.newFile();
    if (!file || this.versionProgress() !== null) return;
    this.versionProgress.set(0);
    this.versionError.set(null);
    this.documentosService.uploadVersion(this.doc().id, {
      version: this.newVersion().trim(),
      nota: this.newNota().trim(),
      estado: this.newEstado() || null,
      file
    }).subscribe({
      next: ev => {
        if (ev.kind === 'progress') {
          this.versionProgress.set(Math.min(ev.percent, 99));
          return;
        }
        this.versionProgress.set(null);
        this.newFile.set(null);
        this.newNota.set('');
        this.newEstado.set('');
        this.applyUpdate(ev.documento);
        this.snackBar.open(`Versión ${ev.documento.versionActual} registrada.`, 'Cerrar', { duration: 2500 });
      },
      error: err => {
        this.versionProgress.set(null);
        this.versionError.set(apiErrorMessage(err, 'No se pudo subir la nueva versión.'));
      }
    });
  }

  private applyUpdate(doc: Documento): void {
    this.current.set(doc);
    this.resetForm(doc);
    this.changed.emit(doc);
  }

  private resetForm(d: Documento): void {
    this.titulo.set(d.titulo);
    this.descripcion.set(d.descripcion ?? '');
    this.tipo.set(d.tipo);
    this.estado.set(d.estado);
    this.carpetaId.set(d.carpetaId);
    this.etiquetas.set([...d.etiquetas]);
    this.newVersion.set(nextVersion(d.versionActual));
  }
}
