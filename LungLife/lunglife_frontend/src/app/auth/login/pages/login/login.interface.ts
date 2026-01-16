/**
 * Login Page Interfaces
 * 
 * Interfaces específicas para el componente de login, incluyendo:
 * - Formularios de autenticación
 * - Estado del componente
 * - 2FA y validaciones
 * - Rate limiting
 * - Respuestas de API
 */

import { FormGroup } from '@angular/forms';
import { WritableSignal, Signal } from '@angular/core';

/**
 * Datos del formulario de login
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Datos del formulario de verificación 2FA
 */
export interface TwoFactorFormData {
  code: string;
}

/**
 * Request para verificación 2FA con soporte para códigos de respaldo
 */
export interface TwoFactorVerificationRequest {
  code: string;
  isBackupCode?: boolean;
}

/**
 * Respuesta de autenticación con 2FA
 */
export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
  requiresTwoFactor?: boolean;
  requiresTwoFA?: boolean;
}

/**
 * Estado de signals para el componente de login
 */
export interface LoginComponentState {
  loading: WritableSignal<boolean>;
  showPassword: WritableSignal<boolean>;
  requiresTwoFactor: WritableSignal<boolean>;
  showBackupCodeInput: WritableSignal<boolean>;
  backupCode: WritableSignal<string>;
  error: WritableSignal<string | null>;
}

/**
 * Estado de rate limiting para login
 */
export interface LoginRateLimitState {
  loginAttempts: WritableSignal<number>;
  lastLoginAttempt: WritableSignal<number>;
  isLoginRateLimited: WritableSignal<boolean>;
}

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  maxLoginAttempts: number;
  loginCooldownMs: number;
  loginAttemptWindowMs: number;
}

/**
 * Computed signals derivados
 */
export interface LoginComputedState {
  isFormValid: Signal<boolean>;
  canSubmit: Signal<boolean>;
}

/**
 * Conjunto completo de formularios del componente
 */
export interface LoginForms {
  loginForm: FormGroup<{
    email: any;
    password: any;
    rememberMe: any;
  }>;
  twoFactorForm: FormGroup<{
    code: any;
  }>;
}

/**
 * Parámetros de navegación y redirección
 */
export interface LoginNavigationState {
  returnUrl: string;
}

/**
 * Estado completo del componente de login
 */
export interface LoginPageState extends 
  LoginComponentState, 
  LoginRateLimitState, 
  LoginComputedState, 
  LoginNavigationState {
  forms: LoginForms;
}

/**
 * Configuración de alertas
 */
export interface AlertConfig {
  header: string;
  message: string;
  buttons?: string[];
  cssClass?: string;
}

/**
 * Resultados de operaciones de login
 */
export interface LoginOperationResult {
  success: boolean;
  error?: string;
  requiresRedirect?: boolean;
  redirectUrl?: string;
}

/**
 * Datos para persistencia de rate limiting
 */
export interface RateLimitStorage {
  attempts: string | null;
  lastAttempt: string | null;
}

/**
 * Configuración de autenticación social
 */
export interface SocialAuthConfig {
  providers: ('google' | 'apple')[];
  enabled: boolean;
}

/**
 * Estado de autenticación observable
 */
export interface AuthObservableState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
  requiresTwoFA: boolean;
}

/**
 * Evento de auditoría de seguridad
 */
export interface SecurityAuditEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'rate_limit_triggered' | '2fa_attempt' | '2fa_success' | '2fa_failure';
  timestamp: number;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Configuración de loading
 */
export interface LoadingConfig {
  message: string;
  spinner: 'lines' | 'dots' | 'crescent' | 'bubbles';
  duration?: number;
}

/**
 * Datos sanitizados de entrada
 */
export interface SanitizedLoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Resultado de validación de formulario
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  touchedFields: string[];
}

/**
 * Configuración de timeouts y reintentos
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

/**
 * Estado de redirección diferida
 */
export interface DeferredRedirectState {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  targetUrl: string;
}