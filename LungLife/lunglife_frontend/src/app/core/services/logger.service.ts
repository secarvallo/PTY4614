import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  createChild(name: string) {
    return new ChildLogger(name);
  }

  info(message: string, ...args: any[]) {
    console.log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  apiRequest(method: string, url: string, duration?: number): void {
    if (duration !== undefined) {
      this.info(`API ${method} ${url} completed in ${duration}ms`);
    } else {
      this.info(`API ${method} ${url} started`);
    }
  }
}

class ChildLogger {
  constructor(private name: string) {}

  info(message: string, ...args: any[]) {
    console.log(`[INFO][${this.name}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[WARN][${this.name}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[ERROR][${this.name}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    console.debug(`[DEBUG][${this.name}] ${message}`, ...args);
  }
}