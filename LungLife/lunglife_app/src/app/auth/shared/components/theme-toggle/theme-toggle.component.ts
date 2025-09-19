import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  isDarkTheme = false;

  ngOnInit() {
    // Subscribe to theme changes
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.isDarkTheme = theme === 'dark';
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}