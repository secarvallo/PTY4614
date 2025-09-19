/**
 * 🗃️ Database Connection Interface
 * Abstracción para el manejo de conexiones a la base de datos
 * Siguiendo principios de Clean Architecture
 */

export interface IDatabaseConnection {
  /**
   * Establece conexión con la base de datos
   */
  connect(): Promise<boolean>;
  
  /**
   * Cierra la conexión con la base de datos
   */
  disconnect(): Promise<void>;
  
  /**
   * Verifica si la conexión está activa
   */
  isConnected(): boolean;
  
  /**
   * Ejecuta una consulta
   */
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  
  /**
   * Inicia una transacción
   */
  beginTransaction(): Promise<IDatabaseTransaction>;
  
  /**
   * Obtiene métricas de la conexión
   */
  getConnectionMetrics(): ConnectionMetrics;
}

export interface IDatabaseTransaction {
  /**
   * Ejecuta una consulta dentro de la transacción
   */
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  
  /**
   * Confirma la transacción
   */
  commit(): Promise<void>;
  
  /**
   * Revierte la transacción
   */
  rollback(): Promise<void>;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  waitingConnections: number;
  maxConnections: number;
  connectionErrors: number;
  lastConnectionTime: Date | null;
  uptime: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  retryAttempts: number;
  retryDelay: number;
}