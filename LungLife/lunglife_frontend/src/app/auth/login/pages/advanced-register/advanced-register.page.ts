import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AdvancedAuthService } from '../../../core/services/advanced-auth.service';
import { AuthValidators } from '../../../core/validators/auth-validators';

@Component({
  selector: 'app-advanced-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterLink],
  templateUrl: './advanced-register.page.html',
  styleUrls: ['./advanced-register.page.scss']
})
export class AdvancedRegisterPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AdvancedAuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  error: string | null = null;

  // Password validation checks
  passwordChecks = {
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  constructor() {
    // Actualizado para usar los campos de la nueva BD
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: [''],
      email: ['', [Validators.required, AuthValidators.advancedEmail()]],
      telefono: ['', [AuthValidators.phoneNumber()]],
      password: ['', [Validators.required, AuthValidators.strongPassword()]],
      confirmPassword: ['', [Validators.required, AuthValidators.confirmPassword('password')]],
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]],
      acceptMarketing: [false]
    });
  }

  ngOnInit() {
    // Monitor password changes for real-time validation
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.updatePasswordChecks(password);
    });

    // Suscribirse a errores del servicio
    this.authService.error$.subscribe((error: string | null) => {
      this.error = error;
    });

    // Suscribirse a estado de carga
    this.authService.loading$.subscribe((loading: boolean) => {
      this.loading = loading;
    });
  }

  // Add utility getters/methods referenced in template
  isFieldInvalid(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  private updatePasswordChecks(password: string) {
    const p = password || '';
    this.passwordChecks.minLength = p.length >= 8;
    this.passwordChecks.uppercase = /[A-Z]/.test(p);
    this.passwordChecks.lowercase = /[a-z]/.test(p);
    this.passwordChecks.number = /[0-9]/.test(p);
    this.passwordChecks.special = /[^A-Za-z0-9]/.test(p);
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.registerForm.controls).forEach(key => {
      const ctrl = this.registerForm.get(key);
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });
  }

  onRegister() {
    if (!this.registerForm.valid) {
      this.markAllFieldsAsTouched();
      return;
    }

    const registerData = {
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value,
      firstName: this.registerForm.get('nombre')?.value,
      lastName: this.registerForm.get('apellido')?.value || '',
      phone: this.registerForm.get('telefono')?.value || undefined,
      acceptTerms: this.registerForm.get('acceptTerms')?.value,
      acceptPrivacy: this.registerForm.get('acceptPrivacy')?.value
    };

    this.loading = true;
    this.error = null;

    this.authService.register(registerData).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response?.success) {
          // Si retorna acceso inmediato redirigir; de lo contrario a login
            this.router.navigate(['/dashboard']);
        } else {
          this.error = response?.error || 'No se pudo crear la cuenta';
        }
      },
      error: (err) => {
        this.loading = false;
        // El servicio ya puede establecer error$, pero añadimos fallback
        this.error = err?.error || err?.message || 'Error en registro';
      }
    });
  }
}
