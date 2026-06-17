# YouTube Transcription Service

Transcribe cualquier video de YouTube con diarización de speakers (quién habla y cuándo).

## Estructura del monorepo

```
/
├── frontend/       # Next.js 14 (App Router) — deploy en Vercel
├── worker/         # FastAPI Python 3.11 — deploy en Railway
└── supabase/       # Migraciones SQL
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Worker | FastAPI, Python 3.11 |
| Base de datos | Supabase PostgreSQL |
| Storage | Supabase Storage (audio temporal) |
| Transcripción | Deepgram API (nova-2) |
| Deploy frontend | Vercel |
| Deploy worker | Railway (Docker) |

## Setup local

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edita .env.local con tus keys de Supabase, worker URL y secret
npm run dev
```

### Worker

```bash
cd worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env con tus keys de Supabase, Deepgram y WORKER_SECRET
uvicorn main:app --reload --port 8000
```

## Flujo

1. Usuario pega URL de YouTube → frontend crea un job en Supabase
2. Frontend llama al worker en background con el job_id
3. Worker descarga el audio, lo transcribe con Deepgram y guarda el resultado
4. Frontend hace polling cada 3s hasta que el job está `done`
5. Se muestra la transcripción con speakers diferenciados y timestamps

## Variables de entorno

Ver `frontend/.env.local.example` y `worker/.env.example`.
