import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable } from 'rxjs';

import { RolListItem, UsuarioListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface UsuarioFormData {
  mode: 'create' | 'edit';
  usuario?: UsuarioListItem;
  roles?: RolListItem[];
}

/** Refleja la política de Identity del backend: solo longitud mínima de 8 caracteres, contenido libre. Vacío es válido (se usa el password por defecto). */
function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return null;
  return value.length < 8 ? { minlength: true } : null;
}

@Component({
  selector: 'cp-usuario-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgSelectModule, MatDialogModule],
  template: `
    <section class="dialog-surface">
      <header class="dialog-header">
        <h2>{{ data.mode === 'create' ? 'Nuevo miembro' : 'Editar usuario' }}</h2>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
        <label class="form-field">
          <span>Nombres</span>
          <input formControlName="nombres" />
        </label>

        <label class="form-field">
          <span>Apellidos</span>
          <input formControlName="apellidos" />
        </label>

        <label class="form-field wide">
          <span>Correo</span>
          <input formControlName="correo" type="email" />
          @if (form.controls.correo.hasError('conflict')) {
            <small>El correo ya está registrado.</small>
          }
        </label>

        <label class="form-field">
          <span>Teléfono</span>
          <input formControlName="telefono" />
        </label>

        <label class="form-field">
          <span>Iniciales</span>
          <input formControlName="iniciales" maxlength="2" (input)="initialsEdited = true" />
        </label>

        <label class="form-field wide">
          <span>Rol</span>
          <ng-select
            formControlName="rolId"
            [searchable]="true"
            [clearable]="false"
            [loading]="rolesLoading()"
            [compareWith]="compareRoleIds"
            placeholder="Seleccionar rol"
            loadingText="Cargando roles..."
            notFoundText="No hay roles disponibles"
            dropdownPosition="top"
          >
            @for (role of roles(); track role.id) {
              <ng-option [value]="role.id">{{ role.nombre }}</ng-option>
            }
          </ng-select>
        </label>

        @if (data.mode === 'create') {
          <label class="form-field wide">
            <span>Password (Opcional - por defecto será el prefijo del correo)</span>
            <input formControlName="password" type="password" autocomplete="new-password" placeholder="Dejar vacío para usar prefijo del correo" />
            @if (form.controls.password.hasError('minlength')) {
              <small>La contraseña debe tener al menos 8 caracteres.</small>
            }
          </label>
        }

        <footer class="dialog-actions wide">
          <button class="btn btn-secondary" type="button" (click)="dialogRef.close(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </footer>
      </form>
    </section>
  `,
  styles: [`
    .dialog-surface {
      background: var(--bg-2);
      border-radius: var(--radius-lg);
      color: var(--text);
      max-height: calc(100vh - 32px);
      min-width: 0;
      overflow: visible;
      padding: 24px 28px;
      width: 100%;
    }

    .dialog-header h2 {
      font-family: var(--font-head);
      font-size: 18px;
      letter-spacing: 0;
      margin: 0 0 16px;
    }

    .form-grid {
      display: grid;
      gap: 13px 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .wide {
      grid-column: 1 / -1;
    }

    .form-field {
      display: grid;
      gap: 6px;
    }

    .form-field span {
      color: var(--text-2);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    input {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      min-width: 0;
      outline: none;
      padding: 9px 12px;
      width: 100%;
    }

    input:focus {
      border-color: var(--accent);
    }

    small {
      color: var(--red);
      font-size: 12px;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 6px;
    }

    @media (max-width: 680px) {
      .dialog-surface {
        padding: 20px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioFormComponent {
  protected readonly data = inject<UsuarioFormData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<UsuarioFormComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = signal<RolListItem[]>(this.data.roles ?? []);
  readonly rolesLoading = signal(false);
  readonly saving = signal(false);
  protected readonly compareRoleIds = (left: unknown, right: unknown): boolean =>
    String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase();
  protected initialsEdited = !!this.data.usuario?.iniciales;

  readonly form = this.fb.nonNullable.group({
    nombres: [this.data.usuario?.nombres ?? '', Validators.required],
    apellidos: [this.data.usuario?.apellidos ?? '', Validators.required],
    correo: [this.data.usuario?.correo ?? '', [Validators.required, Validators.email]],
    telefono: [this.data.usuario?.telefono ?? ''],
    iniciales: [this.data.usuario?.iniciales ?? '', [Validators.maxLength(2)]],
    rolId: [this.data.usuario?.rolId ?? '', Validators.required],
    password: ['', passwordPolicyValidator]
  });

  constructor() {
    if (this.roles().length > 0) {
      this.syncSelectedRole(this.roles());
    } else {
      this.loadRoles();
    }

    this.form.controls.nombres.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInitials());

    this.form.controls.apellidos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInitials());
  }

  private loadRoles(): void {
    this.rolesLoading.set(true);
    this.service.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.syncSelectedRole(roles);
        this.rolesLoading.set(false);
      },
      error: () => {
        this.rolesLoading.set(false);
        this.snackBar.open('No se pudieron cargar los roles.', 'Cerrar', { duration: 3500 });
      }
    });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.form.controls.correo.setErrors(null);
    const value = this.form.getRawValue();

    const request = {
      nombres: value.nombres.trim(),
      apellidos: value.apellidos.trim(),
      correo: value.correo.trim(),
      telefono: value.telefono.trim(),
      iniciales: value.iniciales.trim(),
      rolId: value.rolId
    };

    const operation: Observable<unknown> =
      this.data.mode === 'create'
        ? this.service.createUsuario({ ...request, password: value.password.trim() || null })
        : this.service.updateUsuario(this.data.usuario!.id, request);

    operation.subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.form.controls.correo.setErrors({ conflict: true });
        }
        this.snackBar.open(this.errorMessage(error), 'Cerrar', { duration: 4200 });
      }
    });
  }

  private syncInitials(): void {
    if (this.initialsEdited) return;

    const nombres = this.form.controls.nombres.value.trim();
    const apellidos = this.form.controls.apellidos.value.trim();
    const initials = `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
    this.form.controls.iniciales.setValue(initials.slice(0, 2), { emitEvent: false });
  }

  private syncSelectedRole(roles: RolListItem[]): void {
    const selectedRoleId = this.form.controls.rolId.value;
    if (selectedRoleId && roles.some((role) => role.id === selectedRoleId)) return;

    const roleName = this.data.usuario?.rol?.trim().toLowerCase();
    const roleByName = roles.find((role) => role.nombre.trim().toLowerCase() === roleName);
    if (roleByName) {
      this.form.controls.rolId.setValue(roleByName.id);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'No se pudo guardar el usuario.';
    }
    return 'No se pudo guardar el usuario.';
  }
}
