/**
 * 🔧 PostgreSQL Database Connection Implementation
 * Implementación concreta de la conexión a PostgreSQL
 * Con manejo robusto de errores y reconexión automática
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { IDatabaseConnection, IDatabaseTransaction, ConnectionMetrics, DatabaseConfig } from '../../interfaces/database.interface';
import { Logger } from '../../services/logger.service';

export class PostgreSQLConnection implements IDatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private logger: Logger;
  private connectionMetrics: ConnectionMetrics;
  private isInitialized = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      waitingConnections: 0,
      maxConnections: config.maxConnections,
      connectionErrors: 0,
      lastConnectionTime: null,
      uptime: 0
    };
  }

  async connect(): Promise<boolean> {
    try {
      if (this.isInitialized && this.pool) {
        return this.isConnected();
      }

      this.logger.info('🔄 Inicializando conexión a PostgreSQL...');
      
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      };

      this.pool = new Pool(poolConfig);
      
      // Configurar eventos del pool
      this.setupPoolEvents();
      
      // Probar la conexión
      const testResult = await this.testConnection();
      
      if (testResult) {
        this.isInitialized = true;
        this.connectionMetrics.lastConnectionTime = new Date();
        this.logger.info('Conexión a PostgreSQL establecida exitosamente');
        return true;
      } else {
        throw new Error('Falló la prueba de conexión');
      }
      
    } catch (error) {
      this.connectionMetrics.connectionErrors++;
      this.logger.error('Error al conectar con PostgreSQL:', error);
      
      // Intentar reconexión automática
      this.scheduleReconnection();
      return false;
    }
  }

  private setupPoolEvents(): void {
    if (!this.pool) return;

    this.pool.on('connect', (client: PoolClient) => {
      this.connectionMetrics.totalConnections++;
      this.connectionMetrics.activeConnections++;
      this.logger.debug('Nueva conexión establecida al pool');
    });

    this.pool.on('acquire', (client: PoolClient) => {
      this.connectionMetrics.activeConnections++;
      this.logger.debug('Cliente adquirido del pool');
    });

    this.pool.on('remove', (client: PoolClient) => {
      this.connectionMetrics.activeConnections--;
      this.logger.debug('Cliente removido del pool');
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      this.connectionMetrics.connectionErrors++;
      this.logger.error('Error en el pool de conexiones:', err);
      
      // Programar reconexión si hay errores críticos
      if (this.isCriticalError(err)) {
        this.scheduleReconnection();
      }
    });
  }

  private isCriticalError(error: Error): boolean {
    const criticalErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET'
    ];
    
    return criticalErrors.some(code => error.message.includes(code));
  }

  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.logger.info('🔄 Intentando reconexión automática...');
      await this.connect();
    }, this.config.retryDelay);
  }

  private async testConnection(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();
      
      this.logger.info('Hora del servidor:', result.rows[0].current_time);
      this.logger.info('Versión PostgreSQL:', result.rows[0].pg_version.split(' ')[0]);
      
      return true;
    } catch (error) {
      this.logger.error('Falló la prueba de conexión:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isInitialized = false;
        this.logger.info('🔌 Conexión a PostgreSQL cerrada');
      }
    } catch (error) {
      this.logger.error('❌ Error al cerrar conexión:', error);
    }
  }

  isConnected(): boolean {
    return this.isInitialized && this.pool !== null;
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('No hay conexión activa a la base de datos');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug(`📊 Query ejecutado en ${duration}ms`);
      return result.rows;
    } catch (error) {
      this.logger.error('❌ Error en query:', error);
      this.logger.error('Query:', text);
      this.logger.error('Params:', params);
      throw error;
    }
  }

  async beginTransaction(): Promise<IDatabaseTransaction> {
    if (!this.pool) {
      throw new Error('No hay conexión activa a la base de datos');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');
    
    return new PostgreSQLTransaction(client, this.logger);
  }

  getConnectionMetrics(): ConnectionMetrics {
    if (this.pool) {
      // Actualizar métricas del pool
      this.connectionMetrics.activeConnections = this.pool.totalCount;
      this.connectionMetrics.waitingConnections = this.pool.waitingCount;
    }
    
    return { ...this.connectionMetrics };
  }
}

class PostgreSQLTransaction implements IDatabaseTransaction {
  constructor(
    private client: PoolClient,
    private logger: Logger
  ) {}

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.client.query(text, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error en transacción:', error);
      throw error;
    }
  }

  async commit(): Promise<void> {
    try {
      await this.client.query('COMMIT');
      this.client.release();
      this.logger.debug('Transacción confirmada');
    } catch (error) {
      this.logger.error('Error al confirmar transacción:', error);
      throw error;
    }
  }

  async rollback(): Promise<void> {
    try {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.logger.debug('Transacción revertida');
    } catch (error) {
      this.logger.error('Error al revertir transacción:', error);
      throw error;
    }
  }
}