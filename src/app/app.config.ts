import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { ApiManagementRepository } from './core/data-access/api-management.repository';
import { ManagementRepository } from './core/data-access/management.repository';
import { MockManagementRepository } from './core/data-access/mock-management.repository';
import { APP_LUCIDE_ICONS } from './core/icons/app-lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch()),
    importProvidersFrom(LucideAngularModule.pick(APP_LUCIDE_ICONS)),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    {
      provide: ManagementRepository,
      useClass: environment.useMockData ? MockManagementRepository : ApiManagementRepository
    }
  ]
};
