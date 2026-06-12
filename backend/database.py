import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "meetmind.sqlite3"


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                transcript TEXT NOT NULL,
                decisions TEXT NOT NULL,
                action_items TEXT NOT NULL,
                unanswered_questions TEXT NOT NULL,
                sentiment TEXT NOT NULL,
                summary TEXT NOT NULL,
                email_draft TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def save_meeting(
    transcript: str,
    meeting_data: dict[str, Any],
    email_draft: str,
    meeting_id: str | None = None,
) -> str:
    init_db()
    row_id = meeting_id or str(uuid.uuid4())

    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO meetings (
                id, transcript, decisions, action_items, unanswered_questions,
                sentiment, summary, email_draft
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row_id,
                transcript,
                json.dumps(meeting_data.get("decisions", [])),
                json.dumps(meeting_data.get("action_items", [])),
                json.dumps(meeting_data.get("unanswered_questions", [])),
                meeting_data.get("sentiment", "Neutral"),
                json.dumps(meeting_data.get("summary", [])),
                email_draft,
            ),
        )

    return row_id


def get_all_meetings() -> list[dict[str, Any]]:
    init_db()
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, summary, sentiment, created_at
            FROM meetings
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [
        {
            "id": row["id"],
            "summary": json.loads(row["summary"]),
            "sentiment": row["sentiment"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def get_meeting(meeting_id: str) -> dict[str, Any] | None:
    init_db()
    with _connect() as connection:
        row = connection.execute(
            "SELECT * FROM meetings WHERE id = ?",
            (meeting_id,),
        ).fetchone()

    if not row:
        return None

    return {
        "id": row["id"],
        "transcript": row["transcript"],
        "decisions": json.loads(row["decisions"]),
        "action_items": json.loads(row["action_items"]),
        "unanswered_questions": json.loads(row["unanswered_questions"]),
        "sentiment": row["sentiment"],
        "summary": json.loads(row["summary"]),
        "email_draft": row["email_draft"],
        "created_at": row["created_at"],
    }
