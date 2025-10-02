import { User } from './user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
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
  error: string | null; // added to support error handling in AuthService
}

// JWT payload minimal shape
export interface TokenPayload {
  exp: number; // expiration timestamp (seconds)
  iat?: number; // issued at
  [key: string]: any; // allow additional claims
}
