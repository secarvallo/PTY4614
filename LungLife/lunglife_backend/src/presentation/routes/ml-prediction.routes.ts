/**
 * ML Prediction Routes
 * API routes for ML risk predictions
 * 
 * @author LungLife Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { mlPredictionController } from '../controllers/ml-prediction.controller';
import { AuthMiddleware } from '../middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ML Prediction
 *   description: Machine Learning risk prediction endpoints
 */

/**
 * @swagger
 * /api/ml/health:
 *   get:
 *     tags: [ML Prediction]
 *     summary: Check ML service health status
 *     description: Returns the health status of the ML prediction service
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     mlService:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     modelLoaded:
 *                       type: boolean
 *                     uptimeSeconds:
 *                       type: number
 *                     version:
 *                       type: string
 */
router.get('/health', (req, res) => mlPredictionController.getHealth(req, res));

/**
 * @swagger
 * /api/ml/predict/self:
 *   post:
 *     tags: [ML Prediction]
 *     summary: Generate prediction for authenticated patient
 *     description: Generates a new ML risk prediction for the authenticated patient
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prediction generated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only patients can use this endpoint
 *       503:
 *         description: ML service not available
 */
router.post(
  '/predict/self',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requirePatient,
  (req, res) => mlPredictionController.generateSelfPrediction(req, res)
);

/**
 * @swagger
 * /api/ml/predict/{patientId}:
 *   get:
 *     tags: [ML Prediction]
 *     summary: Get latest prediction for a patient
 *     description: Returns the most recent ML risk prediction for the specified patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The patient ID
 *     responses:
 *       200:
 *         description: Prediction retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: No predictions found
 */
router.get(
  '/predict/:patientId',
  AuthMiddleware.authenticateToken,
  (req, res) => mlPredictionController.getLatestPrediction(req, res)
);

/**
 * @swagger
 * /api/ml/predict/{patientId}:
 *   post:
 *     tags: [ML Prediction]
 *     summary: Generate a new prediction for a patient
 *     description: Generates a new ML risk prediction for the specified patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The patient ID
 *     responses:
 *       200:
 *         description: Prediction generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     predictionId:
 *                       type: integer
 *                     patientId:
 *                       type: integer
 *                     riskScore:
 *                       type: number
 *                       description: Risk score 0-100
 *                     riskLevel:
 *                       type: string
 *                       enum: [LOW, MODERATE, HIGH, CRITICAL]
 *                     confidence:
 *                       type: number
 *                     modelVersion:
 *                       type: string
 *                     topRiskFactors:
 *                       type: array
 *                       items:
 *                         type: object
 *                     recommendation:
 *                       type: string
 *                     predictionDate:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       503:
 *         description: ML service not available
 */
router.post(
  '/predict/:patientId',
  AuthMiddleware.authenticateToken,
  (req, res) => mlPredictionController.generatePrediction(req, res)
);

export default router;
