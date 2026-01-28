# ============================================================================
# LungLife MVP - Guía de Troubleshooting
# Versión: 1.0.0
# ============================================================================

## 1. VERIFICACIÓN DE ESTADO DE SERVICIOS

### 1.1 Verificar todos los contenedores
```bash
docker-compose ps
```
Salida esperada:
```
NAME                    STATUS              PORTS
lunglife_frontend       Up (healthy)        0.0.0.0:8100->80/tcp
lunglife_backend        Up (healthy)        0.0.0.0:3000->3000/tcp
lunglife_ml_service     Up (healthy)        0.0.0.0:8000->8000/tcp
lunglife_postgres       Up (healthy)        0.0.0.0:5432->5432/tcp
lunglife_redis          Up (healthy)        0.0.0.0:6379->6379/tcp
```

### 1.2 Health Checks individuales
```bash
# Frontend
curl http://localhost:8100/health

# Backend
curl http://localhost:3000/api/health

# ML Service
curl http://localhost:8000/health

# PostgreSQL
docker exec lunglife_postgres pg_isready -U lunglife_user

# Redis
docker exec lunglife_redis redis-cli ping
```

## 2. COMANDOS DE DIAGNÓSTICO

### 2.1 Ver logs en tiempo real
```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f ml-service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 2.2 Inspeccionar contenedor
```bash
docker inspect lunglife_ml_service
docker exec -it lunglife_ml_service /bin/sh
```

### 2.3 Verificar uso de recursos
```bash
docker stats
```

### 2.4 Verificar red Docker
```bash
docker network inspect lunglife-network
```

## 3. PROBLEMAS DE CONEXIÓN

### 3.1 Backend no puede conectar a ML Service
**Síntoma:** Error "ECONNREFUSED" o timeout
**Diagnóstico:**
```bash
# Desde dentro del backend
docker exec lunglife_backend curl http://ml-service:8000/health
```
**Soluciones:**
1. Verificar que ml-service esté corriendo
2. Verificar que estén en la misma red Docker
3. Verificar firewall/security groups

### 3.2 Backend no puede conectar a PostgreSQL
**Síntoma:** "Connection refused" o "FATAL: password authentication failed"
**Diagnóstico:**
```bash
docker exec lunglife_backend nc -zv postgres 5432
```
**Soluciones:**
1. Verificar credenciales en .env
2. Esperar a que PostgreSQL esté completamente iniciado
3. Verificar healthcheck de postgres

## 4. PROBLEMAS DE ML SERVICE

### 4.1 Modelo no carga
**Síntoma:** "Model not found" o "Failed to load model"
**Diagnóstico:**
```bash
docker exec lunglife_ml_service ls -la /app/models
docker exec lunglife_ml_service cat /app/logs/ml_service.log
```
**Soluciones:**
1. Verificar que el volumen ml-models esté montado
2. Verificar MODEL_PATH en variables de entorno
3. Verificar permisos del archivo del modelo

### 4.2 Predicciones lentas o timeout
**Síntoma:** Requests tardan > 10s o fallan por timeout
**Diagnóstico:**
```bash
docker exec lunglife_ml_service top
docker stats lunglife_ml_service
```
**Soluciones:**
1. Aumentar memory limit del contenedor
2. Reducir ML_MAX_WORKERS si hay swap excesivo
3. Verificar que el modelo no sea demasiado grande

### 4.3 Error de SHAP/Interpretabilidad
**Síntoma:** "SHAP explainer not available"
**Diagnóstico:**
```bash
docker exec lunglife_ml_service python -c "import shap; print(shap.__version__)"
```
**Soluciones:**
1. Verificar que shap esté instalado en requirements.txt
2. El modelo debe ser compatible con TreeExplainer
3. Deshabilitar SHAP temporalmente con flag DISABLE_SHAP=true

## 5. PROBLEMAS DE FRONTEND

### 5.1 Página en blanco
**Síntoma:** Browser muestra página vacía
**Diagnóstico:**
```bash
docker exec lunglife_frontend cat /usr/share/nginx/html/index.html
docker exec lunglife_frontend nginx -t
```
**Soluciones:**
1. Verificar que el build de Angular fue exitoso
2. Revisar nginx.conf para errores de sintaxis
3. Verificar rutas en angular.json

### 5.2 API calls fallan (CORS)
**Síntoma:** "Access-Control-Allow-Origin" errors
**Soluciones:**
1. Verificar CORS_ORIGINS en backend .env
2. Verificar proxy en nginx.conf
3. Usar /api/ prefix para todas las llamadas

## 6. REINICIO Y RECUPERACIÓN

### 6.1 Reinicio suave
```bash
docker-compose restart <service>
```

### 6.2 Reinicio completo
```bash
docker-compose down
docker-compose up -d
```

### 6.3 Reconstruir desde cero
```bash
docker-compose down -v  # Elimina volúmenes
docker-compose build --no-cache
docker-compose up -d
```

### 6.4 Limpiar recursos Docker
```bash
docker system prune -af
docker volume prune -f
```

## 7. MONITOREO Y ALERTAS

### 7.1 Endpoints de métricas
- ML Service: http://localhost:8000/metrics (Prometheus format)
- Backend: http://localhost:3000/api/metrics

### 7.2 Logs estructurados
Todos los servicios escriben logs en formato JSON a /app/logs/
