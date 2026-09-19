"""Local JSON-file store — stands in for DynamoDB while AWS is pending.

One file at LOCAL_DATA_DIR/store.json holding tenants, products, and carts.
Same function signatures as dynamo.py so store.py can swap them transparently.
Not concurrency-safe — it's a dev backend, not production.
"""
import json
import os
import threading
import time

from src import config

_lock = threading.Lock()
_PATH = os.path.join(config.LOCAL_DATA_DIR, "store.json")


def _load():
    try:
        with open(_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"tenants": {}, "products": {}, "carts": {}, "documents": {}}


def _save(db):
    os.makedirs(config.LOCAL_DATA_DIR, exist_ok=True)
    tmp = _PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f)
    os.replace(tmp, _PATH)


# ---- Tenants -------------------------------------------------------------
def put_tenant(tenant: dict):
    with _lock:
        db = _load()
        db["tenants"][tenant["tenant_id"]] = tenant
        _save(db)


def get_tenant(tenant_id: str):
    return _load()["tenants"].get(tenant_id)


def get_tenant_by_key(embed_key: str):
    for t in _load()["tenants"].values():
        if t.get("embed_key") == embed_key:
            return t
    return None


# ---- Products ------------------------------------------------------------
def put_products(tenant_id: str, products: list):
    with _lock:
        db = _load()
        db["products"][tenant_id] = {p["product_id"]: p for p in products}
        _save(db)


def list_products(tenant_id: str):
    return list(_load()["products"].get(tenant_id, {}).values())


def get_product(tenant_id: str, product_id: str):
    return _load()["products"].get(tenant_id, {}).get(product_id)


# ---- Documents (Support agent) ------------------------------------------
def put_documents(tenant_id: str, chunks: list):
    with _lock:
        db = _load()
        db.setdefault("documents", {})[tenant_id] = chunks
        _save(db)


def list_documents(tenant_id: str):
    return list(_load().get("documents", {}).get(tenant_id, []))


# ---- Carts ---------------------------------------------------------------
def get_cart(session_id: str):
    return _load()["carts"].get(session_id, {"session_id": session_id, "items": []})


def save_cart(cart: dict):
    with _lock:
        db = _load()
        cart["updated_at"] = int(time.time())
        db["carts"][cart["session_id"]] = cart
        _save(db)
    return cart
