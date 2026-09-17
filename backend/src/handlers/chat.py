"""Lambda: POST /chat  {key, session_id, message}"""
from src import service
from src.handlers._util import body, ok, err


def handler(event, context=None):
    b = body(event)
    key = b.get("key")
    message = b.get("message", "")
    session_id = b.get("session_id")
    if not key or not session_id:
        return err("key and session_id are required", 400)
    result = service.chat_turn(key, session_id, message)
    if result.get("error"):
        return err(result["error"], 403)
    return ok(result)
