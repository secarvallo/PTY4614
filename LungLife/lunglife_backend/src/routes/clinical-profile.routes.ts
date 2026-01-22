/**
 * Clinical Profile Routes
 * Routes for detailed clinical profile access
 */

import { Router } from 'express';
import { ClinicalProfileController } from '../controllers/clinical-profile.controller';
import { AuthMiddleware } from '../core/middleware';

const router = Router();
const clinicalProfileController = new ClinicalProfileController();

/**
 * @swagger
 * /api/clinical-profile:
 *   get:
 *     summary: Get own clinical profile (for patients)
 *     description: Returns the complete clinical profile for the authenticated patient
 *     tags: [Clinical Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clinical profile data
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Profile not found
 */
router.get('/',
  AuthMiddleware.authenticateToken,
  (req, res) => clinicalProfileController.getClinicalProfile(req, res)
);

/**
 * @swagger
 * /api/clinical-profile/{patientId}:
 *   get:
 *     summary: Get clinical profile for a specific patient
 *     description: |
 *       Returns clinical profile for the specified patient.
 *       - Doctors can only view their assigned patients
 *       - Admins can view any patient
 *     tags: [Clinical Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Clinical profile data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.get('/:patientId',
  AuthMiddleware.authenticateToken,
  (req, res) => clinicalProfileController.getClinicalProfile(req, res)
);

/**
 * @swagger
 * /api/clinical-profile/risk-history/{patientId}:
 *   get:
 *     summary: Get risk score history for a patient
 *     description: Returns historical risk assessments for charting
 *     tags: [Clinical Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Risk history data
 */
router.get('/risk-history/:patientId',
  AuthMiddleware.authenticateToken,
  (req, res) => clinicalProfileController.getRiskHistory(req, res)
);

export default router;
