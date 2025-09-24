/**
 * 📧 Email Service
 * Handles email sending operations using nodemailer
 */

import nodemailer from 'nodemailer';
import { Injectable } from '../core/di/container';
import { IEmailService, EmailOptions, EmailTemplate } from '../core/interfaces/index';
import { config } from '../core/config/config';

@Injectable()
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = this.createTransporter();
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || config.getEmailConfig().from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);

    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send email using template
   */
  async sendTemplatedEmail(
    to: string,
    template: EmailTemplate,
    templateData: any
  ): Promise<void> {
    try {
      const htmlContent = this.renderTemplate(template, templateData);
      const subject = this.getTemplateSubject(template, templateData);

      await this.sendEmail({
        to,
        subject,
        html: htmlContent,
      });

    } catch (error) {
      console.error('Failed to send templated email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    await this.sendTemplatedEmail(email, EmailTemplate.WELCOME, { nombre: userName });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    // For now, create a basic reset URL - in production this would be configurable
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
    await this.sendTemplatedEmail(email, EmailTemplate.PASSWORD_RESET, {
      nombre: 'Usuario', // TODO: Get actual user name
      resetToken,
      resetUrl
    });
  }

  /**
   * Send 2FA enabled notification
   */
  async sendTwoFAEnabledEmail(email: string): Promise<void> {
    await this.sendTemplatedEmail(email, EmailTemplate.TWO_FA_ENABLED, {
      nombre: 'Usuario', // TODO: Get actual user name
      method: 'Aplicación de Autenticación'
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(email: string, verificationData: { nombre: string; verificationToken: string; verificationUrl: string }): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verifica tu correo electrónico</h2>
        <p>Hola ${verificationData.nombre},</p>
        <p>Gracias por registrarte en LungLife. Para completar tu registro, por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationData.verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Verificar Correo Electrónico</a>
        </p>
        <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
        <p>${verificationData.verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
        <p>Si no solicitaste esta verificación, puedes ignorar este mensaje.</p>
        <br>
        <p>Saludos,<br>El equipo de LungLife</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verifica tu correo electrónico - LungLife',
      html: htmlContent,
    });
  }

  /**
   * Send 2FA code via email
   */
  async sendTwoFACode(email: string, codeData: { nombre: string; code: string; expiresIn: string }): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Código de Verificación 2FA</h2>
        <p>Hola ${codeData.nombre},</p>
        <p>Tu código de verificación de dos factores es:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f8f9fa; padding: 15px 30px; border-radius: 5px; letter-spacing: 3px;">${codeData.code}</span>
        </div>
        <p>Este código expirará en ${codeData.expiresIn}.</p>
        <p>Si no solicitaste este código, alguien podría estar intentando acceder a tu cuenta. Por favor, contacta con soporte inmediatamente.</p>
        <br>
        <p>Saludos,<br>El equipo de LungLife</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Tu código de verificación - LungLife',
      html: htmlContent,
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email configuration is working correctly');
      return true;
    } catch (error) {
      console.error('❌ Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): nodemailer.Transporter {
    const emailConfig = config.getEmailConfig();

    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    });
  }

  /**
   * Render email template
   */
  private renderTemplate(template: EmailTemplate, data: any): string {
    // TODO: Implement proper template rendering (EJS, Handlebars, etc.)
    // For now, return basic HTML templates

    switch (template) {
      case EmailTemplate.WELCOME:
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Bienvenido a LungLife!</h2>
            <p>Hola ${data.nombre},</p>
            <p>Gracias por registrarte en LungLife. Tu cuenta ha sido creada exitosamente.</p>
            <p>Ahora puedes acceder a todas las funcionalidades de monitoreo pulmonar y gestión de tu salud.</p>
            <br>
            <p>Saludos,<br>El equipo de LungLife</p>
          </div>
        `;

      case EmailTemplate.PASSWORD_RESET:
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Restablecer Contraseña</h2>
            <p>Hola ${data.nombre},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p>${data.resetUrl}</p>
            <p>Este enlace expirará en 1 hora por razones de seguridad.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            <br>
            <p>Saludos,<br>El equipo de LungLife</p>
          </div>
        `;

      case EmailTemplate.TWO_FA_ENABLED:
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Autenticación de Dos Factores Activada</h2>
            <p>Hola ${data.nombre},</p>
            <p>La autenticación de dos factores ha sido activada exitosamente en tu cuenta de LungLife.</p>
            <p>Método configurado: ${data.method}</p>
            <p>Ahora tu cuenta está mejor protegida. Recuerda mantener segura tu aplicación de autenticación o tus códigos de respaldo.</p>
            <br>
            <p>Saludos,<br>El equipo de LungLife</p>
          </div>
        `;

      default:
        return `<p>Template ${template} not implemented yet.</p>`;
    }
  }

  /**
   * Get template subject
   */
  private getTemplateSubject(template: EmailTemplate, data: any): string {
    switch (template) {
      case EmailTemplate.WELCOME:
        return '¡Bienvenido a LungLife!';
      case EmailTemplate.PASSWORD_RESET:
        return 'Restablecer tu contraseña - LungLife';
      case EmailTemplate.TWO_FA_ENABLED:
        return 'Autenticación 2FA Activada - LungLife';
      default:
        return 'LungLife - Notificación';
    }
  }
}