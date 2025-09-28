/**
 * 🚫 Not Found Page - 404 Error Page
 * Displays when users navigate to non-existent routes
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class NotFoundPage {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }
}
