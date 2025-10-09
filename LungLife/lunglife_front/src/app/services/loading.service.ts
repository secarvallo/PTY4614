import {Injectable, signal} from '@angular/core';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingStates = new Map<string, LoadingState>();

  // Global loading state
  private globalLoading = signal<LoadingState>({isLoading: false});

  // Individual loading states for different operations
  private authLoading = signal<LoadingState>({isLoading: false});
  private profileLoading = signal<LoadingState>({isLoading: false});
  private dashboardLoading = signal<LoadingState>({isLoading: false});

  // Public readonly signals
  readonly globalLoading$ = this.globalLoading.asReadonly();
  readonly authLoading$ = this.authLoading.asReadonly();
  readonly profileLoading$ = this.profileLoading.asReadonly();
  readonly dashboardLoading$ = this.dashboardLoading.asReadonly();

  /**
   * Set loading state for a specific context
   */
  setLoading(context: string, state: LoadingState): void {
    this.loadingStates.set(context, state);

    // Update specific signals based on context
    switch (context) {
      case 'auth':
        this.authLoading.set(state);
        break;
      case 'profile':
        this.profileLoading.set(state);
        break;
      case 'dashboard':
        this.dashboardLoading.set(state);
        break;
      case 'global':
        this.globalLoading.set(state);
        break;
    }
  }

  /**
   * Get loading state for a specific context
   */
  getLoading(context: string): LoadingState {
    return this.loadingStates.get(context) || {isLoading: false};
  }

  /**
   * Start loading for a context with optional message
   */
  startLoading(context: string, message?: string, progress?: number): void {
    this.setLoading(context, {isLoading: true, message, progress});
  }

  /**
   * Stop loading for a context
   */
  stopLoading(context: string): void {
    this.setLoading(context, {isLoading: false});
  }

  /**
   * Update progress for a loading context
   */
  updateProgress(context: string, progress: number, message?: string): void {
    const currentState = this.getLoading(context);
    this.setLoading(context, {
      ...currentState,
      progress,
      message: message || currentState.message
    });
  }

  /**
   * Check if any context is loading
   */
  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(state => state.isLoading);
  }

  /**
   * Clear all loading states
   */
  clearAll(): void {
    this.loadingStates.clear();
    this.globalLoading.set({isLoading: false});
    this.authLoading.set({isLoading: false});
    this.profileLoading.set({isLoading: false});
    this.dashboardLoading.set({isLoading: false});
  }
}
