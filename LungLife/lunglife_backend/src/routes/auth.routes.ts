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

// ========== CURRENT USER ROUTE ==========

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Obtener usuario actual
 *     description: Devuelve la información del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *       401:
 *         description: No autenticado
 */
router.get('/me', AuthMiddleware.authenticateToken, authController.getMe.bind(authController));

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
 *  Setup 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/setup
 */
// Note: 2FA endpoints omitted in this minimal setup

/**
 *  Verify 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/verify
 */
// Note: 2FA verify endpoint omitted

/**
 *  Disable 2FA - Compatible with TwoFAStrategy
 * POST /api/auth/2fa/disable
 */
// Note: 2FA disable endpoint omitted

// ========== USER PROFILE ROUTES ==========

/**
 * 👤 Get User Profile - For AuthFacadeService
 * GET /api/auth/user/profile
 */
// TODO: Implement getProfile method in AuthController
// router.get('/user/profile', AuthController.getProfile);

export default router;
