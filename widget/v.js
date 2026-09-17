/* ============================================================================
 * Finch widget — v.js
 * One script tag turns any store into a shop with an AI salesperson.
 *
 *   <script src="https://cdn.finch.app/v.js?key=STORE_KEY" defer></script>
 *
 * - Injects a shadow-DOM chat bubble + panel (no CSS collisions with the host).
 * - Reads STORE_KEY from its own <script src>; scopes the session to that store.
 * - Mints a session_id in localStorage so the cart persists across page loads.
 * - Talks to POST {FINCH_ENDPOINT}/chat  ({key, session_id, message}).
 *
 * DEMO MODE: when FINCH_ENDPOINT is null it runs a built-in mock brain over an
 * embedded catalog, so the widget is fully interactive without a backend.
 * Set FINCH_ENDPOINT to your API base to go live (Component 3).
 * ==========================================================================*/
(function () {
  'use strict';
  if (window.__finchLoaded) return;
  window.__finchLoaded = true;

  var FINCH_ENDPOINT = null; // e.g. "https://api.finch.app" — null = demo/mock mode

  // ---- resolve store key + session -----------------------------------------
  function readKey() {
    var s = document.currentScript || document.querySelector('script[src*="v.js"]');
    try { return new URL(s.src).searchParams.get('key') || 'demo'; }
    catch (e) { return 'demo'; }
  }
  var STORE_KEY = readKey();

  function sessionId() {
    try {
      var k = 'finch_sid';
      var v = localStorage.getItem(k);
      if (!v) { v = 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return 'sid_' + Math.random().toString(36).slice(2); }
  }
  var SESSION = sessionId();

  // ---- embedded demo catalog (mock brain) ----------------------------------
  var CATALOG = [
    { id: 'sku-001', name: 'Trailblaze Running Shoe', price: 2799, stock: 24, category: 'footwear', tags: 'running jogging daily breathable cushioned', img: 'https://picsum.photos/seed/sku001/200' },
    { id: 'sku-002', name: 'Cloudstep Walking Shoe', price: 2299, stock: 12, category: 'footwear', tags: 'walking wide comfort memory foam all-day', img: 'https://picsum.photos/seed/sku002/200' },
    { id: 'sku-003', name: 'Grip Trail Runner', price: 3499, stock: 7, category: 'footwear', tags: 'trail off-road grip rocky wet rugged', img: 'https://picsum.photos/seed/sku003/200' },
    { id: 'sku-004', name: 'Featherlite Sneaker', price: 1999, stock: 40, category: 'footwear', tags: 'minimalist everyday sneaker light knit breathable', img: 'https://picsum.photos/seed/sku004/200' },
    { id: 'sku-006', name: 'Marathon Pro', price: 6499, stock: 5, category: 'footwear', tags: 'racing carbon plate serious runner high mileage', img: 'https://picsum.photos/seed/sku006/200' },
    { id: 'sku-009', name: 'Wide-Fit Comfort Shoe', price: 2599, stock: 15, category: 'footwear', tags: 'wide feet comfort standing all-day daily', img: 'https://picsum.photos/seed/sku009/200' },
    { id: 'sku-010', name: 'Kids Sprint Shoe', price: 1499, stock: 30, category: 'footwear', tags: 'kids children running velcro durable light', img: 'https://picsum.photos/seed/sku010/200' },
    { id: 'sku-007', name: 'DryFit Running Tee', price: 899, stock: 60, category: 'apparel', tags: 'tee shirt running moisture wicking quick dry', img: 'https://picsum.photos/seed/sku007/200' },
  ];
  var rupee = function (n) { return '₹' + n.toLocaleString('en-IN'); };

  // ---- state ---------------------------------------------------------------
  var open = false, cart = [], lastShown = [];

  // ---- finch glyph ---------------------------------------------------------
  var FINCH = '<svg viewBox="0 0 200 200" aria-hidden="true">'
    + '<defs><linearGradient id="fw-b" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#FFD64C"/><stop offset="1" stop-color="#F5960A"/></linearGradient>'
    + '<linearGradient id="fw-be" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3C8"/><stop offset="1" stop-color="#FFD64C"/></linearGradient></defs>'
    + '<rect x="54" y="155" width="94" height="6" rx="3" fill="#2B2620"/>'
    + '<path d="M103 140 L103 156 M120 140 L120 156" stroke="#2B2620" stroke-width="4.5" stroke-linecap="round"/>'
    + '<path d="M79 120 C61 130 46 142 34 153 C41 157 49 155 55 149 C60 154 66 152 70 145 C74 138 78 129 79 120 Z" fill="#2B2620"/>'
    + '<ellipse cx="100" cy="112" rx="45" ry="34" fill="url(#fw-b)" transform="rotate(-16 100 112)"/>'
    + '<ellipse cx="116" cy="120" rx="16" ry="23" fill="url(#fw-be)" opacity="0.75" transform="rotate(-16 116 120)"/>'
    + '<circle cx="134" cy="76" r="26" fill="url(#fw-b)"/>'
    + '<path d="M84 97 C104 85 128 89 141 103 C125 112 100 114 86 108 C81 105 81 101 84 97 Z" fill="#2B2620"/>'
    + '<path d="M95 104 L134 106" stroke="#FFF1D0" stroke-width="3" stroke-linecap="round" opacity="0.92"/>'
    + '<path d="M111 68 C114 51 156 51 159 68 C150 60 120 60 111 68 Z" fill="#2B2620"/>'
    + '<path d="M158 71 L180 76 L158 81 Z" fill="#F0913A"/>'
    + '<circle cx="143" cy="75" r="4.6" fill="#1A1712"/><circle cx="144.6" cy="73.4" r="1.5" fill="#fff"/></svg>';

  // ---- styles (scoped to shadow root) --------------------------------------
  var CSS = ''
    + ':host{all:initial}'
    + '*{box-sizing:border-box;font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif}'
    + '.wrap{position:fixed;right:20px;bottom:20px;z-index:2147483000;--gold:#F59E0B;--gold-deep:#E07C09;--ink:#1C1813;--muted:#6B6457;--hair:rgba(28,24,19,.10);--ease:cubic-bezier(0.23,1,0.32,1)}'
    + '.bubble{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(150deg,#FFCA5E,var(--gold-deep));box-shadow:0 14px 30px -8px rgba(224,124,9,.6);display:grid;place-items:center;transition:transform 160ms var(--ease),box-shadow 200ms var(--ease)}'
    + '.bubble svg{width:38px;height:38px}'
    + '.bubble:active{transform:scale(.94)}'
    + '@media(hover:hover){.bubble:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 20px 38px -10px rgba(224,124,9,.7)}}'
    + '.bubble .badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#1C1813;color:#fff;font-size:11px;font-weight:800;display:none;place-items:center;border:2px solid #fff}'
    + '.bubble .badge.on{display:grid}'
    + '.panel{position:absolute;right:0;bottom:76px;width:376px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#fff;border:1px solid var(--hair);border-radius:20px;box-shadow:0 40px 80px -30px rgba(40,30,10,.5);display:flex;flex-direction:column;overflow:hidden;transform-origin:100% 100%;opacity:0;transform:scale(.96) translateY(8px);pointer-events:none;transition:opacity 200ms var(--ease),transform 220ms var(--ease)}'
    + '.wrap.open .panel{opacity:1;transform:none;pointer-events:auto}'
    + '.hd{background:linear-gradient(135deg,#FFCB5C,var(--gold-deep));padding:14px 16px;display:flex;align-items:center;gap:10px;color:#2A1B02}'
    + '.hd .av{width:38px;height:38px;border-radius:50%;background:#fff;display:grid;place-items:center;flex:none;box-shadow:0 4px 10px -4px rgba(0,0,0,.3)}'
    + '.hd .av svg{width:26px;height:26px}'
    + '.hd .nm{font-weight:800;font-size:15px;line-height:1.1}'
    + '.hd .st{font-size:11.5px;font-weight:600;opacity:.8;display:flex;align-items:center;gap:5px}'
    + '.hd .st i{width:7px;height:7px;border-radius:50%;background:#1a8f52;box-shadow:0 0 0 3px rgba(26,143,82,.25)}'
    + '.hd .sp{flex:1}'
    + '.hd .x{background:rgba(0,0,0,.12);border:none;width:30px;height:30px;border-radius:8px;cursor:pointer;color:#2A1B02;display:grid;place-items:center;transition:background 140ms}'
    + '.hd .x:hover{background:rgba(0,0,0,.2)}'
    + '.body{flex:1;overflow-y:auto;padding:16px;background:#FBFAF7;display:flex;flex-direction:column;gap:12px}'
    + '.msg{max-width:84%;font-size:14px;line-height:1.5;padding:10px 13px;border-radius:15px;opacity:0;transform:translateY(8px);animation:in 260ms var(--ease) forwards}'
    + '@keyframes in{to{opacity:1;transform:none}}'
    + '.msg.bot{align-self:flex-start;background:#fff;border:1px solid var(--hair);border-bottom-left-radius:5px;color:var(--ink)}'
    + '.msg.me{align-self:flex-end;background:linear-gradient(135deg,#FFCB5C,var(--gold-deep));color:#2A1B02;font-weight:500;border-bottom-right-radius:5px}'
    + '.cards{align-self:flex-start;width:100%;display:flex;flex-direction:column;gap:8px}'
    + '.pcard{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--hair);border-radius:14px;padding:8px;opacity:0;transform:translateY(8px);animation:in 300ms var(--ease) forwards}'
    + '.pcard img{width:54px;height:54px;border-radius:10px;object-fit:cover;flex:none;background:#eee}'
    + '.pcard .info{flex:1;min-width:0}'
    + '.pcard .pn{font-size:13px;font-weight:700;color:var(--ink);line-height:1.2}'
    + '.pcard .pr{font-size:12.5px;color:var(--muted);font-weight:600;margin-top:2px}'
    + '.pcard .pr b{color:var(--ink)}'
    + '.pcard .buy{border:1px solid color-mix(in srgb,var(--gold) 40%,transparent);background:color-mix(in srgb,var(--gold) 12%,#fff);color:var(--gold-deep);font-weight:700;font-size:12px;border-radius:9px;padding:7px 10px;cursor:pointer;flex:none;transition:transform 130ms var(--ease),background 140ms}'
    + '.pcard .buy:active{transform:scale(.95)}'
    + '.pcard .buy.added{background:#1a8f52;color:#fff;border-color:transparent}'
    + '.typing{align-self:flex-start;background:#fff;border:1px solid var(--hair);border-radius:15px;border-bottom-left-radius:5px;padding:13px 14px;display:flex;gap:4px}'
    + '.typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);opacity:.5;animation:bob 1s infinite}'
    + '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}'
    + '@keyframes bob{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}'
    + '.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 4px}'
    + '.chip{border:1px solid var(--hair);background:#fff;color:var(--ink);border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;transition:transform 130ms var(--ease),border-color 140ms}'
    + '.chip:active{transform:scale(.96)}.chip:hover{border-color:var(--gold)}'
    + '.foot{border-top:1px solid var(--hair);padding:10px;display:flex;gap:8px;align-items:center;background:#fff}'
    + '.foot input{flex:1;border:1px solid var(--hair);border-radius:12px;padding:11px 13px;font-size:14px;outline:none;color:var(--ink)}'
    + '.foot input:focus{border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 18%,transparent)}'
    + '.foot .send{width:42px;height:42px;flex:none;border:none;border-radius:12px;background:linear-gradient(135deg,#FFCB5C,var(--gold-deep));cursor:pointer;display:grid;place-items:center;transition:transform 130ms var(--ease)}'
    + '.foot .send:active{transform:scale(.92)}'
    + '.foot .send svg{width:19px;height:19px;color:#2A1B02}'
    + '.brandline{text-align:center;font-size:10.5px;color:var(--muted);padding:0 0 8px;background:#fff}'
    + '@media(prefers-reduced-motion:reduce){.bubble,.panel,.msg,.pcard,.typing i,.chip,.buy,.send{animation:none!important;transition:opacity 150ms ease!important}.panel{transform:none}}';

  // ---- build DOM -----------------------------------------------------------
  var host = document.createElement('div');
  host.id = 'finch-widget-root';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' + CSS + '</style>'
    + '<div class="wrap">'
    + '  <div class="panel" role="dialog" aria-label="Finch chat">'
    + '    <div class="hd"><div class="av">' + FINCH + '</div>'
    + '      <div><div class="nm">Finch</div><div class="st"><i></i> Your shopping assistant</div></div>'
    + '      <div class="sp"></div>'
    + '      <button class="x" aria-label="Close">'
    + '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    + '    </div>'
    + '    <div class="body" id="body"></div>'
    + '    <div class="chips" id="chips"></div>'
    + '    <div class="foot"><input id="in" placeholder="Ask for anything…" autocomplete="off"/>'
    + '      <button class="send" id="send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>'
    + '    <div class="brandline">Powered by 🐦 Finch</div>'
    + '  </div>'
    + '  <button class="bubble" id="bubble" aria-label="Open chat">' + FINCH + '<span class="badge" id="badge"></span></button>'
    + '</div>';

  var $ = function (id) { return root.getElementById(id); };
  var wrap = root.querySelector('.wrap');
  var bodyEl = $('body'), inputEl = $('in'), badgeEl = $('badge'), chipsEl = $('chips');

  // ---- rendering helpers ---------------------------------------------------
  function scroll() { bodyEl.scrollTop = bodyEl.scrollHeight; }
  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'msg ' + who; d.textContent = text;
    bodyEl.appendChild(d); scroll(); return d;
  }
  function showTyping() {
    var t = document.createElement('div');
    t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>';
    bodyEl.appendChild(t); scroll(); return t;
  }
  function renderCards(items) {
    lastShown = items;
    var box = document.createElement('div'); box.className = 'cards';
    items.forEach(function (p, i) {
      var el = document.createElement('div'); el.className = 'pcard'; el.style.animationDelay = (i * 60) + 'ms';
      el.innerHTML = '<img src="' + p.img + '" alt=""/>'
        + '<div class="info"><div class="pn">' + p.name + '</div>'
        + '<div class="pr"><b>' + rupee(p.price) + '</b> · ' + (p.stock > 0 ? 'in stock' : 'out of stock') + '</div></div>'
        + '<button class="buy">Add</button>';
      el.querySelector('.buy').addEventListener('click', function (e) { addToCart(p, e.target); });
      box.appendChild(el);
    });
    bodyEl.appendChild(box); scroll();
  }
  function setChips(list) {
    chipsEl.innerHTML = '';
    list.forEach(function (t) {
      var c = document.createElement('button'); c.className = 'chip'; c.textContent = t;
      c.addEventListener('click', function () { send(t); });
      chipsEl.appendChild(c);
    });
  }
  function updateBadge() {
    var n = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    badgeEl.textContent = n; badgeEl.classList.toggle('on', n > 0);
  }
  function addToCart(p, btn) {
    var found = cart.find(function (i) { return i.id === p.id; });
    if (found) found.qty++; else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    if (btn) { btn.textContent = 'Added ✓'; btn.classList.add('added'); }
    updateBadge();
    // persist via backend in live mode; local-only in demo
    addMsg('Added ' + p.name + ' to your cart.', 'bot');
  }

  // ---- the brain -----------------------------------------------------------
  // Live mode -> POST /chat. Demo mode -> local mock over CATALOG.
  function respond(text) {
    var typing = showTyping();
    var finish = function (reply, cards, chips) {
      setTimeout(function () {
        typing.remove();
        if (reply) addMsg(reply, 'bot');
        if (cards && cards.length) renderCards(cards);
        if (chips) setChips(chips);
      }, 650 + Math.random() * 400);
    };

    if (FINCH_ENDPOINT) {
      fetch(FINCH_ENDPOINT + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: STORE_KEY, session_id: SESSION, message: text }),
      }).then(function (r) { return r.json(); })
        .then(function (d) { finish(d.reply, d.products, d.suggestions); })
        .catch(function () { finish("I'm having trouble reaching the store right now — try again in a moment.", [], []); });
      return;
    }
    var out = mockBrain(text);
    finish(out.reply, out.cards, out.chips);
  }

  function mockBrain(raw) {
    var q = raw.toLowerCase();
    // add-to-cart intents
    var ord = { first: 0, '1st': 0, one: 0, second: 1, '2nd': 1, two: 1, third: 2, '3rd': 2, three: 2 };
    if (/\b(add|buy|take|get)\b/.test(q) && lastShown.length) {
      for (var w in ord) { if (q.indexOf(w) >= 0 && lastShown[ord[w]]) { addToCart(lastShown[ord[w]]); return { reply: '', cards: [], chips: defaultChips() }; } }
      addToCart(lastShown[0]); return { reply: '', cards: [], chips: defaultChips() };
    }
    // cart intents
    if (/\bcart\b|checkout|what.*added|my order/.test(q)) {
      if (!cart.length) return { reply: "Your cart's empty so far — want a recommendation?", cards: [], chips: defaultChips() };
      var total = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var lines = cart.map(function (i) { return i.qty + '× ' + i.name; }).join(', ');
      return { reply: 'Your cart: ' + lines + '. Total ' + rupee(total) + '. Head to checkout on the store when you’re ready!', cards: [], chips: defaultChips() };
    }
    // greeting
    if (/^(hi|hey|hello|yo|help)\b/.test(q) || q.length < 3) {
      return { reply: "Hi! Tell me what you're after — a use case, a budget, a size — and I'll find the right pair.", cards: [], chips: ['Running under ₹3k', 'Wide-fit shoes', 'Something for kids'] };
    }
    // search
    var picks = search(q);
    if (!picks.length) {
      return { reply: "I couldn't find a great match for that. Want to try a different budget or use case?", cards: [], chips: ['Under ₹2,000', 'For daily jogging', 'Show everything'] };
    }
    var lead = picks.length === 1
      ? 'This one fits best:'
      : 'Here are ' + picks.length + ' that fit — the ' + picks[0].name.split(' ')[0] + ' is my top pick:';
    return { reply: lead, cards: picks, chips: ['Add the first one', 'Something cheaper', 'What’s in my cart?'] };
  }

  function search(q) {
    var max = null, m = q.match(/under\s*₹?\s*([\d,]+)\s*(k)?/) || q.match(/below\s*₹?\s*([\d,]+)\s*(k)?/);
    if (m) { max = parseInt(m[1].replace(/,/g, ''), 10) * (m[2] ? 1000 : 1); }
    if (/\b3k\b/.test(q)) max = 3000; if (/\b2k\b/.test(q)) max = 2000; if (/\b5k\b/.test(q)) max = 5000;
    var words = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2; });
    var scored = CATALOG.map(function (p) {
      var hay = (p.name + ' ' + p.category + ' ' + p.tags).toLowerCase();
      var score = 0; words.forEach(function (w) { if (hay.indexOf(w) >= 0) score += 2; });
      if (/every|all|show/.test(q)) score += 1;
      return { p: p, score: score };
    }).filter(function (x) { return x.score > 0 || /every|all|show/.test(q); });
    scored = scored.filter(function (x) { return max == null || x.p.price <= max; });
    scored.sort(function (a, b) { return b.score - a.score || a.p.price - b.p.price; });
    return scored.slice(0, 3).map(function (x) { return x.p; });
  }

  function defaultChips() { return ['Something cheaper', 'For wide feet', 'What’s in my cart?']; }

  // ---- events --------------------------------------------------------------
  var greeted = false;
  function toggle(o) {
    open = o == null ? !open : o;
    wrap.classList.toggle('open', open);
    if (open) {
      inputEl.focus();
      if (!greeted) {
        greeted = true;
        setTimeout(function () {
          addMsg("Hey! I'm Finch 🐦 — I know every product in this store. What are you shopping for?", 'bot');
          setChips(['Running shoe under ₹3k', 'Best for wide feet', 'Something for kids']);
        }, 250);
      }
    }
  }
  function send(text) {
    var t = (text != null ? text : inputEl.value).trim();
    if (!t) return;
    addMsg(t, 'me'); inputEl.value = ''; chipsEl.innerHTML = '';
    respond(t);
  }

  $('bubble').addEventListener('click', function () { toggle(); });
  root.querySelector('.x').addEventListener('click', function () { toggle(false); });
  $('send').addEventListener('click', function () { send(); });
  inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

  // expose a tiny API for the host / demo page
  window.Finch = { open: function () { toggle(true); }, close: function () { toggle(false); }, key: STORE_KEY };
})();
