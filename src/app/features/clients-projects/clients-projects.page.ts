import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

@Component({
  selector: 'cp-clients-projects-page',
  imports: [BadgeComponent, LucideAngularModule],
  templateUrl: './clients-projects.page.html',
  styleUrls: ['./clients-projects.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsProjectsPage {
  private readonly facade = inject(ManagementFacade);

  readonly clients = this.facade.clients;
  readonly projects = this.facade.projects;
}
