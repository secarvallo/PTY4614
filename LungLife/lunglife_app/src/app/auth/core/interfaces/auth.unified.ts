import { Observable } from 'rxjs';

export interface User {
  id: number;
  name?: string; // Made optional
  firstName?: string;
  lastName?: string;
  email?: string;
  isEmailVerified?: boolean;
  twoFAEnabled?: boolean;
  createdAt: Date; // Ensure this is always initialized
  lastLogin?: Date;
  updatedAt?: Date;
  phone?: string; // Added missing property
  birthDate?: Date; // Added missing property
  isActive?: boolean; // Added missing property
  avatar?: string; // Added missing property
  role?: string; // Added missing property
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  acceptTerms?: boolean;
}

export interface AuthState {
  isAuthenticated$: Observable<boolean>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  requiresTwoFA$: Observable<boolean>;
  user$: Observable<User | null>;
}