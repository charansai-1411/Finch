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
