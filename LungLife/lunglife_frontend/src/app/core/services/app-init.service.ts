import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';
import { CoreAuthStore } from '../../auth/core/services/core-auth.store';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private initializing$ = new BehaviorSubject<boolean>(true);

  constructor(private coreStore: CoreAuthStore) {}

  setInitializing(value: boolean) {
    this.initializing$.next(value);
  }

  isInitializing(): Observable<boolean> {
    return this.initializing$.asObservable();
  }

  isInitializingSync(): boolean {
    return this.initializing$.getValue();
  }

  async bootstrapSession(): Promise<void> {
    this.initializing$.next(true);
    // Ensure device id exists early for refresh flows
    try {
      if (!localStorage.getItem('lunglife_device_id')) {
        // Use crypto UUID if available
        const id = (crypto && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : 'dev-' + Math.random().toString(36).slice(2);
        localStorage.setItem('lunglife_device_id', id);
      }
    } catch {}

    await firstValueFrom(
      this.coreStore.bootstrapSession().pipe(
        timeout(5000), // Fallback timeout de 5 segundos
        catchError(() => {
          console.warn('Bootstrap session timeout or error occurred.');
          return of(undefined);
        }),
        finalize(() => this.initializing$.next(false))
      )
    );
  }
}
