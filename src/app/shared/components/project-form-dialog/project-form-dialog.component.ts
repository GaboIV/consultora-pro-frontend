import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Client, TipoSolucion } from '../../../core/models/management.models';

export interface ProjectFormData {
  nombre: string;
  clienteId: string;
  tipoSolucionId: string;
  etapa: string;
  estado: string;
  techLead: string;
  techLeadIniciales: string;
}

@Component({
  selector: 'cp-project-form-dialog',
  imports: [FormsModule],
  template: `
    <div class="dialog-overlay" (click)="cancel.emit()">
      <div class="dialog-panel" (click)="$event.stopPropagation()">
        <h2 class="dialog-title">{{ isEdit() ? 'Editar proyecto' : 'Nuevo proyecto' }}</h2>

        <div class="form-field">
          <label class="form-label">Nombre del proyecto</label>
          <input class="form-input" [(ngModel)]="data.nombre" name="nombre" placeholder="Ej: Plataforma Digital" required />
        </div>

        <div class="form-field">
          <label class="form-label">Cliente</label>
          <select class="form-input" [(ngModel)]="data.clienteId" name="clienteId">
            <option value="">-- Seleccionar --</option>
            @for (c of clients(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">Tipo de solución</label>
          <select class="form-input" [(ngModel)]="data.tipoSolucionId" name="tipoSolucionId">
            <option value="">-- Seleccionar --</option>
            @for (t of tiposSolucion(); track t.id) {
              <option [value]="t.id">{{ t.nombre }}</option>
            }
          </select>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Etapa</label>
            <select class="form-input" [(ngModel)]="data.etapa" name="etapa">
              <option value="Analisis">Análisis</option>
              <option value="Diseno">Diseño</option>
              <option value="Desarrollo">Desarrollo</option>
              <option value="QA">QA</option>
              <option value="Deploy">Deploy</option>
              <option value="Soporte">Soporte</option>
            </select>
          </div>
          <div class="form-field half">
            <label class="form-label">Estado</label>
            <select class="form-input" [(ngModel)]="data.estado" name="estado">
              <option value="Planificacion">Planificación</option>
              <option value="EnCurso">En curso</option>
              <option value="Completado">Completado</option>
              <option value="PorVencer">Por vencer</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Tech Lead</label>
            <input class="form-input" [(ngModel)]="data.techLead" name="techLead" placeholder="Ej: Carlos Ruiz" />
          </div>
          <div class="form-field half">
            <label class="form-label">Iniciales TL</label>
            <input class="form-input" [(ngModel)]="data.techLeadIniciales" name="techLeadIniciales" maxlength="2" placeholder="CR" />
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!data.nombre.trim() || !data.clienteId || !data.tipoSolucionId">
            {{ isEdit() ? 'Guardar cambios' : 'Crear proyecto' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100;
      display: flex; align-items: center; justify-content: center;
      animation: fade-in 0.15s ease;
    }
    .dialog-panel {
      background: var(--bg-2); border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg); padding: 28px; width: 520px; max-width: 94vw;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .dialog-title {
      font-family: var(--font-head); font-size: 18px; font-weight: 700;
      color: var(--text); margin: 0 0 20px;
    }
    .form-field { margin-bottom: 16px; }
    .form-row { display: flex; gap: 12px; }
    .form-field.half { flex: 1; }
    .form-label {
      display: block; font-size: 12px; font-weight: 600; color: var(--text-2);
      margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .form-input {
      width: 100%; padding: 10px 12px; border-radius: var(--radius);
      border: 1px solid var(--border-strong); background: var(--bg-3);
      color: var(--text); font-size: 14px; outline: none; transition: border-color 0.15s;
    }
    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-3); }
    select.form-input { cursor: pointer; appearance: auto; }
    .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
    .btn {
      padding: 9px 20px; border-radius: var(--radius); font-size: 13px;
      font-weight: 600; border: 1px solid transparent; transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: transparent; border-color: var(--border-strong); color: var(--text-2); }
    .btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: var(--text); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectFormDialogComponent {
  readonly isEdit = input(false);
  readonly clients = input<Client[]>([]);
  readonly tiposSolucion = input<TipoSolucion[]>([]);
  readonly initial = input<ProjectFormData>();

  readonly saveData = output<ProjectFormData>();
  readonly cancel = output<void>();

  protected data: ProjectFormData = {
    nombre: '',
    clienteId: '',
    tipoSolucionId: '',
    etapa: 'Desarrollo',
    estado: 'Planificacion',
    techLead: '',
    techLeadIniciales: ''
  };

  constructor() {
    const init = this.initial();
    if (init) {
      this.data = { ...init };
    }
  }

  protected save(): void {
    if (!this.data.nombre.trim() || !this.data.clienteId || !this.data.tipoSolucionId) return;
    this.saveData.emit({ ...this.data });
  }
}
