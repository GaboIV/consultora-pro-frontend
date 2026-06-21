import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, finalize, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  Ambiente,
  AmbienteComponente,
  AmbienteTestUser,
  AmbienteCloudResource,
  CreateAmbienteComponenteRequest,
  UpdateAmbienteComponenteRequest,
  CreateAmbienteTestUserRequest,
  UpdateAmbienteTestUserRequest,
  CreateAmbienteCloudResourceRequest,
  UpdateAmbienteCloudResourceRequest,
  ImportCloudResourcesCsvResponse,
  estadoAmbienteLabel,
  estadoAmbienteTone,
  tipoAmbienteLabel,
  tipoAmbienteTone,
  EstadoAmbiente
} from '../../core/models/ambientes.models';
import { AuthService } from '../../core/services/auth.service';
import { AmbientesService } from '../../core/services/ambientes.service';
import { AmbienteComponentesService } from '../../core/services/ambiente-componentes.service';
import { AmbienteTestUsersService } from '../../core/services/ambiente-test-users.service';
import { AmbienteCloudResourcesService } from '../../core/services/ambiente-cloud-resources.service';
import { ManagementFacade } from '../../core/data-access/management.facade';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { AmbienteFormData, AmbienteFormDialogComponent } from '../../shared/components/ambiente-form-dialog/ambiente-form-dialog.component';

type DetailTabKey = 'info' | 'componentes' | 'test-users' | 'cloud-resources';

@Component({
  selector: 'cp-ambiente-detail',
  imports: [
    FormsModule,
    LucideAngularModule,
    MatSnackBarModule,
    BadgeComponent,
    HasPermissionDirective,
    DatePipe,
    AmbienteFormDialogComponent
  ],
  templateUrl: './ambiente-detail.page.html',
  styleUrls: ['./ambiente-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmbienteDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly ambientesService = inject(AmbientesService);
  private readonly componentesService = inject(AmbienteComponentesService);
  private readonly testUsersService = inject(AmbienteTestUsersService);
  private readonly cloudResourcesService = inject(AmbienteCloudResourcesService);
  private readonly facade = inject(ManagementFacade);
  private readonly auth = inject(AuthService);

  protected readonly ambiente = signal<Ambiente | null>(null);
  protected readonly componenti = signal<AmbienteComponente[]>([]);
  protected readonly testUsers = signal<AmbienteTestUser[]>([]);
  protected readonly cloudResources = signal<AmbienteCloudResource[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<DetailTabKey>('info');

  protected readonly editingComponente = signal<AmbienteComponente | undefined>(undefined);
  protected readonly editingTestUser = signal<AmbienteTestUser | undefined>(undefined);
  protected readonly editingCloudResource = signal<AmbienteCloudResource | undefined>(undefined);

  protected readonly showComponenteForm = signal(false);
  protected readonly showTestUserForm = signal(false);
  protected readonly showCloudResourceForm = signal(false);

  protected readonly showAmbienteForm = signal(false);
  protected readonly showCsvImportDialog = signal(false);
  protected readonly importingCsv = signal(false);
  protected readonly csvImportResult = signal<ImportCloudResourcesCsvResponse | null>(null);

  readonly projects = this.facade.projects;

  protected readonly csvImportData = {
    plataforma: 'Azure',
    csvContent: '',
    fileName: '',
    fileSize: ''
  };

  protected readonly revealPasswords = signal<Set<string>>(new Set());

  protected readonly estadoLabel = estadoAmbienteLabel;
  protected readonly estadoTone = estadoAmbienteTone;
  protected readonly tipoLabel = tipoAmbienteLabel;
  protected readonly tipoTone = tipoAmbienteTone;

  protected get tabs(): { key: DetailTabKey; label: string; icon: string }[] {
    const list: { key: DetailTabKey; label: string; icon: string }[] = [
      { key: 'info', label: 'Información', icon: 'info' },
      { key: 'componentes', label: 'Nodos / Servidores', icon: 'server' },
      { key: 'test-users', label: 'Cuentas de Prueba', icon: 'users' },
      { key: 'cloud-resources', label: 'Recursos Nube', icon: 'cloud' }
    ];

    if (this.auth.hasRole('Soporte')) {
      return list.filter(tab => tab.key !== 'componentes' && tab.key !== 'cloud-resources');
    }

    return list;
  }

  // Form data holders
  protected componenteForm: CreateAmbienteComponenteRequest = this.emptyComponenteForm();
  protected testUserForm: CreateAmbienteTestUserRequest = this.emptyTestUserForm();
  protected cloudResourceForm: CreateAmbienteCloudResourceRequest = this.emptyCloudResourceForm();

  private ambienteId: string = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de ambiente no proporcionado');
      this.loading.set(false);
      return;
    }
    this.ambienteId = id;
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      ambiente: this.ambientesService.getById(this.ambienteId).pipe(
        catchError(err => {
          this.error.set(apiErrorMessage(err, 'No se pudo cargar el ambiente.'));
          return of(null);
        })
      ),
      componentes: this.componentesService.getByAmbiente(this.ambienteId).pipe(
        catchError(() => of([] as AmbienteComponente[]))
      ),
      testUsers: this.testUsersService.getByAmbiente(this.ambienteId).pipe(
        catchError(() => of([] as AmbienteTestUser[]))
      ),
      cloudResources: this.cloudResourcesService.getByAmbiente(this.ambienteId).pipe(
        catchError(() => of([] as AmbienteCloudResource[]))
      )
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ ambiente, componentes, testUsers, cloudResources }) => {
        if (ambiente) {
          this.ambiente.set(ambiente);
        }
        this.componenti.set(componentes);
        this.testUsers.set(testUsers);
        this.cloudResources.set(cloudResources);
      }
    });
  }

  protected selectTab(tab: DetailTabKey): void {
    this.activeTab.set(tab);
  }

  protected navigateBack(): void {
    this.router.navigate(['/ambientes']);
  }

  protected openEditAmbiente(): void {
    this.showAmbienteForm.set(true);
  }

  protected closeAmbienteForm(): void {
    this.showAmbienteForm.set(false);
  }

  protected saveAmbiente(data: AmbienteFormData): void {
    this.ambientesService.update(this.ambienteId, data).subscribe({
      next: () => {
        this.closeAmbienteForm();
        this.snackBar.open('Ambiente actualizado.', 'Cerrar', { duration: 2800 });
        this.loadAll();
        this.facade.refresh();
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo guardar el ambiente.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected getHealthStatus(): { label: string; tone: string; dotClass: string } | null {
    const amb = this.ambiente();
    if (!amb?.healthCheckUrl) return null;
    return {
      label: this.estadoLabel(amb.estado),
      tone: this.estadoTone(amb.estado),
      dotClass: this.getEnvDotClass(amb.estado)
    };
  }

  protected getEnvDotClass(estado: EstadoAmbiente): string {
    switch (estado) {
      case 'Online': return 'dot-g';
      case 'Alerta': return 'dot-a';
      case 'Offline': return 'dot-r';
      default: return 'dot-x';
    }
  }

  protected getHealthBadgeClass(estado: EstadoAmbiente): string {
    switch (estado) {
      case 'Online': return 's-green';
      case 'Alerta': return 's-amber';
      case 'Offline': return 's-red';
      default: return 's-gray';
    }
  }

  // ---- Componente CRUD ----
  protected openCreateComponente(): void {
    this.editingComponente.set(undefined);
    this.componenteForm = this.emptyComponenteForm();
    this.componenteForm.ambienteId = this.ambienteId;
    this.showComponenteForm.set(true);
  }

  protected openEditComponente(item: AmbienteComponente): void {
    this.editingComponente.set(item);
    this.componenteForm = {
      ambienteId: item.ambienteId,
      rol: item.rol,
      ipPublica: item.ipPublica,
      ipPrivada: item.ipPrivada,
      hostname: item.hostname,
      tecnologia: item.tecnologia,
      especificaciones: item.especificaciones
    };
    this.showComponenteForm.set(true);
  }

  protected closeComponenteForm(): void {
    this.showComponenteForm.set(false);
    this.editingComponente.set(undefined);
  }

  protected saveComponente(): void {
    const edit = this.editingComponente();
    this.saving.set(true);
    const obs: Observable<unknown> = edit
      ? this.componentesService.update(this.ambienteId, edit.id, this.componenteForm as UpdateAmbienteComponenteRequest)
      : this.componentesService.create(this.componenteForm);

    obs.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.snackBar.open(edit ? 'Componente actualizado.' : 'Componente creado.', 'Cerrar', { duration: 2800 });
        this.closeComponenteForm();
        this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al guardar componente.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected confirmDeleteComponente(item: AmbienteComponente): void {
    if (!confirm(`¿Desactivar el componente "${item.rol}" (${item.hostname || item.ipPrivada || 'sin datos'})?`)) return;
    this.componentesService.delete(this.ambienteId, item.id).subscribe({
      next: () => {
        this.snackBar.open('Componente desactivado.', 'Cerrar', { duration: 2800 });
        this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al desactivar.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Test User CRUD ----
  protected openCreateTestUser(): void {
    this.editingTestUser.set(undefined);
    this.testUserForm = this.emptyTestUserForm();
    this.testUserForm.ambienteId = this.ambienteId;
    this.showTestUserForm.set(true);
  }

  protected openEditTestUser(item: AmbienteTestUser): void {
    this.editingTestUser.set(item);
    this.testUserForm = {
      ambienteId: item.ambienteId,
      rolAplicacion: item.rolAplicacion,
      correo: item.correo,
      password: '',
      notas: item.notas
    };
    this.showTestUserForm.set(true);
  }

  protected closeTestUserForm(): void {
    this.showTestUserForm.set(false);
    this.editingTestUser.set(undefined);
  }

  protected saveTestUser(): void {
    const edit = this.editingTestUser();
    this.saving.set(true);

    if (edit) {
      const req: UpdateAmbienteTestUserRequest = {
        rolAplicacion: this.testUserForm.rolAplicacion,
        correo: this.testUserForm.correo,
        notas: this.testUserForm.notas
      };
      if (this.testUserForm.password) req.password = this.testUserForm.password;

      this.testUsersService.update(this.ambienteId, edit.id, req)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.snackBar.open('Usuario de prueba actualizado.', 'Cerrar', { duration: 2800 });
            this.closeTestUserForm();
            this.loadAll();
          },
          error: err => this.snackBar.open(apiErrorMessage(err, 'Error al actualizar.'), 'Cerrar', { duration: 4200 })
        });
    } else {
      this.testUsersService.create(this.testUserForm)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.snackBar.open('Usuario de prueba creado.', 'Cerrar', { duration: 2800 });
            this.closeTestUserForm();
            this.loadAll();
          },
          error: err => this.snackBar.open(apiErrorMessage(err, 'Error al crear.'), 'Cerrar', { duration: 4200 })
        });
    }
  }

  protected confirmDeleteTestUser(item: AmbienteTestUser): void {
    if (!confirm(`¿Desactivar el usuario "${item.correo}"?`)) return;
    this.testUsersService.delete(this.ambienteId, item.id).subscribe({
      next: () => {
        this.snackBar.open('Usuario de prueba desactivado.', 'Cerrar', { duration: 2800 });
        this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al desactivar.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected togglePassword(id: string): void {
    const set = this.revealPasswords();
    if (set.has(id)) set.delete(id); else set.add(id);
    this.revealPasswords.set(new Set(set));
  }

  protected copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).then(() => {
      this.snackBar.open('Copiado al portapapeles.', 'Cerrar', { duration: 2000 });
    });
  }

  // ---- Cloud Resource CRUD ----
  protected openCreateCloudResource(): void {
    this.editingCloudResource.set(undefined);
    this.cloudResourceForm = this.emptyCloudResourceForm();
    this.cloudResourceForm.ambienteId = this.ambienteId;
    this.showCloudResourceForm.set(true);
  }

  protected openEditCloudResource(item: AmbienteCloudResource): void {
    this.editingCloudResource.set(item);
    this.cloudResourceForm = {
      ambienteId: item.ambienteId,
      tipoRecurso: item.tipoRecurso,
      nombreRecurso: item.nombreRecurso,
      deepLink: item.deepLink,
      nota: item.nota
    };
    this.showCloudResourceForm.set(true);
  }

  protected closeCloudResourceForm(): void {
    this.showCloudResourceForm.set(false);
    this.editingCloudResource.set(undefined);
  }

  protected saveCloudResource(): void {
    const edit = this.editingCloudResource();
    this.saving.set(true);
    const obs: Observable<unknown> = edit
      ? this.cloudResourcesService.update(this.ambienteId, edit.id, this.cloudResourceForm as UpdateAmbienteCloudResourceRequest)
      : this.cloudResourcesService.create(this.cloudResourceForm);

    obs.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.snackBar.open(edit ? 'Recurso actualizado.' : 'Recurso creado.', 'Cerrar', { duration: 2800 });
        this.closeCloudResourceForm();
        this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al guardar recurso.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected confirmDeleteCloudResource(item: AmbienteCloudResource): void {
    if (!confirm(`¿Desactivar el recurso "${item.nombreRecurso}"?`)) return;
    this.cloudResourcesService.delete(this.ambienteId, item.id).subscribe({
      next: () => {
        this.snackBar.open('Recurso desactivado.', 'Cerrar', { duration: 2800 });
        this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al desactivar.'), 'Cerrar', { duration: 4200 })
    });
  }

  // ---- Cloud Resource Filters ----
  protected readonly cloudResourceNameFilter = signal('');
  protected readonly cloudResourceTypeFilter = signal('');

  protected readonly filteredCloudResources = computed(() => {
    const resources = this.cloudResources();
    const query = this.cloudResourceNameFilter().toLowerCase().trim();
    const typeFilter = this.cloudResourceTypeFilter();
    return resources.filter(r => {
      if (query && !r.nombreRecurso.toLowerCase().includes(query)
        && !r.tipoRecurso.toLowerCase().includes(query)
        && !(r.nota?.toLowerCase().includes(query) ?? false)) return false;
      if (typeFilter && r.tipoRecurso.toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
  });

  protected readonly cloudResourceTypes = computed(() => {
    const types = new Set(this.cloudResources().map(r => r.tipoRecurso));
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  });

  protected setTypeFilter(type: string): void {
    this.cloudResourceTypeFilter.set(
      this.cloudResourceTypeFilter() === type ? '' : type
    );
  }

  protected clearFilters(): void {
    this.cloudResourceNameFilter.set('');
    this.cloudResourceTypeFilter.set('');
  }

  // ---- CSV Import ----
  protected openCsvImportDialog(): void {
    this.csvImportResult.set(null);
    this.csvImportData.csvContent = '';
    this.csvImportData.fileName = '';
    this.csvImportData.fileSize = '';
    this.showCsvImportDialog.set(true);
  }

  protected closeCsvImportDialog(): void {
    this.showCsvImportDialog.set(false);
    this.csvImportResult.set(null);
  }

  protected clearCsvFile(): void {
    this.csvImportData.csvContent = '';
    this.csvImportData.fileName = '';
    this.csvImportData.fileSize = '';
  }

  protected onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!file.name.endsWith('.csv')) {
      this.snackBar.open('Solo se permiten archivos .csv', 'Cerrar', { duration: 3000 });
      return;
    }
    this.csvImportData.fileName = file.name;
    this.csvImportData.fileSize = this.formatFileSize(file.size);
    const reader = new FileReader();
    reader.onload = () => {
      this.csvImportData.csvContent = reader.result as string;
    };
    reader.readAsText(file);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  protected importCsv(): void {
    if (!this.csvImportData.csvContent) return;
    this.importingCsv.set(true);
    this.csvImportResult.set(null);

    this.cloudResourcesService.importCsv(this.ambienteId, {
      plataforma: this.csvImportData.plataforma,
      csvContent: this.csvImportData.csvContent
    }).pipe(finalize(() => this.importingCsv.set(false))).subscribe({
      next: result => {
        this.csvImportResult.set(result);
        if (result.importedCount > 0) this.loadAll();
      },
      error: err => this.snackBar.open(apiErrorMessage(err, 'Error al importar CSV.'), 'Cerrar', { duration: 4200 })
    });
  }

  protected openDeepLink(url: string): void {
    if (!url) return;
    let clean = url.trim();
    // Remove surrounding quotes if present (legacy CSV import issue)
    if (clean.length >= 2 && clean[0] === '"' && clean[clean.length - 1] === '"')
      clean = clean.slice(1, -1).trim();
    if (!/^https?:\/\//i.test(clean)) {
      if (clean.startsWith('#')) {
        clean = 'https://portal.azure.com' + clean;
      } else {
        clean = 'https://' + clean;
      }
    }
    window.open(clean, '_blank');
  }

  // ---- Empty form helpers ----
  private emptyComponenteForm(): CreateAmbienteComponenteRequest {
    return { ambienteId: '', rol: '', ipPublica: '', ipPrivada: '', hostname: '', tecnologia: '', especificaciones: '' };
  }

  private emptyTestUserForm(): CreateAmbienteTestUserRequest {
    return { ambienteId: '', rolAplicacion: '', correo: '', password: '', notas: '' };
  }

  private emptyCloudResourceForm(): CreateAmbienteCloudResourceRequest {
    return { ambienteId: '', tipoRecurso: '', nombreRecurso: '', deepLink: '', nota: '' };
  }
}
