"""Catalog ingestion — CSV (must-have) and store-URL crawl (Should).

Both produce the same normalized product dict:
    {id, name, description, price, image_url, product_url, category, stock}
"""
import csv
import io

EXPECTED_COLUMNS = [
    "id", "name", "description", "price",
    "image_url", "product_url", "category", "stock",
]


def from_csv(csv_text: str) -> list[dict]:
    """Parse a product CSV into normalized product dicts."""
    reader = csv.DictReader(io.StringIO(csv_text))
    out = []
    for row in reader:
        out.append(_normalize(row))
    return out


def from_url(store_url: str, limit: int = 250) -> list[dict]:
    """Derive products from a store URL, in order of reliability:

    1. Shopify — {base}/products.json (clean structured feed).
    2. schema.org Product JSON-LD embedded on the homepage/collection page.

    Raises a clear error for JS-rendered SPAs (e.g. Lovable) that expose no
    feed and no JSON-LD — those should upload a CSV instead.
    """
    import requests
    base = store_url.strip()
    if not base.startswith("http"):
        base = "https://" + base
    base = base.rstrip("/")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; FinchBot/1.0)"}

    # 1) Shopify products.json
    try:
        r = requests.get(base + "/products.json?limit=" + str(limit), headers=headers, timeout=12)
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "json" in ct:
            products = (r.json() or {}).get("products", [])
            if products:
                return [_from_shopify(p, base) for p in products][:limit]
    except Exception:
        pass

    # 2) schema.org JSON-LD
    jsonld = _from_jsonld(base, headers)
    if jsonld:
        return jsonld[:limit]

    raise ValueError(
        "Couldn't read products from that URL. It looks like a JavaScript app "
        "with no product feed or structured data — upload a CSV for this store, "
        "or point Finch at a Shopify store."
    )


def _strip_html(html: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", html or "").strip()


def _from_shopify(p: dict, base: str) -> dict:
    variants = p.get("variants") or [{}]
    v = variants[0]
    images = p.get("images") or []
    available = any(vv.get("available") for vv in variants)
    return {
        "product_id": str(p.get("id", "")),
        "name": p.get("title", ""),
        "description": _strip_html(p.get("body_html", ""))[:400],
        "price": _num(v.get("price"), 0.0),
        "image_url": images[0].get("src", "") if images else "",
        "product_url": base + "/products/" + (p.get("handle") or ""),
        "category": p.get("product_type", "") or "",
        "stock": 50 if available else 0,  # products.json omits exact counts
    }


def _from_jsonld(base: str, headers: dict) -> list[dict]:
    import json
    import requests
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    out = []
    try:
        r = requests.get(base, headers=headers, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "{}")
            except (ValueError, TypeError):
                continue
            for node in _iter_products(data):
                card = _from_ld(node, base)
                if card["name"]:
                    out.append(card)
    except Exception:
        return []
    seen, uniq = set(), []
    for p in out:
        if p["name"] not in seen:
            seen.add(p["name"])
            uniq.append(p)
    return uniq


def _iter_products(data):
    """Yield Product nodes from any JSON-LD shape (dict, list, @graph, ItemList)."""
    if isinstance(data, list):
        for d in data:
            yield from _iter_products(d)
        return
    if not isinstance(data, dict):
        return
    if "@graph" in data:
        yield from _iter_products(data["@graph"])
    t = data.get("@type", "")
    types = t if isinstance(t, list) else [t]
    if "Product" in types:
        yield data
    if "ItemList" in types:
        for el in data.get("itemListElement", []):
            item = el.get("item", el) if isinstance(el, dict) else el
            yield from _iter_products(item)


def _from_ld(node: dict, base: str) -> dict:
    from urllib.parse import urljoin
    offers = node.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    image = node.get("image", "")
    if isinstance(image, list):
        image = image[0] if image else ""
    if isinstance(image, dict):
        image = image.get("url", "")
    url = node.get("url") or node.get("@id") or ""
    return {
        "product_id": str(node.get("sku") or node.get("productID") or node.get("name", ""))[:64],
        "name": str(node.get("name", "")).strip(),
        "description": _strip_html(str(node.get("description", "")))[:400],
        "price": _num(offers.get("price"), 0.0),
        "image_url": urljoin(base, image) if isinstance(image, str) else "",
        "product_url": urljoin(base, url) if isinstance(url, str) else "",
        "category": str(node.get("category", "")) if node.get("category") else "",
        "stock": 50 if str(offers.get("availability", "")).endswith("InStock") else 0,
    }


def _num(v, default=0.0):
    try:
        return float(str(v).replace(",", "").strip())
    except (ValueError, TypeError, AttributeError):
        return default


def _normalize(row: dict) -> dict:
    def num(v, cast, default=0):
        try:
            return cast(str(v).strip())
        except (ValueError, TypeError):
            return default

    return {
        "product_id": str(row.get("id", "")).strip(),
        "name": str(row.get("name", "")).strip(),
        "description": str(row.get("description", "")).strip(),
        "price": num(row.get("price"), float, 0.0),
        "image_url": str(row.get("image_url", "")).strip(),
        "product_url": str(row.get("product_url", "")).strip(),
        "category": str(row.get("category", "")).strip(),
        "stock": num(row.get("stock"), int, 0),
    }
