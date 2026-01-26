"""
Configuración del ML Service.
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Configuración de la aplicación."""
    
    # Paths
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models/lung_cancer_classifier.joblib")
    SHAP_PATH: str = os.getenv("SHAP_PATH", "./models/shap_explainer.joblib")
    CONFIG_PATH: str = os.getenv("CONFIG_PATH", "./models/model_config.json")
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8100",
        "http://localhost:4200",
        "http://localhost:3000"
    ]
    
    # Model
    MODEL_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
