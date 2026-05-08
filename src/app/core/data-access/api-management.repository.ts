import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ManagementSnapshot } from '../models/management.models';
import { ManagementRepository } from './management.repository';

@Injectable()
export class ApiManagementRepository implements ManagementRepository {
  private readonly http = inject(HttpClient);

  getSnapshot(): Observable<ManagementSnapshot> {
    return this.http.get<ManagementSnapshot>(`${environment.apiBaseUrl}/management/snapshot`);
  }
}
