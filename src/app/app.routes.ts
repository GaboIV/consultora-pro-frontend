import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Dashboard ejecutivo | ConsultoraPro'
  },
  {
    path: 'clientes-proyectos',
    loadComponent: () =>
      import('./features/clients-projects/clients-projects.page').then(
        (m) => m.ClientsProjectsPage
      ),
    title: 'Clientes y proyectos | ConsultoraPro'
  },
  {
    path: 'infraestructura',
    loadComponent: () =>
      import('./features/technical-infrastructure/technical-infrastructure.page').then(
        (m) => m.TechnicalInfrastructurePage
      ),
    title: 'Infraestructura técnica | ConsultoraPro'
  },
  {
    path: 'equipo-permisos',
    loadComponent: () =>
      import('./features/team-permissions/team-permissions.page').then(
        (m) => m.TeamPermissionsPage
      ),
    title: 'Equipo y permisos | ConsultoraPro'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
