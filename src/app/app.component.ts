import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterOutlet } from '@angular/router';

import { BackNavigationService } from './core/services/back-navigation.service';
import { NavigationHistoryService } from './core/services/navigation-history.service';

@Component({
  selector: 'cp-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly dialog = inject(MatDialog);
  private readonly back = inject(BackNavigationService);
  private readonly destroyRef = inject(DestroyRef);

  // Inyectar el servicio arranca el seguimiento del historial de navegación.
  private readonly navigationHistory = inject(NavigationHistoryService);

  constructor() {
    // Integra TODOS los MatDialog con el botón "atrás" sin tocar los call-sites:
    // al abrirse un diálogo se registra su cierre en la pila de navegación.
    this.dialog.afterOpened.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ref) => {
      const id = this.back.register(() => ref.close());
      ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.back.release(id));
    });
  }
}
