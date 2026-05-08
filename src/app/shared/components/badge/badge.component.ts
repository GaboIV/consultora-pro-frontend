import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Tone } from '../../../core/models/management.models';

@Component({
  selector: 'cp-badge',
  template: '<span class="badge badge-{{ tone() }}">{{ label() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('gray');
}
