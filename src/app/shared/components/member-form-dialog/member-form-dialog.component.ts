import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface MemberFormData {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  iniciales: string;
  puesto: string;
}

@Component({
  selector: 'cp-member-form-dialog',
  imports: [FormsModule],
  template: `
    <div class="dialog-overlay" (click)="cancel.emit()">
      <div class="dialog-panel" (click)="$event.stopPropagation()">
        <h2 class="dialog-title">{{ isEdit() ? 'Editar miembro' : 'Nuevo miembro' }}</h2>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Nombres</label>
            <input class="form-input" [(ngModel)]="data.nombres" (ngModelChange)="onNombresChange()" name="nombres" placeholder="Ej: Carlos" required />
          </div>
          <div class="form-field half">
            <label class="form-label">Apellidos</label>
            <input class="form-input" [(ngModel)]="data.apellidos" (ngModelChange)="onApellidosChange()" name="apellidos" placeholder="Ej: Ruiz" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Correo</label>
            <input class="form-input" [(ngModel)]="data.correo" name="correo" type="email" placeholder="ej: correo@ejemplo.com" />
          </div>
          <div class="form-field half">
            <label class="form-label">Tel&eacute;fono</label>
            <input class="form-input" [(ngModel)]="data.telefono" name="telefono" placeholder="+51999000000" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Iniciales</label>
            <input class="form-input" [(ngModel)]="data.iniciales" (ngModelChange)="onInicialesChange()" name="iniciales" maxlength="2" placeholder="CR" />
          </div>
          <div class="form-field half">
            <label class="form-label">Puesto</label>
            <input class="form-input" [(ngModel)]="data.puesto" name="puesto" placeholder="Ej: Developer" />
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="!data.nombres.trim() || !data.apellidos.trim()">
            {{ isEdit() ? 'Guardar cambios' : 'Crear miembro' }}
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
export class MemberFormDialogComponent {
  readonly isEdit = input(false);
  readonly initial = input<MemberFormData>();

  readonly saveData = output<MemberFormData>();
  readonly cancel = output<void>();

  protected data: MemberFormData = {
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    iniciales: '',
    puesto: ''
  };

  private autoInitials = true;

  constructor() {
    const init = this.initial();
    if (init) {
      this.data = { ...init };
    }
  }

  protected onNombresChange(): void {
    this.updateInitials();
  }

  protected onApellidosChange(): void {
    this.updateInitials();
  }

  protected onInicialesChange(): void {
    this.autoInitials = false;
  }

  private updateInitials(): void {
    if (!this.autoInitials) return;
    const nombres = this.data.nombres.trim();
    const apellidos = this.data.apellidos.trim();
    if (!nombres || !apellidos) {
      this.data.iniciales = '';
      return;
    }
    this.data.iniciales = (nombres[0] + apellidos[0]).toUpperCase();
  }

  protected save(): void {
    if (!this.data.nombres.trim() || !this.data.apellidos.trim()) return;
    this.saveData.emit({ ...this.data });
  }
}
