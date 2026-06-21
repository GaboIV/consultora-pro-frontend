import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, catchError, of, timeout, switchMap } from 'rxjs';

import { AmbientesService } from '../services/ambientes.service';
import { RepositoriosService } from '../services/repositorios.service';
import { CredencialesService } from '../services/credenciales.service';
import { DesplieguesService } from '../services/despliegues.service';
import { ScreenshotsService } from './screenshots.service';
import { ProyectosService } from './proyectos.service';
import { AuthService } from './auth.service';
import { ManagementFacade } from '../data-access/management.facade';
import { ProjectDetailInfo, ProjectTabData } from '../models/project-detail.models';

@Injectable({ providedIn: 'root' })
export class ProjectDetailService {
  private readonly ambientesService = inject(AmbientesService);
  private readonly repositoriosService = inject(RepositoriosService);
  private readonly credencialesService = inject(CredencialesService);
  private readonly desplieguesService = inject(DesplieguesService);
  private readonly screenshotsService = inject(ScreenshotsService);
  private readonly proyectosService = inject(ProyectosService);
  private readonly auth = inject(AuthService);
  private readonly facade = inject(ManagementFacade);

  private safeArray<T>(obs: Observable<T[]>, label: string): Observable<T[]> {
    return obs.pipe(
      timeout(8000),
      catchError(err => {
        console.warn(`[ProjectDetail] ${label} falló, usando array vacío:`, err?.message ?? err);
        return of([] as T[]);
      })
    );
  }

  getProjectData(projectId: string): Observable<ProjectTabData> {
    const localProject = this.facade.projects().find(p => p.id === projectId);
    const project$ = localProject
      ? of(localProject)
      : this.proyectosService.getProjectById(projectId);

    return project$.pipe(
      switchMap(project => {
        const info: ProjectDetailInfo = {
          id: project.id,
          name: project.name,
          clientName: project.clientName,
          tipoSolucionNombre: project.tipoSolucionNombre,
          stage: project.stage,
          stageTone: project.stageTone,
          status: project.status,
          statusTone: project.statusTone,
          startDate: project.startDate,
          endDate: project.endDate,
          progress: project.progress,
          miembros: (project.miembros ?? []).map(m => ({
            usuarioId: m.usuarioId,
            nombreCompleto: m.nombreCompleto,
            iniciales: m.iniciales,
            rol: m.rol,
            correo: '',
            puesto: ''
          }))
        };

        // Solo se consultan los endpoints para los que el usuario tiene permiso. De lo contrario
        // el backend responde 403 y el interceptor redirige a /sin-acceso, aunque el usuario sí
        // tenga acceso al proyecto. Las pestañas se filtran por estos mismos permisos.
        const ambientes$ = this.auth.hasPermission('ambientes.ver')
          ? this.safeArray(this.ambientesService.getByProject(projectId), 'Ambientes')
          : of([]);
        const repositorios$ = this.auth.hasPermission('repositorios.ver')
          ? this.safeArray(this.repositoriosService.getByProject(projectId), 'Repositorios')
          : of([]);
        const credenciales$ = this.auth.hasPermission('credenciales.ver')
          ? this.safeArray(this.credencialesService.getCredenciales(projectId), 'Credenciales')
          : of([]);
        const despliegues$ = this.auth.hasPermission('despliegues.ver')
          ? this.desplieguesService.getByProject(projectId).pipe(
              timeout(8000),
              map(r => r?.data ?? []),
              catchError(err => {
                console.warn('[ProjectDetail] Despliegues falló, usando array vacío:', err?.message ?? err);
                return of([]);
              })
            )
          : of([]);

        return combineLatest([
          ambientes$,
          repositorios$,
          credenciales$,
          despliegues$,
          this.safeArray(this.screenshotsService.getByProject(projectId), 'Screenshots')
        ]).pipe(
          map(([ambientes, repositorios, credenciales, despliegues, screenshots]) => {
            console.log('[ProjectDetail] Todos los datos cargados correctamente');
            return {
              info,
              ambientes,
              repositorios,
              credenciales,
              despliegues,
              screenshots
            };
          })
        );
      })
    );
  }
}
