import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, finalize } from 'rxjs';

import {
  DespliegueListItem,
  CreateDespliegueRequest,
  estadoDespliegueLabel,
  estadoDespliegueTone,
  duracionLabel
} from '../../core/models/despliegues.models';
import { DesplieguesService } from '../../core/services/despliegues.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { AmbientesService } from '../../core/services/ambientes.service';
import { Ambiente } from '../../core/models/ambientes.models';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import {
  DespliegueFormDialogComponent
} from '../../shared/components/despliegue-form-dialog/despliegue-form-dialog.component';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

@Component({
  selector: 'cp-despliegues-page',
  imports: [
    FormsModule,
    NgSelectModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective,
    CloseOnBackDirective,
    DespliegueFormDialogComponent
  ],
  templateUrl: './despliegues.page.html',
  styleUrls: ['./despliegues.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesplieguesPage {
  private readonly service = inject(DesplieguesService);
  private readonly ambientesService = inject(AmbientesService);
  private readonly facade = inject(ManagementFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = this.facade.projects;
  protected readonly despliegues = signal<DespliegueListItem[]>([]);
  protected readonly ambientes = signal<Ambiente[]>([]);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly currentPage = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = 20;

  protected readonly summary = computed(() => {
    const items = this.despliegues();
    return {
      total: items.length,
      exitosos: items.filter(i => i.estado === 'Exitoso').length,
      fallidos: items.filter(i => i.estado === 'Fallido').length,
      enCurso: items.filter(i => i.estado === 'EnCurso').length
    };
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize))
  );

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.selectedProjectId.set(params.get('proyectoId'));
        this.currentPage.set(Number(params.get('page')) || 1);
        this.load();
      });

    this.ambientesService.getAmbientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => this.ambientes.set(items));
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const proyectoId = this.selectedProjectId();
    const page = this.currentPage();

    const obs: Observable<unknown> = proyectoId
      ? this.service.getByProject(proyectoId, page, this.pageSize)
      : this.service.getAll(page, this.pageSize);

    obs
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result: any) => {
          this.despliegues.set(result.data ?? []);
          this.totalCount.set(result.totalCount ?? 0);
        },
        error: error => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar los despliegues.'))
      });
  }

  protected onProjectFilterChange(proyectoId: string | null): void {
    this.selectedProjectId.set(proyectoId);
    this.currentPage.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: proyectoId || null, page: null },
      queryParamsHandling: 'merge'
    });
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge'
    });
  }

  protected openCreate(): void {
    this.showForm.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
  }

  protected save(data: CreateDespliegueRequest): void {
    this.saving.set(true);

    this.service.create(data)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Despliegue registrado.', 'Cerrar', { duration: 2800 });
          this.closeForm();
          this.load();
          this.facade.refresh();
        },
        error: (error: unknown) => this.snackBar.open(apiErrorMessage(error, 'No se pudo ejecutar el despliegue.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected projectLabel(id: string | null): string {
    if (!id) return 'Todos los proyectos';
    const project = this.projects().find(item => item.id === id);
    return project ? `${project.clientName} · ${project.name}` : 'Proyecto seleccionado';
  }

  protected estadoLabel = estadoDespliegueLabel;
  protected estadoTone = estadoDespliegueTone;
  protected durationLabel = duracionLabel;

  protected formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
