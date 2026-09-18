import { Tone } from './management.models';

export type SearchResultType =
  | 'proyecto'
  | 'cliente'
  | 'usuario'
  | 'credencial'
  | 'ambiente'
  | 'repositorio'
  | 'despliegue'
  | 'documento';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SearchItem {
  id: string;
  type: SearchResultType;
  name: string;
  subtitle: string;
  badge: string;
  badgeVariant: Tone;
  icon: string;
  score: number;
  updatedAt: string;
  navigateTo: string;
}

export interface SearchResultDto {
  items: SearchItem[];
  total: number;
  query: string;
  local?: boolean;
}

export interface SearchHistoryItem {
  term: string;
  resultType: SearchResultType;
  resultId: string;
  resultName: string;
  visitedAt: string;
  /** Ruta exacta del resultado; necesaria para tipos anidados (p. ej. documento → proyecto). */
  navigateTo?: string;
}

export interface SearchViewState {
  status: SearchStatus;
  query: string;
  result?: SearchResultDto;
  message?: string;
}
