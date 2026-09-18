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

# Embedding provider, kept SEPARATE from BACKEND so you can run the real AWS
# stack (DynamoDB + S3) with a $0 local embedding — Bedrock stays off until you
# set FINCH_EMBED=bedrock.
EMBED_PROVIDER = os.environ.get("FINCH_EMBED", "local").lower()  # "local" | "bedrock"

AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")

# Bedrock. CHAT_MODEL_ID must be tool-capable in the region. Amazon Nova needs
# no Anthropic use-case form and invokes via a cross-region inference profile.
CHAT_MODEL_ID = os.environ.get("CHAT_MODEL_ID", "apac.amazon.nova-lite-v1:0")
EMBED_MODEL_ID = os.environ.get("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
# Bedrock can live in a different region from the rest of the stack if needed.
BEDROCK_REGION = os.environ.get("FINCH_BEDROCK_REGION", AWS_REGION)

# The conversational agent (Component 4). "on" routes /chat through the LLM
# tool-use loop; "off" (or no creds) falls back to retrieval + a templated reply.
AGENT = os.environ.get("FINCH_AGENT", "off").lower()  # off | on
AGENT_PROVIDER = os.environ.get("FINCH_AGENT_PROVIDER", "groq").lower()  # groq | bedrock

# Groq (OpenAI-compatible, fast, free tier — no account verification needed).
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

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
WIDGET_CDN = os.environ.get("WIDGET_CDN", "https://finch-widget-938358604976.s3.ap-south-1.amazonaws.com/v.js")

# Retrieval
TOP_K = int(os.environ.get("TOP_K", "3"))

# Cart TTL (seconds) — 7 days
CART_TTL_SECONDS = int(os.environ.get("CART_TTL_SECONDS", str(7 * 24 * 3600)))
