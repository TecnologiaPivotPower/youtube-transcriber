import os
from supabase import create_client, Client


def _get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise Exception("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas")
    return create_client(url, key)


def update_job_status(job_id: str, status: str, error_msg: str = None) -> None:
    client = _get_client()
    payload = {"status": status}
    if error_msg is not None:
        payload["error_msg"] = error_msg

    client.table("jobs").update(payload).eq("id", job_id).execute()


def save_transcription(job_id: str, transcription_data: dict) -> None:
    client = _get_client()
    client.table("transcriptions").insert({
        "job_id": job_id,
        "full_text": transcription_data["full_text"],
        "segments": transcription_data["segments"],
        "language": transcription_data.get("language"),
        "duration_seconds": transcription_data.get("duration_seconds"),
    }).execute()
