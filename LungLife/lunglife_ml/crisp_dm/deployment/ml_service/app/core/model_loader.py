"""
Model Loader - Carga y gestión del modelo ML.
"""
import joblib
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Gestiona la carga y uso del modelo de ML.
    
    Responsabilidades:
    - Cargar el modelo serializado
    - Cargar el explainer SHAP
    - Proporcionar predicciones con interpretabilidad
    """
    
    def __init__(
        self,
        model_path: str,
        shap_path: Optional[str] = None,
        config_path: Optional[str] = None
    ):
        self.model_path = Path(model_path)
        self.shap_path = Path(shap_path) if shap_path else None
        self.config_path = Path(config_path) if config_path else None
        
        self.model = None
        self.shap_explainer = None
        self.config: Dict[str, Any] = {}
        self._is_loaded = False
    
    def load(self) -> None:
        """Carga el modelo y recursos asociados."""
        try:
            # Cargar modelo principal
            logger.info(f"Cargando modelo desde: {self.model_path}")
            self.model = joblib.load(self.model_path)
            logger.info("Modelo cargado exitosamente")
            
            # Cargar configuración
            if self.config_path and self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    self.config = json.load(f)
                logger.info(f"Configuración cargada: {self.config}")
            
            # Cargar SHAP explainer (opcional)
            if self.shap_path and self.shap_path.exists():
                try:
                    self.shap_explainer = joblib.load(self.shap_path)
                    logger.info("SHAP explainer cargado")
                except Exception as e:
                    logger.warning(f"No se pudo cargar SHAP: {e}")
            
            self._is_loaded = True
            
        except Exception as e:
            logger.error(f"Error al cargar modelo: {e}")
            raise
    
    @property
    def is_loaded(self) -> bool:
        """Verifica si el modelo está cargado."""
        return self._is_loaded
    
    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        """
        Realiza una predicción.
        
        Args:
            features: Array de características del paciente
            
        Returns:
            Diccionario con predicción, probabilidad e interpretabilidad
        """
        if not self._is_loaded:
            raise RuntimeError("Modelo no cargado")
        
        # Predicción
        prediction = int(self.model.predict(features.reshape(1, -1))[0])
        
        # Probabilidad
        if hasattr(self.model, 'predict_proba'):
            probabilities = self.model.predict_proba(features.reshape(1, -1))[0]
            probability = float(probabilities[1])  # Probabilidad de clase positiva
        else:
            probability = float(prediction)
        
        # Clasificación de riesgo
        risk_level = self._classify_risk(probability)
        
        # Interpretabilidad SHAP
        top_features = []
        if self.shap_explainer is not None:
            try:
                top_features = self._get_shap_contributions(features)
            except Exception as e:
                logger.warning(f"Error al calcular SHAP: {e}")
        
        return {
            "prediction": prediction,
            "probability": probability,
            "risk_level": risk_level,
            "confidence": self._calculate_confidence(probability),
            "top_features": top_features,
            "model_version": self.config.get("version", "1.0.0")
        }
    
    def _classify_risk(self, probability: float) -> str:
        """Clasifica el nivel de riesgo según la probabilidad."""
        if probability < 0.3:
            return "LOW"
        elif probability < 0.5:
            return "MODERATE"
        elif probability < 0.7:
            return "HIGH"
        else:
            return "VERY_HIGH"
    
    def _calculate_confidence(self, probability: float) -> float:
        """Calcula la confianza del modelo."""
        return abs(probability - 0.5) * 2
    
    def _get_shap_contributions(self, features: np.ndarray) -> list:
        """Obtiene las contribuciones SHAP de las características."""
        if self.shap_explainer is None:
            return []
        
        try:
            shap_values = self.shap_explainer.shap_values(features.reshape(1, -1))
            
            # Obtener nombres de features
            feature_names = self.config.get("feature_names", [
                "age", "gender", "smoking", "yellow_fingers", "anxiety",
                "peer_pressure", "chronic_disease", "fatigue", "allergy",
                "wheezing", "alcohol_consuming", "coughing", 
                "shortness_of_breath", "swallowing_difficulty", "chest_pain"
            ])
            
            # Si es clasificación binaria, tomar valores de clase positiva
            if isinstance(shap_values, list):
                values = shap_values[1][0]
            else:
                values = shap_values[0]
            
            # Crear lista de contribuciones
            contributions = []
            for i, (name, value) in enumerate(zip(feature_names, values)):
                contributions.append({
                    "feature": name,
                    "contribution": abs(float(value)),
                    "direction": "positive" if value > 0 else "negative"
                })
            
            # Ordenar por contribución y tomar top 5
            contributions.sort(key=lambda x: x["contribution"], reverse=True)
            return contributions[:5]
            
        except Exception as e:
            logger.error(f"Error en SHAP: {e}")
            return []
