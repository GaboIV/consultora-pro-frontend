import { ManagementSnapshot } from '../models/management.models';

export const EMPTY_MANAGEMENT_SNAPSHOT: ManagementSnapshot = {
  generatedAt: '',
  periodLabel: '',
  executive: {
    metrics: [],
    alerts: [],
    spotlightProjects: [],
    gantt: [],
    milestones: []
  },
  clients: [],
  projects: [],
  tiposSolucion: [],
  infrastructure: {
    environmentGroups: [],
    deployments: [],
    repositories: [],
    credentials: []
  },
  team: {
    members: [],
    roles: [],
    previews: []
  }
};

export const MOCK_MANAGEMENT_SNAPSHOT: ManagementSnapshot = {
  generatedAt: '2026-05-06T21:19:00-05:00',
  periodLabel: 'Mayo 2026',
  executive: {
    metrics: [
      {
        label: 'Clientes activos',
        value: '5',
        detail: '+1 incorporado este mes',
        tone: 'blue',
        detailTone: 'up'
      },
      {
        label: 'Proyectos en curso',
        value: '12',
        detail: '3 próximos a vencer',
        tone: 'green',
        detailTone: 'warn'
      },
      {
        label: 'Ambientes activos',
        value: '34',
        detail: '28 online · 4 con alerta · 2 offline',
        tone: 'amber'
      },
      {
        label: 'Despliegues (mes)',
        value: '48',
        detail: '97% tasa de éxito',
        tone: 'purple',
        detailTone: 'up'
      }
    ],
    alerts: [
      {
        tone: 'warn',
        text: '3 credenciales vencen en menos de 7 días — Acción requerida por el equipo técnico'
      },
      {
        tone: 'info',
        text: 'Repsol · ERP Upstream — Fase 2 inicia el 15 mayo · 10 días restantes para hito'
      }
    ],
    spotlightProjects: [
      {
        id: 'erp-upstream',
        name: 'ERP Upstream',
        clientName: 'Repsol',
        tipoSolucionId: 'portal-proveedores',
        tipoSolucionNombre: 'Portal de Proveedores',
        stage: 'Desarrollo',
        stageTone: 'blue',
        lead: {
          initials: 'RC',
          name: 'R. Castillo',
          tone: 'blue'
        },
        progress: 62,
        progressTone: 'blue',
        startDate: '01 ene 2026',
        endDate: '30 jun 2026',
        status: 'En curso',
        statusTone: 'amber',
        teamSize: 8
      },
      {
        id: 'portal-cliente',
        name: 'Portal Cliente',
        clientName: 'Telefónica',
        tipoSolucionId: 'fact-electronica',
        tipoSolucionNombre: 'Facturación Electrónica',
        stage: 'Análisis',
        stageTone: 'purple',
        lead: {
          initials: 'MV',
          name: 'M. Vega',
          tone: 'green'
        },
        progress: 18,
        progressTone: 'amber',
        startDate: '15 mar 2026',
        endDate: '15 ago 2026',
        status: 'Planificación',
        statusTone: 'blue',
        teamSize: 5
      },
      {
        id: 'data-warehouse',
        name: 'Data Warehouse',
        clientName: 'Inditex',
        tipoSolucionId: 'guias-remision',
        tipoSolucionNombre: 'Guías de Remisión',
        stage: 'QA',
        stageTone: 'amber',
        lead: {
          initials: 'LR',
          name: 'L. Ríos',
          tone: 'amber'
        },
        progress: 78,
        progressTone: 'green',
        startDate: '01 dic 2025',
        endDate: '12 may 2026',
        status: 'Por vencer',
        statusTone: 'red',
        teamSize: 4
      }
    ],
    gantt: [
      { label: 'Análisis', caption: 'Análisis', start: 0, width: 26, tone: 'blue' },
      { label: 'Diseño', caption: 'Diseño', start: 18, width: 20, tone: 'purple' },
      { label: 'Backend', caption: 'Backend .NET', start: 30, width: 42, tone: 'blue' },
      { label: 'Frontend', caption: 'Angular 21', start: 34, width: 38, tone: 'purple' },
      { label: 'QA', caption: 'QA', start: 62, width: 22, tone: 'green' },
      { label: 'Go live', caption: 'Go live', start: 82, width: 12, tone: 'amber' }
    ],
    milestones: [
      { tone: 'info', text: 'Kickoff Portal Cliente · 15 mayo · María Vega' },
      { tone: 'warn', text: 'Inditex Data Warehouse · cierre QA · 12 mayo' },
      { tone: 'info', text: 'BBVA App Móvil B2B · entrega final · 01 abril' }
    ]
  },
  tiposSolucion: [
    { id: 'portal-proveedores', nombre: 'Portal de Proveedores' },
    { id: 'fact-electronica', nombre: 'Facturación Electrónica' },
    { id: 'host2host', nombre: 'Host2Host' },
    { id: 'guias-remision', nombre: 'Guías de Remisión' }
  ],
  clients: [
    {
      id: 'repsol',
      name: 'Repsol',
      initials: 'RE',
      projectsCount: 3,
      sector: 'Energía & Oil',
      status: 'Activo',
      statusTone: 'amber',
      logoTone: 'blue'
    },
    {
      id: 'telefonica',
      name: 'Telefónica',
      initials: 'TF',
      projectsCount: 2,
      sector: 'Telecomunicaciones',
      status: 'Activo',
      statusTone: 'blue',
      logoTone: 'purple'
    },
    {
      id: 'bbva',
      name: 'BBVA',
      initials: 'BB',
      projectsCount: 2,
      sector: 'Banca',
      status: 'Completado',
      statusTone: 'green',
      logoTone: 'teal'
    },
    {
      id: 'inditex',
      name: 'Inditex',
      initials: 'IN',
      projectsCount: 1,
      sector: 'Retail',
      status: 'Activo',
      statusTone: 'amber',
      logoTone: 'amber'
    },
    {
      id: 'santander',
      name: 'Santander',
      initials: 'SC',
      projectsCount: 1,
      sector: 'Banca',
      status: 'Inactivo',
      statusTone: 'gray',
      logoTone: 'red'
    }
  ],
  projects: [
    {
      id: 'erp-upstream',
      name: 'ERP Upstream',
      clientName: 'Repsol',
      tipoSolucionId: 'portal-proveedores',
      tipoSolucionNombre: 'Portal de Proveedores',
      stage: 'Desarrollo',
      stageTone: 'blue',
      lead: { initials: 'RC', name: 'R. Castillo', tone: 'blue' },
      progress: 62,
      progressTone: 'blue',
      startDate: '01 ene 2026',
      endDate: '30 jun 2026',
      status: 'En curso',
      statusTone: 'amber',
      teamSize: 8
    },
    {
      id: 'portal-cliente',
      name: 'Portal Cliente',
      clientName: 'Telefónica',
      tipoSolucionId: 'fact-electronica',
      tipoSolucionNombre: 'Facturación Electrónica',
      stage: 'Análisis',
      stageTone: 'purple',
      lead: { initials: 'MV', name: 'M. Vega', tone: 'green' },
      progress: 18,
      progressTone: 'amber',
      startDate: '15 mar 2026',
      endDate: '15 ago 2026',
      status: 'Planificación',
      statusTone: 'blue',
      teamSize: 5
    },
    {
      id: 'app-movil-b2b',
      name: 'App Móvil B2B',
      clientName: 'BBVA',
      tipoSolucionId: 'host2host',
      tipoSolucionNombre: 'Host2Host',
      stage: 'Entregado',
      stageTone: 'teal',
      lead: { initials: 'AP', name: 'A. Paredes', tone: 'purple' },
      progress: 100,
      progressTone: 'green',
      startDate: '01 oct 2025',
      endDate: '01 abr 2026',
      status: 'Completado',
      statusTone: 'green',
      teamSize: 6
    },
    {
      id: 'data-warehouse',
      name: 'Data Warehouse',
      clientName: 'Inditex',
      tipoSolucionId: 'guias-remision',
      tipoSolucionNombre: 'Guías de Remisión',
      stage: 'QA',
      stageTone: 'amber',
      lead: { initials: 'LR', name: 'L. Ríos', tone: 'amber' },
      progress: 78,
      progressTone: 'green',
      startDate: '01 dic 2025',
      endDate: '12 may 2026',
      status: 'Por vencer',
      statusTone: 'red',
      teamSize: 4
    }
  ],
  infrastructure: {
    environmentGroups: [
      {
        projectName: 'Repsol · ERP Upstream',
        items: [
          {
            name: 'Producción',
            url: 'api.repsol-erp.com',
            stack: '.NET 8 · IIS · Azure',
            state: 'Online',
            stateTone: 'green',
            availability: '99.8%'
          },
          {
            name: 'Staging',
            url: 'staging.repsol-erp.com',
            stack: '.NET 8 · IIS',
            state: 'Alerta',
            stateTone: 'amber',
            availability: '94.1%'
          },
          {
            name: 'Desarrollo',
            url: 'dev.repsol-erp.internal',
            stack: 'Docker',
            state: 'Offline',
            stateTone: 'gray'
          }
        ]
      },
      {
        projectName: 'Telefónica · Portal Cliente',
        items: [
          {
            name: 'Staging',
            url: 'staging.tf-portal.com',
            stack: 'Angular + Node',
            state: 'Config.',
            stateTone: 'amber'
          },
          {
            name: 'Desarrollo',
            url: 'dev.tf-portal.internal',
            stack: 'Docker Compose',
            state: 'Offline',
            stateTone: 'gray'
          }
        ]
      }
    ],
    deployments: [
      {
        projectName: 'ERP Upstream',
        target: 'Producción',
        when: 'Hoy 09:14',
        actor: 'R. Castillo',
        duration: '4m 12s',
        version: 'v2.4.1',
        status: 'Exitoso',
        tone: 'green'
      },
      {
        projectName: 'Portal Cliente',
        target: 'Staging',
        when: 'Ayer 17:30',
        actor: 'M. Vega',
        duration: '1m 08s',
        version: 'v0.9.3',
        status: 'Fallido',
        tone: 'red'
      },
      {
        projectName: 'ERP Upstream',
        target: 'Staging',
        when: 'Ayer 15:00',
        actor: 'R. Castillo',
        duration: '3m 45s',
        version: 'v2.4.1',
        status: 'Exitoso',
        tone: 'green'
      },
      {
        projectName: 'Data Warehouse',
        target: 'Producción',
        when: '02 may',
        actor: 'L. Ríos',
        duration: '6m 20s',
        version: 'v1.1.0',
        status: 'Exitoso',
        tone: 'green'
      }
    ],
    repositories: [
      {
        name: 'repsol-erp-backend',
        provider: 'GitHub',
        branch: 'main',
        stack: '.NET 8',
        status: 'Passing',
        tone: 'green'
      },
      {
        name: 'repsol-erp-frontend',
        provider: 'GitHub',
        branch: 'main',
        stack: 'Angular 21',
        status: 'Passing',
        tone: 'green'
      },
      {
        name: 'tf-portal-api',
        provider: 'GitLab',
        branch: 'develop',
        stack: 'Node.js',
        status: 'Failed',
        tone: 'red'
      }
    ],
    credentials: [
      {
        service: 'db-prod-repsol',
        environment: 'Producción',
        environmentTone: 'red',
        kind: 'SQL Server',
        expiresIn: '3 días',
        tone: 'red'
      },
      {
        service: 'ssh-staging-repsol',
        environment: 'Staging',
        environmentTone: 'amber',
        kind: 'SSH Key',
        expiresIn: '5 días',
        tone: 'red'
      },
      {
        service: 'db-dev-bbva',
        environment: 'Desarrollo',
        environmentTone: 'gray',
        kind: 'PostgreSQL',
        expiresIn: '45 días',
        tone: 'gray'
      }
    ]
  },
  team: {
    members: [
      {
        initials: 'RC',
        name: 'Rodrigo Castillo',
        title: 'Arquitecto',
        projects: 'ERP Upstream, Portal Cliente',
        role: 'Arquitecto',
        roleTone: 'blue',
        avatarTone: 'blue'
      },
      {
        initials: 'MV',
        name: 'María Vega',
        title: 'LT',
        projects: 'Portal Cliente',
        role: 'LT',
        roleTone: 'purple',
        avatarTone: 'green'
      },
      {
        initials: 'AP',
        name: 'Andrés Paredes',
        title: 'LT',
        projects: 'App Móvil B2B',
        role: 'LT',
        roleTone: 'purple',
        avatarTone: 'purple'
      },
      {
        initials: 'LR',
        name: 'Laura Ríos',
        title: 'LT',
        projects: 'Data Warehouse',
        role: 'LT',
        roleTone: 'purple',
        avatarTone: 'amber'
      },
      {
        initials: 'JM',
        name: 'Jorge Méndez',
        title: 'Dev',
        projects: 'ERP Upstream',
        role: 'Dev',
        roleTone: 'gray',
        avatarTone: 'red'
      },
      {
        initials: 'SL',
        name: 'Sofía Luna',
        title: 'Dev',
        projects: 'Portal Cliente',
        role: 'Dev',
        roleTone: 'gray',
        avatarTone: 'teal'
      }
    ],
    previews: [
      { title: 'ERP Upstream · v2.4 · Dashboard', kind: 'desktop', tone: 'blue' },
      { title: 'App Móvil B2B · v1.1 · Login', kind: 'mobile', tone: 'purple' },
      { title: 'Portal Cliente · v0.9 · Home', kind: 'desktop', tone: 'green' },
      { title: 'Subir screenshot', kind: 'upload', tone: 'gray' }
    ],
    roles: [
      {
        code: 'GG',
        name: 'Gerencia',
        description: 'Visibilidad total sin edición técnica',
        usersLabel: '1 usuario',
        tone: 'red',
        permissions: [
          { label: 'Ver todos los proyectos', granted: true },
          { label: 'Ver métricas y reportes', granted: true },
          { label: 'Ver credenciales', granted: false },
          { label: 'Modificar despliegues', granted: false }
        ]
      },
      {
        code: 'AR',
        name: 'Arquitecto',
        description: 'Control técnico completo',
        usersLabel: '1 usuario',
        tone: 'blue',
        permissions: [
          { label: 'Ver todos los proyectos', granted: true },
          { label: 'Ver y revelar credenciales', granted: true },
          { label: 'Modificar ambientes', granted: true },
          { label: 'Modificar despliegues', granted: true }
        ]
      },
      {
        code: 'LT',
        name: 'Lead Technical',
        description: 'Gestión de sus proyectos asignados',
        usersLabel: '3 usuarios',
        tone: 'purple',
        permissions: [
          { label: 'Ver sus proyectos', granted: true },
          { label: 'Ver credenciales propias', granted: true },
          { label: 'Modificar despliegues', granted: true },
          { label: 'Crear clientes', granted: false }
        ]
      },
      {
        code: 'DV',
        name: 'Developer',
        description: 'Acceso operativo limitado',
        usersLabel: '8 usuarios',
        tone: 'green',
        permissions: [
          { label: 'Ver sus proyectos', granted: true },
          { label: 'Ver repos y documentación', granted: true },
          { label: 'Ver credenciales', granted: false },
          { label: 'Modificar despliegues', granted: false }
        ]
      }
    ]
  }
};
