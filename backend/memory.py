import json
import os
from pathlib import Path
from typing import Any

import chromadb
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_DIR = BASE_DIR / "meetmind_db"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash",
    ).split(",")
    if model.strip()
]
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
EMBEDDING_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_EMBEDDING_FALLBACK_MODELS",
        "models/gemini-embedding-2,models/gemini-embedding-2-preview",
    ).split(",")
    if model.strip()
]

_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
_collection = _client.get_or_create_collection(name="meetings")


def _configure_gemini() -> None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError("GEMINI_API_KEY is missing")
    genai.configure(api_key=api_key)


def embed_text(text: str) -> list[float]:
    _configure_gemini()
    last_error = None
    for model_name in [EMBEDDING_MODEL, *EMBEDDING_FALLBACK_MODELS]:
        try:
            result = genai.embed_content(
                model=model_name,
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as exc:
            last_error = exc
            message = str(exc).lower()
            can_retry = "404" in message or "not found" in message or "not supported" in message
            if not can_retry:
                raise

    raise RuntimeError(
        "No configured Gemini embedding model is available for embedContent. "
        "Run `python scripts/list_gemini_models.py` and set GEMINI_EMBEDDING_MODEL "
        "to one of the models that supports embedContent."
    ) from last_error


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


def _meeting_document(transcript: str, meeting_data: dict[str, Any]) -> str:
    summary = meeting_data.get("summary", [])
    decisions = meeting_data.get("decisions", [])
    action_items = meeting_data.get("action_items", [])
    questions = meeting_data.get("unanswered_questions", [])

    return "\n".join(
        [
            "Summary:",
            "\n".join(summary) if isinstance(summary, list) else str(summary),
            "",
            "Decisions:",
            "\n".join(f"- {item}" for item in decisions),
            "",
            "Action items:",
            "\n".join(
                f"- {item.get('owner', 'Not specified')}: {item.get('task', '')} "
                f"(Deadline: {item.get('deadline', 'Not specified')})"
                for item in action_items
                if isinstance(item, dict)
            ),
            "",
            "Unanswered questions:",
            "\n".join(f"- {item}" for item in questions),
            "",
            "Transcript:",
            transcript[:6000],
        ]
    )


def store_meeting_memory(
    meeting_id: str,
    transcript: str,
    meeting_data: dict[str, Any],
) -> None:
    document = _meeting_document(transcript, meeting_data)
    embedding = embed_text(document)

    _collection.upsert(
        ids=[meeting_id],
        documents=[document],
        embeddings=[embedding],
        metadatas=[
            {
                "meeting_id": meeting_id,
                "sentiment": meeting_data.get("sentiment", "Neutral"),
                "summary": json.dumps(meeting_data.get("summary", [])),
            }
        ],
    )


def query_memory(question: str, top_k: int = 3) -> str:
    if not question.strip():
        raise ValueError("Question is empty")

    _configure_gemini()
    question_embedding = embed_text(question)

    results = _collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    if not documents:
        return "I could not find any saved meetings to answer from yet."

    context_blocks = []
    for index, document in enumerate(documents):
        metadata = metadatas[index] if index < len(metadatas) else {}
        context_blocks.append(
            f"Meeting ID: {metadata.get('meeting_id', 'unknown')}\n{document}"
        )

    prompt = f"""
You answer questions using only the meeting history context below.
Give a direct plain English answer. Mention the meeting IDs used as references.
If the context does not contain the answer, say that clearly.

Question:
{question}

Meeting history context:
{chr(10).join(context_blocks)}
"""

    response = _generate_content(prompt)
    return (response.text or "").strip()
