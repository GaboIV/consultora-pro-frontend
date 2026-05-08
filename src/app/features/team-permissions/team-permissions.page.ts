import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';

@Component({
  selector: 'cp-team-permissions-page',
  imports: [
    BadgeComponent,
    SectionCardComponent,
    LucideAngularModule
  ],
  templateUrl: './team-permissions.page.html',
  styleUrls: ['./team-permissions.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamPermissionsPage {
  private readonly facade = inject(ManagementFacade);

  readonly team = this.facade.team;
}
