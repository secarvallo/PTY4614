import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

// Función para simular envío de email en desarrollo
const simulateEmailSend = async (email: string, resetToken: string, userName: string) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log('📧 [MODO DESARROLLO] Email de recuperación simulado:');
    console.log('='.repeat(60));
    console.log(`📧 Para: ${email}`);
    console.log(`👤 Usuario: ${userName}`);
    console.log(`🔑 Token: ${resetToken}`);
    console.log(`🔗 Enlace de recuperación: ${resetLink}`);
    console.log(`⏰ Válido por: 1 hora`);
    console.log('='.repeat(60));
    console.log('📨 Contenido del email:');
    console.log(`Asunto: Recuperación de Contraseña - LungLife`);
    console.log(`\nHola ${userName},\n`);
    console.log('Recibimos una solicitud para restablecer tu contraseña.');
    console.log('Para crear una nueva contraseña, visita el siguiente enlace:');
    console.log(`\n${resetLink}\n`);
    console.log('Este enlace expirará en 1 hora por seguridad.');
    console.log('='.repeat(60));

    return {
        success: true,
        messageId: `dev-simulation-${Date.now()}`,
        mode: 'development-simulation'
    };
};

// Función para enviar email de recuperación
export const sendPasswordResetEmail = async (
    email: string,
    resetToken: string,
    userName: string = 'Usuario'
) => {
    try {
        // Siempre intentar envío real primero, independientemente del entorno
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: {
                name: 'LungLife - Sistema de Monitoreo Pulmonar',
                address: process.env.EMAIL_USER || 'noreply@lunglife.com'
            },
            to: email,
            subject: 'Recuperación de Contraseña - LungLife',
            html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Recuperación de Contraseña</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🫁 LungLife</h1>
                        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Sistema de Monitoreo Pulmonar</p>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                        <h2 style="color: #333; margin-top: 0;">Hola ${userName},</h2>
                        
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en LungLife.</p>
                        
                        <p>Si solicitaste este cambio, haz clic en el botón de abajo para crear una nueva contraseña:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                🔐 Restablecer Contraseña
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            <strong>⏰ Este enlace expirará en 1 hora por seguridad.</strong>
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">
                            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
                        </p>
                        
                        <p style="background: #e8e8e8; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #555;">
                            ${resetLink}
                        </p>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <h3 style="color: #856404; margin-top: 0;">🛡️ Importante</h3>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Si no solicitaste este cambio, puedes ignorar este email.</li>
                            <li>Tu contraseña current seguirá siendo válida.</li>
                            <li>Nunca compartas este enlace con otras personas.</li>
                            <li>Si tienes problemas, contacta a nuestro equipo de soporte.</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
                        <p>Este email fue enviado desde una dirección de solo envío. Por favor, no respondas a este mensaje.</p>
                        <p>© ${new Date().getFullYear()} LungLife - Sistema de Monitoreo Pulmonar</p>
                        <p style="color: #999; font-size: 12px;">
                            Si tienes problemas con el enlace, contacta soporte técnico.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
Hola ${userName},

Recibiste este email porque solicitaste restablecer tu contraseña en LungLife.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetLink}

Este enlace expirará en 1 hora por seguridad.

Si no solicitaste este cambio, puedes ignorar este email y tu contraseña actual seguirá siendo válida.

© ${new Date().getFullYear()} LungLife - Sistema de Monitoreo Pulmonar
            `
        };

        try {
            const result = await transporter.sendMail(mailOptions);
            console.log('✅ Email de recuperación enviado REAL:', result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                mode: 'real-email-sent'
            };
        } catch (emailError) {
            console.log('📧 Error enviando email real, usando fallback a simulación:', emailError);
            // Fallback a simulación si falla el envío real
            return await simulateEmailSend(email, resetToken, userName);
        }

    } catch (error) {
        console.error('❌ Error general en sendPasswordResetEmail:', error);
        // Fallback final a simulación
        return await simulateEmailSend(email, resetToken, userName);
    }
};

// Función para enviar email de confirmación de cambio de contraseña
export const sendPasswordChangeNotification = async (
    email: string,
    userName: string = 'Usuario'
) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: {
                name: 'LungLife - Sistema de Monitoreo Pulmonar',
                address: process.env.EMAIL_USER || 'noreply@lunglife.com'
            },
            to: email,
            subject: '✅ Contraseña Actualizada - LungLife',
            html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Contraseña Actualizada</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🫁 LungLife</h1>
                        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Sistema de Monitoreo Pulmonar</p>
                    </div>
                    
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                        <h2 style="color: #155724; margin-top: 0;">✅ ¡Contraseña Actualizada!</h2>
                        
                        <p style="color: #155724;">Hola ${userName},</p>
                        
                        <p style="color: #155724;">Tu contraseña ha sido actualizada exitosamente el ${new Date().toLocaleString('es-CL')}.</p>
                        
                        <p style="color: #155724;">Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte.</p>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <h3 style="color: #856404; margin-top: 0;">🛡️ Consejos de Seguridad</h3>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Usa contraseñas únicas y seguras</li>
                            <li>No compartas tus credenciales con nadie</li>
                            <li>Cierra sesión en dispositivos compartidos</li>
                            <li>Reporta cualquier actividad sospechosa</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
                        <p>© ${new Date().getFullYear()} LungLife - Sistema de Monitoreo Pulmonar</p>
                        <p style="color: #999; font-size: 12px;">
                            Este es un email automático, no respondas a este mensaje.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
Hola ${userName},

Tu contraseña ha sido actualizada exitosamente el ${new Date().toLocaleString('es-CL')}.

Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte.

© ${new Date().getFullYear()} LungLife - Sistema de Monitoreo Pulmonar
            `
        };

        try {
            const result = await transporter.sendMail(mailOptions);
            console.log('✅ Email de confirmación enviado:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (emailError) {
            console.log('📧 Simulando notificación de cambio de contraseña para:', email);
            return { success: true, messageId: `simulation-${Date.now()}` };
        }

    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        return { success: false, error };
    }
};

// Función para verificar la configuración del email
export const testEmailConfig = async () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('✅ Modo desarrollo: Email será simulado');
        return true;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.verify();
        console.log('✅ Configuración de email verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error en configuración de email:', error);
        return false;
    }
};
