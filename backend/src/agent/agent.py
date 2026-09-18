"""The Finch agent — Component 4.

Real conversational AI over the store's catalog via an LLM tool-use loop. The
model reasons by CALLING the tools in agent/tools.py (search_products,
check_stock, add_to_cart, ...) — it only ever sees tool results, never the raw
catalog, so it stays grounded.

Two interchangeable providers (FINCH_AGENT_PROVIDER):
  - "groq"    : Groq's OpenAI-compatible API (fast, free tier, just an API key).
  - "bedrock" : Amazon Bedrock Converse (needs Bedrock account access).
boto3/requests only — no heavy SDKs, runs in Lambda.
"""
import json

from src import config
from src.agent import tools as tool_defs

DEFAULT_SYSTEM = (
    "You are Finch, a friendly and honest in-store salesperson for this store. "
    "Understand what the shopper needs — even vague requests — and ask at most one "
    "clarifying question. Use search_products to find items and confirm price/stock "
    "with check_stock before you state them. Recommend 1-3 products with a one-line "
    "reason each, and ONLY products returned by the tools — never invent products, "
    "prices, or stock. When the shopper wants to buy, call add_to_cart. Be warm and concise."
)

# Provider-neutral tool metadata (converted to each provider's schema below).
TOOLS_META = [
    {"name": "search_products", "desc": "Search the store's catalog for products matching a shopper's need.",
     "props": {"query": {"type": "string", "description": "what the shopper is looking for"},
               "max_price": {"type": "number", "description": "maximum price"},
               "min_price": {"type": "number"}, "category": {"type": "string"}}, "required": ["query"]},
    {"name": "get_product", "desc": "Full details for one product by id.",
     "props": {"product_id": {"type": "string"}}, "required": ["product_id"]},
    {"name": "check_stock", "desc": "Live price and stock for one product (source of truth).",
     "props": {"product_id": {"type": "string"}}, "required": ["product_id"]},
    {"name": "add_to_cart", "desc": "Add a product to the shopper's cart.",
     "props": {"product_id": {"type": "string"}, "qty": {"type": "integer"}}, "required": ["product_id"]},
    {"name": "get_cart", "desc": "The shopper's current cart.", "props": {}, "required": []},
]

MAX_TURNS = 6


def ready() -> bool:
    """True when the selected provider has what it needs to run."""
    if config.AGENT_PROVIDER == "groq":
        return bool(config.GROQ_API_KEY)
    return True  # bedrock relies on IAM/account access; let it try


def run(tenant, session_id, message, system_prompt=None):
    if config.AGENT_PROVIDER == "groq":
        return _run_groq(tenant, session_id, message, system_prompt)
    return _run_bedrock(tenant, session_id, message, system_prompt)


def _suggest(products):
    return (["Something cheaper", "A warmer option", "What's in my cart?"]
            if products else ["Show me everything", "What's new?"])


def _tool_result_json(result):
    return result if isinstance(result, (dict, list)) else {"result": result}


# ------------------------- Groq (OpenAI-compatible) -------------------------
def _run_groq(tenant, session_id, message, system_prompt=None):
    import requests
    bound = tool_defs.make_tools(tenant["tenant_id"], session_id)
    tools = [{"type": "function", "function": {
        "name": m["name"], "description": m["desc"],
        "parameters": {"type": "object", "properties": m["props"], "required": m["required"]},
    }} for m in TOOLS_META]

    messages = [{"role": "system", "content": system_prompt or DEFAULT_SYSTEM},
                {"role": "user", "content": message}]
    shown = []

    for _ in range(MAX_TURNS):
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": "Bearer " + config.GROQ_API_KEY, "Content-Type": "application/json"},
            json={"model": config.GROQ_MODEL, "messages": messages, "tools": tools,
                  "tool_choice": "auto", "temperature": 0.3, "max_tokens": 700},
            timeout=25,
        )
        data = resp.json()
        if data.get("error"):
            raise RuntimeError(str(data["error"]))
        msg = data["choices"][0]["message"]
        messages.append(msg)

        calls = msg.get("tool_calls")
        if not calls:
            return {"reply": (msg.get("content") or "").strip(), "products": shown, "suggestions": _suggest(shown)}

        for tc in calls:
            fn = tc["function"]["name"]
            try:
                args = json.loads(tc["function"].get("arguments") or "{}")
            except (ValueError, TypeError):
                args = {}
            try:
                result = bound[fn](**args)
            except Exception as e:  # noqa: BLE001
                result = {"error": str(e)}
            if fn == "search_products" and isinstance(result, list):
                shown = result
            messages.append({"role": "tool", "tool_call_id": tc["id"],
                             "content": json.dumps(_tool_result_json(result))})

    return {"reply": "Sorry, I lost the thread there — could you rephrase?", "products": shown, "suggestions": []}


# ------------------------------- Bedrock -----------------------------------
def _run_bedrock(tenant, session_id, message, system_prompt=None):
    import boto3
    bound = tool_defs.make_tools(tenant["tenant_id"], session_id)
    tools = [{"toolSpec": {"name": m["name"], "description": m["desc"],
              "inputSchema": {"json": {"type": "object", "properties": m["props"], "required": m["required"]}}}}
             for m in TOOLS_META]
    client = boto3.client("bedrock-runtime", region_name=config.BEDROCK_REGION)
    messages = [{"role": "user", "content": [{"text": message}]}]
    shown = []

    for _ in range(MAX_TURNS):
        resp = client.converse(
            modelId=config.CHAT_MODEL_ID, system=[{"text": system_prompt or DEFAULT_SYSTEM}],
            messages=messages, toolConfig={"tools": tools},
            inferenceConfig={"maxTokens": 700, "temperature": 0.3},
        )
        out = resp["output"]["message"]
        messages.append(out)
        if resp.get("stopReason") != "tool_use":
            reply = "".join(b["text"] for b in out["content"] if "text" in b).strip()
            return {"reply": reply, "products": shown, "suggestions": _suggest(shown)}
        res = []
        for block in out["content"]:
            tu = block.get("toolUse")
            if not tu:
                continue
            try:
                result = bound[tu["name"]](**(tu.get("input") or {}))
            except Exception as e:  # noqa: BLE001
                result = {"error": str(e)}
            if tu["name"] == "search_products" and isinstance(result, list):
                shown = result
            res.append({"toolResult": {"toolUseId": tu["toolUseId"], "content": [{"json": _tool_result_json(result)}]}})
        messages.append({"role": "user", "content": res})

    return {"reply": "Sorry, I lost the thread there — could you rephrase?", "products": shown, "suggestions": []}
