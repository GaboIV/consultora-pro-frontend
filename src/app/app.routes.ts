import { Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { PermissionGuard } from './core/guards/permission.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Login | ConsultoraPro'
  },
  {
    path: 'sin-acceso',
    loadComponent: () => import('./features/auth/sin-acceso.component').then((m) => m.SinAccesoComponent),
    title: 'Sin acceso | ConsultoraPro'
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        title: 'Dashboard ejecutivo | ConsultoraPro'
      },
      {
        path: 'clientes',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'clientes.ver' },
        loadComponent: () =>
          import('./features/clients-projects/clients-projects.page').then(
            (m) => m.ClientsProjectsPage
          ),
        title: 'Clientes | ConsultoraPro'
      },
      {
        path: 'proyectos',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'proyectos.ver' },
        loadComponent: () =>
          import('./features/clients-projects/clients-projects.page').then(
            (m) => m.ClientsProjectsPage
          ),
        title: 'Proyectos | ConsultoraPro'
      },
      {
        path: 'credenciales',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'credenciales.ver' },
        loadComponent: () =>
          import('./features/credenciales/credenciales.component').then((m) => m.CredencialesComponent),
        title: 'Credenciales | ConsultoraPro'
      },
      {
        path: 'ambientes',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'ambientes.ver' },
        loadComponent: () =>
          import('./features/ambientes/ambientes.page').then((m) => m.AmbientesPage),
        title: 'Ambientes | ConsultoraPro'
      },
      {
        path: 'repositorios',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'proyectos.ver' },
        loadComponent: () =>
          import('./features/repositorios/repositorios.page').then((m) => m.RepositoriosPage),
        title: 'Repositorios | ConsultoraPro'
      },
      {
        path: 'despliegues',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'despliegues.ver' },
        loadComponent: () =>
          import('./features/despliegues/despliegues.page').then((m) => m.DesplieguesPage),
        title: 'Despliegues | ConsultoraPro'
      },
      {
        path: 'equipo/usuarios',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'roles.ver' },
        loadComponent: () =>
          import('./features/equipo/usuarios/usuarios-list.component').then(
            (m) => m.UsuariosListComponent
          ),
        title: 'Usuarios | ConsultoraPro'
      },
      {
        path: 'equipo/roles',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'roles.ver' },
        loadComponent: () =>
          import('./features/equipo/roles/roles-list.component').then((m) => m.RolesListComponent),
        title: 'Roles | ConsultoraPro'
      },
      {
        path: 'clientes-proyectos',
        redirectTo: 'clientes'
      },
      {
        path: 'infraestructura',
        redirectTo: 'ambientes'
      },
      {
        path: 'equipo-permisos',
        redirectTo: 'equipo/usuarios'
      },
      {
        path: 'equipo',
        redirectTo: 'equipo/usuarios'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
