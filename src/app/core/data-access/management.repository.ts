import { Observable } from 'rxjs';

import { ManagementSnapshot, CreateClientCommand, UpdateClientCommand, CreateMemberCommand, CreateProjectCommand, UpdateProjectCommand } from '../models/management.models';

export abstract class ManagementRepository {
  abstract getSnapshot(): Observable<ManagementSnapshot>;

  abstract createClient(command: CreateClientCommand): Observable<{ id: string }>;
  abstract updateClient(id: string, command: UpdateClientCommand): Observable<void>;
  abstract deleteClient(id: string): Observable<void>;

  abstract createMember(command: CreateMemberCommand): Observable<{ id: string }>;

  abstract createProject(command: CreateProjectCommand): Observable<{ id: string }>;
  abstract updateProject(id: string, command: UpdateProjectCommand): Observable<void>;
  abstract deleteProject(id: string): Observable<void>;
}
