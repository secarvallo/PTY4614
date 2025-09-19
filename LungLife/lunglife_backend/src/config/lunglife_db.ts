import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lunglife_db',
  password: process.env.DB_PASSWORD || '336911',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
};

const pool = new Pool(dbConfig);

// Log pool-level errors so we can catch background errors
pool.on('error', (err) => {
  console.error('💥 Unexpected PG pool error:', err);
});

const redact = (value?: string | number) => (value === undefined ? undefined : '***');
const logConfig = () => {
  console.log('🔧 DB config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: redact(dbConfig.password as string),
    max: dbConfig.max,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
  });
};

// Test connection
export const testConnection = async () => {
  try {
    logConfig();
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL exitosa!');

    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Hora de la base de datos:', result.rows[0].current_time);

    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a PostgreSQL:', error);
    return false;
  }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;