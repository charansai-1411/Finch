"""Storage facade — picks the backend from FINCH_BACKEND and re-exports it.

Everything above this line (service, handlers) imports from `store` only, so
switching local <-> aws is a one-env-var change with no code edits.
"""
from src import config

if config.BACKEND == "aws":
    from src.lib import dynamo as _b
else:
    from src.lib import local_store as _b

put_tenant = _b.put_tenant
get_tenant = _b.get_tenant
get_tenant_by_key = _b.get_tenant_by_key
put_products = _b.put_products
list_products = _b.list_products
get_product = _b.get_product
put_documents = _b.put_documents
list_documents = _b.list_documents
get_cart = _b.get_cart
save_cart = _b.save_cart
