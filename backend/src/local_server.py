"""Local dev server — runs the real backend with no AWS.

    cd backend && FINCH_BACKEND=local uvicorn src.local_server:app --port 8000

Exposes the same contracts as the API Gateway routes (PRD §12), with CORS open
so the onboarding app and the widget can call it directly.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src import service

app = FastAPI(title="Finch backend (local)")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "backend": "local"}


@app.post("/ingest")
async def ingest(req: Request):
    b = await req.json()
    try:
        return service.ingest(
            business_name=b.get("business_name", "My store"),
            source=b.get("source", "csv"),
            payload=b.get("payload", ""),
            domain_allowlist=b.get("domain_allowlist"),
        )
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": str(e)}, status_code=400)


@app.get("/snippet/{tenant_id}")
def snippet(tenant_id: str):
    result = service.snippet_for_tenant(tenant_id)
    if not result:
        return JSONResponse({"error": "tenant not found"}, status_code=404)
    return result


# ---- Support agent: doc-grounded Q&A ------------------------------------
@app.post("/support/ingest")
async def support_ingest(req: Request):
    b = await req.json()
    docs_in = b.get("docs")
    # convenience: a single {text}/{source,payload} also accepted
    if not docs_in:
        if b.get("payload") and b.get("source") == "url":
            docs_in = [{"name": b.get("name", b["payload"]), "source": "url", "payload": b["payload"]}]
        elif b.get("text"):
            docs_in = [{"name": b.get("name", "document"), "text": b["text"]}]
    if not docs_in:
        return JSONResponse({"error": "provide docs: [{name, text}] or a url"}, status_code=400)
    try:
        return service.ingest_docs(
            business_name=b.get("business_name", "My store"),
            docs_in=docs_in,
            domain_allowlist=b.get("domain_allowlist"),
        )
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/support/chat")
async def support_chat(req: Request):
    b = await req.json()
    if not b.get("key") or not b.get("session_id"):
        return JSONResponse({"error": "key and session_id required"}, status_code=400)
    result = service.answer_question(b["key"], b["session_id"], b.get("message", ""))
    if result.get("error"):
        return JSONResponse(result, status_code=403)
    return result


@app.post("/chat")
async def chat(req: Request):
    b = await req.json()
    if not b.get("key") or not b.get("session_id"):
        return JSONResponse({"error": "key and session_id required"}, status_code=400)
    result = service.chat_turn(b["key"], b["session_id"], b.get("message", ""))
    if result.get("error"):
        return JSONResponse(result, status_code=403)
    return result


@app.get("/cart/{session_id}")
def get_cart(session_id: str):
    return service.get_cart(session_id)


@app.post("/cart/{session_id}/add")
async def add_cart(session_id: str, req: Request):
    b = await req.json()
    tenant = service.resolve_by_key(b.get("key", ""))
    if not tenant:
        return JSONResponse({"error": "invalid_key"}, status_code=403)
    if not b.get("product_id"):
        return JSONResponse({"error": "product_id required"}, status_code=400)
    return service.add_to_cart(session_id, tenant["tenant_id"], b["product_id"], int(b.get("qty", 1)))
