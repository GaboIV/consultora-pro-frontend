import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { Project } from '../../../core/models/management.models';
import { Ambiente } from '../../../core/models/ambientes.models';
import { CreateDespliegueRequest } from '../../../core/models/despliegues.models';

@Component({
  selector: 'cp-despliegue-form-dialog',
  imports: [FormsModule, NgSelectModule],
  template: `
    <div class="cp-modal-overlay">
      <form class="cp-modal cp-modal--md" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <header class="cp-modal__header">
          <h2 class="cp-modal__title">Ejecutar despliegue</h2>
          <button class="cp-modal__close" type="button" (click)="cancel.emit()" aria-label="Cerrar">×</button>
        </header>

        <div class="cp-modal__body">
        <div class="form-field">
          <label class="form-label">Proyecto</label>
          <ng-select
            [(ngModel)]="data.proyectoId"
            name="proyectoId"
            placeholder="Seleccionar proyecto"
            [clearable]="false"
            appendTo="body"
            (ngModelChange)="onProjectChange()"
            required
          >
            @for (project of projects(); track project.id) {
              <ng-option [value]="project.id">{{ project.clientName }} · {{ project.name }}</ng-option>
            }
          </ng-select>
        </div>

        <div class="form-field">
          <label class="form-label">Ambiente destino</label>
          <ng-select
            [(ngModel)]="data.ambienteId"
            name="ambienteId"
            placeholder="Seleccionar ambiente"
            [clearable]="false"
            appendTo="body"
            required
          >
            @for (amb of filteredAmbientes(); track amb.id) {
              <ng-option [value]="amb.id">{{ amb.nombre }} ({{ amb.tipoLabel }})</ng-option>
            }
          </ng-select>
          <p class="field-help">Selecciona primero un proyecto para ver sus ambientes disponibles.</p>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Versión</label>
            <input
              class="form-input"
              [(ngModel)]="data.version"
              name="version"
              placeholder="Ej: 2.3.1"
              required
              maxlength="60"
            />
          </div>
          <div class="form-field half">
            <label class="form-label">Duración estimada (segundos)</label>
            <input
              class="form-input"
              type="number"
              [(ngModel)]="data.duracionSegundos"
              name="duracionSegundos"
              min="0"
              required
            />
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Notas</label>
          <textarea
            class="form-input"
            [(ngModel)]="data.notas"
            name="notas"
            placeholder="Release notes, cambios incluidos, observaciones..."
            rows="3"
            maxlength="1000"
          ></textarea>
        </div>

        @if (isProdDeployment()) {
          <div class="form-field warn-box">
            <span>⚠️ Vas a desplegar en un ambiente de **Producción**. Verifica los cambios antes de continuar.</span>
          </div>
        }

        </div>

        <footer class="cp-modal__footer">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="!isValid()">
            Ejecutar despliegue
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .form-field { margin-bottom: 16px; }
    .form-field:last-child { margin-bottom: 0; }
    .form-row { display: flex; gap: 12px; }
    .form-field.half { flex: 1; }
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
      font-family: inherit;
      resize: vertical;
    }
    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-3); }
    .field-help {
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0 0;
    }
    .warn-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius);
      color: var(--amber);
      font-size: 13px;
      padding: 12px;
    }
    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 22px;
    }
    @media (max-width: 580px) { .form-row { flex-direction: column; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespliegueFormDialogComponent implements OnInit {
  readonly projects = input<Project[]>([]);
  readonly ambientes = input<Ambiente[]>([]);
  readonly defaultProjectId = input<string | null>(null);

  readonly saveData = output<CreateDespliegueRequest>();
  readonly cancel = output<void>();

  protected data: CreateDespliegueRequest = {
    proyectoId: '',
    ambienteId: '',
    version: '',
    duracionSegundos: 0,
    notas: ''
  };

  protected filteredAmbientes: () => (Ambiente & { tipoLabel: string })[] = () => [];

  ngOnInit(): void {
    this.data.proyectoId = this.defaultProjectId() ?? '';
    this.updateFilteredAmbientes();
  }

  onProjectChange(): void {
    this.data.ambienteId = '';
    this.updateFilteredAmbientes();
  }

  private updateFilteredAmbientes(): void {
    const pid = this.data.proyectoId;
    const all = this.ambientes();
    const tipoLabels: Record<string, string> = {
      Produccion: 'Producción', Staging: 'Staging', Desarrollo: 'Desarrollo', QA: 'QA'
    };
    this.filteredAmbientes = () =>
      all
        .filter(a => a.proyectoId === pid && a.activo)
        .map(a => ({ ...a, tipoLabel: tipoLabels[a.tipo] ?? a.tipo }));
  }

  protected save(): void {
    if (!this.isValid()) return;
    this.saveData.emit({
      ...this.data,
      version: this.data.version.trim(),
      notas: this.data.notas.trim(),
      duracionSegundos: Number(this.data.duracionSegundos)
    });
  }

  protected isValid(): boolean {
    return !!this.data.proyectoId
      && !!this.data.ambienteId
      && !!this.data.version.trim()
      && Number(this.data.duracionSegundos) >= 0;
  }

  protected isProdDeployment(): boolean {
    const amb = this.ambientes().find(a => a.id === this.data.ambienteId);
    return amb?.tipo === 'Produccion';
  }
}
