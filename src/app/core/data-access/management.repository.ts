import { Observable } from 'rxjs';

import { ManagementSnapshot } from '../models/management.models';

export abstract class ManagementRepository {
  abstract getSnapshot(): Observable<ManagementSnapshot>;
}
