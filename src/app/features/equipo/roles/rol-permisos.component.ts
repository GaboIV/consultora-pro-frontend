import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { PermisoModulo, RolListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface RolPermisosData {
  rol: RolListItem;
}

@Component({
  selector: 'cp-rol-permisos',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <section class="dialog-surface">
      <header class="dialog-header">
        <h2>Permisos de {{ data.rol.nombre }}</h2>
        <p>{{ data.rol.descripcion }}</p>
      </header>

      <div class="permission-stack">
        @for (grupo of catalogo(); track grupo.modulo) {
          <section class="module-block">
            <h3>{{ grupo.modulo }}</h3>
            <div class="permission-list">
              @for (permiso of grupo.permisos; track permiso.id) {
                <label class="permission-row">
                  <input
                    type="checkbox"
                    [checked]="selected().has(permiso.id)"
                    (change)="toggle(permiso.id, $any($event.target).checked)"
                  />
                  <span>
                    <strong>{{ permiso.nombre }}</strong>
                    <small>{{ permiso.clave }}</small>
                  </span>
                </label>
              }
            </div>
          </section>
        }
      </div>

      <footer class="dialog-actions">
        <button class="btn btn-secondary" type="button" (click)="dialogRef.close(false)">Cancelar</button>
        <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Guardando...' : 'Guardar permisos' }}
        </button>
      </footer>
    </section>
  `,
  styles: [`
    .dialog-surface {
      background: var(--bg-2);
      color: var(--text);
      max-height: 86vh;
      min-width: min(760px, 94vw);
      overflow: auto;
      padding: 24px;
    }

    h2 {
      font-family: var(--font-head);
      font-size: 18px;
      letter-spacing: 0;
      margin: 0 0 4px;
    }

    .dialog-header p {
      color: var(--text-2);
      margin: 0 0 18px;
    }

    .permission-stack {
      display: grid;
      gap: 14px;
    }

    .module-block {
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }

    h3 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 13px;
      letter-spacing: 0;
      margin: 0 0 10px;
      text-transform: uppercase;
    }

    .permission-list {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .permission-row {
      align-items: flex-start;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: flex;
      gap: 9px;
      padding: 10px;
    }

    .permission-row strong,
    .permission-row small {
      display: block;
      line-height: 1.3;
    }

    .permission-row strong {
      color: var(--text);
      font-size: 13px;
    }

    .permission-row small {
      color: var(--text-3);
      font-family: var(--font-mono);
      font-size: 11px;
      margin-top: 2px;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 18px;
    }

    @media (max-width: 700px) {
      .permission-list {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolPermisosComponent {
  protected readonly data = inject<RolPermisosData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<RolPermisosComponent>);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly catalogo = signal<PermisoModulo[]>([]);
  readonly selected = signal(new Set<number>());
  readonly saving = signal(false);

  constructor() {
    forkJoin({
      catalogo: this.service.getPermisos(),
      rol: this.service.getRol(this.data.rol.id)
    }).subscribe({
      next: ({ catalogo, rol }) => {
        this.catalogo.set(catalogo);
        this.selected.set(new Set(rol.permisosIds));
      },
      error: () => this.snackBar.open('No se pudieron cargar los permisos.', 'Cerrar', { duration: 3500 })
    });
  }

  protected toggle(id: number, checked: boolean): void {
    const selected = new Set(this.selected());
    if (checked) {
      selected.add(id);
    } else {
      selected.delete(id);
    }
    this.selected.set(selected);
  }

  protected save(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.service.updateRolPermisos(this.data.rol.id, { permisosIds: [...this.selected()] }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        const message = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.snackBar.open(message ?? 'No se pudieron guardar los permisos.', 'Cerrar', { duration: 4200 });
      }
    });
  }
}
