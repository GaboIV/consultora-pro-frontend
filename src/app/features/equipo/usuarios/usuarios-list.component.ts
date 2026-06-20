import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { NgSelectModule } from '@ng-select/ng-select';

import { RolListItem, UsuarioListItem, PagedResult } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CambiarPasswordComponent } from './cambiar-password.component';
import { UsuarioFormComponent, UsuarioFormData } from './usuario-form.component';

@Component({
  selector: 'cp-usuarios-list',
  standalone: true,
  imports: [LucideAngularModule, HasPermissionDirective, FormsModule, NgSelectModule],
  template: `
    <section class="page">
      <header class="page-header page-header-row">
        <div>
          <h1 class="page-title">Usuarios</h1>
          <p class="page-subtitle">Miembros con acceso al portal, rol único y estado operativo</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'roles.crear'">
          <i-lucide name="user-plus" [size]="15" [strokeWidth]="2" />
          Nuevo miembro
        </button>
      </header>

      <div class="toolbar" style="margin-bottom: 20px; display: flex; gap: 12px; align-items: flex-end;">
        <div class="filter-field" style="width: 240px;">
          <label class="form-label" style="display: block; font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">Filtrar por Rol</label>
          <ng-select
            [ngModel]="selectedRol()"
            (ngModelChange)="onRolFilterChange($event)"
            placeholder="Todos los roles"
            [searchable]="false"
            [clearable]="true"
            appendTo="body"
          >
            <ng-option [value]="null">Todos los roles</ng-option>
            @for (role of roles(); track role.id) {
              <ng-option [value]="role.nombre">{{ role.nombre }}</ng-option>
            }
          </ng-select>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre completo</th>
              <th>Iniciales</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (usuario of usuarios(); track usuario.id) {
              <tr>
                <td>
                  <div class="data-name">{{ usuario.nombres }} {{ usuario.apellidos }}</div>
                  <div class="item-meta">{{ usuario.correo }}</div>
                </td>
                <td><span class="avatar-token tone-blue">{{ usuario.iniciales }}</span></td>
                <td><span class="role-badge">{{ usuario.rol }}</span></td>
                <td>
                  <span class="state-pill" [class.inactive]="!usuario.activo">
                    {{ usuario.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>{{ formatUltimoAcceso(usuario.ultimoAcceso) }}</td>
                <td>
                  <div class="row actions">
                    <button class="icon-button sm" type="button" title="Editar" (click)="openEdit(usuario)" *appHasPermission="'roles.editar'">
                      <i-lucide name="edit-3" [size]="14" [strokeWidth]="2" />
                    </button>
                    <button class="icon-button sm" type="button" title="Cambiar contraseña" (click)="openPassword(usuario)" *appHasPermission="'roles.editar'">
                      <i-lucide name="key-round" [size]="14" [strokeWidth]="2" />
                    </button>
                    @if (usuario.activo) {
                      <button class="icon-button sm" type="button" title="Desactivar" (click)="desactivar(usuario)" *appHasPermission="'roles.editar'">
                        <i-lucide name="user-x" [size]="14" [strokeWidth]="2" />
                      </button>
                    } @else {
                      <button class="icon-button sm success-btn" type="button" title="Activar" (click)="activar(usuario)" *appHasPermission="'roles.editar'">
                        <i-lucide name="user-check" [size]="14" [strokeWidth]="2" />
                      </button>
                    }
                    <button class="icon-button sm danger" type="button" title="Eliminar" (click)="delete(usuario)" *appHasPermission="'roles.eliminar'">
                      <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty-cell">{{ loading() ? 'Cargando usuarios...' : 'No hay usuarios registrados.' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button
            class="btn btn-secondary btn-sm"
            [disabled]="currentPage() <= 1"
            (click)="goToPage(currentPage() - 1)"
          >
            Anterior
          </button>
          <span class="page-info">Página {{ currentPage() }} de {{ totalPages() }}</span>
          <button
            class="btn btn-secondary btn-sm"
            [disabled]="currentPage() >= totalPages()"
            (click)="goToPage(currentPage() + 1)"
          >
            Siguiente
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .page-header-row {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .role-badge,
    .state-pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      padding: 7px 10px;
      white-space: nowrap;
    }

    .role-badge {
      background: rgba(79, 142, 247, 0.14);
      color: var(--accent);
    }

    .state-pill {
      background: rgba(62, 207, 142, 0.14);
      color: var(--green);
    }

    .state-pill.inactive {
      background: rgba(229, 83, 83, 0.14);
      color: var(--red);
    }

    .actions {
      gap: 6px;
    }

    .icon-button.sm {
      height: 32px;
      width: 34px;
    }

    .icon-button.danger:hover {
      border-color: rgba(229, 83, 83, 0.42);
      color: var(--red);
    }

    .icon-button.success-btn:hover {
      border-color: rgba(62, 207, 142, 0.42);
      color: var(--green);
    }

    .empty-cell {
      color: var(--text-2);
      padding: 24px;
      text-align: center;
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
export class UsuariosListComponent {
  private readonly service = inject(SecurityAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly usuarios = signal<UsuarioListItem[]>([]);
  readonly roles = signal<RolListItem[]>([]);
  readonly loading = signal(true);
  readonly rolesLoading = signal(true);
  readonly selectedRol = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 20;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  constructor() {
    this.load();
    this.loadRoles();
  }

  protected openCreate(): void {
    this.openUserDialog({ mode: 'create' });
  }

  protected openEdit(usuario: UsuarioListItem): void {
    this.openUserDialog({ mode: 'edit', usuario });
  }

  protected openPassword(usuario: UsuarioListItem): void {
    this.dialog
      .open(CambiarPasswordComponent, {
        data: { userId: usuario.id, nombre: `${usuario.nombres} ${usuario.apellidos}` },
        panelClass: 'cp-dialog-panel'
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.snackBar.open('Contraseña actualizada.', 'Cerrar', { duration: 3000 });
      });
  }

  protected onRolFilterChange(rol: string | null): void {
    this.selectedRol.set(rol);
    this.currentPage.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  protected formatUltimoAcceso(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'Nunca';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return 'Hace un momento';
        return `Hace ${diffMins} min`;
      }
      return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }

    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected desactivar(usuario: UsuarioListItem): void {
    if (!confirm(`¿Deseas desactivar a ${usuario.nombres} ${usuario.apellidos}?`)) return;

    this.service.desactivarUsuario(usuario.id).subscribe({
      next: () => {
        this.snackBar.open('Usuario desactivado exitosamente.', 'Cerrar', { duration: 2800 });
        this.load();
      },
      error: (error: unknown) => {
        this.showError(error, 'No se pudo desactivar el usuario.');
      }
    });
  }

  protected activar(usuario: UsuarioListItem): void {
    if (!confirm(`¿Deseas activar a ${usuario.nombres} ${usuario.apellidos}?`)) return;

    this.service.activarUsuario(usuario.id).subscribe({
      next: () => {
        this.snackBar.open('Usuario activado exitosamente.', 'Cerrar', { duration: 2800 });
        this.load();
      },
      error: (error: unknown) => {
        this.showError(error, 'No se pudo activar el usuario.');
      }
    });
  }

  protected delete(usuario: UsuarioListItem): void {
    if (!confirm(`¿Deseas eliminar DEFINITIVAMENTE a ${usuario.nombres} ${usuario.apellidos}? Esta acción no se puede deshacer y borrará al usuario del sistema.`)) return;

    this.service.deleteUsuario(usuario.id).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado definitivamente.', 'Cerrar', { duration: 2800 });
        this.load();
      },
      error: (error: unknown) => this.showError(error, 'No se pudo eliminar el usuario.')
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.getUsuarios(this.currentPage(), this.pageSize, this.selectedRol() || undefined).subscribe({
      next: (result) => {
        this.usuarios.set(result.data);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.showError(error, 'No se pudieron cargar los usuarios.');
      }
    });
  }

  private loadRoles(): void {
    this.rolesLoading.set(true);
    this.service.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.rolesLoading.set(false);
      },
      error: (error: unknown) => {
        this.rolesLoading.set(false);
        this.showError(error, 'No se pudieron cargar los roles.');
      }
    });
  }

  private openUserDialog(data: UsuarioFormData): void {
    if (this.roles().length > 0) {
      this.showUserDialog(data);
      return;
    }

    this.rolesLoading.set(true);
    this.service.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.rolesLoading.set(false);
        this.showUserDialog(data);
      },
      error: (error: unknown) => {
        this.rolesLoading.set(false);
        this.showError(error, 'No se pudieron cargar los roles.');
      }
    });
  }

  private showUserDialog(data: UsuarioFormData): void {
    this.dialog
      .open(UsuarioFormComponent, {
        data: { ...data, roles: this.roles() },
        panelClass: ['cp-dialog-panel', 'cp-user-dialog-panel'],
        width: 'min(700px, calc(100vw - 32px))',
        maxWidth: 'calc(100vw - 32px)'
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }

  private showError(error: unknown, fallback: string): void {
    const message = error instanceof HttpErrorResponse ? error.error?.message : null;
    this.snackBar.open(message ?? fallback, 'Cerrar', { duration: 4200 });
  }
}
