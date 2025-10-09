// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://URL de producción.com/api', // URL de producción
  appName: 'MVP Authentication',
  appVersion: '1.0.0',
  enableDebug: false,
  logLevel: 'error',
  features: {
    auth: true,
    registration: true,
    profile: false
  }
};
