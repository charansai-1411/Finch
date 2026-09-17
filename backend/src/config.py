"""Central config.

FINCH_BACKEND switches the whole stack between:
  - "local" (default): JSON-file store + a deterministic local embedding.
    Runs with zero AWS, so the backend is testable while credits are pending.
  - "aws": DynamoDB + Bedrock Titan embeddings.
The service/handler code is identical for both — only lib/store.py and
lib/embeddings.py branch on this flag.
"""
import os

BACKEND = os.environ.get("FINCH_BACKEND", "local").lower()  # "local" | "aws"

AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")

# Bedrock (aws backend only) — confirm access in-region before the hackathon.
CHAT_MODEL_ID = os.environ.get("CHAT_MODEL_ID", "anthropic.claude-3-5-haiku-20241022-v1:0")
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")

# DynamoDB tables (aws backend)
TENANTS_TABLE = os.environ.get("TENANTS_TABLE", "finch-tenants")
PRODUCTS_TABLE = os.environ.get("PRODUCTS_TABLE", "finch-products")
CARTS_TABLE = os.environ.get("CARTS_TABLE", "finch-carts")
CATALOG_BUCKET = os.environ.get("CATALOG_BUCKET", "finch-catalogs")

# Local backend
LOCAL_DATA_DIR = os.environ.get(
    "FINCH_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"),
)
LOCAL_EMBED_DIM = 256

# Widget
WIDGET_CDN = os.environ.get("WIDGET_CDN", "https://cdn.finch.app/v.js")

# Retrieval
TOP_K = int(os.environ.get("TOP_K", "3"))

# Cart TTL (seconds) — 7 days
CART_TTL_SECONDS = int(os.environ.get("CART_TTL_SECONDS", str(7 * 24 * 3600)))
