import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Tone } from '../../../core/models/management.models';

@Component({
  selector: 'cp-status-dot',
  template: '<span class="status-dot status-dot-{{ tone() }}" aria-hidden="true"></span>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusDotComponent {
  readonly tone = input<Tone>('gray');
}
