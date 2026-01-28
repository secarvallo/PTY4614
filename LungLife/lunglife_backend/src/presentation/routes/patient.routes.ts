/**
 * Patient Routes
 * Routes for patient-specific endpoints
 * All routes require authentication
 */

import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { AuthMiddleware } from '../middleware';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticateToken);

/**
 * @swagger
 * /api/patients/{patientId}/medical-history:
 *   get:
 *     summary: Get patient medical history
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:patientId/medical-history', PatientController.getMedicalHistory);

/**
 * @swagger
 * /api/patients/{patientId}/medical-history:
 *   post:
 *     summary: Add medical history entry
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entry_type
 *               - entry_name
 *             properties:
 *               entry_type:
 *                 type: string
 *                 enum: [CONDITION, ALLERGY, MEDICATION]
 *               entry_name:
 *                 type: string
 *               details:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, RESOLVED, INACTIVE]
 */
router.post('/:patientId/medical-history', PatientController.addMedicalHistory);

/**
 * @swagger
 * /api/patients/{patientId}/lifestyle:
 *   get:
 *     summary: Get patient lifestyle habits
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:patientId/lifestyle', PatientController.getLifestyle);

/**
 * @swagger
 * /api/patients/{patientId}/lifestyle:
 *   post:
 *     summary: Update patient lifestyle habits
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alcohol_consumption:
 *                 type: string
 *                 enum: [NONE, SOCIAL, REGULAR, HEAVY]
 *               physical_activity_frequency:
 *                 type: string
 *                 enum: [SEDENTARY, LIGHT, MODERATE, INTENSE]
 *               diet_type:
 *                 type: string
 *               sleep_duration_hours:
 *                 type: number
 *               stress_level:
 *                 type: string
 *                 enum: [LOW, MODERATE, HIGH]
 */
router.post('/:patientId/lifestyle', PatientController.updateLifestyle);

export default router;
