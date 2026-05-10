import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable } from 'rxjs';

import { RolListItem, UsuarioListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface UsuarioFormData {
  mode: 'create' | 'edit';
  usuario?: UsuarioListItem;
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
          <span>Puesto</span>
          <input formControlName="puesto" />
        </label>

        <label class="form-field wide">
          <span>Rol</span>
          <ng-select
            formControlName="rolId"
            [items]="roles()"
            bindLabel="nombre"
            bindValue="id"
            placeholder="Seleccionar rol"
            appendTo="body"
          />
        </label>

        @if (data.mode === 'create') {
          <label class="form-field wide">
            <span>Password (Opcional - por defecto será el prefijo del correo)</span>
            <input formControlName="password" type="password" autocomplete="new-password" placeholder="Dejar vacío para usar prefijo del correo" />
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
      color: var(--text);
      min-width: min(720px, 92vw);
      padding: 24px;
    }

    .dialog-header h2 {
      font-family: var(--font-head);
      font-size: 18px;
      letter-spacing: 0;
      margin: 0 0 18px;
    }

    .form-grid {
      display: grid;
      gap: 14px;
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
      outline: none;
      padding: 10px 12px;
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
      margin-top: 8px;
    }

    @media (max-width: 680px) {
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

  readonly roles = signal<RolListItem[]>([]);
  readonly saving = signal(false);
  protected initialsEdited = !!this.data.usuario?.iniciales;

  readonly form = this.fb.nonNullable.group({
    nombres: [this.data.usuario?.nombres ?? '', Validators.required],
    apellidos: [this.data.usuario?.apellidos ?? '', Validators.required],
    correo: [this.data.usuario?.correo ?? '', [Validators.required, Validators.email]],
    telefono: [this.data.usuario?.telefono ?? ''],
    iniciales: [this.data.usuario?.iniciales ?? '', [Validators.maxLength(2)]],
    puesto: [this.data.usuario?.puesto ?? '', Validators.required],
    rolId: [this.data.usuario?.rolId ?? '', Validators.required],
    password: ['']
  });

  constructor() {
    this.service.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.snackBar.open('No se pudieron cargar los roles.', 'Cerrar', { duration: 3500 })
    });

    this.form.controls.nombres.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInitials());

    this.form.controls.apellidos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInitials());
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
      puesto: value.puesto.trim(),
      rolId: value.rolId
    };

    const operation: Observable<unknown> =
      this.data.mode === 'create'
        ? this.service.createUsuario({ ...request, password: value.password })
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

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? 'No se pudo guardar el usuario.';
    }
    return 'No se pudo guardar el usuario.';
  }
}
