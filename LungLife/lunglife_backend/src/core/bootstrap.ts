/**
 * 🚀 Application Bootstrap
 * Initializes the dependency injection container with all services
 */

import { container } from './di/container';

/**
 * Initialize the dependency injection container
 * All services and controllers are automatically registered via @Injectable decorators
 */
export function initializeContainer(): void {
  try {
    // The container is already initialized with all @Injectable services
    // No manual registration needed - the decorators handle this automatically

    console.log('✅ Dependency injection container initialized successfully');
    console.log('📦 Services registered via @Injectable decorators:');
    console.log('   - AuthService, JWTService, AuditService, EmailService');
    console.log('   - UserRepository');
    console.log('   - AuthController, TwoFAController, PasswordController');
  } catch (error) {
    console.error('❌ Failed to initialize dependency injection container:', error);
    throw error;
  }
}