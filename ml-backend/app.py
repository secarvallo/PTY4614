"""
Cancer Prediction API using CRISP-DM Methodology
Sistema de predicción de cáncer usando metodología CRISP-DM
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

app = Flask(__name__)
CORS(app)

class CancerPredictionModel:
    """
    CRISP-DM Implementation for Cancer Prediction
    Implementación CRISP-DM para predicción de cáncer
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'age', 'bmi', 'smoking', 'alcohol_consumption', 
            'physical_activity', 'family_history', 'previous_cancer_history',
            'fatigue', 'weight_loss', 'shortness_of_breath'
        ]
        self.risk_factors = {
            'smoking': 'Tabaquismo',
            'alcohol_consumption': 'Consumo de alcohol',
            'family_history': 'Historia familiar',
            'age': 'Edad avanzada',
            'bmi': 'Índice de masa corporal elevado',
            'physical_activity': 'Baja actividad física',
            'previous_cancer_history': 'Historia previa de cáncer'
        }
        
    def business_understanding(self):
        """
        CRISP-DM Phase 1: Business Understanding
        Fase 1: Entendimiento del negocio
        """
        return {
            "objective": "Predecir el riesgo de cáncer en pacientes",
            "success_criteria": "Precisión del modelo > 80%",
            "risk_factors": list(self.risk_factors.values())
        }
    
    def generate_synthetic_data(self, n_samples=1000):
        """
        CRISP-DM Phase 2: Data Understanding - Generate synthetic cancer data
        Fase 2: Entendimiento de datos - Generar datos sintéticos de cáncer
        """
        np.random.seed(42)
        
        data = {
            'age': np.random.normal(55, 15, n_samples).clip(18, 90),
            'bmi': np.random.normal(26, 5, n_samples).clip(15, 45),
            'smoking': np.random.binomial(1, 0.3, n_samples),
            'alcohol_consumption': np.random.binomial(1, 0.4, n_samples),
            'physical_activity': np.random.binomial(1, 0.6, n_samples),
            'family_history': np.random.binomial(1, 0.2, n_samples),
            'previous_cancer_history': np.random.binomial(1, 0.1, n_samples),
            'fatigue': np.random.binomial(1, 0.3, n_samples),
            'weight_loss': np.random.binomial(1, 0.25, n_samples),
            'shortness_of_breath': np.random.binomial(1, 0.2, n_samples)
        }
        
        # Create target variable based on risk factors
        risk_score = (
            data['age'] * 0.02 +
            data['bmi'] * 0.03 +
            data['smoking'] * 20 +
            data['alcohol_consumption'] * 10 +
            (1 - data['physical_activity']) * 15 +
            data['family_history'] * 25 +
            data['previous_cancer_history'] * 30 +
            data['fatigue'] * 10 +
            data['weight_loss'] * 15 +
            data['shortness_of_breath'] * 12
        )
        
        # Convert to probability and then to binary outcome
        probability = 1 / (1 + np.exp(-(risk_score - 50) / 10))
        data['cancer_diagnosis'] = np.random.binomial(1, probability, n_samples)
        
        return pd.DataFrame(data)
    
    def data_preparation(self, df):
        """
        CRISP-DM Phase 3: Data Preparation
        Fase 3: Preparación de datos
        """
        # Normalize age and BMI
        df['age_normalized'] = (df['age'] - df['age'].min()) / (df['age'].max() - df['age'].min())
        df['bmi_normalized'] = (df['bmi'] - df['bmi'].min()) / (df['bmi'].max() - df['bmi'].min())
        
        # Use normalized values for training
        features = df[['age_normalized', 'bmi_normalized'] + self.feature_names[2:]].copy()
        target = df['cancer_diagnosis']
        
        return features, target
    
    def modeling(self, X, y):
        """
        CRISP-DM Phase 4: Modeling
        Fase 4: Modelado
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
        self.model.fit(X_train_scaled, y_train)
        
        # Make predictions
        y_pred = self.model.predict(X_test_scaled)
        
        return {
            'accuracy': accuracy_score(y_test, y_pred),
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'test_size': len(X_test)
        }
    
    def evaluation(self, metrics):
        """
        CRISP-DM Phase 5: Evaluation
        Fase 5: Evaluación
        """
        return {
            'model_performance': {
                'accuracy': round(metrics['accuracy'], 4),
                'precision': round(metrics['classification_report']['weighted avg']['precision'], 4),
                'recall': round(metrics['classification_report']['weighted avg']['recall'], 4),
                'f1_score': round(metrics['classification_report']['weighted avg']['f1-score'], 4)
            },
            'business_evaluation': 'Modelo cumple criterios de éxito' if metrics['accuracy'] > 0.8 else 'Modelo requiere mejoras'
        }
    
    def predict_cancer_risk(self, patient_data):
        """
        CRISP-DM Phase 6: Deployment - Predict cancer risk for a patient
        Fase 6: Despliegue - Predecir riesgo de cáncer para un paciente
        """
        if self.model is None:
            return {"error": "Modelo no entrenado"}
        
        # Prepare patient data
        df_patient = pd.DataFrame([patient_data])
        
        # Normalize age and BMI (using simple normalization for demo)
        df_patient['age_normalized'] = (df_patient['age'] - 18) / (90 - 18)
        df_patient['bmi_normalized'] = (df_patient['bmi'] - 15) / (45 - 15)
        
        # Select features in correct order
        features = df_patient[['age_normalized', 'bmi_normalized'] + self.feature_names[2:]]
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Make prediction
        prediction = self.model.predict(features_scaled)[0]
        probability = self.model.predict_proba(features_scaled)[0]
        
        # Identify risk factors
        identified_risks = []
        if patient_data['smoking']: identified_risks.append(self.risk_factors['smoking'])
        if patient_data['alcohol_consumption']: identified_risks.append(self.risk_factors['alcohol_consumption'])
        if patient_data['family_history']: identified_risks.append(self.risk_factors['family_history'])
        if patient_data['age'] > 60: identified_risks.append(self.risk_factors['age'])
        if patient_data['bmi'] > 30: identified_risks.append(self.risk_factors['bmi'])
        if not patient_data['physical_activity']: identified_risks.append(self.risk_factors['physical_activity'])
        if patient_data['previous_cancer_history']: identified_risks.append(self.risk_factors['previous_cancer_history'])
        
        return {
            'prediction': int(prediction),
            'risk_probability': {
                'low_risk': round(probability[0], 4),
                'high_risk': round(probability[1], 4)
            },
            'risk_factors': identified_risks,
            'recommendation': 'Consultar con oncólogo' if prediction == 1 else 'Mantener controles regulares'
        }

# Initialize model
cancer_model = CancerPredictionModel()

@app.route('/')
def home():
    return jsonify({
        "message": "API de Predicción de Cáncer - CRISP-DM",
        "endpoints": {
            "/business-understanding": "GET - Objetivos del negocio",
            "/train-model": "POST - Entrenar modelo",
            "/predict": "POST - Predecir riesgo de cáncer",
            "/model-evaluation": "GET - Evaluación del modelo"
        }
    })

@app.route('/business-understanding', methods=['GET'])
def business_understanding():
    return jsonify(cancer_model.business_understanding())

@app.route('/train-model', methods=['POST'])
def train_model():
    try:
        # Generate synthetic data
        df = cancer_model.generate_synthetic_data(1000)
        
        # Prepare data
        X, y = cancer_model.data_preparation(df)
        
        # Train model
        metrics = cancer_model.modeling(X, y)
        
        # Evaluate model
        evaluation = cancer_model.evaluation(metrics)
        
        return jsonify({
            "status": "success",
            "message": "Modelo entrenado exitosamente",
            "metrics": metrics,
            "evaluation": evaluation
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict():
    try:
        patient_data = request.json
        
        # Validate required fields
        required_fields = cancer_model.feature_names
        for field in required_fields:
            if field not in patient_data:
                return jsonify({"error": f"Campo requerido faltante: {field}"}), 400
        
        result = cancer_model.predict_cancer_risk(patient_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/model-evaluation', methods=['GET'])
def model_evaluation():
    if cancer_model.model is None:
        return jsonify({"error": "Modelo no entrenado. Entrenar primero usando /train-model"}), 400
    
    return jsonify({
        "crisp_dm_phases": {
            "1_business_understanding": "Completado - Predicción de riesgo de cáncer",
            "2_data_understanding": "Completado - Datos sintéticos generados",
            "3_data_preparation": "Completado - Normalización y limpieza",
            "4_modeling": "Completado - Random Forest implementado",
            "5_evaluation": "Completado - Métricas de rendimiento calculadas",
            "6_deployment": "Completado - API REST disponible"
        },
        "model_status": "Entrenado y listo para predicciones"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)