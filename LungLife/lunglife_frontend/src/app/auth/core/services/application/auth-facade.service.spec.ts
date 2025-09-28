import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthFacadeService } from './auth-facade.service';
import { AuthStrategyContext } from './auth-strategy-context.service';
import { AuthResult } from '../interfaces/auth-strategy.interface';

describe('AuthFacadeService', () => {
  let service: AuthFacadeService;
  let strategyContext: jasmine.SpyObj<AuthStrategyContext>;

  beforeEach(() => {
    const strategyContextSpy = jasmine.createSpyObj('AuthStrategyContext', [
      'executeStrategy',
      'getGoogleAuthUrl'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthFacadeService,
        { provide: AuthStrategyContext, useValue: strategyContextSpy }
      ]
    });

    service = TestBed.inject(AuthFacadeService);
    strategyContext = TestBed.inject(AuthStrategyContext) as jasmine.SpyObj<AuthStrategyContext>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should execute login strategy and handle success', (done) => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const mockResult: AuthResult = {
        success: true,
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-token'
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.login(credentials).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('login', credentials);
        done();
      });
    });

    it('should handle login error', (done) => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      const mockError = new Error('Invalid credentials');

      strategyContext.executeStrategy.and.returnValue(throwError(mockError));

      service.login(credentials).subscribe({
        error: (error) => {
          expect(error).toBe(mockError);
          done();
        }
      });
    });
  });

  describe('register', () => {
    it('should execute register strategy and handle success', (done) => {
      const userData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
        acceptTerms: true
      };
      const mockResult: AuthResult = {
        success: true,
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-token'
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.register(userData).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('register', userData);
        done();
      });
    });
  });

  describe('loginWithGoogle', () => {
    it('should execute google-auth strategy', (done) => {
      const googleData = { authorizationCode: 'code123' };
      const mockResult: AuthResult = {
        success: true,
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-token'
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.loginWithGoogle(googleData).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('google-auth', googleData);
        done();
      });
    });
  });

  describe('forgotPassword', () => {
    it('should execute forgot-password strategy', (done) => {
      const data = { email: 'test@example.com' };
      const mockResult: AuthResult = {
        success: true,
        metadata: { emailSent: true } as any
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.forgotPassword(data).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('forgot-password', data);
        done();
      });
    });
  });

  describe('verify2FA', () => {
    it('should execute two-factor strategy for verification', (done) => {
      const data = { code: '123456', sessionId: 'session123' };
      const mockResult: AuthResult = {
        success: true,
        user: { id: 1, email: 'test@example.com' },
        token: 'mock-token'
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.verify2FA(data).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('two-factor', data);
        done();
      });
    });
  });

  describe('setup2FA', () => {
    it('should execute two-factor strategy for setup', (done) => {
      const mockResult: AuthResult = {
        success: true,
        metadata: {
          qrCode: 'mock-qr-code',
          secret: 'mock-secret',
          backupCodes: ['code1', 'code2']
        } as any
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.setup2FA().subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('two-factor', { setup: true });
        done();
      });
    });
  });

  describe('disable2FA', () => {
    it('should execute two-factor strategy for disabling', (done) => {
      const password = 'current-password';
      const mockResult: AuthResult = {
        success: true
      };

      strategyContext.executeStrategy.and.returnValue(of(mockResult));

      service.disable2FA(password).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(strategyContext.executeStrategy).toHaveBeenCalledWith('two-factor', {
          disable: true,
          password
        });
        done();
      });
    });
  });

  describe('logout', () => {
    it('should clear authentication state', () => {
      // Set some initial state
      service['authState'].value.user$.next({
        id: 1,
        email: 'test@example.com',
        createdAt: new Date()
      });
      service['authState'].value.isAuthenticated$.next(true);

      service.logout();

      expect(service['authState'].value.user$.value).toBeNull();
      expect(service['authState'].value.isAuthenticated$.value).toBe(false);
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should return Google auth URL from strategy context', () => {
      const mockUrl = 'https://accounts.google.com/oauth/authorize?client_id=123';
      strategyContext.getGoogleAuthUrl.and.returnValue(mockUrl);

      const url = service.getGoogleAuthUrl();
      expect(url).toBe(mockUrl);
      expect(strategyContext.getGoogleAuthUrl).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        createdAt: new Date()
      };
      service['authState'].value.user$.next(mockUser);

      const user = service.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user is authenticated', () => {
      service['authState'].value.user$.next(null);

      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('getAuthState', () => {
    it('should return auth state observables', () => {
      const authState = service.getAuthState();

      expect(authState.isAuthenticated$).toBeDefined();
      expect(authState.loading$).toBeDefined();
      expect(authState.error$).toBeDefined();
      expect(authState.requiresTwoFA$).toBeDefined();
      expect(authState.user$).toBeDefined();
    });
  });
});