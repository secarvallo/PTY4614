import { ApplicationConfig } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';

import { routes } from './app.routes';
import { AuthInterceptor } from './auth/core/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/services/error.service';
import { EnvironmentService } from './core/config/environment.service';
import { ENVIRONMENT } from './core/config/environment.interface';
import { EnvironmentAdapter } from '../environments/environment.model';
import { environment } from '../environments/environment';

/**
 * 🚀 Application Configuration - Complete Architecture Integration
 * Configures all services, interceptors, and providers for Clean Architecture
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Ionic Configuration
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      rippleEffect: true,
      mode: 'ios' // or 'md' for Material Design
    }),

    // Router with preloading strategy for performance
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HTTP Client with Authentication Interceptor
    provideHttpClient(
      withInterceptors([])
    ),

    // Auth Interceptor (class-based for compatibility)
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    // Global Error Handler
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },

    // Environment Configuration
    {
      provide: ENVIRONMENT,
      useValue: EnvironmentAdapter.adapt(environment)
    },
    EnvironmentService

    // Additional providers can be added here for:
    // - Error handling services
    // - Logging services
    // - Analytics services
    // - Push notification services
  ],
};
