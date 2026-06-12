import json
import os
import re
from typing import Any

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash",
    ).split(",")
    if model.strip()
]


EXTRACTION_PROMPT = """
You are MeetMind, an accountability assistant for business meetings.

Read the transcript and return ONLY valid JSON matching this schema:
{{
  "decisions": ["decision 1"],
  "action_items": [
    {{"owner": "person or team name", "task": "specific task", "deadline": "date/time or Not specified"}}
  ],
  "unanswered_questions": ["question 1"],
  "sentiment": "Positive | Neutral | Negative | Mixed",
  "summary": ["line 1", "line 2", "line 3"]
}}

Rules:
- Do not invent owners, deadlines, decisions, or questions.
- If an owner or deadline is unclear, use "Not specified".
- Keep action items concrete and accountability-focused.
- Keep summary exactly three short lines.

Transcript:
{transcript}
"""


EMAIL_PROMPT = """
Write a professional follow-up email under 200 words using this meeting data.
Include a brief recap, decisions, action items, and unanswered questions if any.
Do not add information that is not present in the meeting data.

Meeting data:
{meeting_data}
"""


def _model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError("GEMINI_API_KEY is missing")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(GEMINI_MODEL)


def _generate_content(prompt: str):
    last_error = None
    for model_name in [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]:
        try:
            return genai.GenerativeModel(model_name).generate_content(prompt)
        except Exception as exc:
            last_error = exc
            message = str(exc).lower()
            can_retry = "404" in message or "not found" in message or "not supported" in message
            if not can_retry:
                raise

    raise RuntimeError(
        "No configured Gemini text model is available for generateContent. "
        "Run `python scripts/list_gemini_models.py` and set GEMINI_MODEL to one "
        "of the models that supports generateContent."
    ) from last_error


def _strip_markdown_json(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    return match.group(0) if match else cleaned


def _normalize_payload(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "decisions": data.get("decisions") or [],
        "action_items": data.get("action_items") or [],
        "unanswered_questions": data.get("unanswered_questions") or [],
        "sentiment": data.get("sentiment") or "Neutral",
        "summary": data.get("summary") or [],
    }


def extract_meeting_data(transcript: str) -> dict[str, Any]:
    if not transcript.strip():
        raise ValueError("Transcript is empty")

    _model()
    response = _generate_content(EXTRACTION_PROMPT.format(transcript=transcript))
    raw_text = response.text or ""
    json_text = _strip_markdown_json(raw_text)

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini did not return valid JSON: {raw_text}") from exc

    return _normalize_payload(parsed)


def write_follow_up_email(meeting_data: dict[str, Any]) -> str:
    _model()
    response = _generate_content(
        EMAIL_PROMPT.format(meeting_data=json.dumps(meeting_data, indent=2))
    )
    return (response.text or "").strip()
