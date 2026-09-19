"""Lambda handlers for the Support agent (doc-grounded Q&A).

  POST /support/ingest  {business_name, docs:[{name,text}|{name,source:'url',payload}]}
  POST /support/chat    {key, session_id, message}

Same service layer as the local server, so both stay in lock-step.
"""
from src import service
from src.handlers._util import body, ok, err


def ingest_handler(event, context=None):
    b = body(event)
    docs_in = b.get("docs")
    if not docs_in:
        if b.get("payload") and b.get("source") == "url":
            docs_in = [{"name": b.get("name", b["payload"]), "source": "url", "payload": b["payload"]}]
        elif b.get("text"):
            docs_in = [{"name": b.get("name", "document"), "text": b["text"]}]
    if not docs_in:
        return err("provide docs: [{name, text}] or a url", 400)
    try:
        return ok(service.ingest_docs(
            business_name=b.get("business_name", "My store"),
            docs_in=docs_in,
            domain_allowlist=b.get("domain_allowlist"),
        ))
    except Exception as e:  # noqa: BLE001
        return err(str(e), 400)


def chat_handler(event, context=None):
    b = body(event)
    if not b.get("key") or not b.get("session_id"):
        return err("key and session_id required", 400)
    result = service.answer_question(b["key"], b["session_id"], b.get("message", ""))
    if result.get("error"):
        return err(result["error"], 403)
    return ok(result)
