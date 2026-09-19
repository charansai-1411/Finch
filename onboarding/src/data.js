export const USER_NAME = 'Charan';

// Default system prompt for the Shopping Agent (editable in the builder).
export const DEFAULT_PROMPT =
`You are Finch, a friendly and honest in-store salesperson for this store.

- Understand what the shopper needs — even vague requests — and ask at most one clarifying question.
- Recommend 1–3 products, each with a one-line reason, ONLY from this store's catalog.
- Always confirm price and stock before stating them. Never invent products, prices, or availability.
- Be warm, concise, and genuinely helpful. If nothing fits, say so honestly.`;

// The agent's flow. search_products is core (locked on); the rest are toggleable.
export const FLOW = [
  { key: 'understand', name: 'Understand the shopper', tool: null, core: true },
  { key: 'search', name: 'Search your catalog', tool: 'search_products', core: true },
  { key: 'stock', name: 'Confirm price & stock', tool: 'check_stock', core: false },
  { key: 'recommend', name: 'Recommend 1–3 products', tool: null, core: true },
  { key: 'cart', name: 'Add to cart', tool: 'add_to_cart', core: false },
];

// ===== Support agent =====
// Default system prompt for the Support Agent (editable in the builder).
export const SUPPORT_PROMPT =
`You are a friendly, honest customer-support assistant for this store.

- Answer the customer's question using ONLY the store's uploaded docs (policies, FAQs, guides).
- If the answer isn't in the docs, say you don't have that information and point them to a human — never guess.
- Be concise (2–5 sentences), warm, and specific. Cite the document you used.`

// The Support agent's flow. Retrieve + answer are core; citations are optional.
export const SUPPORT_FLOW = [
  { key: 'understand', name: 'Understand the question', tool: null, core: true },
  { key: 'retrieve', name: 'Search your documents', tool: 'search_docs', core: true },
  { key: 'ground', name: 'Answer only from the docs', tool: null, core: true },
  { key: 'cite', name: 'Cite the source document', tool: 'cite_sources', core: false },
  { key: 'handoff', name: 'Hand off when unsure', tool: null, core: true },
]

// Connectors. Catalog is required; the rest are teasers.
export const CONNECTORS = [
  { id: 'shopify', name: 'Shopify', desc: 'Sync products & write to the real cart', icon: 'cart', status: 'soon' },
  { id: 'slack', name: 'Slack', desc: 'Notify your team on new orders', icon: 'text', status: 'soon' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Let shoppers chat from WhatsApp', icon: 'mail', status: 'soon' },
];

// Prebuilt agents shown on Home. Only 'shopping' is available; rest are teasers.
export const AGENTS = [
  {
    id: 'shopping', name: 'Shopping Agent', tag: 'Sales', icon: 'cart', status: 'available',
    desc: 'An AI salesperson that knows your catalog and recommends real products — with add-to-cart built in.',
  },
  {
    id: 'support', name: 'Support Agent', tag: 'Support', icon: 'life', status: 'available',
    desc: 'Answers customer questions from your help docs, policies, and PDFs — grounded, with citations.',
  },
  {
    id: 'lead', name: 'Lead Qualifier', tag: 'Sales', icon: 'user', status: 'soon',
    desc: 'Chats with visitors, qualifies them against your ICP, and books meetings.',
  },
  {
    id: 'inbox', name: 'Inbox Assistant', tag: 'Ops', icon: 'mail', status: 'soon',
    desc: 'Triages your support inbox and drafts on-brand replies for you to approve.',
  },
];
