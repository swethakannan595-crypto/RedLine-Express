# RAG AI Tutor

> Drop a PDF, ask questions, get answers grounded in the document — with source passages highlighted and page citations you can click.

**Stack:** React 19 + Vite 7 + Tailwind CSS v4 + shadcn-style UI | FastAPI | FAISS | local embeddings (fastembed) | Ollama / Gemini / OpenRouter

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Switch the AI Provider](#switch-the-ai-provider)
- [Project Structure](#project-structure)
- [Detailed Code Walkthrough](#detailed-code-walkthrough)
  - [Backend](#backend)
    - [config.py — Configuration](#configpy--configuration)
    - [llm.py — LLM Abstraction](#llmpy--llm-abstraction)
    - [rag.py — The RAG Pipeline](#ragpy--the-rag-pipeline)
    - [main.py — FastAPI Endpoints](#mainpy--fastapi-endpoints)
  - [Frontend](#frontend)
    - [api.js — HTTP Client](#apijs--http-client)
    - [App.jsx — Root Layout](#appjsx--root-layout)
    - [UploadPanel.jsx — PDF Upload](#uploadpaneljsx--pdf-upload)
    - [Chat.jsx — Chat Interface](#chatjsx--chat-interface)
    - [UI Components — Badge, Button, Card, Input](#ui-components)
- [Complete Request Lifecycle](#complete-request-lifecycle)
- [RAG Pipeline Deep Dive](#rag-pipeline-deep-dive)
- [Tuning Knobs](#tuning-knobs)
- [Seminar Kit](#seminar-kit)
- [Known Limits & Discussion Points](#known-limits--discussion-points)

---

## Architecture Overview

```
┌──────────────────────┐         ┌──────────────────────────────────────────┐
│     FRONTEND         │         │                BACKEND                   │
│  (React + Vite)      │         │             (FastAPI)                    │
│                      │         │                                          │
│  ┌────────────────┐  │  Vite   │  ┌──────────┐  ┌───────┐  ┌─────────┐  │
│  │  UploadPanel   │──┼─proxy──▶│  │ /api/    │  │ rag.py│  │ llm.py  │  │
│  │  (PDF upload)  │  │  /api   │  │ upload   │──│       │  │         │  │
│  └────────────────┘  │         │  │ health   │  │ PDF   │  │ OpenAI  │  │
│                      │         │  │ search   │  │ chunk │  │ compat  │  │
│  ┌────────────────┐  │         │  │ ask      │  │ embed │  │ client  │  │
│  │  Chat          │──┼─proxy──▶│  └──────────┘  │ index │  └─────────┘  │
│  │  (Q&A + cites) │  │         │       │        │ query │       │       │
│  └────────────────┘  │         │       ▼        └───────┘       ▼       │
│                      │         │  In-memory       FAISS     Ollama /    │
│  ┌────────────────┐  │         │  doc store       index     Gemini /    │
│  │  Skeleton      │  │         │  (DOCS dict)               OpenRouter  │
│  │  Loader        │  │         │                                        │
│  └────────────────┘  │         └────────────────────────────────────────┘
└──────────────────────┘
```

**Data Flow (High Level):**
1. User drops a PDF → frontend `POST /api/upload` → backend reads it, chunks it, embeds & indexes chunks in FAISS.
2. User asks a question → frontend `POST /api/ask` → backend embeds the question, FAISS finds top-k similar chunks, builds a prompt, sends it to the LLM, returns the answer + source passages.
3. Frontend displays the answer with clickable page citation badges that expand to show the relevant source passages.

---

## Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **One LLM backend** (see [Switch the AI Provider](#switch-the-ai-provider))

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # then edit .env
uvicorn app.main:app --reload --port 8000
```

Swagger UI at [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Switch the AI Provider

Edit `backend/.env`, restart uvicorn. The badge in the sidebar shows what's active.

| Provider | `.env` |
|---|---|
| Ollama (local) | `LLM_PROVIDER=ollama`, then `ollama pull llama3.2` |
| Gemini free | `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` |
| OpenRouter | `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY` (use `:free` models) |

Embeddings **always run locally** using `fastembed` (BAAI/bge-small-en-v1.5, ~130 MB, downloads once on first upload), so no API key is needed for indexing.

---

## Project Structure

```
rag-tutor/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Package marker
│   │   ├── config.py            # Env vars, provider configs, RAG knobs
│   │   ├── llm.py               # Thin wrapper around OpenAI-compatible LLMs
│   │   ├── main.py              # FastAPI app, routes, in-memory doc store
│   │   └── rag.py               # Full RAG pipeline: PDF → chunks → FAISS → prompt
│   ├── .env.example             # Template for environment variables
│   ├── .env                     # Your actual config (git-ignored)
│   └── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── badge.jsx    # Badge component (default, primary, citation variants)
│   │   │   │   ├── button.jsx   # Button component (default, outline, ghost, subtle)
│   │   │   │   ├── card.jsx     # Card container
│   │   │   │   └── input.jsx    # Text input with focus ring
│   │   │   ├── Chat.jsx         # Chat interface, skeleton loader, citations
│   │   │   └── UploadPanel.jsx  # PDF drag-and-drop upload
│   │   ├── lib/
│   │   │   ├── api.js           # HTTP client (fetch wrappers for all backend calls)
│   │   │   └── utils.js         # Utility: cn() for merging Tailwind classes
│   │   ├── App.jsx              # Root layout: sidebar + chat area
│   │   ├── index.css            # Global styles, theme, animations
│   │   └── main.jsx             # React entry point
│   ├── index.html               # HTML shell with Google Fonts
│   ├── package.json             # Node dependencies
│   └── vite.config.js           # Vite config: React plugin, Tailwind, proxy
│
├── tools/
│   └── make_starter.py          # Script to generate student starter kit
│
└── README.md                    # This file
```

---

## Detailed Code Walkthrough

### Backend

#### `config.py` — Configuration

**Purpose:** Load environment variables from `.env` and expose them as Python constants.

**What it does:**
1. Calls `load_dotenv()` to read `backend/.env` into `os.environ`.
2. Reads `LLM_PROVIDER` (defaults to `"ollama"`).
3. Defines a `PROVIDERS` dictionary with three entries — `ollama`, `gemini`, `openrouter` — each specifying:
   - `base_url`: The OpenAI-compatible API endpoint.
   - `api_key`: The authentication key (Ollama ignores this).
   - `model`: The model name to use.
4. Validates that the chosen provider exists.
5. Exports `CHUNK_SIZE` (800), `CHUNK_OVERLAP` (150), and `TOP_K` (4) — the RAG tuning knobs.

**Key design choice:** All three providers speak the OpenAI chat completions API format, so switching provider is just switching URL + key + model — no code changes needed.

---

#### `llm.py` — LLM Abstraction

**Purpose:** Single function to send a system+user message pair to whichever LLM is configured.

**Functions:**
- **`info()`** — Returns `{"provider": "...", "model": "..."}` for health checks and the UI badge.
- **`chat(system, user)`** — Creates an `OpenAI` client pointed at the configured `base_url`, sends a chat completion request with `temperature=0.2` (low randomness for factual answers), and returns the text content of the first choice.

**Error handling:** If a non-Ollama provider has an empty API key, raises a `RuntimeError` before even calling the API.

---

#### `rag.py` — The RAG Pipeline

**Purpose:** The entire Retrieval-Augmented Generation pipeline in one file.

```
PDF → pages → chunks → embeddings → FAISS index → retrieve top-k → build prompt → LLM
```

**Functions (in pipeline order):**

1. **`embed(texts)`** — Converts a list of text strings into normalised 384-dimensional vectors using `fastembed` (model: `BAAI/bge-small-en-v1.5`). Uses L2 normalisation so that inner-product search = cosine similarity. The embedder is lazily initialised (first call downloads ~130 MB).

2. **`load_pdf(data: bytes)`** — Takes raw PDF bytes, uses `pypdf.PdfReader` to extract text from each page. Returns `[(page_number, text), ...]`, skipping empty pages. Page numbers are 1-indexed.

3. **`chunk_pages(pages, size, overlap)`** *(Step 1)* — Slides a window of `size` characters over each page's text, stepping by `size - overlap` characters. Each chunk remembers its source page number. Returns `[{"text": "...", "page": N}, ...]`.

   **Why overlap?** Ensures that sentences split across window boundaries still appear in at least one chunk, improving retrieval accuracy for questions that fall on boundaries.

4. **`build_index(chunks)`** *(Step 2)* — Embeds all chunk texts into vectors, creates a FAISS `IndexFlatIP` (flat inner-product index — exact search, no approximation), adds the vectors, and returns the index. The index position maps 1-to-1 with the chunks list.

5. **`retrieve(index, chunks, question, k)`** *(Step 3)* — Embeds the question into a single vector, runs `index.search` to find the `k` nearest chunks by cosine similarity, and returns the matching chunks with their similarity scores.

6. **`build_prompt(question, hits)`** *(Step 4)* — Formats the retrieved chunks into a context block (each prefixed with `[Page N]`), appends the user's question, and returns the combined string. This becomes the `user` message sent to the LLM.

**System prompt** (`SYSTEM_PROMPT`): Instructs the LLM to answer **only** from the provided context, use simple language, short bullets, and cite pages like `(p.3)`.

---

#### `main.py` — FastAPI Endpoints

**Purpose:** HTTP API layer. Receives requests, orchestrates the pipeline, returns JSON responses.

**Setup:**
- Creates the FastAPI app with CORS middleware allowing the Vite dev server (`http://localhost:5173`).
- Maintains an in-memory `DOCS` dictionary: `doc_id → {filename, pages, chunks, index}`. All data is lost on server restart.

**Endpoints:**

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| `GET` | `/api/health` | Heartbeat + LLM info | — | `{"status": "ok", "provider": "...", "model": "..."}` |
| `POST` | `/api/upload` | Ingest a PDF | Multipart `file` | `{"doc_id": "...", "filename": "...", "pages": N, "chunks": N}` |
| `POST` | `/api/search` | Retrieve only (no LLM) | `{"doc_id", "question", "top_k?"}` | `{"sources": [...]}` |
| `POST` | `/api/ask` | Full RAG: retrieve + LLM | `{"doc_id", "question", "top_k?"}` | `{"answer": "...", "sources": [...]}` |

**`/api/upload` flow:**
1. Validates the file is a `.pdf`.
2. Calls `rag.load_pdf()` to extract pages.
3. Calls `rag.chunk_pages()` with configured `CHUNK_SIZE` and `CHUNK_OVERLAP`.
4. Calls `rag.build_index()` to embed and index chunks.
5. Generates a random 8-char `doc_id`, stores everything in `DOCS`.

**`/api/ask` flow:**
1. Looks up the document by `doc_id` (404 if missing).
2. Calls `rag.retrieve()` to find the top-k matching chunks.
3. Calls `rag.build_prompt()` to format context + question.
4. Calls `llm.chat()` with the system prompt and the built prompt.
5. Returns the LLM answer and the source passages.

---

### Frontend

#### `api.js` — HTTP Client

**Purpose:** All backend communication in one file. The Vite dev server proxies `/api/*` → `http://localhost:8000` so the frontend never hardcodes the backend URL.

**Functions:**
- **`parse(res)`** — Shared response handler: parses JSON, throws an `Error` with the `detail` field if the response is not OK.
- **`getHealth()`** — `GET /api/health`, returns the health/model info object.
- **`uploadPdf(file)`** — `POST /api/upload` with a `FormData` body containing the PDF file.
- **`askQuestion(docId, question)`** — `POST /api/ask` with JSON body `{doc_id, question}`, returns `{answer, sources}`.

---

#### `App.jsx` — Root Layout

**Purpose:** Top-level layout that splits the screen into a sidebar and the chat area.

**Structure:**
- **Sidebar (glassmorphism panel):**
  - Brand header with icon + title.
  - `<UploadPanel>` for PDF upload.
  - Backend status indicator at the bottom (checking / error / connected badge).
- **Main area:**
  - `<Chat>` component fills the remaining space.

**State:**
- `doc` — The currently uploaded document info (`{doc_id, filename, pages, chunks}`) or `null`.
- `health` — Backend health status: `null` (checking), `false` (unreachable), or the health response object.

**On mount:** Fires a `getHealth()` call to check if the backend is reachable and display the provider/model badge.

---

#### `UploadPanel.jsx` — PDF Upload

**Purpose:** Drag-and-drop zone + file picker for uploading PDFs.

**Features:**
- Drag-over visual feedback (border color change, scale animation).
- Loading spinner while the backend processes the PDF.
- Error display with icon.
- Success card showing filename, page count, and chunk count.

**Flow:**
1. User drops/selects a file → `handleFile(file)` is called.
2. Sets `busy=true`, calls `uploadPdf(file)` from `api.js`.
3. On success, calls `onReady(result)` which sets the `doc` state in `App.jsx`.
4. On error, displays the error message.

---

#### `Chat.jsx` — Chat Interface

**Purpose:** The core Q&A interface with messages, skeleton loader, and clickable citations.

**Sub-components:**

1. **`SkeletonResponse`** — Shown while the LLM is thinking. Displays:
   - An avatar + "Thinking" label with animated dots.
   - 5 shimmer lines of varying widths (skeleton loader animation).
   - Skeleton placeholders for source badges.

2. **`CitationBadges`** — Renders clickable page number badges below each assistant message. Deduplicates pages (keeps the highest score for each page) and sorts them numerically. Clicking a badge:
   - Expands the source panel for that message.
   - Highlights the matching source card.
   - Scrolls it into view.

3. **`Sources`** — Expandable panel listing all retrieved passages. Each source card shows:
   - Page number badge + match score.
   - The retrieved text with highlight.
   - Visual highlight (ring/border) when the page matches the clicked citation.

**State:**
- `messages` — Array of `{role, content, sources?, error?}`.
- `input` — Current text input value.
- `busy` — Whether an LLM request is in progress.
- `expandedSources` — Index of the message whose sources panel is currently open.
- `highlightPage` — Page number currently highlighted in the sources panel (auto-clears after 2s).

**Message flow:**
1. User types a question (or clicks a starter prompt) → `send(question)`.
2. Adds the user message to state, clears input, sets `busy=true`.
3. The skeleton loader appears.
4. `askQuestion(docId, question)` is called.
5. On success, adds the assistant message (with sources) and hides the skeleton.
6. On error, adds an error message.

**Citation interaction:**
1. User clicks a `p.N` badge → `handleCitationClick(messageIndex, pageNumber)`.
2. Sets `expandedSources` to the message index (shows the Sources panel).
3. Sets `highlightPage` to the page number (highlights the source card).
4. Uses `requestAnimationFrame` + `scrollIntoView` to scroll the matching source into view.
5. After 2 seconds, clears the highlight.

---

#### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| **Badge** | `ui/badge.jsx` | Small label with 4 variants: `default` (muted), `primary` (green tint), `outline` (border only), `citation` (green, clickable, hover effect). |
| **Button** | `ui/button.jsx` | Button with variants: `default` (primary color, shadow), `outline` (border), `ghost` (transparent), `subtle` (primary tint). All have press-scale animation. Uses `class-variance-authority` for variant management. |
| **Card** | `ui/card.jsx` | Container div with border, background, rounded corners, and shadow. |
| **Input** | `ui/input.jsx` | Text input with ring focus styling instead of outline, soft placeholder. |

All UI components accept a `className` prop and merge it with defaults using `cn()` (from `tailwind-merge` + `clsx`).

---

## Complete Request Lifecycle

Here's what happens end-to-end when a user asks a question:

```
┌─────────┐   ┌──────────┐   ┌─────────────┐   ┌─────────┐   ┌─────────┐
│  User    │   │ Chat.jsx │   │   api.js    │   │ main.py │   │ rag.py  │
│  types   │   │          │   │             │   │         │   │         │
│  "What   │──▶│ send()   │──▶│ askQuestion │──▶│POST /ask│──▶│retrieve │
│  is X?"  │   │          │   │  (fetch)    │   │         │   │(FAISS)  │
└─────────┘   │          │   └─────────────┘   │         │   │         │
               │ show     │                     │         │   │build    │
               │ skeleton │                     │         │──▶│prompt   │
               │ loader   │                     │         │   └─────────┘
               │          │                     │         │
               │          │                     │         │   ┌─────────┐
               │          │                     │         │──▶│ llm.py  │
               │          │                     │         │   │ chat()  │
               │          │                     │         │   │ (LLM)   │
               │          │                     │         │   └─────────┘
               │          │   ┌─────────────┐   │         │
               │ hide     │◀──│  response   │◀──│  JSON   │
               │ skeleton │   │ {answer,    │   │ response│
               │ show     │   │  sources}   │   │         │
               │ answer + │   └─────────────┘   └─────────┘
               │ citation │
               │ badges   │
               └──────────┘
```

**Step-by-step:**

1. **User types** a question in the `<Input>` and hits Enter.
2. **`Chat.send()`** adds a user message bubble, clears input, sets `busy=true`.
3. **Skeleton loader** (`<SkeletonResponse>`) appears with shimmer animation and thinking dots.
4. **`api.askQuestion()`** makes a `POST /api/ask` request via `fetch`. Vite's dev proxy forwards `/api` to `http://localhost:8000`.
5. **`main.py /api/ask`** looks up the document's chunks and FAISS index by `doc_id`.
6. **`rag.retrieve()`** embeds the question, searches the FAISS index for the top-k most similar chunks (by cosine similarity).
7. **`rag.build_prompt()`** formats the chunks as `[Page N] text` and appends the question.
8. **`llm.chat()`** sends `{system_prompt, user_prompt}` to the configured LLM via OpenAI-compatible API.
9. **Response JSON** `{"answer": "...", "sources": [...]}` is sent back.
10. **`Chat`** hides the skeleton, displays the assistant message with the answer text.
11. **`CitationBadges`** render clickable `p.1`, `p.3`, etc. badges below the answer.
12. **User clicks** a badge → the `<Sources>` panel expands, the matching source card gets a highlight ring, and the view scrolls to it.

---

## RAG Pipeline Deep Dive

### What is RAG?

**Retrieval-Augmented Generation** is a technique that grounds LLM answers in specific documents. Instead of relying on the LLM's training data (which might be outdated or hallucinate), RAG:
1. **Retrieves** the most relevant passages from your document.
2. **Augments** the LLM prompt with those passages as context.
3. **Generates** an answer based only on the retrieved context.

### Pipeline Steps

```
          ┌────────────┐
          │   PDF File  │
          └──────┬─────┘
                 │  pypdf extracts text
                 ▼
          ┌────────────┐
          │   Pages    │   [(1, "text..."), (2, "text..."), ...]
          └──────┬─────┘
                 │  Sliding window (size=800, overlap=150)
                 ▼
          ┌────────────┐
          │   Chunks   │   [{"text": "...", "page": 1}, ...]
          └──────┬─────┘
                 │  fastembed (BAAI/bge-small-en-v1.5)
                 ▼
          ┌────────────┐
          │ Embeddings │   384-dim float32 vectors, L2-normalised
          └──────┬─────┘
                 │  faiss.IndexFlatIP
                 ▼
          ┌────────────┐
          │ FAISS Index│   Inner-product ≡ cosine similarity
          └────────────┘
                 │
      ┌──────────┼───────────────────────┐
      │ QUERY    │                       │
      │          ▼                       │
      │   ┌────────────┐                 │
      │   │  Question  │                 │
      │   │ "What is X"│                 │
      │   └──────┬─────┘                 │
      │          │  embed question        │
      │          ▼                       │
      │   ┌────────────┐                 │
      │   │ Query Vec  │                 │
      │   └──────┬─────┘                 │
      │          │  index.search(q, k=4) │
      │          ▼                       │
      │   ┌────────────┐                 │
      │   │ Top-k Hits │  with scores    │
      │   └──────┬─────┘                 │
      │          │  format as context     │
      │          ▼                       │
      │   ┌──────────────┐               │
      │   │  Prompt      │               │
      │   │ Context:     │               │
      │   │ [Page 1] ... │               │
      │   │ [Page 3] ... │               │
      │   │              │               │
      │   │ Question: X? │               │
      │   └──────┬───────┘               │
      │          │  LLM API call          │
      │          ▼                       │
      │   ┌────────────┐                 │
      │   │  Answer    │  + sources[]    │
      │   └────────────┘                 │
      └─────────────────────────────────┘
```

### Why These Choices?

| Decision | Reason |
|----------|--------|
| **fastembed** for embeddings | Runs 100% locally, no API key needed. Small model (~130 MB), fast enough for interactive use. |
| **FAISS IndexFlatIP** | Exact nearest-neighbour search via inner product. No index training needed. With normalised vectors, IP = cosine similarity. |
| **Character-based chunking** | Simple, predictable. Good enough for most PDFs. Could be improved with sentence-aware chunking. |
| **Overlap between chunks** | Prevents losing context at chunk boundaries. A question about content split across two chunks will still match at least one. |
| **OpenAI-compatible API** | All three providers (Ollama, Gemini, OpenRouter) support this format, so switching is just config. |

---

## Tuning Knobs

Edit these in `backend/.env` and restart the server:

| Variable | Default | Effect |
|----------|---------|--------|
| `CHUNK_SIZE` | 800 | Characters per chunk. Smaller = more precise retrieval but loses broader context. Larger = more context but noisier matches. |
| `CHUNK_OVERLAP` | 150 | Overlap between chunks. Higher = fewer boundary-split issues but more chunks (slower). |
| `TOP_K` | 4 | Number of chunks retrieved per question. Higher = more context for the LLM but also more noise. |

**Experiments to try:**
- Set `CHUNK_SIZE=100` — very granular, but the LLM sees tiny fragments.
- Set `CHUNK_SIZE=3000` — large context per chunk, but retrieval becomes less precise.
- Set `TOP_K=1` — minimal context, forces precise retrieval.
- Ask something the PDF doesn't cover — the LLM should say "not found in the document."

---

## Seminar Kit

```bash
python tools/make_starter.py      # builds ../rag-tutor-starter
```

Students get the starter: same app, 5 blanked functions with hints.

| Step | File | Task |
|---|---|---|
| 1 | `rag.py` `chunk_pages` | Split pages into overlapping chunks |
| 2 | `rag.py` `build_index` | Embed chunks, build FAISS index |
| 3 | `rag.py` `retrieve` | Embed question, search, return top-k |
| 4 | `rag.py` `build_prompt` | Context + question into a prompt |
| 5 | `frontend/src/lib/api.js` `askQuestion` | POST to `/api/ask` |

You keep this repo as the solution. Use `POST /api/search` (in Swagger) to test Step 3 without an LLM.

**Experiments for the last 15 min:** change `CHUNK_SIZE` to 100 then 3000, set `TOP_K=1`, ask something the PDF doesn't cover, swap providers.

---

## Known Limits & Discussion Points

| Limitation | Why | Possible Fix |
|------------|-----|--------------|
| **In-memory store** | Restart the server and uploaded docs are gone. | Add a database (SQLite, Redis) for persistence. |
| **No OCR** | Scanned PDFs have no text layer. `pypdf` can only extract embedded text. | Integrate Tesseract or a cloud OCR service. |
| **Vague questions** | "Summarize" retrieves weakly because RAG fetches passages, not entire documents. | Add a separate "summarize" mode that feeds all chunks to the LLM. |
| **Character-based chunking** | Can cut sentences mid-word. | Use sentence-aware splitting (e.g., with spaCy or regex). |
| **No conversation memory** | Each question is independent — no follow-up context. | Maintain a message history and include it in the prompt. |
| **Single document** | Only one PDF at a time per `doc_id`. | Support multi-document collections with merged indexes. |
