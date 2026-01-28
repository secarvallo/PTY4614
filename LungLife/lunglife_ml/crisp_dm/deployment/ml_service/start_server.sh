#!/bin/bash
# =============================================================================
# LungLife ML Service - Script de inicio para Linux/Mac
# =============================================================================

echo "============================================"
echo "  LungLife ML Service - Iniciando..."
echo "============================================"

# Ir al directorio del script
cd "$(dirname "$0")"

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "Instalando dependencias..."
pip install -r requirements.txt --quiet

# Verificar modelo
if [ ! -f "models/lung_cancer_classifier.joblib" ]; then
    echo "ADVERTENCIA: Modelo no encontrado en models/"
    echo "Copia el modelo antes de continuar."
fi

# Iniciar servidor
echo ""
echo "============================================"
echo "  Iniciando servidor en http://localhost:8000"
echo "  Swagger UI: http://localhost:8000/docs"
echo "  Presiona Ctrl+C para detener"
echo "============================================"
echo ""

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
