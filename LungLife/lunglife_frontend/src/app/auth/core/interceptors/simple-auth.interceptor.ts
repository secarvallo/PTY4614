import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthFacadeService } from '../services';
import { environment } from '../../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * simpleAuthInterceptor
 * - Adjunta Authorization si existe token
 * - Sólo actúa sobre peticiones al apiUrl
 * - Limpia estado auth en 401
 */
export const simpleAuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const facade = inject(AuthFacadeService);
  const apiUrl = environment.apiUrl;

  let modified = req;
  const token = localStorage.getItem(environment.auth.tokenKey);
  if (token && req.url.startsWith(apiUrl)) {
    modified = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(modified).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        facade.logout();
      }
      return throwError(() => err);
    })
  );
};

