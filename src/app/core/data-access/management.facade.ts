import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ManagementRepository } from './management.repository';
import { EMPTY_MANAGEMENT_SNAPSHOT } from './mock-management.data';

@Injectable({ providedIn: 'root' })
export class ManagementFacade {
  private readonly repository = inject(ManagementRepository);

  readonly snapshot = toSignal(this.repository.getSnapshot(), {
    initialValue: EMPTY_MANAGEMENT_SNAPSHOT
  });

  readonly executive = computed(() => this.snapshot().executive);
  readonly clients = computed(() => this.snapshot().clients);
  readonly projects = computed(() => this.snapshot().projects);
  readonly infrastructure = computed(() => this.snapshot().infrastructure);
  readonly team = computed(() => this.snapshot().team);
}
