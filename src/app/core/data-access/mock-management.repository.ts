import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ManagementSnapshot, CreateClientCommand, UpdateClientCommand, CreateMemberCommand, CreateProjectCommand, UpdateProjectCommand } from '../models/management.models';
import { ManagementRepository } from './management.repository';
import { MOCK_MANAGEMENT_SNAPSHOT } from './mock-management.data';

@Injectable()
export class MockManagementRepository implements ManagementRepository {
  getSnapshot(): Observable<ManagementSnapshot> {
    return of(MOCK_MANAGEMENT_SNAPSHOT);
  }

  createClient(_command: CreateClientCommand): Observable<{ id: string }> {
    return of({ id: crypto.randomUUID() });
  }

  updateClient(_id: string, _command: UpdateClientCommand): Observable<void> {
    return of(void 0);
  }

  deleteClient(_id: string): Observable<void> {
    return of(void 0);
  }

  createMember(_command: CreateMemberCommand): Observable<{ id: string }> {
    return of({ id: crypto.randomUUID() });
  }

  createProject(_command: CreateProjectCommand): Observable<{ id: string }> {
    return of({ id: crypto.randomUUID() });
  }

  updateProject(_id: string, _command: UpdateProjectCommand): Observable<void> {
    return of(void 0);
  }

  deleteProject(_id: string): Observable<void> {
    return of(void 0);
  }
}
