import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { LoggerService } from '../../../core/services/logger.service';
import { ErrorService } from '../../../core/services/error.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private logger: LoggerService,
    private errorService: ErrorService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Log outgoing request
    this.logger.apiRequest(req.method, req.url);

    // Clone request and add auth headers
    const authReq = this.addAuthHeaders(req);

    return next.handle(authReq).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          this.logger.apiRequest(req.method, req.url, duration);

          // Log successful responses
          if (event.status >= 200 && event.status < 300) {
            this.logger.debug(`✅ ${req.method} ${req.url} - ${event.status} (${duration}ms)`);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const duration = Date.now() - startTime;

        // Log HTTP errors
        this.logger.error(`❌ ${req.method} ${req.url} - ${error.status} (${duration}ms)`, {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error,
          requestId
        });

        // Handle specific error types
        this.errorService.handleHttpError(error, 'HTTP Interceptor');

        // Handle authentication errors
        if (error.status === 401) {
          this.handleUnauthorized();
        }

        return throwError(() => error);
      }),
      finalize(() => {
        // Log request completion
        const duration = Date.now() - startTime;
        this.logger.debug(`🏁 Request completed: ${req.method} ${req.url} (${duration}ms)`, {
          requestId,
          duration
        });
      })
    );
  }

  private addAuthHeaders(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.getAuthToken();
    if (token) {
      return req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Request-ID': this.generateRequestId(),
          'X-Client-Version': '1.0.0'
        }
      });
    }
    return req.clone({
      setHeaders: {
        'X-Request-ID': this.generateRequestId()
      }
    });
  }

  private getAuthToken(): string | null {
    // Usar claves configuradas en environment
    const key = environment.auth.tokenKey;
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    return token;
  }

  private handleUnauthorized(): void {
    this.logger.warn('🚪 Unauthorized request - token may be expired');
    const key = environment.auth.tokenKey;
    const refreshKey = environment.auth.refreshTokenKey;
    localStorage.removeItem(key);
    localStorage.removeItem(refreshKey);
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(refreshKey);
    this.logger.info('🔄 Tokens cleared due to unauthorized response');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
