"""Document ingestion for the Support agent.

Turns uploaded help material (plain text / Markdown, pre-extracted PDF text, or a
help-page URL) into small retrievable passages ("chunks"). Each chunk is what the
support agent retrieves and grounds its answer in — the analogue of a product in
the shopping pipeline.

    raw doc  ->  clean text  ->  chunks {doc_id, doc_name, chunk_id, text}

PDFs are extracted to text in the client (pdf.js) or via `from_pdf_bytes` when a
PDF library is available, so the JSON API stays binary-free.
"""
import re

from src.lib import ids  # noqa: F401  (kept for symmetry / future per-chunk ids)

# Target passage size in characters, with a little overlap so a sentence split
# across a boundary is still recoverable by the neighbouring chunk.
CHUNK_CHARS = 800
CHUNK_OVERLAP = 120
MAX_CHUNKS_PER_DOC = 400


def clean_text(text: str) -> str:
    """Normalise whitespace; drop control chars. Keeps paragraph breaks."""
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_html(html: str) -> str:
    """Very small HTML -> text: drop script/style, keep visible text + breaks."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html or "", "html.parser")
        for t in soup(["script", "style", "noscript", "svg"]):
            t.decompose()
        return clean_text(soup.get_text("\n"))
    except ImportError:
        return clean_text(re.sub(r"<[^>]+>", " ", html or ""))


def from_url(url: str) -> str:
    """Fetch a help/FAQ/policy page and return its readable text."""
    import requests
    u = url.strip()
    if not u.startswith("http"):
        u = "https://" + u
    headers = {"User-Agent": "Mozilla/5.0 (compatible; FinchBot/1.0)"}
    r = requests.get(u, headers=headers, timeout=15)
    r.raise_for_status()
    return strip_html(r.text)


def from_pdf_bytes(data: bytes) -> str:
    """Extract text from PDF bytes when a PDF library is installed (optional).

    The browser demo extracts PDF text client-side, so this is only used by the
    server-side / Lambda path. Returns "" if no library is available.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    import io
    reader = PdfReader(io.BytesIO(data))
    return clean_text("\n\n".join((page.extract_text() or "") for page in reader.pages))


def chunk(text: str) -> list[str]:
    """Split clean text into ~CHUNK_CHARS passages on paragraph/sentence edges."""
    text = clean_text(text)
    if not text:
        return []
    # Prefer paragraph boundaries; fall back to hard slicing for huge blocks.
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if len(p) > CHUNK_CHARS:
            # flush what we have, then hard-slice the long paragraph
            if buf:
                chunks.append(buf.strip()); buf = ""
            chunks.extend(_hard_slice(p))
            continue
        if len(buf) + len(p) + 2 <= CHUNK_CHARS:
            buf = (buf + "\n\n" + p) if buf else p
        else:
            if buf:
                chunks.append(buf.strip())
            buf = p
    if buf:
        chunks.append(buf.strip())
    return [c for c in chunks if c][:MAX_CHUNKS_PER_DOC]


def _hard_slice(p: str) -> list[str]:
    out, i, n = [], 0, len(p)
    while i < n:
        end = min(i + CHUNK_CHARS, n)
        # try not to cut mid-sentence
        if end < n:
            dot = p.rfind(". ", i + CHUNK_CHARS - 200, end)
            if dot != -1:
                end = dot + 1
        out.append(p[i:end].strip())
        i = max(end - CHUNK_OVERLAP, end)
    return out


def to_chunks(doc_name: str, text: str) -> list[dict]:
    """One document -> list of chunk dicts (no embedding yet)."""
    doc_id = "doc_" + re.sub(r"[^a-z0-9]+", "-", (doc_name or "document").lower()).strip("-")[:40]
    passages = chunk(text)
    return [
        {"doc_id": doc_id, "doc_name": doc_name or "document",
         "chunk_id": f"{doc_id}#{i}", "text": t}
        for i, t in enumerate(passages)
    ]


def normalize_docs(docs: list[dict]) -> list[dict]:
    """Accept [{name, text}] and/or [{name, source:'url', payload}] -> chunks.

    Each incoming doc becomes many chunks. Returns a flat chunk list.
    """
    out: list[dict] = []
    for d in docs or []:
        name = d.get("name") or d.get("doc_name") or "document"
        if d.get("source") == "url" and d.get("payload"):
            text = from_url(d["payload"])
            name = name if name != "document" else d["payload"]
        else:
            text = d.get("text", "")
        out.extend(to_chunks(name, text))
    return out
