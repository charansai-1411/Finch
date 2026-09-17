"""Agent tools — thin, tenant/session-bound wrappers over the service layer.

These are the functions the Strands agent (Component 4) will be given. They do
no LLM work themselves; they're the data operations the agent orchestrates.
Kept in sync with service.py so the agent and the REST API share one code path.
"""
from src import service


def make_tools(tenant_id: str, session_id: str):
    """Return the tool callables bound to one tenant + shopper session, so the
    model only reasons about query/product_id/qty — never tenant plumbing."""
    return {
        "search_products": lambda query, max_price=None, min_price=None, category=None:
            service.search_products(tenant_id, query, filters={
                "max_price": max_price, "min_price": min_price, "category": category}),
        "get_product": lambda product_id: service.get_product(tenant_id, product_id),
        "check_stock": lambda product_id: service.check_stock(tenant_id, product_id),
        "add_to_cart": lambda product_id, qty=1:
            service.add_to_cart(session_id, tenant_id, product_id, qty),
        "get_cart": lambda: service.get_cart(session_id),
    }
