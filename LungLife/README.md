# LungLife - Guia de Inicio de Servicios

Esta guia describe como inicializar los tres servicios principales del proyecto LungLife.

---

## Requisitos Previos

- Node.js v18+
- Python 3.12+
- PostgreSQL 18 (debe estar corriendo)
- Git Bash o terminal compatible

---

## Arquitectura de Servicios

```
+------------------+       +------------------+       +------------------+
|    Frontend      | ----> |     Backend      | ----> |   ML Service     |
|  Angular/Ionic   |       |     Node.js      |       |  Python/FastAPI  |
|   Puerto 8100    |       |   Puerto 3000    |       |   Puerto 8000    |
+------------------+       +------------------+       +------------------+
                                   |
                                   v
                           +------------------+
                           |   PostgreSQL     |
                           |   Puerto 5432    |
                           +------------------+
```

---

## Orden de Inicio Recomendado

1. PostgreSQL (debe estar corriendo como servicio)
2. ML Service (Python)
3. Backend (Node.js)
4. Frontend (Angular/Ionic)

---

## 1. ML Service (Python/FastAPI)

Ubicacion: `LungLife/lunglife_ml/crisp_dm/deployment/ml_service/`

### Terminal 1 - Iniciar ML Service

```bash
cd LungLife/lunglife_ml/crisp_dm/deployment/ml_service
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Verificar funcionamiento

```bash
curl http://localhost:8000/api/v1/health
```

Respuesta esperada:
```json
{"status":"healthy","uptime_seconds":...,"version":"1.0.0"}
```

### Notas

- El modelo se carga automaticamente al iniciar
- Advertencias de version de scikit-learn pueden ignorarse
- SHAP es opcional (advertencia si no esta instalado)

---

## 2. Backend (Node.js/Express)

Ubicacion: `LungLife/lunglife_backend/`

### Terminal 2 - Iniciar Backend

```bash
cd LungLife/lunglife_backend
npm run dev
```

### Verificar funcionamiento

```bash
curl http://localhost:3000/api/health
```

O si usa puerto alternativo:
```bash
curl http://localhost:3002/api/health
```

Respuesta esperada:
```json
{"status":"healthy","database":"connected",...}
```

### Verificar conexion con ML Service

```bash
curl http://localhost:3000/api/ml/health
```

### Notas

- El puerto por defecto es 3000
- Si 3000 esta ocupado, usa automaticamente 3001, 3002, etc.
- Requiere archivo `.env` configurado
- Swagger disponible en: http://localhost:3000/api-docs

---

## 3. Frontend (Angular/Ionic)

Ubicacion: `LungLife/lunglife_frontend/`

### Terminal 3 - Iniciar Frontend

```bash
cd LungLife/lunglife_frontend
ionic serve
```

O alternativamente:
```bash
ng serve --open
```

### Verificar funcionamiento

Abrir en navegador: http://localhost:8100

### Notas

- El puerto por defecto es 8100
- Hot reload activado por defecto
- Requiere que el backend este corriendo para funcionalidad completa

---

## Comandos Rapidos (Copiar y Pegar)

### Opcion A: Tres terminales separadas

Terminal 1 (ML Service):
```bash
cd "c:/Users/scarv/Desktop/PTY4614/LungLife/lunglife_ml/crisp_dm/deployment/ml_service" && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Terminal 2 (Backend):
```bash
cd "c:/Users/scarv/Desktop/PTY4614/LungLife/lunglife_backend" && npm run dev
```

Terminal 3 (Frontend):
```bash
cd "c:/Users/scarv/Desktop/PTY4614/LungLife/lunglife_frontend" && ionic serve
```

### Opcion B: Script de inicio (Windows)

Crear archivo `start_all.bat` en la raiz del proyecto:

```batch
@echo off
echo Iniciando LungLife Services...

start "ML Service" cmd /k "cd /d c:\Users\scarv\Desktop\PTY4614\LungLife\lunglife_ml\crisp_dm\deployment\ml_service && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 5

start "Backend" cmd /k "cd /d c:\Users\scarv\Desktop\PTY4614\LungLife\lunglife_backend && npm run dev"

timeout /t 5

start "Frontend" cmd /k "cd /d c:\Users\scarv\Desktop\PTY4614\LungLife\lunglife_frontend && ionic serve"

echo Todos los servicios iniciados.
pause
```

---

## Verificacion Completa

Ejecutar en orden para verificar que todo funciona:

```bash
# 1. Verificar ML Service
curl -s http://localhost:8000/api/v1/health

# 2. Verificar Backend
curl -s http://localhost:3000/api/health

# 3. Verificar conexion Backend -> ML
curl -s http://localhost:3000/api/ml/health

# 4. Abrir Frontend
# Navegador: http://localhost:8100
```

---

## Solucion de Problemas

### Puerto en uso

Si un puerto esta ocupado:

```bash
# Windows - Ver que proceso usa el puerto
netstat -ano | findstr :8000

# Matar proceso por PID
taskkill /PID <numero_pid> /F
```

### ML Service no responde

1. Verificar que Python 3.12+ esta instalado
2. Verificar que las dependencias estan instaladas:
   ```bash
   cd lunglife_ml/crisp_dm/deployment/ml_service
   pip install -r requirements.txt
   ```

### Backend no conecta a base de datos

1. Verificar que PostgreSQL esta corriendo
2. Verificar credenciales en `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=lunglife_db
   DB_USER=postgres
   DB_PASSWORD=tu_password
   ```

### Frontend no conecta al Backend

1. Verificar que el backend esta corriendo
2. Verificar `environment.ts`:
   ```typescript
   export const environment = {
     apiUrl: 'http://localhost:3000/api'
   };
   ```

---

## Endpoints Principales

### ML Service (Puerto 8000)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /api/v1/health | Estado del servicio |
| POST | /api/v1/predict | Generar prediccion |

### Backend (Puerto 3000)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /api/health | Estado del servicio |
| GET | /api/ml/health | Estado del ML Service |
| POST | /api/ml/predict/:patientId | Generar prediccion para paciente |
| GET | /api/clinical-profile | Perfil clinico del paciente |

### Frontend (Puerto 8100)

| Ruta | Descripcion |
|------|-------------|
| /auth/login | Inicio de sesion |
| /dashboard | Panel principal |
| /clinical-profile | Perfil clinico con riesgo ML |

---

## Variables de Entorno

### Backend (.env)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lunglife_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ML Service
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_MAX_RETRIES=3
```

### ML Service (.env)

```env
MODEL_PATH=models/lung_cancer_classifier.joblib
SHAP_PATH=models/shap_explainer.joblib
CONFIG_PATH=models/model_config.json
LOG_LEVEL=INFO
```

---

## Resumen de Puertos

| Servicio | Puerto | Protocolo |
|----------|--------|-----------|
| PostgreSQL | 5432 | TCP |
| ML Service | 8000 | HTTP |
| Backend | 3000 | HTTP |
| Frontend | 8100 | HTTP |

---

Ultima actualizacion: Enero 2026
