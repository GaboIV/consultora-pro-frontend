import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, finalize } from 'rxjs';

import {
  Ambiente,
  EstadoAmbiente,
  estadoAmbienteLabel,
  estadoAmbienteTone,
  tipoAmbienteLabel,
  tipoAmbienteTone
} from '../../core/models/ambientes.models';
import { AmbientesService } from '../../core/services/ambientes.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import {
  AmbienteFormData,
  AmbienteFormDialogComponent
} from '../../shared/components/ambiente-form-dialog/ambiente-form-dialog.component';
import { CloseOnBackDirective } from '../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { StatusDotComponent } from '../../shared/components/status-dot/status-dot.component';

interface AmbienteGroup {
  projectId: string;
  projectName: string;
  clientName: string;
  items: Ambiente[];
}

@Component({
  selector: 'cp-ambientes-page',
  imports: [
    FormsModule,
    NgSelectModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    StatusDotComponent,
    HasPermissionDirective,
    CloseOnBackDirective,
    AmbienteFormDialogComponent
  ],
  templateUrl: './ambientes.page.html',
  styleUrls: ['./ambientes.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmbientesPage {
  private readonly service = inject(AmbientesService);
  private readonly facade = inject(ManagementFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = this.facade.projects;
  protected readonly ambientes = signal<Ambiente[]>([]);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editing = signal<Ambiente | undefined>(undefined);

  protected readonly summary = computed(() => {
    const items = this.ambientes();
    return {
      total: items.length,
      online: items.filter(item => item.estado === 'Online').length,
      alerta: items.filter(item => item.estado === 'Alerta').length,
      offline: items.filter(item => item.estado === 'Offline').length
    };
  });

  protected readonly groupedAmbientes = computed<AmbienteGroup[]>(() => {
    const groups = new Map<string, AmbienteGroup>();

    for (const item of this.ambientes()) {
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
        items: group.items.sort((a, b) => `${a.tipo}-${a.nombre}`.localeCompare(`${b.tipo}-${b.nombre}`))
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

    this.service.getAmbientes(this.selectedProjectId())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: items => this.ambientes.set(items),
        error: error => this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar los ambientes.'))
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

  protected openEdit(item: Ambiente): void {
    this.editing.set(item);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.showForm.set(false);
    this.editing.set(undefined);
  }

  protected save(data: AmbienteFormData): void {
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
          this.snackBar.open(edit ? 'Ambiente actualizado.' : 'Ambiente creado.', 'Cerrar', { duration: 2800 });
          this.closeForm();
          this.load();
          this.facade.refresh();
        },
        error: (error: unknown) => this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar el ambiente.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected markOnline(item: Ambiente): void {
    this.service.updateEstado(item.id, { estado: 'Online' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Ambiente marcado como online.', 'Cerrar', { duration: 2400 });
          this.load();
          this.facade.refresh();
        },
        error: error => this.snackBar.open(apiErrorMessage(error, 'No se pudo actualizar el estado.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected confirmDelete(item: Ambiente): void {
    if (!confirm(`¿Desactivar el ambiente "${item.nombre}"?`)) return;

    this.service.delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open('Ambiente desactivado.', 'Cerrar', { duration: 2800 });
          this.load();
          this.facade.refresh();
        },
        error: error => this.snackBar.open(apiErrorMessage(error, 'No se pudo desactivar el ambiente.'), 'Cerrar', { duration: 4200 })
      });
  }

  protected navigateToDetail(id: string): void {
    this.router.navigate(['/ambientes', id]);
  }

  protected projectLabel(id: string | null): string {
    if (!id) return 'Todos los proyectos';
    const project = this.projects().find(item => item.id === id);
    return project ? `${project.clientName} · ${project.name}` : 'Proyecto seleccionado';
  }

  protected estadoLabel = estadoAmbienteLabel;
  protected estadoTone = estadoAmbienteTone;
  protected tipoLabel = tipoAmbienteLabel;
  protected tipoTone = tipoAmbienteTone;
}
