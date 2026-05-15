import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
  readonly credentialsExpiringCount = computed(() => this.facade.infrastructure().credentials.length);
  readonly recentDeployments = computed(() => this.facade.infrastructure().deployments);

  readonly environmentsAlertCount = computed(() => {
    const infrastructure = this.facade.infrastructure();
    return infrastructure.environmentSummary?.alertas
      ?? infrastructure.environmentGroups.reduce(
        (total, group) => total + group.items.filter(item => item.state === 'Alerta').length,
        0
      );
  });

  readonly deploymentSuccessRate = computed(() => {
    const deployments = this.recentDeployments();
    if (deployments.length === 0) return '—';
    const success = deployments.filter(d => d.status === 'Exitoso').length;
    return `${Math.round((success / deployments.length) * 100)}%`;
  });
}
