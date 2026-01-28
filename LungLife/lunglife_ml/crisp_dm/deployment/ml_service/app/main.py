"""
LungLife ML Service - FastAPI Application
Motor de inferencia para predicción de riesgo de cáncer pulmonar.

Versión: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from typing import Optional
from pathlib import Path

from app.config import settings
from app.core.model_loader import ModelLoader
from app.api.routes import health, prediction

# =============================================================================
# LOGGING
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# =============================================================================
# GLOBAL MODEL INSTANCE
# =============================================================================
_model_loader: Optional[ModelLoader] = None


def get_model_loader() -> Optional[ModelLoader]:
    """Obtiene la instancia global del model loader."""
    return _model_loader


# =============================================================================
# LIFESPAN
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación."""
    global _model_loader
    
    logger.info("=" * 60)
    logger.info("Iniciando LungLife ML Service...")
    
    # Paths de modelos
    base_path = Path(__file__).parent.parent / "models"
    model_path = base_path / "lung_cancer_classifier.joblib"
    shap_path = base_path / "shap_explainer.joblib"
    config_path = base_path / "model_config.json"
    
    logger.info(f"Model path: {model_path}")
    logger.info(f"Model exists: {model_path.exists()}")
    
    try:
        _model_loader = ModelLoader(
            model_path=str(model_path),
            shap_path=str(shap_path) if shap_path.exists() else None,
            config_path=str(config_path) if config_path.exists() else None
        )
        _model_loader.load()
        logger.info("✓ Modelo cargado exitosamente")
    except Exception as e:
        logger.error(f"✗ Error al cargar modelo: {e}")
        logger.warning("Servicio continuará sin modelo")
    
    logger.info("ML Service listo")
    logger.info("=" * 60)
    
    yield
    
    logger.info("Cerrando ML Service...")
    _model_loader = None


# =============================================================================
# APPLICATION
# =============================================================================
def create_application() -> FastAPI:
    """Factory function para crear la aplicación FastAPI."""
    application = FastAPI(
        title="LungLife ML Service",
        description="API REST para predicción de riesgo de cáncer pulmonar",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    application.include_router(health.router, prefix="/api/v1", tags=["Health"])
    application.include_router(prediction.router, prefix="/api/v1", tags=["Prediction"])

    return application


# Crear instancia
app = create_application()


# =============================================================================
# MIDDLEWARE
# =============================================================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para logging de requests."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    response.headers["X-Process-Time"] = str(process_time)
    return response


# =============================================================================
# ROOT ENDPOINT
# =============================================================================
@app.get("/")
async def root():
    """Endpoint raíz con información del servicio."""
    return {
        "service": "LungLife ML Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
