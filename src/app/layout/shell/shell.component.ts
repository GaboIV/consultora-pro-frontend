import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'cp-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard ejecutivo',
      path: '/dashboard',
      icon: 'layout-dashboard'
    },
    {
      label: 'Clientes y proyectos',
      path: '/clientes-proyectos',
      icon: 'folder-kanban'
    },
    {
      label: 'Infraestructura técnica',
      path: '/infraestructura',
      icon: 'server'
    },
    {
      label: 'Equipo y permisos',
      path: '/equipo-permisos',
      icon: 'users-round'
    }
  ];
}
