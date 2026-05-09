import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { CreateMemberCommand } from '../../core/models/management.models';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { MemberFormDialogComponent, MemberFormData } from '../../shared/components/member-form-dialog/member-form-dialog.component';
import { SectionCardComponent } from '../../shared/components/section-card/section-card.component';

@Component({
  selector: 'cp-team-permissions-page',
  imports: [
    BadgeComponent,
    MemberFormDialogComponent,
    SectionCardComponent,
    LucideAngularModule
  ],
  templateUrl: './team-permissions.page.html',
  styleUrls: ['./team-permissions.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamPermissionsPage {
  private readonly facade = inject(ManagementFacade);

  readonly members = this.facade.members;
  readonly team = this.facade.team;

  readonly showMemberDialog = signal(false);

  protected readonly TONES = ['blue', 'green', 'amber', 'purple', 'red', 'teal', 'gray'];

  protected onMemberSaved(data: MemberFormData): void {
    const command: CreateMemberCommand = {
      nombres: data.nombres,
      apellidos: data.apellidos,
      correo: data.correo,
      telefono: data.telefono,
      iniciales: data.iniciales,
      puesto: data.puesto
    };
    this.facade.createMember(command).subscribe(() => {
      this.facade.refresh();
      this.showMemberDialog.set(false);
    });
  }
}
