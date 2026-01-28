/**
 * Logger Service Interface
 * Servicio de logging para la aplicación
 */

export interface ILogger {
  info(message: string, ...args: any[]): void;
  error(message: string, error?: any): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export class Logger implements ILogger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`, error || '');
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.context}] ${message}`);
    }
  }
}