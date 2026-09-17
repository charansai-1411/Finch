"""Lambda: GET /snippet/{tenant_id}"""
from src import service
from src.handlers._util import path_param, ok, err


def handler(event, context=None):
    tenant_id = path_param(event, "tenant_id")
    result = service.snippet_for_tenant(tenant_id)
    if not result:
        return err("tenant not found", 404)
    return ok(result)
