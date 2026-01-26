"""
LungLife ML Service - Prediction Endpoint
Endpoint principal para realizar predicciones.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import logging
import time
import uuid
from typing import Optional

from app.schemas import (
    PatientDataRequest, 
    PredictionResponse, 
    TopFeatureContribution,
    RiskLevelEnum,
    ErrorResponse
)
from app.core.predictor import Predictor
from app.dependencies import get_predictor

router = APIRouter()
logger = logging.getLogger(__name__)


def classify_risk_level(probability: float) -> RiskLevelEnum:
    """
    Clasifica el nivel de riesgo basado en la probabilidad.

    Args:
        probability: Probabilidad de cáncer avanzado (0-1)

    Returns:
        Nivel de riesgo (low, medium, high)
    """
    if probability >= 0.7:
        return RiskLevelEnum.HIGH
    elif probability >= 0.4:
        return RiskLevelEnum.MEDIUM
    return RiskLevelEnum.LOW


def requires_medical_review(probability: float) -> bool:
    """
    Determina si la predicción requiere revisión médica adicional.
    Casos en zona de incertidumbre (0.3-0.7) requieren revisión.
    """
    return 0.3 <= probability <= 0.7


def calculate_confidence(probability: float) -> float:
    """
    Calcula la confianza de la predicción.
    Mayor distancia del umbral 0.5 = mayor confianza.
    """
    return abs(probability - 0.5) * 2


@router.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Datos de entrada inválidos"},
        500: {"model": ErrorResponse, "description": "Error interno del servidor"},
        503: {"model": ErrorResponse, "description": "Modelo no disponible"}
    },
    summary="Realizar predicción de cáncer pulmonar",
    description="Recibe datos del paciente y retorna la predicción con interpretabilidad"
)
async def predict(
    patient_data: PatientDataRequest,
    background_tasks: BackgroundTasks,
    predictor: Predictor = Depends(get_predictor)
) -> PredictionResponse:
    """
    Endpoint principal de predicción.

    Proceso:
    1. Valida los datos de entrada (Pydantic)
    2. Preprocesa los datos
    3. Realiza la predicción
    4. Calcula explicaciones SHAP
    5. Clasifica nivel de riesgo
    6. Retorna respuesta estructurada
    """
    start_time = time.time()
    prediction_id = f"pred_{uuid.uuid4().hex[:12]}"

    try:
        logger.info(f"[{prediction_id}] Iniciando predicción")

        # Convertir request a diccionario
        patient_dict = patient_data.model_dump()

        # Realizar predicción
        result = predictor.predict(patient_dict)

        probability = result["probability"]
        prediction_label = "Advanced" if probability >= predictor.threshold else "Early"
        prediction_code = 1 if probability >= predictor.threshold else 0

        # Obtener factores contribuyentes (SHAP)
        top_factors = []
        if "shap_values" in result:
            for feature, shap_value, original_value in result["shap_values"][:5]:
                top_factors.append(TopFeatureContribution(
                    feature=feature,
                    value=original_value,
                    contribution=abs(shap_value),
                    direction="positive" if shap_value > 0 else "negative"
                ))

        # Calcular métricas adicionales
        risk_level = classify_risk_level(probability)
        needs_review = requires_medical_review(probability)
        confidence = calculate_confidence(probability)

        processing_time = (time.time() - start_time) * 1000

        response = PredictionResponse(
            prediction=prediction_label,
            prediction_code=prediction_code,
            probability=round(probability, 4),
            confidence=round(confidence, 4),
            risk_level=risk_level,
            requires_review=needs_review,
            top_factors=top_factors,
            model_version=predictor.model_version,
            prediction_id=prediction_id,
            processing_time_ms=round(processing_time, 2)
        )

        logger.info(
            f"[{prediction_id}] Predicción completada: "
            f"{prediction_label} (prob={probability:.4f}) "
            f"en {processing_time:.2f}ms"
        )

        return response

    except ValueError as e:
        logger.error(f"[{prediction_id}] Error de validación: {e}")
        raise HTTPException(
            status_code=400,
            detail={"error": "validation_error", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"[{prediction_id}] Error interno: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "prediction_error", "message": "Error al procesar la predicción"}
        )


@router.post(
    "/predict/batch",
    summary="Predicción en lote",
    description="Realiza predicciones para múltiples pacientes"
)
async def predict_batch(
    patients: list[PatientDataRequest],
    predictor: Predictor = Depends(get_predictor)
):
    """Endpoint para predicciones en lote."""
    if len(patients) > 100:
        raise HTTPException(
            status_code=400,
            detail="Máximo 100 pacientes por solicitud"
        )

    results = []
    for patient in patients:
        try:
            result = await predict(patient, BackgroundTasks(), predictor)
            results.append({"status": "success", "result": result})
        except HTTPException as e:
            results.append({"status": "error", "error": e.detail})

    return {"predictions": results, "total": len(results)}
