# MeetMind

MeetMind turns audio recordings or pasted meeting transcripts into structured accountability:

- Decisions
- Owner-assigned action items
- Deadlines
- Unanswered questions
- Sentiment
- Three-line summary
- Follow-up email draft
- Searchable meeting memory with ChromaDB and Gemini embeddings

## Setup

```bash
cd "/Users/harshraj/Desktop/Meet Mind"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Add your keys in `.env`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

## Run

Start the backend. If port `8000` is busy, the launcher automatically uses the next free port and writes `frontend/.env.local` for Vite:

```bash
python scripts/start_backend.py
```

Start the React frontend in another terminal:

```bash
python scripts/start_frontend.py
```

Then open the application URL, usually `http://127.0.0.1:5173`.

You can still run the frontend directly with `cd frontend && npm run dev`; it will read `frontend/.env.local` if the backend launcher created one.

## Architecture

React talks only to FastAPI. FastAPI coordinates transcription, Gemini extraction, follow-up email generation, SQLite storage, and ChromaDB memory.
