# Finch — Backend

Python backend for ingest, retrieval, cart, tenants, and `/chat`. Runs **fully
locally with no AWS** (JSON store + a local hashed embedding), and switches to
DynamoDB + Bedrock with one env var. The LLM agent is **Component 4** and plugs
in at the marked seam in `service.chat_turn()`.

## Backend switch

```
FINCH_BACKEND=local   # default — JSON store + local embedding, zero AWS
FINCH_BACKEND=aws     # DynamoDB + Bedrock Titan embeddings
```
`service.py` / `handlers/` are identical for both; only `lib/store.py` and
`lib/embeddings.py` branch.

## Layout

```
src/
├── config.py           backend switch, model ids, tables
├── service.py          core logic: ingest, search, cart, snippet, chat_turn
├── lib/
│   ├── store.py        storage facade (picks local_store or dynamo)
│   ├── local_store.py  JSON-file store (dev)
│   ├── dynamo.py       DynamoDB store (aws)
│   ├── embeddings.py   local hashed vector  |  Bedrock Titan
│   ├── vectors.py      cosine + top-k
│   ├── catalog.py      CSV parse (+ URL crawl stub)
│   └── ids.py          tenant/key/session ids
├── handlers/           AWS Lambda entrypoints (thin wrappers over service)
├── local_server.py     FastAPI dev server (same contracts as API Gateway)
└── agent/              Component 4 — agent orchestration (stub for now)
scripts/
├── smoke.py            end-to-end pipeline test (no server, no deps)
└── http_smoke.py       hits the running server over HTTP
```

## Run it locally

```bash
cd backend
python scripts/smoke.py                 # pipeline test — needs nothing but stdlib

python -m venv .venv && ./.venv/Scripts/pip install -r requirements-dev.txt
FINCH_BACKEND=local ./.venv/Scripts/python -m uvicorn src.local_server:app --port 8000
python scripts/http_smoke.py            # verify the HTTP API + CORS
```

## Endpoints (PRD §12)

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/ingest` | `{business_name, source:"csv"\|"url", payload}` | normalize + embed + store; returns `{tenant_id, embed_key, product_count}` |
| GET  | `/snippet/{tenant_id}` | — | the embed snippet + key |
| POST | `/chat` | `{key, session_id, message}` | **retrieval + templated reply** → `{reply, products, suggestions}` |
| GET  | `/cart/{session_id}` | — | current cart |
| POST | `/cart/{session_id}/add` | `{key, product_id, qty}` | add to cart (backend op) |

## What's real vs. deferred

- **Real now:** ingestion, embedding, vector search (cosine), cart, tenants,
  multi-tenant key isolation, the full HTTP API.
- **Local stand-ins (swap for AWS):** JSON store → DynamoDB; hashed embedding →
  Bedrock Titan. One env var, no code change.
- **Component 4 (agent):** `chat_turn()` currently returns a *templated* reply
  over retrieved products. The Strands + Bedrock agent replaces that block with
  real reasoning + tool use (`agent/tools.py` are the ready tool wrappers),
  keeping the same response shape — so the widget needs no change.
```
