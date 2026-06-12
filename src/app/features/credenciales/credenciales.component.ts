import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ManagementFacade } from '../../core/data-access/management.facade';
import {
  CredencialListItem,
  CredencialReveal,
  TIPO_CREDENCIAL_OPTIONS,
  TipoCredencial,
  TipoCredencialOption,
  ambienteCredencialTone,
  expirationLabel,
  expirationTone,
  tipoCredencialMeta
} from '../../core/models/credenciales.models';
import { CredencialesService } from '../../core/services/credenciales.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { CredencialFormDialogComponent } from './credencial-form-dialog.component';
import { CredencialImportDialogComponent } from './credencial-import-dialog.component';
import { CredencialRevealDialogComponent } from './credencial-reveal-dialog.component';
import { exportarCredenciales } from './credencial-excel';

type EstadoFiltro = 'todos' | 'vigente' | 'porvencer' | 'vencida';
type GroupBy = 'none' | 'ambiente';

interface CredencialGroup {
  key: string;
  label: string;
  items: CredencialListItem[];
}

@Component({
  selector: 'cp-credenciales',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NgSelectModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective,
    CredencialFormDialogComponent,
    CredencialImportDialogComponent,
    CredencialRevealDialogComponent
  ],
  template: `
    <section class="page credentials-page">
      <header class="page-header credentials-header">
        <div>
          <h1 class="page-title">Credenciales</h1>
          <p class="page-subtitle">Fuente única de los accesos a servidores, VPN, bases de datos y servicios. Revelado temporal y auditoría automática.</p>
        </div>

        <div class="header-actions">
          <button class="btn btn-secondary" type="button" (click)="exportar()" [disabled]="filtered().length === 0">
            <i-lucide name="file-spreadsheet" [size]="15" [strokeWidth]="2.2" />
            Exportar
          </button>
          <button class="btn btn-secondary" type="button" (click)="importOpen.set(true)" *appHasPermission="'credenciales.crear'">
            <i-lucide name="upload" [size]="15" [strokeWidth]="2.2" />
            Importar Excel
          </button>
          <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'credenciales.crear'">
            <i-lucide name="plus" [size]="16" [strokeWidth]="2.4" />
            Nueva credencial
          </button>
        </div>
      </header>

      <div class="summary-grid">
        <div class="summary-card tone-blue">
          <span class="summary-label">Total de accesos</span>
          <strong>{{ credenciales().length }}</strong>
          <small>{{ infraCount() }} de infraestructura · {{ secretosCount() }} secretos</small>
        </div>
        <div class="summary-card tone-amber">
          <span class="summary-label">Por vencer (≤30 días)</span>
          <strong>{{ porVencerCount() }}</strong>
          <small>Requieren rotación pronto</small>
        </div>
        <div class="summary-card tone-red">
          <span class="summary-label">Vencidas</span>
          <strong>{{ vencidasCount() }}</strong>
          <small>Acción inmediata recomendada</small>
        </div>
        <div class="summary-card tone-teal">
          <span class="summary-label">Mostrando</span>
          <strong>{{ filtered().length }}</strong>
          <small>de {{ credenciales().length }} con los filtros activos</small>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-field">
          <i-lucide name="search" [size]="16" [strokeWidth]="2.1" />
          <input
            class="search-input"
            type="text"
            placeholder="Buscar por nombre, host, usuario, URL o notas…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
        </div>

        <div class="filter-field">
          <ng-select
            [ngModel]="selectedProjectId()"
            (ngModelChange)="onProjectFilterChange($event)"
            placeholder="Todos los proyectos"
            appendTo="body"
          >
            <ng-option [value]="null">Todos los proyectos</ng-option>
            @for (project of projects(); track project.id) {
              <ng-option [value]="project.id">{{ project.clientName }} · {{ project.name }}</ng-option>
            }
          </ng-select>
        </div>

        <div class="filter-field">
          <ng-select
            [ngModel]="tipoFilter()"
            (ngModelChange)="tipoFilter.set($event)"
            placeholder="Todos los tipos"
            appendTo="body"
          >
            <ng-option [value]="null">Todos los tipos</ng-option>
            @for (option of tipoOptions; track option.value) {
              <ng-option [value]="option.value">{{ option.label }}</ng-option>
            }
          </ng-select>
        </div>

        <div class="filter-field">
          <ng-select
            [ngModel]="estadoFilter()"
            (ngModelChange)="estadoFilter.set($event)"
            [clearable]="false"
            appendTo="body"
          >
            <ng-option value="todos">Cualquier vencimiento</ng-option>
            <ng-option value="vigente">Vigentes</ng-option>
            <ng-option value="porvencer">Próximos a vencer (≤30 días)</ng-option>
            <ng-option value="vencida">Vencidos</ng-option>
          </ng-select>
        </div>

        <div class="toolbar-actions">
          <div class="segmented" role="group" aria-label="Agrupación">
            <button type="button" [class.active]="groupBy() === 'none'" (click)="groupBy.set('none')" title="Vista de tabla">
              <i-lucide name="layout-dashboard" [size]="15" [strokeWidth]="2.1" />
            </button>
            <button type="button" [class.active]="groupBy() === 'ambiente'" (click)="groupBy.set('ambiente')" title="Agrupar por ambiente">
              <i-lucide name="hard-drive" [size]="15" [strokeWidth]="2.1" />
            </button>
          </div>
          <button class="icon-button" type="button" title="Actualizar" (click)="load()">
            <i-lucide name="refresh-cw" [size]="16" [strokeWidth]="2.1" />
          </button>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="alert-row warn">
          <i-lucide name="triangle-alert" [size]="15" [strokeWidth]="2.2" />
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (loading()) {
        <div class="empty-state">Cargando credenciales…</div>
      } @else if (credenciales().length === 0) {
        <div class="empty-state">
          <h2>Aún no hay accesos registrados</h2>
          <p>Centraliza aquí las credenciales de servidores, VPN, bases de datos y servicios.</p>
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <h2>Sin resultados</h2>
          <p>Ningún acceso coincide con los filtros activos.</p>
        </div>
      } @else if (groupBy() === 'ambiente') {
        <div class="groups">
          @for (group of groups(); track group.key) {
            <div class="group">
              <div class="group-head">
                <h2>{{ group.label }}</h2>
                <span class="muted">{{ group.items.length }} acceso(s)</span>
              </div>
              <div class="table-wrap credentials-table">
                <table>
                  <thead>
                    <tr>
                      <th>Credencial</th>
                      <th>Tipo</th>
                      <th>Acceso</th>
                      <th>Proyecto</th>
                      <th>Vencimiento</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of group.items; track item.id) {
                      <ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: item, ambiente: false }" />
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="table-wrap credentials-table">
          <table>
            <thead>
              <tr>
                <th>Credencial</th>
                <th>Tipo</th>
                <th>Acceso</th>
                <th>Proyecto / Ambiente</th>
                <th>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.id) {
                <ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: item, ambiente: true }" />
              }
            </tbody>
          </table>
        </div>
      }

      <ng-template #rowTpl let-item let-showAmbiente="ambiente">
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
          <td>
            <div class="project-cell">{{ item.proyectoNombre }}</div>
            @if (showAmbiente) {
              @if (item.ambienteNombre) {
                <cp-badge [label]="item.ambienteNombre" [tone]="ambienteTone(item)" />
              } @else {
                <span class="muted">Sin ambiente</span>
              }
            }
          </td>
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
      </ng-template>

      @if (formOpen()) {
        <cp-credencial-form-dialog
          [editing]="editing()"
          [defaultProjectId]="selectedProjectId()"
          (closed)="onFormClosed($event)"
        />
      }

      @if (importOpen()) {
        <cp-credencial-import-dialog (closed)="onImportClosed($event)" />
      }

      @if (revealed(); as secret) {
        @if (revealSource(); as src) {
          <cp-credencial-reveal-dialog [item]="src" [secret]="secret" (closed)="closeReveal()" />
        }
      }
    </section>
  `,
  styles: [`
    .credentials-header {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .header-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .summary-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 18px;
    }

    .summary-card {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      min-width: 0;
      overflow: hidden;
      padding: 16px;
      position: relative;
    }

    .summary-card::before {
      background: var(--tone-color, var(--accent));
      content: '';
      height: 2px;
      inset: 0 0 auto 0;
      position: absolute;
    }

    .summary-label {
      color: var(--text-2);
      display: block;
      font-size: 12px;
      margin-bottom: 6px;
    }

    .summary-card strong {
      color: var(--text);
      display: block;
      font-family: var(--font-head);
      font-size: 30px;
      line-height: 1.1;
    }

    .summary-card small {
      color: var(--text-3);
      display: block;
      font-size: 12px;
      margin-top: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toolbar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }

    .search-field {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text-3);
      display: flex;
      flex: 1 1 280px;
      gap: 8px;
      min-width: 240px;
      padding: 0 12px;
    }

    .search-field:focus-within {
      border-color: var(--accent);
    }

    .search-input {
      background: transparent;
      border: none;
      color: var(--text);
      flex: 1;
      font: inherit;
      min-height: 40px;
      outline: none;
      padding: 0;
    }

    .filter-field {
      flex: 0 1 200px;
      min-width: 170px;
    }

    .toolbar-actions {
      align-items: center;
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .segmented {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      display: inline-flex;
      overflow: hidden;
    }

    .segmented button {
      align-items: center;
      background: transparent;
      border: none;
      color: var(--text-3);
      display: inline-flex;
      height: 38px;
      justify-content: center;
      transition: background-color 0.16s ease, color 0.16s ease;
      width: 40px;
    }

    .segmented button.active {
      background: rgba(79, 142, 247, 0.16);
      color: var(--accent);
    }

    .empty-state {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      color: var(--text-2);
      padding: 40px 30px;
      text-align: center;
    }

    .empty-state h2 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 18px;
      letter-spacing: 0;
      margin: 0 0 6px;
    }

    .empty-state p { margin: 0; }

    .credentials-table table { min-width: 980px; }

    .groups { display: grid; gap: 16px; }

    .group {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .group-head {
      align-items: center;
      background: var(--bg-3);
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 13px 18px;
    }

    .group-head h2 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 14px;
      letter-spacing: 0;
      margin: 0;
    }

    .group .table-wrap { border: none; border-radius: 0; }

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

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
      .credentials-header { align-items: stretch; flex-direction: column; }
      .toolbar-actions { margin-left: 0; }
      .filter-field { flex: 1 1 100%; }
      .summary-grid { grid-template-columns: 1fr; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialesComponent {
  private readonly service = inject(CredencialesService);
  private readonly facade = inject(ManagementFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = this.facade.projects;
  protected readonly credenciales = signal<CredencialListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly tipoFilter = signal<TipoCredencial | null>(null);
  protected readonly estadoFilter = signal<EstadoFiltro>('todos');
  protected readonly groupBy = signal<GroupBy>('none');

  protected readonly formOpen = signal(false);
  protected readonly importOpen = signal(false);
  protected readonly editing = signal<CredencialListItem | null>(null);
  protected readonly revealed = signal<CredencialReveal | null>(null);
  protected readonly revealSource = signal<CredencialListItem | null>(null);
  protected readonly copiedKey = signal<string | null>(null);

  protected readonly tipoOptions: TipoCredencialOption[] = TIPO_CREDENCIAL_OPTIONS;

  protected readonly filtered = computed(() => {
    const tokens = normalizar(this.search()).split(/\s+/).filter(Boolean);
    const tipo = this.tipoFilter();
    const estado = this.estadoFilter();

    return this.credenciales().filter(item => {
      if (tipo && item.tipo !== tipo) return false;
      if (!this.matchesEstado(item, estado)) return false;
      if (tokens.length === 0) return true;

      const haystack = normalizar([
        item.nombre, item.servidor, item.host, item.usuario, item.url, item.notas,
        item.proyectoNombre, item.ambienteNombre,
        ...Object.values(item.camposExtra ?? {})
      ].filter(Boolean).join(' '));

      return tokens.every(token => haystack.includes(token));
    });
  });

  protected readonly groups = computed<CredencialGroup[]>(() => {
    const map = new Map<string, CredencialGroup>();
    for (const item of this.filtered()) {
      const key = item.ambienteId ?? '__none__';
      const label = item.ambienteNombre ?? 'Sin ambiente';
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(item);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  protected readonly infraCount = computed(() =>
    this.credenciales().filter(c => ['Servidor', 'SSHKey', 'VPN', 'RDP', 'Tunel', 'FTP'].includes(c.tipo)).length
  );
  protected readonly secretosCount = computed(() => this.credenciales().length - this.infraCount());
  protected readonly porVencerCount = computed(() =>
    this.credenciales().filter(c => c.diasParaVencer >= 0 && c.diasParaVencer <= 30).length
  );
  protected readonly vencidasCount = computed(() => this.credenciales().filter(c => c.diasParaVencer < 0).length);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.getCredenciales(this.selectedProjectId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (items) => this.credenciales.set(items),
        error: (error: unknown) => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar las credenciales.'))
      });
  }

  protected onProjectFilterChange(value: string | null): void {
    this.selectedProjectId.set(value);
    this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(item: CredencialListItem): void {
    this.editing.set(item);
    this.formOpen.set(true);
  }

  protected onFormClosed(saved: boolean): void {
    this.formOpen.set(false);
    this.editing.set(null);
    if (saved) {
      this.load();
      this.facade.refresh();
    }
  }

  protected onImportClosed(imported: boolean): void {
    this.importOpen.set(false);
    if (imported) {
      this.load();
      this.facade.refresh();
    }
  }

  protected exportar(): void {
    exportarCredenciales(this.filtered());
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
          this.load();
          this.facade.refresh();
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

  protected expirationTone = expirationTone;
  protected expirationLabel = expirationLabel;

  protected formatDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  private matchesEstado(item: CredencialListItem, estado: EstadoFiltro): boolean {
    switch (estado) {
      case 'vigente': return item.diasParaVencer > 30;
      case 'porvencer': return item.diasParaVencer >= 0 && item.diasParaVencer <= 30;
      case 'vencida': return item.diasParaVencer < 0;
      default: return true;
    }
  }
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}
