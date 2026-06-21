import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { NgSelectModule } from '@ng-select/ng-select';

import { UsuarioProyectoAcceso } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface UsuarioProyectosData {
  userId: string;
  nombre: string;
}

interface ProyectoSeleccionable extends UsuarioProyectoAcceso {
  checked: boolean;
}

@Component({
  selector: 'cp-usuario-proyectos',
  standalone: true,
  imports: [MatDialogModule, FormsModule, LucideAngularModule, NgSelectModule],
  template: `
    <div class="modal-shell">
      <header class="cp-modal__header">
        <div>
          <h2 class="cp-modal__title">Acceso a proyectos</h2>
          <p class="cp-modal__subtitle">{{ data.nombre }}</p>
        </div>
        <button class="cp-modal__close" type="button" (click)="dialogRef.close(false)" aria-label="Cerrar">×</button>
      </header>

      <div class="cp-modal__body">
        @if (loading()) {
          <p class="state-msg">Cargando proyectos...</p>
        } @else if (accesoTotal()) {
          <div class="info-banner">
            <i-lucide name="shield-check" [size]="18" [strokeWidth]="2" />
            <span>El rol de este usuario tiene <strong>acceso a todos los proyectos</strong>. No es necesario asignarlos manualmente.</span>
          </div>
        } @else {
          <div class="tools">
            <div class="search">
              <i-lucide name="search" [size]="15" [strokeWidth]="2" />
              <input type="text" placeholder="Buscar proyecto..." [ngModel]="search()" (ngModelChange)="search.set($event)" />
            </div>
            <ng-select
              class="cliente-filter"
              [ngModel]="clienteFiltro()"
              (ngModelChange)="clienteFiltro.set($event)"
              placeholder="Todos los clientes"
              [searchable]="true"
              [clearable]="true"
              appendTo="body"
            >
              @for (cliente of clientes(); track cliente) {
                <ng-option [value]="cliente">{{ cliente }}</ng-option>
              }
            </ng-select>
            <button class="btn btn-secondary btn-sm" type="button" (click)="toggleAll()">
              {{ allFilteredSelected() ? 'Quitar visibles' : 'Seleccionar visibles' }}
            </button>
          </div>

          <p class="count">
            {{ selectedCount() }} de {{ items().length }} proyectos asignados
            @if (filtered().length !== items().length) {
              · {{ filtered().length }} en vista
            }
          </p>

          <ul class="proj-list">
            @for (item of filtered(); track item.proyectoId) {
              <li>
                <label class="proj-row" [class.selected]="item.checked">
                  <input type="checkbox" [checked]="item.checked" (change)="toggle(item)" />
                  <span class="proj-key">{{ item.clave }}</span>
                  <span class="proj-main">
                    <span class="proj-name">{{ item.nombre }}</span>
                    <span class="proj-client">{{ item.cliente }}</span>
                  </span>
                </label>
              </li>
            } @empty {
              <li class="state-msg span-2">No hay proyectos que coincidan.</li>
            }
          </ul>
        }
      </div>

      <footer class="cp-modal__footer">
        <button class="btn btn-secondary" type="button" (click)="dialogRef.close(false)">Cerrar</button>
        @if (!accesoTotal()) {
          <button class="btn btn-primary" type="button" [disabled]="loading() || saving()" (click)="save()">
            {{ saving() ? 'Guardando...' : 'Guardar acceso' }}
          </button>
        }
      </footer>
    </div>
  `,
  styles: [`
    .modal-shell {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 40px);
      min-width: min(800px, calc(100vw - 32px));
      overflow: hidden;
    }

    .cp-modal__subtitle {
      color: var(--text-2);
      font-size: 12px;
      margin: 2px 0 0;
    }

    .cp-modal__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      overflow: hidden;
      padding: 16px 20px;
    }

    .state-msg {
      color: var(--text-2);
      padding: 16px 0;
      text-align: center;
    }

    .info-banner {
      align-items: center;
      background: rgba(79, 142, 247, 0.12);
      border: 1px solid rgba(79, 142, 247, 0.3);
      border-radius: var(--radius);
      color: var(--text);
      display: flex;
      gap: 10px;
      padding: 14px;
    }

    .tools {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .search {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text-2);
      display: flex;
      flex: 1 1 240px;
      gap: 8px;
      padding: 8px 10px;
    }

    .cliente-filter {
      flex: 0 0 220px;
      min-width: 180px;
    }

    .search input {
      background: transparent;
      border: none;
      color: var(--text);
      flex: 1;
      outline: none;
    }

    .count {
      color: var(--text-2);
      font-size: 12px;
      margin: 0;
    }

    .proj-list {
      display: grid;
      gap: 6px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      list-style: none;
      margin: 0;
      overflow-y: auto;
      padding: 2px;
    }

    .proj-list .span-2 {
      grid-column: 1 / -1;
    }

    .proj-row {
      align-items: center;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      display: flex;
      gap: 10px;
      padding: 9px 10px;
    }

    .proj-row:hover {
      background: var(--bg-3);
      border-color: var(--border-strong);
    }

    .proj-row.selected {
      background: rgba(79, 142, 247, 0.08);
      border-color: rgba(79, 142, 247, 0.4);
    }

    @media (max-width: 640px) {
      .proj-list {
        grid-template-columns: 1fr;
      }
    }

    .proj-key {
      background: rgba(79, 142, 247, 0.14);
      border-radius: 6px;
      color: var(--accent);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 7px;
    }

    .proj-main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .proj-name {
      font-weight: 600;
    }

    .proj-client {
      color: var(--text-2);
      font-size: 12px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioProyectosComponent {
  protected readonly data = inject<UsuarioProyectosData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<UsuarioProyectosComponent>);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly accesoTotal = signal(false);
  readonly search = signal('');
  readonly clienteFiltro = signal<string | null>(null);
  readonly items = signal<ProyectoSeleccionable[]>([]);

  readonly clientes = computed(() =>
    Array.from(new Set(this.items().map((p) => p.cliente).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
  );

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const cliente = this.clienteFiltro();
    return this.items().filter((p) => {
      if (cliente && p.cliente !== cliente) return false;
      if (!term) return true;
      return (
        p.nombre.toLowerCase().includes(term) ||
        p.clave.toLowerCase().includes(term) ||
        p.cliente.toLowerCase().includes(term)
      );
    });
  });

  readonly selectedCount = computed(() => this.items().filter((p) => p.checked).length);
  readonly allFilteredSelected = computed(() => {
    const list = this.filtered();
    return list.length > 0 && list.every((p) => p.checked);
  });

  constructor() {
    this.service.getUsuarioProyectos(this.data.userId).subscribe({
      next: (result) => {
        this.accesoTotal.set(result.accesoTotal);
        this.items.set(result.proyectos.map((p) => ({ ...p, checked: p.asignado })));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.showError(error, 'No se pudieron cargar los proyectos.');
      }
    });
  }

  protected toggle(item: ProyectoSeleccionable): void {
    this.items.update((list) =>
      list.map((p) => (p.proyectoId === item.proyectoId ? { ...p, checked: !p.checked } : p))
    );
  }

  protected toggleAll(): void {
    const target = !this.allFilteredSelected();
    const visibleIds = new Set(this.filtered().map((p) => p.proyectoId));
    this.items.update((list) =>
      list.map((p) => (visibleIds.has(p.proyectoId) ? { ...p, checked: target } : p))
    );
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const proyectoIds = this.items().filter((p) => p.checked).map((p) => p.proyectoId);

    this.service.updateUsuarioProyectos(this.data.userId, { proyectoIds }).subscribe({
      next: () => {
        this.snackBar.open('Acceso a proyectos actualizado.', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showError(error, 'No se pudo actualizar el acceso.');
      }
    });
  }

  private showError(error: unknown, fallback: string): void {
    const message = error instanceof HttpErrorResponse ? error.error?.message : null;
    this.snackBar.open(message ?? fallback, 'Cerrar', { duration: 4200 });
  }
}
