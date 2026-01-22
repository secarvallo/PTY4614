/**
 * Directory Routes
 * RBAC-based routes for multi-role directory access
 */

import { Router } from 'express';
import { DirectoryController } from '../controllers/directory.controller';
import { AuthMiddleware } from '../core/middleware';

const router = Router();
const directoryController = new DirectoryController();

/**
 * @swagger
 * /api/directory:
 *   get:
 *     summary: Get directory entries based on user role
 *     description: |
 *       Returns directory data adapted to the user's role:
 *       - Patient: sees doctors list
 *       - Doctor: sees their patients or colleagues
 *       - Admin: sees all users
 *     tags: [Directory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [doctors, patients, colleagues, all-users]
 *         description: Directory mode (validated against user role)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: Filter by specialty (doctors mode)
 *       - in: query
 *         name: institution
 *         schema:
 *           type: string
 *         description: Filter by institution (doctors mode)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by user status (admin only)
 *     responses:
 *       200:
 *         description: Directory entries
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Mode not allowed for role
 */
router.get('/',
  AuthMiddleware.authenticateToken,
  (req, res) => directoryController.getDirectory(req, res)
);

/**
 * @swagger
 * /api/directory/current-assignment:
 *   get:
 *     summary: Get current assignment for the user
 *     description: |
 *       - Patient: returns their assigned doctor
 *       - Doctor: returns patient count summary
 *     tags: [Directory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current assignment data
 */
router.get('/current-assignment',
  AuthMiddleware.authenticateToken,
  (req, res) => directoryController.getCurrentAssignment(req, res)
);

/**
 * @swagger
 * /api/directory/assign:
 *   post:
 *     summary: Assign doctor to patient
 *     description: |
 *       - Patient: assigns themselves to a doctor
 *       - Admin: can assign any patient to any doctor
 *     tags: [Directory]
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
 *               patientId:
 *                 type: integer
 *                 description: Required only for admin assignments
 *     responses:
 *       200:
 *         description: Assignment successful
 *       403:
 *         description: Not authorized to make assignments
 */
router.post('/assign',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireRole(1, 3), // Patient or Admin
  (req, res) => directoryController.assignDoctor(req, res)
);

/**
 * @swagger
 * /api/directory/toggle-status/{userId}:
 *   put:
 *     summary: Toggle user active status
 *     description: Admin only - activate or deactivate a user
 *     tags: [Directory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Admin only
 */
router.put('/toggle-status/:userId',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireAdmin,
  (req, res) => directoryController.toggleUserStatus(req, res)
);

/**
 * @swagger
 * /api/directory/statistics:
 *   get:
 *     summary: Get directory statistics
 *     description: Admin only - get counts of users, assignments, etc.
 *     tags: [Directory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics data
 *       403:
 *         description: Admin only
 */
router.get('/statistics',
  AuthMiddleware.authenticateToken,
  AuthMiddleware.requireAdmin,
  (req, res) => directoryController.getStatistics(req, res)
);

export default router;
