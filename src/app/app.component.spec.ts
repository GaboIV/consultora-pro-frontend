import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { AppComponent } from './app.component';
import { ManagementRepository } from './core/data-access/management.repository';
import { MockManagementRepository } from './core/data-access/mock-management.repository';
import { APP_LUCIDE_ICONS } from './core/icons/app-lucide-icons';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        importProvidersFrom(LucideAngularModule.pick(APP_LUCIDE_ICONS)),
        {
          provide: ManagementRepository,
          useClass: MockManagementRepository
        }
      ]
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('ConsultoraPro');
  });
});
