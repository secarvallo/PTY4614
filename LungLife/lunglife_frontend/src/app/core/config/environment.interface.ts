import { InjectionToken } from '@angular/core';

/**
 * 🌍 Environment Configuration Interface
 * Strongly typed environment configuration
 */
export interface Environment {
  production: boolean;
  name: string;

  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
  };

  // Authentication
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    tokenExpirationBuffer: number; // minutes
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    remoteEndpoint?: string;
  };

  // Features
  features: {
    enable2FA: boolean;
    enableGoogleAuth: boolean;
    enableBiometrics: boolean;
    enableOfflineMode: boolean;
  };

  // Third-party services
  services: {
    google: {
      clientId: string;
      redirectUri: string;
    };
    firebase?: {
      apiKey: string;
      authDomain: string;
      projectId: string;
    };
  };

  // UI/UX
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    currency: string;
  };

  // Performance
  performance: {
    enableServiceWorker: boolean;
    enablePreloading: boolean;
    lazyLoadThreshold: number;
  };

  // Security
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    sessionTimeout: number; // minutes
  };
}

/**
 * 🔧 Environment Configuration Token
 * Injection token for environment configuration
 */
export const ENVIRONMENT = new InjectionToken<Environment>('Environment Configuration');

/**
 * ✅ Environment Validator
 * Validates environment configuration at runtime
 */
export class EnvironmentValidator {
  static validate(env: any): Environment {
    const errors: string[] = [];

    // Required fields validation
    if (typeof env.production !== 'boolean') {
      errors.push('production must be a boolean');
    }

    if (!env.name || typeof env.name !== 'string') {
      errors.push('name is required and must be a string');
    }

    // API validation
    if (!env.api?.baseUrl || typeof env.api.baseUrl !== 'string') {
      errors.push('api.baseUrl is required and must be a string');
    }

    if (!env.api?.timeout || typeof env.api.timeout !== 'number') {
      errors.push('api.timeout is required and must be a number');
    }

    // Auth validation
    if (!env.auth?.tokenKey || typeof env.auth.tokenKey !== 'string') {
      errors.push('auth.tokenKey is required and must be a string');
    }

    // Logging validation
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!env.logging?.level || !validLogLevels.includes(env.logging.level)) {
      errors.push(`logging.level must be one of: ${validLogLevels.join(', ')}`);
    }

    // Features validation
    if (typeof env.features?.enable2FA !== 'boolean') {
      errors.push('features.enable2FA must be a boolean');
    }

    if (typeof env.features?.enableGoogleAuth !== 'boolean') {
      errors.push('features.enableGoogleAuth must be a boolean');
    }

    // Services validation
    if (env.features?.enableGoogleAuth && !env.services?.google?.clientId) {
      errors.push('services.google.clientId is required when Google Auth is enabled');
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    return env as Environment;
  }

  static getDefaults(): Partial<Environment> {
    return {
      production: false,
      name: 'development',
      api: {
        baseUrl: 'http://localhost:3000/api',
        timeout: 30000,
        retryAttempts: 3
      },
      auth: {
        tokenKey: 'authToken',
        refreshTokenKey: 'refreshToken',
        tokenExpirationBuffer: 5
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enableRemote: false
      },
      features: {
        enable2FA: true,
        enableGoogleAuth: true,
        enableBiometrics: false,
        enableOfflineMode: false
      },
      services: {
        google: {
          clientId: '',
          redirectUri: ''
        }
      },
      ui: {
        theme: 'auto',
        language: 'en',
        dateFormat: 'MM/dd/yyyy',
        currency: 'USD'
      },
      performance: {
        enableServiceWorker: false,
        enablePreloading: true,
        lazyLoadThreshold: 100
      },
      security: {
        enableCSP: true,
        enableHSTS: false,
        sessionTimeout: 60
      }
    };
  }
}

/**
 * 🔄 Environment Merger
 * Merges environment configurations with defaults
 */
export class EnvironmentMerger {
  static merge(target: any, source: any): Environment {
    return this.deepMerge(target, source);
  }

  private static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}