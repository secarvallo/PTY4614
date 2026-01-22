import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPage } from './forgot.page';
import { AuthFacadeService } from '../../../core/services';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

describe('ForgotPage', () => {
  let component: ForgotPage;
  let fixture: ComponentFixture<ForgotPage>;
  let mockAuthFacade: jasmine.SpyObj<AuthFacadeService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authFacadeSpy = jasmine.createSpyObj('AuthFacadeService', ['forgotPassword']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ForgotPage, IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: AuthFacadeService, useValue: authFacadeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPage);
    component = fixture.componentInstance;
    mockAuthFacade = TestBed.inject(AuthFacadeService) as jasmine.SpyObj<AuthFacadeService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form state', () => {
    expect(component.state.email).toBe('');
    expect(component.state.isLoading).toBeFalse();
    expect(component.state.message).toBe('');
    expect(component.state.isSuccess).toBeFalse();
    expect(Object.keys(component.state.validationErrors).length).toBe(0);
  });

  describe('Email validation', () => {
    it('should show error for empty email', async () => {
      component.email = '';
      await component.onSubmit();
      
      expect(component.state.validationErrors.email).toBe('Por favor ingresa tu correo electrónico');
      expect(component.state.isSuccess).toBeFalse();
    });

    it('should show error for invalid email format', async () => {
      component.email = 'invalid-email';
      await component.onSubmit();
      
      expect(component.state.validationErrors.email).toBe('El formato del correo electrónico no es válido');
      expect(component.state.isSuccess).toBeFalse();
    });

    it('should accept valid email format', async () => {
      const validEmail = 'test@example.com';
      mockAuthFacade.forgotPassword.and.returnValue(of({ success: true }));
      
      component.email = validEmail;
      await component.onSubmit();
      
      expect(component.state.validationErrors.email).toBeUndefined();
      expect(mockAuthFacade.forgotPassword).toHaveBeenCalledWith({ email: validEmail });
    });
  });

  describe('Form submission', () => {
    beforeEach(() => {
      component.email = 'test@example.com';
    });

    it('should show loading state during submission', async () => {
      mockAuthFacade.forgotPassword.and.returnValue(of({ success: true }));
      
      const submitPromise = component.onSubmit();
      expect(component.state.isLoading).toBeTruthy();
      
      await submitPromise;
      expect(component.state.isLoading).toBeFalsy();
    });

    it('should handle successful password reset', async () => {
      mockAuthFacade.forgotPassword.and.returnValue(of({ success: true }));
      
      await component.onSubmit();
      
      expect(component.state.isSuccess).toBeTruthy();
      expect(component.state.message).toContain('Se ha enviado un enlace de recuperación');
    });

    it('should handle failed password reset', async () => {
      mockAuthFacade.forgotPassword.and.returnValue(of({ 
        success: false, 
        error: 'Email not found' 
      }));
      
      await component.onSubmit();
      
      expect(component.state.isSuccess).toBeFalsy();
      expect(component.state.message).toBe('Email not found');
    });

    it('should handle network errors', async () => {
      mockAuthFacade.forgotPassword.and.returnValue(throwError('Network error'));
      
      await component.onSubmit();
      
      expect(component.state.isSuccess).toBeFalsy();
      expect(component.state.message).toBe('Ocurrió un error. Por favor, intenta nuevamente.');
    });
  });

  describe('Navigation', () => {
    it('should navigate to login page', () => {
      component.goToLogin();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Template binding', () => {
    it('should update email via setter', () => {
      const testEmail = 'test@example.com';
      component.email = testEmail;
      
      expect(component.state.email).toBe(testEmail);
    });

    it('should provide access to state properties', () => {
      expect(component.email).toBe(component.state.email);
      expect(component.isLoading).toBe(component.state.isLoading);
      expect(component.message).toBe(component.state.message);
      expect(component.isSuccess).toBe(component.state.isSuccess);
    });
  });
});