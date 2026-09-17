# Finch

> Darwin's finches each adapted to fit their island — different beak, same bird.
> **Finch is one AI worker that adapts to fit any business. Drop one line into your site and it already knows your store.**

Finch gives any online store an AI salesperson that understands its specific catalog — connect a catalog, paste one `<script>` tag, and the agent is live. Built for the **First Commit — Bharat Builds Tour** hackathon (Ship It track), fully serverless on AWS.

Full spec: [docs/Finch-PRD.md](docs/Finch-PRD.md).

## The one loop (MVP)

```
connect catalog (CSV/URL) → auto-embed into DynamoDB → copy one <script> → paste on site
   → shopper asks in natural language → agent recommends real products → add to cart
```

## Architecture (must-have path — genuinely scales to zero)

| Layer | Service |
|---|---|
| Agent brain | Amazon Bedrock (Claude Haiku / Nova) + Strands Agents SDK on Lambda |
| Embeddings | Bedrock Titan Text Embeddings v2 |
| Vector store | **DynamoDB** (embedding stored on the product item) + in-Lambda cosine search |
| API | API Gateway (HTTP) + Lambda |
| State | DynamoDB — Tenants, Products, Carts |
| Storage + CDN | S3 + CloudFront (hosts `v.js`) |
| Onboarding UI | Amplify Hosting (React/Vite) |
| Auth | Cognito (owner login, light) |

> Bedrock Knowledge Bases + OpenSearch Serverless is a **stretch** swap only — it does not scale to zero and can burn the $100 credit. DynamoDB embeddings are the must-have.

**Design principle:** discovery vs. truth are separated — vector search finds candidates, the structured DynamoDB record is the source of truth for price/stock, so the agent never quotes a hallucinated price.

## Repo layout

```
finch/
├── backend/        Python Lambdas: ingest, chat, snippet, cart + Strands agent + lib
├── widget/         Embeddable v.js widget (shadow DOM) + demo store page
├── onboarding/     React/Vite connect-catalog + copy-snippet page
├── infra/          AWS SAM template (API + Lambdas + DynamoDB + S3)
├── sample-data/    Demo catalog CSV
└── docs/           PRD
```

## Quickstart

Each subproject has its own README:
- [backend/README.md](backend/README.md)
- [widget/README.md](widget/README.md)
- [onboarding/README.md](onboarding/README.md)

## Status

Scaffold — empty pipes wired end to end. See the PRD build plan (§14) for the day-by-day.

## API contracts

| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest` | Ingest + embed + index a catalog |
| GET | `/snippet/{tenant_id}` | Return the embed snippet + key |
| POST | `/chat` | Agent turn → streamed reply + product cards + cart |
| GET | `/cart/{session_id}` | Current cart |
