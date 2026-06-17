#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}   YouTube Transcriber — Test Local${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"

# ── 1. Verificar .env files ──────────────────────────────────────────────────
echo -e "${YELLOW}[1/3] Verificando archivos de entorno...${NC}"

if [ ! -f "worker/.env" ]; then
  echo -e "${RED}  ✗ worker/.env no encontrado. Copia worker/.env.example y rellena los valores.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ worker/.env encontrado${NC}"

if [ ! -f "frontend/.env.local" ]; then
  echo -e "${RED}  ✗ frontend/.env.local no encontrado. Copia frontend/.env.local.example y rellena los valores.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ frontend/.env.local encontrado${NC}\n"

# ── 2. Comandos para levantar los servicios ──────────────────────────────────
echo -e "${YELLOW}[2/3] Comandos para levantar los servicios:${NC}\n"

echo -e "${BLUE}  Worker (Terminal 1):${NC}"
echo -e "    cd worker"
echo -e "    python -m venv venv && source venv/bin/activate"
echo -e "    pip install -r requirements.txt"
echo -e "    uvicorn main:app --reload --port 8000\n"

echo -e "${BLUE}  Frontend (Terminal 2):${NC}"
echo -e "    cd frontend"
echo -e "    npm install"
echo -e "    npm run dev\n"

# ── 3. Curl de ejemplo ───────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3] Ejemplo de prueba completa con curl:${NC}\n"

WORKER_SECRET_VAL=$(grep WORKER_SECRET worker/.env | cut -d '=' -f2)

echo -e "${BLUE}  # Paso 1 — Enviar URL al frontend (crea el job):${NC}"
echo -e "  curl -s -X POST http://localhost:3000/api/transcribe \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}' | jq .\n"

echo -e "${BLUE}  # Paso 2 — Consultar el estado (reemplaza JOB_ID):${NC}"
echo -e "  curl -s http://localhost:3000/api/status/JOB_ID | jq .\n"

echo -e "${BLUE}  # Paso 3 — Obtener la transcripción cuando status=done:${NC}"
echo -e "  curl -s http://localhost:3000/api/transcription/JOB_ID | jq .\n"

echo -e "${BLUE}  # Alternativa — Llamar al worker directamente:${NC}"
echo -e "  curl -s -X POST http://localhost:8000/process \\"
echo -e "    -H 'Authorization: Bearer ${WORKER_SECRET_VAL}' \\"
echo -e "    -H 'Content-Type: application/json' \\"
echo -e "    -d '{\"job_id\": \"UUID_DEL_JOB\", \"youtube_url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}' | jq .\n"

echo -e "${BLUE}  # Health check del worker:${NC}"
echo -e "  curl -s http://localhost:8000/health | jq .\n"

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Abre http://localhost:3000 en tu browser${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"
