import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {IonicModule, ToastController} from '@ionic/angular';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {addIcons} from 'ionicons';
import {moonOutline, shieldCheckmarkOutline, eyeOutline, eyeOffOutline, checkmarkCircle, closeCircle, informationCircleOutline, alertCircleOutline, shieldOutline, warning, alertCircle} from 'ionicons/icons';
import {CountryISO, NgxIntlTelInputModule, PhoneNumberFormat, SearchCountryField} from 'ngx-intl-tel-input';

interface PasswordSecurityResult {
  isSecure: boolean;
  securityLevel: 'weak' | 'medium' | 'strong';
  breachStatus: { isBreached: boolean };
  recommendations?: { message: string }[];
}

/**
 * Validador personalizado: Verifica que password y confirmPassword coincidan
 * Este validador se aplica a nivel de FormGroup
 */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  // Si ambos están vacíos, no validar (otros validadores se encargarán)
  if (!password || !confirmPassword) {
    return null;
  }

  // Si no coinciden, retornar error
  if (password !== confirmPassword) {
    return { passwordMismatch: true };
  }

  // Si coinciden, retornar null (válido)
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, NgxIntlTelInputModule, RouterModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toastCtrl = inject(ToastController);

  constructor() {
    // ✅ Icons restored - AnimationBuilder circular dependency fixed with provideAnimationsAsync()
    addIcons({moonOutline, shieldCheckmarkOutline, eyeOutline, eyeOffOutline, checkmarkCircle, closeCircle, informationCircleOutline, alertCircleOutline, shieldOutline, warning, alertCircle});
  }

  CountryISO = CountryISO;
  SearchCountryField = SearchCountryField;
  PhoneNumberFormat = PhoneNumberFormat;

  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  breachCheckInProgress = signal(false);
  passwordSecurityResult = signal<PasswordSecurityResult | null>(null);
  isRateLimited = signal(false);

  securityWarningsList = computed(() => this.passwordSecurityResult()?.recommendations?.map(r => r.message) ?? []);
  passwordSecurityLevel = computed(() => this.passwordSecurityResult()?.securityLevel ?? 'weak');
  isPasswordBreached = computed(() => this.passwordSecurityResult()?.breachStatus.isBreached ?? false);
  passwordStrength = computed(() => this.calculatePasswordStrength(this.registerForm?.get('password')?.value || ''));
  passwordSecurityStatus = computed(() => {
    const strength = this.passwordStrength();
    const password = this.registerForm?.get('password')?.value || '';
    if (!password || password.length < 3) return {show: false, color: '', level: '', cssClass: ''};
    const statusMap = {
      weak: {color: 'warning', level: 'weak', cssClass: 'pulse-warning', show: true},
      medium: {color: 'tertiary', level: 'medium', cssClass: 'pulse-tertiary', show: true},
      strong: {color: 'success', level: 'strong', cssClass: 'pulse-success', show: true}
    };
    return statusMap[strength.strength] || {show: false, color: '', level: '', cssClass: ''};
  });

  get passwordChecks() {
    return this.passwordStrength().checks;
  }

  /**
   * FormGroup Definition with Password Match Validator
   * ⚠️ CRÍTICO: El validador passwordMatchValidator se aplica a nivel de grupo
   * para verificar que password y confirmPassword coincidan
   */
  registerForm: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      fechaNacimiento: [''],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]],
      acceptMarketing: [false]
    },
    { validators: passwordMatchValidator } // ✅ Validador a nivel de grupo
  );

  ngOnInit() {
    this.setupPasswordSecurityChecks();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupPasswordSecurityChecks(): void {
    this.registerForm.get('password')?.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(password => {
      if (password && password.length >= 8) {
        this.checkPasswordSecurity(password);
      } else {
        this.passwordSecurityResult.set(null);
      }
    });
  }

  private async checkPasswordSecurity(password: string): Promise<void> {
    this.breachCheckInProgress.set(true);
    this.passwordSecurityResult.set(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result: PasswordSecurityResult = {
      isSecure: password.length >= 12,
      securityLevel: password.length > 12 ? 'strong' : (password.length >= 8 ? 'medium' : 'weak'),
      breachStatus: {isBreached: password.toLowerCase() === 'password123'},
      recommendations: password.length < 12 ? [{message: 'Para mayor seguridad, usa más de 12 caracteres.'}] : []
    };
    this.passwordSecurityResult.set(result);
    this.breachCheckInProgress.set(false);
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.markAllFieldsAsTouched();
      this.presentToast('Por favor, corrige los errores.', 'danger');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.presentToast('¡Cuenta creada!', 'success');
      await this.router.navigate(['/auth/login']);
    } catch (apiError: any) {
      this.error.set(apiError.message || 'Error inesperado.');
      await this.presentToast(this.error()!, 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  private calculatePasswordStrength(password: string) {
    const checks = {
      minLength: password.length >= 8 && password.length <= 128,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
    };
    const score = Object.values(checks).filter(Boolean).length;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';
    return {score, strength, checks};
  }

  togglePassword() {
    this.showPassword.update(current => !current);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(current => !current);
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  private markAllFieldsAsTouched(): void {
    this.registerForm.markAllAsTouched();
  }

  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({message, duration: 3000, color, position: 'top'});
    await toast.present();
  }

  getPhoneE164(): string | null {
    const phoneControl = this.registerForm.get('telefono');
    return phoneControl?.value?.e164Number || null;
  }

  get showPhoneSuccess(): boolean {
    const phoneControl = this.registerForm.get('telefono');
    return !!(phoneControl?.valid && phoneControl.value);
  }
}