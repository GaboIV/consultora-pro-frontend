import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'cp-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  template: `
    <main class="login-page">
      <section class="login-panel" [class.is-loading]="!configReady()">
        @if (!configReady()) {
          <div class="login-loading" role="status" aria-live="polite">
            <span class="login-spinner" aria-hidden="true"></span>
            <span>Cargando acceso…</span>
          </div>
        } @else {
        <div class="login-logo" aria-label="ConsultoraPro">Consultora<span>Pro</span></div>
        <h1>Acceso interno</h1>

        @if (error()) {
          <p class="login-error">{{ error() }}</p>
        }

        @if (credentialsEnabled()) {
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

            <button class="btn btn-primary login-button" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>
        }

        @if (credentialsEnabled() && googleEnabled()) {
          <div class="login-divider"><span>o</span></div>
        }

        @if (googleEnabled()) {
          <button type="button" class="btn-google" (click)="loginWithGoogle()" [disabled]="loading()">
            <svg class="google-icon" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Continuar con Google
          </button>
        }

        @if (configReady() && !credentialsEnabled() && !googleEnabled()) {
          <p class="login-error">No hay métodos de acceso habilitados. Contacta a un administrador.</p>
        }
        }
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

    .login-panel.is-loading {
      align-items: center;
      display: grid;
      min-height: 240px;
      place-items: center;
    }

    .login-loading {
      align-items: center;
      color: var(--text-2);
      display: grid;
      font-size: 14px;
      gap: 16px;
      justify-items: center;
    }

    .login-spinner {
      animation: login-spin 0.7s linear infinite;
      border: 3px solid var(--border-strong);
      border-radius: 50%;
      border-top-color: var(--accent);
      height: 34px;
      width: 34px;
    }

    @keyframes login-spin {
      to { transform: rotate(360deg); }
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

    .login-divider {
      align-items: center;
      color: var(--text-3);
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr auto 1fr;
      margin: 18px 0;
    }

    .login-divider::before,
    .login-divider::after {
      background: var(--border-strong);
      content: '';
      height: 1px;
    }

    .login-divider span {
      font-size: 12px;
      text-transform: uppercase;
    }

    .btn-google {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      cursor: pointer;
      display: flex;
      font-size: 14px;
      font-weight: 600;
      gap: 10px;
      justify-content: center;
      min-height: 42px;
      transition: border-color 0.15s, background 0.15s;
      width: 100%;
    }

    .btn-google:hover:not(:disabled) {
      background: var(--bg-4);
      border-color: var(--accent);
    }

    .btn-google:disabled {
      cursor: default;
      opacity: 0.6;
    }

    .google-icon {
      height: 18px;
      width: 18px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly credentialsEnabled = signal(true);
  readonly googleEnabled = signal(false);
  readonly configReady = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  ngOnInit(): void {
    const errorCode = this.route.snapshot.queryParamMap.get('error');
    if (errorCode) {
      this.error.set(this.mapError(errorCode));
    }

    // Acceso break-glass: aunque el modo sea "solo Google", /login?credentials=1 revela el
    // formulario de contraseña. El backend solo lo acepta para los emails break-glass.
    const forceCredentials = this.route.snapshot.queryParamMap.get('credentials') === '1';

    this.auth.getAuthConfig().subscribe({
      next: (config) => {
        this.credentialsEnabled.set(config.credentialsEnabled || forceCredentials);
        this.googleEnabled.set(config.googleEnabled);
        this.configReady.set(true);
      },
      // Si /auth/config falla, conservamos el formulario de credenciales como fallback seguro.
      error: () => this.configReady.set(true)
    });
  }

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

  loginWithGoogle(): void {
    this.loading.set(true);
    this.auth.loginWithGoogleRedirect();
  }

  private mapError(code: string): string {
    switch (code) {
      case 'domain_not_allowed':
        return 'Tu dominio de correo no está autorizado para acceder.';
      case 'google_failed':
        return 'No se pudo completar el acceso con Google. Inténtalo de nuevo.';
      default:
        return 'No se pudo iniciar sesión.';
    }
  }
}
