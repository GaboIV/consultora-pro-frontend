import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';
import { StatusDotComponent } from '../../shared/components/status-dot/status-dot.component';

@Component({
  selector: 'cp-technical-infrastructure-page',
  imports: [
    BadgeComponent,
    SectionCardComponent,
    StatusDotComponent,
    LucideAngularModule
  ],
  templateUrl: './technical-infrastructure.page.html',
  styleUrls: ['./technical-infrastructure.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicalInfrastructurePage {
  private readonly facade = inject(ManagementFacade);

  readonly infrastructure = this.facade.infrastructure;
}
