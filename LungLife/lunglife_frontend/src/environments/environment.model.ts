export interface AppEnvironment {
  production: boolean;
  apiUrl: string;

  // Authentication Configuration
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireEmailVerification: boolean;
    require2FA: boolean;
  };

  // Security Configuration
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    allowPasswordHistory: number;
  };

  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };

  // Feature Flags
  features: {
    enableGoogleAuth: boolean;
    enableMicrosoftAuth: boolean;
    enable2FA: boolean;
    enableEmailVerification: boolean;
    enablePasswordRecovery: boolean;
    enableDeviceTracking: boolean;
    enableSecurityLogging: boolean;
  };

  // Development Settings
  dev: {
    enableDebugMode: boolean;
    showAuthStateInUI: boolean;
    mockBackendDelay: number;
    enableConsoleLogging: boolean;
  };
}

import { Environment } from '../app/core/config/environment.interface';

/**
 * 🔄 Environment Adapter
 * Adapts the existing AppEnvironment to the new Environment interface
 */
export class EnvironmentAdapter {
  static adapt(appEnv: AppEnvironment): Environment {
    return {
      production: appEnv.production,
      apiUrl: appEnv.apiUrl, // Add the required apiUrl property
      name: appEnv.production ? 'production' : 'development',

      // API Configuration
      api: {
        baseUrl: appEnv.apiUrl,
        timeout: 30000, // Default timeout
        retryAttempts: 3
      },

      // Authentication
      auth: {
        tokenKey: appEnv.auth.tokenKey,
        refreshTokenKey: appEnv.auth.refreshTokenKey,
        tokenExpirationBuffer: 5 // 5 minutes buffer
      },

      // Logging
      logging: {
        level: appEnv.dev.enableConsoleLogging ? 'debug' : 'info',
        enableConsole: appEnv.dev.enableConsoleLogging,
        enableRemote: false
      },

      // Features
      features: {
        enable2FA: appEnv.auth.require2FA,
        enableGoogleAuth: appEnv.features.enableGoogleAuth,
        enableBiometrics: false,
        enableOfflineMode: false
      },

      // Third-party services
      services: {
        google: {
          clientId: '', // To be configured
          redirectUri: ''
        },
        firebase: appEnv.firebase ? {
          apiKey: appEnv.firebase.apiKey,
          authDomain: appEnv.firebase.authDomain,
          projectId: appEnv.firebase.projectId
        } : undefined
      },

      // UI/UX
      ui: {
        theme: 'auto',
        language: 'en',
        dateFormat: 'MM/dd/yyyy',
        currency: 'USD'
      },

      // Performance
      performance: {
        enableServiceWorker: false,
        enablePreloading: true,
        lazyLoadThreshold: 100
      },

      // Security
      security: {
        enableCSP: true,
        enableHSTS: appEnv.production,
        sessionTimeout: Math.floor(appEnv.auth.sessionTimeout / (1000 * 60)) // Convert to minutes
      }
    };
  }
}
