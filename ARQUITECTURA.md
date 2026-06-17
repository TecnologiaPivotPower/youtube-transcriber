# YouTube Transcription Service — Arquitectura & Plan para Claude Code

## Stack tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Frontend | Next.js 14 (App Router) en Vercel | UI + API Routes |
| Worker | FastAPI en Railway | Descarga audio + llama Deepgram |
| Base de datos | Supabase PostgreSQL | Jobs + transcripciones |
| Storage | Supabase Storage | Audio temporal (MP3) |
| Transcripción | Deepgram API (nova-2) | Speech-to-text con diarización |
| Estilos | TailwindCSS | UI |

---

## Estructura de carpetas

```
/
├── frontend/                        # Next.js — deploy en Vercel
│   ├── app/
│   │   ├── page.tsx                 # Home: formulario de URL
│   │   ├── transcription/[id]/
│   │   │   └── page.tsx             # Viewer de transcripción
│   │   └── api/
│   │       ├── transcribe/
│   │       │   └── route.ts         # POST: crea job, llama worker
│   │       ├── status/[id]/
│   │       │   └── route.ts         # GET: estado del job
│   │       └── transcription/[id]/
│   │           └── route.ts         # GET: resultado final
│   ├── components/
│   │   ├── UrlForm.tsx
│   │   ├── StatusPoller.tsx
│   │   └── TranscriptionViewer.tsx
│   ├── lib/
│   │   └── supabase.ts              # Cliente Supabase
│   └── .env.local
│
└── worker/                          # FastAPI — deploy en Railway
    ├── main.py                      # Servidor FastAPI
    ├── services/
    │   ├── youtube.py               # Lógica yt-dlp
    │   ├── deepgram_client.py       # Llamada a Deepgram
    │   └── supabase_client.py       # Update jobs + insert transcription
    ├── requirements.txt
    ├── Dockerfile
    └── .env
```

---

## Esquema de base de datos (Supabase)

```sql
-- Tabla de jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status values: 'pending' | 'processing' | 'done' | 'error'
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de transcripciones
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  segments JSONB NOT NULL,
  -- segments: [{speaker, start, end, text}, ...]
  language TEXT,
  duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Supabase Storage:** Crear bucket privado llamado `audio-temp`.

---

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WORKER_URL=https://xxxx.up.railway.app
WORKER_SECRET=un_token_secreto_para_auth_interna
```

### Worker (`worker/.env`)
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEEPGRAM_API_KEY=xxxx
WORKER_SECRET=un_token_secreto_para_auth_interna
```

---

## Flujo completo (paso a paso)

1. **Usuario** pega URL de YouTube en el formulario y hace submit.
2. **POST /api/transcribe** (Vercel):
   - Valida que la URL sea de YouTube.
   - Inserta row en `jobs` con status `pending`.
   - Llama en background al worker: `POST {WORKER_URL}/process` con `{job_id, youtube_url}` y header `Authorization: Bearer {WORKER_SECRET}`.
   - Retorna `{ job_id }` al frontend.
3. **Frontend** redirige a `/transcription/{job_id}` y empieza polling cada 3s a `GET /api/status/{job_id}`.
4. **Worker Railway** recibe `/process`:
   - Actualiza job a `processing`.
   - Descarga audio con yt-dlp en `/tmp/{job_id}.mp3`.
   - Sube el MP3 a Supabase Storage bucket `audio-temp`.
   - Llama Deepgram con `diarize=true`, `punctuate=true`, `smart_format=true`, `model=nova-2`.
   - Parsea respuesta: extrae `full_text` y `segments` con speaker + timestamps.
   - Inserta en tabla `transcriptions`.
   - Actualiza job a `done`.
   - Elimina el archivo de audio de Storage.
5. **GET /api/status/{id}** detecta `done` → **GET /api/transcription/{id}** devuelve los datos.
6. **Frontend** muestra la transcripción con speakers diferenciados y timestamps.

---

## Decisiones de diseño importantes

- **Auth interna worker:** El worker no es público — solo acepta requests con `Authorization: Bearer {WORKER_SECRET}`. Esto evita que cualquiera abuse del endpoint.
- **Audio temporal:** Los MP3 se suben a Supabase Storage solo como respaldo en caso de que el worker falle mid-process. Se borran inmediatamente después de que Deepgram retorna la transcripción.
- **Polling vs Webhooks:** Se usa polling desde el frontend (cada 3s) por simplicidad. No se necesita WebSocket.
- **yt-dlp en Docker:** Railway corre un Dockerfile que incluye yt-dlp y ffmpeg como dependencias del sistema.
- **Deepgram modelo:** `nova-2` es el modelo más preciso de Deepgram. Con `diarize=true` distingue speakers (Speaker 0, Speaker 1, etc.).

---

## Prompts para Claude Code

A continuación los prompts, en el orden que deben ejecutarse.

---

### PROMPT 1 — Setup inicial del monorepo

```
Quiero crear un proyecto de transcripción de videos de YouTube. El proyecto tiene dos partes:

1. `frontend/` — Next.js 14 con App Router, TypeScript, TailwindCSS
2. `worker/` — FastAPI con Python 3.11

Por favor:
1. Inicializa el monorepo con una carpeta raíz que contenga ambos proyectos.
2. En `frontend/`, crea el proyecto Next.js con: `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
3. En `worker/`, crea la estructura base:
   - `main.py` (servidor FastAPI vacío)
   - `services/` (carpeta vacía con __init__.py)
   - `requirements.txt` con: fastapi, uvicorn, python-dotenv, supabase, deepgram-sdk, yt-dlp
   - `Dockerfile`
   - `.env.example`
4. En `frontend/`, instala la dependencia `@supabase/supabase-js`.
5. Crea un `README.md` en la raíz explicando la estructura.

No implementes lógica aún, solo la estructura de archivos y configuración base.
```

---

### PROMPT 2 — Base de datos Supabase

```
Voy a configurar Supabase para el proyecto. Necesito que crees los siguientes archivos:

1. `supabase/migrations/001_initial.sql` con este esquema exacto:

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  segments JSONB NOT NULL,
  language TEXT,
  duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

2. `frontend/lib/supabase.ts` — cliente Supabase para el frontend usando las env vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Exporta tanto el cliente público como un cliente admin con `SUPABASE_SERVICE_ROLE_KEY` (solo para uso en API routes server-side).

3. `frontend/.env.local.example` con todas las variables necesarias documentadas.

Agrega también los tipos TypeScript para las tablas en `frontend/types/database.ts`.
```

---

### PROMPT 3 — API Routes del frontend (Vercel)

```
Implementa las tres API routes de Next.js para el frontend:

**`frontend/app/api/transcribe/route.ts`** — POST
- Recibe body: `{ url: string }`
- Valida que la URL sea de YouTube (regex que acepte youtube.com/watch?v= y youtu.be/)
- Crea un job en Supabase con status 'pending' y la URL
- Llama al worker en background: `fetch(process.env.WORKER_URL + '/process', { method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.WORKER_SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id, youtube_url }) })`
- No espera la respuesta del worker (fire and forget)
- Retorna `{ job_id }` con status 200
- En caso de error, retorna mensaje descriptivo con status apropiado

**`frontend/app/api/status/[id]/route.ts`** — GET
- Recibe `id` del job por params
- Consulta Supabase por el job
- Retorna `{ status, error_msg }` — status puede ser: pending | processing | done | error
- Si no existe el job, retorna 404

**`frontend/app/api/transcription/[id]/route.ts`** — GET
- Recibe `id` del job por params
- Consulta Supabase join entre jobs y transcriptions
- Solo retorna datos si el job tiene status 'done'
- Retorna `{ job, transcription }` donde transcription incluye full_text, segments, language, duration_seconds
- Si el job no está done, retorna 404 con mensaje "Transcription not ready yet"

Usa el cliente admin de Supabase (service role) en todas las routes.
Maneja todos los errores con try/catch y responses apropiadas.
```

---

### PROMPT 4 — Worker FastAPI (Railway)

```
Implementa el worker en Python/FastAPI en la carpeta `worker/`.

**`worker/main.py`**
- Servidor FastAPI con un único endpoint: `POST /process`
- El endpoint requiere header `Authorization: Bearer {WORKER_SECRET}` — si no coincide, retorna 401
- Recibe body: `{ job_id: str, youtube_url: str }`
- Llama a `process_video(job_id, youtube_url)` como una tarea en background (BackgroundTasks de FastAPI)
- Retorna inmediatamente `{ message: "Processing started", job_id }` con status 202
- Agrega también `GET /health` que retorna `{ status: "ok" }`

**`worker/services/youtube.py`**
- Función `download_audio(youtube_url: str, job_id: str) -> str`
- Usa yt-dlp para descargar solo el audio en formato mp3
- Guarda en `/tmp/{job_id}.mp3`
- Opciones de yt-dlp: format='bestaudio/best', postprocessors con preferredcodec='mp3', quiet=True
- Retorna el path del archivo descargado
- Si falla, lanza excepción con mensaje descriptivo

**`worker/services/deepgram_client.py`**
- Función `transcribe_audio(file_path: str) -> dict`
- Usa deepgram-sdk v3 (`from deepgram import DeepgramClient, PrerecordedOptions`)
- Lee el archivo de audio y lo envía a Deepgram
- Opciones: model='nova-2', diarize=True, punctuate=True, smart_format=True, language='es'
- Parsea la respuesta y retorna:
  ```python
  {
    "full_text": str,  # transcripción completa
    "segments": [{"speaker": str, "start": float, "end": float, "text": str}],
    "language": str,
    "duration_seconds": float
  }
  ```
- Extrae los segmentos del campo `results.utterances` de Deepgram

**`worker/services/supabase_client.py`**
- Función `update_job_status(job_id: str, status: str, error_msg: str = None)`
- Función `save_transcription(job_id: str, transcription_data: dict)`
- Usa el cliente de supabase-py con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

**`worker/main.py` — función `process_video`**
Orquesta todo el flujo:
1. `update_job_status(job_id, 'processing')`
2. `file_path = download_audio(youtube_url, job_id)`
3. `transcription = transcribe_audio(file_path)`
4. `save_transcription(job_id, transcription)`
5. `update_job_status(job_id, 'done')`
6. Elimina el archivo temporal con `os.remove(file_path)`
7. Si cualquier paso falla: `update_job_status(job_id, 'error', str(e))`

**`worker/Dockerfile`**
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install yt-dlp
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```
```

---

### PROMPT 5 — Frontend UI

```
Implementa la interfaz de usuario en Next.js.

**`frontend/app/page.tsx`** — Página principal
- Título: "YouTube Transcriber"
- Subtítulo: "Pega el link de cualquier video de YouTube y obtén la transcripción completa"
- Formulario con:
  - Input de texto para la URL (placeholder: "https://www.youtube.com/watch?v=...")
  - Botón "Transcribir"
  - Estado de loading mientras se crea el job
- Al submit: llama POST /api/transcribe, en caso de éxito redirige a /transcription/{job_id}
- Muestra errores de validación inline (URL inválida, error del servidor)
- Diseño limpio con TailwindCSS, centrado en pantalla, fondo gris claro

**`frontend/app/transcription/[id]/page.tsx`** — Página de resultado
- Al cargar, inicia polling a GET /api/status/{id} cada 3 segundos
- Estados visuales:
  - `pending`: spinner + "Preparando tu transcripción..."
  - `processing`: spinner + "Descargando audio y transcribiendo... esto puede tomar unos minutos"
  - `done`: muestra el componente TranscriptionViewer
  - `error`: muestra mensaje de error en rojo con botón "Intentar de nuevo"
- Cuando status es 'done', hace fetch a GET /api/transcription/{id} y renderiza resultado
- Para el polling, usa useEffect con setInterval, limpia el intervalo al desmontar

**`frontend/components/TranscriptionViewer.tsx`**
- Recibe props: `{ fullText: string, segments: Segment[], language: string, durationSeconds: number }`
- Dos tabs: "Por speakers" y "Texto completo"
- En "Por speakers": lista de bloques, cada uno muestra:
  - Badge de color con el nombre del speaker (Speaker 0, Speaker 1, etc.) — cada speaker tiene un color distinto
  - Timestamp en formato MM:SS
  - Texto del segmento
- En "Texto completo": el full_text en un textarea readonly con botón "Copiar"
- Header con metadatos: idioma detectado, duración total del video
- Botón "Nueva transcripción" que regresa a la página principal

Usa TailwindCSS para todos los estilos. El diseño debe ser limpio y profesional.
```

---

### PROMPT 6 — Deploy y configuración final

```
Ayúdame a preparar el proyecto para deploy.

**Vercel (frontend):**
1. Crea `frontend/vercel.json` con configuración básica.
2. Lista todas las variables de entorno que debo agregar en el dashboard de Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - WORKER_URL (la URL de Railway, disponible después de hacer deploy del worker)
   - WORKER_SECRET (un string secreto, ej: generado con `openssl rand -hex 32`)

**Railway (worker):**
1. Verifica que el `Dockerfile` esté correcto para Railway.
2. Lista las variables de entorno para Railway:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - DEEPGRAM_API_KEY
   - WORKER_SECRET (mismo valor que en Vercel)
3. Crea `worker/railway.json` o confirma que Railway detecta el Dockerfile automáticamente.

**Supabase:**
1. Instrucciones para ejecutar la migración SQL en el SQL Editor de Supabase.
2. Instrucciones para crear el bucket `audio-temp` como privado desde el dashboard.
3. Verifica que las políticas RLS (Row Level Security) estén desactivadas para las tablas jobs y transcriptions (ya que usamos service role key desde el backend).

**Testing local:**
Crea un script `scripts/test-local.sh` que:
1. Levante el worker con uvicorn en localhost:8000
2. Muestre el comando para levantar el frontend con `npm run dev`
3. Muestre un curl de ejemplo para probar el flujo completo

Finalmente, revisa que todos los archivos `.env.example` estén completos y que no haya secrets hardcodeados en el código.
```

---

## Orden de ejecución recomendado

1. **Crear proyecto en Supabase** → copiar URL y keys
2. **Crear proyecto en Railway** → preparar para deploy del worker
3. **Ejecutar Prompt 1** → estructura base
4. **Ejecutar Prompt 2** → DB + tipos
5. **Ejecutar Prompt 3** → API Routes
6. **Ejecutar Prompt 4** → Worker Python
7. **Ejecutar Prompt 5** → UI Frontend
8. **Deploy worker en Railway** → obtener URL
9. **Ejecutar Prompt 6** → configuración final
10. **Deploy frontend en Vercel**

---

## Costo estimado (tier gratuito)

| Servicio | Plan | Costo |
|----------|------|-------|
| Vercel | Hobby (free) | $0 |
| Railway | Starter ($5 crédito/mes) | ~$0-5 |
| Supabase | Free tier | $0 |
| Deepgram | $200 crédito gratis al inicio | $0 inicial |
