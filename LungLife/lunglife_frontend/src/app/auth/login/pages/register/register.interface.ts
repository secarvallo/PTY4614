/**
 * 📝 Register Page Interfaces
 * Interfaces específicas para el componente de registro de usuario
 */

// ========== SECURITY INTERFACES ==========

/**
 * Resultado de validación de seguridad de contraseña
 */
export interface PasswordSecurityResult {
  isSecure: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  breachStatus: {
    isBreached: boolean;
    count?: number;
  };
  recommendations?: {
    message: string;
    severity?: 'info' | 'warning' | 'error';
  }[];
  entropyScore?: number;
}

/**
 * Resultado de validación de seguridad general
 */
export interface SecurityValidationResult {
  allowed: boolean;
  requiresAdditionalVerification?: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
}

/**
 * Configuración de validación de contraseña
 */
export interface PasswordValidationConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialCharsPattern: RegExp;
}

// ========== FORM INTERFACES ==========

/**
 * Datos del formulario de registro
 */
export interface RegisterFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

/**
 * Datos sanitizados para envío a API
 */
export interface RegisterRequestData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptMarketing: boolean;
}

/**
 * Errores de validación del formulario
 */
export interface RegisterFormErrors {
  nombre?: string[];
  apellido?: string[];
  email?: string[];
  telefono?: string[];
  password?: string[];
  confirmPassword?: string[];
  acceptTerms?: string[];
  acceptPrivacy?: string[];
  general?: string[];
}

// ========== PASSWORD STRENGTH INTERFACES ==========

/**
 * Verificaciones individuales de contraseña
 */
export interface PasswordChecks {
  minLength: boolean;
  maxLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/**
 * Resultado completo de análisis de fortaleza de contraseña
 */
export interface PasswordStrengthResult {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  checks: PasswordChecks;
  isValid: boolean;
}

/**
 * Estado visual del indicador de seguridad
 */
export interface PasswordSecurityStatus {
  show: boolean;
  color: string;
  level: string;
  cssClass: string;
}

// ========== COMPONENT STATE INTERFACES ==========

/**
 * Estado principal del componente register
 */
export interface RegisterComponentState {
  showPassword: boolean;
  showConfirmPassword: boolean;
  loading: boolean;
  error: string | null;
  isRateLimited: boolean;
  breachCheckInProgress: boolean;
  securityWarnings: string[];
  passwordSecurityResult: PasswordSecurityResult | null;
  securityValidationResult: SecurityValidationResult | null;
}

/**
 * Configuración de mensajes del componente
 */
export interface RegisterMessages {
  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    passwordMismatch: string;
    phoneFormat: string;
    blockedDomain: string;
    disposableEmail: string;
  };
  security: {
    breachWarning: string;
    checkingPassword: string;
    securityBlocked: string;
    rateLimit: string;
  };
  success: {
    accountCreated: string;
    verificationSent: string;
  };
  errors: {
    generalError: string;
    networkError: string;
    serverError: string;
  };
}

// ========== API INTERFACES ==========

/**
 * Respuesta de la API de registro
 */
export interface RegisterApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    userId: string;
    email: string;
    verificationRequired: boolean;
  };
}

/**
 * Configuración de eventos de seguridad
 */
export interface SecurityEvent {
  type: 'info' | 'warning' | 'error' | 'password_breach' | 'registration_attempt';
  action: string;
  details: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// ========== UI CONFIGURATION INTERFACES ==========

/**
 * Configuración completa del componente register
 */
export interface RegisterComponentConfig {
  validation: PasswordValidationConfig;
  messages: RegisterMessages;
  security: {
    enableBreachCheck: boolean;
    enableRateLimit: boolean;
    maxAttempts: number;
    rateLimitWindow: number;
    enableSecurityAudit: boolean;
  };
  ui: {
    showPasswordStrength: boolean;
    showSecurityShield: boolean;
    enableAnimations: boolean;
    autoFocusFirstError: boolean;
  };
}

// ========== VALIDATOR INTERFACES ==========

/**
 * Opciones para validadores personalizados
 */
export interface CustomValidatorOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  checkDisposableEmail?: boolean;
  phoneRegion?: string;
}

/**
 * Resultado de validación personalizada
 */
export interface CustomValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}