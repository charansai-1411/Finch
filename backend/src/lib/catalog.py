"""Catalog ingestion — CSV (must-have) and store-URL crawl (Should).

Both produce the same normalized product dict:
    {id, name, description, price, image_url, product_url, category, stock}
"""
import csv
import io

EXPECTED_COLUMNS = [
    "id", "name", "description", "price",
    "image_url", "product_url", "category", "stock",
]


def from_csv(csv_text: str) -> list[dict]:
    """Parse a product CSV into normalized product dicts."""
    reader = csv.DictReader(io.StringIO(csv_text))
    out = []
    for row in reader:
        out.append(_normalize(row))
    return out


def from_url(store_url: str) -> list[dict]:
    """Derive products from sitemap.xml / schema.org Product JSON-LD.

    TODO (Should): fetch {store_url}/sitemap.xml, follow product URLs,
    parse <script type="application/ld+json"> Product entries.
    Demo the reliable CSV path first.
    """
    raise NotImplementedError("URL crawl is a Should — implement after CSV works")


def _normalize(row: dict) -> dict:
    def num(v, cast, default=0):
        try:
            return cast(str(v).strip())
        except (ValueError, TypeError):
            return default

    return {
        "product_id": str(row.get("id", "")).strip(),
        "name": str(row.get("name", "")).strip(),
        "description": str(row.get("description", "")).strip(),
        "price": num(row.get("price"), float, 0.0),
        "image_url": str(row.get("image_url", "")).strip(),
        "product_url": str(row.get("product_url", "")).strip(),
        "category": str(row.get("category", "")).strip(),
        "stock": num(row.get("stock"), int, 0),
    }
