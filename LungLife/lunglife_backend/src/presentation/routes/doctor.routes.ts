/**
 * Doctor Routes
 * Routes for doctor directory and patient-doctor assignments
 */

import express from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import { AuthMiddleware } from '../middleware';

const router = express.Router();
const doctorController = new DoctorController();

// ========== PUBLIC DOCTOR DIRECTORY (requires authentication) ==========

/**
 * @swagger
 * /doctors:
 *   get:
 *     tags:
 *       - Doctors
 *     summary: Get list of all active doctors
 *     description: Returns list of doctors with optional filtering by search, specialty, and institution
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or specialty
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: Filter by specialty
 *       - in: query
 *         name: institution
 *         schema:
 *           type: string
 *         description: Filter by institution
 *     responses:
 *       200:
 *         description: List of doctors
 */
router.get(
  '/',
  AuthMiddleware.authenticateToken,
  (req, res) => doctorController.getDoctors(req, res)
);

/**
 * @swagger
 * /doctors/specialties:
 *   get:
 *     tags:
 *       - Doctors
 *     summary: Get list of unique specialties
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of specialties
 */
router.get(
  '/specialties',
  AuthMiddleware.authenticateToken,
  (req, res) => doctorController.getSpecialties(req, res)
);

/**
 * @swagger
 * /doctors/institutions:
 *   get:
 *     tags:
 *       - Doctors
 *     summary: Get list of unique institutions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of institutions
 */
router.get(
  '/institutions',
  AuthMiddleware.authenticateToken,
  (req, res) => doctorController.getInstitutions(req, res)
);

// ========== PATIENT-SPECIFIC ENDPOINTS ==========

/**
 * @swagger
 * /doctors/patient/current:
 *   get:
 *     tags:
 *       - Patient
 *     summary: Get current assigned doctor for authenticated patient
 *     description: Only accessible by patients (roleId = 1)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current doctor or null if none assigned
 *       403:
 *         description: Access denied - not a patient
 */
router.get(
  '/patient/current',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requirePatient,
  (req, res) => doctorController.getCurrentDoctor(req, res)
);

/**
 * @swagger
 * /doctors/patient/assign:
 *   post:
 *     tags:
 *       - Patient
 *     summary: Assign a doctor to the authenticated patient
 *     description: Only accessible by patients (roleId = 1). Creates or updates relation_patient_doctor.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *             properties:
 *               doctorId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Doctor assigned successfully
 *       403:
 *         description: Access denied - not a patient
 *       404:
 *         description: Patient profile or doctor not found
 */
router.post(
  '/patient/assign',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requirePatient,
  (req, res) => doctorController.assignDoctor(req, res)
);

export const doctorRoutes = router;
