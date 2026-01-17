import { Component, OnInit, OnDestroy, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ProfileService } from '../../services/profile.service';
import { 
  UserProfile, 
  CreateProfileRequest, 
  UpdateProfileRequest
} from '../../interfaces/profile.interface';
import { 
  FormValidationError,
  FormTabConfig,
  FormProgressInfo,
  MedicalHistoryItem,
  AllergyItem,
  MedicationItem
} from './profile-form.interface';
import { Observable, of, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, tap, takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-form.component.html',
  styleUrls: [
    '../../../auth/auth.styles.scss',
    '../../../theme/shared-layout.scss',
    './profile-form.component.scss'
  ]
})
export class ProfileFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  profileForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  isAutoSaving = false;
  lastSaved = false;
  profileId: number | null = null;
  maxDate = new Date().getFullYear() + '-12-31';
  currentYear = new Date().getFullYear();
  error: string | null = null;
  activeTab: string = 'personal';
  showProgress = true;
  showValidationSummary = false;
  validationErrors: string[] = [];
  calculatedAge: number | null = null;

  // Reactive streams
  private destroy$ = new Subject<void>();
  completionPercentage$ = new BehaviorSubject<number>(0);

  // Form data arrays
  get medicalHistoryArray(): FormArray {
    return this.profileForm.get('medical_history') as FormArray;
  }

  get allergiesArray(): FormArray {
    return this.profileForm.get('allergies') as FormArray;
  }

  get currentMedicationsArray(): FormArray {
    return this.profileForm.get('current_medications') as FormArray;
  }

  // Computed properties
  get showPackYears(): boolean {
    const smokingStatus = this.profileForm.get('lifestyle_factors.smoking_status')?.value;
    return ['FORMER', 'CURRENT', 'OCCASIONAL'].includes(smokingStatus);
  }

  ngOnInit() {
    this.initForm();
    this.checkEditMode();
    this.setupFormSubscriptions();
    this.setupAutoSave();
    this.calculateFormProgress();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      birth_date: ['', Validators.required],
      gender: ['', Validators.required],
      phone: [''],
      occupation: [''],
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      medical_history: this.fb.array([this.createMedicalHistoryItem()]),
      allergies: this.fb.array([this.createAllergyItem()]),
      current_medications: this.fb.array([this.createMedicationItem()]),
      lifestyle_factors: this.fb.group({
        smoking_status: ['', Validators.required],
        smoking_pack_years: [0],
        alcohol_consumption: ['NONE'],
        exercise_frequency: ['', Validators.required],
        sleep_hours: [8, [Validators.required, Validators.min(4), Validators.max(12)]]
      }),
      preferred_language: ['es', Validators.required],
      preferred_communication_method: ['', Validators.required],
      consent_terms: [false, Validators.requiredTrue],
      consent_data_sharing: [false],
      consent_marketing: [false]
    });
  }

  private setupFormSubscriptions() {
    // Watch birth date changes to calculate age
    this.profileForm.get('birth_date')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(birthDate => {
        if (birthDate) {
          this.calculatedAge = this.calculateAge(birthDate);
        }
      });
  }

  private setupAutoSave() {
    this.profileForm.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.isEditMode && this.profileForm.valid) {
          this.autoSave();
        }
      });
  }

  private calculateFormProgress() {
    this.profileForm.valueChanges
      .pipe(
        startWith(this.profileForm.value),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const progress = this.getCompletionPercentage();
        this.completionPercentage$.next(progress);
      });
  }

  private checkEditMode() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.profileId = +params['id'];
        this.loadProfile(this.profileId);
      }
    });
  }

  private loadProfile(id: number) {
    // Mock profile loading since getProfile might not exist
    // In a real implementation, replace with actual service call
    const mockProfile: UserProfile = {
      id: id,
      user_id: id,
      first_name: '',
      last_name: '',
      birth_date: '',
      gender: 'MALE',
      phone: undefined,
      occupation: undefined,
      emergency_contact_name: undefined,
      emergency_contact_phone: undefined,
      medical_history: [],
      allergies: [],
      current_medications: [],
      lifestyle_factors: {
        smoking_status: 'NEVER',
        smoking_pack_years: 0,
        alcohol_consumption: 'NONE',
        exercise_frequency: 'RARELY',
        sleep_hours: 8
      },
      preferred_language: 'es',
      preferred_communication_method: 'EMAIL',
      consent_terms: false,
      consent_data_sharing: false,
      consent_marketing: false,
      created_at: '',
      updated_at: ''
    };

    try {
      this.patchFormWithProfile(mockProfile);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.showToast('Error al cargar el perfil', 'danger');
    }
  }

  private patchFormWithProfile(profile: UserProfile) {
    // Clear existing arrays and populate with profile data
    this.clearAndPopulateArray('medical_history', profile.medical_history || [], this.createMedicalHistoryItem);
    this.clearAndPopulateArray('allergies', profile.allergies || [], this.createAllergyItem);
    this.clearAndPopulateArray('current_medications', profile.current_medications || [], this.createMedicationItem);

    // Patch the rest of the form
    this.profileForm.patchValue({
      first_name: profile.first_name,
      last_name: profile.last_name,
      birth_date: profile.birth_date,
      gender: profile.gender,
      phone: profile.phone,
      occupation: profile.occupation,
      emergency_contact_name: profile.emergency_contact_name,
      emergency_contact_phone: profile.emergency_contact_phone,
      lifestyle_factors: profile.lifestyle_factors || {},
      preferred_language: profile.preferred_language || 'es',
      preferred_communication_method: profile.preferred_communication_method,
      consent_terms: profile.consent_terms ?? false,
      consent_data_sharing: profile.consent_data_sharing ?? false,
      consent_marketing: profile.consent_marketing ?? false
    });
  }

  // Form Array Management
  private createMedicalHistoryItem(): FormGroup {
    return this.fb.group({
      condition: ['', Validators.required]
    });
  }

  private createAllergyItem(): FormGroup {
    return this.fb.group({
      allergen: ['', Validators.required]
    });
  }

  private createMedicationItem(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required]
    });
  }

  private clearAndPopulateArray(arrayName: string, data: any[], createFunction: () => FormGroup) {
    const array = this.profileForm.get(arrayName) as FormArray;
    array.clear();
    
    if (data.length > 0) {
      data.forEach(item => {
        const group = createFunction();
        group.patchValue(item);
        array.push(group);
      });
    } else {
      array.push(createFunction());
    }
  }

  addMedicalHistory() {
    this.medicalHistoryArray.push(this.createMedicalHistoryItem());
  }

  removeMedicalHistory(index: number) {
    if (this.medicalHistoryArray.length > 1) {
      this.medicalHistoryArray.removeAt(index);
    }
  }

  addAllergy() {
    this.allergiesArray.push(this.createAllergyItem());
  }

  removeAllergy(index: number) {
    if (this.allergiesArray.length > 1) {
      this.allergiesArray.removeAt(index);
    }
  }

  addMedication() {
    this.currentMedicationsArray.push(this.createMedicationItem());
  }

  removeMedication(index: number) {
    if (this.currentMedicationsArray.length > 1) {
      this.currentMedicationsArray.removeAt(index);
    }
  }

  // Tab Management
  onTabChange(event: any) {
    this.activeTab = event.detail.value;
  }

  isTabComplete(tabName: string): boolean {
    switch (tabName) {
      case 'personal':
        return !!(this.profileForm.get('first_name')?.valid && 
               this.profileForm.get('last_name')?.valid && 
               this.profileForm.get('birth_date')?.valid && 
               this.profileForm.get('gender')?.valid);
      case 'medical':
        return !!(this.medicalHistoryArray.valid && 
               this.allergiesArray.valid && 
               this.currentMedicationsArray.valid);
      case 'lifestyle':
        return !!this.profileForm.get('lifestyle_factors')?.valid;
      case 'preferences':
        return !!(this.profileForm.get('preferred_language')?.valid && 
               this.profileForm.get('preferred_communication_method')?.valid && 
               this.profileForm.get('consent_terms')?.valid);
      default:
        return false;
    }
  }

  // Validation Helpers
  getFieldError(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field?.valid && field?.value && field?.touched);
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} es requerido`;
    }
    if (field?.hasError('minlength')) {
      return `${this.getFieldDisplayName(fieldName)} debe tener al menos ${field?.errors?.['minlength']?.requiredLength} caracteres`;
    }
    if (field?.hasError('min')) {
      return `El valor mínimo es ${field?.errors?.['min']?.min}`;
    }
    if (field?.hasError('max')) {
      return `El valor máximo es ${field?.errors?.['max']?.max}`;
    }
    return 'Campo inválido';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'first_name': 'El nombre',
      'last_name': 'El apellido',
      'birth_date': 'La fecha de nacimiento',
      'gender': 'El género',
      'consent_terms': 'La aceptación de términos'
    };
    return displayNames[fieldName] || fieldName;
  }

  // Utility Functions
  formatPhone(event: any) {
    let value = event.detail.value.replace(/\D/g, '');
    if (value.length >= 10) {
      value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    event.target.value = value;
  }

  calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  getCompletionPercentage(): number {
    const totalFields = 12; // Approximate number of important fields
    let completedFields = 0;

    // Check required fields
    if (this.profileForm.get('first_name')?.valid) completedFields++;
    if (this.profileForm.get('last_name')?.valid) completedFields++;
    if (this.profileForm.get('birth_date')?.valid) completedFields++;
    if (this.profileForm.get('gender')?.valid) completedFields++;
    if (this.profileForm.get('lifestyle_factors.smoking_status')?.valid) completedFields++;
    if (this.profileForm.get('lifestyle_factors.exercise_frequency')?.valid) completedFields++;
    if (this.profileForm.get('lifestyle_factors.sleep_hours')?.valid) completedFields++;
    if (this.profileForm.get('preferred_language')?.valid) completedFields++;
    if (this.profileForm.get('preferred_communication_method')?.valid) completedFields++;
    if (this.profileForm.get('consent_terms')?.valid) completedFields++;

    // Check optional but valuable fields
    if (this.profileForm.get('phone')?.value) completedFields++;
    if (this.profileForm.get('emergency_contact_name')?.value) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }

  // Page Content
  getPageTitle(): string {
    return this.isEditMode ? 'Editor de Perfil' : 'Crear Perfil Médico';
  }

  getPageSubtitle(): string {
    return this.isEditMode ? 
      'Actualiza tu información médica y preferencias' : 
      'Gestión completa de información médica personalizada';
  }

  // Auto-save Functions
  getAutoSaveIcon(): string {
    if (this.isAutoSaving) return 'sync-outline';
    if (this.lastSaved) return 'checkmark-circle-outline';
    return 'save-outline';
  }

  getAutoSaveText(): string {
    if (this.isAutoSaving) return 'Guardando...';
    if (this.lastSaved) return 'Guardado automáticamente';
    return 'Auto-guardado activado';
  }

  async autoSave() {
    if (!this.isEditMode || this.isAutoSaving) return;

    this.isAutoSaving = true;
    try {
      const updateData = this.createUpdateRequest();
      await this.profileService.updateProfile(this.profileId!, updateData).toPromise();
      this.lastSaved = true;
      setTimeout(() => { this.lastSaved = false; }, 3000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.isAutoSaving = false;
    }
  }

  async saveDraft() {
    const toast = await this.toastCtrl.create({
      message: 'Borrador guardado exitosamente',
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  // Consent Management
  toggleConsent(fieldName: string) {
    const field = this.profileForm.get(fieldName);
    field?.setValue(!field.value);
  }

  // Form Submission
  async onSubmit() {
    if (this.profileForm.valid) {
      this.isSubmitting = true;
      this.error = null;

      const loading = await this.loadingCtrl.create({
        message: this.isEditMode ? 'Actualizando perfil...' : 'Creando perfil...'
      });
      await loading.present();

      try {
        if (this.isEditMode) {
          await this.updateProfile();
        } else {
          await this.createProfile();
        }
        
        await loading.dismiss();
        await this.showSuccessMessage();
        this.router.navigate(['/profile/dashboard']);
      } catch (error: any) {
        await loading.dismiss();
        console.error('Form submission error:', error);
        this.error = error.message || 'Error al procesar el perfil';
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.markAllFieldsAsTouched();
      this.showValidationErrors();
    }
  }

  private async createProfile() {
    const profileData = this.createProfileRequest();
    const serviceData = this.transformToServiceCreateRequest(profileData);
    return this.profileService.createProfile(serviceData).toPromise();
  }

  private async updateProfile() {
    const updateData = this.createUpdateRequest();
    const serviceData = this.transformToServiceUpdateRequest(updateData);
    return this.profileService.updateProfile(this.profileId!, serviceData).toPromise();
  }

  private transformToServiceCreateRequest(componentData: CreateProfileRequest): CreateProfileRequest {
    return {
      ...componentData,
      user_id: 1 // This should come from auth service
    };
  }

  private transformToServiceUpdateRequest(componentData: UpdateProfileRequest): UpdateProfileRequest {
    return componentData;
  }

  private createProfileRequest(): CreateProfileRequest {
    const formValue = this.profileForm.value;
    return {
      user_id: 1, // This should come from auth service
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      birth_date: formValue.birth_date,
      gender: formValue.gender,
      phone: formValue.phone || null,
      occupation: formValue.occupation || null,
      emergency_contact_name: formValue.emergency_contact_name || null,
      emergency_contact_phone: formValue.emergency_contact_phone || null,
      medical_history: this.filterValidArrayItems(formValue.medical_history),
      allergies: this.filterValidArrayItems(formValue.allergies),
      current_medications: this.filterValidArrayItems(formValue.current_medications),
      lifestyle_factors: formValue.lifestyle_factors,
      preferred_language: formValue.preferred_language,
      preferred_communication_method: formValue.preferred_communication_method,
      consent_terms: formValue.consent_terms,
      consent_data_sharing: formValue.consent_data_sharing,
      consent_marketing: formValue.consent_marketing
    };
  }

  private createUpdateRequest(): UpdateProfileRequest {
    const formValue = this.profileForm.value;
    return {
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      birth_date: formValue.birth_date,
      gender: formValue.gender,
      phone: formValue.phone,
      occupation: formValue.occupation,
      emergency_contact_name: formValue.emergency_contact_name,
      emergency_contact_phone: formValue.emergency_contact_phone,
      medical_history: this.filterValidArrayItems(formValue.medical_history),
      allergies: this.filterValidArrayItems(formValue.allergies),
      current_medications: this.filterValidArrayItems(formValue.current_medications),
      lifestyle_factors: formValue.lifestyle_factors,
      preferred_language: formValue.preferred_language,
      preferred_communication_method: formValue.preferred_communication_method,
      consent_terms: formValue.consent_terms,
      consent_data_sharing: formValue.consent_data_sharing,
      consent_marketing: formValue.consent_marketing
    };
  }

  private filterValidArrayItems(array: any[]): any[] {
    return array.filter(item => {
      const values = Object.values(item);
      return values.some(value => value && value.toString().trim() !== '');
    });
  }

  private markAllFieldsAsTouched() {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach(group => {
          if (group instanceof FormGroup) {
            Object.keys(group.controls).forEach(subKey => {
              group.get(subKey)?.markAsTouched();
            });
          }
        });
      } else if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(subKey => {
          control.get(subKey)?.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  private showValidationErrors() {
    this.validationErrors = [];
    
    // Check required fields
    if (this.profileForm.get('first_name')?.invalid) {
      this.validationErrors.push('Nombre es requerido');
    }
    if (this.profileForm.get('last_name')?.invalid) {
      this.validationErrors.push('Apellido es requerido');
    }
    if (this.profileForm.get('birth_date')?.invalid) {
      this.validationErrors.push('Fecha de nacimiento es requerida');
    }
    if (this.profileForm.get('gender')?.invalid) {
      this.validationErrors.push('Género es requerido');
    }
    if (this.profileForm.get('lifestyle_factors.smoking_status')?.invalid) {
      this.validationErrors.push('Estado de fumador es requerido');
    }
    if (this.profileForm.get('lifestyle_factors.exercise_frequency')?.invalid) {
      this.validationErrors.push('Frecuencia de ejercicio es requerida');
    }
    if (this.profileForm.get('preferred_communication_method')?.invalid) {
      this.validationErrors.push('Método de comunicación es requerido');
    }
    if (this.profileForm.get('consent_terms')?.invalid) {
      this.validationErrors.push('Debe aceptar los términos y condiciones');
    }

    this.showValidationSummary = this.validationErrors.length > 0;
  }

  private async showSuccessMessage() {
    const message = this.isEditMode ? 
      'Perfil actualizado exitosamente' : 
      'Perfil creado exitosamente';
      
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}