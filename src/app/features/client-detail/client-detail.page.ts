import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { Client, Project } from '../../core/models/management.models';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ClientFormDialogComponent, ClientFormData } from '../../shared/components/client-form-dialog/client-form-dialog.component';
import { ProjectFormDialogComponent, ProjectFormData } from '../../shared/components/project-form-dialog/project-form-dialog.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { UsuarioFormComponent } from '../equipo/usuarios/usuario-form.component';

@Component({
  selector: 'cp-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    LucideAngularModule,
    ClientFormDialogComponent,
    ProjectFormDialogComponent,
    HasPermissionDirective,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './client-detail.page.html',
  styleUrl: './client-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(ManagementFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly clientId = signal<string | null>(null);
  protected readonly showEditForm = signal(false);
  protected readonly showProjectForm = signal(false);

  protected readonly today = new Date().toISOString().substring(0, 10);
  protected readonly in90days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  readonly client = computed(() =>
    this.facade.clients().find(c => c.id === this.clientId())
  );

  readonly clientProjects = computed(() => {
    const c = this.client();
    if (!c) return [];
    return this.facade.projects().filter(p => p.clientId === c.id || p.clientName === c.name);
  });

  readonly stats = computed(() => {
    const projs = this.clientProjects();
    const active = projs.filter(p => p.statusValue !== 'Completado' && p.status !== 'Completado').length;
    const completed = projs.filter(p => p.statusValue === 'Completado' || p.status === 'Completado').length;
    return { active, completed };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.clientId.set(id);
  }

  protected navigateBack(): void {
    this.router.navigate(['/clientes']);
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
      if (result) this.facade.refresh();
    });
  }

  protected openNewProject(): void {
    this.showProjectForm.set(true);
  }

  protected closeNewProject(): void {
    this.showProjectForm.set(false);
  }

  protected onCreateProject(data: ProjectFormData): void {
    this.facade.createProject({
      nombre: data.nombre,
      clienteId: data.clienteId,
      tipoSolucionId: data.tipoSolucionId,
      etapa: data.etapa,
      estado: data.estado,
      progreso: data.progress,
      fechaInicio: data.startDate,
      fechaFin: data.endDate,
      miembros: data.miembros
    }).subscribe({
      next: ({ id }) => {
        this.closeNewProject();
        this.facade.refresh();
        this.router.navigate(['/proyectos', id]);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error al crear el proyecto.';
        this.snackBar.open(message, 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected openEdit(): void {
    this.showEditForm.set(true);
  }

  protected closeEdit(): void {
    this.showEditForm.set(false);
  }

  protected onSaveClient(data: ClientFormData): void {
    const id = this.clientId();
    if (!id) return;

    this.facade.updateClient(id, data).subscribe({
      next: () => {
        this.closeEdit();
        this.facade.refresh();
        this.snackBar.open('Cliente actualizado exitosamente.', 'Cerrar', { duration: 3000 });
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error al guardar el cliente.';
        this.snackBar.open(message, 'Cerrar', { duration: 4200 });
      }
    });
  }
}
