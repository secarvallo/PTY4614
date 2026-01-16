/**
 * Login Page Unit Tests
 * 
 * Comprehensive test suite for the login component covering:
 * - Form validation and submission
 * - Two-factor authentication flow
 * - Rate limiting functionality
 * - Error handling and user feedback
 * - Security features and sanitization
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { LoginPage } from './login.page';
import { AuthFacadeService } from '../../../core/services';
import { LoggerService } from '../../../../core/services/logger.service';
import {
  LoginFormData,
  TwoFactorFormData,
  TwoFactorVerificationRequest,
  AuthResponse,
  RateLimitConfig,
  AlertConfig,
  LoadingConfig
} from './login.interface';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let mockAuthFacade: jasmine.SpyObj<AuthFacadeService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockLoadingController: jasmine.SpyObj<LoadingController>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  const mockAlert = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
  };

  const mockLoading = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
  };

  beforeEach(async () => {
    const authFacadeSpy = jasmine.createSpyObj('AuthFacadeService', [
      'login',
      'verify2FA',
      'getAuthState'
    ], {
      requiresTwoFA$: new BehaviorSubject(false),
      error$: new BehaviorSubject(null),
      loading$: new BehaviorSubject(false),
      isAuthenticated$: new BehaviorSubject(false)
    });

    const routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl'], {
      url: '/auth/login'
    });

    const alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);
    const loadingControllerSpy = jasmine.createSpyObj('LoadingController', ['create']);
    const loggerServiceSpy = jasmine.createSpyObj('LoggerService', ['log', 'error']);

    mockActivatedRoute = {
      snapshot: {
        queryParams: {},
        url: [],
        params: {},
        fragment: null,
        data: {},
        outlet: 'primary',
        component: null,
        routeConfig: null,
        root: {} as any,
        parent: null,
        firstChild: null,
        children: [],
        pathFromRoot: [],
        paramMap: jasmine.createSpyObj('ParamMap', ['get', 'has']),
        queryParamMap: jasmine.createSpyObj('ParamMap', ['get', 'has'])
      } as any
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage, ReactiveFormsModule, IonicModule.forRoot()],
      providers: [
        FormBuilder,
        { provide: AuthFacadeService, useValue: authFacadeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: LoadingController, useValue: loadingControllerSpy },
        { provide: LoggerService, useValue: loggerServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    
    mockAuthFacade = TestBed.inject(AuthFacadeService) as jasmine.SpyObj<AuthFacadeService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockAlertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    mockLoadingController = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
    mockLoggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;

    mockAlertController.create.and.returnValue(Promise.resolve(mockAlert as any));
    mockLoadingController.create.and.returnValue(Promise.resolve(mockLoading as any));
    
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.removeItem('lunglife_login_attempts');
    localStorage.removeItem('lunglife_login_last_attempt');
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms with correct validators', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.twoFactorForm).toBeDefined();
      expect(component.loginForm.get('email')).toBeTruthy();
      expect(component.loginForm.get('password')).toBeTruthy();
      expect(component.loginForm.get('rememberMe')).toBeTruthy();
      expect(component.twoFactorForm.get('code')).toBeTruthy();
    });

    it('should initialize signals with default values', () => {
      expect(component.loading()).toBeFalsy();
      expect(component.showPassword()).toBeFalsy();
      expect(component.requiresTwoFactor()).toBeFalsy();
      expect(component.showBackupCodeInput()).toBeFalsy();
      expect(component.backupCode()).toBe('');
      expect(component.error()).toBeNull();
      expect(component.isLoginRateLimited()).toBeFalsy();
    });

    it('should set up computed signals correctly', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(component.isFormValid()).toBeTruthy();
      expect(component.canSubmit()).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', () => {
      const emailControl = component.loginForm.get('email');
      
      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTruthy();
      
      emailControl?.setValue('test@example.com');
      expect(emailControl?.hasError('email')).toBeFalsy();
    });

    it('should require email and password', () => {
      const emailControl = component.loginForm.get('email');
      const passwordControl = component.loginForm.get('password');
      
      emailControl?.setValue('');
      passwordControl?.setValue('');
      
      expect(emailControl?.hasError('required')).toBeTruthy();
      expect(passwordControl?.hasError('required')).toBeTruthy();
      expect(component.loginForm.invalid).toBeTruthy();
    });

    it('should validate 2FA code format', () => {
      const codeControl = component.twoFactorForm.get('code');
      
      codeControl?.setValue('123');
      expect(codeControl?.hasError('twoFactorCode')).toBeTruthy();
      
      codeControl?.setValue('123456');
      expect(codeControl?.hasError('twoFactorCode')).toBeFalsy();
    });
  });

  describe('Login Flow', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      });
    });

    it('should submit login form with correct data', () => {
      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: false
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));
      mockRouter.navigateByUrl.and.returnValue(Promise.resolve(true));

      component.onLogin();

      expect(mockAuthFacade.login).toHaveBeenCalledWith(jasmine.objectContaining({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      }));
    });

    it('should handle successful login without 2FA', () => {
      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: false
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));
      mockRouter.navigateByUrl.and.returnValue(Promise.resolve(true));

      component.onLogin();

      expect(component['loginAttempts']()).toBe(0);
      expect(component.isLoginRateLimited()).toBeFalsy();
    });

    it('should handle login requiring 2FA', () => {
      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: true
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));

      component.onLogin();

      expect(mockAuthFacade.login).toHaveBeenCalled();
      // 2FA flow should be handled by auth facade signals
    });

    it('should sanitize email input', () => {
      component.loginForm.patchValue({
        email: '  TEST@EXAMPLE.COM  <script>',
        password: 'password123'
      });

      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: false
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));

      component.onLogin();

      expect(mockAuthFacade.login).toHaveBeenCalledWith(jasmine.objectContaining({
        email: 'test@example.com'
      }));
    });

    it('should not submit invalid form', () => {
      component.loginForm.patchValue({
        email: '',
        password: ''
      });

      component.onLogin();

      expect(mockAuthFacade.login).not.toHaveBeenCalled();
    });
  });

  describe('Two-Factor Authentication', () => {
    beforeEach(() => {
      component.twoFactorForm.patchValue({
        code: '123456'
      });
    });

    it('should submit 2FA verification with correct data', () => {
      const mockResponse: AuthResponse = {
        success: true
      };
      mockAuthFacade.verify2FA.and.returnValue(of(mockResponse));

      component.onVerify2FA();

      const expectedRequest: TwoFactorVerificationRequest = {
        code: '123456'
      };
      expect(mockAuthFacade.verify2FA).toHaveBeenCalledWith(expectedRequest);
    });

    it('should handle backup code verification', () => {
      component.backupCode.set('12345678');
      const mockResponse: AuthResponse = {
        success: true
      };
      mockAuthFacade.verify2FA.and.returnValue(of(mockResponse));

      component.verifyBackupCode();

      const expectedRequest: TwoFactorVerificationRequest = {
        code: '12345678',
        isBackupCode: true
      };
      expect(mockAuthFacade.verify2FA).toHaveBeenCalledWith(expectedRequest);
    });

    it('should cancel 2FA flow', () => {
      component.requiresTwoFactor.set(true);
      component.showBackupCodeInput.set(true);
      component.backupCode.set('test');
      component.error.set('test error');

      component.cancelTwoFactor();

      expect(component.requiresTwoFactor()).toBeFalsy();
      expect(component.showBackupCodeInput()).toBeFalsy();
      expect(component.backupCode()).toBe('');
      expect(component.error()).toBeNull();
      expect(component.twoFactorForm.pristine).toBeTruthy();
    });

    it('should toggle backup code input', () => {
      expect(component.showBackupCodeInput()).toBeFalsy();
      
      component.toggleBackupCodeInput();
      expect(component.showBackupCodeInput()).toBeTruthy();
      
      component.toggleBackupCodeInput();
      expect(component.showBackupCodeInput()).toBeFalsy();
    });
  });

  describe('Rate Limiting', () => {
    it('should track login attempts', () => {
      // Mock failed login
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
      mockAuthFacade.login.and.returnValue(throwError('Login failed'));

      component.onLogin();

      expect(component['loginAttempts']()).toBe(1);
    });

    it('should prevent login when rate limited', () => {
      // Set rate limit state
      component['loginAttempts'].set(5);
      component['lastLoginAttempt'].set(Date.now());
      component.isLoginRateLimited.set(true);

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      component.onLogin();

      expect(mockAuthFacade.login).not.toHaveBeenCalled();
      expect(component.error()).toContain('Demasiados intentos');
    });

    it('should reset rate limit after successful login', () => {
      component['loginAttempts'].set(3);
      component.isLoginRateLimited.set(false);
      
      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: false
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      component.onLogin();

      expect(component['loginAttempts']()).toBe(0);
      expect(component.isLoginRateLimited()).toBeFalsy();
    });

    it('should load rate limit state from localStorage', () => {
      const now = Date.now();
      localStorage.setItem('lunglife_login_attempts', '3');
      localStorage.setItem('lunglife_login_last_attempt', now.toString());

      component['loadLoginRateLimitState']();

      expect(component['loginAttempts']()).toBe(3);
      expect(component['lastLoginAttempt']()).toBe(now);
    });
  });

  describe('UI Interactions', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword()).toBeFalsy();
      
      component.togglePassword();
      expect(component.showPassword()).toBeTruthy();
      
      component.togglePassword();
      expect(component.showPassword()).toBeFalsy();
    });

    it('should show error alerts', async () => {
      await component['showErrorAlert']('Test error message');
      
      const expectedConfig: AlertConfig = {
        header: 'Login Failed',
        message: 'Test error message',
        buttons: ['OK'],
        cssClass: 'error-alert'
      };
      
      expect(mockAlertController.create).toHaveBeenCalledWith(expectedConfig);
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should show info alerts', async () => {
      await component['showInfoAlert']('Test Header', 'Test message');
      
      const expectedConfig: AlertConfig = {
        header: 'Test Header',
        message: 'Test message',
        buttons: ['OK'],
        cssClass: 'info-alert'
      };
      
      expect(mockAlertController.create).toHaveBeenCalledWith(expectedConfig);
      expect(mockAlert.present).toHaveBeenCalled();
    });
  });

  describe('Social Authentication', () => {
    it('should show info for Google login', async () => {
      spyOn(component, 'showInfoAlert' as any);
      
      component.loginWithGoogle();
      
      expect(component['showInfoAlert']).toHaveBeenCalledWith(
        'Google Login',
        'Google authentication will be implemented soon.'
      );
    });

    it('should show info for Apple login', async () => {
      spyOn(component, 'showInfoAlert' as any);
      
      component.loginWithApple();
      
      expect(component['showInfoAlert']).toHaveBeenCalledWith(
        'Apple Login',
        'Apple authentication will be implemented soon.'
      );
    });
  });

  describe('Enhanced Login', () => {
    it('should show loading during enhanced login', async () => {
      const mockResponse: AuthResponse = {
        success: true,
        requiresTwoFactor: false
      };
      mockAuthFacade.login.and.returnValue(of(mockResponse));
      
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      await component.onLoginEnhanced();

      const expectedLoadingConfig: LoadingConfig = {
        message: 'Signing in...',
        spinner: 'crescent'
      };
      
      expect(mockLoadingController.create).toHaveBeenCalledWith(expectedLoadingConfig);
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockLoading.dismiss).toHaveBeenCalled();
    });

    it('should handle enhanced login errors', async () => {
      mockAuthFacade.login.and.returnValue(throwError('Network error'));
      spyOn(component, 'showErrorAlert' as any);
      
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      await component.onLoginEnhanced();

      expect(component['showErrorAlert']).toHaveBeenCalledWith('An error occurred during login');
      expect(mockLoading.dismiss).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should sanitize email input to prevent XSS', () => {
      const maliciousEmail = 'test@example.com<script>alert("xss")</script>';
      const sanitized = component['sanitizeLoginEmail'](maliciousEmail);
      
      expect(sanitized).toBe('test@example.com');
      expect(sanitized).not.toContain('<script>');
    });

    it('should normalize email case and trim whitespace', () => {
      const email = '  TEST@EXAMPLE.COM  ';
      const sanitized = component['sanitizeLoginEmail'](email);
      
      expect(sanitized).toBe('test@example.com');
    });
  });

  describe('Navigation and Redirects', () => {
    it('should resolve return URL from query parameters', () => {
      const mockRoute = TestBed.inject(ActivatedRoute);
      (mockRoute.snapshot as any).queryParams = { returnUrl: '/profile' };
      
      component.ngOnInit();
      
      expect(component.returnUrl).toBe('/profile');
    });

    it('should use default redirect when no return URL specified', () => {
      expect(component.returnUrl).toBe('/auth/profile');
    });
  });

  describe('Component Lifecycle', () => {
    it('should subscribe to auth state changes on init', () => {
      expect(component['authState$']).toBeDefined();
    });

    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});