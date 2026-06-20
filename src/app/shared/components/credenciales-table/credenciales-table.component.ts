import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CredencialListItem,
  CredencialReveal,
  TipoCredencial,
  TipoCredencialOption,
  ambienteCredencialTone,
  expirationLabel,
  expirationTone,
  tipoCredencialMeta
} from '../../../core/models/credenciales.models';
import { CredencialesService } from '../../../core/services/credenciales.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { BadgeComponent } from '../badge/badge.component';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { CredencialFormDialogComponent } from '../../../features/credenciales/credencial-form-dialog.component';
import { CredencialRevealDialogComponent } from '../../../features/credenciales/credencial-reveal-dialog.component';

/**
 * Tabla de credenciales reutilizable: misma fila enriquecida (icono por tipo,
 * acceso copiable, vencimiento) y acciones (revelar / editar / eliminar) que se
 * usa tanto en la sección Credenciales como en la pestaña de un proyecto. Es la
 * fuente única de verdad para que ambas vistas se mantengan idénticas.
 */
@Component({
  selector: 'cp-credenciales-table',
  standalone: true,
  imports: [
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective,
    CredencialFormDialogComponent,
    CredencialRevealDialogComponent
  ],
  template: `
    <div class="table-wrap credentials-table">
      <table>
        <thead>
          <tr>
            <th>Credencial</th>
            <th>Tipo</th>
            <th>Acceso</th>
            @if (showProyecto()) {
              <th>{{ showAmbiente() ? 'Proyecto / Ambiente' : 'Proyecto' }}</th>
            }
            <th>Vencimiento</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id) {
            <tr>
              <td>
                <div class="credential-name">
                  <span class="credential-icon" [class]="'tone-' + tipoMeta(item.tipo).tone">
                    <i-lucide [name]="tipoMeta(item.tipo).icon" [size]="16" [strokeWidth]="2.2" />
                  </span>
                  <div>
                    <div class="data-name">{{ item.nombre }}</div>
                    <p class="item-meta">Creada {{ formatDate(item.fechaCreacion) }}</p>
                  </div>
                </div>
              </td>
              <td><cp-badge [label]="tipoLabel(item.tipo)" [tone]="tipoMeta(item.tipo).tone" /></td>
              <td>
                @if (accessLine(item); as line) {
                  <span class="access-line">
                    <span class="mono">{{ line }}</span>
                    <button
                      class="icon-button row-copy"
                      type="button"
                      [title]="copiedKey() === item.id ? 'Copiado' : 'Copiar acceso'"
                      (click)="quickCopy(line, item.id)"
                    >
                      <i-lucide [name]="copiedKey() === item.id ? 'check' : 'copy'" [size]="13" [strokeWidth]="2.2" />
                    </button>
                  </span>
                } @else if (item.url) {
                  <a class="access-url mono" [href]="item.url" target="_blank" rel="noopener noreferrer" [title]="item.url">
                    {{ shortUrl(item.url) }}
                    <i-lucide name="external-link" [size]="12" [strokeWidth]="2.2" />
                  </a>
                } @else {
                  <span class="muted">—</span>
                }
                @if (item.usuario) {
                  <p class="item-meta">usuario: {{ item.usuario }}</p>
                }
              </td>
              @if (showProyecto()) {
                <td>
                  <div class="project-cell">{{ item.proyectoNombre }}</div>
                  @if (showAmbiente()) {
                    @if (item.ambienteNombre) {
                      <cp-badge [label]="item.ambienteNombre" [tone]="ambienteTone(item)" />
                    } @else {
                      <span class="muted">Sin ambiente</span>
                    }
                  }
                </td>
              }
              <td>
                <span [class.expired-blink]="item.diasParaVencer < 0">
                  <cp-badge [label]="expirationLabel(item)" [tone]="expirationTone(item)" />
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Revelar" (click)="reveal(item)" *appHasPermission="'credenciales.revelar'">
                    <i-lucide name="eye" [size]="16" [strokeWidth]="2.1" />
                  </button>
                  <button class="icon-button" type="button" title="Editar" (click)="openEdit(item)" *appHasPermission="'credenciales.editar'">
                    <i-lucide name="edit-3" [size]="16" [strokeWidth]="2.1" />
                  </button>
                  <button class="icon-button danger" type="button" title="Eliminar" (click)="confirmDelete(item)" *appHasPermission="'credenciales.editar'">
                    <i-lucide name="trash-2" [size]="16" [strokeWidth]="2.1" />
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (editing(); as item) {
      <cp-credencial-form-dialog
        [editing]="item"
        (closed)="onFormClosed($event)"
      />
    }

    @if (revealed(); as secret) {
      @if (revealSource(); as src) {
        <cp-credencial-reveal-dialog [item]="src" [secret]="secret" (closed)="closeReveal()" />
      }
    }
  `,
  styles: [`
    .credentials-table table { min-width: 980px; }

    .credential-name {
      align-items: center;
      display: flex;
      gap: 10px;
      min-width: 0;
    }

    .credential-icon {
      align-items: center;
      background: color-mix(in srgb, var(--tone-color, var(--accent)) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone-color, var(--accent)) 28%, transparent);
      border-radius: var(--radius);
      color: var(--tone-color, var(--accent));
      display: inline-flex;
      flex: 0 0 auto;
      height: 34px;
      justify-content: center;
      width: 34px;
    }

    .credential-icon.tone-blue { --tone-color: var(--accent); }
    .credential-icon.tone-green { --tone-color: var(--green); }
    .credential-icon.tone-amber { --tone-color: var(--amber); }
    .credential-icon.tone-purple { --tone-color: var(--purple); }
    .credential-icon.tone-red { --tone-color: var(--red); }
    .credential-icon.tone-teal { --tone-color: var(--teal); }
    .credential-icon.tone-gray { --tone-color: var(--text-3); }

    .actions { display: flex; gap: 7px; }
    .icon-button.danger:hover { border-color: rgba(229, 83, 83, 0.42); color: var(--red); }

    td .item-meta { margin-top: 3px; }

    /* Copia rápida visible al hacer hover sobre la fila */
    .access-line {
      align-items: center;
      display: inline-flex;
      gap: 6px;
    }

    .row-copy {
      height: 24px;
      opacity: 0;
      transition: opacity 0.14s ease;
      width: 24px;
    }

    tr:hover .row-copy { opacity: 1; }

    .access-url {
      align-items: center;
      color: var(--teal);
      display: inline-flex;
      gap: 5px;
      text-decoration: none;
    }

    .access-url:hover { text-decoration: underline; }

    .project-cell {
      color: var(--text);
      font-weight: 600;
      margin-bottom: 4px;
    }

    /* Alerta parpadeante discreta para credenciales vencidas */
    .expired-blink {
      animation: expired-pulse 1.6s ease infinite;
      display: inline-block;
    }

    @keyframes expired-pulse {
      50% { opacity: 0.45; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialesTableComponent {
  private readonly service = inject(CredencialesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<CredencialListItem[]>();
  /** Muestra la columna de proyecto/ambiente; ocúltala cuando el proyecto ya es el contexto. */
  readonly showProyecto = input(true);
  /** Dentro de la columna de proyecto, muestra el badge de ambiente (oculto al agrupar por ambiente). */
  readonly showAmbiente = input(true);

  /** Se emite tras editar o eliminar para que el contenedor recargue sus datos. */
  readonly changed = output<void>();

  protected readonly editing = signal<CredencialListItem | null>(null);
  protected readonly revealed = signal<CredencialReveal | null>(null);
  protected readonly revealSource = signal<CredencialListItem | null>(null);
  protected readonly copiedKey = signal<string | null>(null);

  protected readonly expirationTone = expirationTone;
  protected readonly expirationLabel = expirationLabel;

  protected openEdit(item: CredencialListItem): void {
    this.editing.set(item);
  }

  protected onFormClosed(saved: boolean): void {
    this.editing.set(null);
    if (saved) this.changed.emit();
  }

  protected reveal(item: CredencialListItem): void {
    this.service.reveal(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (secret) => {
          this.revealSource.set(item);
          this.revealed.set(secret);
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo revelar la credencial.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  protected closeReveal(): void {
    this.revealed.set(null);
    this.revealSource.set(null);
  }

  protected confirmDelete(item: CredencialListItem): void {
    if (!confirm(`¿Eliminar la credencial "${item.nombre}"?`)) return;

    this.service.delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Credencial eliminada.', 'Cerrar', { duration: 2800 });
          this.changed.emit();
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo eliminar la credencial.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  protected quickCopy(value: string, key: string): void {
    if (!value || !navigator.clipboard) return;

    navigator.clipboard.writeText(value).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => {
        if (this.copiedKey() === key) this.copiedKey.set(null);
      }, 1500);
    }).catch(() => {
      this.snackBar.open('No se pudo copiar al portapapeles.', 'Cerrar', { duration: 2600 });
    });
  }

  protected tipoMeta(tipo: TipoCredencial): TipoCredencialOption {
    return tipoCredencialMeta(tipo);
  }

  protected tipoLabel(tipo: TipoCredencial): string {
    return tipoCredencialMeta(tipo).label;
  }

  protected ambienteTone(item: CredencialListItem) {
    return ambienteCredencialTone(item.ambienteTipo);
  }

  protected accessLine(item: CredencialListItem): string | null {
    const host = (item.host || '').trim();
    if (!host) return null;
    return item.puerto ? `${host}:${item.puerto}` : host;
  }

  protected shortUrl(url: string): string {
    const limpio = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return limpio.length > 36 ? `${limpio.slice(0, 33)}…` : limpio;
  }

  protected formatDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }
}
