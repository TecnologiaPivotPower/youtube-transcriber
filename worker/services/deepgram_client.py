import os
from deepgram import DeepgramClient, PrerecordedOptions


def transcribe_audio(file_path: str) -> dict:
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise Exception("DEEPGRAM_API_KEY no configurada")

    client = DeepgramClient(api_key)

    try:
        with open(file_path, "rb") as audio_file:
            audio_data = audio_file.read()

        options = PrerecordedOptions(
            model="nova-2",
            diarize=True,
            punctuate=True,
            smart_format=True,
            language="es",
            utterances=True,
        )

        response = client.listen.prerecorded.v("1").transcribe_file(
            {"buffer": audio_data, "mimetype": "audio/mp3"},
            options,
        )

    except Exception as e:
        raise Exception(f"Error transcribiendo audio con Deepgram: {str(e)}")

    try:
        result = response.results
        full_text = result.channels[0].alternatives[0].transcript
        duration_seconds = response.metadata.duration
        language = result.channels[0].alternatives[0].languages[0] if result.channels[0].alternatives[0].languages else "es"

        segments = []
        if result.utterances:
            for utterance in result.utterances:
                segments.append({
                    "speaker": f"Speaker {utterance.speaker}",
                    "start": utterance.start,
                    "end": utterance.end,
                    "text": utterance.transcript,
                })

    except Exception as e:
        raise Exception(f"Error parseando respuesta de Deepgram: {str(e)}")

    return {
        "full_text": full_text,
        "segments": segments,
        "language": language,
        "duration_seconds": duration_seconds,
    }
