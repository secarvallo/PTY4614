/**
 * User Management Routes
 * Rutas para gestión de usuarios y sesiones
 */

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - User Management
 *     summary: Obtener información del usuario actual
 *     description: Retorna la información completa del usuario autenticado
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         email:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         emailVerified:
 *                           type: boolean
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', UserController.getCurrentUser);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags:
 *       - Session Management
 *     summary: Obtener sesiones activas del usuario
 *     description: Lista todas las sesiones activas del usuario autenticado
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sesiones activas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       device_id:
 *                         type: number
 *                       is_current:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       last_activity:
 *                         type: string
 *                         format: date-time
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 */
router.get('/sessions', UserController.getUserSessions);

/**
 * @swagger
 * /auth/sessions/revoke:
 *   post:
 *     tags:
 *       - Session Management
 *     summary: Revocar sesiones de usuario
 *     description: Revoca una sesión específica o todas las sesiones del usuario
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: number
 *                 description: ID de la sesión a revocar (opcional)
 *               revokeAll:
 *                 type: boolean
 *                 description: Si es true, revoca todas las sesiones excepto la actual
 *                 example: false
 *     responses:
 *       200:
 *         description: Sesión(es) revocada(s) exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sessions/revoke', UserController.revokeUserSession);

export { router as userRoutes };