"""ID + key generation."""
import secrets


def tenant_id() -> str:
    return "tnt_" + secrets.token_hex(4)


def embed_key() -> str:
    # Publishable key (like Stripe/Intercom pk_). Safe to ship in the widget.
    return "pk_live_" + secrets.token_hex(8)


def session_id() -> str:
    return "sid_" + secrets.token_hex(8)
