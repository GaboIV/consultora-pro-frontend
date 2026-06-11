import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
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
  FORMATO_SECRETO_META,
  FormatoSecreto,
  FormatoSecretoMeta,
  TIPO_CREDENCIAL_OPTIONS,
  TipoCredencial,
  TipoCredencialOption,
  connectionString,
  detectarFormatoSecreto,
  expirationLabel,
  expirationTone,
  tipoCredencialMeta
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
  host: string;
  puerto: number | null;
  usuario: string;
  url: string;
  notas: string;
  proyectoId: string;
  ambienteId: string | null;
  fechaVencimiento: string;
  valor: string;
}

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
    HasPermissionDirective
  ],
  template: `
    <section class="page credentials-page">
      <header class="page-header credentials-header">
        <div>
          <h1 class="page-title">Credenciales</h1>
          <p class="page-subtitle">Fuente única de los accesos a servidores, VPN, bases de datos y servicios. Revelado temporal y auditoría automática.</p>
        </div>

        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'credenciales.crear'">
          <i-lucide name="plus" [size]="16" [strokeWidth]="2.4" />
          Nueva credencial
        </button>
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
            placeholder="Buscar por nombre, host, usuario, servidor o URL…"
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
            <ng-option value="porvencer">Por vencer</ng-option>
            <ng-option value="vencida">Vencidas</ng-option>
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
                <th>Proyecto</th>
                <th>Ambiente</th>
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
              <span class="mono">{{ line }}</span>
            } @else {
              <span class="muted">—</span>
            }
            @if (item.usuario) {
              <p class="item-meta">usuario: {{ item.usuario }}</p>
            }
          </td>
          <td>{{ item.proyectoNombre }}</td>
          @if (showAmbiente) {
            <td>
              @if (item.ambienteNombre) {
                <cp-badge [label]="item.ambienteNombre" tone="teal" />
              } @else {
                <span class="muted">Sin ambiente</span>
              }
            </td>
          }
          <td><cp-badge [label]="expirationLabel(item)" [tone]="expirationTone(item)" /></td>
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
        <div class="dialog-overlay">
          <form class="dialog-panel credential-dialog" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <header class="dialog-head">
              <div class="dialog-head-copy">
                <span class="credential-icon" [class]="'tone-' + (form.tipo ? tipoMeta(form.tipo).tone : 'blue')">
                  <i-lucide [name]="form.tipo ? tipoMeta(form.tipo).icon : 'key-round'" [size]="18" [strokeWidth]="2.2" />
                </span>
                <div>
                  <h2 class="dialog-title">{{ editing() ? 'Editar credencial' : 'Nueva credencial' }}</h2>
                  <p class="dialog-sub">Registra el acceso completo, no solo el secreto.</p>
                </div>
              </div>
              <button class="icon-button" type="button" title="Cerrar" (click)="closeForm()">
                <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
              </button>
            </header>

            <div class="dialog-body">
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Nombre</label>
                  <input class="form-input" name="nombre" [(ngModel)]="form.nombre" required maxlength="160" placeholder="Ej. Servidor de producción Acme" />
                </div>

                <div class="form-field">
                  <label class="form-label">Tipo</label>
                  <ng-select
                    name="tipo"
                    [ngModel]="form.tipo"
                    (ngModelChange)="onTipoChange($event)"
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

              <div class="form-grid">
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
                </div>
              </div>

              <div class="section-label">Conexión</div>
              <div class="form-grid grid-host">
                <div class="form-field span-2">
                  <label class="form-label">Host / IP</label>
                  <input class="form-input mono-input" name="host" [(ngModel)]="form.host" maxlength="200" placeholder="db.prod.acme.com · 10.0.4.21" />
                </div>
                <div class="form-field">
                  <label class="form-label">Puerto</label>
                  <input class="form-input" type="number" name="puerto" [(ngModel)]="form.puerto" min="1" max="65535" placeholder="22" />
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">Usuario</label>
                  <input class="form-input mono-input" name="usuario" [(ngModel)]="form.usuario" maxlength="160" placeholder="root · admin · svc-deploy" autocomplete="off" />
                </div>
                <div class="form-field">
                  <label class="form-label">URL / Endpoint</label>
                  <input class="form-input mono-input" name="url" [(ngModel)]="form.url" maxlength="500" placeholder="https://… · vpn.acme.com" />
                </div>
              </div>

              <div class="form-field">
                <label class="form-label">Servidor / servicio</label>
                <input class="form-input" name="servidor" [(ngModel)]="form.servidor" required maxlength="220" placeholder="Etiqueta del servidor o servicio (AWS RDS, Cluster K8s, VPN corporativa…)" />
                <p class="field-help">Nombre humano del recurso. Úsalo para ubicar el acceso aunque el host cambie.</p>
              </div>

              <div class="section-label">Secreto y vigencia</div>
              <div class="form-grid">
                <div class="form-field">
                  <div class="secret-field-head">
                    <label class="form-label">{{ editing() ? 'Nuevo valor (opcional)' : 'Valor / secreto' }}</label>
                    <div class="secret-field-actions">
                      @if (secretoFormato()) {
                        <span class="format-chip">
                          <i-lucide [name]="formatoMeta(secretoFormato()!).icon" [size]="12" [strokeWidth]="2.2" />
                          {{ formatoMeta(secretoFormato()!).label }}
                        </span>
                      }
                      <label class="btn btn-secondary btn-sm" title="Cargar desde archivo (.ppk, .pem, .json…)">
                        <i-lucide name="upload" [size]="13" [strokeWidth]="2.2" />
                        Cargar archivo
                        <input type="file" style="display:none" accept=".ppk,.pem,.key,.json,.txt,.crt" (change)="onFileSelected($event)" />
                      </label>
                    </div>
                  </div>
                  <textarea
                    class="form-input secret-input"
                    name="valor"
                    [ngModel]="form.valor"
                    (ngModelChange)="onValorChange($event)"
                    [required]="!editing()"
                    rows="3"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Contraseña, token, clave privada, contenido del .ppk…"
                  ></textarea>
                  <p class="field-help">
                    {{ editing() ? 'Déjalo vacío para no rotar el valor. Por seguridad nunca se pre-rellena.' : 'Se cifra al guardar y solo se revela bajo auditoría.' }}
                  </p>
                </div>

                <div class="form-field">
                  <label class="form-label">Fecha de vencimiento</label>
                  <input class="form-input" type="date" name="fechaVencimiento" [(ngModel)]="form.fechaVencimiento" required />

                  <label class="form-label notes-label">Notas</label>
                  <textarea class="form-input" name="notas" [(ngModel)]="form.notas" rows="2" maxlength="1000" placeholder="MFA, jump host, ventana de mantenimiento…"></textarea>
                </div>
              </div>
            </div>

            <footer class="dialog-actions">
              <button class="btn btn-secondary" type="button" (click)="closeForm()">Cancelar</button>
              <button class="btn btn-primary" type="submit" [disabled]="saving() || !isFormValid()">
                {{ saving() ? 'Guardando…' : 'Guardar acceso' }}
              </button>
            </footer>
          </form>
        </div>
      }

      @if (revealed(); as secret) {
        <div class="dialog-overlay">
          <div class="dialog-panel reveal-dialog" (click)="$event.stopPropagation()">
            <header class="dialog-head">
              <div class="dialog-head-copy">
                @if (revealSource(); as src) {
                  <span class="credential-icon" [class]="'tone-' + tipoMeta(src.tipo).tone">
                    <i-lucide [name]="tipoMeta(src.tipo).icon" [size]="18" [strokeWidth]="2.2" />
                  </span>
                }
                <div>
                  <h2 class="dialog-title">{{ secret.nombre }}</h2>
                  <p class="dialog-sub countdown">
                    <i-lucide name="clock" [size]="13" [strokeWidth]="2.2" />
                    Se ocultará en {{ remainingSeconds() }}s
                  </p>
                </div>
              </div>
              <button class="icon-button" type="button" title="Cerrar" (click)="closeReveal()">
                <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
              </button>
            </header>

            <div class="dialog-body">
              @if (revealSource(); as src) {
                <div class="conn-grid">
                  @if (src.servidor) { <ng-container [ngTemplateOutlet]="connRow" [ngTemplateOutletContext]="{ label: 'Servidor', value: src.servidor, key: 'srv' }" /> }
                  @if (src.host) { <ng-container [ngTemplateOutlet]="connRow" [ngTemplateOutletContext]="{ label: 'Host', value: src.host, key: 'host', mono: true }" /> }
                  @if (src.puerto) { <ng-container [ngTemplateOutlet]="connRow" [ngTemplateOutletContext]="{ label: 'Puerto', value: src.puerto, key: 'port', mono: true }" /> }
                  @if (src.usuario) { <ng-container [ngTemplateOutlet]="connRow" [ngTemplateOutletContext]="{ label: 'Usuario', value: src.usuario, key: 'user', mono: true }" /> }
                  @if (src.url) { <ng-container [ngTemplateOutlet]="connRow" [ngTemplateOutletContext]="{ label: 'URL', value: src.url, key: 'url', mono: true }" /> }
                </div>

                @if (connString(src); as cs) {
                  <div class="conn-string">
                    <span class="form-label">Cadena de conexión</span>
                    <div class="conn-string-row">
                      <code>{{ cs }}</code>
                      <button class="icon-button" type="button" [title]="copiedKey() === 'cs' ? 'Copiado' : 'Copiar'" (click)="copy(cs, 'cs')">
                        <i-lucide [name]="copiedKey() === 'cs' ? 'check' : 'copy'" [size]="15" [strokeWidth]="2.1" />
                      </button>
                    </div>
                  </div>
                }

                @if (src.notas) {
                  <p class="reveal-notes"><i-lucide name="info" [size]="13" [strokeWidth]="2.2" /> {{ src.notas }}</p>
                }
              }

              <div class="secret-label-row">
                <span class="form-label">Secreto</span>
                @if (revealFormato(); as fmt) {
                  <span class="format-chip">
                    <i-lucide [name]="formatoMeta(fmt).icon" [size]="12" [strokeWidth]="2.2" />
                    {{ formatoMeta(fmt).label }}
                  </span>
                  <button class="btn btn-secondary btn-sm" type="button" (click)="downloadSecret()">
                    <i-lucide name="download" [size]="13" [strokeWidth]="2.2" />
                    Descargar .{{ formatoMeta(fmt).ext }}
                  </button>
                }
                @if (revealIsUrl()) {
                  <a class="btn btn-secondary btn-sm" [href]="revealed()!.valor.trim()" target="_blank" rel="noopener noreferrer">
                    <i-lucide name="external-link" [size]="13" [strokeWidth]="2.2" />
                    Abrir enlace
                  </a>
                }
                <button class="btn btn-secondary btn-sm" type="button" (click)="copy(secret.valor, 'secret')">
                  <i-lucide [name]="copiedKey() === 'secret' ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                  {{ copiedKey() === 'secret' ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
              <pre class="secret-box">{{ secret.valor }}</pre>
            </div>
          </div>
        </div>
      }

      <ng-template #connRow let-label="label" let-value="value" let-key="key" let-mono="mono">
        <div class="conn-row">
          <span class="conn-label">{{ label }}</span>
          <span class="conn-value" [class.mono]="mono">{{ value }}</span>
          <button class="icon-button" type="button" [title]="copiedKey() === key ? 'Copiado' : 'Copiar'" (click)="copy(value, key)">
            <i-lucide [name]="copiedKey() === key ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
          </button>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .credentials-header {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
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

    .form-label {
      color: var(--text-2);
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      margin-bottom: 6px;
      text-transform: uppercase;
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

    /* ---- Dialog ---- */
    .dialog-overlay {
      align-items: center;
      animation: fade-in 0.15s ease;
      background: rgba(0, 0, 0, 0.66);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 24px;
      position: fixed;
      z-index: 120;
    }

    .dialog-panel {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.52);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 48px);
      overflow: hidden;
      width: min(760px, calc(100vw - 32px));
    }

    .dialog-head {
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 20px 24px;
    }

    .dialog-head-copy {
      align-items: center;
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .dialog-head-copy .credential-icon { height: 40px; width: 40px; }

    .dialog-title {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.2;
      margin: 0;
    }

    .dialog-sub {
      color: var(--text-3);
      font-size: 12px;
      margin: 3px 0 0;
    }

    .dialog-sub.countdown {
      align-items: center;
      color: var(--amber);
      display: flex;
      gap: 5px;
    }

    .dialog-body {
      overflow-y: auto;
      padding: 22px 24px;
    }

    .section-label {
      color: var(--text-3);
      font-family: var(--font-head);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 8px 0 12px;
      text-transform: uppercase;
    }

    .form-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-bottom: 14px;
    }

    .grid-host { grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1fr); }
    .span-2 { grid-column: span 2; }

    .form-field { min-width: 0; }
    .notes-label { margin-top: 14px; }

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

    .form-input:focus { border-color: var(--accent); }
    .mono-input { font-family: var(--font-mono); font-size: 13px; }

    .field-help {
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0 0;
    }

    .secret-input {
      font-family: var(--font-mono);
      min-height: 72px;
      resize: vertical;
    }

    .dialog-actions {
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 24px;
    }

    /* ---- Reveal ---- */
    .reveal-dialog { width: min(620px, calc(100vw - 32px)); }

    .conn-grid {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .conn-row {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: grid;
      gap: 12px;
      grid-template-columns: 90px 1fr auto;
      padding: 8px 10px 8px 14px;
    }

    .conn-label {
      color: var(--text-3);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .conn-value {
      color: var(--text);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conn-value.mono { font-family: var(--font-mono); font-size: 13px; }

    .conn-string { margin-bottom: 16px; }

    .conn-string-row {
      align-items: center;
      background: #07090d;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      display: flex;
      gap: 10px;
      margin-top: 6px;
      padding: 8px 8px 8px 14px;
    }

    .conn-string-row code {
      color: var(--teal);
      flex: 1;
      font-family: var(--font-mono);
      font-size: 13px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .reveal-notes {
      align-items: center;
      color: var(--text-2);
      display: flex;
      font-size: 12px;
      gap: 6px;
      margin: 0 0 16px;
    }

    .secret-box {
      background: #07090d;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--green);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      max-height: 300px;
      overflow: auto;
      padding: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ---- Secret field header ---- */
    .secret-field-head {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .secret-field-head .form-label { margin-bottom: 0; }

    .secret-field-actions {
      align-items: center;
      display: flex;
      flex-shrink: 0;
      gap: 8px;
    }

    .format-chip {
      align-items: center;
      background: rgba(79, 142, 247, 0.1);
      border: 1px solid rgba(79, 142, 247, 0.22);
      border-radius: 999px;
      color: var(--accent);
      display: inline-flex;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      gap: 5px;
      padding: 3px 10px;
      white-space: nowrap;
    }

    .secret-label-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .secret-label-row .form-label { margin-bottom: 0; }

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
      .credentials-header { align-items: stretch; flex-direction: column; }
      .toolbar-actions { margin-left: 0; }
      .filter-field { flex: 1 1 100%; }
      .summary-grid { grid-template-columns: 1fr; }
      .form-grid, .grid-host { grid-template-columns: 1fr; }
      .span-2 { grid-column: auto; }
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
  protected readonly search = signal('');
  protected readonly tipoFilter = signal<TipoCredencial | null>(null);
  protected readonly estadoFilter = signal<EstadoFiltro>('todos');
  protected readonly groupBy = signal<GroupBy>('none');

  protected readonly formAmbientes = signal<Ambiente[]>([]);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CredencialListItem | null>(null);
  protected readonly revealed = signal<CredencialReveal | null>(null);
  protected readonly revealSource = signal<CredencialListItem | null>(null);
  protected readonly remainingSeconds = signal(0);
  protected readonly copiedKey = signal<string | null>(null);
  protected readonly secretoFormato = signal<FormatoSecreto | null>(null);
  protected readonly revealFormato = computed(() => {
    const s = this.revealed();
    return s ? detectarFormatoSecreto(s.valor) : null;
  });

  protected readonly revealIsUrl = computed(() => {
    const s = this.revealed();
    if (!s) return false;
    try {
      const u = new URL(s.valor.trim());
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch { return false; }
  });

  protected readonly tipoOptions: TipoCredencialOption[] = TIPO_CREDENCIAL_OPTIONS;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tipo = this.tipoFilter();
    const estado = this.estadoFilter();

    return this.credenciales().filter(item => {
      if (tipo && item.tipo !== tipo) return false;
      if (!this.matchesEstado(item, estado)) return false;
      if (!term) return true;

      const haystack = [item.nombre, item.servidor, item.host, item.usuario, item.url, item.proyectoNombre, item.ambienteNombre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
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
    this.credenciales().filter(c => ['Servidor', 'SSHKey', 'VPN', 'RDP', 'FTP'].includes(c.tipo)).length
  );
  protected readonly secretosCount = computed(() => this.credenciales().length - this.infraCount());
  protected readonly porVencerCount = computed(() =>
    this.credenciales().filter(c => c.diasParaVencer >= 0 && c.diasParaVencer <= 30).length
  );
  protected readonly vencidasCount = computed(() => this.credenciales().filter(c => c.diasParaVencer < 0).length);

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
      host: item.host ?? '',
      puerto: item.puerto ?? null,
      usuario: item.usuario ?? '',
      url: item.url ?? '',
      notas: item.notas ?? '',
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
    this.secretoFormato.set(null);
  }

  protected onValorChange(valor: string): void {
    this.form.valor = valor;
    this.secretoFormato.set(detectarFormatoSecreto(valor));
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.form.valor = content;
      this.secretoFormato.set(detectarFormatoSecreto(content));
    };
    reader.readAsText(file, 'utf-8');
    input.value = '';
  }

  protected downloadSecret(): void {
    const secret = this.revealed();
    const formato = this.revealFormato();
    if (!secret || !formato) return;

    const meta = FORMATO_SECRETO_META[formato];
    const blob = new Blob([secret.valor], { type: meta.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${secret.nombre}.${meta.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected formatoMeta(formato: FormatoSecreto): FormatoSecretoMeta {
    return FORMATO_SECRETO_META[formato];
  }

  protected save(): void {
    if (!this.isFormValid() || !this.form.tipo) return;

    this.saving.set(true);
    const edit = this.editing();
    const metadata = {
      nombre: this.form.nombre.trim(),
      tipo: this.form.tipo,
      servidor: this.form.servidor.trim(),
      host: this.form.host.trim() || null,
      puerto: this.form.puerto ?? null,
      usuario: this.form.usuario.trim() || null,
      url: this.form.url.trim() || null,
      notas: this.form.notas.trim() || null,
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
          this.revealSource.set(item);
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
    this.revealSource.set(null);
    this.remainingSeconds.set(0);
    this.copiedKey.set(null);
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

  protected copy(value: string | number | null | undefined, key: string): void {
    const text = value == null ? '' : String(value);
    if (!text || !navigator.clipboard) return;

    navigator.clipboard.writeText(text).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => {
        if (this.copiedKey() === key) this.copiedKey.set(null);
      }, 1500);
    }).catch(() => {
      this.snackBar.open('No se pudo copiar al portapapeles.', 'Cerrar', { duration: 2600 });
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

  protected tipoMeta(tipo: TipoCredencial): TipoCredencialOption {
    return tipoCredencialMeta(tipo);
  }

  protected tipoLabel(tipo: TipoCredencial): string {
    return tipoCredencialMeta(tipo).label;
  }

  protected accessLine(item: CredencialListItem): string | null {
    const host = (item.host || item.servidor || '').trim();
    if (!host) return null;
    return item.puerto ? `${host}:${item.puerto}` : host;
  }

  protected connString(item: CredencialListItem): string | null {
    return connectionString(item);
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

  protected onTipoChange(tipo: TipoCredencial | null): void {
    this.form.tipo = tipo;
    if (tipo && this.form.puerto == null) {
      const suggested = tipoCredencialMeta(tipo).defaultPort;
      if (suggested) this.form.puerto = suggested;
    }
  }

  protected onFormProjectChange(proyectoId: string): void {
    this.form.proyectoId = proyectoId;
    this.form.ambienteId = null;
    this.loadFormAmbientes(proyectoId);
  }

  private matchesEstado(item: CredencialListItem, estado: EstadoFiltro): boolean {
    switch (estado) {
      case 'vigente': return item.diasParaVencer > 30;
      case 'porvencer': return item.diasParaVencer >= 0 && item.diasParaVencer <= 30;
      case 'vencida': return item.diasParaVencer < 0;
      default: return true;
    }
  }

  private blankForm(): CredencialFormState {
    return {
      nombre: '',
      tipo: 'Servidor',
      servidor: '',
      host: '',
      puerto: 22,
      usuario: '',
      url: '',
      notas: '',
      proyectoId: this.selectedProjectId() ?? '',
      ambienteId: null,
      fechaVencimiento: this.toDateInput(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()),
      valor: ''
    };
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
