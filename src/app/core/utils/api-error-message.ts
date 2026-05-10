import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión o que el API esté levantada.';
    }

    const body = error.error as { message?: string; errors?: string[] } | string | null | undefined;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      if (body.message?.trim()) return body.message;
      if (Array.isArray(body.errors) && body.errors.length > 0) return body.errors.join(' ');
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
