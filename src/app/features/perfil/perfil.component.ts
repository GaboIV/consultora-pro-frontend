import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';

@Component({
  selector: 'cp-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    MatSnackBarModule
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly savingPerfil = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly perfilForm = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(20)]],
    iniciales: ['', [Validators.maxLength(4)]]
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      passwordActual: ['', [Validators.required]],
      passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required]]
    },
    { validators: [samePasswordValidator] }
  );

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) {
          this.perfilForm.patchValue({
            nombres: user.nombres,
            apellidos: user.apellidos,
            telefono: user.telefono || '',
            iniciales: user.iniciales
          });
        }
      });
  }

  protected submitPerfil(): void {
    if (this.perfilForm.invalid || this.savingPerfil()) return;

    this.savingPerfil.set(true);
    this.auth.updatePerfil(this.perfilForm.getRawValue()).subscribe({
      next: () => {
        this.savingPerfil.set(false);
        this.snackBar.open('Perfil actualizado con éxito.', 'Cerrar', { duration: 3000 });
      },
      error: (error: unknown) => {
        this.savingPerfil.set(false);
        this.snackBar.open(apiErrorMessage(error, 'Error al actualizar el perfil.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected submitPassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) return;

    this.savingPassword.set(true);
    const { passwordActual, passwordNueva } = this.passwordForm.getRawValue();

    this.auth.cambiarPassword({ passwordActual, passwordNueva }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.snackBar.open('Contraseña cambiada con éxito.', 'Cerrar', { duration: 3000 });
      },
      error: (error: unknown) => {
        this.savingPassword.set(false);
        this.snackBar.open(apiErrorMessage(error, 'Error al cambiar la contraseña.'), 'Cerrar', { duration: 4200 });
      }
    });
  }
}

function samePasswordValidator(control: AbstractControl): ValidationErrors | null {
  const passwordNueva = control.get('passwordNueva')?.value;
  const confirmar = control.get('confirmar')?.value;
  return passwordNueva && confirmar && passwordNueva !== confirmar ? { mismatch: true } : null;
}
