import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/security.models';
import { SearchResultDto, SearchResultType } from '../models/search.models';

function extractData<T>() {
  return map((response: ApiResponse<T>) => response.data as T);
}

@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  search(query: string, types: SearchResultType[] = [], limit = 12): Observable<SearchResultDto> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit);

    if (types.length > 0) {
      params = params.set('types', types.join(','));
    }

    return this.http
      .get<ApiResponse<SearchResultDto>>(`${this.api}/search`, { params })
      .pipe(extractData());
  }
}
