"""DynamoDB backend (FINCH_BACKEND=aws).

Same interface as local_store.py. Products carry their embedding on the item,
so discovery (vector search) and truth (price/stock) come from one table.
Resolving an embed_key needs a GSI `embed_key-index` (see infra/template.yaml).
Not exercised in local dev; wired for when AWS credits land.
"""
import time
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

from src import config

_ddb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
_tenants = _ddb.Table(config.TENANTS_TABLE)
_products = _ddb.Table(config.PRODUCTS_TABLE)
_carts = _ddb.Table(config.CARTS_TABLE)
_documents = _ddb.Table(config.DOCS_TABLE)


# ---- Tenants -------------------------------------------------------------
def put_tenant(tenant: dict):
    _tenants.put_item(Item=_enc(tenant))


def get_tenant(tenant_id: str):
    return _dec(_tenants.get_item(Key={"tenant_id": tenant_id}).get("Item"))


def get_tenant_by_key(embed_key: str):
    resp = _tenants.query(
        IndexName="embed_key-index",
        KeyConditionExpression=Key("embed_key").eq(embed_key),
        Limit=1,
    )
    items = resp.get("Items", [])
    return _dec(items[0]) if items else None


# ---- Products ------------------------------------------------------------
def put_products(tenant_id: str, products: list):
    with _products.batch_writer() as batch:
        for p in products:
            batch.put_item(Item=_enc(p))


def list_products(tenant_id: str):
    resp = _products.query(KeyConditionExpression=Key("tenant_id").eq(tenant_id))
    return [_dec(i) for i in resp.get("Items", [])]


def get_product(tenant_id: str, product_id: str):
    return _dec(_products.get_item(Key={"tenant_id": tenant_id, "product_id": product_id}).get("Item"))


# ---- Documents (Support agent) ------------------------------------------
def put_documents(tenant_id: str, chunks: list):
    with _documents.batch_writer() as batch:
        for c in chunks:
            batch.put_item(Item=_enc({**c, "tenant_id": tenant_id}))


def list_documents(tenant_id: str):
    resp = _documents.query(KeyConditionExpression=Key("tenant_id").eq(tenant_id))
    return [_dec(i) for i in resp.get("Items", [])]


# ---- Carts ---------------------------------------------------------------
def get_cart(session_id: str):
    item = _carts.get_item(Key={"session_id": session_id}).get("Item")
    return _dec(item) if item else {"session_id": session_id, "items": []}


def save_cart(cart: dict):
    now = int(time.time())
    cart["updated_at"] = now
    cart["ttl"] = now + config.CART_TTL_SECONDS
    _carts.put_item(Item=_enc(cart))
    return cart


# ---- Decimal <-> float ---------------------------------------------------
def _enc(o):
    if isinstance(o, float):
        return Decimal(str(o))
    if isinstance(o, list):
        return [_enc(v) for v in o]
    if isinstance(o, dict):
        return {k: _enc(v) for k, v in o.items()}
    return o


def _dec(o):
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, list):
        return [_dec(v) for v in o]
    if isinstance(o, dict):
        return {k: _dec(v) for k, v in o.items()}
    return o
