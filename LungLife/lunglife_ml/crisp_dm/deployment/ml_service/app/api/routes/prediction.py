"""
Prediction Router - Endpoints de predicción ML.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging
import numpy as np

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class PatientData(BaseModel):
    """
    Datos del paciente para predicción.
    Formato compatible con el backend Node.js de LungLife.
    """
    # Demographics
    age: int = Field(45, ge=18, le=120, description="Edad del paciente")
    gender: str = Field("Male", description="Género (Male/Female)")
    
    # Smoking history
    years_smoked: int = Field(0, ge=0, description="Años fumando")
    pack_years: float = Field(0.0, ge=0, description="Paquetes-año")
    smoking_history: str = Field("Never", description="Never/Former/Current")
    
    # Physical measurements
    bmi: float = Field(25.0, ge=10, le=60, description="Índice de masa corporal")
    
    # Clinical data
    lung_function_test_result: float = Field(85.0, ge=0, le=150, description="FEV1%")
    tumor_size_cm: float = Field(0.0, ge=0, le=20, description="Tamaño del tumor en cm")
    
    # Environmental factors
    air_quality_index: int = Field(50, ge=0, le=500, description="Índice de calidad del aire")
    exposure_to_toxins: bool = Field(False, description="Exposición a toxinas")
    residential_area: str = Field("Urban", description="Urban/Suburban/Rural")
    
    # Symptoms
    chest_pain_symptoms: bool = Field(False)
    shortness_of_breath: bool = Field(False)
    chronic_cough: bool = Field(False)
    weight_loss: bool = Field(False)
    
    # Medical history
    family_history_cancer: bool = Field(False)
    previous_cancer_diagnosis: bool = Field(False)
    comorbidities: Optional[str] = Field("NONE", description="Lista de comorbilidades")
    
    # Lifestyle
    physical_activity_level: str = Field("Moderate", description="Low/Moderate/High")
    dietary_habits: str = Field("Average", description="Poor/Average/Good")
    occupation: str = Field("Unknown", description="Ocupación del paciente")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "age": 55,
                "gender": "Male",
                "years_smoked": 20,
                "pack_years": 30.0,
                "smoking_history": "Current",
                "bmi": 27.5,
                "lung_function_test_result": 75.0,
                "tumor_size_cm": 0.0,
                "air_quality_index": 80,
                "exposure_to_toxins": False,
                "residential_area": "Urban",
                "chest_pain_symptoms": True,
                "shortness_of_breath": True,
                "chronic_cough": True,
                "weight_loss": False,
                "family_history_cancer": True,
                "previous_cancer_diagnosis": False,
                "comorbidities": "DIABETES,HYPERTENSION",
                "physical_activity_level": "Low",
                "dietary_habits": "Average",
                "occupation": "Construction Worker"
            }
        }


class FeatureContribution(BaseModel):
    """Contribución de una característica a la predicción."""
    feature: str
    contribution: float
    direction: str  # "positive" o "negative"


class PredictionResponse(BaseModel):
    """Respuesta de predicción."""
    prediction: int = Field(..., description="0: Sin riesgo, 1: Con riesgo")
    probability: float = Field(..., ge=0, le=1)
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH, VERY_HIGH")
    confidence: float = Field(..., ge=0, le=1)
    model_version: str
    top_features: List[FeatureContribution] = []
    recommendation: str
    timestamp: str


class BatchPredictionRequest(BaseModel):
    """Request para predicción por lotes."""
    patients: List[PatientData] = Field(..., max_length=100)


class BatchPredictionResponse(BaseModel):
    """Respuesta de predicción por lotes."""
    predictions: List[PredictionResponse]
    total_processed: int
    processing_time_ms: float


# =============================================================================
# HELPERS
# =============================================================================

def patient_to_features(patient: PatientData) -> np.ndarray:
    """
    Convierte datos del paciente a array de 29 features.
    
    Features esperadas por el modelo:
    0: Age
    1: Years_Smoked
    2: Pack_Years
    3: BMI
    4: Lung_Function_Test_Result
    5: Air_Quality_Index
    6: Tumor_Size_cm
    7-9: Age_Group (one-hot: 18-40, 41-60, 61+)
    10: Gender (1=Male, 0=Female)
    11: Smoking_History (0=Never, 1=Former, 2=Current)
    12: Family_History_Cancer
    13: Occupation (encoded)
    14: Exposure_to_Toxins
    15: Residential_Area (0=Urban, 1=Suburban, 2=Rural)
    16: Chest_Pain_Symptoms
    17: Shortness_of_Breath
    18: Chronic_Cough
    19: Weight_Loss
    20: Physical_Activity_Level (0=Low, 1=Moderate, 2=High)
    21: Dietary_Habits (0=Poor, 1=Average, 2=Good)
    22: Comorbidities (count or encoded)
    23: Previous_Cancer_Diagnosis
    24: Pack_Years_Normalized
    25: Smoking_Risk_Level (derived)
    26: Symptom_Count
    27: Environmental_Risk (derived)
    28: Risk_Score_Composite (derived)
    """
    # Age groups (one-hot encoding)
    age_18_40 = 1 if 18 <= patient.age <= 40 else 0
    age_41_60 = 1 if 41 <= patient.age <= 60 else 0
    age_61_plus = 1 if patient.age > 60 else 0
    
    # Gender encoding
    gender_encoded = 1 if patient.gender.lower() in ["male", "m", "masculino"] else 0
    
    # Smoking history encoding
    smoking_map = {"never": 0, "former": 1, "current": 2}
    smoking_encoded = smoking_map.get(patient.smoking_history.lower(), 0)
    
    # Occupation encoding (simplified - use hash for variety)
    occupation_encoded = abs(hash(patient.occupation.lower())) % 10 / 10.0
    
    # Residential area encoding
    area_map = {"urban": 0, "suburban": 1, "rural": 2}
    residential_encoded = area_map.get(patient.residential_area.lower(), 0)
    
    # Physical activity encoding
    activity_map = {"low": 0, "moderate": 1, "high": 2}
    activity_encoded = activity_map.get(patient.physical_activity_level.lower(), 1)
    
    # Dietary habits encoding
    diet_map = {"poor": 0, "average": 1, "good": 2}
    diet_encoded = diet_map.get(patient.dietary_habits.lower(), 1)
    
    # Comorbidities count
    if patient.comorbidities and patient.comorbidities.upper() != "NONE":
        comorbidities_count = len(patient.comorbidities.split(","))
    else:
        comorbidities_count = 0
    
    # Pack years normalized (0-1 scale, assuming max ~100)
    pack_years_normalized = min(patient.pack_years / 100.0, 1.0)
    
    # Smoking risk level (derived from smoking history and pack years)
    if smoking_encoded == 0:
        smoking_risk = 0
    elif patient.pack_years > 30:
        smoking_risk = 3
    elif patient.pack_years > 15:
        smoking_risk = 2
    else:
        smoking_risk = 1
    
    # Symptom count
    symptom_count = sum([
        int(patient.chest_pain_symptoms),
        int(patient.shortness_of_breath),
        int(patient.chronic_cough),
        int(patient.weight_loss)
    ])
    
    # Environmental risk (derived from air quality and toxin exposure)
    aqi_risk = 1 if patient.air_quality_index > 100 else 0
    environmental_risk = aqi_risk + int(patient.exposure_to_toxins)
    
    # Risk score composite (weighted combination)
    risk_composite = (
        (patient.age / 100.0) * 0.15 +
        pack_years_normalized * 0.25 +
        (symptom_count / 4.0) * 0.2 +
        int(patient.family_history_cancer) * 0.15 +
        environmental_risk * 0.1 +
        (1 - patient.lung_function_test_result / 100.0) * 0.15
    )
    
    # Build the 29-feature array
    features = np.array([
        patient.age,                          # 0: Age
        patient.years_smoked,                 # 1: Years_Smoked
        patient.pack_years,                   # 2: Pack_Years
        patient.bmi,                          # 3: BMI
        patient.lung_function_test_result,    # 4: Lung_Function_Test_Result
        patient.air_quality_index,            # 5: Air_Quality_Index
        patient.tumor_size_cm,                # 6: Tumor_Size_cm
        age_18_40,                            # 7: Age_Group_18-40
        age_41_60,                            # 8: Age_Group_41-60
        age_61_plus,                          # 9: Age_Group_61+
        gender_encoded,                       # 10: Gender
        smoking_encoded,                      # 11: Smoking_History
        int(patient.family_history_cancer),   # 12: Family_History_Cancer
        occupation_encoded,                   # 13: Occupation
        int(patient.exposure_to_toxins),      # 14: Exposure_to_Toxins
        residential_encoded,                  # 15: Residential_Area
        int(patient.chest_pain_symptoms),     # 16: Chest_Pain_Symptoms
        int(patient.shortness_of_breath),     # 17: Shortness_of_Breath
        int(patient.chronic_cough),           # 18: Chronic_Cough
        int(patient.weight_loss),             # 19: Weight_Loss
        activity_encoded,                     # 20: Physical_Activity_Level
        diet_encoded,                         # 21: Dietary_Habits
        comorbidities_count,                  # 22: Comorbidities
        int(patient.previous_cancer_diagnosis), # 23: Previous_Cancer_Diagnosis
        pack_years_normalized,                # 24: Pack_Years_Normalized
        smoking_risk,                         # 25: Smoking_Risk_Level
        symptom_count,                        # 26: Symptom_Count
        environmental_risk,                   # 27: Environmental_Risk
        risk_composite                        # 28: Risk_Score_Composite
    ], dtype=np.float64)
    
    return features


def get_recommendation(risk_level: str) -> str:
    """Genera recomendación basada en el nivel de riesgo."""
    recommendations = {
        "LOW": "Continuar con controles de rutina. Mantener hábitos saludables.",
        "MODERATE": "Se recomienda seguimiento médico en los próximos 3 meses.",
        "HIGH": "Se recomienda evaluación médica especializada pronto.",
        "VERY_HIGH": "Se recomienda evaluación médica urgente con especialista."
    }
    return recommendations.get(risk_level, "Consulte con su médico.")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/predict", response_model=PredictionResponse)
async def predict(patient: PatientData):
    """
    Realiza una predicción de riesgo de cáncer pulmonar.
    
    Args:
        patient: Datos clínicos del paciente
        
    Returns:
        Predicción con probabilidad, nivel de riesgo e interpretabilidad
    """
    from app.main import get_model_loader
    
    model_loader = get_model_loader()
    
    if not model_loader or not model_loader.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible. Intente más tarde."
        )
    
    try:
        # Convertir a features
        features = patient_to_features(patient)
        
        # Realizar predicción
        result = model_loader.predict(features)
        
        # Construir respuesta
        return PredictionResponse(
            prediction=result["prediction"],
            probability=round(result["probability"], 4),
            risk_level=result["risk_level"],
            confidence=round(result["confidence"], 4),
            model_version=result["model_version"],
            top_features=[
                FeatureContribution(**f) for f in result.get("top_features", [])
            ],
            recommendation=get_recommendation(result["risk_level"]),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
        
    except Exception as e:
        logger.error(f"Error en predicción: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar predicción: {str(e)}"
        )


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Realiza predicciones para múltiples pacientes.
    
    Args:
        request: Lista de pacientes (máximo 100)
        
    Returns:
        Lista de predicciones
    """
    import time
    start_time = time.time()
    
    predictions = []
    for patient in request.patients:
        try:
            pred = await predict(patient)
            predictions.append(pred)
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error en batch: {e}")
    
    processing_time = (time.time() - start_time) * 1000
    
    return BatchPredictionResponse(
        predictions=predictions,
        total_processed=len(predictions),
        processing_time_ms=round(processing_time, 2)
    )
