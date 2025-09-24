import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthState, User } from '../../interfaces/auth.unified';
import { AuthStrategyContext } from './auth-strategy-context.service';
import { AuthResult } from '../../interfaces/auth-strategy.interface';

@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  private authState = new BehaviorSubject({
    isAuthenticated$: new BehaviorSubject<boolean>(false),
    loading$: new BehaviorSubject<boolean>(false),
    error$: new BehaviorSubject<string | null>(null),
    requiresTwoFA$: new BehaviorSubject<boolean>(false),
    user$: new BehaviorSubject<User | null>(null),
  });

  constructor(private strategyContext: AuthStrategyContext) {}

  get isAuthenticated$(): Observable<boolean> {
    return this.authState.value.isAuthenticated$.asObservable();
  }

  get loading$(): Observable<boolean> {
    return this.authState.value.loading$.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.authState.value.error$.asObservable();
  }

  get requiresTwoFA$(): Observable<boolean> {
    return this.authState.value.requiresTwoFA$.asObservable();
  }

  get user$(): Observable<User | null> {
    return this.authState.value.user$.asObservable();
  }

  /**
   * Login using credentials
   */
  login(credentials: any): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('login', credentials).pipe(
      tap(result => this.handleAuthResult(result)),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Register new user
   */
  register(data: any): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('register', data).pipe(
      tap(result => this.handleAuthResult(result)),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Login with Google OAuth
   */
  loginWithGoogle(data: any): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('google-auth', data).pipe(
      tap(result => this.handleAuthResult(result)),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Setup 2FA for current user
   * @returns Observable with 2FA setup data
   */
  setup2FA(): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('two-factor', { setup: true }).pipe(
      tap(result => {
        this.setLoading(false);
        if (!result.success) {
          this.authState.value.error$.next(result.error || '2FA setup failed');
        }
      }),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Handles forgot password request
   * @param data Object containing the user's email
   * @returns Observable with the result of the operation
   */
  forgotPassword(data: { email: string }): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('forgot-password', data).pipe(
      tap(result => {
        this.setLoading(false);
        if (!result.success) {
          this.authState.value.error$.next(result.error || 'Password reset failed');
        }
      }),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Verifies a 2FA code
   * @param data Object containing the 2FA code and optional sessionId
   * @returns Observable with the result of the verification
   */
  verify2FA(data: { code: string; sessionId?: string }): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('two-factor', data).pipe(
      tap(result => this.handleAuthResult(result)),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Gets the current authenticated user
   * @returns The current user object or null if not authenticated
   */
  getCurrentUser(): User | null {
    // Return the current value of the user$ BehaviorSubject
    return this.authState.value.user$.getValue();
  }

  /**
   * Disables 2FA for the current user
   * @param password User's password for verification (optional)
   * @returns Observable with the result of the operation
   */
  disable2FA(password?: string): Observable<AuthResult> {
    this.setLoading(true);
    this.clearError();

    return this.strategyContext.executeStrategy('two-factor', {
      disable: true,
      password
    }).pipe(
      tap(result => {
        this.setLoading(false);
        if (result.success) {
          // Update user 2FA status
          const currentUser = this.getCurrentUser();
          if (currentUser) {
            currentUser.twoFAEnabled = false;
            this.authState.value.user$.next(currentUser);
          }
        } else {
          this.authState.value.error$.next(result.error || 'Failed to disable 2FA');
        }
      }),
      catchError(error => {
        this.handleAuthError(error);
        throw error;
      })
    );
  }

  /**
   * Gets the full auth state as an observable
   * @returns Observable of the auth state
   */
  getAuthState(): AuthState {
    return {
      isAuthenticated$: this.isAuthenticated$,
      loading$: this.loading$,
      error$: this.error$,
      requiresTwoFA$: this.requiresTwoFA$,
      user$: this.user$,
    };
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.authState.value.isAuthenticated$.next(false);
    this.authState.value.user$.next(null);
    this.authState.value.requiresTwoFA$.next(false);
    this.clearError();
  }

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl(): string {
    return this.strategyContext.getGoogleAuthUrl();
  }

  // Helper methods
  private setLoading(loading: boolean): void {
    this.authState.value.loading$.next(loading);
  }

  private clearError(): void {
    this.authState.value.error$.next(null);
  }

  private handleAuthResult(result: AuthResult): void {
    this.setLoading(false);

    if (result.success) {
      if (result.user) {
        this.authState.value.user$.next(result.user);
        this.authState.value.isAuthenticated$.next(true);
      }

      if (result.requiresTwoFA) {
        this.authState.value.requiresTwoFA$.next(true);
      } else {
        this.authState.value.requiresTwoFA$.next(false);
      }
    } else {
      this.authState.value.error$.next(result.error || 'Authentication failed');
    }
  }

  private handleAuthError(error: any): void {
    this.setLoading(false);
    const errorMessage = error?.error || error?.message || 'An unexpected error occurred';
    this.authState.value.error$.next(errorMessage);
  }
}
