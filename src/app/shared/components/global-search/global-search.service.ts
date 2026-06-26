import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, concat, map, of, shareReplay, switchMap, timeout, timer } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ManagementFacade } from '../../../core/data-access/management.facade';
import { Client, Credential, Deployment, EnvironmentItem, Project, RepositoryHealth, Tone, UsuarioSnapshot } from '../../../core/models/management.models';
import { SearchHistoryItem, SearchItem, SearchResultDto, SearchResultType, SearchViewState } from '../../../core/models/search.models';
import { AuthService } from '../../../core/services/auth.service';
import { SearchApiService } from '../../../core/services/search-api.service';

interface ParsedSearchQuery {
  raw: string;
  term: string;
  types: SearchResultType[];
  recognizedPrefix: boolean;
}

interface SearchableEntity<T> {
  entity: T;
  fields: string[];
}

const HISTORY_KEY = 'cp_search_history';

const TYPE_PREFIXES: Record<string, SearchResultType> = {
  p: 'proyecto',
  c: 'cliente',
  u: 'usuario',
  k: 'credencial',
  a: 'ambiente',
  r: 'repositorio',
  d: 'despliegue'
};

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly api = inject(SearchApiService);
  private readonly auth = inject(AuthService);
  private readonly facade = inject(ManagementFacade);

  private readonly isOpenSubject = new BehaviorSubject<boolean>(false);
  private readonly querySubject = new BehaviorSubject<string>('');

  readonly isOpen$ = this.isOpenSubject.asObservable();

  readonly state$: Observable<SearchViewState> = this.querySubject.pipe(
    map((query) => query.trimStart()),
    switchMap((query) => {
      const parsed = this.parseQuery(query);

      if (!this.shouldSearch(parsed)) {
        return of({ status: 'idle', query } satisfies SearchViewState);
      }

      return concat(
        of({ status: 'loading', query } satisfies SearchViewState),
        timer(200).pipe(switchMap(() => this.performSearch(parsed)))
      );
    })
  ).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  open(): void {
    this.isOpenSubject.next(true);
  }

  close(): void {
    this.isOpenSubject.next(false);
  }

  search(query: string): void {
    this.querySubject.next(query);
  }

  retry(query: string): void {
    this.querySubject.next(`${query} `);
    queueMicrotask(() => this.querySubject.next(query));
  }

  saveToHistory(item: SearchItem, term: string): void {
    if (item.type === 'credencial') return;

    const entry: SearchHistoryItem = {
      term: term.trim(),
      resultType: item.type,
      resultId: item.id,
      resultName: item.name,
      visitedAt: new Date().toISOString()
    };

    const next = [
      entry,
      ...this.getHistory().filter(
        (historyItem) =>
          historyItem.resultType !== item.type || historyItem.resultId !== item.id
      )
    ].slice(0, 5);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  getHistory(): SearchHistoryItem[] {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as SearchHistoryItem[];
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  }

  clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
  }

  parseQuery(raw: string): ParsedSearchQuery {
    const trimmed = raw.trim();
    const match = trimmed.match(/^([a-z]):\s*(.*)$/i);

    if (!match) {
      return {
        raw,
        term: trimmed,
        types: [],
        recognizedPrefix: false
      };
    }

    const type = TYPE_PREFIXES[match[1].toLowerCase()];
    if (!type) {
      return {
        raw,
        term: trimmed,
        types: [],
        recognizedPrefix: false
      };
    }

    return {
      raw,
      term: match[2].trim(),
      types: [type],
      recognizedPrefix: true
    };
  }

  historyNavigateTo(item: SearchHistoryItem): string {
    const routes: Record<SearchResultType, string> = {
      proyecto: `/proyectos/${item.resultId}`,
      cliente: `/clientes/${item.resultId}`,
      usuario: `/equipo/usuarios/${item.resultId}`,
      credencial: '/credenciales',
      ambiente: `/ambientes/${item.resultId}`,
      repositorio: '/repositorios',
      despliegue: '/despliegues'
    };
    return routes[item.resultType];
  }

  private performSearch(parsed: ParsedSearchQuery): Observable<SearchViewState> {
    const limit = parsed.recognizedPrefix && !parsed.term ? 10 : 12;
    const hasOnlyAmbientePrefix = parsed.types.length === 1 && parsed.types[0] === 'ambiente';

    return this.api.search(parsed.term, parsed.types, limit).pipe(
      timeout({ first: 500 }),
      map((result) => {
        if (
          result.items.length === 0
          && parsed.recognizedPrefix
          && parsed.term.length === 0
          && !hasOnlyAmbientePrefix
        ) {
          const localResult = this.searchLocal(parsed, limit);
          if (localResult.items.length > 0) return this.toState(parsed.raw, localResult);
        }

        if (result.items.length === 0 && parsed.types.includes('despliegue')) {
          const localResult = this.searchLocal(parsed, limit);
          if (localResult.items.length > 0) return this.toState(parsed.raw, localResult);
        }

        return this.toState(parsed.raw, result);
      }),
      catchError(() => {
        const localResult = this.searchLocal(parsed, limit);
        if (localResult.items.length > 0) {
          return of(this.toState(parsed.raw, localResult));
        }

        return of({
          status: 'error',
          query: parsed.raw,
          message: 'Error al buscar. Verifica tu conexión.'
        } satisfies SearchViewState);
      })
    );
  }

  private toState(query: string, result: SearchResultDto): SearchViewState {
    return {
      status: result.items.length > 0 ? 'success' : 'empty',
      query,
      result
    };
  }

  private shouldSearch(parsed: ParsedSearchQuery): boolean {
    if (!parsed.raw.trim()) return false;
    if (parsed.recognizedPrefix && parsed.term.length === 0) return true;
    if (parsed.recognizedPrefix) return parsed.term.length > 0;
    return parsed.term.length >= 2;
  }

  private searchLocal(parsed: ParsedSearchQuery, limit: number): SearchResultDto {
    const snapshot = this.facade.snapshot();
    const term = parsed.term;
    const requested = parsed.types.length > 0 ? new Set<SearchResultType>(parsed.types) : null;
    const items: SearchItem[] = [];

    if (this.canSearchType('proyecto', requested, 'proyectos.ver')) {
      items.push(...this.searchProjects(snapshot.projects, term));
    }

    if (this.canSearchType('cliente', requested, 'clientes.ver')) {
      items.push(...this.searchClients(snapshot.clients, term));
    }

    if (this.canSearchType('usuario', requested, 'usuarios.ver')) {
      items.push(...this.searchUsers(snapshot.usuarios, term));
    }

    if (this.canSearchType('credencial', requested, 'credenciales.ver')) {
      items.push(...this.searchCredentials(snapshot.infrastructure.credentials, term));
    }

    if (this.canSearchType('ambiente', requested, 'ambientes.ver')) {
      const environments = snapshot.infrastructure.environmentGroups.flatMap((group) =>
        group.items.map((item) => ({ ...item, projectName: group.projectName }))
      );
      items.push(...this.searchEnvironments(environments, term));
    }

    if (this.canSearchType('repositorio', requested, 'proyectos.ver')) {
      items.push(...this.searchRepositories(snapshot.infrastructure.repositories, term));
    }

    if (environment.showDeployments && this.canSearchType('despliegue', requested, 'despliegues.ver')) {
      items.push(...this.searchDeployments(snapshot.infrastructure.deployments, term));
    }

    const ordered = items
      .sort((a, b) => b.score - a.score || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, limit);

    return {
      items: ordered,
      total: items.length,
      query: term,
      local: true
    };
  }

  private searchProjects(projects: Project[], term: string): SearchItem[] {
    return this.searchEntities(
      projects.map((project) => ({
        entity: project,
        fields: [project.name, project.clientName, project.stage, project.status, project.lead.name]
      })),
      term,
      (project, score) => ({
        id: project.id,
        type: 'proyecto',
        name: project.name,
        subtitle: `${project.clientName} · ${project.stage} · ${project.progress}%`,
        badge: project.status,
        badgeVariant: project.statusTone,
        icon: 'folder-kanban',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: `/proyectos/${project.id}`
      })
    );
  }

  private searchClients(clients: Client[], term: string): SearchItem[] {
    return this.searchEntities(
      clients.map((client) => ({
        entity: client,
        fields: [client.name, client.sector, client.status]
      })),
      term,
      (client, score) => ({
        id: client.id,
        type: 'cliente',
        name: client.name,
        subtitle: `${client.projectsCount} proyectos · ${client.sector}`,
        badge: client.status,
        badgeVariant: client.statusTone,
        icon: 'building-2',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: `/clientes/${client.id}`
      })
    );
  }

  private searchUsers(users: UsuarioSnapshot[], term: string): SearchItem[] {
    return this.searchEntities(
      users.map((user) => ({
        entity: user,
        fields: [`${user.nombres} ${user.apellidos}`, user.correo, user.puesto, user.iniciales]
      })),
      term,
      (user, score) => ({
        id: user.id,
        type: 'usuario',
        name: `${user.nombres} ${user.apellidos}`.trim(),
        subtitle: `${user.correo} · ${user.puesto}`,
        badge: user.puesto,
        badgeVariant: this.roleTone(user.puesto),
        icon: 'user',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: `/equipo/usuarios/${user.id}`
      })
    );
  }

  private searchEnvironments(
    environments: Array<EnvironmentItem & { projectName: string }>,
    term: string
  ): SearchItem[] {
    return this.searchEntities(
      environments.map((environment) => ({
        entity: environment,
        fields: [environment.name, environment.type ?? '', environment.url, environment.stack, environment.state, environment.projectName]
      })),
      term,
      (environment, score) => ({
        id: environment.id ?? environment.name,
        type: 'ambiente',
        name: environment.name,
        subtitle: `${environment.projectName} · ${environment.stack} · ${environment.state}`,
        badge: environment.state,
        badgeVariant: environment.stateTone,
        icon: 'server',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: environment.id ? `/ambientes/${environment.id}` : '/ambientes'
      })
    );
  }

  private searchCredentials(credentials: Credential[], term: string): SearchItem[] {
    return this.searchEntities(
      credentials.map((credential) => ({
        entity: credential,
        fields: [credential.service, credential.environment, credential.kind, credential.expiresIn]
      })),
      term,
      (credential, score) => ({
        id: `${credential.service}-${credential.environment}-${credential.kind}`,
        type: 'credencial',
        name: credential.service,
        subtitle: `${credential.environment} · ${credential.kind} · ${credential.expiresIn}`,
        badge: credential.environment,
        badgeVariant: credential.environmentTone,
        icon: 'key-round',
        score,
        updatedAt: new Date().toISOString(),
        // El snapshot local no expone el id real de la credencial, así que sólo
        // repoblamos el buscador con su nombre; la bóveda se abre con resultados del backend.
        navigateTo: `/credenciales?q=${encodeURIComponent(credential.service)}`
      })
    );
  }

  private searchRepositories(repositories: RepositoryHealth[], term: string): SearchItem[] {
    return this.searchEntities(
      repositories.map((repository) => ({
        entity: repository,
        fields: [repository.name, repository.provider, repository.branch, repository.stack, repository.status]
      })),
      term,
      (repository, score) => ({
        id: repository.name,
        type: 'repositorio',
        name: repository.name,
        subtitle: `${repository.stack} · ${repository.provider} · ${repository.branch}`,
        badge: repository.status,
        badgeVariant: repository.tone,
        icon: 'git-branch',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: '/repositorios'
      })
    );
  }

  private searchDeployments(deployments: Deployment[], term: string): SearchItem[] {
    return this.searchEntities(
      deployments.map((deployment) => ({
        entity: deployment,
        fields: [deployment.version, deployment.projectName, deployment.target, deployment.actor, deployment.status]
      })),
      term,
      (deployment, score) => ({
        id: `${deployment.projectName}-${deployment.version}-${deployment.target}`,
        type: 'despliegue',
        name: deployment.version,
        subtitle: `${deployment.projectName} → ${deployment.target} · ${deployment.when}`,
        badge: deployment.status,
        badgeVariant: deployment.tone,
        icon: 'rocket',
        score,
        updatedAt: new Date().toISOString(),
        navigateTo: '/despliegues'
      })
    );
  }

  private searchEntities<T>(
    entities: SearchableEntity<T>[],
    term: string,
    mapItem: (entity: T, score: number) => SearchItem
  ): SearchItem[] {
    return entities
      .map(({ entity, fields }) => ({
        entity,
        score: this.scoreFields(fields, term)
      }))
      .filter(({ score }) => !term || score > 0)
      .map(({ entity, score }) => mapItem(entity, term ? score : 0.5));
  }

  private scoreFields(fields: string[], term: string): number {
    if (!term) return 0.5;

    const fullScore = this.fieldSetScore(fields, term);

    // Multi-término: cada palabra debe aparecer en algún campo (AND), para poder
    // ubicar p. ej. un proyecto combinando título + cliente ("ERP Repsol").
    const terms = term.split(/\s+/).filter((value) => value.length > 0);
    if (terms.length <= 1) return fullScore;

    let sum = 0;
    for (const token of terms) {
      const tokenScore = this.fieldSetScore(fields, token);
      if (tokenScore === 0) return fullScore;
      sum += tokenScore;
    }

    return Math.max(fullScore, sum / terms.length);
  }

  private fieldSetScore(fields: string[], term: string): number {
    return fields
      .map((field, index) => this.scoreField(field, term) * (index === 0 ? 1 : 0.7))
      .reduce((max, score) => Math.max(max, score), 0);
  }

  private scoreField(field: string, term: string): number {
    const value = this.normalize(field);
    const query = this.normalize(term);

    if (value === query) return 1;
    if (value.startsWith(query)) return 0.9;
    if (value.includes(` ${query}`)) return 0.8;
    if (value.includes(query)) return 0.6;
    return 0;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private canSearchType(
    type: SearchResultType,
    requested: Set<SearchResultType> | null,
    permission: string
  ): boolean {
    return (!requested || requested.has(type)) && this.auth.hasPermission(permission);
  }

  private roleTone(role: string): Tone {
    const normalized = role.toLowerCase();
    if (normalized.includes('arquitecto')) return 'purple';
    if (normalized.includes('gerencia')) return 'blue';
    if (normalized === 'lt') return 'teal';
    if (normalized.includes('dev')) return 'green';
    return 'gray';
  }
}
