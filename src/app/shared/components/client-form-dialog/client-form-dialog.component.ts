import { ChangeDetectionStrategy, Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ClientFormData {
  nombre: string;
  industria: string;
  iniciales: string;
  colorClass: string;
}

@Component({
  selector: 'cp-client-form-dialog',
  imports: [FormsModule],
  template: `
    <div class="dialog-overlay" (click)="cancel.emit()">
      <div class="dialog-panel" (click)="$event.stopPropagation()">
        <h2 class="dialog-title">{{ isEdit() ? 'Editar cliente' : 'Nuevo cliente' }}</h2>

        <div class="form-field">
          <label class="form-label">Nombre del cliente</label>
          <input class="form-input" [(ngModel)]="data.nombre" (ngModelChange)="onNombreChange()" name="nombre" placeholder="Ej: Repsol" required />
        </div>

        <div class="form-field">
          <label class="form-label">Industria</label>
          <input class="form-input" [(ngModel)]="data.industria" name="industria" placeholder="Ej: Energía" maxlength="100" />
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Iniciales</label>
            <input class="form-input" [(ngModel)]="data.iniciales" (ngModelChange)="onInicialesChange()" name="iniciales" maxlength="2" placeholder="RE" />
          </div>
          <div class="form-field half">
            <label class="form-label">Color</label>
            <select class="form-input" [(ngModel)]="data.colorClass" name="colorClass">
              <option value="blue">Azul</option>
              <option value="purple">Púrpura</option>
              <option value="green">Verde</option>
              <option value="amber">Ámbar</option>
              <option value="red">Rojo</option>
            </select>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!data.nombre.trim()">
            {{ isEdit() ? 'Guardar cambios' : 'Crear cliente' }}
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
      border-radius: var(--radius-lg); padding: 28px; width: 480px; max-width: 94vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
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
export class ClientFormDialogComponent implements OnInit {
  readonly isEdit = input(false);
  readonly initial = input<ClientFormData>();

  readonly saveData = output<ClientFormData>();
  readonly cancel = output<void>();

  protected data: ClientFormData = {
    nombre: '',
    industria: '',
    iniciales: '',
    colorClass: 'blue'
  };

  private autoInitials = true;

  ngOnInit(): void {
    const init = this.initial();
    if (init) {
      this.data = { ...init };
    }
  }

  protected onNombreChange(): void {
    if (!this.autoInitials) return;
    const name = this.data.nombre.trim();
    if (!name) {
      this.data.iniciales = '';
      return;
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      this.data.iniciales = parts[0].slice(0, 2).toUpperCase();
    } else {
      this.data.iniciales = (parts[0][0] + parts[1][0]).toUpperCase();
    }
  }

  protected onInicialesChange(): void {
    this.autoInitials = false;
  }

  protected save(): void {
    if (!this.data.nombre.trim()) return;
    this.saveData.emit({ ...this.data });
  }
}
