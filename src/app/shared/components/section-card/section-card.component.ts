import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cp-section-card',
  templateUrl: './section-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCardComponent {
  readonly title = input.required<string>();
}
