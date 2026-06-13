import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { SearchItem } from '../../../core/models/search.models';

@Component({
  selector: 'cp-search-result-item',
  imports: [LucideAngularModule],
  template: `
    <button
      class="result-item"
      type="button"
      role="option"
      [id]="optionId"
      [attr.aria-selected]="selected"
      [class.selected]="selected"
      (click)="select.emit(item)"
    >
      <span class="result-icon">
        <i-lucide [name]="iconName" [size]="17" [strokeWidth]="1.9" />
      </span>
      <span class="result-copy">
        <span class="result-title" [innerHTML]="highlightedName"></span>
        <span class="result-subtitle">{{ item.subtitle }}</span>
      </span>
      <span class="badge" [class]="'badge badge-' + item.badgeVariant">{{ item.badge }}</span>
    </button>
  `,
  styles: [`
    :host {
      display: block;
    }

    .result-item {
      align-items: center;
      background: transparent;
      border: 0;
      color: inherit;
      display: grid;
      gap: 12px;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      padding: 10px 12px;
      text-align: left;
      width: 100%;
    }

    .result-item:hover,
    .result-item.selected {
      background: rgba(79, 142, 247, 0.1);
    }

    .result-icon {
      align-items: center;
      background: rgba(79, 142, 247, 0.13);
      border: 1px solid rgba(79, 142, 247, 0.26);
      border-radius: 10px;
      color: var(--accent);
      display: inline-flex;
      height: 34px;
      justify-content: center;
      width: 34px;
    }

    .result-copy {
      display: grid;
      min-width: 0;
    }

    .result-title {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-subtitle {
      color: var(--text-2);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host ::ng-deep mark {
      background: transparent;
      color: var(--accent);
      font-weight: 500;
      padding: 0;
    }

    @media (max-width: 640px) {
      .result-item {
        grid-template-columns: 32px minmax(0, 1fr);
      }

      .badge {
        grid-column: 2;
        justify-self: start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResultItemComponent {
  @Input({ required: true }) item!: SearchItem;
  @Input() query = '';
  @Input() selected = false;
  @Input() optionId = '';
  @Output() select = new EventEmitter<SearchItem>();

  get iconName(): string {
    const aliases: Record<string, string> = {
      'building-skyscraper': 'building-2',
      lock: 'lock-keyhole'
    };

    return aliases[this.item.icon] ?? this.item.icon;
  }

  get highlightedName(): string {
    const text = this.escapeHtml(this.item.name);
    const query = this.query.trim();
    if (!query) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
