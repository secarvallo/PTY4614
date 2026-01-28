import { Component, OnInit, OnDestroy, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ProfileService, UserProfileResponse, PatientProfile, DoctorProfile, AdminProfile } from '../../services/profile.service';
import { MedicalHistoryService } from '../../services/medical-history.service';
import { LifestyleService } from '../../services/lifestyle.service';
import { AuthFacadeService } from '../../../auth/core/services/application/auth-facade.service';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { 
  UserProfile, 
  CreateProfileRequest, 
  UpdateProfileRequest
} from '../../interfaces/profile.interface';
import {
  Gender,
  SmokingStatus,
  AlcoholConsumption,
  ExerciseFrequency,
  CommunicationMethod
} from '../../interfaces/profile.enums';
import { Subject, BehaviorSubject, firstValueFrom } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IonicModule, RouterModule, LogoutButtonComponent],
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
  private medicalHistoryService = inject(MedicalHistoryService);
  private lifestyleService = inject(LifestyleService);
  private authFacade = inject(AuthFacadeService);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  profileForm!: FormGroup;
  isEditMode = false;
  isViewMode = true; // Modo visualización inicial
  isSubmitting = false;
  isAutoSaving = false;
  lastSaved = false;
  profileId: number | null = null;
  currentUserId: number | null = null; // User ID for medical history
  maxDate = new Date().getFullYear() + '-12-31';
  currentYear = new Date().getFullYear();
  error: string | null = null;
  activeTab: string = 'personal';
  showProgress = true;
  showValidationSummary = false;
  validationErrors: string[] = [];
  calculatedAge: number | null = null;

  // Role-based profile data
  userRole: string | null = null;
  userEmail: string | null = null;
  patientProfile: PatientProfile | null = null;
  doctorProfile: DoctorProfile | null = null;
  adminProfile: AdminProfile | null = null;
  isProfileLoading = true;
  profileLoadError: string | null = null;

  // Reactive streams
  private destroy$ = new Subject<void>();
  completionPercentage$ = new BehaviorSubject<number>(0);

  // Computed properties for role-based display
  get isPatient(): boolean {
    return this.userRole === 'PATIENT';
  }

  get isDoctor(): boolean {
    return this.userRole === 'DOCTOR';
  }

  get isAdmin(): boolean {
    return this.userRole === 'ADMINISTRATOR';
  }

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
    this.loadUserProfile(); // Cargar datos iniciales del usuario
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
      birth_date: [''],
      gender: [''],
      phone: [''],
      occupation: [''],
      emergency_contact_name: [''],
      emergency_contact_phone: [''],
      medical_history: this.fb.array([this.createMedicalHistoryItem()]),
      allergies: this.fb.array([this.createAllergyItem()]),
      current_medications: this.fb.array([this.createMedicationItem()]),
      lifestyle_factors: this.fb.group({
        smoking_status: ['NEVER'],
        smoking_pack_years: [0],
        alcohol_consumption: ['NONE'],
        exercise_frequency: ['RARELY'],
        sleep_hours: [8, [Validators.min(4), Validators.max(12)]]
      }),
      preferred_language: ['es'],
      preferred_communication_method: ['EMAIL'],
      consent_terms: [true],
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
        // Solo auto-guardar si está en modo edición y no en modo visualización
        if (!this.isViewMode && this.profileId && this.profileForm.valid) {
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

  /**
   * Carga el perfil del usuario actual según su rol
   * Usa el nuevo endpoint /api/profile/me que retorna datos específicos del rol
   */
  loadUserProfile() {
    this.isProfileLoading = true;
    this.profileLoadError = null;

    // Obtener el ID del usuario desde el servicio de autenticación
    const currentUser = this.authFacade.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      console.error('No hay usuario autenticado');
      this.router.navigate(['/login']);
      return;
    }
    
    const userId = currentUser.id;
    this.currentUserId = userId;
    this.profileId = userId;
    
    // Inicialmente mostrar en modo visualización
    this.isViewMode = true;

    // Usar el nuevo endpoint que obtiene perfil según rol
    this.profileService.getMyProfile().subscribe({
      next: (response: UserProfileResponse) => {
        console.log('[ProfileForm] Perfil cargado:', response);
        this.isProfileLoading = false;

        if (response.success && response.data) {
          // Guardar datos del usuario
          this.userEmail = response.data.user.email;
          this.userRole = response.data.user.role;

          // Guardar perfil específico según rol
          if (response.data.profile) {
            if (response.data.profile.type === 'PATIENT') {
              this.patientProfile = response.data.profile as PatientProfile;
              // Poblar formulario con datos del paciente
              this.patchFormWithPatientProfile(this.patientProfile);
              // Cargar historial médico y estilo de vida
              this.loadMedicalHistoryAndLifestyle();
            } else if (response.data.profile.type === 'DOCTOR') {
              this.doctorProfile = response.data.profile as DoctorProfile;
              // Los médicos no usan el formulario de paciente
              this.disableForm();
            } else if (response.data.profile.type === 'ADMINISTRATOR') {
              this.adminProfile = response.data.profile as AdminProfile;
              // Los administradores no usan el formulario de paciente
              this.disableForm();
            }
          } else {
            // No hay perfil específico, habilitar creación
            this.isViewMode = false;
            this.enableForm();
          }
        }
      },
      error: (error) => {
        console.error('[ProfileForm] Error cargando perfil:', error);
        this.isProfileLoading = false;
        this.profileLoadError = 'Error al cargar el perfil';
        
        // Fallback: intentar cargar con el método legacy
        this.loadProfile(userId);
      }
    });
  }

  /**
   * Pobla el formulario con datos del perfil de paciente
   */
  private patchFormWithPatientProfile(profile: PatientProfile): void {
    this.profileForm.patchValue({
      first_name: profile.firstName || '',
      last_name: profile.lastName || '',
      birth_date: profile.dateOfBirth || '',
      gender: profile.gender || '',
      phone: profile.phone || '',
      occupation: profile.occupation || '',
      emergency_contact_name: profile.emergencyContact?.name || '',
      emergency_contact_phone: profile.emergencyContact?.phone || ''
    });

    // Si tiene historial de tabaquismo, poblarlo
    if (profile.smokingHistory) {
      this.profileForm.get('lifestyle_factors')?.patchValue({
        smoking_status: profile.smokingHistory.status || 'NEVER'
      });
    }

    // Calcular edad si hay fecha de nacimiento
    if (profile.dateOfBirth) {
      this.calculatedAge = this.calculateAge(profile.dateOfBirth);
    }

    // Deshabilitar formulario en modo visualización
    if (this.isViewMode) {
      this.disableForm();
    }
  }

  /**
   * Activa el modo edición
   */
  enableEditMode() {
    this.isViewMode = false;
    // Habilitar todos los campos del formulario
    this.profileForm.enable();
  }

  /**
   * Cancela la edición y vuelve al modo visualización
   */
  cancelEdit() {
    this.isViewMode = true;
    // Note: don't disable form here, loadProfile will do it after data loads
    // Recargar datos originales
    // loadProfile internally calls loadMedicalHistoryAndLifestyle and disables form when done
    if (this.profileId) {
      this.loadProfile(this.profileId);
    } else {
      this.disableForm();
    }
  }

  /**
   * Deshabilita todos los campos del formulario para modo visualización
   */
  private disableForm() {
    this.profileForm.disable();
  }

  /**
   * Habilita todos los campos del formulario para modo edición
   */
  private enableForm() {
    this.profileForm.enable();
  }

  private loadProfile(id: number) {
    this.profileService.getProfile(id).subscribe({
      next: (profile: UserProfile) => {
        this.profileId = profile.id;
        this.patchFormWithProfile(profile);
        
        // Load medical history and lifestyle data AFTER profile is loaded
        // to avoid race conditions with patchFormWithProfile
        this.loadMedicalHistoryAndLifestyle();
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.showToast('Error al cargar el perfil', 'danger');
        // Si no hay perfil, habilitar edición para crear uno nuevo
        this.isViewMode = false;
        this.enableForm();
        
        // Still try to load medical history and lifestyle data
        this.loadMedicalHistoryAndLifestyle();
      }
    });
  }
  
  /**
   * Load medical history and lifestyle data, then disable form if in view mode
   */
  private loadMedicalHistoryAndLifestyle(): void {
    console.log('[ProfileForm] Cargando historial médico y estilo de vida para userId:', this.currentUserId);
    let completedLoads = 0;
    const totalLoads = 2;
    
    const checkAndDisable = () => {
      completedLoads++;
      if (completedLoads >= totalLoads && this.isViewMode) {
        console.log('[ProfileForm] Datos cargados, deshabilitando formulario');
        this.disableForm();
      }
    };
    
    // Load medical history
    if (this.currentUserId) {
      this.medicalHistoryService.getMedicalHistory(this.currentUserId).subscribe({
        next: (data) => {
          console.log('[ProfileForm] Historial médico recibido:', data);
          this.populateMedicalHistoryFromData(data);
          checkAndDisable();
        },
        error: (error) => {
          console.error('[ProfileForm] Error loading medical history:', error);
          checkAndDisable();
        }
      });
    } else {
      console.warn('[ProfileForm] No hay currentUserId, saltando carga de historial médico');
      checkAndDisable();
    }
    
    // Load lifestyle data
    if (this.currentUserId) {
      this.lifestyleService.getLifestyleData(this.currentUserId).subscribe({
        next: (data) => {
          console.log('[ProfileForm] Datos de estilo de vida recibidos:', data);
          const formValues = this.lifestyleService.formatForForm(data);
          
          // Patch the lifestyle_factors group
          this.profileForm.get('lifestyle_factors')?.patchValue(formValues);
          checkAndDisable();
        },
        error: (error) => {
          console.error('[ProfileForm] Error loading lifestyle data:', error);
          checkAndDisable();
        }
      });
    } else {
      console.warn('[ProfileForm] No hay currentUserId, saltando carga de lifestyle data');
      checkAndDisable();
    }
  }
  
  /**
   * Populate medical history arrays from loaded data
   */
  private populateMedicalHistoryFromData(data: any): void {
    console.log('[ProfileForm] Poblando formulario con historial médico:', data);
    
    // Clear existing arrays
    this.clearFormArray('medical_history');
    this.clearFormArray('allergies');
    this.clearFormArray('current_medications');
    
    // Populate conditions
    if (data.medicalHistory && data.medicalHistory.length > 0) {
      console.log('[ProfileForm] Agregando', data.medicalHistory.length, 'condiciones médicas');
      data.medicalHistory.forEach((item: any) => {
        this.medicalHistoryArray.push(this.fb.group({
          condition: [item.entryName, Validators.required]
        }));
      });
    } else {
      console.log('[ProfileForm] No hay condiciones médicas, agregando item vacío');
      this.medicalHistoryArray.push(this.createMedicalHistoryItem());
    }
    
    // Populate allergies
    if (data.allergies && data.allergies.length > 0) {
      console.log('[ProfileForm] Agregando', data.allergies.length, 'alergias');
      data.allergies.forEach((item: any) => {
        this.allergiesArray.push(this.fb.group({
          allergen: [item.entryName, Validators.required]
        }));
      });
    } else {
      console.log('[ProfileForm] No hay alergias, agregando item vacío');
      this.allergiesArray.push(this.createAllergyItem());
    }
    
    // Populate medications
    if (data.currentMedications && data.currentMedications.length > 0) {
      console.log('[ProfileForm] Agregando', data.currentMedications.length, 'medicamentos');
      data.currentMedications.forEach((item: any) => {
        this.currentMedicationsArray.push(this.fb.group({
          name: [item.entryName, Validators.required]
        }));
      });
    } else {
      console.log('[ProfileForm] No hay medicamentos, agregando item vacío');
      this.currentMedicationsArray.push(this.createMedicationItem());
    }
    
    console.log('[ProfileForm] Historial médico poblado. Arrays:', {
      medicalHistory: this.medicalHistoryArray.value,
      allergies: this.allergiesArray.value,
      medications: this.currentMedicationsArray.value
    });
  }

  private patchFormWithProfile(profile: UserProfile) {
    // Note: medical_history, allergies, and current_medications are loaded
    // separately from the medical_history table, so we don't use profile data for these
    // Also, lifestyle_factors are loaded from lifestyle_habits and smoking_history tables

    // Patch the basic profile data
    this.profileForm.patchValue({
      first_name: profile.firstName,
      last_name: profile.lastName,
      birth_date: profile.birthDate,
      gender: profile.gender,
      phone: profile.phone,
      occupation: profile.occupation,
      emergency_contact_name: profile.emergencyContactName,
      emergency_contact_phone: profile.emergencyContactPhone,
      // lifestyle_factors will be loaded by loadLifestyleData() from dedicated tables
      preferred_language: profile.preferredLanguage || 'es',
      preferred_communication_method: profile.preferredCommunicationMethod,
      consent_terms: profile.consentTerms ?? false,
      consent_data_sharing: profile.consentDataSharing ?? false,
      consent_marketing: profile.consentMarketing ?? false
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

  // View Mode Helpers
  getDisplayValue(controlPath: string): string {
    const value = this.profileForm.get(controlPath)?.value;
    if (value === null || value === undefined || value === '') {
      return 'Sin registrar';
    }

    switch (controlPath) {
      case 'birth_date':
        return this.formatDateValue(value);
      case 'gender':
        return this.getGenderLabel(value);
      default:
        return value;
    }
  }

  private formatDateValue(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Sin registrar';
    }
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getGenderLabel(value: string): string {
    const genderMap: Record<string, string> = {
      MALE: 'Masculino',
      FEMALE: 'Femenino',
      OTHER: 'Otro',
      PREFER_NOT_TO_SAY: 'Prefiero no decirlo'
    };
    return genderMap[value] || value;
  }

  /**
   * Get human-readable label for lifestyle factor values
   */
  getLifestyleLabel(fieldName: string, value: string): string {
    if (!value) return 'No especificado';

    const labels: Record<string, Record<string, string>> = {
      smoking_status: {
        'NEVER': 'Nunca he fumado',
        'FORMER': 'Ex fumador',
        'CURRENT': 'Fumador actual',
        'OCCASIONAL': 'Fumador ocasional'
      },
      alcohol_consumption: {
        'NONE': 'No consume',
        'OCCASIONAL': 'Ocasional',
        'MODERATE': 'Moderado',
        'FREQUENT': 'Frecuente',
        'DAILY': 'Diario'
      },
      exercise_frequency: {
        'NEVER': 'Nunca',
        'RARELY': 'Raramente',
        'WEEKLY': 'Semanal',
        'FREQUENT': 'Frecuente',
        'DAILY': 'Diario'
      }
    };

    return labels[fieldName]?.[value] || value;
  }

  /**
   * Check if array has any valid data (non-empty values)
   */
  hasArrayData(arrayName: 'medical_history' | 'allergies' | 'current_medications'): boolean {
    const fieldMap = {
      medical_history: 'condition',
      allergies: 'allergen',
      current_medications: 'name'
    };

    const array = this.profileForm.get(arrayName) as FormArray;
    if (!array || array.length === 0) return false;

    const fieldName = fieldMap[arrayName];
    return array.controls.some(control => {
      const value = control.get(fieldName)?.value;
      return value && value.trim() !== '';
    });
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
    if (this.isViewMode) {
      return 'Mi Perfil Médico';
    }
    return this.profileId ? 'Editar Perfil' : 'Crear Perfil Médico';
  }

  getPageSubtitle(): string {
    if (this.isViewMode) {
      return 'Información personal y médica';
    }
    return this.profileId ? 
      'Actualiza tu información médica y preferencias' : 
      'Gestión completa de información médica personalizada';
  }

  // Auto-save Functions
  getAutoSaveIcon(): string {
    if (this.isAutoSaving) return 'sync-outline';
    if (this.lastSaved) return 'checkmark-circle-outline';
    return 'cloud-upload-outline';
  }

  getAutoSaveText(): string {
    if (this.isAutoSaving) return 'Guardando...';
    if (this.lastSaved) return 'Guardado automáticamente';
    return 'Auto-guardado activado';
  }

  async autoSave() {
    if (!this.profileId || this.isAutoSaving || this.isViewMode) return;

    this.isAutoSaving = true;
    try {
      const updateData = this.createUpdateRequest();
      await this.profileService.updateProfile(this.profileId!, updateData);
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
    this.isSubmitting = true;
    this.error = null;

    const loading = await this.loadingCtrl.create({
      message: this.profileId ? 'Actualizando perfil...' : 'Creando perfil...'
    });
    await loading.present();

    try {
      let updatedProfile: UserProfile;
      if (this.profileId) {
        updatedProfile = await this.updateProfile();
      } else {
        updatedProfile = await this.createProfile();
      }
      
      await loading.dismiss();
      await this.showSuccessMessage();
      
      // Actualizar el formulario con los datos guardados
      this.patchFormWithProfile(updatedProfile);
      
      // Volver a modo visualización después de guardar
      this.isViewMode = true;
      this.disableForm();
      
      // Si es creación, navegar al dashboard
      if (!this.profileId && updatedProfile.id) {
        this.profileId = updatedProfile.id;
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Form submission error:', error);
      this.error = error.message || 'Error al procesar el perfil';
      await this.showToast('Error al guardar los cambios', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async createProfile(): Promise<UserProfile> {
    const profileData = this.createProfileRequest();
    const serviceData = this.transformToServiceCreateRequest(profileData);
    const profile = await firstValueFrom(this.profileService.createProfile(serviceData));
    
    // Save medical history after profile creation
    if (this.currentUserId) {
      await this.saveMedicalHistory();
      await this.saveLifestyleData();
    }
    
    return profile;
  }

  private async updateProfile(): Promise<UserProfile> {
    const updateData = this.createUpdateRequest();
    const serviceData = this.transformToServiceUpdateRequest(updateData);
    const profile = await firstValueFrom(this.profileService.updateProfile(this.profileId!, serviceData));
    
    // Save medical history and lifestyle data
    if (this.currentUserId) {
      await this.saveMedicalHistory();
      await this.saveLifestyleData();
    }
    
    return profile;
  }

  /**
   * Save medical history, allergies and medications to the database
   */
  private async saveMedicalHistory(): Promise<void> {
    if (!this.currentUserId) return;
    
    const formValue = this.profileForm.value;
    
    try {
      await this.medicalHistoryService.saveBatch(this.currentUserId, {
        medicalHistory: formValue.medical_history || [],
        allergies: formValue.allergies || [],
        currentMedications: formValue.current_medications || []
      });
      console.log('Medical history saved successfully');
    } catch (error) {
      console.error('Error saving medical history:', error);
      // Don't throw - let profile save succeed even if medical history fails
    }
  }

  private clearFormArray(arrayName: string): void {
    const array = this.profileForm.get(arrayName) as FormArray;
    while (array.length > 0) {
      array.removeAt(0);
    }
  }

  /**
   * Save lifestyle and smoking data to the database
   */
  private async saveLifestyleData(): Promise<void> {
    if (!this.currentUserId) return;
    
    const lifestyleFactors = this.profileForm.get('lifestyle_factors')?.value;
    
    if (!lifestyleFactors) return;
    
    try {
      const formattedData = this.lifestyleService.formatForApi(lifestyleFactors);
      await this.lifestyleService.saveLifestyleData(this.currentUserId, formattedData);
      console.log('Lifestyle data saved successfully');
    } catch (error) {
      console.error('Error saving lifestyle data:', error);
      // Don't throw - let profile save succeed even if lifestyle fails
    }
  }

  private transformToServiceCreateRequest(componentData: CreateProfileRequest): CreateProfileRequest {
    return {
      ...componentData,
      userId: this.currentUserId || 1
    };
  }

  private transformToServiceUpdateRequest(componentData: UpdateProfileRequest): UpdateProfileRequest {
    return componentData;
  }

  private createProfileRequest(): CreateProfileRequest {
    const formValue = this.profileForm.value;
    return {
      userId: 1, // This should come from auth service
      firstName: formValue.first_name,
      lastName: formValue.last_name,
      birthDate: formValue.birth_date,
      gender: formValue.gender,
      phone: formValue.phone || null,
      occupation: formValue.occupation || null,
      emergencyContactName: formValue.emergency_contact_name || null,
      emergencyContactPhone: formValue.emergency_contact_phone || null,
      medicalHistory: this.filterValidArrayItems(formValue.medical_history),
      allergies: this.filterValidArrayItems(formValue.allergies),
      currentMedications: this.filterValidArrayItems(formValue.current_medications),
      lifestyleFactors: formValue.lifestyle_factors,
      preferredLanguage: formValue.preferred_language,
      preferredCommunicationMethod: formValue.preferred_communication_method,
      consentTerms: formValue.consent_terms,
      consentDataSharing: formValue.consent_data_sharing,
      consentMarketing: formValue.consent_marketing
    };
  }

  private createUpdateRequest(): UpdateProfileRequest {
    const formValue = this.profileForm.value;
    return {
      firstName: formValue.first_name,
      lastName: formValue.last_name,
      birthDate: formValue.birth_date,
      gender: formValue.gender,
      phone: formValue.phone,
      occupation: formValue.occupation,
      emergencyContactName: formValue.emergency_contact_name,
      emergencyContactPhone: formValue.emergency_contact_phone,
      medicalHistory: this.filterValidArrayItems(formValue.medical_history),
      allergies: this.filterValidArrayItems(formValue.allergies),
      currentMedications: this.filterValidArrayItems(formValue.current_medications),
      lifestyleFactors: formValue.lifestyle_factors,
      preferredLanguage: formValue.preferred_language,
      preferredCommunicationMethod: formValue.preferred_communication_method,
      consentTerms: formValue.consent_terms,
      consentDataSharing: formValue.consent_data_sharing,
      consentMarketing: formValue.consent_marketing
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