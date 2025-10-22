/**
 *  Auth Routes - Clean Architecture Implementation
 * Routes that support all frontend strategies and patterns
 */

import express from 'express';
import { AuthController } from '../controllers/auth.controller.v2';
import { AuthMiddleware } from '../core/middleware';

const router = express.Router();

// Instantiate v2 controller (Clean Architecture)
const authController = new AuthController();

// ========== AUTHENTICATION ROUTES ==========

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Iniciar sesión de usuario
 *     description: Autentica un usuario y devuelve tokens de acceso y actualización
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@ejemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiContraseña123!"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security: []
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar nuevo usuario
 *     description: Crea una nueva cuenta de usuario en el sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - acceptTerms
 *               - acceptPrivacy
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nuevo@ejemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "MiContraseña123!"
 *               firstName:
 *                 type: string
 *                 example: "Juan"
 *               lastName:
 *                 type: string
 *                 example: "Pérez"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               acceptTerms:
 *                 type: boolean
 *                 example: true
 *               acceptPrivacy:
 *                 type: boolean
 *                 example: true
 *               acceptMarketing:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Datos de registro inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El email ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security: []
 */
router.post('/register', authController.register.bind(authController));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Renovar token de acceso
 *     description: Genera un nuevo token de acceso usando el refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Refresh token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security: []
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 *  Logout - Revoke refresh token
 * POST /api/auth/logout
 */
// Note: Logout endpoint not implemented in v2 architecture

// ========== PASSWORD RECOVERY ROUTES ==========

/**
 *Forgot Password - Compatible with ForgotStrategy
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * Reset Password - Compatible with ForgotStrategy
 * POST /api/auth/reset-password
 */
router.post('/reset-password', authController.resetPassword.bind(authController));

// ========== 2FA ROUTES ==========

/**
 * @swagger
 * /auth/2fa/setup:
 *   post:
 *     tags:
 *       - 2FA
 *     summary: Configurar autenticación de dos factores
 *     description: Genera un secreto 2FA y devuelve el código QR para configurar en la app autenticador
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración 2FA generada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Código QR generado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     qr_code:
 *                       type: string
 *                       description: "Código QR en base64"
 *                     manual_entry_key:
 *                       type: string
 *                       description: "Clave para entrada manual"
 *                       example: "JBSWY3DPEHPK3PXP"
 *                     backup_codes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "Códigos de respaldo"
 *       401:
 *         description: Token no válido
 *       500:
 *         description: Error interno del servidor
 */
router.post('/2fa/setup', AuthMiddleware.authenticateToken, authController.setup2FA.bind(authController));

/**
 * @swagger
 * /auth/2fa/verify:
 *   post:
 *     tags:
 *       - 2FA
 *     summary: Verificar y activar 2FA
 *     description: Verifica el código de la app autenticador y activa 2FA para el usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 example: "123456"
 *                 description: "Código de 6 dígitos de la app autenticador"
 *     responses:
 *       200:
 *         description: 2FA activado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "2FA activado exitosamente"
 *       400:
 *         description: Código inválido
 *       401:
 *         description: Token no válido
 */
router.post('/2fa/verify', AuthMiddleware.authenticateToken, authController.verify2FA.bind(authController));

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     tags:
 *       - 2FA
 *     summary: Desactivar autenticación de dos factores
 *     description: Desactiva 2FA para el usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiContraseña123!"
 *                 description: "Contraseña actual para confirmar desactivación"
 *     responses:
 *       200:
 *         description: 2FA desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "2FA desactivado exitosamente"
 *       400:
 *         description: Contraseña incorrecta
 *       401:
 *         description: Token no válido
 */
router.post('/2fa/disable', AuthMiddleware.authenticateToken, authController.disable2FA.bind(authController));

// ========== USER PROFILE ROUTES ==========

/**
 * 👤 Get User Profile - For AuthFacadeService
 * GET /api/auth/user/profile
 */
// TODO: Implement getProfile method in AuthController
// router.get('/user/profile', AuthController.getProfile);

export default router;
