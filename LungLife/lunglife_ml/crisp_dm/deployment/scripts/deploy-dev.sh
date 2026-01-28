#!/bin/bash
# =============================================================================
# LUNGLIFE - SCRIPT DE DESPLIEGUE (DESARROLLO)
# =============================================================================

set -e  # Detener en caso de error

echo "=============================================="
echo "   LUNGLIFE - Despliegue de Desarrollo"
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker no está instalado${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker y Docker Compose detectados${NC}"

# Verificar archivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando archivo .env desde .env.example...${NC}"
    cp .env.example .env
fi

# Detener contenedores existentes
echo -e "${YELLOW}Deteniendo contenedores existentes...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true

# Construir imágenes
echo -e "${YELLOW}Construyendo imágenes Docker...${NC}"
docker-compose build

# Iniciar servicios
echo -e "${YELLOW}Iniciando servicios...${NC}"
docker-compose up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}Esperando a que los servicios estén listos...${NC}"
sleep 10

# Verificar salud de los servicios
echo ""
echo "=============================================="
echo "   Verificando Servicios"
echo "=============================================="

# PostgreSQL
if docker exec lunglife-postgres pg_isready -U lunglife_user -d lunglife_db &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL: Healthy${NC}"
else
    echo -e "${RED}✗ PostgreSQL: Not Ready${NC}"
fi

# ML Service
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ ML Service: Healthy${NC}"
else
    echo -e "${RED}✗ ML Service: Not Ready${NC}"
fi

# Backend
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend: Healthy${NC}"
else
    echo -e "${RED}✗ Backend: Not Ready${NC}"
fi

# Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8100 | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend: Healthy${NC}"
else
    echo -e "${RED}✗ Frontend: Not Ready${NC}"
fi

echo ""
echo "=============================================="
echo "   URLs de Acceso"
echo "=============================================="
echo -e "Frontend:    ${GREEN}http://localhost:8100${NC}"
echo -e "Backend API: ${GREEN}http://localhost:3000/api${NC}"
echo -e "ML Service:  ${GREEN}http://localhost:8000${NC}"
echo -e "Swagger:     ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${GREEN}¡Despliegue completado exitosamente!${NC}"
