import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, finalize } from 'rxjs';

import {
  Repositorio,
  EstadoPipeline,
  pipelineLabel,
  pipelineTone,
  proveedorLabel,
  proveedorTone
} from '../../core/models/repositorios.models';
import { RepositoriosService } from '../../core/services/repositorios.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import {
  RepositorioFormData,
  RepositorioFormDialogComponent
} from '../../shared/components/repositorio-form-dialog/repositorio-form-dialog.component';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

interface RepositorioGroup {
  projectId: string;
  projectName: string;
  clientName: string;
  items: Repositorio[];
}

@Component({
  selector: 'cp-repositorios-page',
  imports: [
    FormsModule,
    NgSelectModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective,
    CloseOnBackDirective,
    RepositorioFormDialogComponent
  ],
  templateUrl: './repositorios.page.html',
  styleUrls: ['./repositorios.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RepositoriosPage {
  private readonly service = inject(RepositoriosService);
  private readonly facade = inject(ManagementFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = this.facade.projects;
  protected readonly repositorios = signal<Repositorio[]>([]);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editing = signal<Repositorio | undefined>(undefined);

  protected readonly summary = computed(() => {
    const items = this.repositorios();
    return {
      total: items.length,
      passing: items.filter(item => item.estadoPipeline === 'Passing').length,
      failed: items.filter(item => item.estadoPipeline === 'Failed').length,
      enEjecucion: items.filter(item => item.estadoPipeline === 'EnEjecucion').length
    };
  });

  protected readonly groupedRepositorios = computed<RepositorioGroup[]>(() => {
    const groups = new Map<string, RepositorioGroup>();
    for (const item of this.repositorios()) {
      const current = groups.get(item.proyectoId);
      if (current) {
        current.items.push(item);
        continue;
      }
      groups.set(item.proyectoId, {
        projectId: item.proyectoId,
        projectName: item.proyectoNombre,
        clientName: item.clienteNombre,
        items: [item]
      });
    }
    return Array.from(groups.values())
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => a.nombre.localeCompare(b.nombre))
      }))
      .sort((a, b) => `${a.clientName} ${a.projectName}`.localeCompare(`${b.clientName} ${b.projectName}`));
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.selectedProjectId.set(params.get('proyectoId'));
        this.load();
      });
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getAll(this.selectedProjectId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: items => this.repositorios.set(items),
        error: error => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar los repositorios.'))
      });
  }

  protected onProjectFilterChange(proyectoId: string | null): void {
    this.selectedProjectId.set(proyectoId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: proyectoId || null },
      queryParamsHandling: 'merge'
    });
  }

  protected openCreate(): void {
    this.editing.set(undefined);
    this.showForm.set(true);
  }

  protected openEdit(item: Repositorio): void {
    this.editing.set(item);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.editing.set(undefined);
  }

  protected save(data: RepositorioFormData): void {
    const edit = this.editing();
    this.saving.set(true);
    const operation: Observable<unknown> = edit
      ? this.service.update(edit.id, data)
      : this.service.create(data);
    operation
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.snackBar.open(edit ? 'Repositorio actualizado.' : 'Repositorio creado.', 'Cerrar', { duration: 2800 });
          this.closeForm();
          this.load();
          this.facade.refresh();
        },
        error: (error: unknown) => this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar el repositorio.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected confirmDelete(item: Repositorio): void {
    if (!confirm(`¿Eliminar el repositorio "${item.nombre}"?`)) return;
    this.service.delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Repositorio eliminado.', 'Cerrar', { duration: 2800 });
          this.load();
          this.facade.refresh();
        },
        error: error => this.snackBar.open(apiErrorMessage(error, 'No se pudo eliminar el repositorio.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected projectLabel(id: string | null): string {
    if (!id) return 'Todos los proyectos';
    const project = this.projects().find(item => item.id === id);
    return project ? `${project.clientName} · ${project.name}` : 'Proyecto seleccionado';
  }

  protected pipelineLabel = pipelineLabel;
  protected pipelineTone = pipelineTone;
  protected proveedorLabel = proveedorLabel;
  protected proveedorTone = proveedorTone;

  protected pipelineTitle(estado: EstadoPipeline): string {
    const labels: Record<EstadoPipeline, string> = {
      Passing: 'Pipeline en verde',
      Failed: 'Pipeline fallido',
      Desconocido: 'Estado no determinado',
      EnEjecucion: 'Pipeline en progreso'
    };
    return labels[estado];
  }
}
