import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthState
} from '../models/auth.model';
import { User } from '../models/user.model';
import { AppConstants } from '../utils/constants';
import { Helpers } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiService = inject(ApiService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  // Estado de autenticación reactivo
  private authState = new BehaviorSubject<AuthState>(this.getInitialState());
  public authState$ = this.authState.asObservable();

  constructor() {
    this.checkTokenExpiry();
  }

  /**
   * Registra un nuevo usuario
   */
  register(userData: RegisterData): Observable<AuthResponse> {
    this.setLoading(true);

    return this.apiService.post<AuthResponse>(
      AppConstants.API_ENDPOINTS.AUTH.REGISTER,
      userData
    ).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.handleAuthSuccess(response.token, response.user);
        }
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(Helpers.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Inicia sesión con email y contraseña
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.setLoading(true);

    return this.apiService.post<AuthResponse>(
      AppConstants.API_ENDPOINTS.AUTH.LOGIN,
      credentials
    ).pipe(
      tap(response => {
        if (response.success && response.token && response.user) {
          this.handleAuthSuccess(response.token, response.user);
        }
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        this.setError(Helpers.handleError(error));
        return throwError(() => error);
      })
    );
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    // Limpiar almacenamiento local
    this.storageService.removeItem(AppConstants.STORAGE_KEYS.AUTH_TOKEN);
    this.storageService.removeItem(AppConstants.STORAGE_KEYS.USER_DATA);

    // Actualizar estado
    this.authState.next({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    });

    // Redirigir al login
    this.router.navigate(['/login']);
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) return false;

    // Verificar expiración del token
    return !Helpers.isTokenExpired(token);
  }

  /**
   * Obtiene el token JWT actual
   */
  getToken(): string | null {
    return this.storageService.getItem(AppConstants.STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    const userData = this.storageService.getItem(AppConstants.STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Obtiene el estado actual de autenticación
   */
  getAuthState(): AuthState {
    return this.authState.value;
  }

  /**
   * Maneja el éxito de autenticación
   */
  private handleAuthSuccess(token: string, user: User): void {
    // Guardar en almacenamiento
    this.storageService.setItem(AppConstants.STORAGE_KEYS.AUTH_TOKEN, token);
    this.storageService.setItem(AppConstants.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

    // Actualizar estado
    this.authState.next({
      isAuthenticated: true,
      user,
      token,
      isLoading: false,
      error: null
    });
  }

  /**
   * Obtiene el estado inicial desde el almacenamiento
   */
  private getInitialState(): AuthState {
    const token = this.getToken();
    const user = this.getCurrentUser();
    const isAuthenticated = token ? !Helpers.isTokenExpired(token) : false;

    return {
      isAuthenticated,
      user: isAuthenticated ? user : null,
      token: isAuthenticated ? token : null,
      isLoading: false,
      error: null
    };
  }

  /**
   * Verifica y maneja la expiración del token
   */
  private checkTokenExpiry(): void {
    const token = this.getToken();

    if (token && Helpers.isTokenExpired(token)) {
      console.warn('Token expirado, cerrando sesión...');
      this.logout();
    }
  }

  /**
   * Establece el estado de carga
   */
  private setLoading(isLoading: boolean): void {
    this.authState.next({
      ...this.authState.value,
      isLoading,
      error: isLoading ? null : this.authState.value.error
    });
  }

  /**
   * Establece un error
   */
  private setError(error: string | null): void {
    this.authState.next({
      ...this.authState.value,
      error,
      isLoading: false
    });
  }

  /**
   * Limpia los errores
   */
  clearError(): void {
    this.setError(null);
  }

  /**
   * Verifica si el token está próximo a expirar
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const timeUntilExpiry = Helpers.getTokenExpiryTime(token);
    return timeUntilExpiry < AppConstants.APP_CONFIG.TOKEN_EXPIRY_BUFFER;
  }
}
