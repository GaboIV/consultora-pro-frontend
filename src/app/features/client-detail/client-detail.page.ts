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
  template: `
    <section class="page" *ngIf="client() as c">
      <header class="page-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button class="btn-back" type="button" (click)="navigateBack()" style="background: transparent; border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; color: var(--text-2); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: border-color 0.15s, color 0.15s;">
            <i-lucide name="arrow-left" [size]="16" />
          </button>
          <div class="avatar-token square tone-{{ c.logoTone }}" style="width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; border-radius: 8px;">{{ c.initials }}</div>
          <div>
            <h1 class="page-title" style="margin: 0; font-size: 24px; font-weight: 700; color: var(--text);">{{ c.name }}</h1>
            <p class="page-subtitle" style="margin: 4px 0 0; color: var(--text-3); font-size: 13px;">{{ c.sector }} · Cliente registrado</p>
          </div>
          <cp-badge [label]="c.status" [tone]="c.statusTone" />
        </div>

        <button class="btn btn-secondary btn-sm" type="button" (click)="openEdit()" *appHasPermission="'clientes.editar'">
          <i-lucide name="edit-2" [size]="14" [strokeWidth]="2" />
          Editar cliente
        </button>
      </header>

      <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <article class="summary-card tone-blue" style="background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px;">
          <span class="summary-label" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); font-weight: 600;">Proyectos activos</span>
          <strong style="font-size: 28px; font-weight: 700; color: var(--text);">{{ stats().active }}</strong>
          <small style="font-size: 11px; color: var(--text-3);">En curso, planificación o por vencer</small>
        </article>
        <article class="summary-card tone-green" style="background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 4px;">
          <span class="summary-label" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-3); font-weight: 600;">Proyectos completados</span>
          <strong style="font-size: 28px; font-weight: 700; color: var(--text);">{{ stats().completed }}</strong>
          <small style="font-size: 11px; color: var(--text-3);">Entregados satisfactoriamente</small>
        </article>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.5px;">Proyectos</span>
        <button class="btn btn-primary btn-sm" type="button" (click)="openNewProject()" *appHasPermission="'proyectos.crear'">
          <i-lucide name="plus" [size]="14" [strokeWidth]="2.5" />
          Nuevo proyecto
        </button>
      </div>

      <div class="table-wrap" style="background: var(--bg-2); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="color: var(--text-3); font-size: 11px; font-weight: 700; padding: 12px 14px; text-align: left; text-transform: uppercase;">Proyecto</th>
              <th style="color: var(--text-3); font-size: 11px; font-weight: 700; padding: 12px 14px; text-align: left; text-transform: uppercase;">Tipo solución</th>
              <th style="color: var(--text-3); font-size: 11px; font-weight: 700; padding: 12px 14px; text-align: left; text-transform: uppercase;">Etapa</th>
              <th style="color: var(--text-3); font-size: 11px; font-weight: 700; padding: 12px 14px; text-align: left; text-transform: uppercase;">Progreso</th>
              <th style="color: var(--text-3); font-size: 11px; font-weight: 700; padding: 12px 14px; text-align: left; text-transform: uppercase;">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let project of clientProjects()" (click)="navigateToProjectDetail(project)" style="cursor: pointer; border-top: 1px solid var(--border-subtle); transition: background-color 0.15s;">
              <td class="data-name" style="padding: 12px 14px; font-size: 13px; font-weight: 600; color: var(--text);">{{ project.name }}</td>
              <td style="padding: 12px 14px; font-size: 13px; color: var(--text);"><cp-badge [label]="project.tipoSolucionNombre" tone="purple" /></td>
              <td style="padding: 12px 14px; font-size: 13px; color: var(--text);"><cp-badge [label]="project.stage" [tone]="project.stageTone" /></td>
              <td style="padding: 12px 14px; font-size: 13px; color: var(--text);">
                <div class="progress-bar-container tone-{{ project.progressTone }}" style="display: flex; align-items: center; gap: 8px; width: 100px;">
                  <div class="progress-bar-track" style="background: var(--border); border-radius: 99px; flex: 1; height: 6px; overflow: hidden; position: relative;">
                    <div class="progress-bar-fill" [style.width.%]="project.progress" [style.background-color]="'var(--tone-color)'" style="border-radius: 99px; height: 100%;"></div>
                  </div>
                  <span class="progress-text" style="color: var(--text-2); font-size: 11px; font-weight: 600; min-width: 28px; text-align: right;">{{ project.progress }}%</span>
                </div>
              </td>
              <td style="padding: 12px 14px; font-size: 13px; color: var(--text);"><cp-badge [label]="project.status" [tone]="project.statusTone" /></td>
            </tr>
            <tr *ngIf="clientProjects().length === 0">
              <td colspan="5" style="color: var(--text-3); padding: 24px; text-align: center;">No hay proyectos asociados a este cliente.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <cp-project-form-dialog
      *ngIf="showProjectForm()"
      [isEdit]="false"
      [clients]="facade.clients()"
      [tiposSolucion]="facade.tiposSolucion()"
      [usuarios]="facade.usuarios()"
      [initial]="{ nombre: '', clienteId: clientId()!, tipoSolucionId: '', etapa: 'Desarrollo', estado: 'Planificacion', progress: 0, startDate: today, endDate: in90days, miembros: [] }"
      (saveData)="onCreateProject($event)"
      (cancel)="closeNewProject()"
      (createUser)="openCreateUser()"
    />

    <cp-client-form-dialog
      *ngIf="showEditForm()"
      [isEdit]="true"
      [initial]="{
        nombre: client()!.name,
        industria: client()!.sector,
        iniciales: client()!.initials,
        colorClass: client()!.logoTone
      }"
      (saveData)="onSaveClient($event)"
      (cancel)="closeEdit()"
    />
  `,
  styles: [`
    .avatar-token.tone-blue { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
    .avatar-token.tone-green { background: color-mix(in srgb, var(--green) 15%, transparent); color: var(--green); }
    .avatar-token.tone-amber { background: color-mix(in srgb, var(--amber) 15%, transparent); color: var(--amber); }
    .avatar-token.tone-purple { background: color-mix(in srgb, var(--purple) 15%, transparent); color: var(--purple); }
    .avatar-token.tone-red { background: color-mix(in srgb, var(--red) 15%, transparent); color: var(--red); }
    .avatar-token.tone-teal { background: color-mix(in srgb, var(--teal) 15%, transparent); color: var(--teal); }
    .avatar-token.tone-gray { background: color-mix(in srgb, var(--text-3) 15%, transparent); color: var(--text-3); }

    .btn-back:hover { border-color: var(--border-strong) !important; color: var(--text) !important; background: var(--bg-3) !important; }
    tbody tr:hover td { background: var(--bg-3); }
  `],
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
