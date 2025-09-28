import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  apiUrl: 'https://api.lunglife.com/api', // Production API URL

  // Authentication Configuration
  auth: {
    tokenKey: 'lunglife_access_token',
    refreshTokenKey: 'lunglife_refresh_token',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireEmailVerification: true,
    require2FA: true, // More strict in production
  },

  // Security Configuration
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    allowPasswordHistory: 5,
  },

  // Firebase Configuration
  firebase: {
    apiKey: "AIzaSYAJROwD7XrJ5bNTTptR4n1_5krXV76VvHs",
    authDomain: "lunglife-5eb21.firebaseapp.com",
    projectId: "lunglife-5eb21",
    storageBucket: "lunglife-5eb21.appspot.com",
    messagingSenderId: "165143449497",
    appId: "1:165143449497:web:your_web_app_id",
    measurementId: "G-MEASUREMENT_ID"
  },

  // Feature Flags
  features: {
    enableGoogleAuth: true,
    enableMicrosoftAuth: false,
    enable2FA: true,
    enableEmailVerification: true,
    enablePasswordRecovery: true,
    enableDeviceTracking: true,
    enableSecurityLogging: true
  },

  // Development Configuration
  dev: {
    enableDebugMode: false,
    showAuthStateInUI: false,
    mockBackendDelay: 0,
    enableConsoleLogging: false
  }
};
