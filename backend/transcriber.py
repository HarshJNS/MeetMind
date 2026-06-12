import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def transcribe_with_assemblyai(file_path: str) -> str:
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError("ASSEMBLYAI_API_KEY is missing")

    import assemblyai as aai

    aai.settings.api_key = api_key
    config = aai.TranscriptionConfig(speaker_labels=True)
    transcript = aai.Transcriber(config=config).transcribe(file_path)

    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(transcript.error or "AssemblyAI transcription failed")

    if transcript.utterances:
        return "\n".join(
            f"Speaker {utterance.speaker}: {utterance.text}"
            for utterance in transcript.utterances
        )

    return transcript.text or ""


def transcribe_with_whisper(file_path: str, model_name: str = "base") -> str:
    try:
        import whisper
    except ImportError as exc:
        raise RuntimeError(
            "Whisper is not installed in this deployment. Add ASSEMBLYAI_API_KEY "
            "for cloud transcription, or install openai-whisper and torch locally."
        ) from exc

    model = whisper.load_model(model_name)
    result = model.transcribe(file_path)
    return result.get("text", "").strip()


def transcribe_audio(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    try:
        return transcribe_with_assemblyai(str(path)).strip()
    except Exception:
        return transcribe_with_whisper(str(path)).strip()
