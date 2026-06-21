import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/**
 * Recibe el redirect del backend tras el OAuth de Google. El JWT viaja en el fragment
 * (#token=...&expiresAt=...) para que no quede en logs de servidor. Lo persiste y entra
 * al dashboard; si falta, vuelve al login con error.
 */
@Component({
  selector: 'cp-google-callback',
  standalone: true,
  template: `
    <main class="callback-page">
      <p>Iniciando sesión…</p>
    </main>
  `,
  styles: [`
    .callback-page {
      align-items: center;
      background: var(--bg);
      color: var(--text-2);
      display: grid;
      min-height: 100vh;
      place-items: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const fragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(fragment);
    const token = params.get('token');

    if (!token) {
      void this.router.navigate(['/login'], { queryParams: { error: 'google_failed' } });
      return;
    }

    this.auth.storeToken(token);
    void this.router.navigate(['/dashboard']);
  }
}
