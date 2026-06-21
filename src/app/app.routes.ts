import { Routes } from '@angular/router';

import { environment } from '../environments/environment';
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
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/google-callback.component').then((m) => m.GoogleCallbackComponent),
    title: 'Iniciando sesión | ConsultoraPro'
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
        path: 'perfil',
        canActivate: [AuthGuard],
        loadComponent: () =>
          import('./features/perfil/perfil.component').then((m) => m.PerfilComponent),
        title: 'Mi Perfil | ConsultoraPro'
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
        path: 'clientes/:id',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'clientes.ver' },
        loadComponent: () =>
          import('./features/client-detail/client-detail.page').then(
            (m) => m.ClientDetailPage
          ),
        title: 'Detalle del Cliente | ConsultoraPro'
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
        path: 'proyectos/:id',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'proyectos.ver' },
        loadComponent: () =>
          import('./features/project-detail/project-detail.page').then(
            (m) => m.ProjectDetailPage
          ),
        title: 'Detalle del Proyecto | ConsultoraPro'
      },
      {
        path: 'proyectos/:proyectoId/tableros/:tableroId',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'kanban.ver' },
        loadComponent: () =>
          import('./features/kanban/board.page').then((m) => m.BoardPage),
        title: 'Tablero | ConsultoraPro'
      },
      {
        path: 'mis-tableros',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'kanban.ver' },
        loadComponent: () =>
          import('./features/mis-tableros/mis-tableros.page').then((m) => m.MisTablerosPage),
        title: 'Mis Tableros | ConsultoraPro'
      },
      {
        path: 'mis-tableros/:tableroId',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'kanban.ver' },
        loadComponent: () =>
          import('./features/kanban/board.page').then((m) => m.BoardPage),
        title: 'Tablero | ConsultoraPro'
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
        path: 'ambientes/:id',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'ambientes.ver' },
        loadComponent: () =>
          import('./features/ambiente-detail/ambiente-detail.page').then((m) => m.AmbienteDetailPage),
        title: 'Detalle del Ambiente | ConsultoraPro'
      },
      {
        path: 'repositorios',
        canActivate: [AuthGuard, PermissionGuard],
        data: { permiso: 'proyectos.ver' },
        loadComponent: () =>
          import('./features/repositorios/repositorios.page').then((m) => m.RepositoriosPage),
        title: 'Repositorios | ConsultoraPro'
      },
      // El módulo de Despliegues se gobierna con environment.showDeployments.
      // Cuando está oculto, /despliegues redirige al dashboard.
      environment.showDeployments
        ? {
            path: 'despliegues',
            canActivate: [AuthGuard, PermissionGuard],
            data: { permiso: 'despliegues.ver' },
            loadComponent: () =>
              import('./features/despliegues/despliegues.page').then((m) => m.DesplieguesPage),
            title: 'Despliegues | ConsultoraPro'
          }
        : { path: 'despliegues', redirectTo: 'dashboard' },
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
