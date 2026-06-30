import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Lleva la cuenta de la navegación interna de la app para ofrecer un "volver"
 * dinámico: en lugar de navegar a una ruta fija, retrocede a donde el usuario
 * realmente estaba.
 *
 * Si la página actual es la primera tras cargar la app (no hay historial
 * interno previo, p. ej. se abrió el enlace directo o se recargó), se cae a una
 * ruta de respaldo para no salir de la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** URLs internas visitadas (la última es la página actual). */
  private readonly visited: string[] = [];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.visited.push(e.urlAfterRedirects);
        // Evita crecimiento ilimitado en sesiones largas; conservamos lo
        // suficiente para saber si hubo navegación interna previa.
        if (this.visited.length > 50) this.visited.shift();
      });
  }

  /** ¿Hay una página interna previa a la que volver? */
  canGoBack(): boolean {
    return this.visited.length > 1;
  }

  /**
   * Vuelve a la página interna anterior. Si no la hay, navega a `fallback`.
   * @param fallback comandos de ruta de respaldo, p. ej. `['/ambientes']`.
   */
  back(fallback: unknown[]): void {
    if (this.canGoBack()) {
      this.location.back();
    } else {
      this.router.navigate(fallback);
    }
  }
}
