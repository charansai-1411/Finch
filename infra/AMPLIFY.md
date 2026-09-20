# Finch — deploy runbook (backend update + frontend on Amplify)

Two frontends (onboarding dashboard + landing page) on **AWS Amplify Hosting**,
talking to the already-deployed serverless backend. The repo is pre-wired; the
steps below are the parts that need your AWS account.

Deployed backend (current): `https://gsq790ciza.execute-api.ap-south-1.amazonaws.com` (region `ap-south-1`).

---

## 1. Update the backend to the latest code (support agent)

The live stack predates the Support agent, so redeploy it once to add the
`/support/ingest` + `/support/chat` routes and the `finch-documents` table. This
keeps the **same API URL** — no frontend change needed.

Run on a machine with the AWS CLI + SAM CLI and credentials for the account that
owns the `finch` stack (region `ap-south-1`):

```bash
cd infra
sam build
sam deploy                      # reuses the saved samconfig; same stack + URL
# first time on a new machine: sam deploy --guided  (stack name: finch, region: ap-south-1)
```

Verify:
```bash
API=https://gsq790ciza.execute-api.ap-south-1.amazonaws.com
curl -X POST $API/support/ingest -H 'content-type: application/json' \
  -d '{"business_name":"Test","docs":[{"name":"Returns.txt","text":"Unworn items can be returned within 30 days for a full refund."}]}'
# → { tenant_id, embed_key, doc_count, chunk_count }
```

> Conversational answers (vs. extractive) need a Groq key:
> `sam deploy --parameter-overrides GroqApiKey=gsk_xxx` (the agent turns on automatically).

Also upload the Support widget next to `v.js` so the embed line works:
```bash
aws s3 cp widget/support.js s3://finch-widget-938358604976/support.js \
  --content-type application/javascript --cache-control 'public,max-age=300'
```

---

## 2. Deploy the frontends to Amplify Hosting

The repo has a monorepo build spec at [`amplify.yml`](../amplify.yml) with two
`appRoot`s: `onboarding` (Vite) and `landing` (static). Create **two Amplify apps**
from the same repo — one per app root.

For each app: **Amplify console → New app → Host web app → GitHub →** authorize and
pick `charansai-1411/Finch`, branch `main`.

| Amplify app | Monorepo app root | Build | Output |
|---|---|---|---|
| `finch-onboarding` | `onboarding` | `npm ci && npm run build` (from `amplify.yml`) | `onboarding/dist` |
| `finch-landing` | `landing` | none (static) | `landing/index.html` |

- When Amplify detects the monorepo `amplify.yml`, set the **app root** to `onboarding`
  (first app) and `landing` (second app). Amplify uses the matching block automatically.
- The onboarding build reads [`onboarding/.env.production`](../onboarding/.env.production)
  for `VITE_FINCH_API`, so it ships pointing at the live API. To point at a different
  API without editing the repo, add an Amplify **environment variable** `VITE_FINCH_API`
  (it overrides the file).
- Click **Save and deploy**. Each app gets a URL like `https://main.d1abc23.amplifyapp.com`.

---

## 3. Link the landing page to the onboarding app

The two apps are on different domains, so after the onboarding app is live, set its
URL in the landing page's config block (top of the inline `<script>` in
[`landing/index.html`](../landing/index.html)):

```js
var FINCH_APP_URL  = 'https://main.d1abc23.amplifyapp.com';   // your onboarding URL
var FINCH_DEMO_URL = 'https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/demo/support.html';
```

Commit + push to `main`; Amplify auto-redeploys the landing app. (Left blank, the
CTAs fall back to `/app` and `/demo` relative paths, and to localhost in dev.)

---

## Notes

- **CORS:** the API allows all origins (`AllowOrigins: ['*']`), so the Amplify domains
  work without extra config.
- **Shopping vs Support:** the onboarding Support flow is fully live against the
  backend; the Shopping setup flow is still a client-side mock (fabricates a key) —
  wiring it to the real `/ingest` is a follow-up.
- **Auto-deploy:** Amplify rebuilds each app on every push to `main`.
