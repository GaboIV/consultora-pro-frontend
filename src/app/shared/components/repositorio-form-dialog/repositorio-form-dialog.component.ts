import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import {
  Repositorio,
  ESTADO_PIPELINE_OPTIONS,
  EstadoPipeline,
  PROVEEDOR_REPOSITORIO_OPTIONS,
  ProveedorRepositorio
} from '../../../core/models/repositorios.models';
import { Project } from '../../../core/models/management.models';

export interface RepositorioFormData {
  nombre: string;
  proyectoId: string;
  proveedor: ProveedorRepositorio;
  ramaPrincipal: string;
  url: string;
  estadoPipeline: EstadoPipeline;
}

@Component({
  selector: 'cp-repositorio-form-dialog',
  imports: [FormsModule, NgSelectModule],
  template: `
    <div class="dialog-overlay" (click)="cancel.emit()">
      <form class="dialog-panel" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2 class="dialog-title">{{ isEdit() ? 'Editar repositorio' : 'Nuevo repositorio' }}</h2>

        <div class="form-field">
          <label class="form-label">Nombre</label>
          <input
            class="form-input"
            [(ngModel)]="data.nombre"
            name="nombre"
            placeholder="Ej: api-clientes"
            required
            maxlength="160"
          />
          <p class="field-help">Nombre corto del repositorio. Se usará como referencia en despliegues y notificaciones.</p>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Proveedor</label>
            <ng-select
              [(ngModel)]="data.proveedor"
              name="proveedor"
              [items]="proveedorOptions"
              bindLabel="label"
              bindValue="value"
              [searchable]="false"
              [clearable]="false"
              appendTo="body"
            />
            <p class="field-help">{{ proveedorHelp(data.proveedor) }}</p>
          </div>

          <div class="form-field half">
            <label class="form-label">Estado pipeline</label>
            <ng-select
              [(ngModel)]="data.estadoPipeline"
              name="estadoPipeline"
              [items]="pipelineOptions"
              bindLabel="label"
              bindValue="value"
              [searchable]="false"
              [clearable]="false"
              appendTo="body"
            />
            <p class="field-help">{{ pipelineHelp(data.estadoPipeline) }}</p>
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
          <p class="field-help">El repositorio queda asociado al proyecto para agruparlo con ambientes, credenciales y despliegues.</p>
        </div>

        <div class="form-field">
          <label class="form-label">URL</label>
          <input
            class="form-input"
            [(ngModel)]="data.url"
            name="url"
            placeholder="https://github.com/consultorapro/mi-repositorio"
            required
            maxlength="500"
          />
          <p class="field-help">URL completa del repositorio. Debe empezar con http:// o https://</p>
        </div>

        <div class="form-field">
          <label class="form-label">Rama principal</label>
          <input
            class="form-input"
            [(ngModel)]="data.ramaPrincipal"
            name="ramaPrincipal"
            placeholder="main"
            required
            maxlength="120"
          />
          <p class="field-help">La rama por defecto del repositorio. Normalmente main, master o develop.</p>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="!isValid()">
            {{ isEdit() ? 'Guardar cambios' : 'Crear repositorio' }}
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
export class RepositorioFormDialogComponent implements OnInit {
  readonly isEdit = input(false);
  readonly projects = input<Project[]>([]);
  readonly initial = input<Repositorio | undefined>();
  readonly defaultProjectId = input<string | null>(null);

  readonly saveData = output<RepositorioFormData>();
  readonly cancel = output<void>();

  protected readonly proveedorOptions = PROVEEDOR_REPOSITORIO_OPTIONS;
  protected readonly pipelineOptions = ESTADO_PIPELINE_OPTIONS;

  protected data: RepositorioFormData = {
    nombre: '',
    proyectoId: '',
    proveedor: 'GitHub',
    ramaPrincipal: 'main',
    url: '',
    estadoPipeline: 'Desconocido'
  };

  ngOnInit(): void {
    const init = this.initial();
    if (init) {
      this.data = {
        nombre: init.nombre,
        proyectoId: init.proyectoId,
        proveedor: init.proveedor,
        ramaPrincipal: init.ramaPrincipal,
        url: init.url,
        estadoPipeline: init.estadoPipeline
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
      ramaPrincipal: this.data.ramaPrincipal.trim()
    });
  }

  protected isValid(): boolean {
    return !!this.data.nombre.trim()
      && !!this.data.proyectoId
      && !!this.data.url.trim()
      && !!this.data.ramaPrincipal.trim();
  }

  protected proveedorHelp(proveedor: ProveedorRepositorio): string {
    return this.proveedorOptions.find(option => option.value === proveedor)?.help ?? '';
  }

  protected pipelineHelp(estado: EstadoPipeline): string {
    return this.pipelineOptions.find(option => option.value === estado)?.help ?? '';
  }
}
