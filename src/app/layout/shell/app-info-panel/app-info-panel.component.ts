import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { LucideAngularModule } from 'lucide-angular';

import { environment } from '../../../../environments/environment';
import { ManagementFacade } from '../../../core/data-access/management.facade';

@Component({
  selector: 'cp-app-info-panel',
  imports: [LucideAngularModule],
  templateUrl: './app-info-panel.component.html',
  styleUrls: ['./app-info-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppInfoPanelComponent {
  private readonly facade = inject(ManagementFacade);
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);

  @ViewChild('modalTpl') private modalTpl!: TemplateRef<unknown>;
  private overlayRef?: OverlayRef;

  readonly isOpen = signal(false);
  readonly appVersion = environment.appVersion;

  readonly dataLoaded = computed(() => !!this.facade.snapshot().generatedAt);
  readonly clientsCount = computed(() => this.facade.clients().length);
  readonly projectsCount = computed(() => this.facade.projects().length);
  readonly environmentsTotal = computed(
    () => this.facade.infrastructure().environmentSummary?.total ?? 0,
  );
  readonly teamCount = computed(() => this.facade.team().members.length);
  readonly reposCount = computed(() => this.facade.infrastructure().repositories.length);

  toggle(): void {
    this.isOpen() ? this.close() : this.open();
  }

  open(): void {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: true,
      backdropClass: 'cp-info-backdrop',
    });
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.attach(new TemplatePortal(this.modalTpl, this.vcr));
    this.isOpen.set(true);
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.isOpen.set(false);
  }
}
