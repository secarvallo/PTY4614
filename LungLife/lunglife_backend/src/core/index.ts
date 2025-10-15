/**
 * Core Module - Centralized Exports
 * Single point of access for all core functionality
 */

// ===== SERVICES =====
export * from './services/authentication.service';
export * from './services/logger.service';

// ===== INTERFACES =====
export * from './interfaces/config.interface';
export * from './interfaces/database.interface';
export * from './interfaces/repository.interface';

// ===== MIDDLEWARE =====
export * from './middleware';

// ===== FACTORIES =====
export * from './factories/database.factory';

// ===== INFRASTRUCTURE =====
export * from './infrastructure/database/postgresql.connection';
export * from './infrastructure/repositories/user.repository';
export * from './infrastructure/unit-of-work/unit-of-work';

// ===== CONFIGURATION =====
export { config } from './config/config';