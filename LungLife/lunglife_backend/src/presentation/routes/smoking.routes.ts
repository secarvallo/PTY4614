/**
 * Smoking Routes
 * Routes for smoking habit tracking API
 * All routes require authentication
 */

import { Router } from 'express';
import { SmokingController } from '../controllers/smoking.controller';
import { AuthMiddleware } from '../middleware';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticateToken);

/**
 * @swagger
 * /api/smoking/daily:
 *   post:
 *     summary: Log daily cigarette consumption
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - cigarettes_per_day
 *             properties:
 *               patient_id:
 *                 type: integer
 *               smoking_date:
 *                 type: string
 *                 format: date
 *               cigarettes_per_day:
 *                 type: integer
 *               smoking_status:
 *                 type: string
 *                 enum: [NEVER, FORMER_SMOKER, CURRENT_SMOKER]
 */
router.post('/daily', SmokingController.logDailyConsumption);

/**
 * @swagger
 * /api/smoking/daily/{patientId}/{date}:
 *   get:
 *     summary: Get smoking record for a specific date
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/daily/:patientId/:date', SmokingController.getTodayRecord);

/**
 * @swagger
 * /api/smoking/weekly/{patientId}:
 *   get:
 *     summary: Get weekly statistics
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/weekly/:patientId', SmokingController.getWeeklyStats);

/**
 * @swagger
 * /api/smoking/history/{patientId}:
 *   get:
 *     summary: Get smoking history
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 */
router.get('/history/:patientId', SmokingController.getHistory);

/**
 * @swagger
 * /api/smoking/stats/{patientId}:
 *   get:
 *     summary: Get patient smoking statistics
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/stats/:patientId', SmokingController.getPatientStats);

/**
 * @swagger
 * /api/smoking/daily/{smokingId}:
 *   put:
 *     summary: Update a smoking record
 *     tags: [Smoking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: smokingId
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
 *               - cigarettes_per_day
 *             properties:
 *               cigarettes_per_day:
 *                 type: integer
 */
router.put('/daily/:smokingId', SmokingController.updateDailyRecord);

export default router;
