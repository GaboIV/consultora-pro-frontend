import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Client, Project } from '../../core/models/management.models';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PagedResult } from '../../core/models/security.models';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ClientFormDialogComponent, ClientFormData } from '../../shared/components/client-form-dialog/client-form-dialog.component';
import { ProjectFormDialogComponent, ProjectFormData } from '../../shared/components/project-form-dialog/project-form-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { UsuarioFormComponent } from '../equipo/usuarios/usuario-form.component';

@Component({
  selector: 'cp-clients-projects-page',
  imports: [
    BadgeComponent,
    ClientFormDialogComponent,
    ProjectFormDialogComponent,
    HasPermissionDirective,
    LucideAngularModule,
    MatDialogModule,
    MatSnackBarModule,
    FormsModule,
    NgSelectModule
  ],
  templateUrl: './clients-projects.page.html',
  styleUrls: ['./clients-projects.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsProjectsPage implements OnInit {
  private readonly facade = inject(ManagementFacade);
  private readonly proyectosService = inject(ProyectosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly router = inject(Router);

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

  protected readonly projectsList = signal<Project[]>([]);
  protected readonly projectsTotalCount = signal(0);
  protected readonly projectsCurrentPage = signal(1);
  protected readonly projectsPageSize = 20;
  protected readonly selectedEstado = signal<string | null>(null);
  protected readonly selectedClienteId = signal<string | null>(null);
  protected readonly projectsLoading = signal(false);

  protected readonly projectsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.projectsTotalCount() / this.projectsPageSize))
  );

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const mode = this.modeFromUrl(event.urlAfterRedirects);
        this.viewMode.set(mode);
        if (mode === 'projects') {
          this.loadProjects();
        }
      });
  }

  ngOnInit(): void {
    if (this.viewMode() === 'projects') {
      this.loadProjects();
    }
  }

  protected loadProjects(): void {
    this.projectsLoading.set(true);
    this.proyectosService.getProjects(
      this.projectsCurrentPage(),
      this.projectsPageSize,
      this.selectedEstado() || undefined,
      this.selectedClienteId() || undefined
    ).subscribe({
      next: (result) => {
        this.projectsList.set(result.data);
        this.projectsTotalCount.set(result.totalCount);
        this.projectsLoading.set(false);
      },
      error: (err) => {
        this.projectsLoading.set(false);
        this.showError(err, 'No se pudieron cargar los proyectos.');
      }
    });
  }

  protected onClienteFilterChange(clienteId: string | null): void {
    this.selectedClienteId.set(clienteId);
    this.projectsCurrentPage.set(1);
    this.loadProjects();
  }

  protected onEstadoFilterChange(estado: string | null): void {
    this.selectedEstado.set(estado);
    this.projectsCurrentPage.set(1);
    this.loadProjects();
  }

  protected goToProjectsPage(page: number): void {
    if (page < 1 || page > this.projectsTotalPages()) return;
    this.projectsCurrentPage.set(page);
    this.loadProjects();
  }

  protected getClientProjectStats(clientId: string): { active: number; completed: number } {
    const projs = this.facade.projects().filter(p => p.clientId === clientId || this.clientIdByName(p.clientName) === clientId);
    const active = projs.filter(p => p.statusValue !== 'Completado' && p.status !== 'Completado').length;
    const completed = projs.filter(p => p.statusValue === 'Completado' || p.status === 'Completado').length;
    return { active, completed };
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
          error: (err: unknown) => this.showError(err, 'Error al guardar el cliente.')
        });
    } else {
      this.facade.createClient(data).subscribe({
        next: () => { this.closeClientForm(); this.facade.refresh(); },
        error: (err: unknown) => this.showError(err, 'Error al guardar el cliente.')
      });
    }
  }

  protected confirmDeleteClient(client: Client): void {
    if (!confirm(`¿Desactivar cliente "${client.name}"?`)) return;
    this.deletingId.set(client.id);
    this.facade.deleteClient(client.id).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); },
      error: (err: unknown) => { this.deletingId.set(null); this.showError(err, 'Error al eliminar el cliente.'); }
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
    const command = {
      nombre: data.nombre,
      clienteId: data.clienteId,
      tipoSolucionId: data.tipoSolucionId,
      etapa: data.etapa,
      estado: data.estado,
      progreso: data.progress,
      fechaInicio: data.startDate,
      fechaFin: data.endDate,
      miembros: data.miembros
    };

    if (edit) {
      this.facade.updateProject(edit.id, command).subscribe({
        next: () => { this.closeProjectForm(); this.facade.refresh(); this.loadProjects(); },
        error: (err: unknown) => this.showError(err, 'Error al guardar el proyecto.')
      });
    } else {
      this.facade.createProject(command).subscribe({
        next: () => { this.closeProjectForm(); this.facade.refresh(); this.loadProjects(); },
        error: (err: unknown) => this.showError(err, 'Error al guardar el proyecto.')
      });
    }
  }

  protected projectFormInitial(project: Project | undefined): ProjectFormData | undefined {
    if (!project) return undefined;

    const parseDateToInputFormat = (dateStr: string | undefined): string => {
      if (!dateStr) return new Date().toISOString().substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10);
      }
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {}
      return new Date().toISOString().substring(0, 10);
    };

    return {
      nombre: project.name,
      clienteId: project.clientId ?? this.clientIdByName(project.clientName),
      tipoSolucionId: project.tipoSolucionId,
      etapa: project.stageValue ?? this.stageValue(project.stage),
      estado: project.statusValue ?? this.statusValue(project.status),
      progress: project.progress ?? 0,
      startDate: parseDateToInputFormat(project.startDate),
      endDate: parseDateToInputFormat(project.endDate),
      miembros: (project.miembros ?? [])
        .map(m => ({ usuarioId: m.usuarioId, rol: m.rol }))
    };
  }

  protected confirmDeleteProject(projectId: string, projectName: string): void {
    if (!confirm(`¿Eliminar proyecto "${projectName}"?`)) return;
    this.deletingId.set(projectId);
    this.facade.deleteProject(projectId).subscribe({
      next: () => { this.deletingId.set(null); this.facade.refresh(); this.loadProjects(); },
      error: (err: unknown) => { this.deletingId.set(null); this.showError(err, 'Error al eliminar el proyecto.'); }
    });
  }

  protected navigateToEnvironments(project: Project): void {
    this.router.navigate(['/ambientes'], { queryParams: { proyectoId: project.id } });
  }

  protected navigateToProjectDetail(project: Project): void {
    this.router.navigate(['/proyectos', project.id]);
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

  private showError(error: unknown, fallback: string): void {
    this.snackBar.open(apiErrorMessage(error, fallback), 'Cerrar', { duration: 4200 });
  }
}
