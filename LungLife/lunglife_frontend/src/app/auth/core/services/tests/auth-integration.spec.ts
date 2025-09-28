import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthStrategyContext } from '../application/auth-strategy-context.service';
import { LoginStrategy } from '../infrastructure/strategies/login.strategy';
import { RegisterStrategy } from '../infrastructure/strategies/register.strategy';
import { ForgotPasswordStrategy } from '../infrastructure/strategies/forgot-password.strategy';
import { TwoFactorStrategy } from '../infrastructure/strategies/two-factor.strategy';
import { GoogleAuthStrategy } from '../infrastructure/strategies/google-auth.strategy';

describe('Authentication Flow Integration', () => {
  let strategyContext: AuthStrategyContext;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthStrategyContext,
        LoginStrategy,
        RegisterStrategy,
        ForgotPasswordStrategy,
        TwoFactorStrategy,
        GoogleAuthStrategy
      ]
    });

    strategyContext = TestBed.inject(AuthStrategyContext);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Complete Login Flow', () => {
    it('should handle successful login without 2FA', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      };

      strategyContext.executeStrategy('login', credentials).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.user).toEqual(jasmine.objectContaining({
          id: 1,
          email: 'test@example.com'
        }));
        expect(result.token).toBe('mock-jwt-token');
        expect(result.refreshToken).toBe('mock-refresh-token');
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      });
      req.flush(mockResponse);
    });

    it('should handle login with 2FA requirement', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        requiresTwoFA: true,
        sessionId: 'session-123',
        user: {
          id: 1,
          email: 'test@example.com',
          createdAt: new Date().toISOString()
        }
      };

      strategyContext.executeStrategy('login', credentials).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.requiresTwoFA).toBe(true);
        expect(result.sessionId).toBe('session-123');
        expect(result.user?.id).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle login failure', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      strategyContext.executeStrategy('login', credentials).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid email or password');
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Complete Registration Flow', () => {
    it('should handle successful registration', (done) => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        acceptTerms: true
      };

      const mockResponse = {
        user: {
          id: 2,
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          createdAt: new Date().toISOString()
        },
        token: 'new-user-token',
        refreshToken: 'new-user-refresh-token',
        emailVerificationRequired: true
      };

      strategyContext.executeStrategy('register', userData).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.user?.email).toBe('newuser@example.com');
        expect(result.token).toBe('new-user-token');
        done();
      });

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        acceptTerms: true
      });
      req.flush(mockResponse);
    });

    it('should reject registration with missing required fields', (done) => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123'
        // Missing firstName, lastName, acceptTerms
      };

      strategyContext.executeStrategy('register', invalidData).subscribe({
        error: (error) => {
          expect(error.message).toContain('cannot handle');
          done();
        }
      });
    });
  });

  describe('Complete 2FA Flow', () => {
    it('should handle 2FA setup', (done) => {
      const setupData = { setup: true };

      const mockResponse = {
        qrCode: 'data:image/png;base64,mock-qr-code',
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['12345678', '87654321', '11111111']
      };

      strategyContext.executeStrategy('two-factor', setupData).subscribe(result => {
        expect(result.success).toBe(true);
        expect((result.metadata as any).qrCode).toBe('data:image/png;base64,mock-qr-code');
        expect((result.metadata as any).secret).toBe('JBSWY3DPEHPK3PXP');
        expect((result.metadata as any).backupCodes).toEqual(['12345678', '87654321', '11111111']);
        done();
      });

      const req = httpMock.expectOne('/api/auth/2fa/setup');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle 2FA verification', (done) => {
      const verifyData = {
        code: '123456',
        sessionId: 'session-123'
      };

      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          createdAt: new Date().toISOString()
        },
        token: 'verified-token',
        refreshToken: 'verified-refresh-token'
      };

      strategyContext.executeStrategy('two-factor', verifyData).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.user?.id).toBe(1);
        expect(result.token).toBe('verified-token');
        done();
      });

      const req = httpMock.expectOne('/api/auth/2fa/verify');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        code: '123456',
        sessionId: 'session-123',
        rememberDevice: false
      });
      req.flush(mockResponse);
    });
  });

  describe('Complete Password Reset Flow', () => {
    it('should handle forgot password request', (done) => {
      const resetData = {
        email: 'test@example.com'
      };

      const mockResponse = {
        resetToken: 'reset-token-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        emailSent: true
      };

      strategyContext.executeStrategy('forgot-password', resetData).subscribe(result => {
        expect(result.success).toBe(true);
        expect((result.metadata as any).emailSent).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/auth/forgot-password');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        resetUrl: jasmine.any(String)
      });
      req.flush(mockResponse);
    });
  });

  describe('Complete Google Auth Flow', () => {
    it('should handle Google OAuth callback', (done) => {
      const googleData = {
        authorizationCode: 'google-auth-code-123',
        redirectUri: 'http://localhost:4200/auth/google-callback'
      };

      const mockResponse = {
        user: {
          id: 3,
          email: 'googleuser@example.com',
          firstName: 'Google',
          lastName: 'User',
          createdAt: new Date().toISOString()
        },
        token: 'google-token',
        refreshToken: 'google-refresh-token'
      };

      strategyContext.executeStrategy('google-auth', googleData).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.user?.email).toBe('googleuser@example.com');
        expect(result.token).toBe('google-token');
        done();
      });

      const req = httpMock.expectOne('/api/auth/google/callback');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        code: 'google-auth-code-123',
        redirectUri: 'http://localhost:4200/auth/google-callback'
      });
      req.flush(mockResponse);
    });

    it('should provide Google OAuth URL', () => {
      const googleUrl = strategyContext.getGoogleAuthUrl();
      expect(googleUrl).toContain('/api/auth/google/auth-url');
      expect(googleUrl).toContain('redirectUri');
      expect(googleUrl).toContain('scope');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      strategyContext.executeStrategy('login', credentials).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.error(new ErrorEvent('network error'), { status: 0 });
    });

    it('should handle server errors', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      strategyContext.executeStrategy('login', credentials).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Server error');
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle timeout errors', (done) => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      strategyContext.executeStrategy('login', credentials).subscribe({
        error: (error) => {
          expect(error.message).toContain('timed out');
          done();
        }
      });

      // Don't flush the request to simulate timeout
    });
  });
});