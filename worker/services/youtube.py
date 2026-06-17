import yt_dlp


def download_audio(youtube_url: str, job_id: str) -> str:
    output_path = f"/tmp/{job_id}.mp3"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": f"/tmp/{job_id}.%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
            }
        ],
        "quiet": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
    except Exception as e:
        raise Exception(f"Error descargando audio de YouTube: {str(e)}")

    return output_path
