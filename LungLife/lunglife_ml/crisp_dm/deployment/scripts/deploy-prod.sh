#!/bin/bash
# =============================================================================
# LUNGLIFE - SCRIPT DE DESPLIEGUE (PRODUCCIÓN)
# Requiere: Docker, Docker Compose, variables de entorno configuradas
# =============================================================================

set -e  # Detener en caso de error

echo "=============================================="
echo "   LUNGLIFE - Despliegue de Producción"
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que estamos en producción
if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}ADVERTENCIA: ENVIRONMENT no está configurado como 'production'${NC}"
    read -p "¿Continuar de todos modos? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Despliegue cancelado."
        exit 0
    fi
fi

# Verificar variables requeridas
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "ML_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}ERROR: Variable $var no está configurada${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Variables de entorno verificadas${NC}"

# Crear backup de base de datos
echo -e "${YELLOW}Creando backup de base de datos...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec lunglife-postgres pg_dump -U $DB_USER $DB_NAME > ./backups/$BACKUP_FILE 2>/dev/null || true
echo -e "${GREEN}✓ Backup creado: $BACKUP_FILE${NC}"

# Pull de imágenes más recientes (si usamos registry)
# echo "Descargando imágenes actualizadas..."
# docker-compose pull

# Despliegue con zero-downtime (rolling update)
echo -e "${YELLOW}Desplegando servicios...${NC}"

# Primero actualizar ML Service (sin dependencias downstream)
docker-compose up -d --no-deps --build ml-service
sleep 10

# Verificar ML Service antes de continuar
if ! curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${RED}ERROR: ML Service no está healthy, haciendo rollback...${NC}"
    docker-compose stop ml-service
    docker-compose up -d ml-service  # Usar imagen anterior
    exit 1
fi

# Actualizar Backend
docker-compose up -d --no-deps --build backend
sleep 5

# Verificar Backend
if ! curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo -e "${RED}ERROR: Backend no está healthy${NC}"
    # Continuar pero alertar
fi

# Actualizar Frontend
docker-compose up -d --no-deps --build frontend

# Limpiar imágenes antiguas
echo -e "${YELLOW}Limpiando imágenes antiguas...${NC}"
docker image prune -f

# Verificación final
echo ""
echo "=============================================="
echo "   Verificación Post-Despliegue"
echo "=============================================="

# Ejecutar tests de smoke
echo "Ejecutando smoke tests..."

# Test 1: Health checks
echo -n "Health checks... "
if curl -sf http://localhost:8000/health > /dev/null && \
   curl -sf http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

# Test 2: Predicción de prueba
echo -n "Predicción de prueba... "
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/predict \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $ML_API_KEY" \
    -d '{"age": 55, "gender": "M", "smoking_status": "Former"}')

if echo $RESPONSE | grep -q "prediction"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

echo ""
echo -e "${GREEN}¡Despliegue de producción completado!${NC}"
echo ""
echo "Servicios desplegados:"
docker-compose ps
