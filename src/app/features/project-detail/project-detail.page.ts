import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { combineLatest, of, catchError, tap } from 'rxjs';

import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ProjectDetailService } from '../../core/services/project-detail.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { ProjectTabData, ProjectTab, ProjectTabKey } from '../../core/models/project-detail.models';
import { Ambiente, tipoAmbienteLabel, tipoAmbienteTone, estadoAmbienteLabel, estadoAmbienteTone } from '../../core/models/ambientes.models';
import { Repositorio, proveedorLabel, proveedorTone, pipelineLabel, pipelineTone } from '../../core/models/repositorios.models';
import { CredencialListItem, expirationTone, expirationLabel } from '../../core/models/credenciales.models';
import { DespliegueListItem, estadoDespliegueLabel, estadoDespliegueTone, duracionLabel } from '../../core/models/despliegues.models';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

@Component({
  selector: 'cp-project-detail',
  imports: [
    CommonModule,
    BadgeComponent,
    LucideAngularModule,
    HasPermissionDirective
  ],
  templateUrl: './project-detail.page.html',
  styleUrls: ['./project-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly detailService = inject(ProjectDetailService);
  private readonly facade = inject(ManagementFacade);

  protected readonly projectData = signal<ProjectTabData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<ProjectTabKey>('info');

  protected readonly tabs: ProjectTab[] = [
    { key: 'info', label: 'Información General', icon: 'file-text' },
    { key: 'ambientes', label: 'Ambientes', icon: 'server' },
    { key: 'repositorios', label: 'Repositorios', icon: 'github' },
    { key: 'credenciales', label: 'Credenciales', icon: 'key-round' },
    { key: 'despliegues', label: 'Despliegues', icon: 'rocket' },
    { key: 'equipo', label: 'Equipo', icon: 'users-round' }
  ];

  protected readonly tipoAmbienteLabel = tipoAmbienteLabel;
  protected readonly tipoAmbienteTone = tipoAmbienteTone;
  protected readonly estadoAmbienteLabel = estadoAmbienteLabel;
  protected readonly estadoAmbienteTone = estadoAmbienteTone;
  protected readonly proveedorLabel = proveedorLabel;
  protected readonly proveedorTone = proveedorTone;
  protected readonly pipelineLabel = pipelineLabel;
  protected readonly pipelineTone = pipelineTone;
  protected readonly expirationTone = expirationTone;
  protected readonly expirationLabel = expirationLabel;
  protected readonly estadoDespliegueLabel = estadoDespliegueLabel;
  protected readonly estadoDespliegueTone = estadoDespliegueTone;
  protected readonly duracionLabel = duracionLabel;

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (!projectId) {
      this.error.set('ID de proyecto no proporcionado');
      this.loading.set(false);
      return;
    }

    const projects = this.facade.projects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      console.warn('[ProjectDetail] Proyecto no encontrado en el facade. Projects:', projects.length);
      if (projects.length === 0) {
        this.error.set('No se pudieron cargar los proyectos. Verifica que la API esté corriendo.');
      } else {
        this.error.set('Proyecto no encontrado');
      }
      this.loading.set(false);
      return;
    }

    console.log('[ProjectDetail] Cargando proyecto:', projectId, project.name);

    this.detailService.getProjectData(projectId).pipe(
      tap(data => {
        console.log('[ProjectDetail] Datos cargados:', data);
        this.projectData.set(data);
        this.loading.set(false);
      }),
      catchError(err => {
        console.error('[ProjectDetail] Error:', err);
        this.error.set(err.message ?? 'Error al cargar datos del proyecto');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe();
  }

  protected selectTab(tab: ProjectTabKey): void {
    this.activeTab.set(tab);
  }

  protected getTabCount(tab: ProjectTabKey): number | undefined {
    const data = this.projectData();
    if (!data) return undefined;

    switch (tab) {
      case 'ambientes': return data.ambientes.length;
      case 'repositorios': return data.repositorios.length;
      case 'credenciales': return data.credenciales.length;
      case 'despliegues': return data.despliegues.length;
      case 'equipo': return data.info.miembros.length;
      default: return undefined;
    }
  }

  protected navigateBack(): void {
    this.router.navigate(['/proyectos']);
  }

  protected navigateToCreateAmbiente(): void {
    const data = this.projectData();
    if (!data) return;
    this.router.navigate(['/ambientes'], { queryParams: { proyectoId: data.info.id, nuevo: '1' } });
  }

  protected navigateToCreateRepositorio(): void {
    const data = this.projectData();
    if (!data) return;
    this.router.navigate(['/repositorios'], { queryParams: { proyectoId: data.info.id, nuevo: '1' } });
  }

  protected navigateToCreateCredencial(): void {
    const data = this.projectData();
    if (!data) return;
    this.router.navigate(['/credenciales'], { queryParams: { proyectoId: data.info.id, nuevo: '1' } });
  }

  protected navigateToCreateDespliegue(): void {
    const data = this.projectData();
    if (!data) return;
    this.router.navigate(['/despliegues'], { queryParams: { proyectoId: data.info.id, nuevo: '1' } });
  }

  protected formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  protected formatProgress(progress: number): string {
    return `${Math.round(progress)}%`;
  }

  protected getProgressTone(progress: number): 'green' | 'amber' | 'red' | 'blue' {
    if (progress >= 80) return 'green';
    if (progress >= 50) return 'amber';
    if (progress >= 25) return 'blue';
    return 'red';
  }
}
