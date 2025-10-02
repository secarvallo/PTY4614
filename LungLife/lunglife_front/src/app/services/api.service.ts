import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, MonoTypeOperatorFunction } from 'rxjs';
import { catchError, timeout, retryWhen, mergeMap, take } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AppConstants } from '../utils/constants';
import { ApiError, HttpOptions } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Realiza una petición GET
   */
  get<T>(endpoint: string, options: HttpOptions = {}): Observable<T> {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);

    return this.http.get<T>(url, { params })
      .pipe(
        this.addRetryLogic<T>(),
        this.addTimeout<T>(),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Realiza una petición POST
   */
  post<T>(endpoint: string, data: unknown, options: HttpOptions = {}): Observable<T> {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);

    return this.http.post<T>(url, data, { params })
      .pipe(
        this.addRetryLogic<T>(),
        this.addTimeout<T>(),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Realiza una petición PUT
   */
  put<T>(endpoint: string, data: unknown, options: HttpOptions = {}): Observable<T> {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);

    return this.http.put<T>(url, data, { params })
      .pipe(
        this.addRetryLogic<T>(),
        this.addTimeout<T>(),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Realiza una petición DELETE
   */
  delete<T>(endpoint: string, options: HttpOptions = {}): Observable<T> {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);

    return this.http.delete<T>(url, { params })
      .pipe(
        this.addRetryLogic<T>(),
        this.addTimeout<T>(),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Construye la URL completa del endpoint
   */
  private buildUrl(endpoint: string): string {
    // Remover slash duplicado si existe
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${this.apiUrl}/${cleanEndpoint}`;
  }

  /**
   * Construye parámetros HTTP
   */
  private buildParams(params: Record<string, any> = {}): HttpParams {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return httpParams;
  }

  /**
   * Agrega lógica de reintento para errores de red
   */
  private addRetryLogic<T>(): MonoTypeOperatorFunction<T> {
    return retryWhen<T>(errors =>
      errors.pipe(
        mergeMap((error: any, count: number) => {
          // Solo reintentar para errores de red o timeout
          if (count < AppConstants.APP_CONFIG.MAX_RETRY_ATTEMPTS &&
            (error.status === 0 || error.status === 408)) {
            return timer(1000 * (count + 1)); // Backoff exponencial simple
          }
          return throwError(() => error);
        }),
        take(AppConstants.APP_CONFIG.MAX_RETRY_ATTEMPTS + 1)
      )
    );
  }

  /**
   * Agrega timeout a las peticiones
   */
  private addTimeout<T>(): MonoTypeOperatorFunction<T> {
    return timeout<T>(AppConstants.APP_CONFIG.REQUEST_TIMEOUT);
  }

  /**
   * Maneja errores HTTP de manera consistente
   */
  private handleError(error: HttpErrorResponse) {
    const apiError: ApiError = {
      status: error.status,
      message: this.getErrorMessage(error),
      timestamp: new Date().toISOString(),
      path: error.url || 'unknown'
    };

    console.error('API Error:', apiError);

    return throwError(() => apiError);
  }

  /**
   * Obtiene mensaje de error apropiado
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      return AppConstants.ERROR_MESSAGES.NETWORK_ERROR;
    } else {
      // Error del servidor
      switch (error.status) {
        case 0:
          return AppConstants.ERROR_MESSAGES.NETWORK_ERROR;
        case 400:
          return error.error?.message || 'Solicitud incorrecta';
        case 401:
          return AppConstants.ERROR_MESSAGES.INVALID_CREDENTIALS;
        case 403:
          return AppConstants.ERROR_MESSAGES.UNAUTHORIZED;
        case 404:
          return 'Recurso no encontrado';
        case 409:
          return AppConstants.ERROR_MESSAGES.EMAIL_EXISTS;
        case 422:
          return error.error?.message || 'Datos de entrada inválidos';
        case 500:
          return 'Error interno del servidor';
        default:
          return AppConstants.ERROR_MESSAGES.GENERIC_ERROR;
      }
    }
  }
}
