import { Observable } from 'rxjs';

/**
 * 🔐 Base Strategy Interface for Authentication Flows
 * Defines the contract that all authentication strategies must implement
 */
export interface AuthStrategy {
  /**
   * Execute the authentication strategy
   * @param data The input data for the strategy
   * @returns Observable with the result of the authentication attempt
   */
  execute(data: any): Observable<AuthResult>;

  /**
   * Get the name of the strategy
   * @returns The strategy name
   */
  getStrategyName(): string;

  /**
   * Check if this strategy can handle the given data
   * @param data The input data to validate
   * @returns True if the strategy can handle the data
   */
  canHandle(data: any): boolean;
}

/**
 * 📊 Authentication Result Interface
 * Standardizes the response format for all authentication operations
 */
export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  refreshToken?: string;
  requiresTwoFA?: boolean;
  sessionId?: string;
  error?: string;
  // 2FA setup optional payload (used by simplified facade)
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
  metadata?: {
    strategy: string;
    timestamp: Date;
    duration?: number;
  };
}

/**
 * 🎯 Strategy Context for managing different authentication flows
 */
export interface AuthStrategyContext {
  currentStrategy?: AuthStrategy;
  availableStrategies: AuthStrategy[];
  lastResult?: AuthResult;
}
