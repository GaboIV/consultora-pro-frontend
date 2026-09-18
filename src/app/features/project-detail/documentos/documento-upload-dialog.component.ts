import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import {
  CarpetaNodo,
  ESTADOS_DOCUMENTO,
  EstadoDocumento,
  TIPOS_DOCUMENTO,
  TipoDocumento,
  etiquetasPorCarpeta,
  fileVisual,
  formatBytes,
  guessTipoDocumento
} from '../../../core/models/documentos.models';
import { DocumentosService } from '../../../core/services/documentos.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { TagInputComponent } from '../../../shared/components/tag-input/tag-input.component';

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error' | 'invalid';

interface UploadItem {
  id: number;
  file: File;
  titulo: string;
  tipo: TipoDocumento;
  tipoTocado: boolean;
  version: string;
  status: ItemStatus;
  progress: number;
  error: string | null;
}

let nextId = 1;

@Component({
  selector: 'cp-documento-upload-dialog',
  imports: [FormsModule, LucideAngularModule, TagInputComponent],
  templateUrl: './documento-upload-dialog.component.html',
  styleUrls: ['./documento-upload-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentoUploadDialogComponent implements OnInit {
  private readonly documentosService = inject(DocumentosService);

  readonly proyectoId = input.required<string>();
  readonly files = input.required<File[]>();
  readonly carpetas = input.required<CarpetaNodo[]>();
  readonly carpetaInicialId = input<string | null>(null);
  readonly maxBytes = input(50 * 1024 * 1024);
  readonly extensiones = input<string[]>([]);
  readonly sugerenciasEtiquetas = input<string[]>([]);

  /** Emite la cantidad de documentos subidos (0 si se canceló sin subir nada). */
  readonly closed = output<number>();

  protected readonly tipos = TIPOS_DOCUMENTO;
  protected readonly estados = ESTADOS_DOCUMENTO;
  protected readonly fileVisual = fileVisual;
  protected readonly formatBytes = formatBytes;

  protected readonly items = signal<UploadItem[]>([]);
  protected readonly carpetaId = signal<string>('');
  protected readonly estado = signal<EstadoDocumento>('Borrador');
  protected readonly etiquetas = signal<string[]>([]);
  protected readonly descripcion = signal('');
  protected readonly uploading = signal(false);
  protected readonly finished = signal(false);
  protected readonly dragOver = signal(false);

  protected readonly validItems = computed(() => this.items().filter(i => i.status !== 'invalid'));
  protected readonly doneCount = computed(() => this.items().filter(i => i.status === 'done').length);
  protected readonly errorCount = computed(() => this.items().filter(i => i.status === 'error').length);
  protected readonly carpetaSeleccionada = computed(() => this.carpetas().find(c => c.id === this.carpetaId()) ?? null);
  protected readonly totalBytes = computed(() => this.validItems().reduce((acc, i) => acc + i.file.size, 0));
  protected readonly accept = computed(() => this.extensiones().join(','));

  ngOnInit(): void {
    const inicial = this.carpetaInicialId();
    const carpeta = this.carpetas().find(c => c.id === inicial) ?? this.carpetas()[0];
    this.carpetaId.set(carpeta?.id ?? '');
    this.etiquetas.set(etiquetasPorCarpeta(carpeta));
    this.addFiles(this.files());
  }

  protected folderLabel(c: CarpetaNodo): string {
    return `${'   '.repeat(c.nivel)}${c.codigo ? c.codigo + ' · ' : ''}${c.nombre}`;
  }

  protected onCarpetaChange(id: string): void {
    const anterior = this.carpetaSeleccionada();
    this.carpetaId.set(id);
    const nueva = this.carpetaSeleccionada();
    // Re-sugerir el tipo solo en los archivos cuyo tipo no eligió el usuario a mano.
    this.items.update(list => list.map(i => i.tipoTocado || i.status === 'invalid'
      ? i
      : { ...i, tipo: guessTipoDocumento(i.file.name, nueva) }));
    // Cambia las etiquetas automáticas de carpeta sin tocar las que puso el usuario.
    const auto = new Set(etiquetasPorCarpeta(anterior));
    const manuales = this.etiquetas().filter(t => !auto.has(t));
    this.etiquetas.set([...new Set([...manuales, ...etiquetasPorCarpeta(nueva)])]);
  }

  protected updateItem(id: number, patch: Partial<UploadItem>): void {
    this.items.update(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  protected removeItem(id: number): void {
    this.items.update(list => list.filter(i => i.id !== id));
  }

  protected onPick(input: HTMLInputElement): void {
    if (input.files?.length) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    if (this.uploading() || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    if (this.uploading()) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.addFiles(files);
  }

  protected canSubmit(): boolean {
    return !this.uploading()
      && !!this.carpetaId()
      && this.validItems().some(i => i.status === 'pending' || i.status === 'error')
      && this.validItems().every(i => i.titulo.trim().length > 0);
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.uploading.set(true);
    this.finished.set(false);

    // Secuencial: evita saturar el backend/almacenamiento y da progreso legible por archivo.
    for (const item of this.validItems().filter(i => i.status === 'pending' || i.status === 'error')) {
      await this.uploadOne(item);
    }

    this.uploading.set(false);
    this.finished.set(true);
    if (this.errorCount() === 0) this.closed.emit(this.doneCount());
  }

  protected close(): void {
    if (this.uploading()) return;
    this.closed.emit(this.doneCount());
  }

  private uploadOne(item: UploadItem): Promise<void> {
    this.updateItem(item.id, { status: 'uploading', progress: 0, error: null });
    return new Promise(resolve => {
      this.documentosService.upload({
        proyectoId: this.proyectoId(),
        carpetaId: this.carpetaId(),
        titulo: item.titulo.trim(),
        tipo: item.tipo,
        estado: this.estado(),
        version: item.version.trim() || '1.0',
        descripcion: this.descripcion().trim(),
        etiquetas: this.etiquetas(),
        file: item.file
      }).subscribe({
        next: ev => {
          if (ev.kind === 'progress') this.updateItem(item.id, { progress: Math.min(ev.percent, 99) });
          else this.updateItem(item.id, { status: 'done', progress: 100 });
        },
        error: err => {
          this.updateItem(item.id, { status: 'error', error: apiErrorMessage(err, 'No se pudo subir el archivo.') });
          resolve();
        },
        complete: () => resolve()
      });
    });
  }

  private addFiles(files: File[]): void {
    const carpeta = this.carpetaSeleccionada();
    const allowed = new Set(this.extensiones().map(e => e.toLowerCase()));
    const existing = new Set(this.items().map(i => `${i.file.name}|${i.file.size}`));

    const nuevos = files
      .filter(f => !existing.has(`${f.name}|${f.size}`))
      .map<UploadItem>(file => {
        const dot = file.name.lastIndexOf('.');
        const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
        let error: string | null = null;
        if (file.size === 0) error = 'Archivo vacío';
        else if (file.size > this.maxBytes()) error = `Supera el máximo de ${formatBytes(this.maxBytes())}`;
        else if (allowed.size && !allowed.has(ext)) error = `Tipo no permitido (${ext || 'sin extensión'})`;

        return {
          id: nextId++,
          file,
          titulo: dot > 0 ? file.name.slice(0, dot) : file.name,
          tipo: guessTipoDocumento(file.name, carpeta),
          tipoTocado: false,
          version: '1.0',
          status: error ? 'invalid' : 'pending',
          progress: 0,
          error
        };
      });

    this.items.update(list => [...list, ...nuevos]);
  }
}
