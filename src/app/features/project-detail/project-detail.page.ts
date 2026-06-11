import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { combineLatest, of, catchError, tap } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ProjectDetailService } from '../../core/services/project-detail.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { ProjectTabData, ProjectTab, ProjectTabKey, ProjectMiembro } from '../../core/models/project-detail.models';
import { tipoAmbienteLabel, tipoAmbienteTone, estadoAmbienteLabel, estadoAmbienteTone } from '../../core/models/ambientes.models';
import { proveedorLabel, proveedorTone, pipelineLabel, pipelineTone } from '../../core/models/repositorios.models';
import { expirationTone, expirationLabel } from '../../core/models/credenciales.models';
import { estadoDespliegueLabel, estadoDespliegueTone, duracionLabel } from '../../core/models/despliegues.models';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ScreenshotsService } from '../../core/services/screenshots.service';
import { ScreenshotFormDialogComponent, ScreenshotFormData } from '../../shared/components/screenshot-form-dialog/screenshot-form-dialog.component';
import { apiErrorMessage } from '../../core/utils/api-error-message';

interface GanttStage {
  label: string;
  short: string;
  left: number;
  width: number;
  color: string;
}

const GANTT_STAGES = [
  { label: 'Análisis', short: 'Análisis', color: 'rgba(79,142,247,0.6)' },
  { label: 'Diseño',   short: 'Diseño',   color: 'rgba(159,122,250,0.6)' },
  { label: 'Desarrollo', short: 'Desarrollo', color: 'rgba(79,142,247,0.85)' },
  { label: 'QA',       short: 'QA',        color: 'rgba(62,207,142,0.5)' },
  { label: 'Deploy',   short: 'Prod',      color: 'rgba(45,212,191,0.5)' }
];

@Component({
  selector: 'cp-project-detail',
  imports: [
    CommonModule,
    BadgeComponent,
    LucideAngularModule,
    HasPermissionDirective,
    MatSnackBarModule,
    ScreenshotFormDialogComponent
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
  private readonly screenshotsService = inject(ScreenshotsService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly projectData = signal<ProjectTabData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<ProjectTabKey>('info');
  protected readonly showUploadForm = signal(false);
  protected readonly savingScreenshot = signal(false);

  protected readonly tabs: ProjectTab[] = [
    { key: 'info', label: 'Información', icon: 'info' },
    { key: 'ambientes', label: 'Ambientes', icon: 'server' },
    { key: 'repositorios', label: 'Repositorios', icon: 'github' },
    { key: 'credenciales', label: 'Credenciales', icon: 'key-round' },
    { key: 'despliegues', label: 'Despliegues', icon: 'rocket' },
    { key: 'equipo', label: 'Equipo', icon: 'users-round' },
    { key: 'screenshots', label: 'Screenshots', icon: 'monitor' }
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

    this.loadData(projectId);
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
      case 'screenshots': return data.screenshots.length;
      default: return undefined;
    }
  }

  private loadData(projectId: string): void {
    this.detailService.getProjectData(projectId).subscribe({
      next: (data) => {
        this.projectData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Error al cargar datos del proyecto');
        this.loading.set(false);
      }
    });
  }

  protected saveScreenshot(data: ScreenshotFormData): void {
    const proj = this.projectData();
    if (!proj) return;

    this.savingScreenshot.set(true);
    this.screenshotsService.upload(proj.info.id, data.nombre, data.version, data.descripcion, data.file).subscribe({
      next: () => {
        this.savingScreenshot.set(false);
        this.showUploadForm.set(false);
        this.snackBar.open('Captura de pantalla subida con éxito.', 'Cerrar', { duration: 3000 });
        this.loadData(proj.info.id);
      },
      error: (err) => {
        this.savingScreenshot.set(false);
        this.snackBar.open(apiErrorMessage(err, 'Error al subir la captura de pantalla.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected confirmDeleteScreenshot(id: string): void {
    const proj = this.projectData();
    if (!proj) return;

    if (!confirm('¿Eliminar esta captura de pantalla de forma permanente?')) return;

    this.screenshotsService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Captura de pantalla eliminada.', 'Cerrar', { duration: 3000 });
        this.loadData(proj.info.id);
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'Error al eliminar la captura de pantalla.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected navigateBack(): void {
    this.router.navigate(['/proyectos']);
  }

  protected openEditProject(): void {
    this.router.navigate(['/proyectos'], { queryParams: { edit: this.projectData()?.info.id } });
  }

  protected navigateToCreateAmbiente(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/ambientes'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected navigateToCreateRepositorio(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/repositorios'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected navigateToCreateCredencial(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/credenciales'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected navigateToCreateDespliegue(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/despliegues'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected formatDate(dateStr: string | null | undefined): string {
    const d = this.parseDate(dateStr);
    if (!d) return 'Sin definir';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected formatProgress(p: number): string {
    return `${Math.round(p)}%`;
  }

  protected getProgressTone(p: number): string {
    if (p >= 80) return 'green';
    if (p >= 50) return 'amber';
    return 'blue';
  }

  protected getDaysRemaining(): string {
    const data = this.projectData();
    if (!data) return '';
    const end = this.parseDate(data.info.endDate);
    if (!end) return 'Fecha final pendiente';
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Vencido hace ' + Math.abs(diff) + ' días';
    if (diff === 0) return 'Vence hoy';
    return diff + ' días restantes';
  }

  protected getTimeAgo(dateStr: string): string {
    const date = this.parseDate(dateStr);
    if (!date) return 'sin fecha';
    const diffMs = Date.now() - date.getTime();
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    if (h < 1) return 'hace minutos';
    if (h < 24) return 'hace ' + h + 'h';
    const d = Math.floor(h / 24);
    if (d === 1) return 'ayer';
    return 'hace ' + d + 'd';
  }

  protected getTechLead(): ProjectMiembro | undefined {
    return this.projectData()?.info.miembros.find(m => m.rol === 'Principal');
  }

  protected getEnvDotClass(estado: string): string {
    switch (estado) {
      case 'Online': return 'dot-g';
      case 'Alerta': return 'dot-a';
      case 'Offline': return 'dot-r';
      default: return 'dot-x';
    }
  }

  protected getEnvBadgeClass(estado: string): string {
    switch (estado) {
      case 'Online': return 's-green';
      case 'Alerta': return 's-amber';
      case 'Offline': return 's-red';
      default: return 's-gray';
    }
  }

  protected getGanttMonths(): string[] {
    const data = this.projectData();
    if (!data) return [];
    const start = this.parseDate(data.info.startDate);
    const end = this.parseDate(data.info.endDate);
    if (!start || !end || start > end) return [];
    const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const months: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.push(names[cur.getMonth()]);
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }

  protected getGanttStages(): GanttStage[] {
    const data = this.projectData();
    if (!data) return [];

    const startDate = this.parseDate(data.info.startDate);
    const endDate = this.parseDate(data.info.endDate);
    if (!startDate || !endDate) return [];

    const start = startDate.getTime();
    const end = endDate.getTime();
    const total = end - start;
    if (total <= 0) return [];

    const n = GANTT_STAGES.length;
    const segW = 100 / n;

    return GANTT_STAGES.map((s, i) => ({
      label: s.label,
      short: s.short,
      left: i * segW,
      width: segW,
      color: s.color
    }));
  }

  protected getTodayPercent(): number {
    const data = this.projectData();
    if (!data) return 0;
    const startDate = this.parseDate(data.info.startDate);
    const endDate = this.parseDate(data.info.endDate);
    if (!startDate || !endDate) return 0;
    const start = startDate.getTime();
    const end = endDate.getTime();
    if (end <= start) return 0;
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return ((now - start) / (end - start)) * 100;
  }

  private parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
