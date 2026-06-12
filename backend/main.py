import shutil
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.database import get_all_meetings, get_meeting, init_db, save_meeting
from backend.extractor import extract_meeting_data, write_follow_up_email
from backend.memory import query_memory, store_meeting_memory
from backend.transcriber import transcribe_audio

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="MeetMind API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptRequest(BaseModel):
    transcript: str


class QuestionRequest(BaseModel):
    question: str


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "name": "MeetMind API",
        "status": "ok",
        "frontend_url": "http://127.0.0.1:5173",
        "docs_url": "http://127.0.0.1:8000/docs",
        "health_url": "http://127.0.0.1:8000/health",
    }


def _process_meeting(transcript: str) -> dict[str, Any]:
    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")

    meeting_data = extract_meeting_data(transcript)
    email_draft = write_follow_up_email(meeting_data)
    meeting_id = str(uuid.uuid4())

    store_meeting_memory(meeting_id, transcript, meeting_data)
    save_meeting(transcript, meeting_data, email_draft, meeting_id=meeting_id)

    return {
        "meeting_id": meeting_id,
        "transcript": transcript,
        "meeting_data": meeting_data,
        "email_draft": email_draft,
    }


@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "meeting_audio").suffix
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        transcript = transcribe_audio(str(file_path))
        return _process_meeting(transcript)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        file.file.close()


@app.post("/analyze-transcript")
def analyze_transcript(payload: TranscriptRequest) -> dict[str, Any]:
    try:
        return _process_meeting(payload.transcript)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ask-memory")
def ask_memory(payload: QuestionRequest) -> dict[str, str]:
    try:
        return {"answer": query_memory(payload.question)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/meetings")
def meetings() -> dict[str, Any]:
    return {"meetings": get_all_meetings()}


@app.get("/meetings/{meeting_id}")
def meeting_detail(meeting_id: str) -> dict[str, Any]:
    meeting = get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting
