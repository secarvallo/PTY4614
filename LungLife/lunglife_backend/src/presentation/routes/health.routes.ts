/**
 * Health Check Routes
 * Rutas para endpoints de monitoreo del sistema
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Basic health check
 *     description: Returns basic service health status
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "ok"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 12345
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', HealthController.getHealth);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags:
 *       - Health  
 *     summary: Detailed health check
 *     description: Returns detailed service health including database connectivity
 *     responses:
 *       200:
 *         description: Detailed health information
 *       503:
 *         description: Service or dependencies are unhealthy
 */
router.get('/detailed', HealthController.getDetailedHealth);

/**
 * @swagger
 * /health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: Liveness probe
 *     description: Kubernetes liveness probe endpoint
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', HealthController.getLiveness);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness probe
 *     description: Kubernetes readiness probe endpoint  
 *     responses:
 *       200:
 *         description: Service is ready to receive traffic
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', HealthController.getReadiness);

export { router as healthRoutes };