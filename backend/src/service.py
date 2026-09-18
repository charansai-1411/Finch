"""Core business logic — used by both the Lambda handlers and the local server.

Component 3 scope: ingestion, vector retrieval, cart, tenants, snippet, and a
retrieval-only /chat. The LLM reasoning (Strands agent + Bedrock tool use) is
Component 4 and plugs in at the marked seam in chat_turn().
"""
import re
import time

from src import config
from src.lib import catalog, embeddings, ids, objectstore, store, vectors


# ---- ingestion -----------------------------------------------------------
def ingest(business_name: str, source: str, payload: str, domain_allowlist=None):
    """Normalize a catalog, embed every product, store it, register the tenant."""
    if source == "csv":
        products = catalog.from_csv(payload)
    elif source == "url":
        products = catalog.from_url(payload)  # Should — not yet implemented
    else:
        raise ValueError("source must be 'csv' or 'url'")

    tid = ids.tenant_id()
    key = ids.embed_key()
    # raw catalog -> S3 (per-tenant prefix), before embeddings are attached
    objectstore.put_catalog(tid, products)
    for p in products:
        p["tenant_id"] = tid
        p["embedding"] = embeddings.embed_product(p)
    store.put_products(tid, products)

    tenant = {
        "tenant_id": tid,
        "business_name": business_name,
        "embed_key": key,
        "product_count": len(products),
        "domain_allowlist": domain_allowlist or [],
        "created_at": int(time.time()),
    }
    store.put_tenant(tenant)
    return {"tenant_id": tid, "embed_key": key, "product_count": len(products)}


# ---- tenants / snippet ---------------------------------------------------
def resolve_by_key(embed_key: str):
    return store.get_tenant_by_key(embed_key)


def snippet_for_tenant(tenant_id: str):
    t = store.get_tenant(tenant_id)
    if not t:
        return None
    return {
        "tenant_id": tenant_id,
        "embed_key": t["embed_key"],
        "snippet": f'<script src="{config.WIDGET_CDN}?key={t["embed_key"]}" defer></script>',
    }


# ---- retrieval (the search_products tool) --------------------------------
def search_products(tenant_id: str, query: str, k: int = None, filters: dict = None):
    """Discovery: embed the query, cosine-rank the tenant's catalog. Not the
    source of truth for live price/stock — that's confirmed per-product below."""
    k = k or config.TOP_K
    qvec = embeddings.embed(query)
    products = store.list_products(tenant_id)
    hits = vectors.top_k(qvec, products, k=k, filters=filters or {})
    return [_card(p) for p in hits]


def get_product(tenant_id: str, product_id: str):
    p = store.get_product(tenant_id, product_id)
    return _card(p) if p else None


def check_stock(tenant_id: str, product_id: str):
    """Truth: exact price + live stock from the structured record."""
    p = store.get_product(tenant_id, product_id)
    if not p:
        return {"product_id": product_id, "found": False}
    return {"product_id": product_id, "found": True, "price": p.get("price"),
            "stock": p.get("stock"), "in_stock": (p.get("stock") or 0) > 0}


# ---- cart ----------------------------------------------------------------
def get_cart(session_id: str):
    return store.get_cart(session_id)


def add_to_cart(session_id: str, tenant_id: str, product_id: str, qty: int = 1):
    cart = store.get_cart(session_id)
    cart["tenant_id"] = tenant_id
    items = cart.get("items", [])
    for it in items:
        if it["product_id"] == product_id:
            it["qty"] += qty
            break
    else:
        p = store.get_product(tenant_id, product_id) or {}
        items.append({"product_id": product_id, "name": p.get("name"),
                      "price": p.get("price"), "qty": qty})
    cart["items"] = items
    return store.save_cart(cart)


# ---- chat (retrieval-only for now) --------------------------------------
def chat_turn(key: str, session_id: str, message: str):
    tenant = resolve_by_key(key)
    if not tenant:
        return {"error": "invalid_key"}
    tid = tenant["tenant_id"]

    # Component 4: the real conversational agent (LLM tool use — Groq/Bedrock).
    if config.AGENT == "on":
        from src.agent import agent
        if agent.ready():
            try:
                return agent.run(tenant, session_id, message)
            except Exception:  # noqa: BLE001 — never break search if the LLM hiccups
                pass

    # Fallback (agent off): retrieve + a templated reply — no Bedrock chat cost.
    filters = _parse_filters(message)
    products = search_products(tid, message, k=config.TOP_K, filters=filters)
    reply = _templated_reply(products, tenant.get("business_name"))
    return {"reply": reply, "products": products, "suggestions": _suggestions(products)}


# ---- helpers -------------------------------------------------------------
def _card(p: dict):
    return {k: p.get(k) for k in
            ("product_id", "name", "description", "price", "stock", "category", "image_url", "product_url")}


def _parse_filters(message: str):
    q = message.lower()
    filters = {}
    m = re.search(r"(?:under|below)\s*[₹$]?\s*([\d,]+)\s*(k)?", q)
    if m:
        filters["max_price"] = int(m.group(1).replace(",", "")) * (1000 if m.group(2) else 1)
    for kw, val in (("3k", 3000), ("2k", 2000), ("5k", 5000)):
        if re.search(r"\b" + kw + r"\b", q):
            filters["max_price"] = val
    return filters


def _templated_reply(products, business_name):
    # Placeholder phrasing — replaced by the agent in Component 4.
    if not products:
        return "I couldn't find a match for that in the catalog. Try a different budget or use case?"
    if len(products) == 1:
        return f"Found one option that fits: {products[0]['name']}."
    names = ", ".join(p["name"] for p in products)
    return f"Here are {len(products)} options that fit: {names}."


def _suggestions(products):
    return ["Something cheaper", "For wide feet", "What's in my cart?"] if products \
        else ["Under ₹2,000", "For daily jogging", "Show everything"]
