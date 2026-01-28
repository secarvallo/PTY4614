"""
LungLife ML Service - Pydantic Schemas.

This module defines all request/response schemas for the API
using Pydantic for validation and serialization.

Author: LungLife Team
Version: 1.0.0
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class RiskLevel(str, Enum):
    """Risk classification levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class GenderEnum(str, Enum):
    """Patient gender options."""
    MALE = "Male"
    FEMALE = "Female"


class SmokingHistoryEnum(str, Enum):
    """Smoking history options."""
    NEVER = "Never"
    FORMER = "Former"
    CURRENT = "Current"


class PatientDataRequest(BaseModel):
    """
    Request schema for patient data input.

    Contains all features required for lung cancer prediction.
    """
    # Demographic features
    age: int = Field(..., ge=18, le=120, description="Patient age in years")
    gender: GenderEnum = Field(..., description="Patient gender")

    # Smoking-related features
    years_smoked: float = Field(..., ge=0, description="Years of smoking history")
    pack_years: float = Field(..., ge=0, description="Pack years (packs/day × years)")
    smoking_history: SmokingHistoryEnum = Field(..., description="Smoking status")

    # Physical metrics
    bmi: float = Field(..., ge=10, le=60, description="Body Mass Index")
    lung_function_test_result: float = Field(
        ..., ge=0, le=100, 
        description="Lung function percentage"
    )

    # Environmental factors
    air_quality_index: float = Field(..., ge=0, le=500, description="AQI value")
    exposure_to_toxins: bool = Field(..., description="Occupational toxin exposure")
    residential_area: str = Field(..., description="Urban/Rural classification")

    # Clinical indicators
    tumor_size_cm: float = Field(..., ge=0, le=20, description="Tumor size if detected")
    chest_pain_symptoms: bool = Field(..., description="Presence of chest pain")
    shortness_of_breath: bool = Field(..., description="Difficulty breathing")
    chronic_cough: bool = Field(..., description="Persistent cough")
    weight_loss: bool = Field(..., description="Unexplained weight loss")

    # Medical history
    family_history_cancer: bool = Field(..., description="Family cancer history")
    previous_cancer_diagnosis: bool = Field(..., description="Prior cancer diagnosis")
    comorbidities: Optional[str] = Field(None, description="Other health conditions")

    # Lifestyle
    physical_activity_level: str = Field(..., description="Activity level")
    dietary_habits: str = Field(..., description="Diet quality")
    occupation: str = Field(..., description="Patient occupation")

    @field_validator('age')
    @classmethod
    def validate_age(cls, value: int) -> int:
        """Validate age is within acceptable range."""
        if value < 18:
            raise ValueError("Patient must be at least 18 years old")
        return value

    class Config:
        json_schema_extra = {
            "example": {
                "age": 55,
                "gender": "Male",
                "years_smoked": 20,
                "pack_years": 30,
                "smoking_history": "Former",
                "bmi": 26.5,
                "lung_function_test_result": 75.0,
                "air_quality_index": 120,
                "exposure_to_toxins": True,
                "residential_area": "Urban",
                "tumor_size_cm": 0.0,
                "chest_pain_symptoms": False,
                "shortness_of_breath": True,
                "chronic_cough": True,
                "weight_loss": False,
                "family_history_cancer": True,
                "previous_cancer_diagnosis": False,
                "comorbidities": "Hypertension",
                "physical_activity_level": "Moderate",
                "dietary_habits": "Balanced",
                "occupation": "Mining"
            }
        }


class RiskFactorDetail(BaseModel):
    """Detail of a contributing risk factor."""
    feature_name: str = Field(..., description="Name of the feature")
    contribution: float = Field(..., description="SHAP contribution value")
    direction: str = Field(..., description="positive or negative impact")


class PredictionResponse(BaseModel):
    """
    Response schema for prediction results.

    Contains prediction, probability, risk level, and contributing factors.
    """
    prediction: str = Field(..., description="Early or Advanced")
    probability: float = Field(..., ge=0, le=1, description="Probability of advanced stage")
    risk_level: RiskLevel = Field(..., description="Risk classification")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence")
    requires_review: bool = Field(..., description="Flag for manual review")
    top_risk_factors: List[RiskFactorDetail] = Field(
        ..., 
        description="Top contributing factors"
    )
    recommendation: str = Field(..., description="Clinical recommendation")
    timestamp: datetime = Field(default_factory=datetime.now)
    model_version: str = Field(default="1.0.0")

    class Config:
        json_schema_extra = {
            "example": {
                "prediction": "Early",
                "probability": 0.35,
                "risk_level": "medium",
                "confidence": 0.70,
                "requires_review": True,
                "top_risk_factors": [
                    {"feature_name": "pack_years", "contribution": 0.15, "direction": "positive"},
                    {"feature_name": "lung_function", "contribution": -0.10, "direction": "negative"}
                ],
                "recommendation": "Seguimiento regular recomendado. Considerar tomografía de baja dosis.",
                "timestamp": "2026-01-26T10:30:00",
                "model_version": "1.0.0"
            }
        }


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="ML model availability")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error description")
    detail: Optional[str] = Field(None, description="Additional details")
    timestamp: datetime = Field(default_factory=datetime.now)
