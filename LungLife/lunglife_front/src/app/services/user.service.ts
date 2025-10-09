import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {ApiService} from './api.service';
import {User, UserDeleteResponse, UserProfile, UserResponse, UserUpdateRequest} from '../models/user.model';
import {ApiResponse} from '../models/api.model';
import {AppConstants} from '../utils/constants';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiService = inject(ApiService);

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(userData: UserUpdateRequest): Observable<UserResponse> {
    // Clean undefined/null values
    const cleanedData = this.cleanUserData(userData);

    return this.apiService.put<User>(
      AppConstants.API_ENDPOINTS.USER.PROFILE,
      cleanedData
    ).pipe(
      map(response => ({
        success: response.success,
        message: response.message,
        user: response.data
      }))
    );
  }

  /**
   * Obtiene el perfil del usuario
   */
  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.apiService.get<UserProfile>(AppConstants.API_ENDPOINTS.USER.PROFILE);
  }

  /**
   * Elimina la cuenta del usuario
   */
  deleteAccount(): Observable<UserDeleteResponse> {
    return this.apiService.delete(AppConstants.API_ENDPOINTS.USER.DELETE).pipe(
      map(response => ({
        success: response.success,
        message: response.message
      }))
    );
  }

  /**
   * Limpia los datos del usuario removiendo valores undefined/null/empty
   */
  private cleanUserData(userData: Partial<User>): Partial<User> {
    const cleaned: Partial<User> = {};

    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        (cleaned as any)[key] = value;
      }
    });

    return cleaned;
  }
}
