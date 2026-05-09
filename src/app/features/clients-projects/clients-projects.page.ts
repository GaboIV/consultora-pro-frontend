import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Client, CreateMemberCommand, Project } from '../../core/models/management.models';
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
  protected editingProject = signal<Project | undefined>(undefined);
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
    this.editingProject.set(undefined);
    this.showProjectForm.set(true);
  }

  protected openEditProject(project: Project): void {
    this.editingProject.set(project);
    this.showProjectForm.set(true);
  }

  protected closeProjectForm(): void {
    this.showProjectForm.set(false);
    this.editingProject.set(undefined);
  }

  protected onSaveProject(data: ProjectFormData): void {
    const edit = this.editingProject();
    if (edit) {
      this.facade.updateProject(edit.id, data).subscribe({
        next: () => { this.closeProjectForm(); this.facade.refresh(); },
        error: (err: unknown) => { console.error('Error saving project:', err); alert('Error al guardar el proyecto.'); }
      });
    } else {
      this.facade.createProject(data).subscribe({
        next: () => { this.closeProjectForm(); this.facade.refresh(); },
        error: (err: unknown) => { console.error('Error saving project:', err); alert('Error al guardar el proyecto.'); }
      });
    }
  }

  protected projectFormInitial(project: Project | undefined): ProjectFormData | undefined {
    if (!project) return undefined;

    return {
      nombre: project.name,
      clienteId: project.clientId ?? this.clientIdByName(project.clientName),
      tipoSolucionId: project.tipoSolucionId,
      etapa: project.stageValue ?? this.stageValue(project.stage),
      estado: project.statusValue ?? this.statusValue(project.status),
      desarrolladores: (project.desarrolladores ?? [])
        .map(d => ({ memberId: d.memberId ?? this.memberIdByName(d.nombre), rol: d.rol }))
        .filter(d => !!d.memberId)
    };
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

  private clientIdByName(clientName: string): string {
    return this.clients().find(c => c.name === clientName)?.id ?? '';
  }

  private memberIdByName(memberName: string): string {
    const normalizedDeveloperName = this.normalizeName(memberName);
    return this.members().find(m => this.normalizeName(`${m.nombres} ${m.apellidos}`) === normalizedDeveloperName)?.id ?? '';
  }

  private normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private stageValue(stage: string): string {
    const values: Record<string, string> = {
      analisis: 'Analisis',
      'análisis': 'Analisis',
      diseno: 'Diseno',
      'diseño': 'Diseno',
      desarrollo: 'Desarrollo',
      qa: 'QA',
      deploy: 'Deploy',
      soporte: 'Soporte',
      entregado: 'Deploy'
    };

    return values[this.normalizeName(stage)] ?? 'Desarrollo';
  }

  private statusValue(status: string): string {
    const values: Record<string, string> = {
      planificacion: 'Planificacion',
      'planificación': 'Planificacion',
      'en curso': 'EnCurso',
      completado: 'Completado',
      'por vencer': 'PorVencer'
    };

    return values[this.normalizeName(status)] ?? 'Planificacion';
  }

  protected getPrincipales(project: Project): { memberId?: string; nombre: string; rol: 'Principal' | 'Apoyo' }[] {
    return (project.desarrolladores ?? []).filter(d => d.rol === 'Principal');
  }

  protected getApoyos(project: Project): { memberId?: string; nombre: string; rol: 'Principal' | 'Apoyo' }[] {
    return (project.desarrolladores ?? []).filter(d => d.rol === 'Apoyo');
  }

  protected totalDevelopers(project: Project): number {
    return (project.desarrolladores ?? []).length;
  }
}
