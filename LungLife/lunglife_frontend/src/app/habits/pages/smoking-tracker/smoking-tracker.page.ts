/**
 * Smoking Tracker Page
 * Displays smoking habit tracking with daily input and weekly statistics
 * Maintains UI/UX consistency with Dashboard page
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  leafOutline,
  addOutline,
  removeOutline,
  checkmarkCircleOutline,
  trendingDownOutline,
  trendingUpOutline,
  calendarOutline,
  statsChartOutline,
  arrowBackOutline,
  flameOutline,
  heartOutline,
  timeOutline,
  saveOutline
} from 'ionicons/icons';
import { AuthFacadeService } from '../../../auth/core/services';
import { ProfileService, PatientProfile, UserProfileResponse } from '../../../profile/services/profile.service';
import { SmokingTrackerService, DailySmokingRecord, WeeklyStats, SmokingEntry } from '../../services/smoking-tracker.service';

// Response interfaces
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface PatientStats {
  smokeFreeDays: number;
  lungHealthImprovement: number;
}

interface TodayRecord {
  cigarettes_per_day: number;
}

interface User {
  id: number;
  email: string;
}

@Component({
  selector: 'app-smoking-tracker',
  templateUrl: './smoking-tracker.page.html',
  styleUrls: ['./smoking-tracker.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class SmokingTrackerPage implements OnInit {
  private authFacade = inject(AuthFacadeService);
  private profileService = inject(ProfileService);
  private smokingService = inject(SmokingTrackerService);
  private toastCtrl = inject(ToastController);

  // User info
  userFullName = signal<string>('');
  patientId = signal<number | null>(null);

  // Stats from dashboard style
  smokeFreeDays = signal<number>(0);
  lungHealthPercentage = signal<number>(0);

  // Daily tracking
  todayCigarettes = signal<number>(0);
  maxCigarettes = 30;
  isSaving = signal<boolean>(false);
  hasRecordToday = signal<boolean>(false);

  // Weekly stats
  weeklyStats = signal<WeeklyStats | null>(null);
  weeklyRecords = signal<DailySmokingRecord[]>([]);
  isLoadingStats = signal<boolean>(true);

  // Chart computed values
  chartMaxValue = computed(() => {
    const records = this.weeklyRecords();
    if (records.length === 0) return 10;
    const max = Math.max(...records.map(r => r.cigarettes));
    return Math.max(max + 2, 10);
  });

  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  constructor() {
    addIcons({
      leafOutline,
      addOutline,
      removeOutline,
      checkmarkCircleOutline,
      trendingDownOutline,
      trendingUpOutline,
      calendarOutline,
      statsChartOutline,
      arrowBackOutline,
      flameOutline,
      heartOutline,
      timeOutline,
      saveOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
  }

  private loadUserData(): void {
    this.authFacade.user$.subscribe((user) => {
      if (user) {
        this.loadUserProfile();
      }
    });
  }

  private loadUserProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (response: UserProfileResponse) => {
        if (response.success && response.data?.profile) {
          const profile = response.data.profile;

          if (profile && profile.type === 'PATIENT') {
            const patientProfile = profile as PatientProfile;
            this.userFullName.set(patientProfile.fullName || `${patientProfile.firstName} ${patientProfile.lastName}`.trim());
            this.patientId.set(patientProfile.patientId);

            // Load patient statistics
            this.loadPatientStats(patientProfile.patientId);
            this.loadWeeklyData(patientProfile.patientId);
            this.loadTodayRecord(patientProfile.patientId);
          }
        }
      },
      error: (error: Error) => {
        console.error('[SmokingTracker] Error loading profile:', error);
      }
    });
  }

  private loadPatientStats(patientId: number): void {
    this.smokingService.getPatientStats(patientId).subscribe({
      next: (response: ApiResponse<PatientStats>) => {
        if (response.success && response.data) {
          this.smokeFreeDays.set(response.data.smokeFreeDays);
          this.lungHealthPercentage.set(response.data.lungHealthImprovement);
        }
      }
    });
  }

  private loadWeeklyData(patientId: number): void {
    this.isLoadingStats.set(true);

    this.smokingService.getHistory(patientId, 7).subscribe({
      next: (response: ApiResponse<DailySmokingRecord[]>) => {
        if (response.success && response.data) {
          this.weeklyRecords.set(response.data);
        }
        this.isLoadingStats.set(false);
      },
      error: () => {
        this.isLoadingStats.set(false);
      }
    });

    this.smokingService.getWeeklyStats(patientId).subscribe({
      next: (response: ApiResponse<WeeklyStats>) => {
        if (response.success && response.data) {
          this.weeklyStats.set(response.data);
        }
      }
    });
  }

  private loadTodayRecord(patientId: number): void {
    this.smokingService.getTodayRecord(patientId).subscribe({
      next: (response: ApiResponse<SmokingEntry | null>) => {
        if (response.success && response.data) {
          this.todayCigarettes.set(response.data.cigarettes_per_day);
          this.hasRecordToday.set(true);
        }
      }
    });
  }

  // ========== UI ACTIONS ==========

  incrementCigarettes(): void {
    if (this.todayCigarettes() < this.maxCigarettes) {
      this.todayCigarettes.update(v => v + 1);
    }
  }

  decrementCigarettes(): void {
    if (this.todayCigarettes() > 0) {
      this.todayCigarettes.update(v => v - 1);
    }
  }

  setCigarettes(value: number): void {
    this.todayCigarettes.set(Math.max(0, Math.min(value, this.maxCigarettes)));
  }

  async saveToday(): Promise<void> {
    const patientId = this.patientId();
    if (!patientId) {
      this.showToast('Error: Could not identify patient', 'danger');
      return;
    }

    this.isSaving.set(true);

    this.smokingService.logDailyConsumption(patientId, this.todayCigarettes()).subscribe({
      next: async (response: ApiResponse<unknown>) => {
        this.isSaving.set(false);
        if (response.success) {
          this.hasRecordToday.set(true);
          await this.showToast('Record saved successfully!', 'success');
          // Reload weekly data
          this.loadWeeklyData(patientId);
        } else {
          await this.showToast('Error saving record', 'danger');
        }
      },
      error: async () => {
        this.isSaving.set(false);
        await this.showToast('Connection error', 'danger');
      }
    });
  }

  // ========== CHART HELPERS ==========

  getBarHeight(cigarettes: number): number {
    const max = this.chartMaxValue();
    return (cigarettes / max) * 100;
  }

  getDayLabel(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return this.weekDays[date.getDay()];
  }

  isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  getBarColor(cigarettes: number): string {
    if (cigarettes === 0) return 'var(--ion-color-success)';
    if (cigarettes <= 5) return 'var(--ion-color-warning)';
    return 'var(--ion-color-danger)';
  }

  getTrendIcon(): string {
    const stats = this.weeklyStats();
    if (!stats) return 'trending-down-outline';
    return stats.trend === 'up' ? 'trending-up-outline' : 'trending-down-outline';
  }

  getTrendColor(): string {
    const stats = this.weeklyStats();
    if (!stats) return 'success';
    return stats.trend === 'up' ? 'danger' : 'success';
  }

  getSliderPercentage(): number {
    return (this.todayCigarettes() / this.maxCigarettes) * 100;
  }

  getSliderColor(): string {
    const cigaretteCount = this.todayCigarettes();
    if (cigaretteCount === 0) return '#10B981'; // green
    if (cigaretteCount <= 5) return '#F59E0B'; // yellow
    if (cigaretteCount <= 10) return '#F97316'; // orange
    return '#EF4444'; // red
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
