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
  url?: string;
  proyectoId: string;
  tecnologia?: string;
  estado: EstadoAmbiente;
}

@Component({
  selector: 'cp-ambiente-form-dialog',
  imports: [FormsModule, NgSelectModule],
  template: `
    <div class="cp-modal-overlay">
      <form class="cp-modal cp-modal--md" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <header class="cp-modal__header">
          <h2 class="cp-modal__title">{{ isEdit() ? 'Editar ambiente' : 'Nuevo ambiente' }}</h2>
          <button class="cp-modal__close" type="button" (click)="cancel.emit()" aria-label="Cerrar">×</button>
        </header>

        <div class="cp-modal__body">
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
            maxlength="300"
          />
          <p class="field-help">Opcional. Incluye http:// o https:// para que el enlace pueda abrirse desde el listado.</p>
        </div>

        <div class="form-field">
          <label class="form-label">Tecnología</label>
          <input
            class="form-input"
            [(ngModel)]="data.tecnologia"
            name="tecnologia"
            placeholder=".NET 8 · Angular · MySQL"
            maxlength="120"
          />
          <p class="field-help">Opcional. Resume stack, hosting o piezas clave que ayuden a ubicar el ambiente.</p>
        </div>

        </div>

        <footer class="cp-modal__footer">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="!isValid()">
            {{ isEdit() ? 'Guardar cambios' : 'Crear ambiente' }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .form-field {
      margin-bottom: 16px;
    }

    .form-field:last-child {
      margin-bottom: 0;
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
    tipo: 'Desarrollo',
    url: '',
    proyectoId: '',
    tecnologia: '',
    estado: 'Configurando'
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
        estado: init.estado
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
      url: this.data.url?.trim(),
      tecnologia: this.data.tecnologia?.trim()
    });
  }

  protected isValid(): boolean {
    return !!this.data.nombre.trim()
      && !!this.data.proyectoId;
  }

  protected tipoHelp(tipo: TipoAmbiente): string {
    return this.tipoOptions.find(option => option.value === tipo)?.help ?? '';
  }

  protected estadoHelp(estado: EstadoAmbiente): string {
    return this.estadoOptions.find(option => option.value === estado)?.help ?? '';
  }
}
