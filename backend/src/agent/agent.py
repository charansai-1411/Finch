"""The Finch agent — one honest in-store salesperson, grounded strictly in
the tenant's catalog.

Primary path: Strands Agents SDK on Bedrock.
Fallback (USE_STRANDS=false): a plain Bedrock Converse tool-use loop, so a
fussy SDK never blocks the demo.
"""
from src import config
from src.agent import tools

SYSTEM_PROMPT = """You are Finch, a helpful, honest in-store salesperson for THIS store only.
- Understand vague needs; ask at most ONE clarifying question.
- Recommend 1–3 products, each with a one-line reason.
- You may ONLY discuss products returned by your tools. Never invent products, prices, or stock.
- Always confirm exact price and stock with check_stock/get_product before stating them.
- Be honest when nothing fits.
"""


def _bind(tenant_id: str, session_id: str):
    """Bind tenant_id/session_id so the model calls tools with just the args
    it should reason about (query, product_id, qty)."""
    return {
        "search_products": lambda query, max_price=None, min_price=None, category=None:
            tools.search_products(tenant_id, query, max_price, min_price, category),
        "get_product": lambda product_id: tools.get_product(tenant_id, product_id),
        "check_stock": lambda product_id: tools.check_stock(tenant_id, product_id),
        "add_to_cart": lambda product_id, qty=1:
            tools.add_to_cart(session_id, tenant_id, product_id, qty),
        "get_cart": lambda: tools.get_cart(session_id),
    }


def run_turn(tenant_id: str, session_id: str, message: str):
    """Run one agent turn. Returns {reply, products, cart}.

    TODO: wire streaming (yield tokens) once the non-streaming path works —
    see PRD §13. Streaming is what makes 4–8s feel like thinking, not broken.
    """
    bound = _bind(tenant_id, session_id)
    if config.USE_STRANDS:
        return _run_strands(message, bound)
    return _run_converse(message, bound)


def _run_strands(message: str, bound: dict):
    """Primary path — Strands Agents SDK.

    TODO: from strands import Agent; from strands.models import BedrockModel
          agent = Agent(model=BedrockModel(config.CHAT_MODEL_ID),
                        system_prompt=SYSTEM_PROMPT, tools=[...bound...])
          result = agent(message)
    """
    raise NotImplementedError("Wire Strands Agent here (Thu). Fallback: set USE_STRANDS=false")


def _run_converse(message: str, bound: dict):
    """Fallback path — plain Bedrock Converse tool-use loop (boto3 only).

    TODO: build toolConfig from `bound`, loop bedrock.converse() until the model
    stops requesting tools, collect product cards from tool results.
    """
    raise NotImplementedError("Wire Bedrock Converse tool-use loop here")
