/* ============================================================================
 * Finch widget — support.js  (Support agent — chat bubble)
 *
 *   <script src="https://cdn.../support.js?key=STORE_KEY" defer></script>
 *
 * Drops a floating chat-bubble icon in the corner of the host site. Clicking it
 * opens a chat panel where customers ask questions in plain language; Finch
 * answers from the store's OWN uploaded docs (PDFs, policies, FAQs) and cites
 * which document each answer came from. Never invents an answer.
 *
 * Shadow DOM keeps it fully isolated from the host site's CSS.
 * Optional params:  key (required), api (backend origin), pos (br|bl), name.
 * ==========================================================================*/
(function () {
  'use strict';
  if (window.__finchSupportLoaded) return;
  window.__finchSupportLoaded = true;

  var SELF = document.currentScript || document.querySelector('script[src*="support.js"]');
  function param(n, d) { try { return new URL(SELF.src).searchParams.get(n) || d; } catch (e) { return d; } }

  var STORE_KEY = param('key', 'demo');
  // Backend origin. Defaults to the live AWS API; the local demo passes ?api=…
  var API = (param('api', 'https://gsq790ciza.execute-api.ap-south-1.amazonaws.com') || '').replace(/\/$/, '');
  var POS = param('pos', 'br');              // br = bottom-right, bl = bottom-left
  var NAME = param('name', 'Support');

  function sessionId() {
    try {
      var v = localStorage.getItem('finch_sid');
      if (!v) { v = 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('finch_sid', v); }
      return v;
    } catch (e) { return 'sid_' + Math.random().toString(36).slice(2); }
  }
  var SESSION = sessionId();
  var reduceMo = false;
  try { reduceMo = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var GLYPH =
    '<svg viewBox="0 0 200 200" aria-hidden="true">'
    + '<defs><linearGradient id="fs-b" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#FFD64C"/><stop offset="1" stop-color="#F5960A"/></linearGradient></defs>'
    + '<ellipse cx="100" cy="112" rx="45" ry="34" fill="url(#fs-b)" transform="rotate(-16 100 112)"/>'
    + '<circle cx="134" cy="76" r="26" fill="url(#fs-b)"/>'
    + '<path d="M84 97 C104 85 128 89 141 103 C125 112 100 114 86 108 C81 105 81 101 84 97 Z" fill="#2B2620"/>'
    + '<path d="M111 68 C114 51 156 51 159 68 C150 60 120 60 111 68 Z" fill="#2B2620"/>'
    + '<path d="M158 71 L180 76 L158 81 Z" fill="#F0913A"/>'
    + '<circle cx="143" cy="75" r="4.6" fill="#1A1712"/><circle cx="144.6" cy="73.4" r="1.5" fill="#fff"/>'
    + '</svg>';

  // ---- styles (shadow-scoped) ----------------------------------------------
  var side = POS === 'bl' ? 'left:20px' : 'right:20px';
  var CSS = ''
    + ':host{all:initial}'
    + '*{box-sizing:border-box;font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif}'
    + '.fab{position:fixed;bottom:20px;' + side + ';z-index:2147483000;width:60px;height:60px;border-radius:50%;cursor:pointer;border:none;'
    + 'background:linear-gradient(140deg,#FFD470,#E0870A);box-shadow:0 12px 30px -8px rgba(224,135,10,.6),0 2px 6px rgba(0,0,0,.15);'
    + 'display:grid;place-items:center;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}'
    + '.fab:hover{transform:translateY(-3px) scale(1.04)}.fab:active{transform:scale(.95)}'
    + '.fab svg{width:38px;height:38px;filter:drop-shadow(0 2px 3px rgba(80,50,0,.3))}'
    + '.fab .close-ic{display:none;width:26px;height:26px}'
    + '.fab.open .glyph-ic{display:none}.fab.open .close-ic{display:block}'
    + '.fab .pulse{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 0 rgba(245,184,56,.5);animation:fpulse 2.4s ease-out infinite}'
    + '.fab.open .pulse{display:none}'
    + '@keyframes fpulse{0%{box-shadow:0 0 0 0 rgba(245,184,56,.45)}100%{box-shadow:0 0 0 16px rgba(245,184,56,0)}}'
    // panel
    + '.panel{position:fixed;bottom:92px;' + side + ';z-index:2147483000;width:min(384px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));'
    + 'background:#fff;border:1px solid rgba(20,20,30,.08);border-radius:20px;box-shadow:0 30px 70px -20px rgba(20,20,40,.4);'
    + 'display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(14px) scale(.98);transform-origin:bottom ' + (POS === 'bl' ? 'left' : 'right') + ';'
    + 'pointer-events:none;transition:opacity .22s ease,transform .28s cubic-bezier(.23,1,.32,1)}'
    + '.panel.on{opacity:1;transform:none;pointer-events:auto}'
    // header
    + '.head{display:flex;align-items:center;gap:11px;padding:15px 16px;color:#2A1B02;background:linear-gradient(135deg,#FFD470,#E0870A);flex:none}'
    + '.head .av{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.22);display:grid;place-items:center;flex:none}'
    + '.head .av svg{width:28px;height:28px}'
    + '.head .t{font-weight:800;font-size:15px;letter-spacing:-.01em;line-height:1.1}'
    + '.head .s{font-size:11.5px;font-weight:600;opacity:.8;margin-top:1px;display:flex;align-items:center;gap:5px}'
    + '.head .s .dot{width:6px;height:6px;border-radius:50%;background:#1c7a3e;box-shadow:0 0 0 2px rgba(255,255,255,.5)}'
    // body
    + '.body{flex:1;overflow-y:auto;padding:16px;background:#FBFAF7;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}'
    + '.msg{max-width:86%;font-size:13.5px;line-height:1.5;padding:10px 13px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}'
    + '.msg.bot{align-self:flex-start;background:#fff;border:1px solid rgba(20,20,30,.08);border-top-left-radius:4px;color:#1c1813}'
    + '.msg.user{align-self:flex-end;background:linear-gradient(135deg,#2A2622,#1C1813);color:#F4F1EA;border-top-right-radius:4px}'
    + '.msg b{color:#B26A05}'
    + '.msg.user b{color:#FFD470}'
    + '.row{display:flex;flex-direction:column;gap:6px;max-width:100%}'
    + '.row.u{align-items:flex-end}.row.b{align-items:flex-start}'
    // sources
    + '.srcs{display:flex;flex-wrap:wrap;gap:5px;align-self:flex-start;max-width:86%}'
    + '.src{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#6b6457;background:#fff;border:1px solid rgba(20,20,30,.1);border-radius:8px;padding:4px 8px;cursor:default}'
    + '.src svg{width:12px;height:12px;color:#E0870A;flex:none}'
    + '.src .sc{color:#a49e90;font-weight:500}'
    // typing
    + '.typing{align-self:flex-start;background:#fff;border:1px solid rgba(20,20,30,.08);border-radius:14px;border-top-left-radius:4px;padding:12px 14px;display:flex;gap:4px}'
    + '.typing i{width:7px;height:7px;border-radius:50%;background:#c9c3b6;animation:fbounce 1.2s ease-in-out infinite}'
    + '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}'
    + '@keyframes fbounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}'
    // suggestions + input
    + '.sugg{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 4px;background:#FBFAF7}'
    + '.chip{font-size:12px;font-weight:600;color:#8a5a08;background:#fff;border:1px solid rgba(224,135,10,.3);border-radius:999px;padding:6px 11px;cursor:pointer;transition:background .14s,transform .12s}'
    + '.chip:hover{background:#FFF6E6;transform:translateY(-1px)}.chip:active{transform:scale(.96)}'
    + '.foot{flex:none;padding:12px;border-top:1px solid rgba(20,20,30,.07);background:#fff;display:flex;gap:8px;align-items:flex-end}'
    + '.foot textarea{flex:1;resize:none;border:1px solid rgba(20,20,30,.14);border-radius:12px;padding:10px 12px;font-size:13.5px;font-family:inherit;color:#1c1813;max-height:96px;line-height:1.4;outline:none;transition:border-color .16s}'
    + '.foot textarea:focus{border-color:#E0870A;box-shadow:0 0 0 3px rgba(224,135,10,.12)}'
    + '.send{flex:none;width:40px;height:40px;border-radius:11px;border:none;cursor:pointer;background:linear-gradient(135deg,#FFD470,#E0870A);display:grid;place-items:center;transition:transform .14s,opacity .16s}'
    + '.send:hover{transform:translateY(-1px)}.send:active{transform:scale(.94)}.send:disabled{opacity:.45;cursor:not-allowed}'
    + '.send svg{width:19px;height:19px;color:#2A1B02}'
    + '.brand{text-align:center;font-size:10.5px;color:#a49e90;padding:6px 0 9px;background:#fff}'
    + '.brand b{color:#E0870A}'
    + '.body::-webkit-scrollbar{width:7px}.body::-webkit-scrollbar-thumb{background:rgba(20,20,30,.14);border-radius:4px}'
    + '@media(prefers-reduced-motion:reduce){.fab .pulse{animation:none}.typing i{animation:none}.body{scroll-behavior:auto}}';

  // ---- shadow host ---------------------------------------------------------
  var hostEl = document.createElement('div');
  hostEl.id = 'finch-support-root';
  document.body.appendChild(hostEl);
  var root = hostEl.attachShadow({ mode: 'open' });
  root.innerHTML = '<style>' + CSS + '</style>'
    + '<div class="panel" id="panel" role="dialog" aria-label="' + esc(NAME) + ' chat">'
    + '  <div class="head"><div class="av">' + GLYPH + '</div>'
    + '    <div><div class="t">' + esc(NAME) + '</div><div class="s"><span class="dot"></span> Answers from our docs · replies in seconds</div></div>'
    + '  </div>'
    + '  <div class="body" id="body"></div>'
    + '  <div class="sugg" id="sugg"></div>'
    + '  <div class="foot"><textarea id="inp" rows="1" placeholder="Ask a question…" aria-label="Type your question"></textarea>'
    + '    <button class="send" id="send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>'
    + '  </div>'
    + '  <div class="brand">Powered by 🐦 <b>Finch</b></div>'
    + '</div>'
    + '<button class="fab" id="fab" aria-label="Open support chat">'
    + '  <span class="pulse"></span>'
    + '  <span class="glyph-ic">' + GLYPH + '</span>'
    + '  <svg class="close-ic" viewBox="0 0 24 24" fill="none" stroke="#2A1B02" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    + '</button>';

  var fab = root.getElementById('fab');
  var panel = root.getElementById('panel');
  var body = root.getElementById('body');
  var sugg = root.getElementById('sugg');
  var inp = root.getElementById('inp');
  var send = root.getElementById('send');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // allow **bold** and [n] citations to render lightly
  function fmt(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[(\d+)\]/g, '<b>[$1]</b>')
      .replace(/\n/g, '\n');
  }
  function scroll() { body.scrollTop = body.scrollHeight; }

  var opened = false, greeted = false, busy = false;

  function toggle() {
    opened = !opened;
    fab.classList.toggle('open', opened);
    panel.classList.toggle('on', opened);
    fab.setAttribute('aria-label', opened ? 'Close support chat' : 'Open support chat');
    if (opened) {
      if (!greeted) { greet(); greeted = true; }
      setTimeout(function () { inp.focus(); }, 260);
    }
  }

  function greet() {
    addBot("Hi! I'm the " + NAME + " assistant. Ask me anything about orders, shipping, returns, or how things work — I answer straight from our docs.");
    renderSuggestions(["What's your return policy?", "How long does shipping take?", "How do I contact you?"]);
  }

  function addUser(text) {
    var row = document.createElement('div'); row.className = 'row u';
    var m = document.createElement('div'); m.className = 'msg user'; m.textContent = text;
    row.appendChild(m); body.appendChild(row); scroll();
  }

  function addBot(text, sources) {
    var row = document.createElement('div'); row.className = 'row b';
    var m = document.createElement('div'); m.className = 'msg bot'; m.innerHTML = fmt(text);
    row.appendChild(m);
    if (sources && sources.length) {
      var wrap = document.createElement('div'); wrap.className = 'srcs';
      sources.slice(0, 3).forEach(function (s) {
        var chip = document.createElement('div'); chip.className = 'src';
        chip.title = s.snippet || '';
        chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
          + '<span>' + esc(s.doc_name || 'source') + '</span>';
        wrap.appendChild(chip);
      });
      row.appendChild(wrap);
    }
    body.appendChild(row); scroll();
  }

  function renderSuggestions(list) {
    sugg.innerHTML = '';
    (list || []).forEach(function (q) {
      var c = document.createElement('button'); c.className = 'chip'; c.textContent = q;
      c.addEventListener('click', function () { askQuestion(q); });
      sugg.appendChild(c);
    });
  }

  function showTyping() {
    var t = document.createElement('div'); t.className = 'typing'; t.id = 'ftyping';
    t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); scroll();
  }
  function hideTyping() { var t = root.getElementById('ftyping'); if (t) t.remove(); }

  function askQuestion(q) {
    q = (q || '').trim();
    if (!q || busy) return;
    busy = true; send.disabled = true;
    addUser(q); sugg.innerHTML = ''; inp.value = ''; autosize();
    showTyping();
    fetch(API + '/support/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STORE_KEY, session_id: SESSION, message: q }),
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        hideTyping();
        if (!res.ok || !res.d || res.d.error) {
          addBot("Sorry — I couldn't reach our help service just now. Please try again in a moment.");
        } else {
          addBot(res.d.reply || "I'm not sure about that one.", res.d.sources);
          if (res.d.suggestions && res.d.suggestions.length) renderSuggestions(res.d.suggestions);
        }
      })
      .catch(function () { hideTyping(); addBot("Sorry — something went wrong. Please try again."); })
      .finally(function () { busy = false; send.disabled = false; inp.focus(); });
  }

  function autosize() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 96) + 'px'; }

  fab.addEventListener('click', toggle);
  send.addEventListener('click', function () { askQuestion(inp.value); });
  inp.addEventListener('input', autosize);
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(inp.value); }
    if (e.key === 'Escape' && opened) toggle();
  });

  window.FinchSupport = { open: function () { if (!opened) toggle(); }, ask: askQuestion, key: STORE_KEY };
})();
