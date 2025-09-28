import { Injectable, Inject } from '@angular/core';
import { Environment, ENVIRONMENT, EnvironmentValidator, EnvironmentMerger } from './environment.interface';
import { LoggerService } from '../services/logger.service';

/**
 * ⚙️ Environment Service
 * Manages environment configuration with validation and type safety
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private _config: Environment;

  constructor(
    @Inject(ENVIRONMENT) private rawConfig: any,
    private logger: LoggerService
  ) {
    this._config = this.initializeConfig(rawConfig);
    this.logger.info('🌍 Environment initialized', {
      name: this._config.name,
      production: this._config.production
    });
  }

  /**
   * Get the complete environment configuration
   */
  get config(): Environment {
    return this._config;
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this._config.production;
  }

  /**
   * Get environment name
   */
  get environmentName(): string {
    return this._config.name;
  }

  /**
   * Get API base URL
   */
  get apiBaseUrl(): string {
    return this._config.api.baseUrl;
  }

  /**
   * Get API timeout
   */
  get apiTimeout(): number {
    return this._config.api.timeout;
  }

  /**
   * Get API retry attempts
   */
  get apiRetryAttempts(): number {
    return this._config.api.retryAttempts;
  }

  /**
   * Get auth token key
   */
  get authTokenKey(): string {
    return this._config.auth.tokenKey;
  }

  /**
   * Get refresh token key
   */
  get refreshTokenKey(): string {
    return this._config.auth.refreshTokenKey;
  }

  /**
   * Get token expiration buffer
   */
  get tokenExpirationBuffer(): number {
    return this._config.auth.tokenExpirationBuffer;
  }

  /**
   * Get logging level
   */
  get logLevel(): string {
    return this._config.logging.level;
  }

  /**
   * Check if console logging is enabled
   */
  get enableConsoleLogging(): boolean {
    return this._config.logging.enableConsole;
  }

  /**
   * Check if remote logging is enabled
   */
  get enableRemoteLogging(): boolean {
    return this._config.logging.enableRemote;
  }

  /**
   * Get remote logging endpoint
   */
  get remoteLoggingEndpoint(): string | undefined {
    return this._config.logging.remoteEndpoint;
  }

  /**
   * Check if 2FA is enabled
   */
  get enable2FA(): boolean {
    return this._config.features.enable2FA;
  }

  /**
   * Check if Google Auth is enabled
   */
  get enableGoogleAuth(): boolean {
    return this._config.features.enableGoogleAuth;
  }

  /**
   * Check if biometrics is enabled
   */
  get enableBiometrics(): boolean {
    return this._config.features.enableBiometrics;
  }

  /**
   * Check if offline mode is enabled
   */
  get enableOfflineMode(): boolean {
    return this._config.features.enableOfflineMode;
  }

  /**
   * Get Google client ID
   */
  get googleClientId(): string {
    return this._config.services.google.clientId;
  }

  /**
   * Get Google redirect URI
   */
  get googleRedirectUri(): string {
    return this._config.services.google.redirectUri;
  }

  /**
   * Get UI theme
   */
  get uiTheme(): string {
    return this._config.ui.theme;
  }

  /**
   * Get UI language
   */
  get uiLanguage(): string {
    return this._config.ui.language;
  }

  /**
   * Get date format
   */
  get dateFormat(): string {
    return this._config.ui.dateFormat;
  }

  /**
   * Get currency
   */
  get currency(): string {
    return this._config.ui.currency;
  }

  /**
   * Check if service worker is enabled
   */
  get enableServiceWorker(): boolean {
    return this._config.performance.enableServiceWorker;
  }

  /**
   * Check if preloading is enabled
   */
  get enablePreloading(): boolean {
    return this._config.performance.enablePreloading;
  }

  /**
   * Get lazy load threshold
   */
  get lazyLoadThreshold(): number {
    return this._config.performance.lazyLoadThreshold;
  }

  /**
   * Check if CSP is enabled
   */
  get enableCSP(): boolean {
    return this._config.security.enableCSP;
  }

  /**
   * Check if HSTS is enabled
   */
  get enableHSTS(): boolean {
    return this._config.security.enableHSTS;
  }

  /**
   * Get session timeout
   */
  get sessionTimeout(): number {
    return this._config.security.sessionTimeout;
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string): T | undefined {
    return this.getNestedValue(this._config, path);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof Environment['features']): boolean {
    return this._config.features[feature];
  }

  /**
   * Get full API URL for a path
   */
  getApiUrl(path: string): string {
    const baseUrl = this.apiBaseUrl.endsWith('/') ? this.apiBaseUrl.slice(0, -1) : this.apiBaseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  private initializeConfig(rawConfig: any): Environment {
    try {
      // Merge with defaults
      const mergedConfig = EnvironmentMerger.merge(EnvironmentValidator.getDefaults(), rawConfig);

      // Validate configuration
      const validatedConfig = EnvironmentValidator.validate(mergedConfig);

      this.logger.info('✅ Environment configuration validated successfully');
      return validatedConfig;
    } catch (error) {
      this.logger.fatal('❌ Environment configuration validation failed', error);
      throw error;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}