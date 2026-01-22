/**
 * ⚙️ Configuration Management
 * Type-safe configuration with validation
 */

import { AppConfig, DatabaseConfig, JWTConfig, SecurityConfig, EmailConfig } from '../interfaces/config.interface';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration validation schemas
const databaseSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  database: z.string().default('LungLife'),
  user: z.string().default('postgres'),
  password: z.string().default('336911'),
  maxConnections: z.number().default(20),
  idleTimeoutMillis: z.number().default(30000),
  connectionTimeoutMillis: z.number().default(2000),
  retryAttempts: z.number().default(5),
  retryDelay: z.number().default(1000),
});

const jwtSchema = z.object({
  accessTokenSecret: z.string().default('lunglife_jwt_secret'),
  refreshTokenSecret: z.string().default('lunglife_refresh_secret'),
  accessTokenExpiry: z.string().default('15m'),
  refreshTokenExpiry: z.string().default('7d'),
  issuer: z.string().default('LungLife-API'),
  audience: z.string().default('LungLife-Web'),
});

const securitySchema = z.object({
  bcryptRounds: z.number().default(12),
  rateLimitMaxAttempts: z.number().default(5),
  rateLimitWindowMs: z.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitLockoutMs: z.number().default(2 * 60 * 60 * 1000), // 2 hours
  passwordMinLength: z.number().default(8),
  passwordRequireUppercase: z.boolean().default(true),
  passwordRequireLowercase: z.boolean().default(true),
  passwordRequireNumbers: z.boolean().default(true),
  passwordRequireSymbols: z.boolean().default(false),
});

const emailSchema = z.object({
  host: z.string().default('smtp.gmail.com'),
  port: z.number().default(587),
  secure: z.boolean().default(false),
  user: z.string().default(''),
  password: z.string().default(''),
  from: z.string().default('noreply@lunglife.com'),
  templates: z.object({
    welcome: z.string().default('welcome.html'),
    passwordReset: z.string().default('password-reset.html'),
    twoFAEnabled: z.string().default('2fa-enabled.html'),
  }),
});

const appSchema = z.object({
  port: z.number().default(3000),
  environment: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.array(z.string()).default(['http://localhost:8100', 'http://localhost:4200']),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  database: databaseSchema,
  jwt: jwtSchema,
  security: securitySchema,
  email: emailSchema,
});

/**
 * Configuration Manager
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration
   */
  private loadConfiguration(): AppConfig {
    try {
      const rawConfig = {
        port: parseInt(process.env.PORT || '3002'),
        environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:8100', 'http://localhost:4200'],
        logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',

        database: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'lunglife_db',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '336911',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
          connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
          retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '5'),
          retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
        },

        jwt: {
          accessTokenSecret: process.env.JWT_SECRET || 'lunglife_jwt_secret',
          refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'lunglife_refresh_secret',
          accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
          refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
          issuer: process.env.JWT_ISSUER || 'LungLife-API',
          audience: process.env.JWT_AUDIENCE || 'LungLife-Web',
        },

        security: {
          bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
          rateLimitMaxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
          rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000).toString()),
          rateLimitLockoutMs: parseInt(process.env.RATE_LIMIT_LOCKOUT_MS || (2 * 60 * 60 * 1000).toString()),
          passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
          passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
          passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
          passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
          passwordRequireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
        },

        email: {
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          user: process.env.EMAIL_USER || '',
          password: process.env.EMAIL_PASSWORD || '',
          from: process.env.EMAIL_FROM || 'noreply@lunglife.com',
          templates: {
            welcome: process.env.EMAIL_TEMPLATE_WELCOME || 'welcome.html',
            passwordReset: process.env.EMAIL_TEMPLATE_PASSWORD_RESET || 'password-reset.html',
            twoFAEnabled: process.env.EMAIL_TEMPLATE_2FA_ENABLED || '2fa-enabled.html',
          },
        },
      };

      // Validate configuration
      const validatedConfig = appSchema.parse(rawConfig);

      console.log('✅ Configuration loaded and validated successfully');
      return validatedConfig;

    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw new Error('Invalid configuration');
    }
  }

  /**
   * Get the complete configuration
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  /**
   * Get JWT configuration
   */
  getJWTConfig(): JWTConfig {
    return this.config.jwt;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  /**
   * Get email configuration
   */
  getEmailConfig(): EmailConfig {
    return this.config.email;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Check if running in test
   */
  isTest(): boolean {
    return this.config.environment === 'test';
  }
}

// Global configuration instance
export const config = ConfigManager.getInstance();