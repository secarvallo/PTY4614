/**
 * Health Check Controller
 * Controlador para endpoints de salud del sistema
 */

import { Request, Response } from 'express';
import { config } from '../../infrastructure/config/config';

export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  version?: string;
  environment?: string;
  uptime: number;
  services?: {
    database?: 'ok' | 'error';
    [key: string]: string | undefined;
  };
}

/**
 * Health Check Controller
 */
export class HealthController {
  
  /**
   * Basic health check endpoint
   * GET /health
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.getConfig().environment,
        uptime: Math.floor(process.uptime()),
        services: {
          // Basic service status will be expanded later
        }
      };

      res.status(200).json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      console.error('Health check error:', error);
      
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        errorCode: 'HEALTH_CHECK_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Detailed health check with database connectivity
   * GET /health/detailed
   */
  static async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const healthStatus: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.getConfig().environment,
        uptime: Math.floor(process.uptime()),
        services: {}
      };

      // Check database connectivity (basic version)
      // In a full implementation, this would use the DatabaseFactory
      try {
        // TODO: Implement actual database connectivity test
        // const dbFactory = new DatabaseFactory();
        // await dbFactory.testConnection();
        healthStatus.services!.database = 'ok';
      } catch (dbError) {
        console.error('Database health check failed:', dbError);
        healthStatus.services!.database = 'error';
        healthStatus.status = 'degraded';
      }

      const responseTime = Date.now() - startTime;
      
      // Determine HTTP status based on overall health
      const httpStatus = healthStatus.status === 'ok' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.status(httpStatus).json({
        success: healthStatus.status !== 'error',
        data: {
          ...healthStatus,
          responseTime: `${responseTime}ms`
        }
      });
    } catch (error) {
      console.error('Detailed health check error:', error);
      
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        errorCode: 'DETAILED_HEALTH_CHECK_FAILED',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Liveness probe endpoint (for Kubernetes)
   * GET /health/live
   */
  static async getLiveness(req: Request, res: Response): Promise<void> {
    // Simple liveness check - just return OK if the process is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Readiness probe endpoint (for Kubernetes)
   * GET /health/ready
   */
  static async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      // Check if the service is ready to receive traffic
      // This could include checking database connections, external dependencies, etc.
      
      const isReady = true; // TODO: Implement actual readiness checks
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Readiness check error:', error);
      
      res.status(503).json({
        status: 'not_ready',
        error: 'Readiness check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}