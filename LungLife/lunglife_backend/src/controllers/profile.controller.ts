import { Request, Response } from 'express';
import { ProfileService } from '../core/services/profile.service';
import { 
  CreateUserProfileDTO,
  UpdateUserProfileDTO,
  CreateRiskAssessmentDTO,
  CreateHealthMetricDTO,
  UserRole 
} from '../core/interfaces/profile.interface';
import { Logger } from '../core/services/logger.service';

// Extend Express Request type to include user with role
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      email: string;
      type?: string;
      role?: UserRole;
    };
  }
}

/**
 * Controlador de Perfil de Usuario
 * Gestiona los endpoints del módulo de perfiles y evaluación de riesgo
 * 
 * Endpoints incluidos:
 * - CRUD de perfiles de usuario
 * - Evaluación de riesgo de cáncer pulmonar
 * - Métricas de salud y seguimiento
 * - Dashboard estadístico
 */
export class ProfileController {
  private profileService: ProfileService;
  private logger: Logger;

  constructor(profileService: ProfileService, logger: Logger) {
    this.profileService = profileService;
    this.logger = logger;
  }

  /**
   * 🆕 Crear perfil de usuario
   * POST /api/v1/profile
   */
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole;
      
      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const profileData: CreateUserProfileDTO = req.body;

      const profile = await this.profileService.createUserProfile(
        userId,
        profileData,
        userRole
      );

      this.logger.info(`Perfil creado para usuario ${userId}`, { profileId: profile.id });

      res.status(201).json({
        success: true,
        message: 'Perfil creado exitosamente',
        data: profile
      });

    } catch (error: any) {
      this.logger.error('Error creating profile:', error);
      
      if (error.message?.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: 'El usuario ya tiene un perfil creado',
          error: 'PROFILE_EXISTS'
        });
        return;
      }

      if (error.message?.includes('VALIDATION_ERROR')) {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 📋 Obtener perfil de usuario
   * GET /api/v1/profile/:userId?
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      
      // Si no se especifica userId, obtener el perfil del usuario actual
      const targetUserId = req.params.userId ? 
        parseInt(req.params.userId) : requestingUserId;

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const profile = await this.profileService.getUserProfile(
        targetUserId,
        requestingUserId,
        requestingUserRole
      );

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Perfil no encontrado',
          error: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: profile
      });

    } catch (error: any) {
      this.logger.error('Error getting profile:', error);
      
      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado a este perfil',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * ✏️ Actualizar perfil de usuario
   * PUT /api/v1/profile/:userId?
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      
      const targetUserId = req.params.userId ? 
        parseInt(req.params.userId) : requestingUserId;

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const updateData: UpdateUserProfileDTO = req.body;

      const updatedProfile = await this.profileService.updateUserProfile(
        targetUserId,
        updateData,
        requestingUserId,
        requestingUserRole
      );

      if (!updatedProfile) {
        res.status(404).json({
          success: false,
          message: 'Perfil no encontrado',
          error: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      this.logger.info(`Perfil actualizado para usuario ${targetUserId}`, { 
        updatedBy: requestingUserId 
      });

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: updatedProfile
      });

    } catch (error: any) {
      this.logger.error('Error updating profile:', error);
      
      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado para actualizar este perfil',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 🎯 Crear evaluación de riesgo
   * POST /api/v1/profile/:userId/risk-assessment
   */
  async createRiskAssessment(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      const targetUserId = parseInt(req.params.userId);

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const assessmentData: CreateRiskAssessmentDTO = {
        ...req.body,
        assessed_by_user_id: requestingUserId
      };

      const assessment = await this.profileService.calculateRiskAssessment(
        targetUserId,
        assessmentData,
        requestingUserId,
        requestingUserRole
      );

      this.logger.info(`Evaluación de riesgo creada para usuario ${targetUserId}`, { 
        assessmentId: assessment.id,
        riskCategory: assessment.risk_category,
        assessedBy: requestingUserId
      });

      res.status(201).json({
        success: true,
        message: 'Evaluación de riesgo creada exitosamente',
        data: assessment
      });

    } catch (error: any) {
      this.logger.error('Error creating risk assessment:', error);
      
      if (error.message?.includes('profile not found')) {
        res.status(404).json({
          success: false,
          message: 'Perfil de usuario no encontrado',
          error: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado para crear evaluación',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 📊 Obtener estadísticas del dashboard
   * GET /api/v1/profile/dashboard
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const stats = await this.profileService.getDashboardStats(userRole);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      this.logger.error('Error getting dashboard stats:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 📈 Obtener tendencias de riesgo
   * GET /api/v1/profile/:userId/risk-trends
   */
  async getRiskTrends(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      const targetUserId = parseInt(req.params.userId);

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Implement getRiskTrends or use alternative method
      const trends = await this.profileService.getRiskAssessmentHistory(
        targetUserId,
        requestingUserId,
        requestingUserRole
      );

      res.json({
        success: true,
        data: trends
      });

    } catch (error: any) {
      this.logger.error('Error getting risk trends:', error);
      
      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado para ver tendencias',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 💓 Crear métrica de salud
   * POST /api/v1/profile/:userId/health-metrics
   */
  async createHealthMetric(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      const targetUserId = parseInt(req.params.userId);

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const metricData: CreateHealthMetricDTO = {
        ...req.body,
        recorded_by_user_id: requestingUserId
      };

      const metric = await this.profileService.addHealthMetric(
        targetUserId,
        metricData,
        requestingUserId,
        requestingUserRole
      );

      this.logger.info(`Métrica de salud creada para usuario ${targetUserId}`, { 
        metricId: metric.id,
        metricType: metric.metric_type,
        recordedBy: requestingUserId
      });

      res.status(201).json({
        success: true,
        message: 'Métrica de salud registrada exitosamente',
        data: metric
      });

    } catch (error: any) {
      this.logger.error('Error creating health metric:', error);
      
      if (error.message?.includes('profile not found')) {
        res.status(404).json({
          success: false,
          message: 'Perfil de usuario no encontrado',
          error: 'PROFILE_NOT_FOUND'
        });
        return;
      }

      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado para registrar métricas',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 📋 Resumen de perfil
   * GET /api/v1/profile/:userId/summary
   */
  async getProfileSummary(req: Request, res: Response): Promise<void> {
    try {
      const requestingUserId = req.user?.id;
      const requestingUserRole = req.user?.role as UserRole;
      const targetUserId = parseInt(req.params.userId);

      if (!requestingUserId || !targetUserId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuario no autenticado',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      const summary = await this.profileService.getProfileSummary(
        targetUserId,
        requestingUserId,
        requestingUserRole
      );

      if (!summary) {
        res.status(404).json({
          success: false,
          message: 'Resumen de perfil no encontrado',
          error: 'SUMMARY_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: summary
      });

    } catch (error: any) {
      this.logger.error('Error getting profile summary:', error);
      
      if (error.message?.includes('access denied')) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado para ver resumen',
          error: 'ACCESS_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'INTERNAL_ERROR'
      });
    }
  }
}