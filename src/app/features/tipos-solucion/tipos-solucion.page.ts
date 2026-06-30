import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, map } from 'rxjs';

import { apiErrorMessage } from '../../core/utils/api-error-message';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { TipoSolucionAdmin, TiposSolucionService } from '../../core/services/tipos-solucion.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'cp-tipos-solucion-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, HasPermissionDirective, CloseOnBackDirective],
  template: `
    <section class="page">
      <header class="page-header page-header-row">
        <div>
          <h1 class="page-title">Tipos de solución</h1>
          <p class="page-subtitle">Catálogo de tipos de proyecto disponibles al crear proyectos</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'tipos-solucion.crear'">
          <i-lucide name="plus" [size]="15" [strokeWidth]="2" />
          Nuevo tipo
        </button>
      </header>

      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th class="col-center">Visible</th>
              <th class="col-center">Proyectos</th>
              <th class="col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (tipo of tipos(); track tipo.id) {
              <tr [class.row-inactive]="!tipo.activo">
                <td class="cell-name">{{ tipo.nombre }}</td>
                <td class="col-center">
                  @if (canEdit()) {
                    <button
                      type="button"
                      class="visible-toggle"
                      [class.is-on]="tipo.activo"
                      [disabled]="togglingId() === tipo.id"
                      (click)="toggleVisible(tipo)"
                      [title]="tipo.activo ? 'Visible en el selector. Click para ocultar' : 'Oculto del selector. Click para mostrar'"
                    >
                      <span class="visible-dot"></span>
                      {{ tipo.activo ? 'Visible' : 'Oculto' }}
                    </button>
                  } @else {
                    <span class="visible-badge" [class.is-on]="tipo.activo">{{ tipo.activo ? 'Visible' : 'Oculto' }}</span>
                  }
                </td>
                <td class="col-center">
                  <span class="count-chip" [class.count-zero]="tipo.totalProyectos === 0">
                    {{ tipo.totalProyectos }}
                  </span>
                </td>
                <td class="col-actions">
                  <button class="btn btn-secondary btn-sm" type="button" (click)="openEdit(tipo)" *appHasPermission="'tipos-solucion.editar'">
                    <i-lucide name="edit-3" [size]="14" [strokeWidth]="2" />
                    Editar
                  </button>
                  <button
                    class="btn btn-danger btn-sm"
                    type="button"
                    (click)="delete(tipo)"
                    [disabled]="tipo.totalProyectos > 0"
                    [title]="tipo.totalProyectos > 0 ? 'No se puede eliminar: tiene proyectos asociados' : 'Eliminar'"
                    *appHasPermission="'tipos-solucion.eliminar'"
                  >
                    <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                    Eliminar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty-row">
                  {{ loading() ? 'Cargando tipos de solución...' : 'No hay tipos de solución registrados.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (showForm()) {
      <div class="cp-modal-overlay" cpCloseOnBack (cpCloseOnBack)="closeForm()" (click)="closeForm()">
        <div class="cp-modal" (click)="$event.stopPropagation()">
          <header class="cp-modal__header">
            <h2 class="cp-modal__title">{{ editing() ? 'Editar tipo de solución' : 'Nuevo tipo de solución' }}</h2>
            <button class="cp-modal__close" type="button" (click)="closeForm()" aria-label="Cerrar">×</button>
          </header>

          <div class="cp-modal__body">
            <div class="form-field">
              <label class="form-label">Nombre</label>
              <input
                class="form-input"
                [(ngModel)]="nombre"
                name="nombre"
                placeholder="Ej: Otros"
                maxlength="120"
                (keyup.enter)="save()"
                #nombreInput
              />
            </div>

            <label class="check-field">
              <input type="checkbox" [(ngModel)]="activo" name="activo" />
              <span class="check-text">
                <span class="check-title">Visible en la selección</span>
                <span class="check-hint">Si lo desactivas, el tipo se conserva pero deja de ofrecerse al crear proyectos.</span>
              </span>
            </label>
          </div>

          <footer class="cp-modal__footer">
            <button class="btn btn-secondary" type="button" (click)="closeForm()">Cancelar</button>
            <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!nombre.trim() || saving()">
              {{ editing() ? 'Guardar cambios' : 'Crear tipo' }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header-row {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .data-table {
      border-collapse: collapse;
      width: 100%;
    }

    .data-table th {
      color: var(--text-3);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      padding: 10px 14px;
      text-align: left;
      text-transform: uppercase;
    }

    .data-table td {
      border-top: 1px solid var(--border);
      padding: 12px 14px;
      vertical-align: middle;
    }

    .cell-name {
      color: var(--text);
      font-weight: 600;
    }

    .col-center { text-align: center; }

    .row-inactive .cell-name { color: var(--text-2); }

    .visible-toggle {
      align-items: center;
      background: rgba(62, 207, 142, 0.14);
      border: 1px solid transparent;
      border-radius: 999px;
      color: var(--green);
      cursor: pointer;
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      gap: 6px;
      padding: 5px 12px;
      transition: background-color 0.15s, color 0.15s;
    }

    .visible-toggle:not(.is-on) {
      background: rgba(148, 163, 184, 0.16);
      color: var(--text-2);
    }

    .visible-toggle[disabled] { cursor: progress; opacity: 0.6; }

    .visible-dot {
      background: currentColor;
      border-radius: 50%;
      height: 7px;
      width: 7px;
    }

    .visible-badge {
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      background: rgba(148, 163, 184, 0.16);
      color: var(--text-2);
    }

    .visible-badge.is-on {
      background: rgba(62, 207, 142, 0.14);
      color: var(--green);
    }

    .check-field {
      align-items: flex-start;
      cursor: pointer;
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }

    .check-field input { margin-top: 3px; accent-color: var(--accent); }

    .check-text { display: flex; flex-direction: column; gap: 2px; }
    .check-title { color: var(--text); font-size: 14px; font-weight: 600; }
    .check-hint { color: var(--text-3); font-size: 12px; }

    .col-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .count-chip {
      background: rgba(79, 142, 247, 0.14);
      border-radius: 999px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
    }

    .count-chip.count-zero {
      background: rgba(148, 163, 184, 0.16);
      color: var(--text-2);
    }

    .empty-row {
      color: var(--text-2);
      padding: 28px 14px;
      text-align: center;
    }

    .btn[disabled] {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .form-field { margin-bottom: 4px; }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2);
      letter-spacing: 0.3px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .form-input {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      font-size: 14px;
      outline: none;
      padding: 10px 12px;
      transition: border-color 0.15s;
      width: 100%;
    }

    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TiposSolucionPage {
  private readonly service = inject(TiposSolucionService);
  private readonly facade = inject(ManagementFacade);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly tipos = signal<TipoSolucionAdmin[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editing = computed(() => this.editingId() !== null);
  protected readonly togglingId = signal<string | null>(null);
  protected nombre = '';
  protected activo = true;

  constructor() {
    this.load();
  }

  protected canEdit(): boolean {
    return this.auth.hasPermission('tipos-solucion.editar');
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.nombre = '';
    this.activo = true;
    this.showForm.set(true);
  }

  protected openEdit(tipo: TipoSolucionAdmin): void {
    this.editingId.set(tipo.id);
    this.nombre = tipo.nombre;
    this.activo = tipo.activo;
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected save(): void {
    const nombre = this.nombre.trim();
    if (!nombre || this.saving()) return;

    this.saving.set(true);
    const id = this.editingId();
    const payload = { nombre, activo: this.activo };
    const request$: Observable<void> = id
      ? this.service.update(id, payload)
      : this.service.create(payload).pipe(map(() => void 0));

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.snackBar.open(id ? 'Tipo de solución actualizado.' : 'Tipo de solución creado.', 'Cerrar', { duration: 2800 });
        this.load();
        this.facade.refresh();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar el tipo de solución.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected delete(tipo: TipoSolucionAdmin): void {
    if (tipo.totalProyectos > 0) return;
    if (!confirm(`¿Eliminar el tipo de solución "${tipo.nombre}"?`)) return;

    this.service.delete(tipo.id).subscribe({
      next: () => {
        this.snackBar.open('Tipo de solución eliminado.', 'Cerrar', { duration: 2800 });
        this.load();
        this.facade.refresh();
      },
      error: (error: unknown) =>
        this.snackBar.open(apiErrorMessage(error, 'No se pudo eliminar el tipo de solución.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected toggleVisible(tipo: TipoSolucionAdmin): void {
    if (this.togglingId()) return;

    this.togglingId.set(tipo.id);
    this.service.update(tipo.id, { nombre: tipo.nombre, activo: !tipo.activo }).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.snackBar.open(
          tipo.activo ? `"${tipo.nombre}" ya no se ofrece al crear proyectos.` : `"${tipo.nombre}" vuelve a estar disponible.`,
          'Cerrar',
          { duration: 2800 }
        );
        this.load();
        this.facade.refresh();
      },
      error: (error: unknown) => {
        this.togglingId.set(null);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo actualizar la visibilidad.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudieron cargar los tipos de solución.'), 'Cerrar', { duration: 4200 });
      }
    });
  }
}
