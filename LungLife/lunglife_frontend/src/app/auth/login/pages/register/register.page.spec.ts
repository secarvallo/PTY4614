import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { RegisterPage } from './register.page';
import { PasswordSecurityResult, SecurityValidationResult } from './register.interface';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockLoadingController: jasmine.SpyObj<LoadingController>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockAlertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const loadingControllerSpy = jasmine.createSpyObj('LoadingController', ['create']);
    const toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    const alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [
        RegisterPage,
        IonicModule.forRoot(),
        ReactiveFormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: LoadingController, useValue: loadingControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: AlertController, useValue: alertControllerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockLoadingController = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
    mockToastController = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
    mockAlertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;

    // Mock loading controller
    const loadingSpy = jasmine.createSpyObj('HTMLIonLoadingElement', ['present', 'dismiss']);
    mockLoadingController.create.and.returnValue(Promise.resolve(loadingSpy));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.registerForm.get('nombre')?.value).toBe('');
      expect(component.registerForm.get('email')?.value).toBe('');
      expect(component.registerForm.get('password')?.value).toBe('');
      expect(component.registerForm.get('acceptTerms')?.value).toBeFalse();
      expect(component.registerForm.get('acceptPrivacy')?.value).toBeFalse();
    });

    it('should have required validators', () => {
      const nombreControl = component.registerForm.get('nombre');
      const emailControl = component.registerForm.get('email');
      const passwordControl = component.registerForm.get('password');

      nombreControl?.setValue('');
      emailControl?.setValue('');
      passwordControl?.setValue('');

      expect(nombreControl?.hasError('required')).toBeTruthy();
      expect(emailControl?.hasError('required')).toBeTruthy();
      expect(passwordControl?.hasError('required')).toBeTruthy();
    });
  });

  describe('Password strength calculation', () => {
    it('should calculate weak password strength', () => {
      const result = component['calculatePasswordStrength']('12345');
      expect(result.strength).toBe('weak');
      expect(result.isValid).toBeFalse();
    });

    it('should calculate medium password strength', () => {
      const result = component['calculatePasswordStrength']('Password123');
      expect(result.strength).toBe('medium');
      expect(result.checks.uppercase).toBeTruthy();
      expect(result.checks.lowercase).toBeTruthy();
      expect(result.checks.number).toBeTruthy();
    });

    it('should calculate strong password strength', () => {
      const result = component['calculatePasswordStrength']('Password123!@#');
      expect(result.strength).toBe('strong');
      expect(result.isValid).toBeTruthy();
      expect(result.checks.special).toBeTruthy();
    });
  });

  describe('Password security status', () => {
    it('should not show security indicator for short passwords', () => {
      component.registerForm.get('password')?.setValue('ab');
      fixture.detectChanges();
      
      const status = component.passwordSecurityStatus();
      expect(status.show).toBeFalse();
    });

    it('should show warning for weak passwords', () => {
      component.registerForm.get('password')?.setValue('password');
      fixture.detectChanges();
      
      const status = component.passwordSecurityStatus();
      expect(status.show).toBeTruthy();
      expect(status.level).toBe('weak');
      expect(status.color).toBe('warning');
    });

    it('should show success for strong passwords', () => {
      component.registerForm.get('password')?.setValue('StrongP@ssw0rd!');
      fixture.detectChanges();
      
      const status = component.passwordSecurityStatus();
      expect(status.show).toBeTruthy();
      expect(status.level).toBe('strong');
      expect(status.color).toBe('success');
    });
  });

  describe('Form validation', () => {
    it('should validate email format', () => {
      const emailControl = component.registerForm.get('email');
      
      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTruthy();
      
      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBeFalsy();
    });

    it('should validate password confirmation', () => {
      component.registerForm.get('password')?.setValue('Password123!');
      component.registerForm.get('confirmPassword')?.setValue('DifferentPassword');
      
      expect(component.registerForm.hasError('passwordMismatch')).toBeTruthy();
      
      component.registerForm.get('confirmPassword')?.setValue('Password123!');
      expect(component.registerForm.hasError('passwordMismatch')).toBeFalsy();
    });

    it('should require terms and privacy acceptance', () => {
      const termsControl = component.registerForm.get('acceptTerms');
      const privacyControl = component.registerForm.get('acceptPrivacy');
      
      expect(termsControl?.hasError('required')).toBeTruthy();
      expect(privacyControl?.hasError('required')).toBeTruthy();
      
      termsControl?.setValue(true);
      privacyControl?.setValue(true);
      
      expect(termsControl?.hasError('required')).toBeFalsy();
      expect(privacyControl?.hasError('required')).toBeFalsy();
    });
  });

  describe('UI interactions', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword()).toBeFalse();
      component.togglePassword();
      expect(component.showPassword()).toBeTruthy();
      component.togglePassword();
      expect(component.showPassword()).toBeFalse();
    });

    it('should toggle confirm password visibility', () => {
      expect(component.showConfirmPassword()).toBeFalse();
      component.toggleConfirmPassword();
      expect(component.showConfirmPassword()).toBeTruthy();
      component.toggleConfirmPassword();
      expect(component.showConfirmPassword()).toBeFalse();
    });

    it('should identify invalid fields correctly', () => {
      const nombreControl = component.registerForm.get('nombre');
      nombreControl?.setValue('');
      nombreControl?.markAsTouched();
      
      expect(component.isFieldInvalid('nombre')).toBeTruthy();
      
      nombreControl?.setValue('John');
      expect(component.isFieldInvalid('nombre')).toBeFalsy();
    });
  });

  describe('Input sanitization', () => {
    it('should sanitize malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>test@email.com';
      const sanitized = component['advancedSanitizeInput'](maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toBe('test@email.com');
    });

    it('should handle empty input', () => {
      expect(component['advancedSanitizeInput']('')).toBe('');
      expect(component['advancedSanitizeInput']('   ')).toBe('');
    });

    it('should preserve valid input', () => {
      const validInput = 'John Doe';
      expect(component['advancedSanitizeInput'](validInput)).toBe(validInput);
    });
  });

  describe('Security features', () => {
    it('should mask email for logging', () => {
      const email = 'test@example.com';
      const masked = component['maskEmail'](email);
      
      expect(masked).toBe('te***@example.com');
      expect(masked).not.toBe(email);
    });

    it('should handle invalid email in masking', () => {
      expect(component['maskEmail']('invalid-email')).toBe('invalid-email');
      expect(component['maskEmail']('')).toBe('');
    });
  });

  describe('Component state', () => {
    it('should initialize signals with correct default values', () => {
      expect(component.showPassword()).toBeFalse();
      expect(component.showConfirmPassword()).toBeFalse();
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();
      expect(component.isRateLimited()).toBeFalse();
      expect(component.breachCheckInProgress()).toBeFalse();
      expect(component.securityWarnings()).toEqual([]);
    });

    it('should compute canSubmit correctly', () => {
      // Initially false (form invalid)
      expect(component.canSubmit()).toBeFalse();
      
      // Fill form with valid data
      component.registerForm.patchValue({
        nombre: 'John',
        email: 'john@example.com',
        password: 'StrongP@ssw0rd!',
        confirmPassword: 'StrongP@ssw0rd!',
        acceptTerms: true,
        acceptPrivacy: true
      });
      
      fixture.detectChanges();
      
      // Should be true with valid form
      expect(component.canSubmit()).toBeTruthy();
    });
  });
});