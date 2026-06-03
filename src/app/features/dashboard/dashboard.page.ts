import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { interval } from 'rxjs';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';

interface PipelineGroup {
  label: string;
  tone: 'green' | 'red' | 'gray';
  repos: { name: string; provider: string; branch: string; stack: string }[];
}

@Component({
  selector: 'cp-dashboard-page',
  imports: [
    BadgeComponent,
    MetricCardComponent,
    LucideAngularModule,
    FormsModule,
    NgSelectModule
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly facade = inject(ManagementFacade);

  readonly executive = this.facade.executive;
  readonly periodLabel = computed(() => this.facade.snapshot().periodLabel);
  readonly credentialsExpiringCount = computed(() => this.facade.infrastructure().credentials.length);
  readonly recentDeployments = computed(() => this.facade.infrastructure().deployments);
  readonly repositories = computed(() => this.facade.infrastructure().repositories);

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
    if (deployments.length === 0) return '\u2014';
    const success = deployments.filter(d => d.status === 'Exitoso').length;
    return `${Math.round((success / deployments.length) * 100)}%`;
  });

  readonly passingCount = computed(() => this.repositories().filter(r => r.status === 'Passing').length);
  readonly failedCount = computed(() => this.repositories().filter(r => r.status === 'Failed').length);
  readonly unknownCount = computed(() => this.repositories().filter(r => r.status !== 'Passing' && r.status !== 'Failed').length);

  readonly pipelineGroups = computed<PipelineGroup[]>(() => {
    const repos = this.repositories();
    const groups: PipelineGroup[] = [];
    const passing = repos.filter(r => r.status === 'Passing');
    const failed = repos.filter(r => r.status === 'Failed');
    const unknown = repos.filter(r => r.status !== 'Passing' && r.status !== 'Failed');
    if (passing.length) groups.push({ label: 'Passing', tone: 'green', repos: passing });
    if (failed.length) groups.push({ label: 'Failed', tone: 'red', repos: failed });
    if (unknown.length) groups.push({ label: 'Desconocido', tone: 'gray', repos: unknown });
    return groups;
  });

  providerLabel(provider: string): string {
    const map: Record<string, string> = { GitHub: 'GitHub', GitLab: 'GitLab', 'Azure DevOps': 'Azure DevOps' };
    return map[provider] ?? provider;
  }

  providerTone(provider: string): 'blue' | 'purple' | 'teal' {
    if (provider === 'GitHub') return 'blue';
    if (provider === 'GitLab') return 'purple';
    return 'teal';
  }

  pipelineStatusTone(status: string): 'green' | 'red' | 'gray' {
    if (status === 'Passing') return 'green';
    if (status === 'Failed') return 'red';
    return 'gray';
  }

  readonly availablePeriods = this.generatePeriods();
  readonly selectedPeriod = signal<string>(this.availablePeriods[0].value);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.facade.setPeriod(this.selectedPeriod());

    // Poll every 5 minutes (300000 ms)
    interval(300000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.facade.refresh();
      });
  }

  onPeriodChange(event: { label: string; value: string } | null): void {
    if (event?.value) {
      this.selectedPeriod.set(event.value);
      this.facade.setPeriod(event.value);
    }
  }

  private generatePeriods(): { label: string; value: string }[] {
    const periods = [];
    const date = new Date();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    for (let i = 0; i < 6; i++) {
      const y = date.getFullYear();
      const m = date.getMonth();
      const label = `${monthNames[m]} ${y}`;
      const value = `${y}-${String(m + 1).padStart(2, '0')}`;
      periods.push({ label, value });
      date.setMonth(date.getMonth() - 1);
    }
    return periods;
  }

  readonly refreshing = signal(false);
  private refreshSub: { unsubscribe: () => void } | null = null;

  startRefresh(): void {
    if (this.refreshing()) return;

    this.refreshing.set(true);
    const prevSnapshot = this.facade.snapshot();
    this.facade.refresh();
    const start = Date.now();

    this.refreshSub?.unsubscribe();
    this.refreshSub = interval(200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const elapsed = Date.now() - start;
        const changed = this.facade.snapshot() !== prevSnapshot;

        if (changed && elapsed >= 1000) {
          this.refreshing.set(false);
          this.refreshSub?.unsubscribe();
        } else if (elapsed >= 15000) {
          this.refreshing.set(false);
          this.refreshSub?.unsubscribe();
        }
      });
  }
}
