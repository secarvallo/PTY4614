#!/bin/powershell
# Diagnóstico de Compilación - LungLife Frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNÓSTICO DE COMPILACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar Node
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
node --version
npm --version
Write-Host ""

# Paso 2: Verificar que los procesos anteriores están detenidos
Write-Host "[2/5] Verificando procesos node/ng..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*ng*" }
if ($processes) {
    Write-Host "⚠️ Encontrados procesos node/ng corriendo. Deteniendo..." -ForegroundColor Red
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "✅ Procesos detenidos" -ForegroundColor Green
} else {
    Write-Host "✅ No hay procesos node/ng" -ForegroundColor Green
}
Write-Host ""

# Paso 3: Cambiar a directorio frontend
Write-Host "[3/5] Entrando a directorio frontend..." -ForegroundColor Yellow
cd "C:\Users\scarv\OneDrive\Escritorio\PTY4614\LungLife\lunglife_frontend"
Write-Host "📁 Ubicación actual: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Paso 4: Limpiar cache
Write-Host "[4/5] Limpiando cache de npm..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "✅ Cache limpiado" -ForegroundColor Green
Write-Host ""

# Paso 5: Instalar dependencias
Write-Host "[5/5] Instalando dependencias..." -ForegroundColor Yellow
npm install
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DIAGNÓSTICO COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora ejecuta:" -ForegroundColor Yellow
Write-Host "npm run start" -ForegroundColor Cyan
