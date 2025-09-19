import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { DatabaseServiceFactory } from './core/factories/database.factory';

dotenv.config();

// No DI bootstrap needed for v2 controller usage

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:8100', 'http://localhost:4200'],
    credentials: true
}));
app.use(express.json());

// Test database connection on startup using Clean Architecture factory
(async () => {
    try {
        const factory = DatabaseServiceFactory.getInstance();
        const connection = await factory.getConnection();
        if (connection.isConnected()) {
            console.log('Conexión a PostgreSQL exitosa!');
            console.log('Base de datos:', 'lunglife_db');
            console.log('Arquitectura:', 'Clean Architecture Backend');
        } else {
            console.log('No se pudo conectar a la base de datos. Verifica la configuración.');
        }
    } catch (err) {
        console.error('Error inicializando conexión a la base de datos:', err);
    }
})();

// ========== API ROUTES ==========

// Authentication routes - Compatible with frontend strategies
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const factory = DatabaseServiceFactory.getInstance();
        const connection = await factory.getConnection();
        const metrics = connection.getConnectionMetrics();
        res.json({
            status: 'OK',
            message: 'LungLife Backend - Clean Architecture',
            database: {
                connected: connection.isConnected(),
                metrics
            },
            timestamp: new Date().toISOString(),
            architecture: 'Clean Architecture - Full Stack',
            endpoints: {
                auth: '/api/auth/*',
                health: '/api/health',
                test: '/api/test'
            }
        });
    } catch (err) {
        res.status(503).json({ status: 'DOWN', error: 'Database not available' });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'LungLife Backend funcionando correctamente',
        architecture: 'Clean Architecture implementada',
        frontend: 'Ionic 8 + Angular 20 (Standalone)',
        backend: 'Node.js + TypeScript + Express',
        database: 'PostgreSQL',
        patterns: [
            'Facade Pattern (Frontend)',
            'Strategy Pattern (Frontend)',
            'Observer Pattern (Frontend)',
            'Repository Pattern (Frontend)',
            'Controller Pattern (Backend)',
            'Clean Architecture (Full Stack)'
        ]
    });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/test',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/auth/refresh'
        ]
    });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Something went wrong on the server'
    });
});

// Replace direct app.listen with a resilient start that handles EADDRINUSE
{
    const startServer = async () => {
        const portEnv = parseInt(process.env.PORT || '3003', 10);
        let port = isNaN(portEnv) ? 3003 : portEnv;
        const maxAttempts = 10;

        const attemptListen = () => {
            const server = app.listen(port, () => {
                console.log(`Servidor ejecutándose en http://localhost:${port}`);
                console.log(`Health check: http://localhost:${port}/api/health`);
                console.log(`Test endpoint: http://localhost:${port}/api/test`);
                console.log('Arquitectura: Clean Architecture Full Stack');
                console.log('Endpoints de autenticación listos para frontend');
            });

            server.on('error', (err: any) => {
                if (err && err.code === 'EADDRINUSE') {
                    console.warn(`Port ${port} in use. Trying next port...`);
                    const attempts = port - portEnv + 1;
                    if (attempts < maxAttempts) {
                        port++;
                        attemptListen();
                    } else {
                        console.error(`Failed to bind a port after ${maxAttempts} attempts. Exiting.`);
                        process.exit(1);
                    }
                } else {
                    console.error('Server error:', err);
                    process.exit(1);
                }
            });
        };

        attemptListen();
    };

    startServer();
}
