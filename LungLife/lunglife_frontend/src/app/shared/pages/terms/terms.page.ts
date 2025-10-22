import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss']
})
export class TermsPage {}
