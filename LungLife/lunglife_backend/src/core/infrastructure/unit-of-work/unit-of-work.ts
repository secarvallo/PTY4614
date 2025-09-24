/**
 * 🔄 Unit of Work Implementation
 * Coordina transacciones y repositorios
 * Implementa patrón Unit of Work con Clean Architecture
 */

import { IDatabaseConnection, IDatabaseTransaction } from '../../interfaces/database.interface';
import { IUnitOfWork } from '../../interfaces/repository.interface';
import { Logger } from '../../services/logger.service';

export class UnitOfWork implements IUnitOfWork {
  private db: IDatabaseConnection;
  private transaction: IDatabaseTransaction | null = null;
  private repositories: Map<string, any> = new Map();
  private logger: Logger;

  constructor(db: IDatabaseConnection, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.transaction) {
      throw new Error('Unit of Work already started');
    }

    try {
      this.transaction = await this.db.beginTransaction();
      this.logger.debug('Unit of Work started');
    } catch (error) {
      this.logger.error('Error starting Unit of Work:', error);
      throw error;
    }
  }

  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.transaction.commit();
      this.transaction = null;
      this.repositories.clear();
      this.logger.debug('Unit of Work committed successfully');
    } catch (error) {
      this.logger.error('Error committing Unit of Work:', error);
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to rollback');
    }

    try {
      await this.transaction.rollback();
      this.transaction = null;
      this.repositories.clear();
      this.logger.debug('Unit of Work rolled back');
    } catch (error) {
      this.logger.error('Error rolling back Unit of Work:', error);
      throw error;
    }
  }

  getRepository<T>(repositoryType: new (...args: any[]) => T): T {
    const repositoryName = repositoryType.name;
    
    if (!this.repositories.has(repositoryName)) {
      // Crear una instancia del repositorio con la conexión transaccional
      const repository = new repositoryType(
        this.transaction ? new TransactionalDatabaseConnection(this.transaction) : this.db,
        this.logger
      );
      this.repositories.set(repositoryName, repository);
    }

    return this.repositories.get(repositoryName);
  }

  isActive(): boolean {
    return this.transaction !== null;
  }
}

/**
 * 🔗 Transactional Database Connection
 * Adapter para usar transacciones con la interfaz de conexión
 */
class TransactionalDatabaseConnection implements IDatabaseConnection {
  constructor(private transaction: IDatabaseTransaction) {}

  async connect(): Promise<boolean> {
    // En una transacción, la conexión ya está establecida
    return true;
  }

  async disconnect(): Promise<void> {
    // No cerramos la conexión en transacciones
  }

  isConnected(): boolean {
    return true;
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    return await this.transaction.query<T>(text, params);
  }

  async beginTransaction(): Promise<IDatabaseTransaction> {
    // Ya estamos en una transacción
    return this.transaction;
  }

  getConnectionMetrics() {
    return {
      totalConnections: 0,
      activeConnections: 1,
      waitingConnections: 0,
      maxConnections: 1,
      connectionErrors: 0,
      lastConnectionTime: new Date(),
      uptime: 0
    };
  }
}