#!/bin/bash
# ============================================
# LungLife - Service Startup Script
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "LungLife - Starting services..."
echo ""

# Check PostgreSQL
echo "[1/4] Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "ERROR: PostgreSQL is not running on port 5432"
    exit 1
fi
echo "OK: PostgreSQL available"

# Function to check if a port is in use
check_port() {
    netstat -tuln 2>/dev/null | grep -q ":$1 " && return 0 || return 1
}

# Start ML Service
echo ""
echo "[2/4] Starting ML Service (Port 8000)..."
cd "$SCRIPT_DIR/lunglife_ml/crisp_dm/deployment/ml_service"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
ML_PID=$!
echo "ML Service PID: $ML_PID"
sleep 5

# Start Backend
echo ""
echo "[3/4] Starting Backend (Port 3000)..."
cd "$SCRIPT_DIR/lunglife_backend"
npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Start Frontend
echo ""
echo "[4/4] Starting Frontend (Port 8100)..."
cd "$SCRIPT_DIR/lunglife_frontend"
ionic serve &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "============================================"
echo "All services have been started"
echo "============================================"
echo ""
echo "Services:"
echo "  - ML Service:  http://localhost:8000 (PID: $ML_PID)"
echo "  - Backend:     http://localhost:3000 (PID: $BACKEND_PID)"
echo "  - Frontend:    http://localhost:8100 (PID: $FRONTEND_PID)"
echo "  - Swagger:     http://localhost:3000/api-docs"
echo ""
echo "To stop all services:"
echo "  kill $ML_PID $BACKEND_PID $FRONTEND_PID"
echo ""

# Save PIDs for stop script
echo "$ML_PID" > "$SCRIPT_DIR/.lunglife_pids"
echo "$BACKEND_PID" >> "$SCRIPT_DIR/.lunglife_pids"
echo "$FRONTEND_PID" >> "$SCRIPT_DIR/.lunglife_pids"

# Wait for any process to finish
wait
