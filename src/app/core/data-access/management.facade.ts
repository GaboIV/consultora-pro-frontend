import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { ManagementRepository } from './management.repository';
import { EMPTY_MANAGEMENT_SNAPSHOT } from './mock-management.data';
import { CreateClientCommand, UpdateClientCommand, CreateProjectCommand, UpdateProjectCommand } from '../models/management.models';

@Injectable({ providedIn: 'root' })
export class ManagementFacade {
  private readonly repository = inject(ManagementRepository);

  private readonly period = signal<string | null>(null);
  private readonly refreshTrigger = signal(0);

  readonly snapshot = toSignal(
    toObservable(computed(() => ({ period: this.period(), trigger: this.refreshTrigger() }))).pipe(
      switchMap(({ period }) => this.repository.getSnapshot(period ?? undefined))
    ),
    { initialValue: EMPTY_MANAGEMENT_SNAPSHOT }
  );

  readonly executive = computed(() => this.snapshot().executive);
  readonly clients = computed(() => this.snapshot().clients);
  readonly projects = computed(() => this.snapshot().projects);
  readonly tiposSolucion = computed(() => this.snapshot().tiposSolucion);
  readonly usuarios = computed(() => this.snapshot().usuarios);
  readonly infrastructure = computed(() => this.snapshot().infrastructure);
  readonly team = computed(() => this.snapshot().team);

  setPeriod(period: string | null): void {
    this.period.set(period);
  }

  refresh(): void {
    this.refreshTrigger.update(n => n + 1);
  }

  createClient(command: CreateClientCommand) {
    return this.repository.createClient(command);
  }

  updateClient(id: string, command: UpdateClientCommand) {
    return this.repository.updateClient(id, command);
  }

  deleteClient(id: string) {
    return this.repository.deleteClient(id);
  }

  createProject(command: CreateProjectCommand) {
    return this.repository.createProject(command);
  }

  updateProject(id: string, command: UpdateProjectCommand) {
    return this.repository.updateProject(id, command);
  }

  deleteProject(id: string) {
    return this.repository.deleteProject(id);
  }
}
