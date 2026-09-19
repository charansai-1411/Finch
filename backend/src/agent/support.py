"""Support agent — grounded question answering over a tenant's documents.

Given a customer question and the passages retrieved from the tenant's uploaded
docs, produce an answer that uses ONLY those passages and cites its sources.

Unlike the shopping agent (a tool-use loop), the support flow is a single
grounded completion: retrieval happens in the service layer, this module only
turns {question + context passages} into a written answer.

Providers mirror the shopping agent (FINCH_AGENT_PROVIDER):
  - "groq"    : Groq's OpenAI-compatible chat API (fast, free tier, just a key).
  - "bedrock" : Amazon Bedrock Converse.
When no provider is configured, service.py falls back to an extractive answer,
so the support agent still works with zero credentials.
"""
from src import config

SYSTEM = (
    "You are {name}'s friendly customer-support assistant. Answer the customer's "
    "question using ONLY the numbered context passages provided — they come from "
    "{name}'s own help material. If the answer isn't in the context, say you don't "
    "have that information and suggest contacting the team, rather than guessing. "
    "Never invent policies, prices, dates, or facts. Be concise (2-5 sentences), "
    "warm, and specific. When you use a passage, cite it inline like [1] or [2]."
)


def ready() -> bool:
    if config.AGENT_PROVIDER == "groq":
        return bool(config.GROQ_API_KEY)
    return True  # bedrock relies on IAM/account access


def _context_block(contexts: list[dict]) -> str:
    lines = []
    for i, c in enumerate(contexts, 1):
        src = c.get("doc_name", "document")
        lines.append(f"[{i}] (from: {src})\n{c.get('text', '').strip()}")
    return "\n\n".join(lines)


def answer(question: str, contexts: list[dict], business_name: str = "the store") -> str:
    """Return a grounded answer string, or raise on provider failure."""
    if config.AGENT_PROVIDER == "bedrock":
        return _answer_bedrock(question, contexts, business_name)
    return _answer_groq(question, contexts, business_name)


def _answer_groq(question, contexts, business_name):
    import requests
    system = SYSTEM.format(name=business_name or "the store")
    user = (
        "Context passages:\n" + _context_block(contexts) +
        "\n\nCustomer question: " + question +
        "\n\nAnswer using only the passages above, and cite them inline like [1]."
    )
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": "Bearer " + config.GROQ_API_KEY, "Content-Type": "application/json"},
        json={"model": config.GROQ_MODEL,
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": user}],
              "temperature": 0.2, "max_tokens": 500},
        timeout=25,
    )
    data = resp.json()
    if data.get("error"):
        raise RuntimeError(str(data["error"]))
    return (data["choices"][0]["message"].get("content") or "").strip()


def _answer_bedrock(question, contexts, business_name):
    import boto3
    system = SYSTEM.format(name=business_name or "the store")
    user = (
        "Context passages:\n" + _context_block(contexts) +
        "\n\nCustomer question: " + question +
        "\n\nAnswer using only the passages above, and cite them inline like [1]."
    )
    client = boto3.client("bedrock-runtime", region_name=config.BEDROCK_REGION)
    resp = client.converse(
        modelId=config.CHAT_MODEL_ID, system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": user}]}],
        inferenceConfig={"maxTokens": 500, "temperature": 0.2},
    )
    out = resp["output"]["message"]
    return "".join(b.get("text", "") for b in out["content"]).strip()
