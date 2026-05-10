import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { filter } from 'rxjs';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Client, Project } from '../../core/models/management.models';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ClientFormDialogComponent, ClientFormData } from '../../shared/components/client-form-dialog/client-form-dialog.component';
import { ProjectFormDialogComponent, ProjectFormData } from '../../shared/components/project-form-dialog/project-form-dialog.component';
import { UsuarioFormComponent } from '../equipo/usuarios/usuario-form.component';

@Component({
  selector: 'cp-clients-projects-page',
  imports: [
    BadgeComponent,
    ClientFormDialogComponent,
    ProjectFormDialogComponent,
    LucideAngularModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './clients-projects.page.html',
  styleUrls: ['./clients-projects.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsProjectsPage {
  private readonly facade = inject(ManagementFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly clients = this.facade.clients;
  readonly projects = this.facade.projects;
  readonly tiposSolucion = this.facade.tiposSolucion;
  readonly usuarios = this.facade.usuarios;

  protected showClientForm = signal(false);
  protected showProjectForm = signal(false);
  protected editingClient = signal<Client | undefined>(undefined);
  protected editingProject = signal<Project | undefined>(undefined);
  protected deletingId = signal<string | null>(null);
  protected readonly viewMode = signal<'clients' | 'projects'>(this.modeFromUrl(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.viewMode.set(this.modeFromUrl(event.urlAfterRedirects)));
  }

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
          error: (err: unknown) => { console.error('Error saving client:', err); this.snackBar.open('Error al guardar el cliente.', 'Cerrar', { duration: 3000 }); }
        });
    } else {
      this.facade.createClient(data).subscribe({
        next: () => { this.closeClientForm(); this.facade.refresh(); },
        error: (err: unknown) => { console.error('Error saving client:', err); this.snackBar.open('Error al guardar el cliente.', 'Cerrar', { duration: 3000 }); }
      });
    }
  }

  protected confirmDeleteClient(client: Client): void {
    if (!confirm(`¿Desactivar cliente "${client.name}"?`)) return;
    this.deletingId.set(client.id);
    this.facade.deleteClient(client.id).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); },
      error: (err: unknown) => { console.error('Error deleting client:', err); this.deletingId.set(null); this.snackBar.open('Error al eliminar el cliente.', 'Cerrar', { duration: 3000 }); }
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
        error: (err: unknown) => { console.error('Error saving project:', err); this.snackBar.open('Error al guardar el proyecto.', 'Cerrar', { duration: 3000 }); }
      });
    } else {
      this.facade.createProject(data).subscribe({
        next: () => { this.closeProjectForm(); this.facade.refresh(); },
        error: (err: unknown) => { console.error('Error saving project:', err); this.snackBar.open('Error al guardar el proyecto.', 'Cerrar', { duration: 3000 }); }
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
      miembros: (project.miembros ?? [])
        .map(m => ({ usuarioId: m.usuarioId, rol: m.rol }))
    };
  }

  protected confirmDeleteProject(projectId: string, projectName: string): void {
    if (!confirm(`¿Eliminar proyecto "${projectName}"?`)) return;
    this.deletingId.set(projectId);
    this.facade.deleteProject(projectId).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); },
      error: (err: unknown) => { console.error('Error deleting project:', err); this.deletingId.set(null); this.snackBar.open('Error al eliminar el proyecto.', 'Cerrar', { duration: 3000 }); }
    });
  }

  protected openCreateUser(): void {
    const dialogRef = this.dialog.open(UsuarioFormComponent, {
      data: { mode: 'create' },
      panelClass: ['cp-dialog-panel', 'cp-user-dialog-panel'],
      width: 'min(700px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 32px)'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.facade.refresh();
      }
    });
  }

  private modeFromUrl(url: string): 'clients' | 'projects' {
    return url.startsWith('/proyectos') ? 'projects' : 'clients';
  }

  private clientIdByName(clientName: string): string {
    return this.clients().find(c => c.name === clientName)?.id ?? '';
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

  protected getPrincipales(project: Project): any[] {
    return (project.miembros ?? []).filter(m => m.rol === 'Principal');
  }

  protected getApoyos(project: Project): any[] {
    return (project.miembros ?? []).filter(m => m.rol === 'Apoyo');
  }

  protected totalDevelopers(project: Project): number {
    return (project.miembros ?? []).length;
  }
}
