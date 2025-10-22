export interface Environment {
  production: boolean;
  apiUrl: string;
  [key: string]: any;
}

export const ENVIRONMENT = 'ENVIRONMENT';