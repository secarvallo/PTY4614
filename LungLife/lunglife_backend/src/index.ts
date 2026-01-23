import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './presentation/routes/auth.routes';
import { healthRoutes } from './presentation/routes/health.routes';
import directoryRoutes from './presentation/routes/directory.routes';
import { doctorRoutes } from './presentation/routes/doctor.routes';
import userProfileRoutes from './presentation/routes/user-profile.routes';
import clinicalProfileRoutes from './presentation/routes/clinical-profile.routes';
import { DatabaseServiceFactory } from './infrastructure/factories/database.factory';
import { setupSwagger } from './infrastructure/config/swagger.config';

dotenv.config();

// Configuration validation
const validateConfig = () => {
    console.log('🔧 Loading environment configuration...');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || '5432'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'lunglife_db'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***CONFIGURED***' : 'using default'}`);
    console.log('   Configuration loaded successfully (using defaults for missing values)');
    return true;
};

validateConfig();

// No DI bootstrap needed for v2 controller usage

const app = express();

// CORS Middleware - Simplificado para desarrollo
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (como Postman) o desde localhost
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 200
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
            console.log('ℹEl servidor continuará ejecutándose pero algunas funciones pueden fallar.');
        }
    } catch (err) {
        console.error('Error inicializando conexión a la base de datos:', err instanceof Error ? err.message : String(err));
        console.log('ℹEl servidor continuará ejecutándose pero algunas funciones pueden fallar.');
    }
})();

// ========== API ROUTES ==========

// Authentication routes - Compatible with frontend strategies
app.use('/api/auth', authRoutes);

// Health check routes - Comprehensive monitoring endpoints
app.use('/api/health', healthRoutes);

// Directory routes - RBAC-based directory access
app.use('/api/directory', directoryRoutes);

// Doctor routes - Doctor management and specialties
app.use('/api/doctors', doctorRoutes);

// Profile routes - User profile management
app.use('/api/profile', userProfileRoutes);

// Clinical Profile routes - Detailed clinical data
app.use('/api/clinical-profile', clinicalProfileRoutes);

// ========== API DOCUMENTATION ==========
// Setup Swagger API documentation
setupSwagger(app);

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
const startServer = async () => {
    // Use port from environment or default to 3002
    const preferredPort = parseInt(process.env.PORT || '3002');
    let port = preferredPort;
    const maxAttempts = 5;
    let attempts = 0;

    const attemptListen = () => {
        attempts++;
        console.log(`Attempting to start server on port ${port} (attempt ${attempts}/${maxAttempts})`);
        
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`Servidor ejecutándose en http://localhost:${port}`);
            console.log(`Health check: http://localhost:${port}/api/health`);
            console.log(`Test endpoint: http://localhost:${port}/api/test`);
            console.log(`Auth endpoint: http://localhost:${port}/api/auth/register`);
        });

        server.on('error', (err: any) => {
            if (err && err.code === 'EADDRINUSE') {
                console.warn(`Port ${port} in use.`);
                if (attempts < maxAttempts) {
                    port++;
                    console.log(`Trying next port: ${port}`);
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

        server.on('listening', () => {
            const address = server.address();
            console.log(`Server is now listening on ${JSON.stringify(address)}`);
        });
    };

    attemptListen();
};

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    console.log('Server will continue running...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('Server will continue running...');
});

startServer().catch(err => {
    console.error('Failed to start server:', err);
    console.log('Retrying server startup...');
    setTimeout(() => {
        startServer().catch(console.error);
    }, 2000);
});
