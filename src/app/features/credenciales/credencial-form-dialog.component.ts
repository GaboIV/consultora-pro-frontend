import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, of, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Ambiente, tipoAmbienteLabel } from '../../core/models/ambientes.models';
import {
  CampoEspecifico,
  puertoSugerido,
  schemaDe,
  validarCamposPorTipo
} from '../../core/models/credencial-schema';
import {
  CredencialListItem,
  FORMATO_SECRETO_META,
  FormatoSecreto,
  TIPO_CREDENCIAL_OPTIONS,
  TipoCredencial,
  detectarFormatoSecreto,
  tipoCredencialMeta
} from '../../core/models/credenciales.models';
import { AmbientesService } from '../../core/services/ambientes.service';
import { CredencialesService } from '../../core/services/credenciales.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';

/**
 * Modal de creación/edición con motor de formulario dinámico: los campos
 * específicos se renderizan desde CREDENCIAL_SCHEMAS según el tipo elegido,
 * con micro-animaciones de entrada, drag & drop de claves y puertos por motor.
 */
@Component({
  selector: 'cp-credencial-form-dialog',
  standalone: true,
  imports: [FormsModule, NgSelectModule, LucideAngularModule, MatSnackBarModule],
  template: `
    <div class="cp-modal-overlay">
      <form class="cp-modal cp-modal--lg credential-dialog" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <header class="dialog-head">
          <div class="dialog-head-copy">
            <span class="credential-icon" [class]="'tone-' + tipoMeta().tone">
              <i-lucide [name]="tipoMeta().icon" [size]="18" [strokeWidth]="2.2" />
            </span>
            <div>
              <h2 class="dialog-title">{{ editing() ? 'Editar credencial' : 'Nueva credencial' }}</h2>
              <p class="dialog-sub">Registra el acceso completo, no solo el secreto.</p>
            </div>
          </div>
          <button class="icon-button" type="button" title="Cerrar" (click)="cancel()">
            <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
          </button>
        </header>

        <div class="dialog-body">
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">Nombre <span class="req">*</span></label>
              <input class="form-input" name="nombre" [(ngModel)]="form.nombre" required maxlength="160" placeholder="Ej. Servidor de producción Acme" />
            </div>

            <div class="form-field">
              <label class="form-label">Tipo <span class="req">*</span></label>
              <ng-select
                name="tipo"
                [ngModel]="tipo()"
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
              <label class="form-label">Proyecto <span class="req">*</span></label>
              <ng-select
                name="proyectoId"
                [ngModel]="form.proyectoId"
                (ngModelChange)="onProjectChange($event)"
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
              <ng-select name="ambienteId" [(ngModel)]="form.ambienteId" placeholder="Sin ambiente específico" appendTo="body">
                <ng-option [value]="null">Sin ambiente específico</ng-option>
                @for (ambiente of formAmbientes(); track ambiente.id) {
                  <ng-option [value]="ambiente.id">{{ ambiente.nombre }} · {{ ambienteTipoLabel(ambiente) }}</ng-option>
                }
              </ng-select>
            </div>
          </div>

          <div class="section-label">Conexión · {{ tipoMeta().label }}</div>
          <div class="form-grid">
            @for (campo of schema().campos; track trackCampo(campo)) {
              <div class="form-field dyn-field" [class.span-2]="campo.span2">
                <label class="form-label">
                  {{ campo.label }}
                  @if (campo.required) { <span class="req">*</span> }
                  @if (campo.secreto) {
                    <span class="secret-mark" title="Se guarda cifrado">
                      <i-lucide name="lock-keyhole" [size]="11" [strokeWidth]="2.4" />
                    </span>
                  }
                </label>
                @switch (campo.type) {
                  @case ('select') {
                    <ng-select
                      [name]="campo.key"
                      [items]="campo.options ?? []"
                      [ngModel]="valores[campo.key] || null"
                      (ngModelChange)="onCampoChange(campo, $event)"
                      [placeholder]="campo.placeholder || 'Seleccionar'"
                      appendTo="body"
                    />
                  }
                  @case ('textarea') {
                    <textarea
                      class="form-input"
                      [class.mono-input]="campo.mono"
                      [name]="campo.key"
                      [ngModel]="valores[campo.key] || ''"
                      (ngModelChange)="onCampoChange(campo, $event)"
                      rows="2"
                      autocomplete="off"
                      spellcheck="false"
                      [placeholder]="campo.placeholder || ''"
                    ></textarea>
                  }
                  @case ('password') {
                    <input
                      class="form-input mono-input"
                      type="password"
                      [name]="campo.key"
                      [ngModel]="valores[campo.key] || ''"
                      (ngModelChange)="onCampoChange(campo, $event)"
                      autocomplete="new-password"
                      [placeholder]="campo.placeholder || ''"
                    />
                  }
                  @case ('number') {
                    <input
                      class="form-input"
                      type="number"
                      [name]="campo.key"
                      [ngModel]="valores[campo.key] || null"
                      (ngModelChange)="onCampoChange(campo, $event)"
                      min="1"
                      max="65535"
                      [placeholder]="campo.placeholder || ''"
                    />
                  }
                  @default {
                    <input
                      class="form-input"
                      [class.mono-input]="campo.mono"
                      type="text"
                      [name]="campo.key"
                      [ngModel]="valores[campo.key] || ''"
                      (ngModelChange)="onCampoChange(campo, $event)"
                      autocomplete="off"
                      [placeholder]="campo.placeholder || ''"
                    />
                  }
                }
                @if (campo.help) { <p class="field-help">{{ campo.help }}</p> }
              </div>
            }
          </div>

          <div class="section-label">Secreto y vigencia</div>
          <div class="form-grid">
            <div class="form-field">
              <div class="secret-field-head">
                <label class="form-label">
                  {{ editing() ? schema().valorLabel + ' (nuevo valor, opcional)' : schema().valorLabel }}
                  @if (!editing()) { <span class="req">*</span> }
                </label>
                <div class="secret-field-actions">
                  @if (secretoFormato(); as fmt) {
                    <span class="format-chip">
                      <i-lucide [name]="formatoIcon(fmt)" [size]="12" [strokeWidth]="2.2" />
                      {{ formatoLabel(fmt) }}
                    </span>
                  }
                  @if (schema().valorFileDrop) {
                    <label class="btn btn-secondary btn-sm" title="Cargar desde archivo (.ppk, .pem, .key, .json…)">
                      <i-lucide name="upload" [size]="13" [strokeWidth]="2.2" />
                      Cargar archivo
                      <input type="file" style="display:none" accept=".ppk,.pem,.key,.json,.txt,.crt" (change)="onFileSelected($event)" />
                    </label>
                  }
                </div>
              </div>
              <div
                class="drop-zone"
                [class.dragging]="dragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="dragging.set(false)"
                (drop)="onFileDrop($event)"
              >
                <textarea
                  class="form-input secret-input"
                  name="valor"
                  [ngModel]="valor"
                  (ngModelChange)="onValorChange($event)"
                  [required]="!editing()"
                  rows="3"
                  autocomplete="off"
                  spellcheck="false"
                  [placeholder]="schema().valorPlaceholder"
                ></textarea>
                @if (dragging()) {
                  <div class="drop-hint">
                    <i-lucide name="download" [size]="18" [strokeWidth]="2.2" />
                    Suelta el archivo para cargar su contenido
                  </div>
                }
              </div>
              <p class="field-help">
                {{ editing() ? 'Déjalo vacío para no rotar el valor. Por seguridad nunca se pre-rellena.' : 'Se cifra al guardar (AES-256-GCM) y solo se revela bajo auditoría.' }}
              </p>
            </div>

            <div class="form-field">
              <label class="form-label">Fecha de vencimiento <span class="req">*</span></label>
              <input class="form-input" type="date" name="fechaVencimiento" [(ngModel)]="form.fechaVencimiento" required />

              <label class="form-label notes-label">Notas</label>
              <textarea class="form-input" name="notas" [(ngModel)]="form.notas" rows="2" maxlength="1000" placeholder="MFA, jump host, ventana de mantenimiento…"></textarea>
            </div>
          </div>

          @if (erroresTipo().length > 0) {
            <div class="type-errors">
              @for (error of erroresTipo(); track error) {
                <p><i-lucide name="triangle-alert" [size]="13" [strokeWidth]="2.2" /> {{ error }}</p>
              }
            </div>
          }
        </div>

        <footer class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="saving() || !isFormValid()">
            {{ saving() ? 'Guardando…' : 'Guardar acceso' }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
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

    .credential-icon {
      align-items: center;
      background: color-mix(in srgb, var(--tone-color, var(--accent)) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone-color, var(--accent)) 28%, transparent);
      border-radius: var(--radius);
      color: var(--tone-color, var(--accent));
      display: inline-flex;
      flex: 0 0 auto;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .credential-icon.tone-blue { --tone-color: var(--accent); }
    .credential-icon.tone-green { --tone-color: var(--green); }
    .credential-icon.tone-amber { --tone-color: var(--amber); }
    .credential-icon.tone-purple { --tone-color: var(--purple); }
    .credential-icon.tone-red { --tone-color: var(--red); }
    .credential-icon.tone-teal { --tone-color: var(--teal); }
    .credential-icon.tone-gray { --tone-color: var(--text-3); }

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

    .span-2 { grid-column: span 2; }
    .form-field { min-width: 0; }
    .notes-label { margin-top: 14px; }

    /* Micro-animación de entrada para los campos dinámicos del tipo */
    .dyn-field {
      animation: field-in 0.24s ease both;
    }

    @keyframes field-in {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-label {
      align-items: center;
      color: var(--text-2);
      display: flex;
      font-size: 11px;
      font-weight: 700;
      gap: 5px;
      letter-spacing: 0;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .req { color: var(--amber); }
    .secret-mark { color: var(--teal); display: inline-flex; }

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
      min-height: 86px;
      resize: vertical;
    }

    .drop-zone { position: relative; }

    .drop-zone.dragging .secret-input {
      border-color: var(--accent);
      border-style: dashed;
    }

    .drop-hint {
      align-items: center;
      background: color-mix(in srgb, var(--bg-2) 86%, transparent);
      border-radius: var(--radius);
      color: var(--accent);
      display: flex;
      flex-direction: column;
      font-size: 12px;
      font-weight: 600;
      gap: 6px;
      inset: 0;
      justify-content: center;
      pointer-events: none;
      position: absolute;
    }

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

    .type-errors {
      background: color-mix(in srgb, var(--amber) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--amber) 26%, transparent);
      border-radius: var(--radius);
      padding: 10px 14px;
    }

    .type-errors p {
      align-items: center;
      color: var(--amber);
      display: flex;
      font-size: 12px;
      gap: 7px;
      margin: 3px 0;
    }

    .dialog-actions {
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 24px;
    }

    @media (max-width: 760px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: auto; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialFormDialogComponent implements OnInit {
  private readonly service = inject(CredencialesService);
  private readonly ambientesService = inject(AmbientesService);
  private readonly facade = inject(ManagementFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly editing = input<CredencialListItem | null>(null);
  readonly defaultProjectId = input<string | null>(null);
  /** Emite true cuando se guardó; false si se canceló. */
  readonly closed = output<boolean>();

  protected readonly projects = this.facade.projects;
  protected readonly tipoOptions = TIPO_CREDENCIAL_OPTIONS;
  protected readonly formAmbientes = signal<Ambiente[]>([]);
  protected readonly saving = signal(false);
  protected readonly dragging = signal(false);
  protected readonly secretoFormato = signal<FormatoSecreto | null>(null);
  protected readonly tipo = signal<TipoCredencial>('Servidor');
  protected readonly schema = computed(() => schemaDe(this.tipo()));
  protected readonly tipoMeta = computed(() => tipoCredencialMeta(this.tipo()));

  protected form = {
    nombre: '',
    proyectoId: '',
    ambienteId: null as string | null,
    fechaVencimiento: '',
    notas: ''
  };

  /** Valores planos de los campos dinámicos (base + extras + secretos extra). */
  protected valores: Record<string, string> = {};
  protected valor = '';
  /** Bump para reanimar los campos al cambiar de tipo. */
  private animEpoch = 0;
  private servidorOriginal = '';

  // El recálculo se dispara desde los handlers (onCampoChange/onTipoChange) vía señal.
  private readonly validacionTick = signal(0);
  protected readonly erroresTipo = computed<string[]>(() => {
    this.validacionTick();
    return validarCamposPorTipo(this.tipo(), this.snapshotValores());
  });

  ngOnInit(): void {
    const item = this.editing();
    if (item) {
      this.tipo.set(item.tipo);
      this.form = {
        nombre: item.nombre,
        proyectoId: item.proyectoId,
        ambienteId: item.ambienteId,
        fechaVencimiento: item.fechaVencimiento ? item.fechaVencimiento.slice(0, 10) : '',
        notas: item.notas ?? ''
      };
      this.servidorOriginal = item.servidor;
      this.valores = {
        ...(item.camposExtra ?? {}),
        ...(item.host ? { host: item.host } : {}),
        ...(item.puerto != null ? { puerto: String(item.puerto) } : {}),
        ...(item.usuario ? { usuario: item.usuario } : {}),
        ...(item.url ? { url: item.url } : {})
      };
      this.loadAmbientes(item.proyectoId);
    } else {
      this.form.proyectoId = this.defaultProjectId() ?? '';
      this.form.fechaVencimiento = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const puerto = puertoSugerido(this.tipo());
      if (puerto) this.valores['puerto'] = String(puerto);
      if (this.form.proyectoId) this.loadAmbientes(this.form.proyectoId);
    }
  }

  protected trackCampo(campo: CampoEspecifico): string {
    return `${this.animEpoch}:${campo.key}`;
  }

  protected onTipoChange(tipo: TipoCredencial | null): void {
    if (!tipo) return;
    this.tipo.set(tipo);
    this.animEpoch++;

    const actual = Number(this.valores['puerto']) || null;
    const sugerido = puertoSugerido(tipo, this.valores['motor']);
    if (sugerido && (actual == null || this.esPuertoConocido(actual))) {
      this.valores['puerto'] = String(sugerido);
    }
    this.validacionTick.update(v => v + 1);
  }

  protected onCampoChange(campo: CampoEspecifico, value: unknown): void {
    this.valores[campo.key] = value == null ? '' : String(value);

    if (campo.key === 'motor') {
      const actual = Number(this.valores['puerto']) || null;
      const sugerido = puertoSugerido(this.tipo(), this.valores['motor']);
      if (sugerido && (actual == null || this.esPuertoConocido(actual))) {
        this.valores['puerto'] = String(sugerido);
      }
    }
    this.validacionTick.update(v => v + 1);
  }

  protected onValorChange(valor: string): void {
    this.valor = valor;
    this.secretoFormato.set(detectarFormatoSecreto(valor));
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readSecretFile(file);
  }

  protected onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) this.readSecretFile(file);
    fileInput.value = '';
  }

  protected formatoLabel(formato: FormatoSecreto): string {
    return FORMATO_SECRETO_META[formato].label;
  }

  protected formatoIcon(formato: FormatoSecreto): string {
    return FORMATO_SECRETO_META[formato].icon;
  }

  protected ambienteTipoLabel(ambiente: Ambiente): string {
    return tipoAmbienteLabel(ambiente.tipo);
  }

  protected onProjectChange(proyectoId: string): void {
    this.form.proyectoId = proyectoId;
    this.form.ambienteId = null;
    this.loadAmbientes(proyectoId);
  }

  protected cancel(): void {
    if (!this.saving()) this.closed.emit(false);
  }

  protected isFormValid(): boolean {
    const base = !!this.form.nombre.trim() && !!this.form.proyectoId && !!this.form.fechaVencimiento;
    const valorOk = !!this.editing() || !!this.valor.trim();
    const secretosSinValor = !!this.editing() && !this.valor.trim() && Object.keys(this.buildSecretosExtra() ?? {}).length > 0;
    return base && valorOk && !secretosSinValor && this.erroresTipo().length === 0;
  }

  protected save(): void {
    if (!this.isFormValid()) return;

    this.saving.set(true);
    const edit = this.editing();
    const snapshot = this.snapshotValores();
    const metadata = {
      nombre: this.form.nombre.trim(),
      tipo: this.tipo(),
      servidor: this.servidorOriginal.trim() || this.form.nombre.trim(),
      host: snapshot.host,
      puerto: snapshot.puerto,
      usuario: snapshot.usuario,
      url: snapshot.url,
      notas: this.form.notas.trim() || null,
      camposExtra: snapshot.camposExtra,
      proyectoId: this.form.proyectoId,
      ambienteId: this.form.ambienteId || null,
      fechaVencimiento: this.form.fechaVencimiento
    };

    const secretosExtra = this.buildSecretosExtra();
    const operation: Observable<unknown> = edit
      ? this.service.update(edit.id, metadata).pipe(
          switchMap(() => this.valor.trim()
            ? this.service.updateValor(edit.id, this.valor, secretosExtra)
            : of(void 0))
        )
      : this.service.create({ ...metadata, valor: this.valor, secretosExtra });

    operation
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open(edit ? 'Credencial actualizada.' : 'Credencial creada.', 'Cerrar', { duration: 2800 });
          this.closed.emit(true);
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar la credencial.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  /** Separa los valores planos en columnas base, camposExtra y deja fuera los secretos. */
  private snapshotValores(): {
    host: string | null; puerto: number | null; usuario: string | null; url: string | null;
    camposExtra: Record<string, string> | null;
  } {
    const schema = this.schema();
    let host: string | null = null;
    let puerto: number | null = null;
    let usuario: string | null = null;
    let url: string | null = null;
    const camposExtra: Record<string, string> = {};

    for (const campo of schema.campos) {
      const raw = (this.valores[campo.key] ?? '').trim();
      if (!raw) continue;

      if (campo.base === 'host') host = raw;
      else if (campo.base === 'puerto') puerto = Number(raw) || null;
      else if (campo.base === 'usuario') usuario = raw;
      else if (campo.base === 'url') url = raw;
      else if (!campo.secreto) camposExtra[campo.key] = raw;
    }

    return { host, puerto, usuario, url, camposExtra: Object.keys(camposExtra).length ? camposExtra : null };
  }

  private buildSecretosExtra(): Record<string, string> | null {
    const secretos: Record<string, string> = {};
    for (const campo of this.schema().campos) {
      if (!campo.secreto) continue;
      const raw = this.valores[campo.key] ?? '';
      if (raw) secretos[campo.key] = raw;
    }
    return Object.keys(secretos).length ? secretos : null;
  }

  private esPuertoConocido(puerto: number): boolean {
    const defaults = new Set<number>([22, 21, 3389, 5432, 3306, 1433, 1521, 27017]);
    return defaults.has(puerto);
  }

  private readSecretFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.onValorChange(reader.result as string);
      this.validacionTick.update(v => v + 1);
    };
    reader.readAsText(file, 'utf-8');
  }

  private loadAmbientes(proyectoId: string): void {
    this.formAmbientes.set([]);
    if (!proyectoId) return;

    this.ambientesService.getByProject(proyectoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.formAmbientes.set(items),
        error: () => this.formAmbientes.set([])
      });
  }
}
