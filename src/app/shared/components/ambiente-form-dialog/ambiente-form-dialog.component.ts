import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import {
  Ambiente,
  ESTADO_AMBIENTE_OPTIONS,
  EstadoAmbiente,
  TIPO_AMBIENTE_OPTIONS,
  TipoAmbiente
} from '../../../core/models/ambientes.models';
import { Project } from '../../../core/models/management.models';

export interface AmbienteFormData {
  nombre: string;
  tipo: TipoAmbiente;
  url: string;
  proyectoId: string;
  tecnologia: string;
  estado: EstadoAmbiente;
  uptimePorcentaje: number;
}

@Component({
  selector: 'cp-ambiente-form-dialog',
  imports: [FormsModule, NgSelectModule],
  template: `
    <div class="dialog-overlay" (click)="cancel.emit()">
      <form class="dialog-panel" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2 class="dialog-title">{{ isEdit() ? 'Editar ambiente' : 'Nuevo ambiente' }}</h2>

        <div class="form-field">
          <label class="form-label">Nombre</label>
          <input
            class="form-input"
            [(ngModel)]="data.nombre"
            name="nombre"
            placeholder="Ej: Producción API"
            required
            maxlength="160"
          />
          <p class="field-help">Usa un nombre corto y reconocible para soporte, despliegues y credenciales.</p>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Tipo</label>
            <ng-select
              [(ngModel)]="data.tipo"
              name="tipo"
              [items]="tipoOptions"
              bindLabel="label"
              bindValue="value"
              [searchable]="false"
              [clearable]="false"
              appendTo="body"
            />
            <p class="field-help">{{ tipoHelp(data.tipo) }}</p>
          </div>

          <div class="form-field half">
            <label class="form-label">Estado</label>
            <ng-select
              [(ngModel)]="data.estado"
              name="estado"
              [items]="estadoOptions"
              bindLabel="label"
              bindValue="value"
              [searchable]="false"
              [clearable]="false"
              appendTo="body"
            />
            <p class="field-help">{{ estadoHelp(data.estado) }}</p>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Proyecto</label>
          <ng-select
            [(ngModel)]="data.proyectoId"
            name="proyectoId"
            placeholder="Seleccionar proyecto"
            [clearable]="false"
            appendTo="body"
            required
          >
            @for (project of projects(); track project.id) {
              <ng-option [value]="project.id">{{ project.clientName }} · {{ project.name }}</ng-option>
            }
          </ng-select>
          <p class="field-help">El ambiente queda asociado a un proyecto para filtrar credenciales, alertas y operación diaria.</p>
        </div>

        <div class="form-field">
          <label class="form-label">URL</label>
          <input
            class="form-input"
            [(ngModel)]="data.url"
            name="url"
            placeholder="https://staging.cliente.com"
            required
            maxlength="300"
          />
          <p class="field-help">Incluye http:// o https:// para que el enlace pueda abrirse desde el listado.</p>
        </div>

        <div class="form-row">
          <div class="form-field two-thirds">
            <label class="form-label">Tecnología</label>
            <input
              class="form-input"
              [(ngModel)]="data.tecnologia"
              name="tecnologia"
              placeholder=".NET 8 · Angular · MySQL"
              required
              maxlength="120"
            />
            <p class="field-help">Resume stack, hosting o piezas clave que ayuden a ubicar el ambiente.</p>
          </div>

          <div class="form-field third">
            <label class="form-label">Uptime %</label>
            <input
              class="form-input"
              type="number"
              [(ngModel)]="data.uptimePorcentaje"
              name="uptimePorcentaje"
              min="0"
              max="100"
              step="0.01"
              required
            />
            <p class="field-help">Valor entre 0 y 100.</p>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="!isValid()">
            {{ isEdit() ? 'Guardar cambios' : 'Crear ambiente' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      align-items: center;
      animation: fade-in 0.15s ease;
      background: rgba(0, 0, 0, 0.66);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 20px;
      position: fixed;
      z-index: 110;
    }

    .dialog-panel {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 28px;
      width: min(680px, calc(100vw - 32px));
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

    .form-field {
      margin-bottom: 16px;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-field.half {
      flex: 1;
    }

    .form-field.two-thirds {
      flex: 2;
    }

    .form-field.third {
      flex: 1;
      min-width: 132px;
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

    .form-input::placeholder {
      color: var(--text-3);
    }

    .field-help {
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0 0;
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 22px;
    }

    @media (max-width: 680px) {
      .form-row {
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmbienteFormDialogComponent implements OnInit {
  readonly isEdit = input(false);
  readonly projects = input<Project[]>([]);
  readonly initial = input<Ambiente | undefined>();
  readonly defaultProjectId = input<string | null>(null);

  readonly saveData = output<AmbienteFormData>();
  readonly cancel = output<void>();

  protected readonly tipoOptions = TIPO_AMBIENTE_OPTIONS;
  protected readonly estadoOptions = ESTADO_AMBIENTE_OPTIONS;

  protected data: AmbienteFormData = {
    nombre: '',
    tipo: 'Staging',
    url: '',
    proyectoId: '',
    tecnologia: '',
    estado: 'Configurando',
    uptimePorcentaje: 99
  };

  ngOnInit(): void {
    const init = this.initial();
    if (init) {
      this.data = {
        nombre: init.nombre,
        tipo: init.tipo,
        url: init.url,
        proyectoId: init.proyectoId,
        tecnologia: init.tecnologia,
        estado: init.estado,
        uptimePorcentaje: init.uptimePorcentaje
      };
      return;
    }

    this.data.proyectoId = this.defaultProjectId() ?? '';
  }

  protected save(): void {
    if (!this.isValid()) return;

    this.saveData.emit({
      ...this.data,
      nombre: this.data.nombre.trim(),
      url: this.data.url.trim(),
      tecnologia: this.data.tecnologia.trim(),
      uptimePorcentaje: Number(this.data.uptimePorcentaje)
    });
  }

  protected isValid(): boolean {
    const uptime = Number(this.data.uptimePorcentaje);
    return !!this.data.nombre.trim()
      && !!this.data.proyectoId
      && !!this.data.url.trim()
      && !!this.data.tecnologia.trim()
      && uptime >= 0
      && uptime <= 100;
  }

  protected tipoHelp(tipo: TipoAmbiente): string {
    return this.tipoOptions.find(option => option.value === tipo)?.help ?? '';
  }

  protected estadoHelp(estado: EstadoAmbiente): string {
    return this.estadoOptions.find(option => option.value === estado)?.help ?? '';
  }
}
