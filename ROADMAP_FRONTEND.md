# ConsultoraPro · Roadmap Frontend

> Stack: Angular 21 · TypeScript 5.9 · RxJS · Angular Material · ng-select · Lucide Icons · SCSS dark mode
>
> Tachar con `~~tarea~~` o marcar con `[x]` al completar cada ítem.
> Orden: de más básico a más complejo, por grupo temático.

---

## GRUPO 1 — Estabilidad base y calidad del código existente

Estas tareas no agregan funcionalidad nueva pero son la base para escalar sin deuda técnica.

> Marcado: `H` = se puede hacer ahora. `P` = pendiente; después de `:` se explica por qué no se puede cerrar todavía.

- [x] Auditar y unificar el manejo global de loading/error (un solo patrón en todos los módulos, no ad-hoc por componente)
- [x] Revisar y unificar el patrón de suscripción a observables (preferir `async pipe` sobre `.subscribe()` manual donde sea posible)
- [x] Eliminar o archivar el componente `team-permissions` (prototipo legacy) para no confundir con el módulo real
- [x] Verificar que `MemberFormDialogComponent` legacy esté eliminado o claramente marcado como no usado
- [x] Revisar que todos los snackbars de error muestren el mensaje real del backend (`ApiResponse.message`) y no mensajes genéricos
- [x] Asegurarse de que el `authInterceptor` maneja correctamente errores de red (timeout, sin conexión) además de 401/403
- [x] Confirmar que el token se limpia correctamente en logout (localStorage + BehaviorSubject)
- [P] Revisar que `HasPermissionDirective` funciona correctamente cuando los permisos cambian en caliente (ej: si se edita un rol): no se puede cerrar completamente sin una estrategia de refresco de permisos/token o polling; el JWT actual conserva los permisos emitidos al login y no cambia solo cuando otro usuario edita un rol.

---

## GRUPO 2 — Módulo de Credenciales (funcionalidad real)

Actualmente la pantalla existe y el endpoint del backend devuelve lista vacía. Este grupo lo convierte en funcional.

> Marcado: `H` = se puede hacer ahora. `P` = pendiente; después de `:` se explica por qué no se puede cerrar todavía.

- [x] Definir y acordar el modelo de datos final de `Credencial` con el backend (campos: nombre, tipo, ambiente, servidor, valor cifrado, proyecto, vencimiento)
- [H] Cerrar campo `ambiente` en el formulario de credenciales: selector real conectado al API de Ambientes y filtrado por proyecto.
- [H] Cerrar columna `ambiente` en el listado de credenciales: muestra el nombre del ambiente cuando la credencial está asociada.
- [x] Implementar badge visual de vencimiento: verde (> 30 días), amber (7-30 días), rojo (< 7 días o vencido)
- [x] Implementar botón "Revelar" con protección por permiso `credenciales.revelar` — oculto si no tiene el permiso
- [x] Al revelar: mostrar valor en modal con temporizador de 30 segundos que lo oculta automáticamente
- [x] Implementar creación de credencial (requiere permiso `credenciales.crear`)
- [x] Implementar edición de credencial (requiere permiso `credenciales.editar`) — el valor no se pre-rellena por seguridad
- [x] Implementar eliminación con confirmación
- [x] Mostrar alerta en dashboard si hay credenciales próximas a vencer (< 7 días)
- [x] Filtro por proyecto en el listado de credenciales

---

## GRUPO 3 — Módulo de Ambientes (nuevo)

Permisos ya existen en backend. El CRUD completo queda funcional.

- [H] Crear ruta `/ambientes` protegida con `AuthGuard` + permiso `ambientes.ver`
- [H] Agregar "Ambientes" al sidebar (visible solo con `ambientes.ver`)
- [H] Definir modelo `Ambiente`: id, nombre, tipo (Producción/Staging/Desarrollo), url, proyecto, tecnología, estado (Online/Offline/Alerta), uptime%
- [H] Crear `AmbienteFormDialogComponent` con campos: nombre, tipo (ng-select), URL, proyecto (ng-select), tecnología, estado
- [H] Implementar listado de ambientes agrupados por proyecto con indicador de estado (dot de color)
- [H] Implementar creación de ambiente (requiere `ambientes.crear`)
- [H] Implementar edición de ambiente (requiere `ambientes.editar`)
- [H] Implementar tarjeta resumen global: total ambientes, online, con alerta, offline
- [H] Vincular desde la vista de proyectos: botón que navega a los ambientes de ese proyecto filtrados
- [H] Mostrar alerta en dashboard si hay ambientes en estado "Alerta"

---

## GRUPO 4 — Módulo de Repositorios (nuevo)

- [H] Crear ruta `/repositorios` protegida con `AuthGuard` + permiso `proyectos.ver` (reutilizar permiso o crear uno específico)
- [H] Agregar "Repositorios" al sidebar (visible con permiso correspondiente)
- [H] Definir modelo `Repositorio`: id, nombre, proyecto, proveedor (GitHub/GitLab/Azure DevOps), rama principal, url, estado de pipeline
- [H] Crear `RepositorioFormDialogComponent` con campos: nombre, proyecto (ng-select), proveedor (ng-select), rama principal, URL
- [H] Implementar tabla de repositorios con columnas: nombre, proyecto, proveedor (badge), rama, estado pipeline (Passing/Failed), acciones
- [H] Implementar creación de repositorio
- [H] Implementar edición de repositorio
- [H] Implementar eliminación con confirmación
- [H] Badge de pipeline: verde (Passing), rojo (Failed), gris (Desconocido)
- [P] Vincular repositorios desde la vista de proyecto (mostrar repos del proyecto en su detalle): la vista de detalle de proyecto actual no tiene sección de repositorios; requiere agregar una subsección en la página de proyecto o un botón de navegación hacia `/repositorios?proyectoId=X`.

---

## GRUPO 5 — Módulo de Despliegues (nuevo)

- [H] Crear ruta `/despliegues` protegida con `AuthGuard` + permiso `despliegues.ver`
- [H] Agregar "Despliegues" al sidebar (visible con permiso)
- [H] Definir modelo `Despliegue`: id, proyecto, ambiente destino, versión, ejecutadoPor, fechaHora, estado (Exitoso/Fallido/EnCurso), duración
- [H] Implementar historial de despliegues en tabla paginada con filtro por proyecto
- [H] Indicador de estado por color: verde exitoso, rojo fallido, amber en curso
- [H] Implementar "Ejecutar despliegue" (requiere permiso `despliegues.ejecutar`) — formulario: proyecto, ambiente, versión
- [H] Confirmación visual antes de ejecutar un despliegue en Producción (alerta extra)
- [H] Mostrar en dashboard: los últimos 5 despliegues con su estado y tasa de éxito
- [H] Mostrar tasa de éxito del mes en el dashboard (métrica desde snapshot)

---

## GRUPO 6 — Dashboard ejecutivo (completar)

El dashboard existe pero consume datos estáticos/mockeados del snapshot. Este grupo lo hace completamente dinámico y útil.

- [ ] Conectar métrica "Clientes activos" al conteo real desde snapshot
- [ ] Conectar métrica "Proyectos en curso" al conteo real
- [ ] Conectar métrica "Ambientes activos" cuando el módulo esté implementado
- [H] Conectar métrica "Despliegues del mes / tasa de éxito" ahora que el módulo está implementado
- [ ] Mostrar alertas reales: credenciales por vencer, ambientes con alerta, proyectos por vencer
- [ ] Implementar Gantt real basado en fechas de inicio/fin de los proyectos activos (no hardcodeado)
- [ ] Mostrar los 3-5 proyectos con mayor actividad reciente o más próximos a vencer
- [ ] Agregar selector de rango de fechas o mes para filtrar las métricas del dashboard
- [ ] Hacer que las métricas y alertas del dashboard se refresquen automáticamente cada N minutos (polling o signal-based)

---

## GRUPO 7 — Perfil de usuario y cuenta propia

- [ ] Crear ruta `/perfil` accesible para cualquier usuario autenticado (sin permiso especial)
- [ ] Mostrar datos del usuario logueado: nombre, apellidos, email, puesto, rol, fecha de alta, último acceso
- [ ] Implementar formulario para editar datos propios: nombre, apellidos, teléfono, iniciales
- [ ] Implementar cambio de contraseña propia (distinto al cambio admin): campo contraseña actual + nueva + confirmar
- [ ] Conectar botón de avatar/nombre en sidebar/topbar para navegar al perfil
- [ ] Mostrar iniciales del usuario en el avatar del sidebar desde el JWT (ya existe en claims, confirmar que se muestra correctamente)

---

## GRUPO 8 — Mejoras UX en módulos existentes

- [ ] En la vista de Proyectos: agregar filtros por estado (En curso, Planificación, Completado, Por vencer)
- [ ] En la vista de Proyectos: agregar filtro por cliente
- [ ] En la vista de Proyectos: columna de progreso con barra visual (ya existe en prototipo, confirmar en componente real)
- [ ] En la vista de Clientes: mostrar contador de proyectos activos vs completados por cliente
- [ ] En la vista de Clientes: al hacer click en una tarjeta, navegar a `/clientes/:id` con el detalle del cliente y sus proyectos
- [ ] Implementar vista de detalle de cliente (`/clientes/:id`) con sus proyectos listados
- [ ] En formulario de Proyecto: mostrar fecha de inicio y fecha de fin como campos editables (actualmente se calculan automáticamente en backend)
- [ ] En formulario de Proyecto: mostrar campo de progreso (0-100) editable
- [ ] En la vista de Usuarios: mostrar columna "Último acceso" formateada (hace X días / Nunca)
- [ ] En la vista de Usuarios: agregar filtro por rol
- [ ] Confirmar que el toggle activo/inactivo de usuarios da feedback visual inmediato (optimistic UI)

---

## GRUPO 9 — Notificaciones y alertas en tiempo real

- [ ] Diseñar el sistema de notificaciones in-app (icono campana en topbar con badge de conteo)
- [ ] Listar notificaciones: credenciales por vencer, proyectos por vencer, ambientes con alerta
- [ ] Marcar notificaciones como leídas
- [ ] Evaluar si usar polling (simple) o SignalR (real-time) — para v1 recomendado polling cada 5 minutos
- [ ] Mostrar snackbar automático al entrar si hay alertas críticas (credencial vence en menos de 3 días)

---

## GRUPO 10 — Screenshots de proyectos

- [ ] Crear sección "Screenshots" dentro del detalle de proyecto o en el módulo de equipo
- [ ] Implementar subida de imagen (PNG/JPG, max 5MB) vinculada a un proyecto y versión
- [ ] Galería de thumbnails por proyecto con la versión y fecha de subida
- [ ] Eliminar screenshot con confirmación
- [ ] Conectar con Azure Blob Storage o endpoint de upload del backend

---

## GRUPO 11 — Exportación y reportes

- [ ] Implementar exportación de tabla de proyectos a CSV (client-side con datos del snapshot)
- [ ] Implementar exportación de tabla de usuarios a CSV
- [ ] Generar reporte PDF del estado de un proyecto (nombre, cliente, etapa, progreso, miembros, ambientes)
- [ ] Generar reporte PDF ejecutivo con métricas globales (para Gerencia)

---

## GRUPO 12 — Calidad, pruebas y producción

- [ ] Escribir pruebas unitarias para `AuthService` (login, logout, hasPermission, isAuthenticated)
- [ ] Escribir pruebas unitarias para `AuthGuard` y `PermissionGuard`
- [ ] Escribir pruebas unitarias para `HasPermissionDirective`
- [ ] Escribir pruebas unitarias para `ClientFormDialogComponent` (validaciones del formulario)
- [ ] Escribir pruebas unitarias para `ProjectFormDialogComponent`
- [ ] Escribir pruebas unitarias para `UsuarioFormComponent`
- [ ] Configurar pruebas e2e con Playwright o Cypress: flujo de login completo
- [ ] Configurar pruebas e2e: CRUD de clientes
- [ ] Configurar pruebas e2e: CRUD de proyectos
- [ ] Configurar pruebas e2e: CRUD de usuarios
- [ ] Configurar pruebas e2e: flujo de permisos (usuario Dev no puede ver credenciales)
- [ ] Externalizar `apiBaseUrl` correctamente por ambiente (dev / staging / prod) en `environment.ts`
- [ ] Configurar build de producción y verificar que no queden `console.log` ni datos de seed expuestos
- [ ] Implementar refresh automático de token (interceptar respuesta 401 con token expirado y solicitar nuevo antes de redirigir)
- [ ] Revisar accesibilidad básica: aria-labels en botones de icono, contraste de colores, navegación por teclado en modales
- [ ] Implementar lazy loading confirmado en todas las rutas (verificar que los chunks se separen correctamente en build)

---

## GRUPO 13 — Preparación para despliegue

- [ ] Configurar `environment.prod.ts` con URL real del backend en producción
- [ ] Configurar Dockerfile o script de build para el frontend (nginx o node serve)
- [ ] Definir estrategia de CI/CD para el repo frontend (GitHub Actions o Azure DevOps pipeline)
- [ ] Configurar pipeline: install → lint → test → build → deploy
- [ ] Definir y documentar la URL base del backend por ambiente en el README

---

## Resumen de estado por módulo

| Módulo | Estado actual |
|---|---|
| Login / Auth | ✅ Operativo |
| Sidebar / Shell | ✅ Operativo |
| Dashboard | 🟡 Parcial — métricas reales de clientes, proyectos, credenciales y ambientes; despliegues/Gantt pendientes |
| Clientes | ✅ Operativo |
| Proyectos | ✅ Operativo |
| Usuarios | ✅ Operativo |
| Roles y permisos | ✅ Operativo |
| Credenciales | ✅ CRUD funcional con selector/nombre real de ambientes |
| Ambientes | ✅ Operativo |
| Repositorios | ✅ CRUD funcional con listado agrupado y badge de pipeline |
| Despliegues | ✅ CRUD funcional con página dedicada, sidebar, ruta protegida, formulario de ejecución con selector proyecto/ambiente, historial paginado, dashboard conectado |
| Perfil de usuario | 🔴 Pendiente |
| Screenshots | 🔴 Pendiente |
| Notificaciones | 🔴 Pendiente |
| Exportación / Reportes | 🔴 Pendiente |
| Pruebas unitarias | 🔴 Pendiente |
| Pruebas e2e | 🔴 Pendiente |
| Build / CI-CD | 🔴 Pendiente |
