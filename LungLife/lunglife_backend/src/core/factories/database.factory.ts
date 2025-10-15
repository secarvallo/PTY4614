/**
 * 🏗️ Database Service Factory
 * Factory para crear servicios de base de datos
 * Implementa patrón Factory con Dependency Injection
 */

import { DatabaseConfig } from '../interfaces/config.interface';
import { PostgreSQLConnection } from '../infrastructure/database/postgresql.connection';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { UnitOfWork } from '../infrastructure/unit-of-work/unit-of-work';
import { Logger } from '../services/logger.service';
import { config } from '../config/config';

export class DatabaseServiceFactory {
  private static instance: DatabaseServiceFactory;
  private connection: PostgreSQLConnection | null = null;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('DatabaseServiceFactory');
  }

  static getInstance(): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory();
    }
    return DatabaseServiceFactory.instance;
  }

  async getConnection(): Promise<PostgreSQLConnection> {
    if (!this.connection) {
      const dbConfig: DatabaseConfig = {
        host: config.getDatabaseConfig().host,
        port: config.getDatabaseConfig().port,
        database: config.getDatabaseConfig().database,
        user: config.getDatabaseConfig().user,
        password: config.getDatabaseConfig().password,
        maxConnections: config.getDatabaseConfig().maxConnections,
        idleTimeoutMillis: config.getDatabaseConfig().idleTimeoutMillis,
        connectionTimeoutMillis: config.getDatabaseConfig().connectionTimeoutMillis,
        retryAttempts: 5,
        retryDelay: 5000
      };

      this.connection = new PostgreSQLConnection(dbConfig, this.logger);
      
      const connected = await this.connection.connect();
      if (!connected) {
        throw new Error('Failed to establish database connection');
      }
    }

    return this.connection;
  }

  async getUserRepository(): Promise<UserRepository> {
    const connection = await this.getConnection();
    return new UserRepository(connection, new Logger('UserRepository'));
  }

  async getUnitOfWork(): Promise<UnitOfWork> {
    const connection = await this.getConnection();
    return new UnitOfWork(connection, new Logger('UnitOfWork'));
  }

  async closeConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}