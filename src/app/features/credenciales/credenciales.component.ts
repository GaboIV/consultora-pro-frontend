import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cp-credenciales',
  standalone: true,
  template: `
    <section class="page">
      <header class="page-header">
        <h1 class="page-title">Credenciales</h1>
        <p class="page-subtitle">Acceso protegido por permiso granular</p>
      </header>

      <div class="panel">
        <p class="item-meta">El módulo queda listo para integrarse con el catálogo de credenciales.</p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialesComponent {}
