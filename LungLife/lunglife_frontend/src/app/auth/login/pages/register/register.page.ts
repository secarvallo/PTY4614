import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { passwordConfirmationValidator } from '../../../validators/password-confirmation.validator';
import {
  RegisterFormData,
  RegisterRequestData,
  PasswordChecks,
  PasswordStrengthResult,
  RegisterApiResponse
} from './register.interface';

type UserRole = 'PATIENT' | 'DOCTOR';

const ROLE_DISPLAY: Record<UserRole, { label: string; description: string }> = {
  PATIENT: {
    label: 'Paciente',
    description: 'Accede a evaluaciones respiratorias y seguimiento personalizado de tu salud.'
  },
  DOCTOR: {
    label: 'Médico',
    description: 'Gestiona a tus pacientes, revisa estudios respiratorios y comparte recomendaciones.'
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrls: [
    '../../../auth.styles.scss',
    '../../../../theme/shared-layout.scss',
    './register.page.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPage implements OnInit, OnDestroy {

  // Servicios inyectados
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private http = inject(HttpClient);

  // UI State Signals
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  isRateLimited = signal(false);

  // Password strength
  passwordStrength = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return this.calculatePasswordStrength(password);
  });

  // Password security status for visual indicator
  passwordSecurityStatus = computed(() => {
    const strength = this.passwordStrength();
    const password = this.registerForm?.get('password')?.value || '';

    // No mostrar indicador si no hay contraseña
    if (!password || password.length < 3) {
      return { show: false, color: '', level: '', cssClass: '' };
    }

    // Mapear strength a los colores y animaciones de Ionic
    const statusMap = {
      weak: {
        color: 'warning',
        level: 'weak',
        cssClass: 'pulse-warning',
        show: true
      },
      medium: {
        color: 'tertiary',
        level: 'medium',
        cssClass: 'pulse-tertiary',
        show: true
      },
      strong: {
        color: 'success',
        level: 'strong',
        cssClass: 'pulse-success',
        show: true
      }
    };

    return statusMap[strength.strength] || { show: false, color: '', level: '', cssClass: '' };
  });

  // Getter para template compatibility
  get passwordChecks() {
    const strength = this.passwordStrength();
    return strength.checks;
  }

  // Role selection coming from role-selection page
  selectedRole = signal<UserRole | null>(null);
  roleDisplayInfo = computed(() => {
    const role = this.selectedRole();
    return role ? ROLE_DISPLAY[role] : null;
  });

  // Form con validador personalizado para confirmación de contraseña
  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellido: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]],
    acceptPrivacy: [false, [Validators.requiredTrue]],
    acceptMarketing: [false]
  }, {
    validators: [passwordConfirmationValidator()] // Validador a nivel de FormGroup
  });

  private destroy$ = new Subject<void>();

  // Form validation computed signals
  isFormValid = computed(() => this.registerForm?.valid ?? false);
  canSubmit = computed(() => this.isFormValid() && !this.loading());

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const roleParam = (params.get('role') || '').toUpperCase();
        if (roleParam === 'PATIENT' || roleParam === 'DOCTOR') {
          this.selectedRole.set(roleParam as UserRole);
        } else {
          this.selectedRole.set(null);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Password strength calculation
  private calculatePasswordStrength(password: string): PasswordStrengthResult {
    const checks: PasswordChecks = {
      minLength: password.length >= 8 && password.length <= 128,
      maxLength: password.length <= 128,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
    };

    const score = Object.values(checks).filter(check => check).length;

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 6) strength = 'strong';
    else if (score >= 4) strength = 'medium';

    return {
      score,
      strength,
      checks,
      isValid: checks.minLength && checks.uppercase && checks.lowercase &&
        checks.number && checks.special
    };
  }

  // UI Event Handlers
  togglePassword() {
    this.showPassword.update(current => !current);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(current => !current);
  }

  // Validation helper
  isFieldInvalid(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // Método eliminado: validatePasswordConfirmation()
  // Ahora se usa el validador personalizado passwordConfirmationValidator a nivel de FormGroup

  // Main registration flow
  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      this.markAllFieldsAsTouched();
      return;
    }

    await this.performRegistration();
  }

  // Registration method
  private async performRegistration(): Promise<void> {
    const formData = this.registerForm.value as RegisterFormData;

    const loading = await this.loadingController.create({
      message: 'Creando tu cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    this.loading.set(true);
    this.error.set(null);

    try {
      const sanitizedData: RegisterRequestData = {
        nombre: formData.nombre.trim(),
        apellido: (formData.apellido || '').trim(),
        email: formData.email.trim(),
        telefono: (formData.telefono || '').trim(),
        password: formData.password,
        acceptTerms: formData.acceptTerms,
        acceptPrivacy: formData.acceptPrivacy,
        acceptMarketing: formData.acceptMarketing
      };

      const result = await this.http.post<RegisterApiResponse>(`${environment.apiUrl}/auth/register`, sanitizedData).toPromise();

      await loading.dismiss();
      this.loading.set(false);

      if (result?.success) {
        await this.showSuccessMessage();
        await this.navigateToRoleSelection(result);
      } else {
        this.error.set(result?.error || 'Error durante el registro');
      }

    } catch (error: any) {
      await loading.dismiss();
      this.loading.set(false);

      // Handle specific error cases
      if (error?.status === 429) {
        this.error.set('Demasiados intentos. Intenta nuevamente en unos minutos.');
        this.isRateLimited.set(true);
      } else if (error?.status === 409) {
        this.error.set('Ya existe una cuenta con este email.');
      } else {
        this.error.set('Error inesperado durante el registro');
      }
    }
  }

  // UI Helpers
  private async showSuccessMessage(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Cuenta creada exitosamente! Revisa tu email para verificar tu cuenta.',
      duration: 4000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }

  private async navigateToRoleSelection(result: any): Promise<void> {
    const email = this.registerForm.get('email')?.value;
    this.router.navigate(['/auth/role-selection'], {
      queryParams: { email }
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const ctrl = this.registerForm.get(key);
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });
  }

  // Alias para compatibilidad con el template existente
  onRegister(): Promise<void> {
    return this.onSubmit();
  }
}