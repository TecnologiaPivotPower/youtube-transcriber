import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from services.deepgram_client import transcribe_audio
from services.supabase_client import save_transcription, update_job_status
from services.youtube import download_audio

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Worker iniciado")
    yield


app = FastAPI(title="YouTube Transcription Worker", lifespan=lifespan)


class ProcessRequest(BaseModel):
    job_id: str
    youtube_url: str


def verify_token(authorization: str = Header(...)):
    expected = f"Bearer {os.getenv('WORKER_SECRET')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Token inválido")


def process_video(job_id: str, youtube_url: str) -> None:
    file_path = None
    try:
        logger.info(f"[{job_id}] Iniciando procesamiento")
        update_job_status(job_id, "processing")

        logger.info(f"[{job_id}] Descargando audio")
        file_path = download_audio(youtube_url, job_id)

        logger.info(f"[{job_id}] Transcribiendo con Deepgram")
        transcription = transcribe_audio(file_path)

        logger.info(f"[{job_id}] Guardando transcripción")
        save_transcription(job_id, transcription)

        update_job_status(job_id, "done")
        logger.info(f"[{job_id}] Completado")

    except Exception as e:
        logger.error(f"[{job_id}] Error: {str(e)}")
        update_job_status(job_id, "error", str(e))

    finally:
        if file_path:
            try:
                os.remove(file_path)
                logger.info(f"[{job_id}] Archivo temporal eliminado")
            except OSError:
                pass


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/process", status_code=202)
def process(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_token),
):
    background_tasks.add_task(process_video, request.job_id, request.youtube_url)
    return {"message": "Processing started", "job_id": request.job_id}
