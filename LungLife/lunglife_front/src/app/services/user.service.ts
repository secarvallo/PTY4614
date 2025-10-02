import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { User, UserProfile, UserResponse } from '../models/user.model';
import { AppConstants } from '../utils/constants';
import { Helpers } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiService = inject(ApiService);
  private storageService = inject(StorageService);

  /**
   * Obtiene el perfil del usuario actual
   */
  getProfile(): Observable<UserResponse> {
    return this.apiService.get<UserResponse>(
      AppConstants.API_ENDPOINTS.USERS.PROFILE
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          // Actualizar usuario en almacenamiento
          this.storageService.setItem(
            AppConstants.STORAGE_KEYS.USER_DATA,
            JSON.stringify(response.user)
          );
        }
      }),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(userData: Partial<User>): Observable<UserResponse> {
    return this.apiService.put<UserResponse>(
      AppConstants.API_ENDPOINTS.USERS.UPDATE,
      userData
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          // Actualizar usuario en almacenamiento
          this.storageService.setItem(
            AppConstants.STORAGE_KEYS.USER_DATA,
            JSON.stringify(response.user)
          );
        }
      }),
      catchError(error => {
        console.error('Error updating user profile:', error);
        throw error;
      })
    );
  }

  /**
   * Cambia la contraseña del usuario
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    return this.apiService.post<{ success: boolean; message?: string }>(
      `${AppConstants.API_ENDPOINTS.USERS.BASE}/change-password`,
      { currentPassword, newPassword }
    ).pipe(
      catchError(error => {
        console.error('Error changing password:', error);
        throw error;
      })
    );
  }

  /**
   * Verifica si un email está disponible
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.apiService.get<{ available: boolean }>(
      `${AppConstants.API_ENDPOINTS.USERS.BASE}/check-email`,
      { params: { email } }
    );
  }
}
