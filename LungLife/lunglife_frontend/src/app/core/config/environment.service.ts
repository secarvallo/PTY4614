import { Injectable } from '@angular/core';
import { Environment } from './environment.interface';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private currentEnvironment: Environment | null = null;

  constructor() {
    this.loadEnvironment();
  }

  private async loadEnvironment(): Promise<void> {
    try {
      // Try to load from environment files
      const env = await import('../../../environments/environment');
      this.currentEnvironment = env.environment;
    } catch (error) {
      console.warn('Could not load environment, using defaults:', error);
      this.currentEnvironment = {
        production: false,
        apiUrl: 'http://localhost:3000/api'
      };
    }
  }

  getEnvironment(): Environment | null {
    return this.currentEnvironment;
  }

  isProduction(): boolean {
    return this.currentEnvironment?.production || false;
  }

  getApiUrl(): string {
    return this.currentEnvironment?.apiUrl || 'http://localhost:3000/api';
  }

  get(key: string): any {
    return this.currentEnvironment?.[key];
  }
}