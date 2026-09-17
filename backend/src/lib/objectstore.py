"""Raw catalog object storage (PRD FR3).

Stores the normalized catalog as JSONL under a per-tenant prefix — the audit
copy / re-index source, separate from the structured DynamoDB records.
- aws:   s3://{CATALOG_BUCKET}/{tenant_id}/catalog.jsonl
- local: {LOCAL_DATA_DIR}/catalogs/{tenant_id}.jsonl
Embeddings are stripped — this is the raw source, not the index.
"""
import json
import os

from src import config


def put_catalog(tenant_id: str, products: list):
    body = "\n".join(
        json.dumps({k: v for k, v in p.items() if k != "embedding"})
        for p in products
    )
    if config.BACKEND == "aws":
        import boto3
        s3 = boto3.client("s3", region_name=config.AWS_REGION)
        s3.put_object(
            Bucket=config.CATALOG_BUCKET,
            Key=f"{tenant_id}/catalog.jsonl",
            Body=body.encode("utf-8"),
            ContentType="application/x-ndjson",
        )
        return f"s3://{config.CATALOG_BUCKET}/{tenant_id}/catalog.jsonl"

    d = os.path.join(config.LOCAL_DATA_DIR, "catalogs")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f"{tenant_id}.jsonl")
    with open(path, "w", encoding="utf-8") as f:
        f.write(body)
    return path
