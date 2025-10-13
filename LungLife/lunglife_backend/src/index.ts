import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { DatabaseServiceFactory } from './core/factories/database.factory';

dotenv.config();

// Configuration validation
const validateConfig = () => {
    console.log('🔧 Loading environment configuration...');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || '5432'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'lunglife_db'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***CONFIGURED***' : 'using default'}`);
    console.log('✅ Configuration loaded successfully (using defaults for missing values)');
    return true;
};

validateConfig();

// No DI bootstrap needed for v2 controller usage

const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:4200',  // Angular dev server
        'http://localhost:8100',  // Ionic dev server
        'http://localhost:3000',  // Common React port
        'http://127.0.0.1:4200',  // Alternative localhost
        'http://127.0.0.1:8100'   // Alternative localhost
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
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
const startServer = async () => {
    // Force port 3003 to match frontend configuration
    const preferredPort = 3003;
    let port = preferredPort;
    const maxAttempts = 5;
    let attempts = 0;

    const attemptListen = () => {
        attempts++;
        console.log(`🚀 Attempting to start server on port ${port} (attempt ${attempts}/${maxAttempts})`);
        
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Servidor ejecutándose en http://localhost:${port}`);
            console.log(`🏥 Health check: http://localhost:${port}/api/health`);
            console.log(`🧪 Test endpoint: http://localhost:${port}/api/test`);
            console.log(`🔐 Auth endpoint: http://localhost:${port}/api/auth/register`);
            console.log('🏗️ Arquitectura: Clean Architecture Full Stack');
            console.log('✨ Endpoints de autenticación listos para frontend');
            console.log(`🌐 CORS configurado para frontend en puerto 4200`);
        });

        server.on('error', (err: any) => {
            if (err && err.code === 'EADDRINUSE') {
                console.warn(`⚠️ Port ${port} in use.`);
                if (attempts < maxAttempts) {
                    port++;
                    console.log(`🔄 Trying next port: ${port}`);
                    attemptListen();
                } else {
                    console.error(`❌ Failed to bind a port after ${maxAttempts} attempts. Exiting.`);
                    process.exit(1);
                }
            } else {
                console.error('❌ Server error:', err);
                process.exit(1);
            }
        });

        server.on('listening', () => {
            const address = server.address();
            console.log(`🎧 Server is now listening on ${JSON.stringify(address)}`);
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
