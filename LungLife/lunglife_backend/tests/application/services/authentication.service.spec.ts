/**
 * Authentication Service Tests
 * Unit tests for authentication business logic
 */

import { AuthenticationService, RegisterUserRequest } from '../../../src/application/services/authentication.service';
import { IUserRepository, IUnitOfWork } from '../../../src/domain/interfaces/repository.interface';
import { Logger } from '../../../src/application/services/logger.service';

// Mock del repositorio de usuarios
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  existsByEmail: jest.fn()
} as jest.Mocked<IUserRepository>;

// Mock del Unit of Work
const mockUnitOfWork = {
  getUserRepository: jest.fn().mockReturnValue(mockUserRepository),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
} as jest.Mocked<IUnitOfWork>;

// Mock del Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as jest.Mocked<Logger>;

describe('AuthenticationService', () => {
  let authService: AuthenticationService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create service instance with mocked dependencies
    authService = new AuthenticationService(mockUserRepository, mockUnitOfWork, mockLogger);
  });

  describe('Service Instantiation (Smoke Tests)', () => {
    it('should instantiate correctly', () => {
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthenticationService);
    });

    it('should have required methods', () => {
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.refreshToken).toBe('function');
    });
  });

  describe('register method', () => {
    const validUserRequest: RegisterUserRequest = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      acceptTerms: true,
      acceptPrivacy: true,
      acceptMarketing: false
    };

    it('should accept valid registration data', async () => {
      // Mock that user doesn't exist
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockUserRepository.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isVerified: false,
        createdAt: new Date()
      });

      const result = await authService.register(validUserRequest);

      expect(result).toBeDefined();
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should validate required fields', async () => {
      const invalidRequest = { ...validUserRequest, email: '' };

      const result = await authService.register(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });

    it('should reject duplicate email addresses', async () => {
      // Mock that user already exists
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      const result = await authService.register(validUserRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });

  describe('login method', () => {
    it('should accept email and password parameters', async () => {
      // Mock user not found to avoid complex bcrypt comparison in smoke test
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.login('test@example.com', 'password');

      expect(result).toBeDefined();
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('token management', () => {
    it('should have refreshToken method', () => {
      expect(typeof authService.refreshToken).toBe('function');
    });

    // More comprehensive token tests can be added as the service evolves
  });
});