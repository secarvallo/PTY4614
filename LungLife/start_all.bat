@echo off
REM ============================================
REM LungLife - Script de Inicio de Servicios
REM ============================================

REM Configurar password de PostgreSQL
set PGPASSWORD=336911

echo.
echo LungLife - Iniciando servicios...
echo.

REM Verificar que PostgreSQL esta corriendo
echo [1/4] Verificando PostgreSQL...
"C:\Program Files\PostgreSQL\18\bin\psql" -h localhost -p 5432 -U postgres -d lunglife_db -c "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PostgreSQL no esta corriendo o no se puede conectar
    echo Verifique que el servicio PostgreSQL este iniciado.
    pause
    exit /b 1
)
echo OK: PostgreSQL disponible

REM Iniciar ML Service
echo.
echo [2/4] Iniciando ML Service (Python/FastAPI - Puerto 8000)...
start "LungLife ML Service" cmd /k "cd /d %~dp0lunglife_ml\crisp_dm\deployment\ml_service && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Esperar a que ML Service este listo
echo Esperando que ML Service inicie...
timeout /t 8 /nobreak >nul

REM Iniciar Backend
echo.
echo [3/4] Iniciando Backend (Node.js/Express - Puerto 3000)...
start "LungLife Backend" cmd /k "cd /d %~dp0lunglife_backend && npm run dev"

REM Esperar a que Backend este listo
echo Esperando que Backend inicie...
timeout /t 5 /nobreak >nul

REM Iniciar Frontend
echo.
echo [4/4] Iniciando Frontend (Angular/Ionic - Puerto 8100)...
start "LungLife Frontend" cmd /k "cd /d %~dp0lunglife_frontend && ionic serve"

echo.
echo ============================================
echo Todos los servicios han sido iniciados
echo ============================================
echo.
echo Servicios:
echo   - ML Service:  http://localhost:8000
echo   - Backend:     http://localhost:3000
echo   - Frontend:    http://localhost:8100
echo   - Swagger:     http://localhost:3000/api-docs
echo.
echo Para detener los servicios, cierre las ventanas
echo de terminal correspondientes.
echo.
pause
