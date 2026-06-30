import { Injectable, NgZone, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Pila de "manejadores de cierre" sincronizada con el historial del navegador.
 *
 * Idea: cada vez que se abre un modal se registra un manejador y se empuja una
 * entrada al historial (con la MISMA URL, vía `history.pushState`). Cuando el
 * usuario pulsa "atrás" (`popstate`) cerramos el modal superior en vez de
 * navegar de ruta; como la URL no cambió, el Router de Angular no navega.
 *
 * - Botón atrás del navegador  -> se cierra solo el modal de arriba de la pila.
 * - Cierre por UI (X/cancelar) -> el modal llama a `release()`, que consume la
 *   entrada empujada con `history.back()` para mantener el historial limpio.
 * - Sin modales abiertos       -> "atrás" navega rutas con normalidad.
 *
 * Soporta modales anidados (p. ej. el visor de imágenes dentro del detalle de
 * tarjeta): la pila es LIFO, así que "atrás" cierra primero el más interno.
 */
interface BackHandler {
  readonly id: number;
  readonly close: () => void;
}

@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);

  private readonly stack: BackHandler[] = [];
  private nextId = 1;

  /** Nº de eventos `popstate` que esperamos por `history.go()` programáticos y debemos ignorar. */
  private pendingProgrammaticPops = 0;

  /** URL actual (sin las entradas "fantasma" de modal, que comparten URL). */
  private currentUrl = '';

  constructor() {
    window.addEventListener('popstate', this.onPopState);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => (this.currentUrl = e.urlAfterRedirects));

    // Una navegación de ruta REAL (cambia la URL) debe cerrar cualquier modal
    // abierto. Antes lo hacía `closeOnNavigation` de MatDialog, que ahora
    // desactivamos para evitar que reaccione a nuestros popstate de limpieza.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe((e) => {
        if (e.url !== this.currentUrl) this.forceCloseAll();
      });
  }

  /** Cierra todos los modales abiertos sin tocar el historial (la navegación ya lo gestiona). */
  private forceCloseAll(): void {
    if (this.stack.length === 0) return;
    const removed = this.stack.splice(0);
    this.pendingProgrammaticPops = 0;
    for (let i = removed.length - 1; i >= 0; i--) {
      this.zone.run(() => removed[i].close());
    }
  }

  /**
   * Registra el cierre de un modal y empuja una entrada al historial.
   * @returns id que debe pasarse luego a {@link release}.
   */
  register(close: () => void): number {
    const id = this.nextId++;
    this.stack.push({ id, close });
    history.pushState({ __cpModal: id }, '');
    return id;
  }

  /**
   * Notifica que un modal se cerró por su propia UI (X / cancelar / guardar).
   * Consume la(s) entrada(s) de historial empujadas para que el botón
   * "adelante" no reabra nada. Es idempotente: si el modal ya se cerró por el
   * botón atrás (popstate) esto no hace nada.
   */
  release(id: number): void {
    const index = this.stack.findIndex((h) => h.id === id);
    if (index === -1) return;

    // Quita el manejador y todo lo que tenga por encima (modales hijos que
    // quedarían huérfanos al cerrarse su contenedor).
    const removed = this.stack.splice(index);

    // Cierra los modales apilados por encima del que se libera. Ya están fuera
    // de la pila, así que su propio release() será un no-op.
    for (let i = removed.length - 1; i > 0; i--) {
      this.zone.run(() => removed[i].close());
    }

    // Solo rebobinamos el historial si la entrada actual sigue siendo una de
    // nuestras entradas de modal. Si el usuario navegó de ruta (p. ej. por el
    // menú) con el modal abierto, el Router ya reemplazó el estado superior y un
    // history.back() aquí provocaría una navegación inesperada: en ese caso solo
    // descartamos los manejadores.
    if (history.state?.__cpModal != null) {
      this.pendingProgrammaticPops += removed.length;
      history.go(-removed.length);
    }
  }

  private readonly onPopState = (): void => {
    if (this.pendingProgrammaticPops > 0) {
      this.pendingProgrammaticPops--;
      return;
    }

    const handler = this.stack.pop();
    if (!handler) {
      // Sin modales: dejamos que el Router maneje la navegación de ruta.
      return;
    }

    // La entrada de historial ya fue consumida por el navegador; solo cerramos.
    this.zone.run(() => handler.close());
  };
}
