/**
 * 🔑 Password Recovery Controller - Strategy Pattern Implementation
 * Handles forgot password and reset password functionality for LungLife frontend
 */

import { Request, Response } from 'express';
import { query } from '../config/lunglife_db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { Injectable } from '../core/di/container';

interface PasswordRequest extends Request {
  body: {
    email?: string;
    token?: string;
    newPassword?: string;
  };
}

@Injectable()
export class PasswordController {

  /**
   * 📧 Request password reset - Compatible with ForgotStrategy
   */
  async forgotPassword(req: PasswordRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          errorCode: 'MISSING_EMAIL'
        });
        return;
      }

      // Check if user exists
      const userResult = await query(
        'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists (security best practice)
        res.json({
          success: true,
          message: 'If the email exists, a recovery link has been sent'
        });
        return;
      }

      const user = userResult.rows[0];

      // Generate reset token
      const resetToken = uuidv4().replace(/-/g, '');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour

      // Store reset token
      await query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, expiresAt, user.id]
      );

      // Send email (simulated for development)
      await this.sendResetEmail(user.email, user.first_name, resetToken);

      res.json({
        success: true,
        message: 'Password recovery email sent successfully'
      });

    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password recovery'
      });
    }
  }

  /**
   * 🔄 Reset password with token
   */
  async resetPassword(req: PasswordRequest, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required',
          errorCode: 'MISSING_DATA'
        });
        return;
      }

      // Validate password strength (basic validation)
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
          errorCode: 'WEAK_PASSWORD'
        });
        return;
      }

      // Find user by reset token
      const userResult = await query(
        'SELECT id, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP',
        [token]
      );

      if (userResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
          errorCode: 'INVALID_TOKEN'
        });
        return;
      }

      const user = userResult.rows[0];

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, user.id]
      );

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  }

  /**
   * 📧 Send password reset email (simulated for development)
   */
  private async sendResetEmail(email: string, firstName: string, token: string): Promise<void> {
    try {
      // In development, just log the reset link
      const resetLink = `http://localhost:8100/auth/reset-password?token=${token}`;

      console.log('📧 PASSWORD RESET EMAIL (SIMULATED)');
      console.log(`To: ${email}`);
      console.log(`Name: ${firstName}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log(`Token: ${token}`);
      console.log('📧 Email would be sent in production with Nodemailer');

      // In production, use actual email service:
      // const transporter = nodemailer.createTransporter(/* config */);
      // await transporter.sendMail(/* email content */);

    } catch (error: any) {
      console.error('Email send error:', error);
    }
  }

  /**
   * 📧 Verify email with token
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
        return;
      }

      // Find verification record
      const verificationResult = await query(
        'SELECT user_id, email FROM email_verifications WHERE verification_token = $1 AND expires_at > CURRENT_TIMESTAMP AND verified = false',
        [token]
      );

      if (verificationResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
        return;
      }

      const verification = verificationResult.rows[0];

      // Mark email as verified
      await query(
        'UPDATE users SET is_email_verified = true WHERE id = $1',
        [verification.user_id]
      );

      await query(
        'UPDATE email_verifications SET verified = true, verified_at = CURRENT_TIMESTAMP WHERE verification_token = $1',
        [token]
      );

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  /**
   * 🔑 Generate backup codes for 2FA recovery
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Generate 8-character backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
