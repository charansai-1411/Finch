"""Lambda: POST /ingest  {business_name, source: "csv"|"url", payload}"""
import json

from src import service
from src.handlers._util import body, ok, err


def handler(event, context=None):
    b = body(event)
    try:
        result = service.ingest(
            business_name=b.get("business_name", "My store"),
            source=b.get("source", "csv"),
            payload=b.get("payload", ""),
            domain_allowlist=b.get("domain_allowlist"),
        )
        return ok(result)
    except Exception as e:  # noqa: BLE001
        return err(str(e), 400)
