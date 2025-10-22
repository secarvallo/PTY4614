import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss']
})
export class PrivacyPage {}
