"""
The whole RAG pipeline in one file.

PDF -> pages -> chunks -> embeddings -> FAISS index -> retrieve -> prompt -> LLM

Embeddings run locally (fastembed, no API key), so only the LLM changes
when you switch providers.
"""
import io

import faiss
import numpy as np
from fastembed import TextEmbedding
from pypdf import PdfReader

SYSTEM_PROMPT = (
    "You are a friendly ticket booking support assistant. "
    "Answer the user's doubt ONLY using the context given. "
    "If the answer is not in the context, say: 'I could not find this in the ticket policy. "
    "Please contact customer support.' "
    "Never guess prices, charges, refund amounts, or timings. "
    "Explain simply, use short bullets where helpful, and cite pages like (p.3)."
)

_embedder = None


def embed(texts: list[str]) -> np.ndarray:
    """Turn text into normalised vectors. (Given - not a student task.)"""
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding("BAAI/bge-small-en-v1.5")  # 384 dims, ~130MB, downloads once
    vecs = np.array(list(_embedder.embed(texts)), dtype="float32")
    faiss.normalize_L2(vecs)  # normalised + inner product = cosine similarity
    return vecs


def load_pdf(data: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text), ...] and skip empty pages. (Given.)"""
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return pages


# ---- STEP 1 ---------------------------------------------------------------
def chunk_pages(pages: list[tuple[int, str]], size: int, overlap: int) -> list[dict]:
    """Split each page into overlapping pieces. Return [{"text": str, "page": int}, ...]."""
    # >>> SOLUTION: slide a window of `size` characters over each page, stepping by size - overlap
    chunks = []
    for page, text in pages:
        start = 0
        while start < len(text):
            piece = text[start : start + size].strip()
            if piece:
                chunks.append({"text": piece, "page": page})
            if start + size >= len(text):
                break
            start += size - overlap
    return chunks
    # <<< SOLUTION


# ---- STEP 2 ---------------------------------------------------------------
def build_index(chunks: list[dict]) -> faiss.Index:
    """Embed every chunk and store the vectors in a FAISS index."""
    # >>> SOLUTION: embed all chunk texts, make faiss.IndexFlatIP(dim), add the vectors, return it
    vecs = embed([c["text"] for c in chunks])
    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs)
    return index
    # <<< SOLUTION


# ---- STEP 3 ---------------------------------------------------------------
def retrieve(index: faiss.Index, chunks: list[dict], question: str, k: int) -> list[dict]:
    """Return the k most similar chunks, each with a "score" added."""
    # >>> SOLUTION: embed the question, index.search it, map the ids back to chunks
    q = embed([question])
    scores, ids = index.search(q, min(k, len(chunks)))
    return [
        {**chunks[i], "score": round(float(s), 3)}
        for s, i in zip(scores[0], ids[0])
        if i != -1
    ]
    # <<< SOLUTION


# ---- STEP 4 ---------------------------------------------------------------
def build_prompt(question: str, hits: list[dict]) -> str:
    """Combine the retrieved chunks and the question into one prompt string."""
    # >>> SOLUTION: join the chunks as "[Page N] text" under a Context heading, then add the question
    context = "\n\n".join(f"[Page {h['page']}]\n{h['text']}" for h in hits)
    return f"Context:\n{context}\n\nQuestion: {question}"
    # <<< SOLUTION