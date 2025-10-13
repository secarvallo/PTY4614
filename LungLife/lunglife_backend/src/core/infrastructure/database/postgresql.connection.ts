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

      this.logger.info('Inicializando conexión a PostgreSQL...');
      this.logger.info(`Conectando a: ${this.config.host}:${this.config.port}/${this.config.database}`);
      
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.maxConnections || 20,
        min: 1, // Mantener al menos 1 conexión activa
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
        keepAlive: true,
        allowExitOnIdle: false
      };

      this.pool = new Pool(poolConfig);
      
      // Configurar eventos del pool
      this.setupPoolEvents();
      
      // Probar la conexión inmediatamente
      const testResult = await this.testConnection();
      
      if (testResult) {
        this.isInitialized = true;
        this.connectionMetrics.lastConnectionTime = new Date();
        this.logger.info('Conexión a PostgreSQL establecida exitosamente');
        return true;
      } else {
        throw new Error('Falló la prueba de conexión inicial');
      }
      
    } catch (error) {
      this.connectionMetrics.connectionErrors++;
      this.logger.error('Error al conectar con PostgreSQL:', error);
      
      // Limpiar recursos si falló
      if (this.pool) {
        try {
          await this.pool.end();
        } catch (cleanupError) {
          this.logger.error('Error limpiando pool:', cleanupError);
        }
        this.pool = null;
      }
      this.isInitialized = false;
      
      return false;
    }
  }

  private setupPoolEvents(): void {
    if (!this.pool) return;

    this.pool.on('connect', (client) => {
      this.connectionMetrics.totalConnections++;
      this.logger.info('Nueva conexión establecida al pool');
    });

    this.pool.on('error', (err: Error) => {
      this.connectionMetrics.connectionErrors++;
      this.logger.error('Error en el pool de conexiones:', err.message);
    });

    // Evento para cuando se remueve una conexión del pool
    this.pool.on('remove', (client) => {
      this.logger.warn('Conexión removida del pool');
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
    if (!this.pool) {
      this.logger.error('❌ Pool no está inicializado');
      return false;
    }

    let client: PoolClient | null = null;
    try {
      this.logger.info('Probando conexión a PostgreSQL...');
      
      // Timeout de 5 segundos para la prueba de conexión
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en prueba de conexión')), 5000);
      });
      
      client = await Promise.race([
        this.pool.connect(),
        timeoutPromise
      ]) as PoolClient;
      
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      
      this.logger.info('Prueba de conexión exitosa');
      this.logger.info(`Hora del servidor: ${result.rows[0].current_time}`);
      this.logger.info(`PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]}`);
      
      return true;
    } catch (error) {
      this.logger.error('Falló la prueba de conexión:', error);
      return false;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          this.logger.error('Error liberando cliente:', releaseError);
        }
      }
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
    if (!this.pool || !this.isInitialized) {
      // Intentar reconectar si no hay conexión
      const connected = await this.connect();
      if (!connected || !this.pool) {
        throw new Error('No hay conexión activa a la base de datos');
      }
    }

    // Timeout de 15 segundos para queries
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout en query de base de datos')), 15000);
    });

    try {
      const start = Date.now();
      const result = await Promise.race([
        this.pool.query(text, params),
        timeoutPromise
      ]);
      const duration = Date.now() - start;
      
      this.logger.debug(`Query ejecutado en ${duration}ms`);
      return result.rows;
    } catch (error) {
      this.logger.error('Error en query:', error);
      this.logger.error('Query:', text);
      this.logger.error('Params:', params);
      throw error;
    }
  }

  async beginTransaction(): Promise<IDatabaseTransaction> {
    if (!this.pool || !this.isInitialized) {
      // Intentar reconectar si no hay conexión
      const connected = await this.connect();
      if (!connected || !this.pool) {
        throw new Error('No hay conexión activa a la base de datos');
      }
    }

    // Timeout de 10 segundos para adquirir cliente y comenzar transacción
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout al iniciar transacción')), 10000);
    });

    try {
      const client = await Promise.race([
        this.pool.connect(),
        timeoutPromise
      ]);
      
      await client.query('BEGIN');
      return new PostgreSQLTransaction(client, this.logger);
    } catch (error) {
      this.logger.error('Error al iniciar transacción:', error);
      throw error;
    }
  }

  getConnectionMetrics(): ConnectionMetrics {
    if (this.pool) {
      // Actualizar métricas del pool
      this.connectionMetrics.activeConnections = this.pool.totalCount;
      this.connectionMetrics.waitingConnections = this.pool.waitingCount;
    }
    
    return { ...this.connectionMetrics };
  }

  // Add this new method to handle database creation
  private async createDatabaseIfNotExists(): Promise<void> {
    // Por simplicidad, asumimos que la base de datos ya existe
    // La creación de la BD debe hacerse manualmente o en un script de setup
    this.logger.info('📝 Asumiendo que la base de datos ya existe: ' + this.config.database);
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