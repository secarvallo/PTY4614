import { Injectable } from '@angular/core';

/**
 * 📊 Log Levels
 * Defines the severity levels for logging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * 📋 Log Entry Interface
 * Structure for log entries
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
}

/**
 * 🎯 Logger Output Interface
 * Contract for log output implementations
 */
export interface LoggerOutput {
  write(entry: LogEntry): void;
}

/**
 * 🖥️ Console Logger Output
 * Logs to browser console
 */
@Injectable({ providedIn: 'root' })
export class ConsoleLoggerOutput implements LoggerOutput {
  write(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';

    const message = `${timestamp} ${levelName} ${context} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.data);
        break;
    }
  }
}

/**
 * 🔧 Logger Service
 * Central logging service with multiple outputs and filtering
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private outputs: LoggerOutput[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private context?: string;

  constructor(private consoleOutput: ConsoleLoggerOutput) {
    this.addOutput(consoleOutput);
    this.setContextFromEnvironment();
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Set logging context
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Add a logger output
   */
  addOutput(output: LoggerOutput): void {
    this.outputs.push(output);
  }

  /**
   * Remove a logger output
   */
  removeOutput(output: LoggerOutput): void {
    const index = this.outputs.indexOf(output);
    if (index > -1) {
      this.outputs.splice(index, 1);
    }
  }

  /**
   * Create a child logger with specific context
   */
  createChild(context: string): LoggerService {
    const childLogger = new LoggerService(this.consoleOutput);
    childLogger.setContext(context);
    childLogger.setMinLevel(this.minLevel);
    this.outputs.forEach(output => childLogger.addOutput(output));
    return childLogger;
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: any): void {
    this.log(LogLevel.FATAL, message, error);
  }

  /**
   * Log performance timing
   */
  timing(operation: string, duration: number, data?: any): void {
    this.info(`⏱️ ${operation} completed in ${duration}ms`, data);
  }

  /**
   * Log user action
   */
  userAction(action: string, data?: any): void {
    this.info(`👤 User Action: ${action}`, data);
  }

  /**
   * Log API request
   */
  apiRequest(method: string, url: string, duration?: number): void {
    const durationInfo = duration ? ` (${duration}ms)` : '';
    this.info(`🌐 API ${method} ${url}${durationInfo}`);
  }

  /**
   * Log authentication event
   */
  authEvent(event: string, data?: any): void {
    this.info(`🔐 Auth: ${event}`, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      data,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    this.outputs.forEach(output => {
      try {
        output.write(entry);
      } catch (error) {
        // Prevent logging errors from breaking the application
        console.error('Logger output error:', error);
      }
    });
  }

  private setContextFromEnvironment(): void {
    if (typeof window !== 'undefined') {
      this.context = 'LungLife-Web';
    } else {
      this.context = 'LungLife-Server';
    }
  }
}