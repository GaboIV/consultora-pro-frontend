import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationHistoryService } from '../../core/services/navigation-history.service';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { combineLatest, of, catchError, tap, switchMap } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { environment } from '../../../environments/environment';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ProjectDetailService } from '../../core/services/project-detail.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { AuthService } from '../../core/services/auth.service';
import { ProjectTabData, ProjectTab, ProjectTabKey, ProjectMiembro } from '../../core/models/project-detail.models';
import { tipoAmbienteLabel, tipoAmbienteTone, estadoAmbienteLabel, estadoAmbienteTone } from '../../core/models/ambientes.models';
import { proveedorLabel, proveedorTone, pipelineLabel, pipelineTone } from '../../core/models/repositorios.models';
import { estadoDespliegueLabel, estadoDespliegueTone, duracionLabel } from '../../core/models/despliegues.models';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { ScreenshotsService } from '../../core/services/screenshots.service';
import { ScreenshotFormDialogComponent, ScreenshotFormData } from '../../shared/components/screenshot-form-dialog/screenshot-form-dialog.component';
import { ProjectFormDialogComponent, ProjectFormData } from '../../shared/components/project-form-dialog/project-form-dialog.component';
import { TableroListComponent } from '../kanban/tablero-list.component';
import { UsuarioFormComponent } from '../equipo/usuarios/usuario-form.component';
import { CredencialesTableComponent } from '../../shared/components/credenciales-table/credenciales-table.component';
import { CredencialFormDialogComponent } from '../credenciales/credencial-form-dialog.component';
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
    CloseOnBackDirective,
    MatSnackBarModule,
    MatDialogModule,
    ScreenshotFormDialogComponent,
    ProjectFormDialogComponent,
    TableroListComponent,
    CredencialesTableComponent,
    CredencialFormDialogComponent
  ],
  templateUrl: './project-detail.page.html',
  styleUrls: ['./project-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navHistory = inject(NavigationHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detailService = inject(ProjectDetailService);
  private readonly facade = inject(ManagementFacade);
  private readonly screenshotsService = inject(ScreenshotsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  protected readonly projectData = signal<ProjectTabData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<ProjectTabKey>('info');
  protected readonly showUploadForm = signal(false);
  protected readonly savingScreenshot = signal(false);
  protected readonly showProjectForm = signal(false);
  protected readonly showCredencialForm = signal(false);

  readonly clients = this.facade.clients;
  readonly tiposSolucion = this.facade.tiposSolucion;
  readonly usuarios = this.facade.usuarios;

  protected readonly showDeployments = environment.showDeployments;

  protected get tabs(): ProjectTab[] {
    return ([
      { key: 'info', label: 'Información', icon: 'info' },
      { key: 'ambientes', label: 'Ambientes', icon: 'server', permission: 'ambientes.ver' },
      { key: 'repositorios', label: 'Repositorios', icon: 'github', permission: 'repositorios.ver' },
      { key: 'credenciales', label: 'Credenciales', icon: 'key-round', permission: 'credenciales.ver' },
      { key: 'despliegues', label: 'Despliegues', icon: 'rocket', permission: 'despliegues.ver' },
      { key: 'tableros', label: 'Tableros', icon: 'folder-kanban', permission: 'kanban.ver' },
      { key: 'equipo', label: 'Equipo', icon: 'users-round', permission: 'equipo.ver' },
      { key: 'screenshots', label: 'Screenshots', icon: 'monitor', permission: 'screenshots.ver' }
    ] as ProjectTab[]).filter((tab) => {
      const isDeploymentEnabled = tab.key !== 'despliegues' || this.showDeployments;
      return isDeploymentEnabled && (!tab.permission || this.auth.hasPermission(tab.permission));
    });
  }

  protected readonly tipoAmbienteLabel = tipoAmbienteLabel;
  protected readonly tipoAmbienteTone = tipoAmbienteTone;
  protected readonly estadoAmbienteLabel = estadoAmbienteLabel;
  protected readonly estadoAmbienteTone = estadoAmbienteTone;
  protected readonly proveedorLabel = proveedorLabel;
  protected readonly proveedorTone = proveedorTone;
  protected readonly pipelineLabel = pipelineLabel;
  protected readonly pipelineTone = pipelineTone;
  protected readonly estadoDespliegueLabel = estadoDespliegueLabel;
  protected readonly estadoDespliegueTone = estadoDespliegueTone;
  protected readonly duracionLabel = duracionLabel;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const projectId = params.get('id');
        if (!projectId) {
          this.error.set('ID de proyecto no proporcionado');
          this.loading.set(false);
          return of(null);
        }
        this.loading.set(true);
        this.error.set(null);
        this.projectData.set(null);
        this.activeTab.set(this.tabFromQuery());
        return this.detailService.getProjectData(projectId).pipe(
          catchError(err => {
            this.error.set(err.message ?? 'Error al cargar datos del proyecto');
            this.loading.set(false);
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      if (data) {
        this.projectData.set(data);
        this.loading.set(false);
      }
    });
  }

  /** Pestaña inicial según el query param `tab` (p. ej. al volver de un tablero). */
  private tabFromQuery(): ProjectTabKey {
    const valid: ProjectTabKey[] = ['info', 'ambientes', 'repositorios', 'credenciales', 'despliegues', 'tableros', 'equipo', 'screenshots'];
    const tab = this.route.snapshot.queryParamMap.get('tab') as ProjectTabKey | null;
    return tab && valid.includes(tab) ? tab : 'info';
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
    this.navHistory.back(['/proyectos']);
  }

  protected openEditProject(): void {
    this.showProjectForm.set(true);
  }

  protected closeProjectForm(): void {
    this.showProjectForm.set(false);
  }

  protected onSaveProject(data: ProjectFormData): void {
    const proj = this.projectData();
    if (!proj) return;

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

    this.facade.updateProject(proj.info.id, command).subscribe({
      next: () => {
        this.closeProjectForm();
        this.facade.refresh();
        this.loadData(proj.info.id);
        this.snackBar.open('Proyecto actualizado con éxito.', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'Error al actualizar el proyecto.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected projectFormInitial(): ProjectFormData | undefined {
    const proj = this.projectData();
    if (!proj) return undefined;
    const info = proj.info;

    const clientId = this.facade.clients().find(c => c.name === info.clientName)?.id ?? '';
    const tipoSolucionId = this.facade.tiposSolucion().find(t => t.nombre === info.tipoSolucionNombre)?.id ?? '';

    const parseDateToInputFormat = (dateStr: string | undefined): string => {
      if (!dateStr) return new Date().toISOString().substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      } catch (e) {}
      return new Date().toISOString().substring(0, 10);
    };

    return {
      nombre: info.name,
      clienteId: clientId,
      tipoSolucionId: tipoSolucionId,
      etapa: this.stageValue(info.stage),
      estado: this.statusValue(info.status),
      progress: info.progress ?? 0,
      startDate: parseDateToInputFormat(info.startDate),
      endDate: parseDateToInputFormat(info.endDate),
      miembros: info.miembros.map(m => ({ usuarioId: m.usuarioId, rol: m.rol }))
    };
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

  private stageValue(stage: string): string {
    const normalized = this.normalizeName(stage);
    const values: Record<string, string> = {
      analisis: 'Analisis', 'análisis': 'Analisis',
      diseno: 'Diseno', 'diseño': 'Diseno',
      desarrollo: 'Desarrollo',
      qa: 'QA',
      deploy: 'Deploy',
      soporte: 'Soporte'
    };
    return values[normalized] ?? 'Desarrollo';
  }

  private statusValue(status: string): string {
    const normalized = this.normalizeName(status);
    const values: Record<string, string> = {
      planificacion: 'Planificacion', 'planificación': 'Planificacion',
      'en curso': 'EnCurso',
      completado: 'Completado',
      'por vencer': 'PorVencer'
    };
    return values[normalized] ?? 'Planificacion';
  }

  private normalizeName(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  protected navigateToAmbienteDetail(ambienteId: string): void {
    this.router.navigate(['/ambientes', ambienteId]);
  }

  protected navigateToCreateAmbiente(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/ambientes'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected navigateToCreateRepositorio(): void {
    const d = this.projectData();
    if (d) this.router.navigate(['/repositorios'], { queryParams: { proyectoId: d.info.id, nuevo: '1' } });
  }

  protected openCreateCredencial(): void {
    this.showCredencialForm.set(true);
  }

  protected onCredencialFormClosed(saved: boolean): void {
    this.showCredencialForm.set(false);
    if (saved) this.reloadCredenciales();
  }

  /** Recarga los datos del proyecto tras crear/editar/eliminar una credencial. */
  protected reloadCredenciales(): void {
    const d = this.projectData();
    if (d) {
      this.loadData(d.info.id);
      this.facade.refresh();
    }
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
