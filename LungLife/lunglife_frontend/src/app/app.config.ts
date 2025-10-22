import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
// Temporarily comment out problematic imports
// import { AuthFacadeService, CoreAuthStore } from './auth/core/services';
// Interceptor unificado (reemplaza simpleAuth/jwt/auth previos)
// import { unifiedAuthInterceptor } from './auth/core/interceptors/unified-auth.interceptor';
import { GlobalErrorHandler } from './core/services/error.service';
// import { EnvironmentService } from './core/config/environment.service';
// import { ENVIRONMENT } from './core/config/environment.interface';
// import { EnvironmentAdapter } from '../environments/environment.model';
// import { environment } from '../environments/environment';
import { AppInitService } from './core/services/app-init.service';

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

    // ✅ Enable animations for Angular and Ionic components (fixes AnimationBuilder circular dependency)
    provideAnimationsAsync(),

    // Router with preloading strategy for performance
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HTTP Client with Authentication Interceptor
    provideHttpClient(
      // withInterceptors([unifiedAuthInterceptor]) // Temporarily disabled
    ),

    // Global Error Handler
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },

    // Environment Configuration (temporarily simplified)
    // {
    //   provide: ENVIRONMENT,
    //   useValue: EnvironmentAdapter.adapt(environment)
    // },
    // EnvironmentService,

    // Bootstrap unificado: sólo CoreAuthStore (reduce race conditions)
    {
      provide: APP_INITIALIZER,
      useFactory: (appInit: AppInitService) => () => appInit.bootstrapSession(),
      deps: [AppInitService],
      multi: true
    }

    // Additional providers can be added here for:
    // - Error handling services
    // - Logging services
    // - Analytics services
    // - Push notification services
  ],
};
