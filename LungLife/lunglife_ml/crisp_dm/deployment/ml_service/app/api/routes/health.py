"""
Health Check Router.
"""
from fastapi import APIRouter
from datetime import datetime
import time

router = APIRouter()

# Tiempo de inicio del servicio
START_TIME = time.time()


@router.get("/health")
async def health_check():
    """
    Endpoint de health check.
    
    Returns:
        Estado del servicio y métricas básicas.
    """
    uptime = time.time() - START_TIME
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime_seconds": round(uptime, 2),
        "version": "1.0.0"
    }


@router.get("/ready")
async def readiness_check():
    """
    Endpoint de readiness check.
    Verifica que el modelo esté cargado.
    """
    from app.main import get_model_loader
    
    model_loader = get_model_loader()
    
    if model_loader and model_loader.is_loaded:
        return {
            "ready": True,
            "model_loaded": True
        }
    else:
        return {
            "ready": False,
            "model_loaded": False
        }
