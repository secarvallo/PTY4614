import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CoreAuthStore } from '../services/core-auth.store';
import { environment } from '../../../../environments/environment';
import { ReplaySubject, throwError, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';

/**
 * unifiedAuthInterceptor
 * Objetivos:
 *  - Unificar lógica de los interceptores previos (simple, jwt, auth)
 *  - Adjuntar token sólo a endpoints del API (environment.apiUrl)
 *  - Excluir endpoints de autenticación (login/register/refresh/etc.)
 *  - Manejar refresh token concurrente (cola mediante ReplaySubject)
 *  - Limpiar sesión y propagar error si el refresh falla
 *  - Evitar loops infinitos en /auth/refresh
 */

// Estado compartido a nivel de módulo para coordinar peticiones concurrentes durante refresh
const refreshSubject = new ReplaySubject<string>(1);
let refreshInProgress = false;

const AUTH_EXCLUDED_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/2fa/verify',
  '/auth/2fa/setup'
];

function isExcluded(req: HttpRequest<unknown>): boolean {
  return AUTH_EXCLUDED_PATHS.some(p => req.url.includes(p));
}

function shouldAttachToken(req: HttpRequest<unknown>): boolean {
  return req.url.startsWith(environment.apiUrl) && !isExcluded(req);
}

function addAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const unifiedAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const coreStore = inject(CoreAuthStore);

  // No tocar peticiones excluidas
  if (isExcluded(req)) {
    return next(req);
  }

  // Adjuntar token si procede - fuente única: CoreAuthStore
  const accessToken = coreStore.getAccessTokenSync();
  const authReq = shouldAttachToken(req) ? addAuthHeader(req, accessToken) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si no es 401 ó la petición era de refresh, propagar
      if (error.status !== 401 || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      // Si ya hay un refresh en curso, esperar a que emita el nuevo token
      if (refreshInProgress) {
        return refreshSubject.pipe(
          take(1),
          switchMap((newToken) => {
            const retried = addAuthHeader(req, newToken);
            return next(retried);
          })
        );
      }

      // Iniciar ciclo de refresh
      refreshInProgress = true;
      return coreStore.refreshAuthToken().pipe(
        switchMap((newToken: string) => {
          refreshInProgress = false;
            // Emitir a los suscriptores en cola
          refreshSubject.next(newToken);
          const retried = addAuthHeader(req, newToken);
          return next(retried);
        }),
        catchError(refreshError => {
          refreshInProgress = false;
          // Notificar error a los que esperaban
          refreshSubject.error(refreshError);
          // Invalidar sesión centralizadamente
          try { coreStore.resetAll(); } catch {}
          return throwError(() => refreshError);
        })
      );
    })
  );
};
