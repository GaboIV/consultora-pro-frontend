import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Client, CreateMemberCommand } from '../../core/models/management.models';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ClientFormDialogComponent, ClientFormData } from '../../shared/components/client-form-dialog/client-form-dialog.component';
import { MemberFormDialogComponent, MemberFormData } from '../../shared/components/member-form-dialog/member-form-dialog.component';
import { ProjectFormDialogComponent, ProjectFormData } from '../../shared/components/project-form-dialog/project-form-dialog.component';

@Component({
  selector: 'cp-clients-projects-page',
  imports: [
    BadgeComponent,
    ClientFormDialogComponent,
    MemberFormDialogComponent,
    ProjectFormDialogComponent,
    LucideAngularModule
  ],
  templateUrl: './clients-projects.page.html',
  styleUrls: ['./clients-projects.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsProjectsPage {
  private readonly facade = inject(ManagementFacade);

  readonly clients = this.facade.clients;
  readonly projects = this.facade.projects;
  readonly tiposSolucion = this.facade.tiposSolucion;
  readonly members = this.facade.members;

  protected showClientForm = signal(false);
  protected showProjectForm = signal(false);
  protected showMemberForm = signal(false);
  protected editingClient = signal<Client | undefined>(undefined);
  protected deletingId = signal<string | null>(null);

  protected openCreateClient(): void {
    this.editingClient.set(undefined);
    this.showClientForm.set(true);
  }

  protected openEditClient(client: Client): void {
    this.editingClient.set(client);
    this.showClientForm.set(true);
  }

  protected closeClientForm(): void {
    this.showClientForm.set(false);
    this.editingClient.set(undefined);
  }

  protected onSaveClient(data: ClientFormData): void {
    const edit = this.editingClient();
    if (edit) {
      this.facade.updateClient(edit.id, data).subscribe({
          next: () => { this.closeClientForm(); this.facade.refresh(); },
          error: (err: unknown) => { console.error('Error saving client:', err); alert('Error al guardar el cliente.'); }
        });
    } else {
      this.facade.createClient(data).subscribe({
        next: () => { this.closeClientForm(); this.facade.refresh(); },
        error: (err: unknown) => { console.error('Error saving client:', err); alert('Error al guardar el cliente.'); }
      });
    }
  }

  protected confirmDeleteClient(client: Client): void {
    if (!confirm(`¿Desactivar cliente "${client.name}"?`)) return;
    this.deletingId.set(client.id);
    this.facade.deleteClient(client.id).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); },
      error: (err: unknown) => { console.error('Error deleting client:', err); this.deletingId.set(null); alert('Error al eliminar el cliente.'); }
    });
  }

  protected openCreateProject(): void {
    this.showProjectForm.set(true);
  }

  protected closeProjectForm(): void {
    this.showProjectForm.set(false);
  }

  protected onSaveProject(data: ProjectFormData): void {
    this.facade.createProject(data).subscribe({
      next: () => { this.closeProjectForm(); this.facade.refresh(); },
      error: (err: unknown) => { console.error('Error saving project:', err); alert('Error al guardar el proyecto.'); }
    });
  }

  protected confirmDeleteProject(projectId: string, projectName: string): void {
    if (!confirm(`¿Eliminar proyecto "${projectName}"?`)) return;
    this.deletingId.set(projectId);
    this.facade.deleteProject(projectId).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); },
      error: (err: unknown) => { console.error('Error deleting project:', err); this.deletingId.set(null); alert('Error al eliminar el proyecto.'); }
    });
  }

  protected onSaveMember(data: MemberFormData): void {
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
      this.showMemberForm.set(false);
    });
  }
}
