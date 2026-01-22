import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-info.component.html',
  styleUrls: [
    '../../../auth/auth.styles.scss',
    '../../../theme/shared-layout.scss',
    './profile-info.component.scss'
  ]
})
export class ProfileInfoComponent {
  constructor() {}
}

