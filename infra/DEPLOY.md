# Finch — AWS deploy runbook

One `sam deploy` from live. Everything below is serverless and **scales to zero**
(DynamoDB on-demand, Lambda, HTTP API — no idle cost).

## Prerequisites (do these once, tonight)
1. AWS account + AWS CLI configured (`aws configure`).
2. [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed.
3. **Enable Bedrock model access** in your region for:
   - `amazon.titan-embed-text-v2:0` (embeddings)
   - `anthropic.claude-3-5-haiku-20241022-v1:0` (chat — used by the Component 4 agent)
   Bedrock → Model access → request access. This is the one thing to verify early.

## Deploy the backend
```bash
cd infra
sam build            # packages ../backend as the Lambda source
sam deploy --guided  # first time: pick region, stack name "finch", confirm
```
Outputs an **ApiUrl** like `https://abc123.execute-api.ap-south-1.amazonaws.com`.

## Point the widget at it
In `widget/v.js` set:
```js
var FINCH_ENDPOINT = "https://abc123.execute-api.ap-south-1.amazonaws.com";
```
The widget then POSTs to `/chat` for real instead of using the mock brain.
(Host `v.js` on S3 + CloudFront; that's the `WidgetCdn` parameter.)

## Point onboarding at it
Set the API base in the onboarding app (replace the mock in `onboarding/src/api.js`
with `fetch(API_BASE + '/ingest')`), then deploy it to **Amplify Hosting**.

## Point the Support agent's widget at it
The Support agent uses its own widget, `widget/support.js` (a chat bubble). Host it
on S3 + CloudFront alongside `v.js` and pass its URL as the `SupportWidgetCdn`
parameter (default already points at the shared bucket). `support.js` reads the API
origin from its `?api=` param, so a store's embed line is just:
```html
<script src="https://cdn.finch.app/support.js?key=STORE_KEY" defer></script>
```

## What this stack creates
| Resource | Purpose |
|---|---|
| HTTP API (API Gateway) | `/ingest`, `/chat`, `/snippet/{id}`, `/cart/{id}`, `/cart/{id}/add`, `/support/ingest`, `/support/chat` |
| 7 Lambda functions | ingest, chat, snippet, cart-get, cart-add, support-ingest, support-chat |
| DynamoDB `Tenants` (+ `embed_key-index` GSI) | tenant config, key → tenant lookup (shopping **and** support) |
| DynamoDB `Products` (tenant_id / product_id) | records **+ embedding** (discovery + truth) |
| DynamoDB `Documents` (tenant_id / chunk_id) | support-agent doc passages **+ embedding** |
| DynamoDB `Carts` (session_id, TTL) | per-shopper cart |
| S3 catalog bucket | raw per-tenant catalog (`{tenant}/catalog.jsonl`) |
| IAM roles | least-privilege DynamoDB/S3 + `bedrock:InvokeModel` |

## Cost note
All on-demand / scales to zero, well within the $100 hackathon credit. This stack
deliberately avoids OpenSearch Serverless (which has a minimum always-on charge) —
vectors live in DynamoDB and are ranked in-Lambda. See PRD §8.

## Verify after deploy
```bash
curl -X POST $API/ingest -H 'content-type: application/json' \
  -d '{"business_name":"Test","source":"csv","payload":"id,name,description,price,image_url,product_url,category,stock\n1,Test Shoe,A test,999,,,,5"}'
# → { tenant_id, embed_key, product_count }
```
Then `POST $API/chat` with the returned `key`.

For the **Support agent**:
```bash
curl -X POST $API/support/ingest -H 'content-type: application/json' \
  -d '{"business_name":"Test","docs":[{"name":"Returns.txt","text":"You can return any unworn item within 30 days for a full refund."}]}'
# → { tenant_id, embed_key, doc_count, chunk_count }
```
Then `POST $API/support/chat` with the returned `key` and a `message` — the answer
is grounded in the uploaded docs and cites its source.
