import {AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';

import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonProgressBar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  calendar,
  camera,
  checkmarkCircle,
  closeCircle,
  create,
  logOut,
  mail,
  pencil,
  person,
  save
} from 'ionicons/icons';

import {AuthService} from '../../services/auth.service';
import {LoadingService} from '../../services/loading.service';
import {ToastService} from '../../services/toast.service';
import {AnimationService} from '../../services/animation.service';
import {ConfirmationService} from '../../services/confirmation.service';
import {SkeletonComponent} from '../../components/skeleton/skeleton.component';
import {User} from '../../models/user.model';
import {AppConstants} from '../../utils/constants';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBackButton,
    IonButtons,
    IonText,
    IonAvatar,
    IonFabButton,
    IonProgressBar,
    SkeletonComponent
]
})
export class ProfilePage implements OnInit, AfterViewInit {
  @ViewChild('profileCard', {read: ElementRef}) profileCard!: ElementRef;
  @ViewChild('profileForm', {read: ElementRef}) profileFormElement!: ElementRef;

  // Services
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly toastService = inject(ToastService);
  private readonly animationService = inject(AnimationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly isEditing = signal(false);
  readonly showSkeleton = signal(true);
  readonly currentUser = signal<User | null>(null);
  readonly profileLoading = this.loadingService.profileLoading$;

  // Form setup (renamed to avoid collision with template ref variable)
  readonly profileFormGroup = this.formBuilder.group({
    name: ['', [
      Validators.required,
      Validators.minLength(AppConstants.VALIDATION.NAME.MIN_LENGTH),
      Validators.maxLength(AppConstants.VALIDATION.NAME.MAX_LENGTH)
    ]],
    email: ['', [
      Validators.required,
      Validators.email
    ]],
    phone: ['', [
      Validators.pattern(/^[0-9+\-\s()]*$/)
    ]]
  });

  constructor() {
    addIcons({
      calendar, create, logOut, mail, person, save,
      camera, checkmarkCircle, closeCircle, pencil
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  ngAfterViewInit() {
    // Animate profile card entrance
    if (this.profileCard?.nativeElement) {
      this.animationService.slideInRight({
        element: this.profileCard.nativeElement,
        duration: 500,
        delay: 300
      }).play();
    }
  }

  /**
   * Load user profile with enhanced UX
   */
  private async loadUserProfile(): Promise<void> {
    try {
      this.loadingService.startLoading('profile', 'Cargando perfil...');

      // Simulate progressive loading
      await new Promise(resolve => setTimeout(resolve, 800));
      this.loadingService.updateProgress('profile', 50, 'Obteniendo datos...');

      const user = this.authService.getCurrentUser();
      this.currentUser.set(user);

      if (user) {
        this.profileFormGroup.patchValue({
          name: user.name,
          email: user.email,
          phone: user.phone || ''
        });

        // Email is read-only
        this.profileFormGroup.get('email')?.disable();
        this.profileFormGroup.get('name')?.disable();
        this.profileFormGroup.get('phone')?.disable();
      }

      await new Promise(resolve => setTimeout(resolve, 600));
      this.showSkeleton.set(false);

    } catch (error) {
      await this.toastService.showError('Error al cargar el perfil');
    } finally {
      this.loadingService.stopLoading('profile');
    }
  }

  /**
   * Enable editing mode with animation
   */
  async enableEditing(): Promise<void> {
    this.isEditing.set(true);
    this.profileFormGroup.get('name')?.enable();
    this.profileFormGroup.get('phone')?.enable();

    // Animate form fields
    if (this.profileFormElement?.nativeElement) {
      this.animationService.pulse({
        element: this.profileFormElement.nativeElement,
        duration: 300,
        iterations: 1
      }).play();
    }

    await this.toastService.showInfo('Modo edición activado');
  }

  /**
   * Cancel editing with confirmation if there are unsaved changes
   */
  async cancelEditing(): Promise<void> {
    if (this.profileFormGroup.dirty) {
      const confirmed = await this.confirmationService.confirmUnsavedChanges();
      if (!confirmed) {
        return;
      }
    }

    this.isEditing.set(false);
    this.loadUserProfile();
    this.profileFormGroup.get('email')?.disable();

    await this.toastService.showInfo('Edición cancelada');
  }

  /**
   * Save profile changes with enhanced feedback
   */
  async saveProfile(): Promise<void> {
    if (this.profileFormGroup.invalid) {
      await this.handleFormErrors();
      return;
    }

    if (!this.profileFormGroup.dirty) {
      await this.toastService.showInfo('No hay cambios para guardar');
      this.isEditing.set(false);
      return;
    }

    try {
      this.isLoading.set(true);
      this.loadingService.startLoading('profile', 'Guardando cambios...');

      const profileData = {
        name: this.profileFormGroup.value.name || undefined,
        phone: this.profileFormGroup.value.phone || undefined
      } as { name?: string; phone?: string };

      // Clean undefined values
      Object.keys(profileData).forEach(key => {
        if (profileData[key as keyof typeof profileData] === undefined) {
          delete profileData[key as keyof typeof profileData];
        }
      });

      // Progressive saving feedback
      setTimeout(() => {
        this.loadingService.updateProgress('profile', 60, 'Validando datos...');
      }, 500);

      setTimeout(() => {
        this.loadingService.updateProgress('profile', 90, 'Actualizando perfil...');
      }, 1000);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update current user data with proper type safety
      const updatedUser: User = {
        ...this.currentUser()!,
        name: profileData.name || this.currentUser()!.name,
        phone: profileData.phone || this.currentUser()!.phone
      };
      this.currentUser.set(updatedUser);

      this.isEditing.set(false);
      this.profileFormGroup.markAsPristine();
      this.profileFormGroup.get('name')?.disable();
      this.profileFormGroup.get('phone')?.disable();

      // Success animation
      if (this.profileCard?.nativeElement) {
        this.animationService.bounce({
          element: this.profileCard.nativeElement,
          duration: 500
        }).play();
      }

      await this.toastService.showSuccess('Perfil actualizado correctamente');

    } catch (error) {
      await this.handleSaveError(error);
    } finally {
      this.isLoading.set(false);
      this.loadingService.stopLoading('profile');
    }
  }

  /**
   * Handle form validation errors
   */
  private async handleFormErrors(): Promise<void> {
    if (this.profileFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.profileFormElement.nativeElement,
        duration: 500
      }).play();
    }

    const nameControl = this.profileFormGroup.get('name');
    const phoneControl = this.profileFormGroup.get('phone');

    if (nameControl?.hasError('required')) {
      await this.toastService.showError('El nombre es requerido');
    } else if (nameControl?.hasError('minlength')) {
      await this.toastService.showError(`El nombre debe tener al menos ${AppConstants.VALIDATION.NAME.MIN_LENGTH} caracteres`);
    } else if (phoneControl?.hasError('pattern')) {
      await this.toastService.showError('El teléfono debe contener solo números y caracteres válidos');
    }
  }

  /**
   * Handle save errors
   */
  private async handleSaveError(error: any): Promise<void> {
    let errorMessage = 'Error al guardar los cambios. Intenta nuevamente.';

    if (error?.status === 422) {
      errorMessage = 'Los datos ingresados no son válidos.';
    } else if (error?.status === 409) {
      errorMessage = 'Ya existe un usuario con estos datos.';
    } else if (error?.status === 0) {
      errorMessage = 'Sin conexión a internet. Verifica tu conexión.';
    }

    await this.toastService.showError(errorMessage);

    if (this.profileFormElement?.nativeElement) {
      this.animationService.shake({
        element: this.profileFormElement.nativeElement
      }).play();
    }
  }

  /**
   * Logout with confirmation
   */
  async logout(): Promise<void> {
    const confirmed = await this.confirmationService.confirmLogout();

    if (confirmed) {
      try {
        await this.authService.logout();
        await this.toastService.showSuccess('Sesión cerrada correctamente');
      } catch (error) {
        await this.toastService.showError('Error al cerrar sesión');
      }
    }
  }

  /**
   * Delete account with confirmation
   */
  async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmationService.confirmDelete('tu cuenta');

    if (confirmed) {
      try {
        this.loadingService.startLoading('profile', 'Eliminando cuenta...');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        await this.toastService.showSuccess('Cuenta eliminada correctamente');
        await this.authService.logout();

      } catch (error) {
        await this.toastService.showError('Error al eliminar la cuenta');
      } finally {
        this.loadingService.stopLoading('profile');
      }
    }
  }

  /**
   * Format creation date
   */
  getFormattedDate(dateString?: string): string {
    if (!dateString) return 'No disponible';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Getters for template
  get nameErrors() {
    const control = this.profileFormGroup.get('name');
    return control?.errors && control?.touched;
  }

  get phoneErrors() {
    const control = this.profileFormGroup.get('phone');
    return control?.errors && control?.touched;
  }

  get hasUnsavedChanges() {
    return this.profileFormGroup.dirty;
  }
}
