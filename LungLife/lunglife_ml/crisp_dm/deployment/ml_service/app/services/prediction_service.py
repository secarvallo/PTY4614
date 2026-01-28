"""
LungLife ML Service - Prediction Service.

This module contains the core business logic for making predictions
using the trained ML model.

Author: LungLife Team
Version: 1.0.0
"""

from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import joblib

from app.models.schemas import (
    PatientDataRequest,
    PredictionResponse,
    RiskLevel,
    RiskFactorDetail,
)
from app.config import get_settings


class PredictionService:
    """
    Service class for handling ML predictions.

    Encapsulates all prediction logic following Single Responsibility Principle.
    """

    # Risk level thresholds
    HIGH_RISK_THRESHOLD = 0.7
    MEDIUM_RISK_THRESHOLD = 0.4
    REVIEW_LOWER_BOUND = 0.3
    REVIEW_UPPER_BOUND = 0.7

    def __init__(self, model, label_encoders: Dict, config: Dict):
        """
        Initialize prediction service with model and preprocessors.

        Args:
            model: Trained ML model (sklearn compatible)
            label_encoders: Dictionary of label encoders for categorical features
            config: Model configuration dictionary
        """
        self._model = model
        self._label_encoders = label_encoders
        self._config = config
        self._feature_columns = config.get('preprocessing', {}).get('feature_columns', [])
        self._threshold = config.get('prediction', {}).get('threshold', 0.5)

    def predict(self, patient_data: PatientDataRequest) -> PredictionResponse:
        """
        Generate prediction for patient data.

        Args:
            patient_data: Validated patient data request

        Returns:
            PredictionResponse with prediction, probability, and risk factors
        """
        # Step 1: Convert to DataFrame
        features_df = self._prepare_features(patient_data)

        # Step 2: Encode categorical features
        encoded_df = self._encode_features(features_df)

        # Step 3: Get prediction and probability
        probability = self._get_probability(encoded_df)
        prediction = self._classify_prediction(probability)

        # Step 4: Classify risk level
        risk_level = self._classify_risk(probability)

        # Step 5: Get top risk factors
        top_factors = self._get_top_risk_factors(encoded_df)

        # Step 6: Generate recommendation
        recommendation = self._generate_recommendation(risk_level, prediction)

        # Step 7: Check if review is required
        requires_review = self._requires_manual_review(probability)

        # Step 8: Calculate confidence
        confidence = self._calculate_confidence(probability)

        return PredictionResponse(
            prediction=prediction,
            probability=round(probability, 4),
            risk_level=risk_level,
            confidence=round(confidence, 4),
            requires_review=requires_review,
            top_risk_factors=top_factors,
            recommendation=recommendation,
            model_version=self._config.get('version', '1.0.0'),
        )

    def _prepare_features(self, patient_data: PatientDataRequest) -> pd.DataFrame:
        """Convert patient data to feature DataFrame."""
        data_dict = patient_data.model_dump()

        # Map Pydantic fields to model feature names
        feature_mapping = {
            'age': 'Age',
            'years_smoked': 'Years_Smoked',
            'pack_years': 'Pack_Years',
            'bmi': 'BMI',
            'lung_function_test_result': 'Lung_Function_Test_Result',
            'air_quality_index': 'Air_Quality_Index',
            'tumor_size_cm': 'Tumor_Size_cm',
            'gender': 'Gender',
            'smoking_history': 'Smoking_History',
            'family_history_cancer': 'Family_History_Cancer',
            'occupation': 'Occupation',
            'exposure_to_toxins': 'Exposure_to_Toxins',
            'residential_area': 'Residential_Area',
            'chest_pain_symptoms': 'Chest_Pain_Symptoms',
            'shortness_of_breath': 'Shortness_of_Breath',
            'chronic_cough': 'Chronic_Cough',
            'weight_loss': 'Weight_Loss',
            'physical_activity_level': 'Physical_Activity_Level',
            'dietary_habits': 'Dietary_Habits',
            'comorbidities': 'Comorbidities',
            'previous_cancer_diagnosis': 'Previous_Cancer_Diagnosis',
        }

        mapped_data = {
            feature_mapping.get(k, k): v 
            for k, v in data_dict.items() 
            if k in feature_mapping
        }

        # Add derived features
        mapped_data = self._add_derived_features(mapped_data)

        return pd.DataFrame([mapped_data])

    def _add_derived_features(self, data: Dict) -> Dict:
        """Calculate derived features required by the model."""
        age = data.get('Age', 0)

        # Age groups
        data['Age_Group_18-40'] = 1 if 18 <= age <= 40 else 0
        data['Age_Group_41-60'] = 1 if 41 <= age <= 60 else 0
        data['Age_Group_61+'] = 1 if age > 60 else 0

        # Pack years normalized
        pack_years = data.get('Pack_Years', 0)
        data['Pack_Years_Normalized'] = min(pack_years / 50.0, 1.0)

        # Smoking risk level
        if data.get('Smoking_History') == 'Current':
            data['Smoking_Risk_Level'] = 'High'
        elif data.get('Smoking_History') == 'Former':
            data['Smoking_Risk_Level'] = 'Medium'
        else:
            data['Smoking_Risk_Level'] = 'Low'

        # Symptom count
        symptoms = ['Chest_Pain_Symptoms', 'Shortness_of_Breath', 
                    'Chronic_Cough', 'Weight_Loss']
        data['Symptom_Count'] = sum(1 for s in symptoms if data.get(s))

        # Environmental risk
        aqi = data.get('Air_Quality_Index', 0)
        toxins = data.get('Exposure_to_Toxins', False)
        data['Environmental_Risk'] = (aqi / 500.0) + (0.3 if toxins else 0)

        # Risk score composite
        data['Risk_Score_Composite'] = (
            data['Pack_Years_Normalized'] * 0.3 +
            data['Symptom_Count'] / 4.0 * 0.3 +
            data['Environmental_Risk'] * 0.2 +
            (1 if data.get('Family_History_Cancer') else 0) * 0.2
        )

        return data

    def _encode_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical features using stored label encoders."""
        encoded_df = df.copy()

        for col, encoder in self._label_encoders.items():
            if col in encoded_df.columns:
                try:
                    encoded_df[col] = encoder.transform(
                        encoded_df[col].astype(str)
                    )
                except ValueError:
                    # Handle unseen labels
                    encoded_df[col] = -1

        # Ensure all required columns exist
        for col in self._feature_columns:
            if col not in encoded_df.columns:
                encoded_df[col] = 0

        # Reorder columns
        encoded_df = encoded_df[self._feature_columns]

        return encoded_df

    def _get_probability(self, encoded_df: pd.DataFrame) -> float:
        """Get prediction probability from model."""
        probabilities = self._model.predict_proba(encoded_df)
        return float(probabilities[0, 1])

    def _classify_prediction(self, probability: float) -> str:
        """Classify prediction based on threshold."""
        return "Advanced" if probability >= self._threshold else "Early"

    def _classify_risk(self, probability: float) -> RiskLevel:
        """Classify risk level based on probability."""
        if probability >= self.HIGH_RISK_THRESHOLD:
            return RiskLevel.HIGH
        elif probability >= self.MEDIUM_RISK_THRESHOLD:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _get_top_risk_factors(
        self, 
        encoded_df: pd.DataFrame, 
        top_n: int = 5
    ) -> List[RiskFactorDetail]:
        """Extract top contributing risk factors using feature importance."""
        if not hasattr(self._model, 'feature_importances_'):
            return []

        importances = self._model.feature_importances_
        feature_importance = list(zip(self._feature_columns, importances))
        feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)

        top_factors = []
        for feature_name, importance in feature_importance[:top_n]:
            top_factors.append(RiskFactorDetail(
                feature_name=feature_name,
                contribution=round(float(importance), 4),
                direction="positive" if importance > 0 else "negative"
            ))

        return top_factors

    def _generate_recommendation(
        self, 
        risk_level: RiskLevel, 
        prediction: str
    ) -> str:
        """Generate clinical recommendation based on risk level."""
        recommendations = {
            RiskLevel.HIGH: (
                "Derivación urgente a oncología pulmonar. "
                "Se recomienda tomografía de alta resolución y biopsia."
            ),
            RiskLevel.MEDIUM: (
                "Seguimiento médico requerido. "
                "Considerar tomografía de baja dosis en 3 meses."
            ),
            RiskLevel.LOW: (
                "Riesgo bajo detectado. "
                "Mantener controles preventivos anuales."
            ),
        }
        return recommendations.get(risk_level, "Consulte con su médico.")

    def _requires_manual_review(self, probability: float) -> bool:
        """Determine if prediction requires manual clinical review."""
        return self.REVIEW_LOWER_BOUND <= probability <= self.REVIEW_UPPER_BOUND

    def _calculate_confidence(self, probability: float) -> float:
        """Calculate model confidence (distance from decision boundary)."""
        return abs(probability - 0.5) * 2
