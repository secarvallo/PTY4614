import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '33691111',
    database: process.env.DB_NAME || 'lunglife_db',  // Actualizado al nombre de BD corregido
    port: Number(process.env.DB_PORT) || 5432,
    max: 20,  // Máximo conexiones para escalabilidad
    idleTimeoutMillis: 30000,  // Cierre de conexiones inactivas
    connectionTimeoutMillis: 2000,  // Timeout de conexión
});

// Función para probar la conexión (para pruebas unitarias)
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Conexión a PostgreSQL exitosa');
        client.release();
    } catch (error) {
        console.error('Error en conexión a BD:', error);
    }
}

// Exportar pool y función de test
export { pool, testConnection };
