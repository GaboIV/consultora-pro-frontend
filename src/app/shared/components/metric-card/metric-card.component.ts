import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Metric } from '../../../core/models/management.models';

@Component({
  selector: 'cp-metric-card',
  templateUrl: './metric-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCardComponent {
  readonly metric = input.required<Metric>();
}
