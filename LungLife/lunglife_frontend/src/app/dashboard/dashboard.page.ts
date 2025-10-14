/**
 * Dashboard Page - User Dashboard
 * Displays user metrics and progress tracking
 */
import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthFacadeService } from '../auth/core/services';
import { User } from '../auth/core/interfaces/auth.unified';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class DashboardPage implements OnInit {
  private authFacade = inject(AuthFacadeService);

  user: User | null = null;

  // Example data properties
  smokeFreeDays = 128;
  moneySaved = 450;
  cigarettesAvoided = 2560;
  lungHealthPercentage = 85;

  ngOnInit() {
    this.authFacade.user$.subscribe(user => {
      this.user = user;
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