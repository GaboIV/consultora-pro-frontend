import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'cp-sin-acceso',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <main class="access-page">
      <section class="access-panel">
        <i-lucide name="shield-check" [size]="34" [strokeWidth]="1.8" />
        <h1>No tienes permisos para acceder a esta sección</h1>
        <a class="btn btn-primary" routerLink="/dashboard">Volver al dashboard</a>
      </section>
    </main>
  `,
  styles: [`
    .access-page {
      align-items: center;
      background: var(--bg);
      display: grid;
      min-height: 100vh;
      padding: 24px;
      place-items: center;
    }

    .access-panel {
      align-items: center;
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      display: grid;
      gap: 18px;
      justify-items: center;
      max-width: 460px;
      padding: 34px;
      text-align: center;
    }

    i-lucide {
      color: var(--accent);
    }

    h1 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 22px;
      letter-spacing: 0;
      line-height: 1.3;
      margin: 0;
    }

    a {
      text-decoration: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SinAccesoComponent {}
