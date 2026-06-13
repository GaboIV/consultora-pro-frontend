import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { RolListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface RolFormData {
  mode: 'create' | 'edit';
  rol?: RolListItem;
}

@Component({
  selector: 'cp-rol-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="modal-shell">
      <header class="cp-modal__header">
        <h2 class="cp-modal__title">{{ data.mode === 'create' ? 'Nuevo rol' : 'Editar rol' }}</h2>
        <button class="cp-modal__close" type="button" (click)="dialogRef.close(false)" aria-label="Cerrar">×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" style="display:contents">
        <div class="cp-modal__body form-stack">
          <label class="form-field">
            <span>Nombre</span>
            <input formControlName="nombre" />
          </label>

          <label class="form-field">
            <span>Descripción</span>
            <textarea formControlName="descripcion" rows="3"></textarea>
          </label>

          <label class="check-row">
            <input type="checkbox" formControlName="esActivo" />
            <span>Rol activo</span>
          </label>
        </div>

        <footer class="cp-modal__footer">
          <button class="btn btn-secondary" type="button" (click)="dialogRef.close(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </footer>
      </form>
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
      min-width: min(460px, 92vw);
      overflow: hidden;
    }

    .form-stack {
      display: grid;
      gap: 14px;
    }

    .form-field {
      display: grid;
      gap: 6px;
    }

    .form-field span,
    .check-row span {
      color: var(--text-2);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    input:not([type='checkbox']),
    textarea {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      outline: none;
      padding: 10px 12px;
      resize: vertical;
      width: 100%;
    }

    input:focus,
    textarea:focus {
      border-color: var(--accent);
    }

    .check-row {
      align-items: center;
      display: flex;
      gap: 8px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolFormComponent {
  protected readonly data = inject<RolFormData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<RolFormComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.rol?.nombre ?? '', Validators.required],
    descripcion: [this.data.rol?.descripcion ?? ''],
    esActivo: [this.data.rol?.esActivo ?? true]
  });

  protected save(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    const value = this.form.getRawValue();
    const request = {
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim(),
      esActivo: value.esActivo
    };

    const operation: Observable<unknown> =
      this.data.mode === 'create'
        ? this.service.createRol({ nombre: request.nombre, descripcion: request.descripcion })
        : this.service.updateRol(this.data.rol!.id, request);

    operation.subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        const message = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.snackBar.open(message ?? 'No se pudo guardar el rol.', 'Cerrar', { duration: 4200 });
      }
    });
  }
}
