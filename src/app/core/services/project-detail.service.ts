import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, catchError, of, timeout } from 'rxjs';

import { AmbientesService } from '../services/ambientes.service';
import { RepositoriosService } from '../services/repositorios.service';
import { CredencialesService } from '../services/credenciales.service';
import { DesplieguesService } from '../services/despliegues.service';
import { ManagementFacade } from '../data-access/management.facade';
import { ProjectDetailInfo, ProjectTabData } from '../models/project-detail.models';

@Injectable({ providedIn: 'root' })
export class ProjectDetailService {
  private readonly ambientesService = inject(AmbientesService);
  private readonly repositoriosService = inject(RepositoriosService);
  private readonly credencialesService = inject(CredencialesService);
  private readonly desplieguesService = inject(DesplieguesService);
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
    const projects = this.facade.projects();

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

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

    return combineLatest([
      this.safeArray(this.ambientesService.getByProject(projectId), 'Ambientes'),
      this.safeArray(this.repositoriosService.getByProject(projectId), 'Repositorios'),
      this.safeArray(this.credencialesService.getCredenciales(projectId), 'Credenciales'),
      this.desplieguesService.getByProject(projectId).pipe(
        timeout(8000),
        map(r => r?.data ?? []),
        catchError(err => {
          console.warn('[ProjectDetail] Despliegues falló, usando array vacío:', err?.message ?? err);
          return of([]);
        })
      )
    ]).pipe(
      map(([ambientes, repositorios, credenciales, despliegues]) => {
        console.log('[ProjectDetail] Todos los datos cargados correctamente');
        return {
          info,
          ambientes,
          repositorios,
          credenciales,
          despliegues
        };
      })
    );
  }
}
