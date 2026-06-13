import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'cp-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="login-logo" aria-label="ConsultoraPro">Consultora<span>Pro</span></div>
        <h1>Acceso interno</h1>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="form-field">
            <span>Email</span>
            <input formControlName="email" type="email" autocomplete="email" />
          </label>

          <label class="form-field">
            <span>Password</span>
            <div class="password-field">
              <input
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
              />
              <button type="button" class="icon-inline" (click)="showPassword.set(!showPassword())" aria-label="Mostrar u ocultar password">
                <i-lucide [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" [strokeWidth]="2" />
              </button>
            </div>
          </label>

          @if (error()) {
            <p class="login-error">{{ error() }}</p>
          }

          <button class="btn btn-primary login-button" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </section>
    </main>
  `,
  styles: [`
    .login-page {
      align-items: center;
      background:
        linear-gradient(135deg, rgba(79, 142, 247, 0.12), transparent 34%),
        radial-gradient(circle at 80% 20%, rgba(62, 207, 142, 0.12), transparent 32%),
        var(--bg);
      display: grid;
      min-height: 100vh;
      padding: 24px;
      place-items: center;
    }

    .login-panel {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
      padding: 34px;
      width: min(420px, 100%);
    }

    .login-logo {
      color: var(--text);
      display: inline-flex;
      font-family: var(--font-head);
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0;
      margin-bottom: 22px;
    }

    .login-logo span {
      color: var(--accent);
    }

    h1 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 24px;
      letter-spacing: 0;
      line-height: 1.2;
      margin: 0 0 24px;
    }

    .form-field {
      display: grid;
      gap: 7px;
      margin-bottom: 16px;
    }

    .form-field span {
      color: var(--text-2);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    input {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      outline: none;
      padding: 11px 12px;
      width: 100%;
    }

    input:focus {
      border-color: var(--accent);
    }

    .password-field {
      align-items: center;
      display: grid;
      grid-template-columns: 1fr 42px;
    }

    .password-field input {
      border-radius: var(--radius) 0 0 var(--radius);
    }

    .icon-inline {
      align-items: center;
      align-self: stretch;
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-left: 0;
      border-radius: 0 var(--radius) var(--radius) 0;
      color: var(--text-2);
      display: inline-flex;
      justify-content: center;
    }

    .login-error {
      color: var(--red);
      font-size: 13px;
      margin: 0 0 14px;
    }

    .login-button {
      justify-content: center;
      min-height: 42px;
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: () => {
        this.loading.set(false);
        this.error.set('Credenciales incorrectas.');
      }
    });
  }
}
