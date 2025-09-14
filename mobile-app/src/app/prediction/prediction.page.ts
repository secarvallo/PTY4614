import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { CancerPredictionService, PatientData, PredictionResult } from '../services/cancer-prediction.service';

@Component({
  selector: 'app-prediction',
  templateUrl: './prediction.page.html',
  styleUrls: ['./prediction.page.scss'],
})
export class PredictionPage implements OnInit {
  predictionForm: FormGroup;
  predictionResult: PredictionResult | null = null;
  isModelTrained = false;

  constructor(
    private formBuilder: FormBuilder,
    private predictionService: CancerPredictionService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.predictionForm = this.formBuilder.group({
      age: [45, [Validators.required, Validators.min(18), Validators.max(90)]],
      bmi: [25, [Validators.required, Validators.min(15), Validators.max(45)]],
      smoking: [false],
      alcohol_consumption: [false],
      physical_activity: [true],
      family_history: [false],
      previous_cancer_history: [false],
      fatigue: [false],
      weight_loss: [false],
      shortness_of_breath: [false]
    });
  }

  ngOnInit() {
    this.trainModel();
  }

  async trainModel() {
    const loading = await this.loadingController.create({
      message: 'Entrenando modelo de predicción...',
    });
    await loading.present();

    try {
      await this.predictionService.trainModel().toPromise();
      this.isModelTrained = true;
      await loading.dismiss();
      this.showToast('Modelo entrenado exitosamente', 'success');
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Error', 'No se pudo entrenar el modelo. Verificar que el backend esté ejecutándose.');
    }
  }

  async predictCancer() {
    if (!this.predictionForm.valid) {
      this.showAlert('Error', 'Por favor, complete todos los campos correctamente.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Calculando predicción...',
    });
    await loading.present();

    const formData = this.predictionForm.value;
    const patientData: PatientData = {
      age: formData.age,
      bmi: formData.bmi,
      smoking: formData.smoking ? 1 : 0,
      alcohol_consumption: formData.alcohol_consumption ? 1 : 0,
      physical_activity: formData.physical_activity ? 1 : 0,
      family_history: formData.family_history ? 1 : 0,
      previous_cancer_history: formData.previous_cancer_history ? 1 : 0,
      fatigue: formData.fatigue ? 1 : 0,
      weight_loss: formData.weight_loss ? 1 : 0,
      shortness_of_breath: formData.shortness_of_breath ? 1 : 0
    };

    try {
      this.predictionResult = await this.predictionService.predictCancer(patientData).toPromise();
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Error', 'No se pudo realizar la predicción. Verificar conectividad.');
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    await toast.present();
  }

  resetForm() {
    this.predictionForm.reset({
      age: 45,
      bmi: 25,
      smoking: false,
      alcohol_consumption: false,
      physical_activity: true,
      family_history: false,
      previous_cancer_history: false,
      fatigue: false,
      weight_loss: false,
      shortness_of_breath: false
    });
    this.predictionResult = null;
  }

  getRiskLevelColor(): string {
    if (!this.predictionResult) return 'medium';
    return this.predictionResult.prediction === 1 ? 'danger' : 'success';
  }

  getRiskLevelText(): string {
    if (!this.predictionResult) return '';
    return this.predictionResult.prediction === 1 ? 'Alto Riesgo' : 'Bajo Riesgo';
  }
}