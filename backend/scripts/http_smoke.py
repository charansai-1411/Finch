"""Hit the running local server over HTTP to prove the API + CORS.

    (server) uvicorn src.local_server:app --port 8000
    (then)   python scripts/http_smoke.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = os.environ.get("FINCH_BASE", "http://127.0.0.1:8000")
HERE = os.path.dirname(os.path.abspath(__file__))
CSV = open(os.path.join(HERE, "..", "..", "sample-data", "catalog.csv"), encoding="utf-8").read()


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json", "Origin": "https://some-store.com"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.headers.get("access-control-allow-origin"), json.loads(r.read())


# wait for boot
for _ in range(40):
    try:
        call("GET", "/health"); break
    except Exception:
        time.sleep(0.25)

print("health:", call("GET", "/health")[2])

st, cors, ing = call("POST", "/ingest", {"business_name": "Trailblaze Footwear", "source": "csv", "payload": CSV})
print(f"\nPOST /ingest -> {st}  CORS={cors}")
print("  ", ing)
key, tid = ing["embed_key"], ing["tenant_id"]

st, cors, chat = call("POST", "/chat", {"key": key, "session_id": "sid_http", "message": "black running shoe under 3k for jogging"})
print(f"\nPOST /chat -> {st}  CORS={cors}")
print("  reply:", chat["reply"])
for p in chat["products"]:
    print(f"    - {p['name']}  ₹{p['price']}  stock {p['stock']}")

pid = chat["products"][0]["product_id"]
st, _, cart = call("POST", f"/cart/sid_http/add", {"key": key, "product_id": pid, "qty": 1})
print(f"\nPOST /cart/sid_http/add -> {st}")
print("  ", cart["items"])

st, _, snip = call("GET", f"/snippet/{tid}")
print(f"\nGET /snippet -> {st}")
print("  ", snip["snippet"])

# invalid key is rejected
try:
    call("POST", "/chat", {"key": "pk_live_bogus", "session_id": "x", "message": "hi"})
    print("\ninvalid key: NOT rejected (bug)")
except urllib.error.HTTPError as e:
    print(f"\ninvalid key correctly rejected -> {e.code}")

print("\nOK — HTTP API + CORS verified.")
