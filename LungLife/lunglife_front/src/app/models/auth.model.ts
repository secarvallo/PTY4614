import {User} from './user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface RegisterCredentials {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  acceptTerms: boolean;      // Requerido: Términos y condiciones
  acceptPrivacy: boolean;    // Requerido: Política de privacidad
  acceptMarketing?: boolean; // Opcional: Marketing
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface TokenPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}
