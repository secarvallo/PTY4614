/**
 * Infrastructure Layer - External Implementations
 * Exports database, repositories, and configurations
 */

// Configuration
export { config, ConfigManager } from './config/config';
export { setupSwagger, swaggerSpec } from './config/swagger.config';

// Database
export * from './database/postgresql.connection';

// Factories
export * from './factories/database.factory';

// Repositories
export * from './repositories/user.repository';
export * from './repositories/profile.repository';
export * from './repositories/risk-assessment.repository';
export * from './repositories/refresh-token.repository';
export * from './repositories/patient.repository';
export * from './repositories/ml-prediction.repository';

// Unit of Work
export * from './unit-of-work/unit-of-work';
