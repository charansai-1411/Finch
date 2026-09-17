"""Lambda: GET /cart/{session_id}  and  POST /cart/{session_id}/add
(add is a backend cart op, not the agent — the widget/agent can call it)."""
from src import service
from src.handlers._util import body, path_param, ok, err


def get_handler(event, context=None):
    return ok(service.get_cart(path_param(event, "session_id")))


def add_handler(event, context=None):
    session_id = path_param(event, "session_id")
    b = body(event)
    tenant = service.resolve_by_key(b.get("key", ""))
    if not tenant:
        return err("invalid_key", 403)
    if not b.get("product_id"):
        return err("product_id required", 400)
    cart = service.add_to_cart(session_id, tenant["tenant_id"], b["product_id"], int(b.get("qty", 1)))
    return ok(cart)
