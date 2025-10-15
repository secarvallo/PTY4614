/**
 * Central Configuration Interfaces
 * Single source of truth for all configuration-related type definitions
 * Eliminates redundancy and ensures consistency across the application
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  rateLimitMaxAttempts: number;
  rateLimitWindowMs: number;
  rateLimitLockoutMs: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  templates: {
    welcome: string;
    passwordReset: string;
    twoFAEnabled: string;
  };
}

export interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  corsOrigins: string[];
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  database: DatabaseConfig;
  jwt: JWTConfig;
  security: SecurityConfig;
  email: EmailConfig;
}