import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  // Start with false - UI should render immediately
  private initializingSubject = new BehaviorSubject<boolean>(false);
  private initialized = false;

  isInitializing() {
    return this.initializingSubject.asObservable();
  }

  setInitializing(value: boolean) {
    this.initializingSubject.next(value);
  }

  async bootstrapSession(): Promise<void> {
    if (this.initialized) return;
    try {
      this.initialized = true;
    } finally {
      // Ensure UI is unblocked
      this.setInitializing(false);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}