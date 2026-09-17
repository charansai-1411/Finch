"""End-to-end smoke test of the backend pipeline — no AWS, no server, no deps.

    cd backend && python scripts/smoke.py
"""
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")  # so the ₹ glyph prints on Windows
except Exception:
    pass

os.environ.setdefault("FINCH_BACKEND", "local")
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

# fresh store for a clean run
from src import config  # noqa: E402
store_path = os.path.join(config.LOCAL_DATA_DIR, "store.json")
if os.path.exists(store_path):
    os.remove(store_path)

from src import service  # noqa: E402

CSV_PATH = os.path.join(BACKEND, "..", "sample-data", "catalog.csv")
csv_text = open(CSV_PATH, encoding="utf-8").read()

print("1) INGEST")
res = service.ingest("Trailblaze Footwear", "csv", csv_text)
print("   ", res)
tid, key = res["tenant_id"], res["embed_key"]

print("\n2) SNIPPET")
print("   ", service.snippet_for_tenant(tid)["snippet"])

print("\n3) CHAT (retrieval + templated reply)")
for q in ["black running shoe under 3k for daily jogging",
          "something for wide feet",
          "a shoe for my kid"]:
    out = service.chat_turn(key, "sid_test", q)
    print(f"   Q: {q}")
    print(f"   A: {out['reply']}")
    for p in out["products"]:
        print(f"      - {p['name']}  ₹{p['price']}  (stock {p['stock']})")

print("\n4) CART")
first = service.chat_turn(key, "sid_test", "running shoe under 3k")["products"][0]
service.add_to_cart("sid_test", tid, first["product_id"])
service.add_to_cart("sid_test", tid, first["product_id"])
cart = service.get_cart("sid_test")
print("   ", cart["items"])

print("\n5) CHECK_STOCK (truth)")
print("   ", service.check_stock(tid, first["product_id"]))

print("\nOK — backend pipeline works end to end (local mode).")
