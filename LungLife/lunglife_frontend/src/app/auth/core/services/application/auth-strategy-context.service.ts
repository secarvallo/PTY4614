import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthStrategy, AuthResult, AuthStrategyContext as IAuthStrategyContext } from '../../interfaces/auth-strategy.interface';
import { LoginStrategy } from '../infrastructure/strategies/login.strategy';
import { RegisterStrategy } from '../infrastructure/strategies/register.strategy';
import { ForgotPasswordStrategy } from '../infrastructure/strategies/forgot-password.strategy';
import { TwoFactorStrategy } from '../infrastructure/strategies/two-factor.strategy';
import { GoogleAuthStrategy } from '../infrastructure/strategies/google-auth.strategy';

/**
 * 🎯 Authentication Strategy Context
 * Manages and executes different authentication strategies
 */
@Injectable({ providedIn: 'root' })
export class AuthStrategyContext implements IAuthStrategyContext {
  availableStrategies: AuthStrategy[] = [];
  currentStrategy?: AuthStrategy;
  lastResult?: AuthResult;

  constructor(
    private loginStrategy: LoginStrategy,
    private registerStrategy: RegisterStrategy,
    private forgotPasswordStrategy: ForgotPasswordStrategy,
    private twoFactorStrategy: TwoFactorStrategy,
    private googleAuthStrategy: GoogleAuthStrategy
  ) {
    this.initializeStrategies();
  }

  /**
   * Initialize all available authentication strategies
   */
  private initializeStrategies(): void {
    this.availableStrategies = [
      this.loginStrategy,
      this.registerStrategy,
      this.forgotPasswordStrategy,
      this.twoFactorStrategy,
      this.googleAuthStrategy
    ];
  }

  /**
   * Execute authentication using the appropriate strategy
   * @param strategyName The name of the strategy to use
   * @param data The authentication data
   * @returns Observable with authentication result
   */
  executeStrategy(strategyName: string, data: any): Observable<AuthResult> {
    const strategy = this.availableStrategies.find(s => s.getStrategyName() === strategyName);

    if (!strategy) {
      throw new Error(`Authentication strategy '${strategyName}' not found`);
    }

    if (!strategy.canHandle(data)) {
      throw new Error(`Strategy '${strategyName}' cannot handle the provided data`);
    }

    this.currentStrategy = strategy;
    return strategy.execute(data);
  }

  /**
   * Auto-detect and execute the appropriate strategy based on data
   * @param data The authentication data
   * @returns Observable with authentication result
   */
  executeAuto(data: any): Observable<AuthResult> {
    const strategy = this.availableStrategies.find(s => s.canHandle(data));

    if (!strategy) {
      throw new Error('No authentication strategy can handle the provided data');
    }

    this.currentStrategy = strategy;
    return strategy.execute(data);
  }

  /**
   * Get all available strategy names
   * @returns Array of strategy names
   */
  getAvailableStrategies(): string[] {
    return this.availableStrategies.map(s => s.getStrategyName());
  }

  /**
   * Check if a strategy is available
   * @param strategyName The strategy name to check
   * @returns True if strategy exists
   */
  hasStrategy(strategyName: string): boolean {
    return this.availableStrategies.some(s => s.getStrategyName() === strategyName);
  }

  /**
   * Get strategy by name
   * @param strategyName The strategy name
   * @returns The strategy instance or undefined
   */
  getStrategy(strategyName: string): AuthStrategy | undefined {
    return this.availableStrategies.find(s => s.getStrategyName() === strategyName);
  }

  /**
   * Get Google OAuth URL (convenience method)
   * @returns Google authentication URL
   */
  getGoogleAuthUrl(): string {
    const googleStrategy = this.getStrategy('google-auth') as GoogleAuthStrategy;
    return googleStrategy?.getGoogleAuthUrl() || '';
  }
}