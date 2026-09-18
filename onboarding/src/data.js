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
    id: 'support', name: 'Support Agent', tag: 'Support', icon: 'life', status: 'soon',
    desc: 'Answers customer questions from your help docs, policies, and order data.',
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
