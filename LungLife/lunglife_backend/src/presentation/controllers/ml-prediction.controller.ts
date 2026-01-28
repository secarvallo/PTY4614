/**
 * ML Prediction Controller
 * Handles API endpoints for ML risk predictions
 * 
 * Endpoints:
 * - POST /api/ml/predict/:patientId - Generate new prediction
 * - GET /api/ml/predict/:patientId - Get latest prediction
 * - GET /api/ml/health - Check ML service health
 * 
 * @author LungLife Team
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { mlPredictionService } from '../../application/services/ml-prediction.service';
import { DatabaseServiceFactory } from '../../infrastructure/factories/database.factory';
import { isPatient, isDoctor, isAdmin } from '../../shared/rbac';

export class MLPredictionController {

  /**
   * POST /api/ml/predict/:patientId
   * Generate a new ML prediction for a patient
   * - Patient: Can only generate for themselves
   * - Doctor: Can generate for their assigned patients
   * - Admin: Can generate for any patient
   */
  async generatePrediction(req: Request, res: Response): Promise<void> {
    try {
      const roleId = Number(req.user?.roleId);
      const userId = req.user?.id;
      const requestedPatientId = parseInt(req.params.patientId);

      console.log('[MLPrediction] Generate request:', { roleId, userId, requestedPatientId });

      if (!roleId || !userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (!requestedPatientId || isNaN(requestedPatientId)) {
        res.status(400).json({ success: false, error: 'ID de paciente inválido' });
        return;
      }

      // Check ML Service availability
      const isAvailable = await mlPredictionService.isMLServiceAvailable();
      if (!isAvailable) {
        res.status(503).json({ 
          success: false, 
          error: 'Servicio ML no disponible. Por favor intente más tarde.' 
        });
        return;
      }

      // Authorization check
      const authorized = await this.checkPatientAccess(userId, roleId, requestedPatientId);
      if (!authorized.allowed) {
        res.status(403).json({ success: false, error: authorized.message });
        return;
      }

      // Get doctor ID if applicable (for reviewed_by field)
      let doctorId: number | undefined;
      if (isDoctor(roleId)) {
        const factory = DatabaseServiceFactory.getInstance();
        const connection = await factory.getConnection();
        const doctorResult = await connection.query(
          'SELECT doctor_id FROM doctor WHERE user_id = $1',
          [userId]
        );
        if (doctorResult.length > 0) {
          doctorId = doctorResult[0].doctor_id;
        }
      }

      // Generate prediction
      const prediction = await mlPredictionService.generatePrediction(
        requestedPatientId,
        doctorId
      );

      res.json({
        success: true,
        data: prediction,
        message: 'Predicción generada exitosamente'
      });

    } catch (error: any) {
      console.error('[MLPrediction] Error generating prediction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al generar predicción',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/ml/predict/:patientId
   * Get the latest prediction for a patient
   */
  async getLatestPrediction(req: Request, res: Response): Promise<void> {
    try {
      const roleId = Number(req.user?.roleId);
      const userId = req.user?.id;
      const requestedPatientId = parseInt(req.params.patientId);

      if (!roleId || !userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (!requestedPatientId || isNaN(requestedPatientId)) {
        res.status(400).json({ success: false, error: 'ID de paciente inválido' });
        return;
      }

      // Authorization check
      const authorized = await this.checkPatientAccess(userId, roleId, requestedPatientId);
      if (!authorized.allowed) {
        res.status(403).json({ success: false, error: authorized.message });
        return;
      }

      const prediction = await mlPredictionService.getLatestPrediction(requestedPatientId);

      if (!prediction) {
        res.status(404).json({
          success: false,
          error: 'No hay predicciones para este paciente'
        });
        return;
      }

      res.json({
        success: true,
        data: prediction
      });

    } catch (error: any) {
      console.error('[MLPrediction] Error getting prediction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener predicción'
      });
    }
  }

  /**
   * GET /api/ml/health
   * Check ML service health status (public endpoint for monitoring)
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await mlPredictionService.getMLServiceHealth();
      
      res.json({
        success: true,
        data: {
          mlService: health.status,
          modelLoaded: health.modelLoaded,
          uptimeSeconds: health.uptimeSeconds,
          version: health.version,
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Error al verificar estado del servicio ML',
        data: {
          mlService: 'unhealthy',
          modelLoaded: false,
        }
      });
    }
  }

  /**
   * POST /api/ml/predict/self
   * Generate prediction for the authenticated patient (convenience endpoint)
   */
  async generateSelfPrediction(req: Request, res: Response): Promise<void> {
    try {
      const roleId = Number(req.user?.roleId);
      const userId = req.user?.id;

      if (!roleId || !userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (!isPatient(roleId)) {
        res.status(403).json({ success: false, error: 'Solo los pacientes pueden usar este endpoint' });
        return;
      }

      // Get patient ID from user
      const factory = DatabaseServiceFactory.getInstance();
      const connection = await factory.getConnection();
      
      const patientResult = await connection.query(
        'SELECT patient_id FROM patient WHERE user_id = $1',
        [userId]
      );

      if (patientResult.length === 0) {
        res.status(404).json({ success: false, error: 'Perfil de paciente no encontrado' });
        return;
      }

      const patientId = patientResult[0].patient_id;

      // Check ML Service availability
      const isAvailable = await mlPredictionService.isMLServiceAvailable();
      if (!isAvailable) {
        res.status(503).json({ 
          success: false, 
          error: 'Servicio ML no disponible. Por favor intente más tarde.' 
        });
        return;
      }

      // Generate prediction
      const prediction = await mlPredictionService.generatePrediction(patientId);

      res.json({
        success: true,
        data: prediction,
        message: 'Predicción generada exitosamente'
      });

    } catch (error: any) {
      console.error('[MLPrediction] Error generating self prediction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al generar predicción'
      });
    }
  }

  /**
   * Check if user has access to the patient's data
   */
  private async checkPatientAccess(
    userId: number,
    roleId: number,
    patientId: number
  ): Promise<{ allowed: boolean; message: string }> {
    const factory = DatabaseServiceFactory.getInstance();
    const connection = await factory.getConnection();

    if (isPatient(roleId)) {
      // Patient can only access their own data
      const result = await connection.query(
        'SELECT patient_id FROM patient WHERE user_id = $1',
        [userId]
      );
      
      if (result.length === 0 || result[0].patient_id !== patientId) {
        return { allowed: false, message: 'No tiene acceso a este perfil' };
      }
      return { allowed: true, message: '' };
    }

    if (isDoctor(roleId)) {
      // Doctor can access their assigned patients
      const doctorResult = await connection.query(
        'SELECT doctor_id FROM doctor WHERE user_id = $1',
        [userId]
      );

      if (doctorResult.length === 0) {
        return { allowed: false, message: 'Perfil de médico no encontrado' };
      }

      const assignmentResult = await connection.query(
        `SELECT 1 FROM relation_patient_doctor 
         WHERE doctor_id = $1 AND patient_id = $2 AND active = TRUE`,
        [doctorResult[0].doctor_id, patientId]
      );

      if (assignmentResult.length === 0) {
        return { allowed: false, message: 'Este paciente no está asignado a usted' };
      }
      return { allowed: true, message: '' };
    }

    if (isAdmin(roleId)) {
      // Admin can access any patient
      return { allowed: true, message: '' };
    }

    return { allowed: false, message: 'Rol no autorizado' };
  }
}

// Export singleton instance
export const mlPredictionController = new MLPredictionController();
