# ConsultoraPro - Documentacion completa del frontend

Este documento describe el alcance actual del frontend de ConsultoraPro: arquitectura Angular, rutas, pantallas, servicios, contratos, seguridad, permisos, componentes compartidos, formularios, integracion con backend y puntos pendientes.

## Vision General

El frontend es un portal interno Angular para gestionar la operacion de una consultora de software.

Cubre:

- Login.
- Sesion con JWT.
- Navegacion protegida por autenticacion.
- Navegacion protegida por permisos.
- Dashboard ejecutivo.
- Clientes.
- Proyectos.
- Ambientes.
- Credenciales.
- Usuarios.
- Roles.
- Permisos por rol.
- Formularios de creacion/edicion.
- Cambio de password de usuarios.
- Activacion/desactivacion de usuarios.
- Separacion visual de Clientes y Proyectos.
- Integracion con API REST.
- Estilos dark mode con design system propio.

## Stack Tecnico

- Angular 21.
- TypeScript 5.9.
- RxJS.
- Angular standalone components.
- Angular signals.
- Angular Material Dialog/Snackbar.
- Ng Select.
- Lucide Angular Icons.
- SCSS global.
- Fetch HttpClient.
- Vite/Vitest para pruebas.

## Estructura General

```text
frontend/
├── README.md
├── SISTEMA_FRONTEND.md
├── angular.json
├── package.json
├── portal-gerencia-presentacion.html
└── src/
    ├── app/
    │   ├── app.config.ts
    │   ├── app.routes.ts
    │   ├── core/
    │   ├── features/
    │   ├── layout/
    │   └── shared/
    ├── environments/
    ├── index.html
    ├── main.ts
    └── styles.scss
```

## Arquitectura Angular

### Standalone Components

La aplicacion usa componentes standalone. No hay NgModules de feature.

### Configuracion global

`app.config.ts` registra:

- Zone change detection con event coalescing.
- Animaciones async.
- HttpClient con `fetch`.
- Interceptor JWT.
- Lucide icons registrados selectivamente.
- Router con scroll restoration.
- Inyeccion del repositorio de management:
  - `ApiManagementRepository` si `environment.useMockData` es `false`.
  - `MockManagementRepository` si `environment.useMockData` es `true`.

### Environments

`environment.ts`:

```ts
export const environment = {
  production: false,
  useMockData: false,
  apiBaseUrl: 'https://localhost:7001/api'
};
```

`environment.prod.ts`:

```ts
export const environment = {
  production: true,
  useMockData: false,
  apiBaseUrl: 'https://localhost:7001/api'
};
```

## Rutas

### Publicas

| Ruta | Componente | Descripcion |
|---|---|---|
| `/login` | `LoginComponent` | Pantalla de acceso. |
| `/sin-acceso` | `SinAccesoComponent` | Pantalla de bloqueo por permiso. |

### Protegidas dentro del Shell

| Ruta | Guards | Permiso | Descripcion |
|---|---|---|---|
| `/dashboard` | `AuthGuard` | - | Dashboard ejecutivo. |
| `/clientes` | `AuthGuard`, `PermissionGuard` | `clientes.ver` | Vista de clientes. |
| `/proyectos` | `AuthGuard`, `PermissionGuard` | `proyectos.ver` | Vista de proyectos. |
| `/ambientes` | `AuthGuard`, `PermissionGuard` | `ambientes.ver` | Modulo de ambientes por proyecto. |
| `/credenciales` | `AuthGuard`, `PermissionGuard` | `credenciales.ver` | Modulo de credenciales. |
| `/equipo/usuarios` | `AuthGuard`, `PermissionGuard` | `roles.ver` | Administracion de usuarios. |
| `/equipo/roles` | `AuthGuard`, `PermissionGuard` | `roles.ver` | Administracion de roles y permisos. |

### Redirecciones

| Ruta | Redirige a |
|---|---|
| `/` | `/dashboard` |
| `/clientes-proyectos` | `/clientes` |
| `/infraestructura` | `/ambientes` |
| `/equipo-permisos` | `/equipo/usuarios` |
| `/equipo` | `/equipo/usuarios` |
| `**` | `/dashboard` |

## Layout Principal

`ShellComponent` renderiza:

- Logo ConsultoraPro.
- Navegacion principal.
- Avatar del usuario actual.
- Nombre y cargo/puesto del usuario.
- Boton de logout.
- `router-outlet`.

Items visibles en la navegacion:

- Dashboard.
- Clientes.
- Proyectos.
- Ambientes.
- Credenciales.
- Usuarios.
- Roles.

Cada item con permiso se oculta si el usuario no tiene ese permiso mediante `HasPermissionDirective`.

## Seguridad Frontend

### AuthService

Responsable de:

- Login.
- Logout.
- Guardar token en `localStorage`.
- Leer token.
- Decodificar payload JWT.
- Validar expiracion.
- Exponer usuario actual mediante `BehaviorSubject`.
- Verificar permisos.
- Verificar rol.
- Refrescar usuario actual via `/auth/me`.

Token storage:

```text
consultorapro_token
```

### AuthGuard

Permite entrar solo si:

- Hay token.
- El token no esta expirado.

Si no, redirige a `/login`.

### PermissionGuard

Lee `route.data.permiso`.

Si el usuario no tiene el permiso:

- Redirige a `/sin-acceso`.

### authInterceptor

Intercepta requests HTTP.

Si la URL apunta al API:

- Agrega header `Authorization: Bearer <token>`.

Manejo de errores:

- `401`: logout y redireccion a login.
- `403`: redireccion a `/sin-acceso`.

### HasPermissionDirective

Directiva estructural:

```html
*appHasPermission="'roles.editar'"
```

Muestra u oculta contenido segun permisos del usuario actual.

Se usa en:

- Navegacion.
- Botones de crear.
- Botones de editar.
- Botones de eliminar.
- Acciones administrativas.

## Pantallas Y Modulos

## Login

Archivo:

- `features/auth/login.component.ts`

Cubre:

- Formulario de email y password.
- Validacion required/email.
- Mostrar/ocultar password.
- Estado de carga.
- Mensaje de credenciales incorrectas.
- Login contra API.
- Navegacion a `/dashboard` al autenticar.

## Sin Acceso

Archivo:

- `features/auth/sin-acceso.component.ts`

Cubre:

- Pantalla para usuarios autenticados sin permiso suficiente.
- Feedback visual de acceso denegado.

## Dashboard Ejecutivo

Archivos:

- `features/dashboard/dashboard.page.ts`
- `features/dashboard/dashboard.page.html`
- `features/dashboard/dashboard.page.scss`

Cubre:

- Metricas ejecutivas.
- Alertas.
- Proyectos destacados.
- Gantt o visualizacion de avance.
- Hitos.
- Informacion consolidada desde `ManagementFacade`.

Consume:

- `ManagementSnapshot.executive`.
- `ManagementSnapshot.projects`.
- `ManagementSnapshot.clients`.
- `ManagementSnapshot.infrastructure.environmentSummary`.

## Clientes

Archivos:

- `features/clients-projects/clients-projects.page.ts`
- `features/clients-projects/clients-projects.page.html`
- `features/clients-projects/clients-projects.page.scss`
- `shared/components/client-form-dialog/client-form-dialog.component.ts`

La ruta `/clientes` usa el mismo componente que proyectos, pero renderiza solo la seccion de clientes segun URL.

Cubre:

- Listado de clientes en tarjetas.
- Iniciales del cliente.
- Color de cliente.
- Sector/industria.
- Cantidad de proyectos.
- Estado.
- Crear cliente.
- Editar cliente al hacer click.
- Desactivar/eliminar cliente.

Operaciones:

- `createClient`
- `updateClient`
- `deleteClient`
- `refresh`

Permiso de ruta:

- `clientes.ver`

Permisos esperados por accion backend:

- `clientes.crear`
- `clientes.editar`
- `clientes.eliminar`

## Proyectos

Archivos:

- `features/clients-projects/clients-projects.page.ts`
- `features/clients-projects/clients-projects.page.html`
- `features/clients-projects/clients-projects.page.scss`
- `shared/components/project-form-dialog/project-form-dialog.component.ts`

La ruta `/proyectos` usa el mismo componente que clientes, pero renderiza solo tabla y operaciones de proyectos.

Cubre:

- Tabla de proyectos.
- Cliente asociado.
- Tipo de solucion.
- Etapa.
- Desarrolladores principales.
- Desarrolladores de apoyo.
- Estado.
- Crear proyecto.
- Editar proyecto.
- Eliminar proyecto.
- Ver ambientes del proyecto mediante acceso directo a `/ambientes?proyectoId=...`.
- Crear usuario desde formulario de proyecto.

Formulario de proyecto:

- Nombre.
- Cliente.
- Tipo de solucion.
- Etapa.
- Estado.
- Desarrolladores principales.
- Desarrolladores de apoyo.

Usa `ng-select` para:

- Cliente.
- Tipo de solucion.
- Etapa.
- Estado.
- Usuarios principales.
- Usuarios de apoyo.

Reglas UI:

- No permite guardar si falta nombre, cliente, tipo de solucion o miembros.
- Evita duplicar usuarios entre principales y apoyo.
- Permite crear usuario desde el formulario.

Permiso de ruta:

- `proyectos.ver`

Permisos esperados por accion backend:

- `proyectos.crear`
- `proyectos.editar`
- `proyectos.eliminar`

## Credenciales

Archivo:

- `features/credenciales/credenciales.component.ts`

Estado actual:

- Pantalla protegida por `credenciales.ver`.
- Listado real con filtro por proyecto.
- Columna de ambiente real cuando la credencial esta asociada.
- Selector de ambiente en formulario, filtrado por el proyecto elegido.
- Creacion, edicion y eliminacion de credenciales segun permisos.
- Badge de vencimiento verde, amber o rojo.
- Revelado protegido por `credenciales.revelar` con temporizador de 30 segundos.
- Mensajes de error usando `ApiResponse.message` cuando el backend lo envia.
- Dashboard muestra el conteo real de credenciales por vencer desde el snapshot.
- Mensajes de ayuda en formulario para proyecto, ambiente y rotacion segura del valor.

Pendiente:

- Estrategia productiva de clave de cifrado en backend.

## Ambientes

Archivos:

- `features/ambientes/ambientes.page.ts`
- `features/ambientes/ambientes.page.html`
- `features/ambientes/ambientes.page.scss`
- `shared/components/ambiente-form-dialog/ambiente-form-dialog.component.ts`
- `core/services/ambientes.service.ts`
- `core/models/ambientes.models.ts`

Estado actual:

- Pantalla protegida por `ambientes.ver`.
- Listado real agrupado por proyecto.
- Indicador de estado con dot y badge: Online, Alerta, Offline, Configurando.
- Resumen global: total, online, alerta y offline.
- Filtro por proyecto y soporte de query param `proyectoId`.
- Creacion de ambiente con `ambientes.crear`.
- Edicion, cambio rapido a online y desactivacion con `ambientes.editar`.
- Formulario con `ng-select` para tipo, estado y proyecto.
- Mensajes de ayuda en los campos de nombre, tipo, estado, proyecto, URL, tecnologia y uptime.
- Dashboard consume alertas reales de ambientes en estado `Alerta`.

## Usuarios

Archivos:

- `features/equipo/usuarios/usuarios-list.component.ts`
- `features/equipo/usuarios/usuario-form.component.ts`
- `features/equipo/usuarios/cambiar-password.component.ts`

Cubre:

- Listado de usuarios.
- Nombre completo.
- Correo.
- Iniciales.
- Rol.
- Estado activo/inactivo.
- Ultimo acceso.
- Crear usuario.
- Editar usuario.
- Cambiar password.
- Activar/desactivar usuario.
- Eliminar/desactivar usuario.

Permiso de ruta:

- `roles.ver`

Permisos en botones:

- Crear usuario: `roles.crear`.
- Editar usuario: `roles.editar`.
- Cambiar password: `roles.editar`.
- Activar/desactivar: `roles.editar`.
- Eliminar: `roles.eliminar`.

### Formulario de usuario

Cubre:

- Nombres.
- Apellidos.
- Correo.
- Telefono.
- Iniciales.
- Rol.
- Password opcional en creacion.

No muestra campo `puesto`.

Notas:

- El rol se carga con `ng-select`.
- La lista de roles se precarga al abrir el modulo de usuarios.
- Si el formulario se abre sin roles precargados, tambien puede pedirlos directamente.
- Al editar, intenta seleccionar por `rolId`; si no existe, sincroniza por nombre del rol.
- El password opcional permite usar el prefijo del correo cuando se deja vacio.

### Cambiar password

Cubre:

- Modal administrativo para cambiar password de un usuario.
- Llama al endpoint `/usuarios/{id}/password`.

## Roles Y Permisos

Archivos:

- `features/equipo/roles/roles-list.component.ts`
- `features/equipo/roles/rol-form.component.ts`
- `features/equipo/roles/rol-permisos.component.ts`

Cubre:

- Listado de roles.
- Descripcion.
- Cantidad de usuarios.
- Preview de permisos concedidos.
- Detalle de permisos por modulo.
- Crear rol.
- Editar rol.
- Editar permisos del rol.
- Eliminar rol si no tiene usuarios.

Permiso de ruta:

- `roles.ver`

Permisos por accion:

- Crear: `roles.crear`.
- Editar: `roles.editar`.
- Permisos: `roles.editar`.
- Eliminar: `roles.eliminar`.

### Formulario de rol

Cubre:

- Nombre.
- Descripcion.
- Estado activo en edicion.

### Edicion de permisos

Cubre:

- Carga permisos agrupados por modulo.
- Marca/desmarca permisos.
- Guarda ids concedidos.

## Modulos Legacy/Referencia Presentes

Existen archivos de pantallas anteriores o de prototipo:

- `features/equipo/equipo.component.ts`
- `features/technical-infrastructure/*`
- `portal-gerencia-presentacion.html`

Estado actual:

- La navegacion principal ya no muestra la seccion `Equipo`.
- `/equipo` redirige a `/equipo/usuarios`.
- `/infraestructura` redirige a `/credenciales`.
- `team-permissions` y `MemberFormDialogComponent` legacy fueron eliminados.
- `technical-infrastructure` queda como referencia o base para futuras funcionalidades.

## Data Access

## ManagementFacade

Archivo:

- `core/data-access/management.facade.ts`

Responsabilidades:

- Centralizar snapshot.
- Exponer signals/computed para dashboard, clientes, proyectos, tipos de solucion y usuarios.
- Refrescar informacion.
- Delegar mutaciones al repositorio activo.

## ManagementRepository

Archivo:

- `core/data-access/management.repository.ts`

Contrato abstracto para:

- `getSnapshot`
- `createClient`
- `updateClient`
- `deleteClient`
- `createProject`
- `updateProject`
- `deleteProject`

## ApiManagementRepository

Archivo:

- `core/data-access/api-management.repository.ts`

Consume:

- `GET /management/snapshot`
- `POST /clientes`
- `PUT /clientes/{id}`
- `DELETE /clientes/{id}`
- `POST /proyectos`
- `PUT /proyectos/{id}`
- `DELETE /proyectos/{id}`

Extrae datos desde `ApiResponse<T>`.

## MockManagementRepository

Archivo:

- `core/data-access/mock-management.repository.ts`

Usa:

- `mock-management.data.ts`

Permite trabajar con datos locales cuando `environment.useMockData` es `true`.

## SecurityAdminService

Archivo:

- `core/services/security-admin.service.ts`

Consume endpoints de seguridad:

Usuarios:

- `GET /usuarios`
- `GET /usuarios/{id}`
- `POST /usuarios`
- `PUT /usuarios/{id}`
- `PUT /usuarios/{id}/password`
- `PUT /usuarios/{id}/toggle`
- `DELETE /usuarios/{id}`

Roles:

- `GET /roles`
- `GET /roles/{id}`
- `POST /roles`
- `PUT /roles/{id}`
- `PUT /roles/{id}/permisos`
- `DELETE /roles/{id}`

Permisos:

- `GET /permisos`

## AmbientesService

Archivo:

- `core/services/ambientes.service.ts`

Consume:

- `GET /ambientes`
- `GET /ambientes?proyectoId={id}`
- `GET /ambientes/proyecto/{proyectoId}`
- `POST /ambientes`
- `PUT /ambientes/{id}`
- `PUT /ambientes/{id}/estado`
- `DELETE /ambientes/{id}`

## Modelos Frontend

## Management Models

Archivo:

- `core/models/management.models.ts`

Incluye:

- `Metric`
- `AlertMessage`
- `Client`
- `TipoSolucion`
- `UsuarioSnapshot`
- `ProyectoMiembro`
- `Project`
- `GanttItem`
- `EnvironmentSummary`
- `EnvironmentItem`
- `EnvironmentGroup`
- `Deployment`
- `RepositoryHealth`
- `Credential`
- `TeamMember`
- `Permission`
- `Role`
- `ProjectPreview`
- `ExecutiveOverview`
- `InfrastructureOverview`
- `TeamOverview`
- `ManagementSnapshot`
- `CreateClientCommand`
- `UpdateClientCommand`
- `AsignarMiembroCommand`
- `CreateProjectCommand`
- `UpdateProjectCommand`

## Ambientes Models

Archivo:

- `core/models/ambientes.models.ts`

Incluye:

- `Ambiente`
- `TipoAmbiente`
- `EstadoAmbiente`
- `CreateAmbienteRequest`
- `UpdateAmbienteRequest`
- helpers de label y tono para tipo/estado

## Security Models

Archivo:

- `core/models/security.models.ts`

Incluye:

- `ApiResponse<T>`
- `CurrentUser`
- `AuthUserResponse`
- `LoginResponse`
- `UsuarioListItem`
- `UsuarioDetalle`
- `CreateUsuarioRequest`
- `UpdateUsuarioRequest`
- `UpdateUsuarioPasswordRequest`
- `Permiso`
- `PermisoModulo`
- `RolListItem`
- `RolDetalle`
- `CreateRolRequest`
- `UpdateRolRequest`
- `UpdateRolPermisosRequest`

## Componentes Compartidos

### BadgeComponent

Renderiza badges visuales por tono.

Usado en:

- Clientes.
- Proyectos.
- Estados.
- Etapas.
- Roles.

### MetricCardComponent

Tarjetas de metricas ejecutivas.

Usado en dashboard.

### SectionCardComponent

Contenedor visual para secciones.

### StatusDotComponent

Indicador puntual de estado.

### ClientFormDialogComponent

Formulario para cliente:

- Nombre.
- Industria.
- Iniciales.
- Color.

### ProjectFormDialogComponent

Formulario para proyecto:

- Datos principales.
- Cliente.
- Tipo de solucion.
- Etapa.
- Estado.
- Miembros principales.
- Miembros de apoyo.

### AmbienteFormDialogComponent

Formulario para ambiente:

- Nombre.
- Tipo.
- Proyecto.
- URL.
- Tecnologia.
- Estado.
- Uptime.
- Mensajes de ayuda contextual por campo.

### MemberFormDialogComponent

Componente legacy/de referencia para miembros.

## Design System

Archivo:

- `styles.scss`

Define:

- Variables CSS globales.
- Paleta dark mode.
- Tipografias.
- Radios.
- Tonos.
- Botones.
- Badges.
- Tablas.
- Panels.
- Dialogs.
- Inputs.
- Scrollbars.
- Ng-select dark theme.
- Utilidades responsive.

Variables principales:

- `--bg`
- `--bg-2`
- `--bg-3`
- `--bg-4`
- `--border`
- `--border-strong`
- `--text`
- `--text-2`
- `--text-3`
- `--accent`
- `--green`
- `--amber`
- `--red`
- `--purple`
- `--teal`
- `--radius`
- `--radius-lg`

### Sistema de Botones (Centralizado)

Todos los botones del sistema se centralizan en `styles.scss`. Las clases disponibles son:

| Clase | Uso | Apariencia |
|---|---|---|
| `.btn` | Base: botón pill con tipografía bold | `border-radius: 999px`, fondo oscuro |
| `.btn-primary` | Acción principal (crear, guardar, ejecutar) | Ghost azul con gradiente sutil, borde azul, texto celeste `#8db9ff`, hover glow |
| `.btn-secondary` | Acción secundaria (cancelar, actualizar, filtros) | Ghost azul tenue, más sutil que primary |
| `.btn-danger` | Acción destructiva (eliminar) | Fondo rojo translúcido |
| `.btn-sm` | Versión compacta de `.btn` | `font-size: 12px`, `min-height: 32px` |
| `.icon-button` | Botón solo ícono | Cuadrado 48x36, borde sutil |
| `.btn-icon-sm` | Botón solo ícono compacto (tablas) | Cuadrado 28x28 sin borde |

Reglas:
- **NO** redefinir `.btn`, `.btn-primary`, `.btn-secondary` en componentes locales. Si un componente necesita variantes de botón, debe usar las clases globales o añadir clases propias sin pisar las globales.
- Para cambios de color generales, editar solo `styles.scss` en el bloque `/* BOTONES GLOBALES */`.
- El estilo es **ghost/futurista**: fondos transparentes con rgba, bordes azules sutiles, textos en celeste. Inspirado en el botón Sincronizar del Dashboard.
- El hover de `.btn-primary` incluye un `box-shadow` azul tenue para efecto glow.
- Los componentes `page-header` pueden usar `.btn-act` como clase compacta para botones de cabecera (ej: "Sincronizar" en Dashboard). `.btn-act` usa el mismo sistema de colores (`.btn-ghost` como secundario).
- Para añadir un nuevo tipo de botón, crear una clase variante en `styles.scss` (ej: `.btn-success`) o modificar las existentes.

## Ng Select

Se usa para mantener consistencia visual en selectores avanzados.

Casos:

- Rol de usuario.
- Cliente de proyecto.
- Tipo de solucion.
- Etapa.
- Estado.
- Tipo de ambiente.
- Estado de ambiente.
- Desarrolladores principales.
- Desarrolladores de apoyo.

Estilos globales:

- Fondo oscuro.
- Borde fuerte.
- Opcion marcada.
- Opcion seleccionada.
- Chips para multiple selection.
- Dropdown con altura maxima y scroll.
- Bordes redondeados y sombra.

## Iconos

Archivo:

- `core/icons/app-lucide-icons.ts`

Registra solo iconos usados:

- Bell.
- Check.
- ChevronDown.
- Edit3.
- Eye.
- EyeOff.
- FolderKanban.
- GitBranch.
- Info.
- KeyRound.
- LayoutDashboard.
- LockKeyhole.
- LogOut.
- Monitor.
- Plus.
- Power.
- Server.
- Settings2.
- ShieldCheck.
- Smartphone.
- Trash2.
- TriangleAlert.
- Upload.
- UserPlus.
- UsersRound.
- X.

## Flujo De Login

1. Usuario entra a `/login`.
2. Ingresa email y password.
3. `AuthService.login` llama `POST /auth/login`.
4. Guarda token en `localStorage`.
5. Actualiza `currentUser$`.
6. Redirige a `/dashboard`.
7. `authInterceptor` agrega el token a siguientes llamadas.

## Flujo De Permisos

1. Backend emite token con claim `permisos`.
2. Frontend decodifica permisos desde JWT.
3. `PermissionGuard` protege rutas.
4. `HasPermissionDirective` protege elementos de UI.
5. Backend vuelve a validar permisos con policies en cada endpoint.

Importante:

- El frontend oculta acciones, pero la seguridad real se aplica en backend.

## Flujo De Clientes

1. La vista `/clientes` obtiene datos desde `ManagementFacade`.
2. El componente renderiza tarjetas.
3. Crear/editar abre `ClientFormDialogComponent`.
4. Guardar llama repositorio API.
5. Se refresca snapshot.
6. Eliminar/desactivar llama endpoint de cliente.

## Flujo De Proyectos

1. La vista `/proyectos` obtiene snapshot.
2. Renderiza tabla de proyectos.
3. Crear/editar abre `ProjectFormDialogComponent`.
4. Carga clientes, tipos de solucion y usuarios desde snapshot.
5. El usuario asigna principales/apoyo.
6. Guardar llama repositorio API.
7. Se refresca snapshot.

## Flujo De Usuarios

1. Al entrar a `/equipo/usuarios`, se cargan usuarios y roles.
2. Crear/editar abre `UsuarioFormComponent`.
3. El modal recibe roles precargados.
4. Si no hay roles, el modal los solicita al servicio.
5. El rol se selecciona con `ng-select`.
6. Guardar llama `createUsuario` o `updateUsuario`.
7. Al cerrar con cambios, se recarga listado.

## Flujo De Roles

1. Al entrar a `/equipo/roles`, se cargan roles.
2. Cada rol muestra usuarios asignados y permisos concedidos.
3. Crear/editar rol abre formulario.
4. Permisos abre modal de matriz.
5. Guardar permisos envia lista de ids.
6. Backend actualiza `RolPermiso`.

## Estados De Carga Y Errores

Usuarios:

- `loading` para usuarios.
- `rolesLoading` para roles.
- Snackbars para fallos.

Formularios:

- Botones deshabilitados si el formulario esta invalido.
- Estado `saving`.
- Conflicto de correo en usuarios.

Interceptor:

- 401 cierra sesion.
- 403 redirige a sin acceso.

## Integracion Con Backend

Base URL:

```text
https://localhost:7001/api
```

Formato esperado:

- La mayoria de endpoints usa `ApiResponse<T>`.
- Login responde directamente `LoginResponse`.

Endpoints consumidos:

- `/auth/login`
- `/auth/me`
- `/management/snapshot`
- `/clientes`
- `/proyectos`
- `/ambientes`
- `/usuarios`
- `/roles`
- `/permisos`

## Estado Actual De Funcionalidades

### Operativo

- Login.
- Logout.
- Guards.
- Interceptor.
- Navegacion por permisos.
- Dashboard.
- Clientes.
- Proyectos.
- Ambientes.
- Usuarios.
- Roles.
- Permisos.
- Formularios principales.
- Modo API real.
- Design system dark.

### Parcial o preparado

- Credenciales: CRUD funcional, revelado temporal, filtro por proyecto y ambiente real listos; queda pendiente la estrategia productiva de clave en backend.
- Infraestructura tecnica: ambientes ya esta persistido; despliegues y repositorios siguen como fases posteriores.
- Mock data: disponible si se activa `useMockData`.

## Pruebas Y Build

Instalar:

```bash
npm install
```

Servidor local:

```bash
npm start
```

Build:

```bash
npm run build
```

Build sin progreso:

```bash
npx ng build --progress=false
```

Tests:

```bash
npm test
```

## Consideraciones De UX/UI

- La app usa dark mode.
- La navegacion es horizontal fija.
- Las tablas usan contenedor con overflow.
- Las acciones usan icon buttons.
- Los formularios usan modales compactos.
- Clientes y proyectos estan separados visualmente por ruta aunque comparten componente.
- Los iconos lucide se centran globalmente dentro de botones.
- Los formularios de usuario evitan pedir puesto; el rol es el dato operativo principal.

## Consideraciones Tecnicas Pendientes

- Persistir despliegues y repositorios si se activa infraestructura tecnica.
- Agregar pruebas unitarias para guards, servicios y formularios criticos.
- Agregar e2e para login, CRUD de usuarios, CRUD de proyectos y permisos.
- Externalizar URL de API por ambiente de despliegue.
- Revisar manejo global de loading/error.
- Considerar refresco automatico de token si se necesita sesion larga.
