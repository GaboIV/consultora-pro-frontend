import { Observable } from 'rxjs';
import { CreateClientCommand, ManagementSnapshot, UpdateClientCommand, CreateProjectCommand, UpdateProjectCommand } from '../models/management.models';

export abstract class ManagementRepository {
  abstract getSnapshot(period?: string): Observable<ManagementSnapshot>;
  abstract createClient(command: CreateClientCommand): Observable<{ id: string }>;
  abstract updateClient(id: string, command: UpdateClientCommand): Observable<void>;
  abstract deleteClient(id: string): Observable<void>;
  abstract createProject(command: CreateProjectCommand): Observable<{ id: string }>;
  abstract updateProject(id: string, command: UpdateProjectCommand): Observable<void>;
  abstract deleteProject(id: string): Observable<void>;
}
