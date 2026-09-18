import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { normalizeText } from '../../../core/models/documentos.models';

/**
 * Entrada de etiquetas tipo chips. Enter, coma o Tab confirman; Backspace con el campo vacío
 * quita la última. Muestra sugerencias filtradas (sin repetir las ya elegidas).
 */
@Component({
  selector: 'cp-tag-input',
  imports: [LucideAngularModule],
  template: `
    <div class="tag-box" [class.focused]="focused()" (click)="field.focus()">
      @for (tag of tags(); track tag) {
        <span class="tag-chip">
          {{ tag }}
          <button type="button" (click)="remove(tag); $event.stopPropagation()" [attr.aria-label]="'Quitar ' + tag">
            <i-lucide name="x" [size]="11" [strokeWidth]="2.5" />
          </button>
        </span>
      }
      <input
        #field
        type="text"
        [value]="draft()"
        [placeholder]="tags().length ? '' : placeholder()"
        [attr.maxlength]="50"
        (input)="draft.set(field.value)"
        (keydown)="onKeydown($event, field)"
        (focus)="focused.set(true)"
        (blur)="onBlur(field)"
        aria-label="Agregar etiqueta"
      />
    </div>
    @if (visibleSuggestions().length > 0) {
      <div class="tag-suggestions">
        @for (s of visibleSuggestions(); track s) {
          <button type="button" class="tag-suggestion" (mousedown)="$event.preventDefault()" (click)="add(s); field.value = ''">
            <i-lucide name="plus" [size]="10" [strokeWidth]="2.5" /> {{ s }}
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tag-box {
      align-items: center; background: var(--bg-3); border: 1px solid var(--border-strong); border-radius: var(--radius);
      cursor: text; display: flex; flex-wrap: wrap; gap: 6px; min-height: 42px; padding: 6px 8px; transition: border-color .16s ease;
    }
    .tag-box.focused { border-color: var(--accent); }
    .tag-box input {
      background: transparent; border: 0; color: var(--text); flex: 1; font: inherit; font-size: 13px; min-width: 120px; outline: none; padding: 4px;
    }
    .tag-box input::placeholder { color: var(--text-3); }
    .tag-chip {
      align-items: center; background: rgba(45,212,191,.12); border: 1px solid rgba(45,212,191,.3); border-radius: 999px;
      color: var(--teal); display: inline-flex; font-size: 12px; font-weight: 700; gap: 4px; padding: 3px 4px 3px 9px;
    }
    .tag-chip button {
      align-items: center; background: transparent; border: 0; border-radius: 50%; color: inherit; cursor: pointer;
      display: inline-flex; height: 18px; justify-content: center; opacity: .75; padding: 0; width: 18px;
    }
    .tag-chip button:hover { background: rgba(45,212,191,.2); opacity: 1; }
    .tag-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .tag-suggestion {
      align-items: center; background: rgba(255,255,255,.04); border: 1px dashed var(--border-strong); border-radius: 999px;
      color: var(--text-2); cursor: pointer; display: inline-flex; font-size: 11px; font-weight: 600; gap: 4px; padding: 4px 9px;
    }
    .tag-suggestion:hover { border-color: rgba(45,212,191,.45); color: var(--teal); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagInputComponent {
  readonly tags = model<string[]>([]);
  readonly suggestions = input<string[]>([]);
  readonly placeholder = input('Escribe y pulsa Enter (ej. SUNAT, FI, CPI)');
  readonly maxTags = input(15);

  protected readonly draft = signal('');
  protected readonly focused = signal(false);

  protected readonly visibleSuggestions = computed(() => {
    const chosen = new Set(this.tags().map(t => normalizeText(t)));
    const q = normalizeText(this.draft());
    return this.suggestions()
      .filter(s => !chosen.has(normalizeText(s)))
      .filter(s => !q || normalizeText(s).includes(q))
      .slice(0, q ? 10 : 14);
  });

  protected onKeydown(event: KeyboardEvent, field: HTMLInputElement): void {
    const value = field.value.trim();
    if ((event.key === 'Enter' || event.key === ',' || (event.key === 'Tab' && value)) && value) {
      event.preventDefault();
      this.add(value);
      field.value = '';
    } else if (event.key === 'Enter') {
      event.preventDefault(); // no enviar el formulario contenedor
    } else if (event.key === 'Backspace' && !field.value && this.tags().length) {
      this.tags.set(this.tags().slice(0, -1));
    }
  }

  protected onBlur(field: HTMLInputElement): void {
    this.focused.set(false);
    if (field.value.trim()) {
      this.add(field.value);
      field.value = '';
    }
  }

  add(raw: string): void {
    const tag = raw.replace(/^#/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
    this.draft.set('');
    if (!tag || this.tags().length >= this.maxTags()) return;
    if (this.tags().some(t => normalizeText(t) === normalizeText(tag))) return;
    this.tags.set([...this.tags(), tag]);
  }

  remove(tag: string): void {
    this.tags.set(this.tags().filter(t => t !== tag));
  }
}
