# Finch — deployment & links

Everything currently deployed on AWS (region **ap-south-1**, account **938358604976**).
Last verified: all endpoints returning 200 and the support agent answering live.

## Live links

| Piece | URL | Hosting |
|---|---|---|
| **Landing page** | https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/landing/index.html | S3 |
| **Onboarding dashboard** | https://main.d3hnwgsalj9ele.amplifyapp.com | Amplify (auto-deploys on push to `main`) |
| **Backend API** | https://gsq790ciza.execute-api.ap-south-1.amazonaws.com | API Gateway + Lambda (SAM stack `finch`) |
| **Support widget** (`support.js`) | https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/support.js | S3 |
| **Search widget** (`v.js`) | https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/v.js | S3 |

## The one line a store pastes

Support chat bubble (after building a Support agent in the dashboard):
```html
<script src="https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/support.js?key=YOUR_KEY" defer></script>
```

AI search (Shopping):
```html
<script src="https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/v.js?key=YOUR_KEY" defer></script>
```

## Backend API routes

Base: `https://gsq790ciza.execute-api.ap-south-1.amazonaws.com`

| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest` | Ingest + embed a product catalog (Shopping) |
| POST | `/chat` | Shopping agent turn |
| GET | `/snippet/{tenant_id}` | Embed snippet for a tenant |
| GET | `/cart/{session_id}` | Current cart |
| POST | `/cart/{session_id}/add` | Add to cart |
| POST | `/support/ingest` | Ingest + embed help docs (Support) |
| POST | `/support/chat` | Support agent turn (grounded, cited) |

## AWS resources

| Resource | Value |
|---|---|
| Region | `ap-south-1` |
| Account | `938358604976` |
| CloudFormation / SAM stack | `finch` |
| Lambda runtime | `python3.13` |
| Support LLM | Groq `openai/gpt-oss-120b` (conversational answers; falls back to extractive with no key) |
| Amplify app (onboarding) | app id `d3hnwgsalj9ele`, branch `main` |
| S3 bucket (widgets + landing) | `finch-widget-938358604976` |
| DynamoDB tables | `finch-tenants`, `finch-products`, `finch-documents`, `finch-carts` |

## Redeploying

**Backend** (from `infra/`, needs AWS + SAM CLI):
```bash
sam build && sam deploy --stack-name finch --region ap-south-1 --resolve-s3 \
  --capabilities CAPABILITY_IAM --parameter-overrides GroqApiKey=YOUR_GROQ_KEY
```
> Passing `GroqApiKey` is required each deploy, or it resets to empty (extractive mode).

**Widgets / landing** (static → S3):
```bash
aws s3 cp widget/support.js s3://finch-widget-938358604976/support.js --content-type application/javascript
aws s3 cp landing/index.html s3://finch-widget-938358604976/landing/index.html --content-type "text/html; charset=utf-8"
```

**Onboarding** — auto-deploys: push to `main` and Amplify rebuilds. It reads
`onboarding/.env.production` for the API URL.

## Notes / follow-ups

- **Landing is on S3, not Amplify**, only because the AWS account's Amplify app quota is 1
  while account verification is pending. Once verified, it can move to a second Amplify app
  (monorepo root `landing`) for auto-deploy parity.
- The **Shopping** onboarding flow is still a front-end mock; the **Support** flow is fully
  live against the backend.
- Prettier URLs (custom domain via CloudFront) are a follow-up after account verification.
