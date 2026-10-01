import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import llm, rag
from .config import CHUNK_OVERLAP, CHUNK_SIZE, TOP_K

app = FastAPI(title="RAG AI Tutor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: doc_id -> {filename, pages, chunks, index}. Restart = clean slate.
DOCS: dict[str, dict] = {}


class AskBody(BaseModel):
    doc_id: str
    question: str
    top_k: int = TOP_K


def _get_doc(doc_id: str) -> dict:
    doc = DOCS.get(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found. Upload the PDF again.")
    return doc


@app.get("/api/health")
def health():
    return {"status": "ok", **llm.info()}


@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")
    try:
        pages = rag.load_pdf(file.file.read())
    except Exception:
        raise HTTPException(400, "Could not read this PDF. Is it corrupted or password-protected?")
    if not pages:
        raise HTTPException(422, "No text found. Scanned PDFs need OCR. Try a text-based PDF.")

    chunks = rag.chunk_pages(pages, CHUNK_SIZE, CHUNK_OVERLAP)
    index = rag.build_index(chunks)

    doc_id = uuid.uuid4().hex[:8]
    DOCS[doc_id] = {"filename": file.filename, "pages": len(pages), "chunks": chunks, "index": index}
    return {"doc_id": doc_id, "filename": file.filename, "pages": len(pages), "chunks": len(chunks)}


@app.post("/api/search")
def search(body: AskBody):
    """Retrieval only, no LLM. Great for debugging Step 3."""
    doc = _get_doc(body.doc_id)
    return {"sources": rag.retrieve(doc["index"], doc["chunks"], body.question, body.top_k)}


@app.post("/api/ask")
def ask(body: AskBody):
    doc = _get_doc(body.doc_id)
    hits = rag.retrieve(doc["index"], doc["chunks"], body.question, body.top_k)
    prompt = rag.build_prompt(body.question, hits)
    try:
        answer = llm.chat(rag.SYSTEM_PROMPT, prompt)
    except Exception as e:
        raise HTTPException(502, f"LLM call failed ({llm.info()['provider']}): {e}")
    return {"answer": answer, "sources": hits}
