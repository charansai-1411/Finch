// ===== Mock API =====
// Stands in for the real backend while AWS credits are pending.
// Swap these for fetch('/ingest') and fetch('/snippet/:id') once the
// backend (Component 3) is deployed — the shapes match the PRD §12 contracts.

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export function countCsvProducts(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length)
  return Math.max(0, lines.length - 1) // minus header row
}

// POST /ingest -> { tenant_id, embed_key, product_count }
export async function ingest({ businessName, source, productCount }) {
  await wait(500)
  const rand = (n) => Math.random().toString(36).slice(2, 2 + n)
  return {
    tenantId: 'tnt_' + rand(6),
    embedKey: 'pk_live_' + rand(14),
    businessName,
    source,
    productCount: productCount || Math.floor(120 + Math.random() * 400),
  }
}

// GET /snippet/:tenant_id -> the embeddable line
const WIDGET_CDN = 'https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/v.js'
export function snippetFor(embedKey) {
  return `<script src="${WIDGET_CDN}?key=${embedKey}" defer></script>`
}

// ===== Support agent — REAL backend =====
// The Support agent calls the live Finch backend (docs -> chunks -> grounded
// answers). In local dev that's the FastAPI server; override with VITE_FINCH_API.
export const SUPPORT_API = (import.meta.env?.VITE_FINCH_API || 'http://127.0.0.1:8000').replace(/\/$/, '')
const SUPPORT_WIDGET = import.meta.env?.VITE_FINCH_WIDGET || 'http://127.0.0.1:5600/support.js'
const SUPPORT_CDN = 'https://cdn.finch.app/support.js' // the line a store actually pastes

// POST /support/ingest -> { tenant_id, embed_key, doc_count, chunk_count }
export async function ingestDocs({ businessName, docs }) {
  const res = await fetch(`${SUPPORT_API}/support/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: businessName,
      docs: docs.map((d) => ({ name: d.name, text: d.text })),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `ingest failed (${res.status})`)
  return {
    businessName,
    tenantId: data.tenant_id,
    embedKey: data.embed_key,
    docCount: data.doc_count,
    chunkCount: data.chunk_count,
  }
}

// The one line a store pastes (shown to the user).
export function supportSnippetFor(embedKey) {
  return `<script src="${SUPPORT_CDN}?key=${embedKey}" defer></script>`
}

// The live-preview line for THIS session (points at the local widget + backend).
export function supportPreviewSrc(embedKey, name) {
  return `${SUPPORT_WIDGET}?key=${encodeURIComponent(embedKey)}&api=${encodeURIComponent(SUPPORT_API)}&name=${encodeURIComponent(name || 'Support')}`
}
