"""In-Lambda vector search — brute-force cosine over a tenant's product
embeddings. No OpenSearch, no idle cost; fine for SMB-scale catalogs."""
import math


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def top_k(query_vec: list[float], products: list[dict], k: int = 5,
          filters: dict | None = None) -> list[dict]:
    """Rank products by cosine similarity to the query, optionally filtered.

    filters may include: max_price, min_price, category.
    Returns products with an added `_score`, best first.
    """
    filters = filters or {}
    scored = []
    for p in products:
        if not _passes(p, filters):
            continue
        emb = p.get("embedding")
        if not emb:
            continue
        scored.append({**p, "_score": cosine(query_vec, emb)})
    scored.sort(key=lambda p: p["_score"], reverse=True)
    return scored[:k]


def _passes(p: dict, f: dict) -> bool:
    price = p.get("price")
    if f.get("max_price") is not None and price is not None and price > f["max_price"]:
        return False
    if f.get("min_price") is not None and price is not None and price < f["min_price"]:
        return False
    if f.get("category") and str(p.get("category", "")).lower() != str(f["category"]).lower():
        return False
    return True
