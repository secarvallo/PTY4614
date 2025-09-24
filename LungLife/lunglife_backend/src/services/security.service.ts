/**
 * 🔒 Security Service - Password & Data Validation
 * Handles password hashing, validation, and data sanitization
 */

import bcrypt from 'bcrypt';
import validator from 'validator';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export interface SanitizedUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class SecurityService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be less than ${this.MAX_PASSWORD_LENGTH} characters long`);
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    // Calculate strength
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (password.length >= 12 && errors.length === 0) {
      strength = 'strong';
    } else if (password.length >= 10 && errors.length <= 2) {
      strength = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Sanitize and validate user input data
   */
  static sanitizeUserData(data: any): { isValid: boolean; data?: SanitizedUserData; errors: string[] } {
    const errors: string[] = [];

    // Validate and sanitize email
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Email is required');
    } else {
      const email = validator.trim(data.email).toLowerCase();
      if (!validator.isEmail(email)) {
        errors.push('Invalid email format');
      }
      if (email.length > 255) {
        errors.push('Email is too long');
      }
      data.email = email;
    }

    // Validate and sanitize firstName
    if (!data.firstName || typeof data.firstName !== 'string') {
      errors.push('First name is required');
    } else {
      const firstName = validator.trim(data.firstName);
      if (firstName.length < 2) {
        errors.push('First name must be at least 2 characters long');
      }
      if (firstName.length > 50) {
        errors.push('First name is too long');
      }
      if (!/^[a-zA-Z\s\-']+$/.test(firstName)) {
        errors.push('First name contains invalid characters');
      }
      data.firstName = firstName;
    }

    // Validate and sanitize lastName
    if (!data.lastName || typeof data.lastName !== 'string') {
      errors.push('Last name is required');
    } else {
      const lastName = validator.trim(data.lastName);
      if (lastName.length < 2) {
        errors.push('Last name must be at least 2 characters long');
      }
      if (lastName.length > 50) {
        errors.push('Last name is too long');
      }
      if (!/^[a-zA-Z\s\-']+$/.test(lastName)) {
        errors.push('Last name contains invalid characters');
      }
      data.lastName = lastName;
    }

    // Validate and sanitize phone (optional)
    if (data.phone) {
      const phone = validator.trim(data.phone);
      if (!validator.isMobilePhone(phone, 'any')) {
        errors.push('Invalid phone number format');
      }
      data.phone = phone;
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      },
      errors: []
    };
  }

  /**
   * Sanitize general input data
   */
  static sanitizeInput(input: string, options?: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  }): string {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = validator.trim(input);

    // Remove HTML tags if not allowed
    if (!options?.allowHtml) {
      sanitized = validator.stripLow(sanitized);
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Limit length
    if (options?.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove special characters if not allowed
    if (!options?.allowSpecialChars) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.]/g, '');
    }

    return sanitized;
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return require('crypto').randomBytes(length).toString('hex');
  }

  /**
   * Check if string contains SQL injection patterns
   */
  static hasSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\%27)|(\%23))/i,
      /(<script|javascript:|vbscript:|onload=|onerror=)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limit check for general operations (simplified version)
   */
  static checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    // Simple in-memory rate limiting (for production, use Redis)
    const key = `rate_limit_${identifier}`;
    const now = Date.now();

    // Use a simple object to store rate limit data
    const rateLimitData = (global as any)[key];

    if (!rateLimitData) {
      (global as any)[key] = { count: 1, resetTime: now + windowMs };
      return true;
    }

    if (now > rateLimitData.resetTime) {
      (global as any)[key] = { count: 1, resetTime: now + windowMs };
      return true;
    }

    if (rateLimitData.count >= maxRequests) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }
}