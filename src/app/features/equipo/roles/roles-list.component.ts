import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';

import { RolListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { RolFormComponent } from './rol-form.component';
import { RolPermisosComponent } from './rol-permisos.component';

@Component({
  selector: 'cp-roles-list',
  standalone: true,
  imports: [LucideAngularModule, HasPermissionDirective],
  template: `
    <section class="page">
      <header class="page-header page-header-row">
        <div>
          <h1 class="page-title">Roles y permisos</h1>
          <p class="page-subtitle">Permisos efectivos leídos desde el rol en cada login</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'roles.crear'">
          <i-lucide name="plus" [size]="15" [strokeWidth]="2" />
          Nuevo rol
        </button>
      </header>

      <div class="roles-grid">
        @for (rol of roles(); track rol.id) {
          <article class="role-card">
            <header class="role-card-header">
              <div>
                <h2>{{ rol.nombre }}</h2>
                <p>{{ rol.descripcion || 'Sin descripción' }}</p>
              </div>
              <span class="users-count">{{ rol.usuariosCount }} usuarios</span>
            </header>

            <div class="permissions-preview">
              @for (grupo of rol.permisos; track grupo.modulo) {
                <section class="module-preview">
                  <h3>{{ grupo.modulo }}</h3>
                  <div class="chip-row">
                    @for (permiso of grupo.permisos; track permiso.id) {
                      <span class="permission-chip">{{ permiso.clave }}</span>
                    }
                  </div>
                </section>
              } @empty {
                <p class="item-meta">Sin permisos concedidos.</p>
              }
            </div>

            <footer class="role-actions">
              <button class="btn btn-secondary btn-sm" type="button" (click)="toggleDetail(rol.id)">
                <i-lucide name="chevron-down" [size]="14" [strokeWidth]="2" />
                Detalle
              </button>
              <button class="btn btn-secondary btn-sm" type="button" (click)="openEdit(rol)" *appHasPermission="'roles.editar'">
                <i-lucide name="edit-3" [size]="14" [strokeWidth]="2" />
                Editar
              </button>
              <button class="btn btn-secondary btn-sm" type="button" (click)="openPermisos(rol)" *appHasPermission="'roles.editar'">
                <i-lucide name="settings-2" [size]="14" [strokeWidth]="2" />
                Permisos
              </button>
              @if (rol.usuariosCount === 0) {
                <button class="btn btn-danger btn-sm" type="button" (click)="delete(rol)" *appHasPermission="'roles.eliminar'">
                  <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                  Eliminar
                </button>
              }
            </footer>

            @if (expandedRoleId() === rol.id) {
              <div class="detail-panel">
                @for (grupo of rol.permisos; track grupo.modulo) {
                  <div>
                    <strong>{{ grupo.modulo }}</strong>
                    <span>{{ grupo.permisos.length }} permisos</span>
                  </div>
                } @empty {
                  <span class="muted">No hay permisos asignados.</span>
                }
              </div>
            }
          </article>
        } @empty {
          <div class="panel empty-panel">{{ loading() ? 'Cargando roles...' : 'No hay roles registrados.' }}</div>
        }
      </div>
    </section>
  `,
  styles: [`
    .page-header-row {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .roles-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .role-card {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      min-width: 0;
      padding: 18px;
    }

    .role-card-header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    h2 {
      font-family: var(--font-head);
      font-size: 17px;
      letter-spacing: 0;
      margin: 0 0 4px;
    }

    .role-card-header p {
      color: var(--text-2);
      margin: 0;
    }

    .users-count {
      background: rgba(79, 142, 247, 0.14);
      border-radius: 999px;
      color: var(--accent);
      flex: 0 0 auto;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      padding: 7px 10px;
    }

    .permissions-preview {
      display: grid;
      gap: 10px;
    }

    .module-preview h3 {
      color: var(--text-3);
      font-family: var(--font-head);
      font-size: 11px;
      letter-spacing: 0;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .permission-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--text-2);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 8px;
    }

    .role-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .detail-panel {
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: grid;
      gap: 8px;
      margin-top: 14px;
      padding: 12px;
    }

    .detail-panel div {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .detail-panel strong {
      color: var(--text);
      font-size: 12px;
    }

    .detail-panel span {
      color: var(--text-2);
      font-size: 12px;
    }

    .empty-panel {
      grid-column: 1 / -1;
    }

    @media (max-width: 980px) {
      .roles-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      .page-header-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesListComponent {
  private readonly service = inject(SecurityAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly roles = signal<RolListItem[]>([]);
  readonly loading = signal(true);
  readonly expandedRoleId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected toggleDetail(roleId: string): void {
    this.expandedRoleId.set(this.expandedRoleId() === roleId ? null : roleId);
  }

  protected openCreate(): void {
    this.dialog
      .open(RolFormComponent, { data: { mode: 'create' }, panelClass: 'cp-dialog-panel' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  protected openEdit(rol: RolListItem): void {
    this.dialog
      .open(RolFormComponent, { data: { mode: 'edit', rol }, panelClass: 'cp-dialog-panel' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  protected openPermisos(rol: RolListItem): void {
    this.dialog
      .open(RolPermisosComponent, { data: { rol }, panelClass: 'cp-dialog-panel' })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.snackBar.open('Permisos actualizados.', 'Cerrar', { duration: 2800 });
          this.load();
        }
      });
  }

  protected delete(rol: RolListItem): void {
    if (!confirm(`¿Eliminar el rol ${rol.nombre}?`)) return;

    this.service.deleteRol(rol.id).subscribe({
      next: () => {
        this.snackBar.open('Rol eliminado.', 'Cerrar', { duration: 2800 });
        this.load();
      },
      error: (error: unknown) => this.showError(error, 'No se pudo eliminar el rol.')
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.showError(error, 'No se pudieron cargar los roles.');
      }
    });
  }

  private showError(error: unknown, fallback: string): void {
    const message = error instanceof HttpErrorResponse ? error.error?.message : null;
    this.snackBar.open(message ?? fallback, 'Cerrar', { duration: 4200 });
  }
}
