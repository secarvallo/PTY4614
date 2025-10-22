/**
 * User Controller
 * Controlador para gestión de usuarios y sesiones
 */

import { Request, Response } from 'express';
import { AuthMiddleware } from '../core/middleware';

export class UserController {
  
  /**
   * Get current user information
   * GET /auth/me
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // El middleware de autenticación ya validó el token y agregó req.user
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          errorCode: 'USER_NOT_AUTHENTICATED'
        });
        return;
      }

      // TODO: Obtener información completa del usuario desde la base de datos
      // Por ahora retornamos la información básica del token
      const userInfo = {
        id: req.user.id,
        email: req.user.email,
        // Mapear campos para compatibilidad con frontend
        firstName: req.user.type, // Temporal - necesita implementación real
        lastName: '', // Temporal - necesita implementación real
        emailVerified: true, // Temporal - necesita implementación real
        twoFAEnabled: false, // Temporal - necesita implementación real
        isActive: true,
        createdAt: new Date(), // Temporal - necesita implementación real
        lastLogin: new Date(), // Temporal - necesita implementación real
      };

      res.status(200).json({
        success: true,
        data: {
          user: userInfo
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Get user active sessions
   * GET /auth/sessions
   */
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          errorCode: 'USER_NOT_AUTHENTICATED'
        });
        return;
      }

      // TODO: Implementar consulta a tabla user_sessions
      // Por ahora retornamos sesión simulada
      const sessions = [
        {
          id: 1,
          device_id: 1,
          is_current: true,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        }
      ];

      res.status(200).json({
        success: true,
        sessions: sessions
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Revoke user session(s)
   * POST /auth/sessions/revoke
   */
  static async revokeUserSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
          errorCode: 'USER_NOT_AUTHENTICATED'
        });
        return;
      }

      const { sessionId, revokeAll } = req.body;

      if (!sessionId && !revokeAll) {
        res.status(400).json({
          success: false,
          error: 'Must provide sessionId or set revokeAll to true',
          errorCode: 'INVALID_REQUEST'
        });
        return;
      }

      // TODO: Implementar revocación real de sesiones en base de datos
      console.log('Revoking session(s):', { sessionId, revokeAll, userId: req.user.id });

      res.status(200).json({
        success: true,
        message: revokeAll ? 'All sessions revoked successfully' : 'Session revoked successfully'
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }
}