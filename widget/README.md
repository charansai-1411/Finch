# Finch — Embeddable Widget

The whole install is one line:

```html
<script src="https://cdn.finch.app/v.js?key=STORE_KEY" defer></script>
```

`v.js` injects a shadow-DOM chat bubble + panel onto any page — no build step, no framework, no CSS collisions with the host site.

## What it does
- Reads `STORE_KEY` from its own `<script src>` and scopes the session to that store.
- Mints a `session_id` in `localStorage` so the cart persists across page loads.
- Floating bubble → chat panel (opens origin-aware from the bubble, Apple-style).
- Natural-language shopping: recommendations render as inline product cards (image, price, stock, **Add**).
- Add-to-cart with a live badge on the bubble; cart summary on request.
- Suggestion chips, typing indicator, streaming-style replies, full reduced-motion support.

## Demo / mock mode
`FINCH_ENDPOINT` at the top of `v.js` is `null`, so the widget runs a **built-in mock brain** over an embedded catalog — fully interactive with **no backend**. This is what powers the hackathon demo while AWS is pending.

Try it:
```bash
# serve this folder, then open /demo/
python -m http.server 5600
# → http://localhost:5600/demo/
```
`demo/index.html` is a deliberately different-looking store (serif, blue) to prove the widget adapts anywhere and its shadow DOM never clashes.

## Going live (after Component 3 — backend)
Set `FINCH_ENDPOINT = "https://api.finch.app"`. The widget then POSTs to `/chat`:

```
POST {FINCH_ENDPOINT}/chat
{ "key": STORE_KEY, "session_id": SESSION, "message": "..." }
→ { "reply": "...", "products": [ {id,name,price,stock,image_url}... ], "suggestions": [...] }
```
No other changes — the mock brain is the only thing that gets swapped out.

## Host API
`window.Finch` exposes `open()`, `close()`, and `key` for the host page.
