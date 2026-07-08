import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { GlobalSearchComponent } from '../../shared/components/global-search/global-search.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { AlertasDropdownComponent } from './alertas-dropdown/alertas-dropdown.component';
import { AppInfoPanelComponent } from './app-info-panel/app-info-panel.component';
import { NotificacionesDropdownComponent } from './notificaciones-dropdown/notificaciones-dropdown.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  permission?: string;
}

@Component({
  selector: 'cp-shell',
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    GlobalSearchComponent,
    HasPermissionDirective,
    AlertasDropdownComponent,
    AppInfoPanelComponent,
    NotificacionesDropdownComponent
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  constructor(protected readonly auth: AuthService) {}

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'layout-dashboard'
    },
    {
      label: 'Clientes',
      path: '/clientes',
      icon: 'folder-kanban',
      permission: 'clientes.ver'
    },
    {
      label: 'Proyectos',
      path: '/proyectos',
      icon: 'git-branch',
      permission: 'proyectos.ver'
    },
    {
      label: 'Mis Tableros',
      path: '/mis-tableros',
      icon: 'layout-dashboard',
      permission: 'kanban.ver'
    },
    {
      label: 'Credenciales',
      path: '/credenciales',
      icon: 'key-round',
      permission: 'credenciales.ver'
    },
    {
      label: 'Ambientes',
      path: '/ambientes',
      icon: 'server',
      permission: 'ambientes.ver'
    },
    {
      label: 'Repositorios',
      path: '/repositorios',
      icon: 'git-branch',
      permission: 'repositorios.ver'
    },
    {
      label: 'Despliegues',
      path: '/despliegues',
      icon: 'rocket',
      permission: 'despliegues.ver'
    },
    {
      label: 'Usuarios',
      path: '/equipo/usuarios',
      icon: 'user-plus',
      permission: 'usuarios.ver'
    },
    {
      label: 'Roles',
      path: '/equipo/roles',
      icon: 'shield-check',
      permission: 'roles.ver'
    },
    {
      label: 'Tipos de solución',
      path: '/tipos-solucion',
      icon: 'tag',
      permission: 'tipos-solucion.ver'
    }
  ].filter((item) => environment.showDeployments || item.path !== '/despliegues');

  logout(): void {
    this.auth.logout();
  }
}
