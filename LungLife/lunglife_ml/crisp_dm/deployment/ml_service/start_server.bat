@echo off
REM =============================================================================
REM LungLife ML Service - Script de inicio para Windows
REM =============================================================================

echo ============================================
echo   LungLife ML Service - Iniciando...
echo ============================================

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no encontrado. Instala Python 3.11+
    pause
    exit /b 1
)

REM Ir al directorio del servicio
cd /d "%~dp0"

REM Crear entorno virtual si no existe
if not exist "venv" (
    echo Creando entorno virtual...
    python -m venv venv
)

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Instalar dependencias
echo Instalando dependencias...
pip install -r requirements.txt --quiet

REM Verificar modelo
if not exist "models\lung_cancer_classifier.joblib" (
    echo ADVERTENCIA: Modelo no encontrado en models\
    echo Copia el modelo antes de continuar.
)

REM Iniciar servidor
echo.
echo ============================================
echo   Iniciando servidor en http://localhost:8000
echo   Swagger UI: http://localhost:8000/docs
echo   Presiona Ctrl+C para detener
echo ============================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
