/**
 * Directory Page
 * Unified RBAC-based directory page for all roles
 * Adapts UI and functionality based on user role
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  filterOutline, 
  personOutline, 
  medkitOutline,
  businessOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  closeCircleOutline,
  refreshOutline,
  arrowBackOutline,
  optionsOutline,
  chevronForwardOutline,
  peopleOutline,
  gridOutline,
  mailOutline,
  callOutline,
  toggleOutline,
  statsChartOutline,
  swapHorizontalOutline
} from 'ionicons/icons';
import { DirectoryService, DirectoryEntry, DirectoryFilters } from '../../services/directory.service';
import { AuthFacadeService } from '../../../auth/core/services';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { 
  RoleId,
  DirectoryMode,
  DirectoryTab,
  ROLE_IDS,
  getDirectoryConfig,
  getDirectoryTabs,
  getDefaultMode,
  isPatient,
  isDoctor,
  isAdmin,
  isActionAvailable
} from '../../../core/rbac';

@Component({
  selector: 'app-directory',
  templateUrl: './directory.page.html',
  styleUrls: [
    './directory.page.scss',
    '../../../theme/shared-layout.scss',
    '../../../auth/auth.styles.scss'
  ],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, LogoutButtonComponent],
})
export class DirectoryPage implements OnInit {
  private directoryService = inject(DirectoryService);
  private authFacade = inject(AuthFacadeService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private router = inject(Router);

  // User role
  readonly roleId = signal<RoleId>(ROLE_IDS.PATIENT);
  
  // Expose service signals
  readonly entries = this.directoryService.entries;
  readonly currentMode = this.directoryService.currentMode;
  readonly currentAssignment = this.directoryService.currentAssignment;
  readonly loading = this.directoryService.loading;
  readonly error = this.directoryService.error;
  readonly specialties = this.directoryService.specialties;
  readonly institutions = this.directoryService.institutions;
  readonly statistics = this.directoryService.statistics;
  readonly hasCurrentAssignment = this.directoryService.hasCurrentAssignment;

  // Local state
  readonly searchTerm = signal<string>('');
  readonly selectedSpecialty = signal<string>('');
  readonly selectedInstitution = signal<string>('');
  readonly selectedStatus = signal<'active' | 'inactive' | ''>('');
  readonly showFilters = signal<boolean>(false);
  
  // Directory configuration based on role
  readonly config = computed(() => getDirectoryConfig(this.roleId()));
  readonly tabs = computed(() => getDirectoryTabs(this.roleId()));
  
  // Computed role checks
  readonly isPatientRole = computed(() => isPatient(this.roleId()));
  readonly isDoctorRole = computed(() => isDoctor(this.roleId()));
  readonly isAdminRole = computed(() => isAdmin(this.roleId()));
  
  // Filtered entries
  readonly filteredEntries = computed(() => {
    const entries = this.entries();
    const search = this.searchTerm().toLowerCase();
    
    if (!search) return entries;
    
    return entries.filter(entry => 
      entry.fullName.toLowerCase().includes(search) ||
      (entry.specialty?.toLowerCase().includes(search)) ||
      (entry.email?.toLowerCase().includes(search))
    );
  });
  
  // Show tabs only if role has multiple modes
  readonly showTabs = computed(() => this.tabs().length > 1);

  constructor() {
    addIcons({
      searchOutline,
      filterOutline,
      personOutline,
      medkitOutline,
      businessOutline,
      checkmarkCircleOutline,
      checkmarkCircle,
      closeCircleOutline,
      refreshOutline,
      arrowBackOutline,
      optionsOutline,
      chevronForwardOutline,
      peopleOutline,
      gridOutline,
      mailOutline,
      callOutline,
      toggleOutline,
      statsChartOutline,
      swapHorizontalOutline
    });
  }

  async ngOnInit() {
    // Get user role from auth service
    const user = this.authFacade.getCurrentUser();
    if (user?.roleId) {
      this.roleId.set(user.roleId as RoleId);
    }
    
    // Initialize directory based on role
    await this.directoryService.initializeDirectory(this.roleId());
  }

  // ===== Tab Navigation =====
  
  async onTabChange(mode: DirectoryMode): Promise<void> {
    await this.directoryService.changeMode(mode, this.getCurrentFilters());
  }
  
  isActiveTab(mode: DirectoryMode): boolean {
    return this.currentMode() === mode;
  }

  // ===== Search and Filters =====
  
  onSearchChange(event: any): void {
    this.searchTerm.set(event.target.value || '');
  }

  onSpecialtyChange(event: any): void {
    this.selectedSpecialty.set(event.detail.value || '');
    this.applyFilters();
  }

  onInstitutionChange(event: any): void {
    this.selectedInstitution.set(event.detail.value || '');
    this.applyFilters();
  }
  
  onStatusChange(event: any): void {
    this.selectedStatus.set(event.detail.value || '');
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedSpecialty.set('');
    this.selectedInstitution.set('');
    this.selectedStatus.set('');
    this.directoryService.refresh();
  }
  
  private getCurrentFilters(): DirectoryFilters {
    return {
      search: this.searchTerm() || undefined,
      specialty: this.selectedSpecialty() || undefined,
      institution: this.selectedInstitution() || undefined,
      status: this.selectedStatus() || undefined
    };
  }
  
  private async applyFilters(): Promise<void> {
    await this.directoryService.refresh(this.getCurrentFilters());
  }

  async refresh(): Promise<void> {
    await this.directoryService.refresh(this.getCurrentFilters());
  }

  // ===== Card Actions =====
  
  async onEntryClick(entry: DirectoryEntry): Promise<void> {
    const role = this.roleId();
    
    if (isPatient(role) && entry.entityType === 'doctor') {
      await this.selectDoctor(entry);
    } else if (isDoctor(role) && entry.entityType === 'patient') {
      await this.viewPatientDetails(entry);
    } else if (isDoctor(role) && entry.entityType === 'doctor') {
      await this.contactColleague(entry);
    } else if (isAdmin(role)) {
      await this.showAdminActions(entry);
    }
  }
  
  // Patient: Select a doctor
  private async selectDoctor(entry: DirectoryEntry): Promise<void> {
    const current = this.currentAssignment();
    
    if (current?.type === 'doctor' && current.doctorId === entry.doctorId) {
      const toast = await this.toastController.create({
        message: `Ya tienes asignado a Dr(a). ${entry.fullName}`,
        duration: 3000,
        color: 'warning',
        position: 'bottom'
      });
      await toast.present();
      return;
    }

    const header = current ? 'Cambiar Médico' : 'Asignar Médico';
    const message = current 
      ? `Actualmente tienes asignado a Dr(a). ${current.fullName}. ¿Deseas cambiarlo por Dr(a). ${entry.fullName}?`
      : `¿Deseas asignar a Dr(a). ${entry.fullName} como tu médico de seguimiento?`;
    const buttonText = current ? 'Cambiar' : 'Asignar';

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: buttonText,
          handler: async () => {
            const result = await this.directoryService.assignDoctor(entry.doctorId!);
            const toast = await this.toastController.create({
              message: result.message,
              duration: 3000,
              color: result.success ? 'success' : 'danger',
              position: 'bottom'
            });
            await toast.present();
            
            if (result.success) {
              setTimeout(() => this.router.navigate(['/dashboard']), 1500);
            }
          }
        }
      ]
    });
    await alert.present();
  }
  
  // Doctor: View patient details
  private async viewPatientDetails(entry: DirectoryEntry): Promise<void> {
    const toast = await this.toastController.create({
      message: `Ver ficha de ${entry.fullName} - Funcionalidad próximamente`,
      duration: 3000,
      color: 'primary',
      position: 'bottom'
    });
    await toast.present();
  }
  
  // Doctor: Contact colleague
  private async contactColleague(entry: DirectoryEntry): Promise<void> {
    const alert = await this.alertController.create({
      header: `Dr(a). ${entry.fullName}`,
      subHeader: entry.specialty,
      message: `${entry.institution}\n\nEmail: ${entry.email}`,
      buttons: [
        { text: 'Cerrar', role: 'cancel' },
        {
          text: 'Enviar correo',
          handler: () => {
            window.location.href = `mailto:${entry.email}`;
          }
        }
      ]
    });
    await alert.present();
  }
  
  // Admin: Show action menu
  private async showAdminActions(entry: DirectoryEntry): Promise<void> {
    const buttons: any[] = [
      { text: 'Cancelar', role: 'cancel' }
    ];
    
    // Toggle active status
    buttons.unshift({
      text: entry.isActive ? 'Desactivar usuario' : 'Activar usuario',
      handler: async () => {
        const result = await this.directoryService.toggleUserStatus(entry.userId, !entry.isActive);
        const toast = await this.toastController.create({
          message: result.message,
          duration: 3000,
          color: result.success ? 'success' : 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
    
    // If patient, allow assignment
    if (entry.entityType === 'patient') {
      buttons.unshift({
        text: 'Asignar médico',
        handler: () => this.showAssignDoctorDialog(entry)
      });
    }
    
    const alert = await this.alertController.create({
      header: entry.fullName,
      subHeader: entry.roleName || entry.entityType,
      message: `Estado: ${entry.isActive ? 'Activo' : 'Inactivo'}`,
      buttons
    });
    await alert.present();
  }
  
  private async showAssignDoctorDialog(patient: DirectoryEntry): Promise<void> {
    // Load doctors for selection
    const doctors = this.directoryService.doctors();
    
    if (doctors.length === 0) {
      await this.directoryService.loadDirectory('doctors');
    }
    
    const inputs = this.directoryService.doctors().map(doc => ({
      type: 'radio' as const,
      label: `Dr(a). ${doc.fullName} - ${doc.specialty}`,
      value: doc.doctorId?.toString()
    }));
    
    const alert = await this.alertController.create({
      header: 'Asignar médico',
      subHeader: `Paciente: ${patient.fullName}`,
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          handler: async (doctorId) => {
            if (doctorId) {
              const result = await this.directoryService.assignDoctor(
                parseInt(doctorId),
                patient.patientId
              );
              const toast = await this.toastController.create({
                message: result.message,
                duration: 3000,
                color: result.success ? 'success' : 'danger',
                position: 'bottom'
              });
              await toast.present();
              if (result.success) {
                await this.refresh();
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ===== Utility Methods =====
  
  isCurrentDoctor(entry: DirectoryEntry): boolean {
    return this.directoryService.isCurrentDoctor(entry);
  }

  getInitials(name: string, lastName: string): string {
    return `${(name || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }
  
  getEntityIcon(entry: DirectoryEntry): string {
    return entry.entityType === 'doctor' ? 'medkit-outline' : 'person-outline';
  }
  
  getStatusColor(entry: DirectoryEntry): string {
    return entry.isActive ? 'success' : 'medium';
  }
}
