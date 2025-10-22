import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { User } from '../auth/core/interfaces/auth.unified';
import { AuthFacadeService } from '../auth/core/services';

// Importar y registrar los nuevos iconos
import { addIcons } from 'ionicons';
import { walletOutline, leafOutline, walkOutline, barbellOutline, addCircleOutline, personCircleOutline } from 'ionicons/icons';

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

  // --- Datos de Ejemplo ---
  smokeFreeDays = 128;
  moneySaved = 450;
  cigarettesAvoided = 2560;
  
  dailySteps = 7540;
  dailyStepsGoal = 10000;

  exerciseMinutes = 45;
  exerciseMinutesGoal = 60;
  // -------------------------

  // --- Lógica para Anillos de Progreso ---
  stepsCircumference = 2 * Math.PI * 36;
  exerciseCircumference = 2 * Math.PI * 36;

  get stepsProgress() {
    return this.dailySteps / this.dailyStepsGoal;
  }

  get exerciseProgress() {
    return this.exerciseMinutes / this.exerciseMinutesGoal;
  }

  get stepsCircleOffset() {
    return this.stepsCircumference - Math.min(this.stepsProgress, 1) * this.stepsCircumference;
  }

  get exerciseCircleOffset() {
    return this.exerciseCircumference - Math.min(this.exerciseProgress, 1) * this.exerciseCircumference;
  }
  // ------------------------------------

  constructor() {
    addIcons({ walletOutline, leafOutline, walkOutline, barbellOutline, addCircleOutline, personCircleOutline });
  }

  ngOnInit() {
    this.authFacade.user$.subscribe(user => {
      this.user = user;
    });
  }

  logHabit() {
    console.log('Botón "Registrar Hábito" pulsado');
  }
}