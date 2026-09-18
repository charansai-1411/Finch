/* ============================================================================
 * Finch widget — v.js  (AI search mode)
 *
 *   <script src="https://cdn.../v.js?key=STORE_KEY&cur=$" defer></script>
 *
 * Turns the host store's OWN search bar into an AI search:
 *   - wraps the search <input> in an animated RGB "AI" glow + badge,
 *   - as the shopper types, shows a results dropdown right under the bar with
 *     matching products from that store's catalog (via the Finch backend),
 *   - clicking a result goes to the store's product page.
 * No chat bubble, no panel — the AI lives entirely in the search bar.
 * Shadow DOM keeps it isolated from the host site's CSS.
 * ==========================================================================*/
(function () {
  'use strict';
  if (window.__finchLoaded) return;
  window.__finchLoaded = true;

  var FINCH_ENDPOINT = "https://gsq790ciza.execute-api.ap-south-1.amazonaws.com"; // live AWS backend

  var SELF = document.currentScript || document.querySelector('script[src*="v.js"]');
  function param(n, d) { try { return new URL(SELF.src).searchParams.get(n) || d; } catch (e) { return d; } }
  var STORE_KEY = param('key', 'demo');
  var CUR = param('cur', '$');

  function sessionId() {
    try {
      var v = localStorage.getItem('finch_sid');
      if (!v) { v = 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('finch_sid', v); }
      return v;
    } catch (e) { return 'sid_' + Math.random().toString(36).slice(2); }
  }
  var SESSION = sessionId();
  var money = function (n) { return CUR + Number(n || 0).toLocaleString(); };

  // ---- styles (shadow-scoped) ----------------------------------------------
  var CSS = ''
    + ':host{all:initial}'
    + '*{box-sizing:border-box;font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif}'
    // neon traveling-comet border around the store's search input (ported from Originkit NeonBorder)
    + '.fneon{position:fixed;z-index:2147482990;pointer-events:none;overflow:visible;opacity:0;transition:opacity .4s ease}'
    + '.fneon.on{opacity:1}'
    + '.fneon>div{position:absolute;inset:0;border-radius:inherit;box-sizing:border-box;background:var(--arc);mix-blend-mode:plus-lighter;'
    + '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}'
    + '.fneon .ring{padding:2.5px}'
    + '.fneon .g1{padding:5px;filter:blur(6px);opacity:.6}'
    + '.fneon .g2{padding:9px;filter:blur(16px);opacity:.4;transition:opacity .3s}'
    + '.fneon .g3{padding:15px;filter:blur(42px);opacity:.22;transition:opacity .3s}'
    + '.fneon.hot .g2{opacity:.55}.fneon.hot .g3{opacity:.36}'
    + '.fbadge{position:fixed;z-index:2147482991;pointer-events:none;display:flex;align-items:center;gap:4px;font:800 10px/1 system-ui,sans-serif;color:#fff;'
    + 'background:linear-gradient(90deg,#9a5cff,#46b4ff);border-radius:999px;padding:3px 7px;opacity:0;transform:translateY(2px);transition:opacity .3s,transform .3s;box-shadow:0 3px 10px -2px rgba(90,60,200,.6)}'
    + '.fbadge.on{opacity:1;transform:none}'
    // results dropdown
    + '.fdrop{position:fixed;z-index:2147482995;background:#fff;border:1px solid rgba(20,20,30,.08);border-radius:14px;box-shadow:0 24px 60px -16px rgba(20,20,40,.35);'
    + 'overflow:hidden;opacity:0;transform:translateY(-6px) scale(.99);transform-origin:top center;pointer-events:none;transition:opacity .18s ease,transform .2s cubic-bezier(.23,1,.32,1)}'
    + '.fdrop.on{opacity:1;transform:none;pointer-events:auto}'
    + '.fd-head{display:flex;align-items:center;gap:6px;padding:9px 13px;font-size:11.5px;font-weight:800;letter-spacing:.02em;color:#6a6a78;border-bottom:1px solid rgba(20,20,30,.06)}'
    + '.fd-head .spark{background:linear-gradient(90deg,#9a5cff,#ff2d78,#ff9a3d);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:13px}'
    + '.fd-head .q{color:#1c1813;font-weight:700}'
    + '.fd-body{max-height:min(420px,60vh);overflow-y:auto;padding:6px}'
    + '.fd-item{display:flex;align-items:center;gap:11px;padding:8px 9px;border-radius:10px;text-decoration:none;color:#1c1813;transition:background .12s ease}'
    + '.fd-item:hover{background:#f5f3ef}'
    + '.fd-item img{width:46px;height:46px;border-radius:8px;object-fit:cover;flex:none;background:#eee}'
    + '.fd-item .n{font-size:13.5px;font-weight:700;line-height:1.2}'
    + '.fd-item .d{font-size:12px;color:#6b6457;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px}'
    + '.fd-item .p{margin-left:auto;font-size:13px;font-weight:800;color:#1c1813;flex:none}'
    + '.fd-empty{padding:26px 16px;text-align:center;color:#8a8578;font-size:13px}'
    + '.fd-foot{padding:7px 13px;border-top:1px solid rgba(20,20,30,.06);font-size:10.5px;color:#9a958a;display:flex;align-items:center;gap:4px}'
    + '.fd-foot b{color:#E07C09}'
    + '.sk{display:flex;align-items:center;gap:11px;padding:8px 9px}'
    + '.sk .b{border-radius:8px;background:linear-gradient(90deg,#eee 25%,#f6f6f6 37%,#eee 63%);background-size:400% 100%;animation:sh 1.2s ease infinite}'
    + '.sk .b1{width:46px;height:46px;flex:none}.sk .b2{height:12px;width:60%}.sk .b3{height:10px;width:30%;margin-left:auto}'
    + '@keyframes sh{0%{background-position:100% 0}100%{background-position:-100% 0}}'
    + '@media(prefers-reduced-motion:reduce){.fsg{animation:none}.sk .b{animation:none}}';

  // ---- shadow host ---------------------------------------------------------
  var hostEl = document.createElement('div');
  hostEl.id = 'finch-search-root';
  document.body.appendChild(hostEl);
  var root = hostEl.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + CSS + '</style>'
    + '<div class="fdrop" id="drop">'
    + '  <div class="fd-head"><span class="spark">✦</span> Finch AI <span class="q" id="dq"></span></div>'
    + '  <div class="fd-body" id="results"></div>'
    + '  <div class="fd-foot">Powered by 🐦 <b>Finch</b></div>'
    + '</div>';
  var drop = root.getElementById('drop');
  var results = root.getElementById('results');
  var dq = root.getElementById('dq');
  // keep focus when interacting with the dropdown so it doesn't close
  drop.addEventListener('mousedown', function (e) { e.preventDefault(); });

  var activeInput = null;

  function positionDrop() {
    if (!activeInput) return;
    var r = activeInput.getBoundingClientRect();
    var w = Math.max(r.width, 380);
    var left = Math.min(r.left, innerWidth - w - 12);
    drop.style.left = Math.max(12, left) + 'px';
    drop.style.top = (r.bottom + 8) + 'px';
    drop.style.width = w + 'px';
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function showLoading(q) {
    dq.textContent = q ? '· ' + q : '';
    results.innerHTML = '<div class="sk"><div class="b b1"></div><div style="flex:1"><div class="b b2"></div></div><div class="b b3"></div></div>'.repeat(3);
    positionDrop(); drop.classList.add('on');
  }

  function render(products, q) {
    dq.textContent = q ? '· ' + q : '';
    if (!products || !products.length) {
      results.innerHTML = '<div class="fd-empty">No matches for “' + esc(q) + '” yet.</div>';
    } else {
      results.innerHTML = products.map(function (p) {
        var img = p.image_url ? '<img src="' + esc(p.image_url) + '" alt="" loading="lazy"/>' : '<div class="fd-item-noimg" style="width:46px;height:46px;border-radius:8px;background:#eee;flex:none"></div>';
        return '<a class="fd-item" href="' + esc(p.product_url || '#') + '">' + img
          + '<div><div class="n">' + esc(p.name) + '</div>' + (p.description ? '<div class="d">' + esc(p.description) + '</div>' : '') + '</div>'
          + '<div class="p">' + money(p.price) + '</div></a>';
      }).join('');
    }
    positionDrop(); drop.classList.add('on');
  }

  function hideDrop() { drop.classList.remove('on'); }

  // ---- query the backend ---------------------------------------------------
  var timer, lastQ = null, seq = 0;
  function runQuery(q) {
    q = (q || '').trim();
    if (q.length < 2) { hideDrop(); lastQ = null; return; }
    if (q === lastQ) { positionDrop(); drop.classList.add('on'); return; }
    lastQ = q;
    var my = ++seq;
    showLoading(q);
    fetch(FINCH_ENDPOINT + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STORE_KEY, session_id: SESSION, message: q }),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (my === seq) render((d && d.products) || [], q); })
      .catch(function () { if (my === seq) results.innerHTML = '<div class="fd-empty">Search is unavailable right now.</div>'; });
  }

  // ---- glow ring per search input ------------------------------------------
  // ---- neon traveling-comet border (ported from Originkit NeonBorder) -------
  var NEON = '255,186,96';       // Finch gold
  var NEON_HI = '255,232,190';   // bright comet core
  function arc(a) {
    return 'conic-gradient(from ' + a.toFixed(1) + 'deg at 50% 50%,'
      + 'rgba(' + NEON + ',0) 0deg,rgba(' + NEON + ',.15) 14deg,rgba(' + NEON_HI + ',1) 40deg,rgba(' + NEON + ',.15) 66deg,rgba(' + NEON + ',0) 80deg,'
      + 'rgba(' + NEON + ',0) 174deg,rgba(' + NEON + ',.15) 188deg,rgba(' + NEON_HI + ',1) 214deg,rgba(' + NEON + ',.15) 240deg,rgba(' + NEON + ',0) 254deg,'
      + 'rgba(' + NEON + ',0) 360deg)';
  }
  var neons = [];
  var reduceMo = false;
  try { reduceMo = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function makeGlow() {
    var g = document.createElement('div'); g.className = 'fneon';
    g.innerHTML = '<div class="g3"></div><div class="g2"></div><div class="g1"></div><div class="ring"></div>';
    var b = document.createElement('div'); b.className = 'fbadge'; b.innerHTML = '✨ AI';
    root.appendChild(g); root.appendChild(b);
    g.style.setProperty('--arc', arc(0));
    neons.push(g);
    return { g: g, b: b };
  }

  // one rAF loop drives every neon comet
  (function () {
    var last = performance.now(), ang = 0;
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduceMo) {
        ang = (ang + dt * 72) % 360; // ~72°/s
        for (var i = 0; i < neons.length; i++) {
          if (neons[i].classList.contains('on')) neons[i].style.setProperty('--arc', arc(ang));
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  function wire(input) {
    if (input.__finch) return;
    input.__finch = true;
    var gl = makeGlow();
    var _br = getComputedStyle(input).borderRadius;
    gl.g.style.borderRadius = (_br && _br !== '0px') ? _br : '10px';

    function place() {
      var r = input.getBoundingClientRect();
      var off = r.width < 24 || r.bottom < 0 || r.top > innerHeight;
      gl.g.classList.toggle('on', !off); gl.b.classList.toggle('on', !off);
      if (off) return;
      gl.g.style.left = r.left + 'px'; gl.g.style.top = r.top + 'px';
      gl.g.style.width = r.width + 'px'; gl.g.style.height = r.height + 'px';
      gl.b.style.left = (r.right - 40) + 'px'; gl.b.style.top = (r.top - 9) + 'px';
      if (activeInput === input) positionDrop();
    }
    place();
    addEventListener('scroll', place, { passive: true, capture: true });
    addEventListener('resize', place);
    setInterval(place, 500);

    input.addEventListener('focus', function () { activeInput = input; gl.g.classList.add('hot'); if (input.value.trim().length >= 2) runQuery(input.value); });
    input.addEventListener('blur', function () { gl.g.classList.remove('hot'); });
    input.addEventListener('input', function () { activeInput = input; clearTimeout(timer); timer = setTimeout(function () { runQuery(input.value); }, 280); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideDrop(); return; }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); clearTimeout(timer); activeInput = input; runQuery(input.value); }
    }, true);
  }

  function searchInputs() {
    var sels = ['input[type="search"]', 'input[placeholder*="search" i]', 'input[name*="search" i]', 'input[aria-label*="search" i]', '[role="search"] input'];
    var found = [];
    sels.forEach(function (s) {
      [].forEach.call(document.querySelectorAll(s), function (el) {
        if (el.tagName === 'INPUT' && el.offsetParent !== null && found.indexOf(el) < 0) found.push(el);
      });
    });
    return found;
  }

  function attach() {
    var inputs = searchInputs();
    inputs.forEach(wire);
    return inputs.length > 0;
  }
  // retry while the SPA renders its header/search
  (function tryAttach(n) { if (n <= 0) return; attach(); setTimeout(function () { tryAttach(n - 1); }, 700); })(14);

  // close when clicking outside a search input / the dropdown
  document.addEventListener('mousedown', function (e) {
    if (e.target === hostEl) return;                 // clicks inside shadow retarget to host
    if (e.target && e.target.__finch) return;        // a wired search input
    hideDrop();
  });

  window.Finch = { search: runQuery, key: STORE_KEY };
})();
