import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

@Component({
  selector: 'cp-equipo',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, HasPermissionDirective],
  template: `
    <section class="page">
      <header class="page-header">
        <h1 class="page-title">Equipo</h1>
        <p class="page-subtitle">Administración operativa de usuarios, roles y permisos</p>
      </header>

      <div class="quick-grid">
        <a class="quick-card" routerLink="/equipo/usuarios" *appHasPermission="'usuarios.ver'">
          <i-lucide name="users-round" [size]="24" [strokeWidth]="1.8" />
          <div>
            <h2>Usuarios</h2>
            <p>Altas, edición, cambio de contraseña y estado de acceso.</p>
          </div>
        </a>

        <a class="quick-card" routerLink="/equipo/roles" *appHasPermission="'roles.ver'">
          <i-lucide name="shield-check" [size]="24" [strokeWidth]="1.8" />
          <div>
            <h2>Roles y permisos</h2>
            <p>Catálogo de permisos por módulo y asignación por rol.</p>
          </div>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .quick-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .quick-card {
      align-items: flex-start;
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      color: var(--text);
      display: flex;
      gap: 14px;
      padding: 18px;
      text-decoration: none;
      transition: border-color 0.18s ease, transform 0.18s ease;
    }

    .quick-card:hover {
      border-color: rgba(79, 142, 247, 0.45);
      transform: translateY(-1px);
    }

    i-lucide {
      color: var(--accent);
      margin-top: 2px;
    }

    h2 {
      font-family: var(--font-head);
      font-size: 16px;
      letter-spacing: 0;
      margin: 0 0 4px;
    }

    p {
      color: var(--text-2);
      margin: 0;
    }

    @media (max-width: 760px) {
      .quick-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquipoComponent {}
