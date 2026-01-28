"""
LungLife ML Service - Pydantic Schemas
Definición de schemas para validación de datos de entrada y salida.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class GenderEnum(str, Enum):
    """Enum para género del paciente."""
    MALE = "Male"
    FEMALE = "Female"


class SmokingHistoryEnum(str, Enum):
    """Enum para historial de fumador."""
    NEVER = "Never"
    FORMER = "Former"
    CURRENT = "Current"


class RiskLevelEnum(str, Enum):
    """Enum para nivel de riesgo."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PatientDataRequest(BaseModel):
    """
    Schema de entrada para datos del paciente.
    Todos los campos requeridos para la predicción.
    """
    # Datos demográficos
    age: int = Field(..., ge=18, le=120, description="Edad del paciente")
    gender: GenderEnum = Field(..., description="Género del paciente")

    # Historial de tabaquismo
    smoking_history: SmokingHistoryEnum = Field(..., description="Historial de fumador")
    years_smoked: float = Field(default=0, ge=0, description="Años fumando")
    pack_years: float = Field(default=0, ge=0, description="Pack-years de tabaquismo")

    # Datos clínicos
    bmi: float = Field(..., ge=10, le=60, description="Índice de masa corporal")
    lung_function_test_result: float = Field(..., ge=0, le=150, description="Resultado de espirometría (%)")

    # Factores de riesgo
    family_history_cancer: bool = Field(default=False, description="Historial familiar de cáncer")
    exposure_to_toxins: bool = Field(default=False, description="Exposición a toxinas")
    air_quality_index: float = Field(default=50, ge=0, le=500, description="Índice de calidad del aire")

    # Síntomas
    chest_pain_symptoms: bool = Field(default=False, description="Dolor en el pecho")
    shortness_of_breath: bool = Field(default=False, description="Dificultad para respirar")
    chronic_cough: bool = Field(default=False, description="Tos crónica")
    weight_loss: bool = Field(default=False, description="Pérdida de peso")

    # Datos opcionales
    tumor_size_cm: Optional[float] = Field(default=None, ge=0, description="Tamaño del tumor en cm")
    occupation: Optional[str] = Field(default=None, description="Ocupación")
    residential_area: Optional[str] = Field(default=None, description="Área residencial")

    class Config:
        json_schema_extra = {
            "example": {
                "age": 55,
                "gender": "Male",
                "smoking_history": "Former",
                "years_smoked": 20,
                "pack_years": 30,
                "bmi": 26.5,
                "lung_function_test_result": 75.0,
                "family_history_cancer": True,
                "exposure_to_toxins": False,
                "air_quality_index": 85,
                "chest_pain_symptoms": True,
                "shortness_of_breath": True,
                "chronic_cough": True,
                "weight_loss": False,
                "tumor_size_cm": 2.5,
                "occupation": "Mining",
                "residential_area": "Urban"
            }
        }

    @validator("years_smoked", "pack_years", pre=True, always=True)
    def validate_smoking_data(cls, value, values):
        """Validar que datos de tabaquismo sean coherentes."""
        if values.get("smoking_history") == SmokingHistoryEnum.NEVER:
            return 0
        return value


class TopFeatureContribution(BaseModel):
    """Contribución de una feature a la predicción."""
    feature: str = Field(..., description="Nombre de la feature")
    value: Any = Field(..., description="Valor de la feature")
    contribution: float = Field(..., description="Contribución SHAP")
    direction: str = Field(..., description="Dirección del impacto (positive/negative)")


class PredictionResponse(BaseModel):
    """
    Schema de respuesta con la predicción y metadatos.
    """
    # Predicción principal
    prediction: str = Field(..., description="Predicción: Early o Advanced")
    prediction_code: int = Field(..., description="Código numérico: 0=Early, 1=Advanced")
    probability: float = Field(..., ge=0, le=1, description="Probabilidad de cáncer avanzado")
    confidence: float = Field(..., ge=0, le=1, description="Confianza de la predicción")

    # Clasificación de riesgo
    risk_level: RiskLevelEnum = Field(..., description="Nivel de riesgo: low, medium, high")
    requires_review: bool = Field(..., description="Requiere revisión médica adicional")

    # Interpretabilidad (XAI)
    top_factors: List[TopFeatureContribution] = Field(
        default=[], 
        description="Top factores que contribuyen a la predicción"
    )

    # Metadatos
    model_version: str = Field(..., description="Versión del modelo utilizado")
    prediction_id: str = Field(..., description="ID único de la predicción")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp de la predicción")
    processing_time_ms: float = Field(..., description="Tiempo de procesamiento en ms")

    class Config:
        json_schema_extra = {
            "example": {
                "prediction": "Advanced",
                "prediction_code": 1,
                "probability": 0.78,
                "confidence": 0.56,
                "risk_level": "high",
                "requires_review": False,
                "top_factors": [
                    {"feature": "pack_years", "value": 30, "contribution": 0.15, "direction": "positive"},
                    {"feature": "lung_function_test_result", "value": 75, "contribution": 0.12, "direction": "positive"}
                ],
                "model_version": "1.0.0",
                "prediction_id": "pred_abc123",
                "timestamp": "2026-01-26T10:30:00Z",
                "processing_time_ms": 45.2
            }
        }


class HealthResponse(BaseModel):
    """Schema de respuesta para health check."""
    status: str = Field(..., description="Estado del servicio")
    model_loaded: bool = Field(..., description="Si el modelo está cargado")
    model_version: str = Field(..., description="Versión del modelo")
    uptime_seconds: float = Field(..., description="Tiempo de actividad en segundos")


class ErrorResponse(BaseModel):
    """Schema para respuestas de error."""
    error: str = Field(..., description="Tipo de error")
    message: str = Field(..., description="Mensaje descriptivo")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Detalles adicionales")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
