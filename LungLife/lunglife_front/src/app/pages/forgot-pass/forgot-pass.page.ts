import {AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';

import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
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
  IonSkeletonText,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {arrowBack, checkmark, lockClosed, mail, send} from 'ionicons/icons';

import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {CustomValidators} from '../../utils/validators';

@Component({
  selector: 'app-forgot-pass',
  templateUrl: './forgot-pass.page.html',
  styleUrls: ['./forgot-pass.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonProgressBar,
    IonSkeletonText
]
})
export class ForgotPassPage implements OnInit, AfterViewInit {
  @ViewChild('forgotCard', {read: ElementRef}) forgotCard!: ElementRef;
  // Align ViewChild with template reference (#forgotFormRef)
  @ViewChild('forgotFormRef', {read: ElementRef}) forgotFormElement!: ElementRef;

  // Services
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly animationService = inject(AnimationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly showSkeleton = signal(true);
  readonly emailSent = signal(false);
  readonly authLoading = this.loadingService.authLoading$;

  // Form setup (renamed to avoid collision with template ref variable)
  readonly forgotFormGroup = this.formBuilder.group({
    email: ['', [
      Validators.required,
      Validators.email,
      CustomValidators.email
    ]]
  });

  constructor() {
    addIcons({arrowBack, checkmark, mail, lockClosed, send});
  }

  ngOnInit() {
    this.initializePage();
  }

  ngAfterViewInit() {
    // Animate card entrance
    if (this.forgotCard?.nativeElement) {
      this.animationService.fadeIn({
        element: this.forgotCard.nativeElement,
        duration: 600,
        delay: 300
      }).play();
    }
  }

  /**
   * Initialize page with skeleton loading
   */
  private async initializePage() {
    this.loadingService.startLoading('auth', 'Preparando formulario...');

    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 800));

    this.showSkeleton.set(false);
    this.loadingService.stopLoading('auth');
  }

  /**
   * Send password reset email with enhanced UX
   */
  async onSubmit() {
    if (this.forgotFormGroup.invalid) {
      await this.handleFormErrors();
      return;
    }

    try {
      this.isLoading.set(true);
      this.loadingService.startLoading('auth', 'Enviando correo...');

      const email = this.forgotFormGroup.value.email!;

      // Progressive loading feedback
      setTimeout(() => {
        this.loadingService.updateProgress('auth', 40, 'Validando email...');
      }, 500);

      setTimeout(() => {
        this.loadingService.updateProgress('auth', 70, 'Generando enlace...');
      }, 1000);

      setTimeout(() => {
        this.loadingService.updateProgress('auth', 95, 'Enviando correo...');
      }, 1500);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success state
      this.emailSent.set(true);

      // Success animation
      if (this.forgotCard?.nativeElement) {
        this.animationService.bounce({
          element: this.forgotCard.nativeElement,
          duration: 600
        }).play();
      }

      await this.toastService.showSuccess(
        `Se ha enviado un enlace de recuperación a ${email}`
      );

    } catch (error) {
      await this.handleSubmitError(error);
    } finally {
      this.isLoading.set(false);
      this.loadingService.stopLoading('auth');
    }
  }

  /**
   * Handle form validation errors
   */
  private async handleFormErrors() {
    if (this.forgotFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.forgotFormElement.nativeElement,
        duration: 500
      }).play();
    }

    const emailControl = this.forgotFormGroup.get('email');

    if (emailControl?.hasError('required')) {
      await this.toastService.showError('El email es requerido');
    } else if (emailControl?.hasError('email')) {
      await this.toastService.showError('Ingresa un email válido');
    }
  }

  /**
   * Handle submission errors
   */
  private async handleSubmitError(error: any) {
    let errorMessage = 'Error al enviar el correo. Intenta nuevamente.';

    if (error?.status === 404) {
      errorMessage = 'No existe una cuenta con este email.';
    } else if (error?.status === 429) {
      errorMessage = 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    } else if (error?.status === 0) {
      errorMessage = 'Sin conexión a internet. Verifica tu conexión.';
    }

    await this.toastService.showError(errorMessage);

    if (this.forgotFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.forgotFormElement.nativeElement
      }).play();
    }
  }

  /**
   * Resend email with cooldown
   */
  async resendEmail() {
    if (this.forgotFormGroup.valid) {
      await this.onSubmit();
    }
  }

  /**
   * Navigate back to login
   */
  async navigateToLogin() {
    if (this.forgotCard?.nativeElement) {
      await this.animationService.slideOutLeft({
        element: this.forgotCard.nativeElement,
        duration: 300
      }).play();
    }

    await this.router.navigate(['/login']);
  }

  // Getters for template
  get emailErrors() {
    const control = this.forgotFormGroup.get('email');
    return control?.errors && control?.touched;
  }

  get isFormValid() {
    return this.forgotFormGroup.valid;
  }
}
