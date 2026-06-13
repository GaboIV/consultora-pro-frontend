import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { SearchHistoryItem, SearchItem, SearchResultType, SearchViewState } from '../../../core/models/search.models';
import { AuthService } from '../../../core/services/auth.service';
import { GlobalSearchService } from './global-search.service';
import { SearchResultItemComponent } from './search-result-item.component';

interface QuickFilter {
  label: string;
  prefix: string;
  type: SearchResultType;
  permission: string;
}

interface SearchGroup {
  type: SearchResultType;
  label: string;
  items: SearchItem[];
  startIndex: number;
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  proyecto: 'Proyectos',
  cliente: 'Clientes',
  usuario: 'Usuarios',
  credencial: 'Credenciales',
  ambiente: 'Ambientes',
  repositorio: 'Repositorios',
  despliegue: 'Despliegues'
};

@Component({
  selector: 'cp-global-search',
  imports: [LucideAngularModule, SearchResultItemComponent],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalSearchComponent {
  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  private readonly service = inject(GlobalSearchService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly focused = signal(false);
  protected readonly history = signal<SearchHistoryItem[]>([]);
  protected readonly selectedIndex = signal(0);
  protected readonly viewState = toSignal(this.service.state$, {
    initialValue: { status: 'idle', query: '' } as SearchViewState
  });

  protected readonly shortcutLabel = this.isMac() ? '⌘K' : 'Ctrl+K';

  protected readonly quickFilters: QuickFilter[] = [
    { label: 'Proyectos', prefix: 'p:', type: 'proyecto', permission: 'proyectos.ver' },
    { label: 'Clientes', prefix: 'c:', type: 'cliente', permission: 'clientes.ver' },
    { label: 'Usuarios', prefix: 'u:', type: 'usuario', permission: 'roles.ver' },
    { label: 'Credenciales', prefix: 'k:', type: 'credencial', permission: 'credenciales.ver' },
    { label: 'Ambientes', prefix: 'a:', type: 'ambiente', permission: 'ambientes.ver' },
    { label: 'Repositorios', prefix: 'r:', type: 'repositorio', permission: 'proyectos.ver' },
    { label: 'Despliegues', prefix: 'd:', type: 'despliegue', permission: 'despliegues.ver' }
  ];

  protected readonly visibleQuickFilters = computed(() =>
    this.quickFilters.filter((filter) => this.auth.hasPermission(filter.permission))
  );

  protected readonly items = computed(() => this.viewState().result?.items ?? []);

  protected readonly activeTerm = computed(() => this.service.parseQuery(this.query()).term);

  protected readonly groups = computed<SearchGroup[]>(() => {
    const groups = new Map<SearchResultType, SearchItem[]>();
    for (const item of this.items()) {
      groups.set(item.type, [...(groups.get(item.type) ?? []), item]);
    }

    let startIndex = 0;
    return Array.from(groups.entries()).map(([type, items]) => {
      const group = {
        type,
        label: TYPE_LABELS[type],
        items,
        startIndex
      };
      startIndex += items.length;
      return group;
    });
  });

  protected readonly dropdownOpen = computed(() =>
    this.focused()
      && (
        !this.query().trim()
        || this.viewState().status === 'loading'
        || this.viewState().status === 'success'
        || this.viewState().status === 'empty'
        || this.viewState().status === 'error'
      )
  );

  protected readonly footerText = computed(() => {
    const state = this.viewState();
    if (state.status === 'success' && state.result) {
      const localLabel = state.result.local ? ' · Resultados locales (sin conexión)' : '';
      return `${state.result.total} resultado(s)${localLabel}`;
    }

    return '↑↓ navegar · Enter abrir · Esc cerrar';
  });

  constructor() {
    this.service.isOpen$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isOpen) => {
        if (isOpen) this.focusSearch();
      });

    this.service.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.selectedIndex.set(0));
  }

  @HostListener('document:keydown', ['$event'])
  protected handleGlobalShortcut(event: KeyboardEvent): void {
    const trigger = this.isMac() ? event.metaKey : event.ctrlKey;
    if (trigger && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.service.open();
    }
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected onFocus(): void {
    this.focused.set(true);
    this.history.set(this.service.getHistory());
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.focused.set(true);
    this.service.search(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const items = this.items();

    if (event.key === 'ArrowDown' && items.length > 0) {
      event.preventDefault();
      this.selectedIndex.update((index) => (index + 1) % items.length);
      return;
    }

    if (event.key === 'ArrowUp' && items.length > 0) {
      event.preventDefault();
      this.selectedIndex.update((index) => (index - 1 + items.length) % items.length);
      return;
    }

    if (event.key === 'Enter' && items.length > 0) {
      event.preventDefault();
      this.selectItem(items[this.selectedIndex()]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.clearAndClose();
    }
  }

  protected clear(): void {
    this.query.set('');
    this.service.search('');
    this.focusSearch(false);
  }

  protected clearAndClose(): void {
    this.query.set('');
    this.service.search('');
    this.close();
  }

  protected retry(): void {
    this.service.retry(this.query());
  }

  protected applyFilter(filter: QuickFilter): void {
    const value = `${filter.prefix} `;
    this.query.set(value);
    this.service.search(value);
    this.focusSearch(false);
  }

  protected selectItem(item: SearchItem): void {
    this.service.saveToHistory(item, this.query());
    this.close();
    void this.router.navigateByUrl(item.navigateTo);
  }

  protected openHistory(item: SearchHistoryItem): void {
    this.close();
    void this.router.navigateByUrl(this.service.historyNavigateTo(item));
  }

  protected setSelectedIndex(index: number): void {
    this.selectedIndex.set(index);
  }

  protected optionId(index: number): string {
    return `global-search-option-${index}`;
  }

  private focusSearch(selectText = true): void {
    this.focused.set(true);
    this.history.set(this.service.getHistory());
    queueMicrotask(() => {
      this.searchInput?.nativeElement.focus();
      if (selectText) this.searchInput?.nativeElement.select();
    });
  }

  private close(): void {
    this.focused.set(false);
    this.service.close();
  }

  private isMac(): boolean {
    return navigator.platform.toUpperCase().includes('MAC');
  }
}
