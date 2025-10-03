import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable, throwError, timer} from 'rxjs';
import {catchError, mergeMap, retryWhen, take, timeout} from 'rxjs/operators';

import {environment} from '../../environments/environment';
import {AppConstants} from '../utils/constants';
import {ApiError, ApiResponse} from '../models/api.model';

// Simplified HTTP options interface
interface HttpOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

@Injectable({providedIn: 'root'})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Realiza petición GET
   */
  readonly get = <T>(endpoint: string, options: HttpOptions = {}): Observable<ApiResponse<T>> => {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);
    const headers = new HttpHeaders(options.headers || {});

    return this.http.get<ApiResponse<T>>(url, {params, headers}).pipe(
      this.addRetryLogic<T>(),
      this.addTimeout<T>(),
      catchError(error => this.handleError(error))
    );
  };

  /**
   * Realiza petición POST
   */
  readonly post = <T>(endpoint: string, data: any, options: HttpOptions = {}): Observable<ApiResponse<T>> => {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);
    const headers = new HttpHeaders(options.headers || {});

    return this.http.post<ApiResponse<T>>(url, data, {params, headers}).pipe(
      this.addRetryLogic<T>(),
      this.addTimeout<T>(),
      catchError(error => this.handleError(error))
    );
  };

  /**
   * Realiza petición PUT
   */
  readonly put = <T>(endpoint: string, data: any, options: HttpOptions = {}): Observable<ApiResponse<T>> => {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);
    const headers = new HttpHeaders(options.headers || {});

    return this.http.put<ApiResponse<T>>(url, data, {params, headers}).pipe(
      this.addRetryLogic<T>(),
      this.addTimeout<T>(),
      catchError(error => this.handleError(error))
    );
  };

  /**
   * Realiza petición DELETE
   */
  readonly delete = <T>(endpoint: string, options: HttpOptions = {}): Observable<ApiResponse<T>> => {
    const url = this.buildUrl(endpoint);
    const params = this.buildParams(options.params);
    const headers = new HttpHeaders(options.headers || {});

    return this.http.delete<ApiResponse<T>>(url, {params, headers}).pipe(
      this.addRetryLogic<T>(),
      this.addTimeout<T>(),
      catchError(error => this.handleError(error))
    );
  };

  /**
   * Construye URL completa
   */
  private readonly buildUrl = (endpoint: string): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.apiUrl}/${cleanEndpoint}`;
  };

  /**
   * Construye parámetros HTTP
   */
  private readonly buildParams = (params: Record<string, any> = {}): HttpParams => {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    }

    return httpParams;
  };

  /**
   * Agrega lógica de reintento
   */
  private readonly addRetryLogic = <T>() => {
    return retryWhen<ApiResponse<T>>(errors =>
      errors.pipe(
        mergeMap((error, count) => {
          if (count < AppConstants.APP_CONFIG.MAX_RETRY_ATTEMPTS &&
            (error.status === 0 || error.status === 408)) {
            return timer(1000 * count);
          }
          return throwError(() => error);
        }),
        take(AppConstants.APP_CONFIG.MAX_RETRY_ATTEMPTS + 1)
      )
    );
  };

  /**
   * Agrega timeout
   */
  private readonly addTimeout = <T>() => {
    return timeout<ApiResponse<T>>(AppConstants.APP_CONFIG.REQUEST_TIMEOUT);
  };

  /**
   * Maneja errores HTTP
   */
  private readonly handleError = (error: HttpErrorResponse): Observable<never> => {
    const apiError: ApiError = {
      status: error.status,
      message: this.getErrorMessage(error),
      timestamp: new Date().toISOString(),
      path: error.url ?? 'unknown'
    };

    console.error('API Error:', apiError);

    return throwError(() => apiError);
  };

  /**
   * Obtiene mensaje de error apropiado
   */
  private readonly getErrorMessage = (error: HttpErrorResponse): string => {
    if (error.error instanceof ErrorEvent) {
      return AppConstants.ERROR_MESSAGES.NETWORK_ERROR;
    }

    switch (error.status) {
      case 0:
        return AppConstants.ERROR_MESSAGES.NETWORK_ERROR;
      case 400:
        return error.error?.message ?? 'Solicitud incorrecta';
      case 401:
        return AppConstants.ERROR_MESSAGES.INVALID_CREDENTIALS;
      case 403:
        return AppConstants.ERROR_MESSAGES.UNAUTHORIZED;
      case 404:
        return 'Recurso no encontrado';
      case 409:
        return AppConstants.ERROR_MESSAGES.EMAIL_EXISTS;
      case 422:
        return error.error?.message ?? 'Datos de entrada inválidos';
      case 500:
        return 'Error interno del servidor';
      default:
        return AppConstants.ERROR_MESSAGES.GENERIC_ERROR;
    }
  };
}
