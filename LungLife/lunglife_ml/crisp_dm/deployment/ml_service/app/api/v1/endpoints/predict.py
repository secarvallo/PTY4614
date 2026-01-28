"""
LungLife ML Service - Prediction Endpoints.

This module defines the prediction API endpoints.

Author: LungLife Team
Version: 1.0.0
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.models.schemas import (
    PatientDataRequest,
    PredictionResponse,
    ErrorResponse,
)
from app.services.prediction_service import PredictionService
from app.dependencies import get_prediction_service
from app.core.security import verify_api_key
from app.core.logging import get_logger

router = APIRouter(prefix="/predict", tags=["Predictions"])
logger = get_logger(__name__)


@router.post(
    "/",
    response_model=PredictionResponse,
    responses={
        200: {"description": "Prediction successful"},
        400: {"model": ErrorResponse, "description": "Invalid input data"},
        401: {"model": ErrorResponse, "description": "Authentication failed"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Generate lung cancer prediction",
    description="""
    Analyze patient data and generate a lung cancer stage prediction.

    The endpoint receives patient clinical and demographic data,
    processes it through the trained ML model, and returns:
    - Prediction (Early/Advanced stage)
    - Probability score
    - Risk level classification
    - Top contributing factors
    - Clinical recommendations
    """
)
async def create_prediction(
    patient_data: PatientDataRequest,
    request: Request,
    prediction_service: PredictionService = Depends(get_prediction_service),
    api_key: str = Depends(verify_api_key),
) -> PredictionResponse:
    """
    Generate prediction for patient data.

    Args:
        patient_data: Patient clinical and demographic data
        request: FastAPI request object
        prediction_service: Injected prediction service
        api_key: Validated API key

    Returns:
        PredictionResponse with prediction details

    Raises:
        HTTPException: If prediction fails
    """
    try:
        # Log incoming request
        request_id = request.headers.get("X-Request-ID", "unknown")
        logger.info(
            f"Prediction request received",
            extra={
                "request_id": request_id,
                "patient_age": patient_data.age,
                "smoking_history": patient_data.smoking_history.value,
            }
        )

        # Generate prediction
        prediction_result = prediction_service.predict(patient_data)

        # Log successful prediction
        logger.info(
            f"Prediction completed",
            extra={
                "request_id": request_id,
                "prediction": prediction_result.prediction,
                "risk_level": prediction_result.risk_level.value,
            }
        )

        return prediction_result

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input data: {str(e)}"
        )
    except Exception as e:
        logger.exception(f"Prediction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during prediction"
        )


@router.post(
    "/batch",
    response_model=list[PredictionResponse],
    summary="Batch predictions",
    description="Process multiple patient predictions in a single request"
)
async def create_batch_predictions(
    patients_data: list[PatientDataRequest],
    prediction_service: PredictionService = Depends(get_prediction_service),
    api_key: str = Depends(verify_api_key),
) -> list[PredictionResponse]:
    """
    Generate predictions for multiple patients.

    Args:
        patients_data: List of patient data
        prediction_service: Injected prediction service
        api_key: Validated API key

    Returns:
        List of PredictionResponse objects
    """
    if len(patients_data) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum batch size is 100 patients"
        )

    predictions = []
    for patient_data in patients_data:
        try:
            prediction = prediction_service.predict(patient_data)
            predictions.append(prediction)
        except Exception as e:
            logger.error(f"Batch prediction failed for patient: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Batch prediction failed: {str(e)}"
            )

    return predictions
