import { Directive, OnDestroy, OnInit, inject, output } from '@angular/core';

import { BackNavigationService } from '../../core/services/back-navigation.service';

/**
 * Integra un modal inline (mostrado con `@if`) con el botón "atrás" del
 * navegador. Se coloca en el elemento raíz del modal; mientras existe en el DOM
 * mantiene una entrada en {@link BackNavigationService}.
 *
 * - Al pulsar "atrás" emite `(cpCloseOnBack)`, que debe cablearse al mismo
 *   método que ya cierra el modal (el mismo de `(cancel)`).
 * - Al cerrarse el modal por su UI, el `@if` destruye el componente y la
 *   directiva libera la entrada del historial automáticamente.
 *
 * @example
 * ```html
 * @if (showForm()) {
 *   <cp-foo-dialog cpCloseOnBack (cpCloseOnBack)="closeForm()" (cancel)="closeForm()" />
 * }
 * ```
 */
@Directive({
  selector: '[cpCloseOnBack]',
  standalone: true
})
export class CloseOnBackDirective implements OnInit, OnDestroy {
  private readonly back = inject(BackNavigationService);

  /** Se emite cuando el usuario pulsa "atrás" estando el modal abierto. */
  readonly cpCloseOnBack = output<void>();

  private id?: number;

  ngOnInit(): void {
    this.id = this.back.register(() => this.cpCloseOnBack.emit());
  }

  ngOnDestroy(): void {
    if (this.id != null) {
      this.back.release(this.id);
    }
  }
}
