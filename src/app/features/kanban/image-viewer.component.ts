import {
  ChangeDetectionStrategy, Component, EventEmitter, Inject, Input, OnDestroy,
  Output, computed, signal
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/** Origen de la imagen mostrada en el visor; define qué información lateral se arma. */
export type ImageViewerSourceKind = 'adjunto' | 'descripcion' | 'comentario';

/** Fila de metadatos (etiqueta + valor) del panel lateral. */
export interface ImageViewerMeta {
  label: string;
  value: string;
}

/** Datos que alimentan el visor: la imagen y el contexto a mostrar al lado. */
export interface ImageViewerData {
  url: string;
  alt?: string;
  kind: ImageViewerSourceKind;
  contextLabel: string;
  contextIcon: string;
  title?: string;
  author?: { nombre: string; iniciales: string; fecha: string };
  meta?: ImageViewerMeta[];
  /** HTML ya renderizado (markdown) del comentario o de la descripción. */
  bodyHtml?: string;
  /** Nombre sugerido al descargar (para adjuntos). */
  downloadName?: string;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

/**
 * Visor de imágenes a pantalla completa (lightbox) para el módulo Kanban.
 *
 * Muestra la imagen en grande con zoom (rueda + botones), desplazamiento (arrastre)
 * y rotación, junto a un panel lateral con la información de origen: datos del
 * adjunto, o el texto de la descripción / comentario al que pertenece la imagen.
 */
@Component({
  selector: 'cp-image-viewer',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent implements OnDestroy {
  @Input({ required: true }) data!: ImageViewerData;
  @Output() readonly closed = new EventEmitter<void>();

  protected readonly scale = signal(1);
  protected readonly rotation = signal(0);
  protected readonly tx = signal(0);
  protected readonly ty = signal(0);
  protected readonly panelOpen = signal(true);
  protected readonly dragging = signal(false);

  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;

  /** Listener en fase de captura: intercepta el teclado antes que el overlay de Material. */
  private readonly keyHandler = (event: KeyboardEvent): void => this.onKey(event);

  protected readonly transform = computed(() =>
    `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()}) rotate(${this.rotation()}deg)`);

  protected readonly zoomPercent = computed(() => Math.round(this.scale() * 100));

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.document.addEventListener('keydown', this.keyHandler, true);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('keydown', this.keyHandler, true);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  // ---- Zoom / rotación / encuadre ----

  protected zoomIn(): void { this.setScale(this.scale() * 1.25); }
  protected zoomOut(): void { this.setScale(this.scale() / 1.25); }

  protected rotate(): void {
    this.rotation.update((r) => (r + 90) % 360);
  }

  protected resetView(): void {
    this.scale.set(1);
    this.rotation.set(0);
    this.tx.set(0);
    this.ty.set(0);
  }

  private setScale(value: number): void {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
    this.scale.set(Math.round(clamped * 1000) / 1000);
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.setScale(this.scale() * factor);
  }

  // ---- Desplazamiento (pan) ----

  protected onPointerDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.dragging.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.originX = this.tx();
    this.originY = this.ty();
  }

  protected onPointerMove(event: MouseEvent): void {
    if (!this.dragging()) return;
    this.tx.set(this.originX + (event.clientX - this.startX));
    this.ty.set(this.originY + (event.clientY - this.startY));
  }

  protected onPointerUp(): void {
    this.dragging.set(false);
  }

  /** Cierra el visor solo si el clic cae sobre el fondo (no sobre la imagen ni el panel). */
  protected onBackdrop(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('iv-stage') || target.classList.contains('iv-body')) {
      this.close();
    }
  }

  private onKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        this.resetView();
        break;
      case 'r':
      case 'R':
        this.rotate();
        break;
    }
  }
}
