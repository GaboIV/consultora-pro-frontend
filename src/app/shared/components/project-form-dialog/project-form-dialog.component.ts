import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgSelectModule } from '@ng-select/ng-select';

import { Client, TipoSolucion, UsuarioSnapshot } from '../../../core/models/management.models';

export interface ProjectFormData {
  nombre: string;
  clienteId: string;
  tipoSolucionId: string;
  etapa: string;
  estado: string;
  progress: number;
  startDate: string;
  endDate: string;
  miembros: { usuarioId: string; rol: 'Principal' | 'Apoyo' }[];
}

@Component({
  selector: 'cp-project-form-dialog',
  imports: [FormsModule, LucideAngularModule, NgSelectModule],
  template: `
    <div class="cp-modal-overlay">
      <div class="cp-modal cp-modal--lg" (click)="$event.stopPropagation()">
        <header class="cp-modal__header">
          <h2 class="cp-modal__title">{{ isEdit() ? 'Editar proyecto' : 'Nuevo proyecto' }}</h2>
          <button class="cp-modal__close" type="button" (click)="cancel.emit()" aria-label="Cerrar">×</button>
        </header>

        <div class="cp-modal__body">
        <div class="form-grid">
          <div class="form-field col-span-2">
            <label class="form-label">Nombre del proyecto</label>
            <input class="form-input" [(ngModel)]="data.nombre" name="nombre" placeholder="Ej: Plataforma Digital" required />
          </div>

          <div class="form-field">
            <label class="form-label">Cliente</label>
            <ng-select [(ngModel)]="data.clienteId" name="clienteId" placeholder="-- Seleccionar --" appendTo="body">
              @for (c of clients(); track c.id) {
                <ng-option [value]="c.id">{{ c.name }}</ng-option>
              }
            </ng-select>
          </div>

          <div class="form-field">
            <label class="form-label">Tipo de solución</label>
            <ng-select [(ngModel)]="data.tipoSolucionId" name="tipoSolucionId" placeholder="-- Seleccionar --" appendTo="body">
              @for (t of tiposSolucion(); track t.id) {
                <ng-option [value]="t.id">{{ t.nombre }}</ng-option>
              }
            </ng-select>
          </div>

          <div class="form-field">
            <label class="form-label">Etapa</label>
            <ng-select [(ngModel)]="data.etapa" name="etapa" [searchable]="false" [clearable]="false" appendTo="body">
              <ng-option value="Analisis">Análisis</ng-option>
              <ng-option value="Diseno">Diseño</ng-option>
              <ng-option value="Desarrollo">Desarrollo</ng-option>
              <ng-option value="QA">QA</ng-option>
              <ng-option value="Deploy">Deploy</ng-option>
              <ng-option value="Soporte">Soporte</ng-option>
            </ng-select>
          </div>

          <div class="form-field">
            <label class="form-label">Estado</label>
            <ng-select [(ngModel)]="data.estado" name="estado" [searchable]="false" [clearable]="false" appendTo="body">
              <ng-option value="Planificacion">Planificación</ng-option>
              <ng-option value="EnCurso">En curso</ng-option>
              <ng-option value="Completado">Completado</ng-option>
              <ng-option value="PorVencer">Por vencer</ng-option>
            </ng-select>
          </div>

          <div class="form-field">
            <label class="form-label">Fecha de inicio</label>
            <input type="date" class="form-input" [(ngModel)]="data.startDate" name="startDate" required />
          </div>

          <div class="form-field">
            <label class="form-label">Fecha de fin</label>
            <input type="date" class="form-input" [(ngModel)]="data.endDate" name="endDate" required />
          </div>

          <div class="form-field col-span-2">
            <label class="form-label">Progreso ({{ data.progress }}%)</label>
            <div class="progress-input-wrapper" style="display: flex; gap: 12px; align-items: center;">
              <input type="range" class="form-range" [(ngModel)]="data.progress" name="progress" min="0" max="100" style="flex: 1; accent-color: var(--accent);" />
              <input type="number" class="form-input small-number" [(ngModel)]="data.progress" name="progressNum" min="0" max="100" style="width: 70px; text-align: center;" />
            </div>
          </div>
        </div>

        <div class="devs-grid">
          <div class="dev-section">
            <label class="form-label">Desarrolladores principales</label>
            <div class="select-create-row">
              <ng-select
                [items]="availablePrincipales()"
                [multiple]="true"
                bindLabel="nombres"
                bindValue="id"
                [ngModel]="selectedPrincipales()"
                (ngModelChange)="selectedPrincipales.set($event)"
                name="principales"
                placeholder="Seleccionar principales"
                class="flex-grow"
                [clearable]="false"
                appendTo="body"
              >
                <ng-template ng-option-tmp let-item="item">
                  <div class="row">
                    <span class="chip-avatar">{{ item.iniciales }}</span>
                    <span>{{ item.nombres }} {{ item.apellidos }}</span>
                  </div>
                </ng-template>
                <ng-template ng-label-tmp let-item="item" let-clear="clear">
                  <span class="chip-avatar">{{ item.iniciales }}</span>
                  <span class="chip-label">{{ item.nombres }} {{ item.apellidos }}</span>
                  <span class="ng-value-icon right" (click)="clear(item)" aria-hidden="true">×</span>
                </ng-template>
              </ng-select>
              <button class="btn-icon" type="button" (click)="createUser.emit()" title="Nuevo usuario">
                <i-lucide name="plus" [size]="16" [strokeWidth]="2.5" />
              </button>
            </div>
          </div>

          <div class="dev-section">
            <label class="form-label">Desarrolladores de apoyo</label>
            <div class="select-create-row">
              <ng-select
                [items]="availableApoyos()"
                [multiple]="true"
                bindLabel="nombres"
                bindValue="id"
                [ngModel]="selectedApoyos()"
                (ngModelChange)="selectedApoyos.set($event)"
                name="apoyos"
                placeholder="Seleccionar de apoyo"
                class="flex-grow"
                [clearable]="false"
                appendTo="body"
              >
                <ng-template ng-option-tmp let-item="item">
                  <div class="row">
                    <span class="chip-avatar">{{ item.iniciales }}</span>
                    <span>{{ item.nombres }} {{ item.apellidos }}</span>
                  </div>
                </ng-template>
                <ng-template ng-label-tmp let-item="item" let-clear="clear">
                  <span class="chip-avatar">{{ item.iniciales }}</span>
                  <span class="chip-label">{{ item.nombres }} {{ item.apellidos }}</span>
                  <span class="ng-value-icon right" (click)="clear(item)" aria-hidden="true">×</span>
                </ng-template>
              </ng-select>
              <button class="btn-icon" type="button" (click)="createUser.emit()" title="Nuevo usuario">
                <i-lucide name="plus" [size]="16" [strokeWidth]="2.5" />
              </button>
            </div>
          </div>
        </div>

        </div>

        <footer class="cp-modal__footer">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!data.nombre.trim() || !data.clienteId || !data.tipoSolucionId || (selectedPrincipales().length === 0 && selectedApoyos().length === 0)">
            {{ isEdit() ? 'Guardar cambios' : 'Crear proyecto' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .form-field { margin-bottom: 16px; }
    .form-field.col-span-2 { grid-column: span 2; }
    .devs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 0; }
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

    .dev-section { padding: 16px; border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-1); }
    .dev-section .form-label { margin-bottom: 10px; }

    .select-create-row {
      display: flex; gap: 8px; align-items: center;
    }
    .select-create-row .flex-grow { flex: 1; min-width: 0; }

    .btn-icon {
      width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, rgba(79,142,247,.12), rgba(53,115,225,.06));
      border: 1px solid rgba(79,142,247,.25); border-radius: 999px;
      color: #8db9ff; cursor: pointer; transition: background-color 0.15s, border-color 0.15s, transform 0.15s; flex-shrink: 0;
    }
    .btn-icon:hover { background: linear-gradient(135deg, rgba(79,142,247,.22), rgba(53,115,225,.14)); border-color: rgba(79,142,247,.4); color: #b8d4ff; transform: translateY(-1px); }

    .chip-avatar {
      width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--accent) 20%, transparent);
      border-radius: 50%; font-size: 10px; font-weight: 800; color: var(--accent); flex-shrink: 0;
    }

    .chip-label { padding-left: 2px; }

    .row { display: flex; align-items: center; gap: 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectFormDialogComponent implements OnInit {
  readonly isEdit = input(false);
  readonly clients = input<Client[]>([]);
  readonly tiposSolucion = input<TipoSolucion[]>([]);
  readonly usuarios = input<UsuarioSnapshot[]>([]);
  readonly initial = input<ProjectFormData>();

  readonly saveData = output<ProjectFormData>();
  readonly cancel = output<void>();
  readonly createUser = output<void>();

  protected data: ProjectFormData = {
    nombre: '',
    clienteId: '',
    tipoSolucionId: '',
    etapa: 'Desarrollo',
    estado: 'Planificacion',
    progress: 0,
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), // +90 days
    miembros: []
  };

  protected selectedPrincipales = signal<string[]>([]);
  protected selectedApoyos = signal<string[]>([]);

  protected availablePrincipales = computed(() => {
    const apoyosSet = new Set(this.selectedApoyos());
    return this.usuarios().filter(u => !apoyosSet.has(u.id));
  });

  protected availableApoyos = computed(() => {
    const principalesSet = new Set(this.selectedPrincipales());
    return this.usuarios().filter(u => !principalesSet.has(u.id));
  });

  ngOnInit(): void {
    const init = this.initial();
    if (init) {
      this.data = {
        ...init,
        miembros: this.uniqueMiembros(init.miembros)
      };
      this.selectedPrincipales.set(this.data.miembros.filter(m => m.rol === 'Principal').map(m => m.usuarioId));
      this.selectedApoyos.set(this.data.miembros.filter(m => m.rol === 'Apoyo').map(m => m.usuarioId));
    }
  }

  protected save(): void {
    if (!this.data.nombre.trim() || !this.data.clienteId || !this.data.tipoSolucionId) return;

    const miembros: { usuarioId: string; rol: 'Principal' | 'Apoyo' }[] = [
      ...this.selectedPrincipales().map(id => ({ usuarioId: id, rol: 'Principal' as const })),
      ...this.selectedApoyos().map(id => ({ usuarioId: id, rol: 'Apoyo' as const }))
    ];

    this.saveData.emit({
      ...this.data,
      miembros: this.uniqueMiembros(miembros)
    });
  }

  private uniqueMiembros(
    miembros: { usuarioId: string; rol: 'Principal' | 'Apoyo' }[]
  ): { usuarioId: string; rol: 'Principal' | 'Apoyo' }[] {
    const selected = new Set<string>();
    return miembros.filter(m => {
      if (selected.has(m.usuarioId)) return false;
      selected.add(m.usuarioId);
      return true;
    });
  }
}
