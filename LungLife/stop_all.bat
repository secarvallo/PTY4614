@echo off
REM ============================================
REM LungLife - Script para Detener Servicios
REM ============================================

echo.
echo LungLife - Deteniendo servicios...
echo.

REM Detener procesos por puerto
echo Deteniendo ML Service (puerto 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Deteniendo Backend (puerto 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Deteniendo Backend alternativo (puerto 3002)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Deteniendo Frontend (puerto 8100)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8100 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Todos los servicios han sido detenidos.
echo.
pause
