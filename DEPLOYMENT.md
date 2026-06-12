# MeetMind Deployment

Use this split deployment:

- Backend: Render Web Service
- Frontend: Vercel or Netlify Static Site

## 1. Deploy Backend On Render

Create a new Render Web Service from this repo.

Use:

```bash
Build Command: pip install -r requirements-cloud.txt
Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Environment variables:

```env
GEMINI_API_KEY=your_real_key
ASSEMBLYAI_API_KEY=your_real_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
GEMINI_EMBEDDING_FALLBACK_MODELS=models/gemini-embedding-2,models/gemini-embedding-2-preview
CORS_ALLOWED_ORIGINS=*
```

After deploy, copy the Render backend URL, for example:

```text
https://meetmind-api.onrender.com
```

## 2. Deploy Frontend On Vercel

Create a Vercel project from this repo.

Use:

```bash
Build Command: cd frontend && npm ci && npm run build
Output Directory: frontend/dist
Install Command: cd frontend && npm ci
```

Environment variable:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
```

## 3. Deploy Frontend On Netlify

The included `netlify.toml` already configures:

```bash
Base directory: frontend
Build command: npm ci && npm run build
Publish directory: dist
```

Environment variable:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
```

## Notes

The cloud requirements exclude local Whisper and Torch to keep deployment lightweight. Audio upload works best in cloud with AssemblyAI. Pasted transcript analysis works with Gemini alone.
