// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',

  // Authentication Configuration
  auth: {
    tokenKey: 'lunglife_access_token',
    refreshTokenKey: 'lunglife_refresh_token',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    requireEmailVerification: true,
    require2FA: false, // Can be enabled per user
  },

  // Security Configuration
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    allowPasswordHistory: 5, // Prevent reuse of last 5 passwords
  },

  // Firebase Configuration (for future Google Auth integration)
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
    enableSecurityLogging: true,
  },

  // Development Settings
  dev: {
    enableDebugMode: true,
    showAuthStateInUI: true,
    mockBackendDelay: 1000, // Simulate network delay
    enableConsoleLogging: true,
  }
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
