<div align="center">

# 🐦 Finch

**One AI worker that adapts to fit any business.**
Drop one line into your site and it already knows your store.

[Landing](https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/landing/index.html) ·
[Live dashboard](https://main.d3hnwgsalj9ele.amplifyapp.com) ·
[Full deployment & links](DEPLOYMENT.md)

`serverless` · `AWS` · `DynamoDB vector search` · `Groq LLM` · `Shadow-DOM widget`

</div>

---

## Problem statement

Every online store loses sales at the exact moment a shopper needs help.

- **Search bars match words, not meaning.** A shopper types *"black running shoe under 3k for daily jogging, size 9"* and gets **0 results**, because keyword search can't weigh budget, use-case, or fit. The shopper bounces.
- **Support questions go unanswered.** *"Can I return a sale item?"*, *"do you ship internationally?"* — the answers live in a PDF or a policy page nobody reads, so the customer emails and waits, or leaves.
- **The fix is priced out of reach.** A custom AI assistant means developers, weeks of integration, and a four-figure agency bill. Most small and mid-size stores can't justify it.

**Finch removes all three.** It's one AI worker that adapts to *your* store: connect your data, paste one `<script>` line, and a grounded assistant is live — no developers, no weeks, no big bill. It answers from **your** catalog and **your** docs, and never invents a product, price, or policy.

## What it is

Finch ships two prebuilt agents that share one pipeline and one embed model:

| Agent | What it does | Grounded in |
|---|---|---|
| 🛒 **Shopping agent** | Understands vague needs, recommends real products, adds to cart | Your product catalog |
| 🎧 **Support agent** | Answers customer questions with citations, hands off when unsure | Your PDFs / docs / FAQs |

### The one loop

```
connect data (CSV / URL / PDF / docs)  →  auto-embed into DynamoDB  →  copy one <script>  →  paste on site
      →  visitor asks in natural language  →  agent retrieves real data  →  grounded, cited answer (+ add to cart)
```

## Architecture

![Finch architecture](docs/architecture.svg)

**Design principle — discovery vs. truth are separated.** Vector search *finds* candidates; the structured DynamoDB record is the *source of truth* for price and stock. The agent only ever sees tool/retrieval results, so it can't quote a hallucinated price or invent a policy.

**Two paths through one backend:**

- **Setup (gold).** The owner connects a catalog or uploads docs in the dashboard → `/ingest` or `/support/ingest` → each item/passage is embedded and written to DynamoDB (embedding stored on the item) → the owner pastes one `<script>` line on their site.
- **Runtime (blue).** A visitor asks in the widget → `/chat` or `/support/chat` → the Lambda embeds the query, runs an in-Lambda cosine search over that tenant's vectors, and hands the top matches to the LLM, which writes a grounded (and, for support, cited) answer.

> Vectors live **in DynamoDB** and are ranked **in-Lambda** — deliberately avoiding OpenSearch Serverless, which has an always-on charge. The whole stack scales to zero.

## Tech stack

| Layer | Choice |
|---|---|
| Agent brain | **Groq** `openai/gpt-oss-120b` (LLM tool-use + grounded answers) |
| Embeddings | Bedrock Titan v2 *or* a deterministic local hashed vector (`$0`, default) |
| Vector store | **DynamoDB** (embedding on the item) + in-Lambda cosine top-k |
| API | Amazon API Gateway (HTTP) + AWS Lambda (Python 3.13) |
| State | DynamoDB — Tenants, Products, Documents, Carts |
| Storage / CDN | S3 (raw catalog + widget hosting) |
| Onboarding UI | React + Vite on **AWS Amplify Hosting** |
| Widget | Vanilla JS, **Shadow DOM** (isolated from the host site's CSS) |
| IaC | AWS SAM (`infra/template.yaml`) |

## Repository layout

```
finch/
├── backend/       Python: ingest / chat / snippet / cart / support handlers + agent + lib
│   └── src/
│       ├── service.py      core logic (ingest, search, cart, chat, support answer)
│       ├── agent/          LLM agents (shopping tool-loop, support grounded answer)
│       ├── lib/            embeddings · vectors · catalog · docs · store (local | dynamo)
│       └── handlers/       thin Lambda entrypoints
├── onboarding/    React/Vite dashboard — build agents, upload data, get the snippet
├── widget/        Embeddable widgets: v.js (AI search) + support.js (chat bubble) + demos
├── landing/       Static marketing page (single self-contained index.html)
├── infra/         AWS SAM template + deploy runbooks (DEPLOY.md, AMPLIFY.md)
├── docs/          PRD + architecture diagram
└── DEPLOYMENT.md  All live links + AWS resources
```

## Local development

Prerequisites: **Python 3.11+**, **Node 18+**. On Windows, the commands below are PowerShell; each block has a bash equivalent noted where it differs.

### 1. Backend (runs with zero AWS)

The backend runs fully locally — a JSON-file store and a deterministic local embedding stand in for DynamoDB + Bedrock. Switch to AWS with one env var.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt
$env:FINCH_BACKEND = "local"
.venv\Scripts\python -m uvicorn src.local_server:app --port 8000
```

```bash
# bash / macOS / Linux
cd backend && python -m venv .venv && ./.venv/bin/pip install -r requirements-dev.txt
FINCH_BACKEND=local ./.venv/bin/python -m uvicorn src.local_server:app --port 8000
```

Smoke-test the whole pipeline (no server, stdlib only): `python scripts/smoke.py`
Test the running HTTP API: `python scripts/http_smoke.py`

### 2. Onboarding dashboard

```powershell
cd onboarding
npm install
npm run dev        # http://localhost:5173
```

The Support flow calls the backend at `VITE_FINCH_API` (defaults to `http://127.0.0.1:8000`).

### 3. Widgets + landing (static)

```powershell
cd widget
python -m http.server 5600          # serves v.js, support.js, and /demo/*

cd ..\landing
python -m http.server 5500          # the marketing page
```

Open `http://localhost:5600/demo/support.html` to upload docs and chat against them with the live support bubble.

## Configuration

All configuration is environment variables (see `backend/src/config.py`):

| Variable | Default | Purpose |
|---|---|---|
| `FINCH_BACKEND` | `local` | `local` (JSON store) or `aws` (DynamoDB) |
| `FINCH_EMBED` | `local` | `local` (hashed) or `bedrock` (Titan v2 semantic) |
| `FINCH_AGENT` | `off` | `on` routes chat through the LLM; `off` uses a templated / extractive reply |
| `FINCH_AGENT_PROVIDER` | `groq` | `groq` or `bedrock` |
| `GROQ_API_KEY` | – | Groq key (`gsk_…`); the agent turns on automatically once set |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq model id |
| `TOP_K` / `TOP_K_DOCS` | `3` / `4` | Retrieval breadth for products / doc passages |

**Without an LLM key**, the support agent still works — it returns the most relevant passage, correctly sourced (extractive mode). With a key, answers become conversational with inline `[n]` citations.

## Deployment

Fully serverless, scales to zero. See **[infra/DEPLOY.md](infra/DEPLOY.md)** (backend) and **[infra/AMPLIFY.md](infra/AMPLIFY.md)** (frontends) for the step-by-step runbook, and **[DEPLOYMENT.md](DEPLOYMENT.md)** for all live links and AWS resources.

```bash
cd infra
sam build
sam deploy --guided        # stack name: finch, region: ap-south-1
```

## API reference

Base: `https://gsq790ciza.execute-api.ap-south-1.amazonaws.com`

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/ingest` | `{business_name, source, payload}` | Embed + index a catalog → `{tenant_id, embed_key, product_count}` |
| POST | `/chat` | `{key, session_id, message}` | Shopping turn → `{reply, products, suggestions}` |
| GET | `/snippet/{tenant_id}` | – | The embed snippet for a tenant |
| GET | `/cart/{session_id}` | – | Current cart |
| POST | `/cart/{session_id}/add` | `{key, product_id, qty}` | Add to cart |
| POST | `/support/ingest` | `{business_name, docs:[{name,text}]}` | Chunk + embed docs → `{tenant_id, embed_key, doc_count, chunk_count}` |
| POST | `/support/chat` | `{key, session_id, message}` | Support turn → `{reply, sources, suggestions}` |

## Status

- **Live now:** Support agent end-to-end on AWS (ingest → grounded, cited answers), both widgets, onboarding on Amplify, landing on S3.
- **Follow-ups:** wire the Shopping onboarding flow to the real `/ingest` (currently a front-end mock); custom domains via CloudFront; a second Amplify app for the landing once the account is verified.

---

<div align="center">

*Darwin's finches each adapted to fit their island — different beak, same bird.*
Built for the **First Commit — Bharat Builds Tour** hackathon (Ship It track).

</div>
