import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const PermissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permiso = route.data?.['permiso'] as string | undefined;

  if (!permiso || auth.hasPermission(permiso)) {
    return true;
  }

  return router.createUrlTree(['/sin-acceso']);
};
