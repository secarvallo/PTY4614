/**
 * 🛡️ Rate Limiting Service - Security Enhancement
 * Implements login attempt limits and account lockout for brute force protection
 */

import { query } from '../config/lunglife_db';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  message?: string;
}

export class RateLimitService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;

  /**
   * Check if login attempt is allowed for given email
   */
  static async checkLoginAttempt(email: string): Promise<RateLimitResult> {
    try {
      // Get user login attempt data
      const result = await query(
        'SELECT failed_login_attempts, locked_until, is_active FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        // User doesn't exist, but we don't want to reveal this
        return { allowed: true };
      }

      const user = result.rows[0];

      // Check if account is already locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
          allowed: false,
          lockoutUntil: new Date(user.locked_until),
          message: `Account is temporarily locked due to too many failed attempts. Try again after ${user.locked_until}`
        };
      }

      // Check if account is deactivated
      if (!user.is_active) {
        return {
          allowed: false,
          message: 'Account is deactivated. Please contact support.'
        };
      }

      const remainingAttempts = this.MAX_LOGIN_ATTEMPTS - (user.failed_login_attempts || 0);

      return {
        allowed: remainingAttempts > 0,
        remainingAttempts: Math.max(0, remainingAttempts),
        message: remainingAttempts <= 3 ? `Warning: ${remainingAttempts} login attempts remaining` : undefined
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow login on error to avoid blocking legitimate users
      return { allowed: true };
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedAttempt(email: string): Promise<void> {
    try {
      const result = await query(
        'SELECT failed_login_attempts FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) return;

      const currentAttempts = result.rows[0].failed_login_attempts || 0;
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        // Lock the account
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3',
          [newAttempts, lockoutUntil, email.toLowerCase()]
        );

        console.log(`🔒 Account locked for ${email} due to ${newAttempts} failed attempts`);
      } else {
        // Just increment attempts
        await query(
          'UPDATE users SET failed_login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
          [newAttempts, email.toLowerCase()]
        );
      }

    } catch (error) {
      console.error('Failed to record login attempt:', error);
    }
  }

  /**
   * Reset failed attempts on successful login
   */
  static async resetFailedAttempts(email: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = $1',
        [email.toLowerCase()]
      );
    } catch (error) {
      console.error('Failed to reset login attempts:', error);
    }
  }

  /**
   * Check if account is currently locked
   */
  static async isAccountLocked(email: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT locked_until FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) return false;

      const lockedUntil = result.rows[0].locked_until;
      return lockedUntil && new Date(lockedUntil) > new Date();

    } catch (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
  }

  /**
   * Get remaining lockout time in minutes
   */
  static async getRemainingLockoutTime(email: string): Promise<number | null> {
    try {
      const result = await query(
        'SELECT locked_until FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) return null;

      const lockedUntil = result.rows[0].locked_until;
      if (!lockedUntil) return null;

      const lockoutTime = new Date(lockedUntil);
      const now = new Date();

      if (lockoutTime <= now) return null;

      return Math.ceil((lockoutTime.getTime() - now.getTime()) / (1000 * 60));

    } catch (error) {
      console.error('Failed to get remaining lockout time:', error);
      return null;
    }
  }
}