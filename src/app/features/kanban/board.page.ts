import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { TablerosService } from '../../core/services/tableros.service';
import { TarjetasService } from '../../core/services/tarjetas.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { AuthService } from '../../core/services/auth.service';
import {
  TableroDetalle, Columna, Tarjeta, PrioridadTarjeta,
  prioridadLabel, prioridadTone, PRIORIDAD_OPTIONS
} from '../../core/models/kanban.models';
import { Tone } from '../../core/models/management.models';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { AutoFocusDirective } from '../../shared/directives/autofocus.directive';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { CardDetailModalComponent } from './card-detail.modal';

interface UsuarioOpcion { id: string; nombre: string; iniciales: string; }

@Component({
  selector: 'cp-board',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule, HasPermissionDirective, AutoFocusDirective],
  templateUrl: './board.page.html',
  styleUrls: ['./board.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tablerosService = inject(TablerosService);
  private readonly tarjetasService = inject(TarjetasService);
  private readonly facade = inject(ManagementFacade);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly tablero = signal<TableroDetalle | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected proyectoId = '';
  private tableroId = '';

  // Estado de edición inline
  protected readonly addingCardCol = signal<string | null>(null);
  protected nuevoTituloTarjeta = '';
  protected readonly addingColumn = signal(false);
  protected nuevaColumnaNombre = '';
  protected readonly editingColumn = signal<string | null>(null);
  protected editColumnNombre = '';
  protected readonly showBoardEdit = signal(false);
  protected editBoardNombre = '';
  protected editBoardClave = '';
  protected editBoardColor = 'blue';

  // Filtros (F4)
  protected readonly search = signal('');
  protected readonly fPrioridad = signal<PrioridadTarjeta | ''>('');
  protected readonly fEtiqueta = signal('');
  protected readonly fResponsable = signal('');
  protected readonly hasActiveFilters = computed(() =>
    !!this.search() || !!this.fPrioridad() || !!this.fEtiqueta() || !!this.fResponsable());

  protected readonly prioridadLabel = prioridadLabel;
  protected readonly prioridadTone = prioridadTone;
  protected readonly prioridadOptions = PRIORIDAD_OPTIONS;
  protected readonly canEdit = this.auth.hasPermission('kanban.editar');

  protected readonly usuarios = computed<UsuarioOpcion[]>(() =>
    this.facade.usuarios().map((u) => ({
      id: u.id,
      nombre: `${u.nombres} ${u.apellidos}`.trim(),
      iniciales: u.iniciales
    })));

  ngOnInit(): void {
    this.proyectoId = this.route.snapshot.paramMap.get('proyectoId') ?? '';
    this.tableroId = this.route.snapshot.paramMap.get('tableroId') ?? '';
    if (!this.tableroId) {
      this.error.set('Tablero no especificado');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.tablerosService.getById(this.tableroId).subscribe({
      next: (data) => {
        this.tablero.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'No se pudo cargar el tablero.'));
        this.loading.set(false);
      }
    });
  }

  private refresh(): void {
    this.tablero.set(this.tablero() ? { ...this.tablero()! } : null);
  }

  protected dropListIds(): string[] {
    return this.tablero()?.columnas.map((c) => c.id) ?? [];
  }

  protected dragDisabled(): boolean {
    return !this.canEdit || this.hasActiveFilters();
  }

  // ---- Filtros ----

  protected matches(t: Tarjeta): boolean {
    const q = this.search().trim().toLowerCase();
    if (q && !t.titulo.toLowerCase().includes(q) && !t.codigo.toLowerCase().includes(q)) return false;
    if (this.fPrioridad() && t.prioridad !== this.fPrioridad()) return false;
    if (this.fEtiqueta() && !t.etiquetas.some((e) => e.id === this.fEtiqueta())) return false;
    if (this.fResponsable() && !t.responsables.some((r) => r.usuarioId === this.fResponsable())) return false;
    return true;
  }

  protected visibleCount(col: Columna): number {
    return col.tarjetas.filter((t) => this.matches(t)).length;
  }

  protected clearFilters(): void {
    this.search.set('');
    this.fPrioridad.set('');
    this.fEtiqueta.set('');
    this.fResponsable.set('');
  }

  // ---- Drag & drop de tarjetas ----

  protected drop(event: CdkDragDrop<Tarjeta[]>, columnaDestino: Columna): void {
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    const lista = event.container.data;
    const idx = event.currentIndex;
    const movida = lista[idx];
    movida.columnaId = columnaDestino.id;
    // antes = vecino superior (orden menor); despues = vecino inferior (orden mayor)
    const antes = lista[idx - 1]?.id ?? null;
    const despues = lista[idx + 1]?.id ?? null;
    this.refresh();

    this.tarjetasService.mover(movida.id, {
      columnaDestinoId: columnaDestino.id,
      antesDeTarjetaId: antes,
      despuesDeTarjetaId: despues
    }).subscribe({
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo mover la tarjeta.'), 'Cerrar', { duration: 4200 });
        this.load();
      }
    });
  }

  // ---- Tarjetas ----

  protected startAddCard(colId: string): void {
    this.addingCardCol.set(colId);
    this.nuevoTituloTarjeta = '';
  }

  protected addCard(col: Columna): void {
    const titulo = this.nuevoTituloTarjeta.trim();
    if (!titulo) return;
    this.tarjetasService.create({ columnaId: col.id, titulo }).subscribe({
      next: (tarjeta) => {
        col.tarjetas.push(tarjeta);
        this.nuevoTituloTarjeta = '';
        this.addingCardCol.set(null);
        this.refresh();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo crear la tarjeta.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected openCard(tarjeta: Tarjeta): void {
    const board = this.tablero();
    if (!board) return;
    const ref = this.dialog.open(CardDetailModalComponent, {
      data: { tarjetaId: tarjeta.id, tablero: board, usuarios: this.usuarios(), canEdit: this.canEdit },
      panelClass: ['cp-dialog-panel', 'cp-card-dialog-panel'],
      width: 'min(1200px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 48px)'
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) this.load();
    });
  }

  // ---- Columnas ----

  protected startAddColumn(): void {
    this.addingColumn.set(true);
    this.nuevaColumnaNombre = '';
  }

  protected addColumn(): void {
    const nombre = this.nuevaColumnaNombre.trim();
    if (!nombre) return;
    this.tablerosService.createColumna({ tableroId: this.tableroId, nombre }).subscribe({
      next: (columna) => {
        this.tablero()?.columnas.push({ ...columna, tarjetas: columna.tarjetas ?? [] });
        this.nuevaColumnaNombre = '';
        this.addingColumn.set(false);
        this.refresh();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo crear la columna.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected startEditColumn(col: Columna): void {
    this.editingColumn.set(col.id);
    this.editColumnNombre = col.nombre;
  }

  protected saveColumn(col: Columna): void {
    const nombre = this.editColumnNombre.trim();
    if (!nombre) return;
    this.tablerosService.updateColumna(col.id, { nombre, limiteWip: col.limiteWip ?? null }).subscribe({
      next: () => {
        col.nombre = nombre;
        this.editingColumn.set(null);
        this.refresh();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar la columna.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteColumn(col: Columna): void {
    if (col.tarjetas.length > 0) {
      this.snackBar.open('Mueve o archiva las tarjetas antes de eliminar la columna.', 'Cerrar', { duration: 4200 });
      return;
    }
    if (!confirm(`¿Eliminar la columna «${col.nombre}»?`)) return;
    this.tablerosService.deleteColumna(col.id).subscribe({
      next: () => {
        const board = this.tablero();
        if (board) board.columnas = board.columnas.filter((c) => c.id !== col.id);
        this.refresh();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo eliminar la columna.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected moveColumn(col: Columna, dir: -1 | 1): void {
    const board = this.tablero();
    if (!board) return;
    const cols = board.columnas;
    const i = cols.findIndex((c) => c.id === col.id);
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;

    // Intercambio visual: la columna movida queda en el índice j.
    [cols[i], cols[j]] = [cols[j], cols[i]];
    // antes = vecino izquierdo (orden menor); despues = vecino derecho (orden mayor)
    const antes = cols[j - 1]?.id ?? null;
    const despues = cols[j + 1]?.id ?? null;
    this.refresh();

    this.tablerosService.reordenarColumna(col.id, {
      antesDeColumnaId: antes,
      despuesDeColumnaId: despues
    }).subscribe({
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo reordenar la columna.'), 'Cerrar', { duration: 4200 });
        this.load();
      }
    });
  }

  // ---- Tablero ----

  protected openBoardEdit(): void {
    const b = this.tablero();
    if (!b) return;
    this.editBoardNombre = b.nombre;
    this.editBoardClave = b.clave;
    this.editBoardColor = b.colorClass;
    this.showBoardEdit.set(true);
  }

  protected saveBoard(): void {
    const b = this.tablero();
    if (!b) return;
    this.tablerosService.update(b.id, {
      nombre: this.editBoardNombre.trim(),
      clave: this.editBoardClave.trim().toUpperCase(),
      descripcion: b.descripcion,
      colorClass: this.editBoardColor
    }).subscribe({
      next: () => {
        this.showBoardEdit.set(false);
        this.load();
        this.snackBar.open('Tablero actualizado.', 'Cerrar', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo actualizar el tablero.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected deleteBoard(): void {
    const b = this.tablero();
    if (!b) return;
    if (!confirm(`¿Archivar el tablero «${b.nombre}»? Las tarjetas dejarán de mostrarse.`)) return;
    this.tablerosService.delete(b.id).subscribe({
      next: () => {
        this.snackBar.open('Tablero archivado.', 'Cerrar', { duration: 3000 });
        this.navigateBack();
      },
      error: (err) => this.snackBar.open(apiErrorMessage(err, 'No se pudo archivar el tablero.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected navigateBack(): void {
    if (this.proyectoId) {
      this.router.navigate(['/proyectos', this.proyectoId]);
    } else {
      this.router.navigate(['/mis-tableros']);
    }
  }

  // ---- Helpers de presentación ----

  protected getCoverImageUrl(descripcion?: string): string | null {
    if (!descripcion) return null;
    const match = /!\[([^\]]*)\]\(([^)\s]+)\)/.exec(descripcion);
    return match ? match[2] : null;
  }

  protected colorTone(color: string): Tone {
    const allowed: Tone[] = ['blue', 'green', 'amber', 'purple', 'red', 'gray', 'teal'];
    return (allowed.includes(color as Tone) ? color : 'blue') as Tone;
  }

  protected dueTone(fecha?: string | null): Tone {
    if (!fecha) return 'gray';
    const d = new Date(fecha);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'red';
    if (diff <= 2) return 'amber';
    return 'green';
  }

  protected formatDue(fecha?: string | null): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

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
}
