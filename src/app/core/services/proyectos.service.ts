import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/security.models';
import { Project, ProyectoMiembro } from '../models/management.models';

interface RawProyectoMiembro {
  id: string;
  usuarioId: string;
  nombreCompleto: string;
  iniciales: string;
  rol: string;
}

interface RawProyectoDto {
  id: string;
  nombre: string;
  clienteId: string;
  clienteNombre: string;
  tipoSolucionId: string;
  tipoSolucionNombre: string;
  etapa: string;
  estado: string;
  progreso: number;
  fechaInicio: string;
  fechaFin: string;
  totalMiembros: number;
  miembros: RawProyectoMiembro[];
}

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

function mapStageLabel(etapa: string): string {
  const labels: Record<string, string> = {
    Analisis: 'Análisis',
    Diseno: 'Diseño',
    Desarrollo: 'Desarrollo',
    QA: 'QA',
    Deploy: 'Deploy',
    Soporte: 'Soporte',
  };
  return labels[etapa] ?? etapa;
}

function mapStageTone(etapa: string): string {
  const tones: Record<string, string> = {
    Analisis: 'purple',
    Diseno: 'purple',
    Desarrollo: 'blue',
    QA: 'amber',
    Deploy: 'teal',
    Soporte: 'gray',
  };
  return tones[etapa] ?? 'blue';
}

function mapStatusLabel(estado: string): string {
  const labels: Record<string, string> = {
    Planificacion: 'Planificación',
    EnCurso: 'En curso',
    Completado: 'Completado',
    PorVencer: 'Por vencer',
  };
  return labels[estado] ?? estado;
}

function mapStatusTone(estado: string): string {
  const tones: Record<string, string> = {
    Planificacion: 'blue',
    EnCurso: 'amber',
    Completado: 'green',
    PorVencer: 'red',
  };
  return tones[estado] ?? 'gray';
}

function mapProgressTone(progreso: number): string {
  if (progreso >= 80) return 'green';
  if (progreso >= 40) return 'blue';
  if (progreso >= 20) return 'amber';
  return 'red';
}

function mapRawToProject(raw: RawProyectoDto): Project {
  const miembros: ProyectoMiembro[] = (raw.miembros ?? []).map(m => ({
    id: m.id,
    usuarioId: m.usuarioId,
    nombreCompleto: m.nombreCompleto,
    iniciales: m.iniciales,
    rol: m.rol as 'Principal' | 'Apoyo',
  }));

  return {
    id: raw.id,
    name: raw.nombre,
    clientId: raw.clienteId,
    clientName: raw.clienteNombre,
    tipoSolucionId: raw.tipoSolucionId,
    tipoSolucionNombre: raw.tipoSolucionNombre,
    stage: mapStageLabel(raw.etapa),
    stageValue: raw.etapa,
    stageTone: mapStageTone(raw.etapa) as any,
    lead: { initials: '', name: '', tone: 'blue' as any },
    progress: raw.progreso,
    progressTone: mapProgressTone(raw.progreso) as any,
    startDate: raw.fechaInicio,
    endDate: raw.fechaFin,
    status: mapStatusLabel(raw.estado),
    statusValue: raw.estado,
    statusTone: mapStatusTone(raw.estado) as any,
    teamSize: raw.totalMiembros,
    miembros,
  };
}

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  getProjects(page = 1, pageSize = 20, estado?: string, clienteId?: string): Observable<PagedResult<Project>> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (estado) params = params.set('estado', estado);
    if (clienteId) params = params.set('clienteId', clienteId);
    return this.http
      .get<ApiResponse<PagedResult<RawProyectoDto>>>(`${this.api}/proyectos`, { params })
      .pipe(
        extractData(),
        map(result => ({
          ...result,
          data: result.data.map(mapRawToProject),
        }))
      );
  }
}
