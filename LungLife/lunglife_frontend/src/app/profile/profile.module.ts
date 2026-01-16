import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';

import { ProfileRoutingModule } from './profile-routing.module';

/**
 * Profile Module
 * 
 * Comprehensive user profile management module for LungLife application.
 * 
 * Features:
 * - Role-based profile management (PATIENT, HEALTH_PROFESSIONAL, ADMIN, RESEARCHER)
 * - Risk assessment with PLCO algorithm integration
 * - Health metrics tracking with IoT support
 * - Professional dashboard for healthcare providers
 * - Offline functionality with synchronization
 * - Responsive design for mobile/desktop
 * - WCAG AA accessibility compliance
 * 
 * Note: Components are standalone and imported via routing
 * 
 * @author LungLife Development Team
 * @version 1.0
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    HttpClientModule,
    ProfileRoutingModule
  ],
  providers: [
    // Services are provided at root level
  ],
  exports: [
    // Standalone components are exported via routing
  ]
})
export class ProfileModule { }