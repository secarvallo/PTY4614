/**
 * Dashboard Page - User Dashboard
 * Displays user metrics and progress tracking
 */
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  leafOutline,
  cashOutline,
  medicalOutline,
  fitnessOutline,
  addCircleOutline,
  barChartOutline,
  personOutline,
  medkitOutline,
  peopleOutline,
  pulseOutline,
  chevronForwardOutline,
  logOutOutline
} from 'ionicons/icons';
import { AuthFacadeService } from '../auth/core/services';
import { User } from '../auth/core/interfaces/auth.unified';
import { LogoutButtonComponent } from '../shared/components/logout-button/logout-button.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: [
    './dashboard.page.scss',
    '../theme/shared-layout.scss'
  ],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, LogoutButtonComponent],
})
export class DashboardPage implements OnInit {
  private authFacade = inject(AuthFacadeService);

  user: User | null = null;

  // Role-based visibility
  isPatient = signal<boolean>(false);
  isDoctor = signal<boolean>(false);

  // Example data properties
  smokeFreeDays = 128;
  moneySaved = 450;
  cigarettesAvoided = 2560;
  lungHealthPercentage = 85;

  constructor() {
    addIcons({
      leafOutline,
      cashOutline,
      medicalOutline,
      fitnessOutline,
      addCircleOutline,
      barChartOutline,
      personOutline,
      medkitOutline,
      peopleOutline,
      pulseOutline,
      chevronForwardOutline,
      logOutOutline
    });
  }

  ngOnInit() {
    this.authFacade.user$.subscribe(user => {
      this.user = user;
      // Set role-based flags
      this.isPatient.set(user?.roleId === 1);
      this.isDoctor.set(user?.roleId === 2);
    });
  }

  logHabit() {
    // Logic to log a new habit
    console.log('Log Habit button clicked');
  }

  viewProgress() {
    // Logic to navigate to a detailed progress page
    console.log('View Progress button clicked');
  }
}