import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, EMPTY } from 'rxjs';
import { Observable } from 'rxjs';
import { AdvancedAuthService } from '../services/advanced-auth.service';
import { environment } from '../../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const authService = inject(AdvancedAuthService);

  // No agregar token a requests de autenticación
  if (isAuthRequest(req)) {
    return next(req);
  }

  // Agregar token de acceso si está disponible
  const modifiedRequest = addAuthToken(req);

  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !authService.isRefreshing) {
        return handle401Error(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function isAuthRequest(req: any): boolean {
  const authEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email'
  ];

  return authEndpoints.some(endpoint => req.url.includes(endpoint));
}

function addAuthToken(req: any): any {
  const token = localStorage.getItem('lunglife_access_token');

  if (token && shouldAddToken(req)) {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return req;
}

function shouldAddToken(req: any): boolean {
  return req.url.startsWith(environment.apiUrl);
}

function handle401Error(request: any, next: any, authService: any): Observable<HttpEvent<unknown>> {
  if (authService.isRefreshing) {
    return EMPTY;
  }

  authService.isRefreshing = true;

  return authService.refreshToken().pipe(
    switchMap((newToken: string) => {
      authService.isRefreshing = false;
      const retryRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${newToken}`
        }
      });
      return next(retryRequest);
    }),
    catchError((error) => {
      authService.isRefreshing = false;
      authService.logout();
      return throwError(() => error);
    })
  );
}
