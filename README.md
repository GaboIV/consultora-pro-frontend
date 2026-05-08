# ConsultoraPro — Frontend

Portal Angular para gestión de proyectos, clientes, infraestructura técnica y permisos de una consultora de software.  
Dark mode, standalone components, signals, OnPush change detection.

---

## Stack

| Tecnología | Versión |
|---|---|
| Angular | 21.2 |
| TypeScript | 5.9 |
| Node.js | ^20.19 / ^22.13 / >=24 |
| Lucide icons | 1.0 |
| RxJS | 7.8 |
| Vitest (testing) | 4.1 |
| SCSS | Design system propio |

---

## Estructura

```
ConsultoraPro.Frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── data-access/       # ManagementRepository (abstract), ApiManagementRepository, MockManagementRepository, ManagementFacade, mock data
│   │   │   ├── icons/             # Lucide icons registrados
│   │   │   └── models/            # ManagementSnapshot, Client, Project, etc.
│   │   ├── features/
│   │   │   ├── dashboard/         # Dashboard ejecutivo con métricas, alertas, gantt, hitos
│   │   │   ├── clients-projects/  # Grid de clientes + tabla de proyectos
│   │   │   ├── technical-infrastructure/ # Ambientes, despliegues, repos, credenciales
│   │   │   └── team-permissions/  # Miembros, roles, permisos, screenshots
│   │   ├── layout/
│   │   │   └── shell/             # Navbar + router-outlet
│   │   ├── shared/components/     # Badge, MetricCard, SectionCard, StatusDot
│   │   ├── app.config.ts          # Providers globales
│   │   └── app.routes.ts          # Lazy-loaded routes
│   ├── environments/              # environment.ts + environment.prod.ts
│   ├── styles.scss                # Design system (CSS variables, dark theme, utilities)
│   ├── index.html
│   └── main.ts
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── portal-gerencia-presentacion.html  # Prototipo original HTML (referencia visual)
└── README.md
```

### Pantallas

#### 1. Dashboard ejecutivo
- Métricas: clientes activos, proyectos en curso, ambientes, despliegues
- Alertas operativas (warn / info)
- Spotlight: proyectos activos con badge de estado y barra de progreso
- Diagrama Gantt de etapas
- Próximos hitos
- Pulso operativo

#### 2. Clientes y proyectos
- Grid de tarjetas de cliente con iniciales, sector, contador de proyectos
- Tabla completa de proyectos: etapa, tech lead (con avatar), progreso, fechas, estado
- Botón para agregar cliente

#### 3. Infraestructura técnica
- Ambientes agrupados por proyecto (online / alerta / offline + disponibilidad)
- Historial de despliegues recientes
- Repositorios vinculados con estado de CI
- Vault de credenciales (ocultas, acceso por rol)

#### 4. Equipo y permisos
- Miembros del equipo con rol y proyectos asignados
- Screenshots de proyectos (desktop / mobile / upload)
- Matriz de roles y permisos (Gerencia, Arquitecto, LT, Dev)

---

## Repositorio de datos

El frontend usa un **patrón de repositorio abstracto**:

```
ManagementFacade → ManagementRepository (abstract)
                        ├── MockManagementRepository (usa datos locales)
                        └── ApiManagementRepository (llama a la API REST)
```

La selección se controla desde `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  useMockData: true,          // false para conectar API real
  apiBaseUrl: 'https://api.consultorapro.local/v1'
};
```

Cuando `useMockData` es `false`, el frontend espera un endpoint `GET /management/snapshot` que retorne el contrato `ManagementSnapshot`.

---

## Requisitos

- Node.js `^20.19.0`, `^22.13.0` o `>=24.0.0`
- npm

---

## Ejecutar

```bash
npm install
npm start
```

Abrir en `http://localhost:4200/`.

## Build

```bash
npm run build     # producción en dist/
```

## Tests

```bash
npm test          # Vitest + jsdom
```

---

## Diseño

- **100% standalone components** — sin NgModules
- **OnPush change detection** en todos los componentes
- **Signals** vía `toSignal` + `computed` en el facade
- **Design system propio** en SCSS con variables CSS
- **Responsive** — adaptativo hasta 640px
- **Dark mode** — tema oscuro nativo
- **Lucide icons** — solo los iconos usados se registran en `APP_LUCIDE_ICONS`

---

## Conexión con backend

El frontend está preparado para consumir una API REST externa.  
Los modelos (`ManagementSnapshot`, `Client`, `Project`, etc.) pueden mapearse desde los DTOs del backend.

Pasos para conectar:
1. En `src/environments/environment.ts`, cambiar `useMockData: false`
2. Ajustar `apiBaseUrl` a la URL del backend (ej: `https://localhost:7001/api`)
3. Opcional: implementar adaptador de modelos si el contrato difiere
