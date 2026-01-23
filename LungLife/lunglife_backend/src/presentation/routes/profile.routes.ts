import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { ProfileService } from '../../application/services/profile.service';
import { UserProfileRepository } from '../../infrastructure/repositories/profile.repository';
import { RiskAssessmentRepository } from '../../infrastructure/repositories/risk-assessment.repository';
import { Logger } from '../../application/services/logger.service';
import { DatabaseServiceFactory as DatabaseFactory } from '../../infrastructure/factories/database.factory';
import { AuthMiddleware } from '../middleware';
import { UserRole } from '../../domain/interfaces/profile.interface';

/**
 * 🛣️ Rutas del Módulo de Perfil de Usuario
 * 
 * Endpoints principales:
 * - POST /api/v1/profile - Crear perfil
 * - GET /api/v1/profile/:userId? - Obtener perfil
 * - PUT /api/v1/profile/:userId? - Actualizar perfil
 * - POST /api/v1/profile/:userId/risk-assessment - Crear evaluación
 * - GET /api/v1/profile/dashboard - Estadísticas dashboard
 * - GET /api/v1/profile/:userId/risk-trends - Tendencias
 * - POST /api/v1/profile/:userId/health-metrics - Métricas salud
 * - GET /api/v1/profile/:userId/summary - Resumen perfil
 */

const router = Router();

// Note: Profile routes use lazy initialization due to async database setup
// Controllers will be initialized on first request

// =====================================================
// 🔐 Middleware de Autenticación Global
// =====================================================
router.use(AuthMiddleware.authenticateToken);

// =====================================================
// 📋 Endpoints de Gestión de Perfil
// =====================================================

/**
 * 🆕 Crear perfil de usuario
 * POST /api/v1/profile
 * Roles: Todos los usuarios autenticados
 */
router.post(
  '/',
  async (req, res) => {
    res.status(501).json({ success: false, message: 'Profile creation endpoint - pending implementation' });
  }
);

/**
 * 📋 Obtener perfil propio o de otro usuario
 * GET /api/v1/profile/:userId?
 * Roles: Todos (con restricciones de acceso)
 */
router.get(
  '/:userId?',
  async (req, res) => {
    res.status(501).json({ success: false, message: 'Profile get endpoint - pending implementation' });
  }
);

/**
 * ✏️ Actualizar perfil
 * PUT /api/v1/profile/:userId?
 * Roles: Propietario del perfil o profesionales de salud/admins
 */
router.put(
  '/:userId?',
  validationMiddleware(updateProfileSchema),
  (req, res) => profileController.updateProfile(req, res)
);

/**
 * 📋 Obtener resumen de perfil
 * GET /api/v1/profile/:userId/summary
 * Roles: Todos (con restricciones de acceso)
 */
router.get(
  '/:userId/summary',
  (req, res) => profileController.getProfileSummary(req, res)
);

// =====================================================
// 🎯 Endpoints de Evaluación de Riesgo
// =====================================================

/**
 * 🎯 Crear evaluación de riesgo
 * POST /api/v1/profile/:userId/risk-assessment
 * Roles: Profesionales de salud y admins
 */
router.post(
  '/:userId/risk-assessment',
  requireRole([UserRole.HEALTH_PROFESSIONAL, UserRole.ADMIN]),
  validationMiddleware(createRiskAssessmentSchema),
  (req, res) => profileController.createRiskAssessment(req, res)
);

/**
 * 📈 Obtener tendencias de riesgo
 * GET /api/v1/profile/:userId/risk-trends
 * Roles: Propietario del perfil o profesionales de salud/admins
 */
router.get(
  '/:userId/risk-trends',
  (req, res) => profileController.getRiskTrends(req, res)
);

// =====================================================
// 💓 Endpoints de Métricas de Salud
// =====================================================

/**
 * 💓 Registrar métrica de salud
 * POST /api/v1/profile/:userId/health-metrics
 * Roles: Propietario del perfil o profesionales de salud/admins
 */
router.post(
  '/:userId/health-metrics',
  validationMiddleware(createHealthMetricSchema),
  (req, res) => profileController.createHealthMetric(req, res)
);

// =====================================================
// 📊 Endpoints de Dashboard y Estadísticas
// =====================================================

/**
 * 📊 Obtener estadísticas del dashboard
 * GET /api/v1/profile/dashboard
 * Roles: Todos los usuarios autenticados
 */
router.get(
  '/dashboard',
  (req, res) => profileController.getDashboardStats(req, res)
);

// =====================================================
// 👩‍⚕️ Endpoints Administrativos
// =====================================================

/**
 * 👥 Obtener perfiles de pacientes (para profesionales de salud)
 * GET /api/v1/profile/patients
 * Roles: Solo profesionales de salud y admins
 */
router.get(
  '/patients',
  requireRole([UserRole.HEALTH_PROFESSIONAL, UserRole.ADMIN]),
  (req, res) => {
    // TODO: Implementar endpoint para listar pacientes
    res.status(501).json({
      success: false,
      message: 'Endpoint en desarrollo',
      error: 'NOT_IMPLEMENTED'
    });
  }
);

/**
 * 🚨 Obtener pacientes de alto riesgo
 * GET /api/v1/profile/high-risk-patients
 * Roles: Solo profesionales de salud y admins
 */
router.get(
  '/high-risk-patients',
  requireRole([UserRole.HEALTH_PROFESSIONAL, UserRole.ADMIN]),
  (req, res) => {
    // TODO: Implementar endpoint para pacientes de alto riesgo
    res.status(501).json({
      success: false,
      message: 'Endpoint en desarrollo',
      error: 'NOT_IMPLEMENTED'
    });
  }
);

// =====================================================
// 🧪 Endpoints de Investigación (Solo para investigadores)
// =====================================================

/**
 * 📊 Obtener datos agregados para investigación
 * GET /api/v1/profile/research/aggregate-data
 * Roles: Solo investigadores y admins
 */
router.get(
  '/research/aggregate-data',
  requireRole([UserRole.RESEARCHER, UserRole.ADMIN]),
  (req, res) => {
    // TODO: Implementar endpoint para datos agregados
    res.status(501).json({
      success: false,
      message: 'Endpoint en desarrollo - Datos anonimizados para investigación',
      error: 'NOT_IMPLEMENTED'
    });
  }
);

// =====================================================
// 🔥 Manejo de Errores
// =====================================================

router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Error in profile routes:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en rutas de perfil',
    error: 'PROFILE_ROUTE_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

export default router;