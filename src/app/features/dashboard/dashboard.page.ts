import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';

@Component({
  selector: 'cp-dashboard-page',
  imports: [
    BadgeComponent,
    MetricCardComponent,
    SectionCardComponent,
    LucideAngularModule
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly facade = inject(ManagementFacade);

  readonly executive = this.facade.executive;
}
