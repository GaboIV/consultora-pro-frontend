import { Directive, DestroyRef, TemplateRef, ViewContainerRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private hasView = false;

  readonly appHasPermission = input<string | null | undefined>(undefined);

  constructor() {
    this.auth.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateView());
  }

  ngOnChanges(): void {
    this.updateView();
  }

  private updateView(): void {
    const permission = this.appHasPermission();
    const canRender = !permission || this.auth.hasPermission(permission);

    if (canRender && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!canRender && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
