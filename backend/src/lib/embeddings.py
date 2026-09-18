"""Embeddings — one interface, two backends.

- local: a deterministic hashed bag-of-words vector. NOT semantic, but it makes
  the whole embed -> store -> cosine-search pipeline real and testable with no AWS.
- aws:  Bedrock Titan Text Embeddings v2 (real semantic vectors).

The service code calls embed()/embed_product() and never cares which is active.
"""
import hashlib
import math
import re

from src import config

_word = re.compile(r"[a-z0-9]+")


def _tokens(text: str):
    out = []
    for w in _word.findall((text or "").lower()):
        if len(w) <= 2:
            continue
        if len(w) > 3 and w.endswith("s"):
            w = w[:-1]  # crude plural stemming so "hoodies" matches "hoodie"
        out.append(w)
    return out


def _local_embed(text: str):
    dim = config.LOCAL_EMBED_DIM
    v = [0.0] * dim
    for tok in _tokens(text):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        v[h % dim] += 1.0
    norm = math.sqrt(sum(x * x for x in v))
    return [x / norm for x in v] if norm else v


def _bedrock_embed(text: str):
    import json
    import boto3
    client = boto3.client("bedrock-runtime", region_name=config.AWS_REGION)
    resp = client.invoke_model(
        modelId=config.EMBED_MODEL_ID,
        body=json.dumps({"inputText": text or ""}),
    )
    return json.loads(resp["body"].read())["embedding"]


def embed(text: str):
    return _bedrock_embed(text) if config.EMBED_PROVIDER == "bedrock" else _local_embed(text)


def embed_product(product: dict):
    parts = [product.get("name", ""), product.get("category", ""), product.get("description", "")]
    return embed(" ".join(p for p in parts if p))
