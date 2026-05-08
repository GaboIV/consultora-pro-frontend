import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'cp-root',
  imports: [ShellComponent],
  template: '<cp-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}
