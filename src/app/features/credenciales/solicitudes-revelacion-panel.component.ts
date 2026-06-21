import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';

import { SolicitudRevelacion } from '../../core/models/credenciales.models';
import { CredencialesService } from '../../core/services/credenciales.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';

/**
 * Bandeja del aprobador: lista las solicitudes de revelación pendientes y permite aprobarlas o
 * rechazarlas. Solo se usa para usuarios con el permiso `credenciales.solicitud.aprobar`.
 */
@Component({
  selector: 'cp-solicitudes-revelacion-panel',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendientes().length > 0) {
      <div class="solicitudes-panel">
        <div class="solicitudes-head">
          <i-lucide name="key-round" [size]="16" [strokeWidth]="2.2" />
          <strong>Solicitudes de revelación pendientes</strong>
          <span class="count">{{ pendientes().length }}</span>
        </div>

        <ul class="solicitudes-list">
          @for (s of pendientes(); track s.id) {
            <li class="solicitud-item">
              <div class="solicitud-info">
                <span class="solicitud-cred">{{ s.credencialNombre }}</span>
                <small>{{ s.proyectoNombre }} · pedida por {{ s.solicitanteNombre }}</small>
                @if (s.motivo) { <small class="motivo">“{{ s.motivo }}”</small> }
              </div>
              <div class="solicitud-actions">
                <button class="btn btn-primary btn-sm" type="button" [disabled]="busy()" (click)="resolver(s, true)">
                  Aprobar
                </button>
                <button class="btn btn-secondary btn-sm" type="button" [disabled]="busy()" (click)="resolver(s, false)">
                  Rechazar
                </button>
              </div>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    .solicitudes-panel { border: 1px solid var(--border, #e2e8f0); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; background: var(--surface, #fff); }
    .solicitudes-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .solicitudes-head .count { margin-left: auto; background: #f59e0b; color: #fff; border-radius: 999px; padding: 1px 9px; font-size: 12px; font-weight: 600; }
    .solicitudes-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .solicitud-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px dashed var(--border, #e2e8f0); }
    .solicitud-item:first-child { border-top: none; }
    .solicitud-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .solicitud-cred { font-weight: 600; }
    .solicitud-info small { color: var(--text-muted, #64748b); font-size: 12px; }
    .solicitud-info .motivo { font-style: italic; }
    .solicitud-actions { display: flex; gap: 8px; margin-left: auto; }
  `]
})
export class SolicitudesRevelacionPanelComponent implements OnInit {
  private readonly service = inject(CredencialesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pendientes = signal<SolicitudRevelacion[]>([]);
  protected readonly busy = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.service.getSolicitudes('Pendiente')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.pendientes.set(items),
        error: () => this.pendientes.set([])
      });
  }

  protected resolver(solicitud: SolicitudRevelacion, aprobar: boolean): void {
    this.busy.set(true);
    const accion$ = aprobar
      ? this.service.aprobarSolicitud(solicitud.id)
      : this.service.rechazarSolicitud(solicitud.id);

    accion$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        this.pendientes.update((list) => list.filter((s) => s.id !== solicitud.id));
        this.snackBar.open(
          aprobar ? 'Solicitud aprobada (vigente 15 min).' : 'Solicitud rechazada.',
          'Cerrar', { duration: 3500 });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo resolver la solicitud.'), 'Cerrar', { duration: 4200 });
      }
    });
  }
}
