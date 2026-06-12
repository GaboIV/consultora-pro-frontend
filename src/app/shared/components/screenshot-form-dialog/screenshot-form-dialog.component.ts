import { ChangeDetectionStrategy, Component, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ScreenshotFormData {
  nombre: string;
  version: string;
  descripcion: string;
  file: File;
}

@Component({
  selector: 'cp-screenshot-form-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="cp-modal-overlay">
      <form class="cp-modal cp-modal--md" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <header class="cp-modal__header">
          <h2 class="cp-modal__title">Subir Screenshot</h2>
          <button class="cp-modal__close" type="button" (click)="cancel.emit()" aria-label="Cerrar">×</button>
        </header>

        <div class="cp-modal__body">
        <div class="form-field">
          <label class="form-label">Archivo de imagen (PNG/JPG, Máx. 5MB) *</label>
          <div class="file-picker-container" [class.has-file]="!!selectedFile">
            <input
              #fileInput
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              (change)="onFileSelected($event)"
              style="display: none;"
            />
            <button class="btn btn-secondary file-picker-btn" type="button" (click)="fileInput.click()">
              Seleccionar Imagen
            </button>
            <span class="file-status-text">
              {{ selectedFile ? selectedFile.name : 'Ningún archivo seleccionado' }}
            </span>
          </div>
          @if (fileError()) {
            <p class="error-text">{{ fileError() }}</p>
          }
        </div>

        <div class="form-field">
          <label class="form-label">Nombre *</label>
          <input
            class="form-input"
            [(ngModel)]="data.nombre"
            name="nombre"
            placeholder="Ej: Dashboard principal"
            required
            maxlength="160"
          />
          <p class="field-help">Nombre descriptivo para identificar la captura de pantalla.</p>
        </div>

        <div class="form-row">
          <div class="form-field half">
            <label class="form-label">Versión de software</label>
            <input
              class="form-input"
              [(ngModel)]="data.version"
              name="version"
              placeholder="Ej: v1.2.0"
              maxlength="60"
            />
            <p class="field-help">Versión del sistema en la que se tomó la captura.</p>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">Descripción</label>
          <textarea
            class="form-textarea"
            [(ngModel)]="data.descripcion"
            name="descripcion"
            placeholder="Detalles sobre lo que se muestra en la captura..."
            maxlength="500"
            rows="3"
          ></textarea>
        </div>

        </div>

        <footer class="cp-modal__footer">
          <button class="btn btn-secondary" type="button" (click)="cancel.emit()">Cancelar</button>
          <button class="btn btn-primary" type="submit" [disabled]="!isValid()">
            Subir Screenshot
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

    .form-label {
      color: var(--text-2);
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .form-input, .form-textarea {
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

    .form-textarea {
      resize: vertical;
      line-height: 1.5;
    }

    .form-input:focus, .form-textarea:focus {
      border-color: var(--accent);
    }

    .form-input::placeholder, .form-textarea::placeholder {
      color: var(--text-3);
    }

    .file-picker-container {
      align-items: center;
      background: var(--bg-3);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius);
      display: flex;
      gap: 12px;
      padding: 12px;
    }

    .file-picker-container.has-file {
      border-style: solid;
      border-color: rgba(79, 142, 247, 0.4);
    }

    .file-picker-btn {
      font-size: 11px !important;
      min-height: 32px !important;
      padding: 6px 12px !important;
    }

    .file-status-text {
      color: var(--text-2);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .error-text {
      color: var(--red);
      font-size: 12px;
      margin: 6px 0 0;
    }

    .field-help {
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0 0;
    }

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScreenshotFormDialogComponent {
  readonly saveData = output<ScreenshotFormData>();
  readonly cancel = output<void>();

  protected selectedFile: File | null = null;
  protected fileError = signal<string | null>(null);

  protected data = {
    nombre: '',
    version: '',
    descripcion: ''
  };

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError.set(null);

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (file.size > 5 * 1024 * 1024) {
        this.fileError.set('La imagen supera el tamaño máximo permitido de 5MB.');
        this.selectedFile = null;
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.fileError.set('Formato de imagen inválido. Solo se admiten archivos PNG o JPG.');
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;

      if (!this.data.nombre) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        this.data.nombre = nameWithoutExt;
      }
    }
  }

  protected save(): void {
    if (!this.isValid()) return;
    this.saveData.emit({
      nombre: this.data.nombre.trim(),
      version: this.data.version.trim(),
      descripcion: this.data.descripcion.trim(),
      file: this.selectedFile!
    });
  }

  protected isValid(): boolean {
    return !!this.selectedFile
      && !!this.data.nombre.trim()
      && !this.fileError();
  }
}
