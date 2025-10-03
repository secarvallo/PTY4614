import {AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {checkmarkCircle, eye, eyeOff, lockClosed, mail, person, personAdd} from 'ionicons/icons';

import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {SkeletonComponent} from '../../components/skeleton/skeleton.component';
import {RegisterCredentials} from '../../models/auth.model';
import {CustomValidators} from '../../utils/validators';
import {AppConstants} from '../../utils/constants';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonInput, IonButton, IonSpinner,
    IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
    IonProgressBar, IonCheckbox, IonLabel, SkeletonComponent
  ]
})
export class RegisterPage implements OnInit, AfterViewInit {
  @ViewChild('registerCard', {read: ElementRef}) registerCard!: ElementRef;
  @ViewChild('registerForm', {read: ElementRef}) registerFormElement!: ElementRef;

  // Services
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly animationService = inject(AnimationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly showSkeleton = signal(true);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly acceptTerms = signal(false);
  readonly authLoading = this.loadingService.authLoading$;

  // Enhanced form setup with better validation (renamed to avoid collision with template ref)
  readonly registerFormGroup = this.formBuilder.group({
    name: ['', [
      Validators.required,
      Validators.minLength(AppConstants.VALIDATION.NAME.MIN_LENGTH),
      Validators.maxLength(AppConstants.VALIDATION.NAME.MAX_LENGTH),
      CustomValidators.noNumbers
    ]],
    email: ['', [
      Validators.required,
      Validators.email,
      CustomValidators.email
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(AppConstants.VALIDATION.PASSWORD.MIN_LENGTH),
      Validators.pattern(AppConstants.VALIDATION.PASSWORD.PATTERN)
    ]],
    confirmPassword: ['', [
      Validators.required
    ]]
  }, {
    validators: [CustomValidators.passwordMatch('password', 'confirmPassword')]
  });

  constructor() {
    addIcons({
      eye, eyeOff, lockClosed, person, mail, personAdd, checkmarkCircle
    });
  }

  ngOnInit() {
    this.initializePage();
  }

  ngAfterViewInit() {
    // Animate register card entrance
    if (this.registerCard?.nativeElement) {
      this.animationService.scaleIn({
        element: this.registerCard.nativeElement,
        duration: 600,
        delay: 400
      }).play();
    }
  }

  /**
   * Initialize page with skeleton loading
   */
  private async initializePage() {
    this.loadingService.startLoading('auth', 'Preparando formulario...');

    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 1200));

    this.showSkeleton.set(false);
    this.loadingService.stopLoading('auth');
  }

  /**
   * Enhanced registration method with UX improvements
   */
  async onRegister() {
    if (this.registerFormGroup.invalid) {
      this.handleFormErrors();
      return;
    }

    if (!this.acceptTerms()) {
      await this.toastService.showWarning('Debes aceptar los términos y condiciones');
      return;
    }

    try {
      this.isLoading.set(true);
      this.loadingService.startLoading('auth', 'Creando tu cuenta...');

      const credentials: RegisterCredentials = {
        name: this.registerFormGroup.value.name!,
        email: this.registerFormGroup.value.email!,
        password: this.registerFormGroup.value.password!
      };

      // Progressive loading feedback
      setTimeout(() => {
        this.loadingService.updateProgress('auth', 30, 'Validando información...');
      }, 500);

      setTimeout(() => {
        this.loadingService.updateProgress('auth', 60, 'Creando usuario...');
      }, 1000);

      setTimeout(() => {
        this.loadingService.updateProgress('auth', 90, 'Finalizando registro...');
      }, 1500);

      const response = await this.authService.register(credentials).toPromise();

      if (response?.success) {
        await this.toastService.showSuccess('¡Cuenta creada exitosamente! Bienvenido a LungLife.');

        // Animate success before navigation
        if (this.registerCard?.nativeElement) {
          await this.animationService.fadeOut({
            element: this.registerCard.nativeElement,
            duration: 400
          }).play();
        }

        // CORRECTED FLOW: Redirect to Dashboard after successful registration
        await this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      await this.handleRegisterError(error);
    } finally {
      this.isLoading.set(false);
      this.loadingService.stopLoading('auth');
    }
  }

  /**
   * Handle form validation errors with animations and specific messages
   */
  private async handleFormErrors() {
    if (this.registerFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.registerFormElement.nativeElement,
        duration: 600
      }).play();
    }

    // Show specific validation messages
    const nameControl = this.registerFormGroup.get('name');
    const emailControl = this.registerFormGroup.get('email');
    const passwordControl = this.registerFormGroup.get('password');

    if (nameControl?.hasError('required')) {
      await this.toastService.showError('El nombre es requerido');
    } else if (nameControl?.hasError('minlength')) {
      await this.toastService.showError(`El nombre debe tener al menos ${AppConstants.VALIDATION.NAME.MIN_LENGTH} caracteres`);
    } else if (nameControl?.hasError('noNumbers')) {
      await this.toastService.showError('El nombre no puede contener números');
    } else if (emailControl?.hasError('required')) {
      await this.toastService.showError('El email es requerido');
    } else if (emailControl?.hasError('email')) {
      await this.toastService.showError('Ingresa un email válido');
    } else if (passwordControl?.hasError('required')) {
      await this.toastService.showError('La contraseña es requerida');
    } else if (passwordControl?.hasError('minlength')) {
      await this.toastService.showError(`La contraseña debe tener al menos ${AppConstants.VALIDATION.PASSWORD.MIN_LENGTH} caracteres`);
    } else if (passwordControl?.hasError('pattern')) {
      await this.toastService.showError('La contraseña debe incluir mayúsculas, minúsculas y números');
    } else if (this.registerFormGroup.hasError('passwordMismatch')) {
      await this.toastService.showError('Las contraseñas no coinciden');
    }
  }

  /**
   * Handle registration errors with appropriate feedback
   */
  private async handleRegisterError(error: any) {
    let errorMessage = 'Error al crear la cuenta. Intenta nuevamente.';

    if (error?.status === 409) {
      errorMessage = 'Este email ya está registrado. Intenta con otro email.';
    } else if (error?.status === 422) {
      errorMessage = 'Los datos ingresados no son válidos. Verifica la información.';
    } else if (error?.status === 429) {
      errorMessage = 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    } else if (error?.status === 0) {
      errorMessage = 'Sin conexión a internet. Verifica tu conexión.';
    }

    await this.toastService.showError(errorMessage);

    if (this.registerFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.registerFormElement.nativeElement
      }).play();
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(show => !show);
  }

  /**
   * Navigate to login with animation
   */
  async navigateToLogin() {
    if (this.registerCard?.nativeElement) {
      await this.animationService.slideOutRight({
        element: this.registerCard.nativeElement,
        duration: 300
      }).play();
    }

    await this.router.navigate(['/login']);
  }

  /**
   * Toggle terms acceptance
   */
  toggleTerms() {
    this.acceptTerms.update(accepted => !accepted);
  }

  // Getters for template
  get nameErrors() {
    const control = this.registerFormGroup.get('name');
    return control?.errors && control?.touched;
  }

  get emailErrors() {
    const control = this.registerFormGroup.get('email');
    return control?.errors && control?.touched;
  }

  get passwordErrors() {
    const control = this.registerFormGroup.get('password');
    return control?.errors && control?.touched;
  }

  get confirmPasswordErrors() {
    const control = this.registerFormGroup.get('confirmPassword');
    return (control?.errors && control?.touched) || this.registerFormGroup.hasError('passwordMismatch');
  }

  get isFormValid() {
    return this.registerFormGroup.valid && this.acceptTerms();
  }

  // Getter for password control used in template to avoid direct get calls (requested change)
  get passwordControl() {
    return this.registerFormGroup.get('password');
  }

  get passwordStrength() {
    const password = this.passwordControl?.value || '';
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return strength;
  }

  get passwordStrengthText() {
    const strength = this.passwordStrength;
    if (strength <= 1) return 'Muy débil';
    if (strength === 2) return 'Débil';
    if (strength === 3) return 'Media';
    if (strength === 4) return 'Fuerte';
    return 'Muy fuerte';
  }

  get passwordStrengthColor() {
    const strength = this.passwordStrength;
    if (strength <= 1) return 'danger';
    if (strength === 2) return 'warning';
    if (strength === 3) return 'medium';
    if (strength >= 4) return 'success';
    return 'medium';
  }
}
