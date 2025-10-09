import {AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';

import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {eye, eyeOff, lockClosed, logIn, mail} from 'ionicons/icons';

import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {SkeletonComponent} from '../../components/skeleton/skeleton.component';
import {LoginCredentials} from '../../models/auth.model';
import {CustomValidators} from '../../utils/validators';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonProgressBar,
    SkeletonComponent
]
})
export class LoginPage implements OnInit, AfterViewInit {
  @ViewChild('loginCard', {read: ElementRef}) loginCard!: ElementRef;
  // Renamed ViewChild to match template reference variable (#loginFormRef)
  @ViewChild('loginFormRef', {read: ElementRef}) loginFormElement!: ElementRef;

  // Services
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly animationService = inject(AnimationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly showSkeleton = signal(true);
  readonly showPassword = signal(false);
  readonly authLoading = this.loadingService.authLoading$;

  // Form setup (renamed to avoid collision with template ref variable)
  readonly loginFormGroup = this.formBuilder.group({
    email: ['', [
      Validators.required,
      Validators.email,
      CustomValidators.email
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(6)
    ]]
  });

  constructor() {
    addIcons({eye, eyeOff, lockClosed, logIn, mail});
  }

  ngOnInit() {
    this.initializePage();
  }

  ngAfterViewInit() {
    // Animate login card entrance
    if (this.loginCard?.nativeElement) {
      this.animationService.scaleIn({
        element: this.loginCard.nativeElement,
        duration: 500,
        delay: 300
      }).play();
    }
  }

  /**
   * Initialize page with skeleton loading
   */
  private async initializePage() {
    this.loadingService.startLoading('auth', 'Inicializando...');

    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.showSkeleton.set(false);
    this.loadingService.stopLoading('auth');
  }

  /**
   * Enhanced login method with UX improvements
   */
  async onLogin() {
    if (this.loginFormGroup.invalid) {
      this.handleFormErrors();
      return;
    }

    try {
      this.isLoading.set(true);
      this.loadingService.startLoading('auth', 'Iniciando sesión...');

      const credentials: LoginCredentials = this.loginFormGroup.value as LoginCredentials;

      // Simulate network delay for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await this.authService.login(credentials).toPromise();

      if (response?.success) {
        await this.toastService.showSuccess('¡Bienvenido de vuelta!');

        // Animate success before navigation
        if (this.loginCard?.nativeElement) {
          await this.animationService.fadeOut({
            element: this.loginCard.nativeElement,
            duration: 300
          }).play();
        }

        // CORRECTED FLOW: Always redirect to dashboard after successful login
        await this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      await this.handleLoginError(error);
    } finally {
      this.isLoading.set(false);
      this.loadingService.stopLoading('auth');
    }
  }

  /**
   * Handle form validation errors with animations
   */
  private async handleFormErrors() {
    const firstErrorField = this.getFirstErrorField();

    if (firstErrorField && this.loginFormElement?.nativeElement) {
      // Shake animation for visual feedback
      this.animationService.shake({
        element: this.loginFormElement.nativeElement,
        duration: 500
      }).play();
    }

    // Show specific error messages
    if (this.loginFormGroup.get('email')?.hasError('required')) {
      await this.toastService.showError('El email es requerido');
    } else if (this.loginFormGroup.get('email')?.hasError('email')) {
      await this.toastService.showError('Ingresa un email válido');
    } else if (this.loginFormGroup.get('password')?.hasError('required')) {
      await this.toastService.showError('La contraseña es requerida');
    } else if (this.loginFormGroup.get('password')?.hasError('minlength')) {
      await this.toastService.showError('La contraseña debe tener al menos 6 caracteres');
    }
  }

  /**
   * Handle login errors with appropriate feedback
   */
  private async handleLoginError(error: any) {
    let errorMessage = 'Error al iniciar sesión. Intenta nuevamente.';

    if (error?.status === 401) {
      errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
    } else if (error?.status === 429) {
      errorMessage = 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    } else if (error?.status === 0) {
      errorMessage = 'Sin conexión a internet. Verifica tu conexión.';
    }

    await this.toastService.showError(errorMessage);

    // Shake form on error
    if (this.loginFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.loginFormElement.nativeElement
      }).play();
    }
  }

  /**
   * Get first field with validation error
   */
  private getFirstErrorField(): string | null {
    const controls = this.loginFormGroup.controls;
    for (const [key, control] of Object.entries(controls)) {
      if (control.invalid && control.touched) {
        return key;
      }
    }
    return null;
  }

  /**
   * Toggle password visibility with animation
   */
  togglePasswordVisibility() {
    this.showPassword.update(show => !show);
  }

  /**
   * Navigate to registration with animation
   */
  async navigateToRegister() {
    if (this.loginCard?.nativeElement) {
      await this.animationService.slideOutLeft({
        element: this.loginCard.nativeElement,
        duration: 300
      }).play();
    }

    await this.router.navigate(['/register']);
  }

  /**
   * Navigate to forgot password
   */
  async navigateToForgotPassword() {
    await this.router.navigate(['/forgot-pass']);
  }

  // Getters for template
  get emailErrors() {
    const control = this.loginFormGroup.get('email');
    return control?.errors && control?.touched;
  }

  get passwordErrors() {
    const control = this.loginFormGroup.get('password');
    return control?.errors && control?.touched;
  }

  get isFormValid() {
    return this.loginFormGroup.valid;
  }
}
