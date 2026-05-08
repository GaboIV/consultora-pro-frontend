import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ManagementSnapshot } from '../models/management.models';
import { ManagementRepository } from './management.repository';
import { MOCK_MANAGEMENT_SNAPSHOT } from './mock-management.data';

@Injectable()
export class MockManagementRepository implements ManagementRepository {
  getSnapshot(): Observable<ManagementSnapshot> {
    return of(MOCK_MANAGEMENT_SNAPSHOT);
  }
}
