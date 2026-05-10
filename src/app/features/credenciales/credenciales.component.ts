import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, finalize, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Ambiente, tipoAmbienteLabel } from '../../core/models/ambientes.models';
import {
  CredencialListItem,
  CredencialReveal,
  TipoCredencial,
  TipoCredencialOption,
  expirationLabel,
  expirationTone
} from '../../core/models/credenciales.models';
import { AmbientesService } from '../../core/services/ambientes.service';
import { CredencialesService } from '../../core/services/credenciales.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

interface CredencialFormState {
  id?: string;
  nombre: string;
  tipo: TipoCredencial | null;
  servidor: string;
  proyectoId: string;
  ambienteId: string | null;
  fechaVencimiento: string;
  valor: string;
}

@Component({
  selector: 'cp-credenciales',
  standalone: true,
  imports: [
    FormsModule,
    NgSelectModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective
  ],
  template: `
    <section class="page credentials-page">
      <header class="page-header credentials-header">
        <div>
          <h1 class="page-title">Credenciales</h1>
          <p class="page-subtitle">Acceso protegido, revelado temporal y auditoría automática</p>
        </div>

        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'credenciales.crear'">
          <i-lucide name="plus" [size]="16" [strokeWidth]="2.4" />
          Nueva credencial
        </button>
      </header>

      <div class="toolbar">
        <div class="filter-field">
          <label class="form-label">Proyecto</label>
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

        <button class="btn btn-secondary" type="button" (click)="load()">
          Actualizar
        </button>
      </div>

      @if (errorMessage()) {
        <div class="alert-row warn">
          <i-lucide name="triangle-alert" [size]="15" [strokeWidth]="2.2" />
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <div class="table-wrap credentials-table">
        <table>
          <thead>
            <tr>
              <th>Credencial</th>
              <th>Tipo</th>
              <th>Proyecto</th>
              <th>Ambiente</th>
              <th>Servidor</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="7" class="empty-cell">Cargando credenciales...</td>
              </tr>
            } @else if (credenciales().length === 0) {
              <tr>
                <td colspan="7" class="empty-cell">No hay credenciales registradas.</td>
              </tr>
            } @else {
              @for (item of credenciales(); track item.id) {
                <tr>
                  <td>
                    <div class="credential-name">
                      <span class="credential-icon">
                        <i-lucide name="key-round" [size]="16" [strokeWidth]="2.3" />
                      </span>
                      <div>
                        <div class="data-name">{{ item.nombre }}</div>
                        <p class="item-meta">Creada: {{ formatDate(item.fechaCreacion) }}</p>
                      </div>
                    </div>
                  </td>
                  <td><cp-badge [label]="tipoLabel(item.tipo)" tone="purple" /></td>
                  <td>{{ item.proyectoNombre }}</td>
                  <td>
                    @if (item.ambienteNombre) {
                      <cp-badge [label]="item.ambienteNombre" tone="teal" />
                    } @else {
                      <span class="muted">Sin ambiente</span>
                    }
                  </td>
                  <td><span class="mono">{{ item.servidor }}</span></td>
                  <td>
                    <cp-badge [label]="expirationLabel(item)" [tone]="expirationTone(item)" />
                  </td>
                  <td>
                    <div class="actions">
                      <button
                        class="icon-button"
                        type="button"
                        title="Revelar"
                        (click)="reveal(item)"
                        *appHasPermission="'credenciales.revelar'"
                      >
                        <i-lucide name="eye" [size]="16" [strokeWidth]="2.1" />
                      </button>
                      <button
                        class="icon-button"
                        type="button"
                        title="Editar"
                        (click)="openEdit(item)"
                        *appHasPermission="'credenciales.editar'"
                      >
                        <i-lucide name="edit-3" [size]="16" [strokeWidth]="2.1" />
                      </button>
                      <button
                        class="icon-button danger"
                        type="button"
                        title="Eliminar"
                        (click)="confirmDelete(item)"
                        *appHasPermission="'credenciales.editar'"
                      >
                        <i-lucide name="trash-2" [size]="16" [strokeWidth]="2.1" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (formOpen()) {
        <div class="dialog-overlay" (click)="closeForm()">
          <form class="dialog-panel credential-dialog" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <h2 class="dialog-title">{{ editing() ? 'Editar credencial' : 'Nueva credencial' }}</h2>

            <div class="form-grid">
              <div class="form-field">
                <label class="form-label">Nombre</label>
                <input class="form-input" name="nombre" [(ngModel)]="form.nombre" required maxlength="160" />
              </div>

              <div class="form-field">
                <label class="form-label">Tipo</label>
                <ng-select
                  name="tipo"
                  [(ngModel)]="form.tipo"
                  [items]="tipoOptions"
                  bindLabel="label"
                  bindValue="value"
                  [clearable]="false"
                  placeholder="Seleccionar tipo"
                  appendTo="body"
                  required
                />
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Proyecto</label>
              <ng-select
                name="proyectoId"
                [ngModel]="form.proyectoId"
                (ngModelChange)="onFormProjectChange($event)"
                [clearable]="false"
                placeholder="Seleccionar proyecto"
                appendTo="body"
                required
              >
                @for (project of projects(); track project.id) {
                  <ng-option [value]="project.id">{{ project.clientName }} · {{ project.name }}</ng-option>
                }
              </ng-select>
              <p class="field-help">El proyecto limita los ambientes disponibles y ayuda a ubicar la credencial.</p>
            </div>

            <div class="form-field">
              <label class="form-label">Ambiente</label>
              <ng-select
                name="ambienteId"
                [(ngModel)]="form.ambienteId"
                placeholder="Sin ambiente específico"
                appendTo="body"
              >
                <ng-option [value]="null">Sin ambiente específico</ng-option>
                @for (ambiente of formAmbientes(); track ambiente.id) {
                  <ng-option [value]="ambiente.id">{{ ambiente.nombre }} · {{ ambienteTipoLabel(ambiente) }}</ng-option>
                }
              </ng-select>
              <p class="field-help">
                Opcional. Selecciona el ambiente cuando la clave pertenece a Producción, Staging, QA o Desarrollo.
              </p>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label class="form-label">Servidor / servicio</label>
                <input class="form-input" name="servidor" [(ngModel)]="form.servidor" required maxlength="220" />
              </div>

              <div class="form-field">
                <label class="form-label">Fecha de vencimiento</label>
                <input class="form-input" type="date" name="fechaVencimiento" [(ngModel)]="form.fechaVencimiento" required />
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">{{ editing() ? 'Nuevo valor (opcional)' : 'Valor' }}</label>
              <textarea
                class="form-input secret-input"
                name="valor"
                [(ngModel)]="form.valor"
                [required]="!editing()"
                rows="4"
                autocomplete="off"
                spellcheck="false"
              ></textarea>
              <p class="field-help">
                En edición déjalo vacío si no quieres rotar el valor. Por seguridad nunca se pre-rellena.
              </p>
            </div>

            <div class="dialog-actions">
              <button class="btn btn-secondary" type="button" (click)="closeForm()">Cancelar</button>
              <button class="btn btn-primary" type="submit" [disabled]="saving() || !isFormValid()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (revealed(); as secret) {
        <div class="dialog-overlay" (click)="closeReveal()">
          <div class="dialog-panel reveal-dialog" (click)="$event.stopPropagation()">
            <div class="reveal-header">
              <div>
                <h2 class="dialog-title">{{ secret.nombre }}</h2>
                <p class="item-meta">Se ocultará automáticamente en {{ remainingSeconds() }}s</p>
              </div>
              <button class="icon-button" type="button" title="Cerrar" (click)="closeReveal()">
                <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
              </button>
            </div>

            <pre class="secret-box">{{ secret.valor }}</pre>
          </div>
        </div>
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

    .toolbar {
      align-items: end;
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
      max-width: 620px;
    }

    .filter-field {
      flex: 1;
      min-width: 260px;
    }

    .form-label {
      color: var(--text-2);
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .credentials-table table {
      min-width: 980px;
    }

    .credential-name {
      align-items: center;
      display: flex;
      gap: 10px;
      min-width: 0;
    }

    .credential-icon {
      align-items: center;
      background: rgba(79, 142, 247, 0.13);
      border: 1px solid rgba(79, 142, 247, 0.24);
      border-radius: var(--radius);
      color: var(--accent);
      display: inline-flex;
      height: 34px;
      justify-content: center;
      width: 34px;
    }

    .actions {
      display: flex;
      gap: 7px;
    }

    .icon-button.danger:hover {
      border-color: rgba(229, 83, 83, 0.42);
      color: var(--red);
    }

    .empty-cell {
      color: var(--text-2);
      padding: 30px 16px;
      text-align: center;
    }

    .dialog-overlay {
      align-items: center;
      animation: fade-in 0.15s ease;
      background: rgba(0, 0, 0, 0.66);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 20px;
      position: fixed;
      z-index: 120;
    }

    .dialog-panel {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.52);
      max-height: calc(100vh - 40px);
      overflow: visible;
      padding: 28px;
      width: min(720px, calc(100vw - 32px));
    }

    .credential-dialog {
      overflow-y: auto;
    }

    .dialog-title {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.2;
      margin: 0 0 20px;
    }

    .form-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .form-field {
      margin-bottom: 14px;
    }

    .form-input {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      min-height: 42px;
      outline: none;
      padding: 10px 12px;
      transition: border-color 0.16s ease;
      width: 100%;
    }

    .form-input:focus {
      border-color: var(--accent);
    }

    .field-help {
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0 0;
    }

    .secret-input {
      font-family: var(--font-mono);
      min-height: 92px;
      resize: vertical;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .reveal-dialog {
      width: min(620px, calc(100vw - 32px));
    }

    .reveal-header {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .secret-box {
      background: #07090d;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--green);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      margin: 16px 0 0;
      max-height: 340px;
      overflow: auto;
      padding: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 760px) {
      .credentials-header,
      .toolbar {
        align-items: stretch;
        flex-direction: column;
      }

      .filter-field {
        min-width: 0;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialesComponent implements OnDestroy {
  private readonly service = inject(CredencialesService);
  private readonly ambientesService = inject(AmbientesService);
  private readonly facade = inject(ManagementFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = this.facade.projects;
  protected readonly credenciales = signal<CredencialListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly formAmbientes = signal<Ambiente[]>([]);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CredencialListItem | null>(null);
  protected readonly revealed = signal<CredencialReveal | null>(null);
  protected readonly remainingSeconds = signal(0);

  protected readonly tipoOptions: TipoCredencialOption[] = [
    { value: 'BaseDatos', label: 'Base de datos' },
    { value: 'SSHKey', label: 'SSH Key' },
    { value: 'APIKey', label: 'API Key' },
    { value: 'ServiceAccount', label: 'Service Account' },
    { value: 'CertificadoSSL', label: 'Certificado SSL' },
    { value: 'Otro', label: 'Otro' }
  ];

  protected form: CredencialFormState = this.blankForm();
  private countdown: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
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
    this.form = this.blankForm();
    this.loadFormAmbientes(this.form.proyectoId);
    this.formOpen.set(true);
  }

  protected openEdit(item: CredencialListItem): void {
    this.editing.set(item);
    this.form = {
      id: item.id,
      nombre: item.nombre,
      tipo: item.tipo,
      servidor: item.servidor,
      proyectoId: item.proyectoId,
      ambienteId: item.ambienteId,
      fechaVencimiento: this.toDateInput(item.fechaVencimiento),
      valor: ''
    };
    this.loadFormAmbientes(item.proyectoId);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editing.set(null);
    this.form = this.blankForm();
  }

  protected save(): void {
    if (!this.isFormValid() || !this.form.tipo) return;

    this.saving.set(true);
    const edit = this.editing();
    const metadata = {
      nombre: this.form.nombre.trim(),
      tipo: this.form.tipo,
      servidor: this.form.servidor.trim(),
      proyectoId: this.form.proyectoId,
      ambienteId: this.form.ambienteId || null,
      fechaVencimiento: this.form.fechaVencimiento
    };

    const operation: Observable<unknown> = edit
      ? this.service.update(edit.id, metadata).pipe(
          switchMap(() => this.form.valor.trim() ? this.service.updateValor(edit.id, this.form.valor) : of(void 0))
        )
      : this.service.create({ ...metadata, valor: this.form.valor });

    operation
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open(edit ? 'Credencial actualizada.' : 'Credencial creada.', 'Cerrar', { duration: 2800 });
          this.closeForm();
          this.load();
          this.facade.refresh();
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar la credencial.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  protected reveal(item: CredencialListItem): void {
    this.service.reveal(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (secret) => {
          this.revealed.set(secret);
          this.startCountdown(secret.visiblePorSegundos || 30);
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo revelar la credencial.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  protected closeReveal(): void {
    this.clearCountdown();
    this.revealed.set(null);
    this.remainingSeconds.set(0);
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

  protected isFormValid(): boolean {
    const hasMetadata = !!this.form.nombre.trim()
      && !!this.form.tipo
      && !!this.form.servidor.trim()
      && !!this.form.proyectoId
      && !!this.form.fechaVencimiento;

    return hasMetadata && (!!this.editing() || !!this.form.valor.trim());
  }

  protected tipoLabel(tipo: TipoCredencial): string {
    return this.tipoOptions.find(option => option.value === tipo)?.label ?? tipo;
  }

  protected ambienteTipoLabel(ambiente: Ambiente): string {
    return tipoAmbienteLabel(ambiente.tipo);
  }

  protected expirationTone = expirationTone;
  protected expirationLabel = expirationLabel;

  protected formatDate(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  private blankForm(): CredencialFormState {
    return {
      nombre: '',
      tipo: 'APIKey',
      servidor: '',
      proyectoId: this.selectedProjectId() ?? '',
      ambienteId: null,
      fechaVencimiento: this.toDateInput(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()),
      valor: ''
    };
  }

  protected onFormProjectChange(proyectoId: string): void {
    this.form.proyectoId = proyectoId;
    this.form.ambienteId = null;
    this.loadFormAmbientes(proyectoId);
  }

  private loadFormAmbientes(proyectoId: string): void {
    this.formAmbientes.set([]);
    if (!proyectoId) return;

    this.ambientesService.getByProject(proyectoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.formAmbientes.set(items),
        error: () => this.formAmbientes.set([])
      });
  }

  private toDateInput(value: string): string {
    return value ? value.slice(0, 10) : '';
  }

  private startCountdown(seconds: number): void {
    this.clearCountdown();
    this.remainingSeconds.set(seconds);
    this.countdown = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      if (next <= 0) {
        this.closeReveal();
        return;
      }

      this.remainingSeconds.set(next);
    }, 1000);
  }

  private clearCountdown(): void {
    if (!this.countdown) return;
    clearInterval(this.countdown);
    this.countdown = null;
  }
}
