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
  miembros: { usuarioId: string; rol: 'Principal' | 'Apoyo' }[];
}

@Component({
  selector: 'cp-project-form-dialog',
  imports: [FormsModule, LucideAngularModule, NgSelectModule],
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

        <div class="form-row">
          <div class="form-field half">
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
          <div class="form-field half">
            <label class="form-label">Estado</label>
            <ng-select [(ngModel)]="data.estado" name="estado" [searchable]="false" [clearable]="false" appendTo="body">
              <ng-option value="Planificacion">Planificación</ng-option>
              <ng-option value="EnCurso">En curso</ng-option>
              <ng-option value="Completado">Completado</ng-option>
              <ng-option value="PorVencer">Por vencer</ng-option>
            </ng-select>
          </div>
        </div>

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
              placeholder="Seleccionar desarrolladores principales" 
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
              placeholder="Seleccionar desarrolladores de apoyo" 
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

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!data.nombre.trim() || !data.clienteId || !data.tipoSolucionId || (selectedPrincipales().length === 0 && selectedApoyos().length === 0)">
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

    .dev-section { margin-bottom: 16px; padding: 16px; border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-1); }
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

    .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }

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
