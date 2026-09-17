"""Shared helpers for API Gateway (HTTP API, payload v2) Lambda handlers."""
import json

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}


def body(event) -> dict:
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return {}


def path_param(event, name):
    return (event.get("pathParameters") or {}).get(name)


def ok(data, status=200):
    return {"statusCode": status, "headers": _CORS, "body": json.dumps(data)}


def err(message, status=400):
    return {"statusCode": status, "headers": _CORS, "body": json.dumps({"error": message})}
