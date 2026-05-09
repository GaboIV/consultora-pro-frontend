import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface CambiarPasswordData {
  userId: string;
  nombre: string;
}

@Component({
  selector: 'cp-cambiar-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule],
  template: `
    <section class="dialog-surface">
      <header class="dialog-header">
        <h2>Cambiar contraseña</h2>
        <p>{{ data.nombre }}</p>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" class="form-stack">
        <label class="form-field">
          <span>Nueva contraseña</span>
          <input formControlName="password" type="password" autocomplete="new-password" />
        </label>

        <label class="form-field">
          <span>Confirmar contraseña</span>
          <input formControlName="confirmar" type="password" autocomplete="new-password" />
        </label>

        @if (form.hasError('mismatch')) {
          <small>Las contraseñas no coinciden.</small>
        }

        <footer class="dialog-actions">
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
      min-width: min(420px, 92vw);
      padding: 24px;
    }

    h2 {
      font-family: var(--font-head);
      font-size: 18px;
      letter-spacing: 0;
      margin: 0 0 4px;
    }

    p {
      color: var(--text-2);
      margin: 0 0 18px;
    }

    .form-stack {
      display: grid;
      gap: 14px;
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CambiarPasswordComponent {
  protected readonly data = inject<CambiarPasswordData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<CambiarPasswordComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', Validators.required]
    },
    { validators: [samePasswordValidator] }
  );

  protected save(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.service.updateUsuarioPassword(this.data.userId, { password: this.form.controls.password.value }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        const message = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.snackBar.open(message ?? 'No se pudo cambiar la contraseña.', 'Cerrar', { duration: 4200 });
      }
    });
  }
}

function samePasswordValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmar = control.get('confirmar')?.value;
  return password && confirmar && password !== confirmar ? { mismatch: true } : null;
}
