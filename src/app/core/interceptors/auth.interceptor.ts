import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const isApiRequest = request.url.startsWith(environment.apiBaseUrl) || request.url.startsWith('/api/');

  const authRequest =
    isApiRequest && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          return throwError(() => new Error('No se pudo conectar con el servidor.'));
        }

        if (error.status === 401) {
          const isTokenStale = error.error?.errors?.includes('token-stale');
          if (isTokenStale) {
            auth.refreshCurrentUser().subscribe({
              error: () => auth.logout()
            });
          } else {
            auth.logout();
          }
        }

        if (error.status === 403) {
          void router.navigate(['/sin-acceso']);
        }
      }

      return throwError(() => error);
    })
  );
};
