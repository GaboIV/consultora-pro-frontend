import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { ApiManagementRepository } from './core/data-access/api-management.repository';
import { ManagementRepository } from './core/data-access/management.repository';
import { MockManagementRepository } from './core/data-access/mock-management.repository';
import { APP_LUCIDE_ICONS } from './core/icons/app-lucide-icons';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
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
