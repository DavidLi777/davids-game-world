// Version 2: design and gameplay upgrades shared by every game. Version 1 = all of this switched off (developer toggle).
const Ver = {
  is2() { return !(typeof Dev !== 'undefined' && Dev.allowed() && LS.get('designVer', 2) === 1); },
  apply() { document.documentElement.classList.toggle('v2', this.is2()); const b = $('#verbtn'); if (b) { b.textContent = this.is2() ? 'Design v2' : 'Design v1'; b.title = 'Developer: switch between design version 1 and 2'; } },
  set(v) { LS.set('designVer', v); this.apply(); try { if (App.cleanup) { App.cleanup(); App.cleanup = null; } } catch (e) {} render(true); toast(v === 2 ? 'Showing version 2' : 'Showing version 1 (original)'); } };

// ---------- Pause (freezes animation loops and puzzle clocks) ----------
const Pause = { on: false, since: 0, acc: 0, total() { return this.acc + (this.on ? Date.now() - this.since : 0); }, set(v) { if (v === this.on) return; if (v) this.since = Date.now(); else this.acc += Date.now() - this.since; this.on = v; } };

// ---------- Canvas polish: bevelled, rounded blocks for tile-sized solid fills ----------
function v2ctx(g, W, H) { if (!Ver.is2() || g._v2) return; g._v2 = 1; const fr = g.fillRect.bind(g);
  g.fillRect = function (x, y, w, h) { const fs = g.fillStyle; if (typeof fs !== 'string' || !/^#[0-9a-f]{6}$/i.test(fs) || w < 6 || h < 6 || w > W * 0.34 || h > H * 0.34 || !window.Path2D) return fr(x, y, w, h);
    const p = new Path2D(), r = Math.min(w, h) * 0.22; if (p.roundRect) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h); g.fill(p); const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,.30)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.24)'); g.fillStyle = gr; g.fill(p); g.fillStyle = fs; }; }

// ---------- Board helpers: animate changed cells, hints ----------
// Marks squares whose contents changed (a move landed). Only real content counts: selection and hint classes are ignored.
const v2key = e => e.innerHTML.replace(/\s(class|style)="[^"]*"/g, m => m.replace(/\b(v2chg|v2hint|tg|tg2|sel|ok|on|hover)\b/g, '').replace(/\s+/g, ' '));
function v2snap(el) { if (!Ver.is2() || !el) return null; const m = new Map(); el.querySelectorAll('[data-i]').forEach(e => m.set(e.dataset.i, v2key(e))); return m; }
function v2diff(el, before) { if (!before || !el) return; const ch = []; el.querySelectorAll('[data-i]').forEach(e => { const k = e.dataset.i; if (before.has(k) && before.get(k) !== v2key(e)) ch.push(e); });
  if (ch.length && ch.length <= Math.max(4, before.size * 0.4)) ch.forEach(e => e.classList.add('v2chg')); }
function v2view(G, s, x) { const b = v2snap(x.el); G.view(s, x); v2diff(x.el, b); }
function v2hint(el, m) { const vals = []; const walk = v => { if (v == null) return; if (typeof v === 'number' || typeof v === 'string') vals.push(String(v)); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') ['f', 't', 'from', 'to', 'i', 'a', 'k', 'c', 'p', 'sq', 'pos', 'idx', 'col', 'cell'].forEach(k => walk(v[k])); }; walk(m);
  let n = 0; for (const v of vals) el.querySelectorAll(`[data-i="${CSS.escape(v)}"]`).forEach(e => { e.classList.add('v2hint'); n++; }); return n; }

// ---------- Celebration ----------
function confetti() { if (!Ver.is2() || document.documentElement.classList.contains('rm')) return; const c = document.createElement('canvas'); c.className = 'v2conf'; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c); const g = c.getContext('2d');
  const cols = ['#ff5a3c', '#ffc23d', '#2f7cf6', '#19a974', '#a259ff', '#ff7ac6'], ps = [...Array(140)].map(() => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, c: cols[(Math.random() * 6) | 0] })); let t = 0;
  const f = () => { g.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }); if (++t < 150) requestAnimationFrame(f); else c.remove(); }; f(); }
function v2result(host, { title, sub, win, buttons }) { if (!Ver.is2() || !host) return; host.querySelectorAll('.v2over').forEach(e => e.remove()); const d = document.createElement('div'); d.className = 'v2over';
  d.innerHTML = `<div class="v2card ${win ? 'win' : ''}"><h3>${esc(title)}</h3>${sub ? `<p class="muted">${sub}</p>` : ''}<div class="row-btns">${(buttons || []).map(([id, l, hot]) => `<button class="btn ${hot ? 'hot' : ''}" data-v2b="${id}">${esc(l)}</button>`).join('')}<button class="btn ghost" data-v2b="close">View board</button></div></div>`;
  host.appendChild(d); d.addEventListener('click', e => { const b = e.target.closest('[data-v2b]'); if (!b) return; if (b.dataset.v2b === 'close') return d.remove(); const t = document.getElementById(b.dataset.v2b); d.remove(); t && t.click(); }); if (win) confetti(); }
const fmtClock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function scorePop(anchor, delta) { if (!Ver.is2() || !anchor || delta <= 0) return; const r = anchor.getBoundingClientRect(), d = document.createElement('div'); d.className = 'v2pop'; d.style.position = 'fixed'; d.style.left = (r.left + r.width / 2 - 10) + 'px'; d.style.top = (r.top - 4) + 'px'; d.textContent = '+' + Math.round(delta); document.body.appendChild(d); setTimeout(() => d.remove(), 950); }

// ---------- Hooks used by the game controllers ----------
const V2 = {
  // Turn-based local games: hint, undo, move counter, clock
  local(ctx) { if (!Ver.is2()) return null; const bar = document.createElement('div'); bar.className = 'v2tools'; bar.innerHTML = `<span class="v2stat" id="v2moves">Move 1</span><span class="v2stat" id="v2clock">0:00</span>${ctx.hotseat ? '' : '<button class="btn" id="v2hintb" title="Show a good move (H)">Hint</button>'}<button class="btn" id="v2undo" title="Take back your last move (U)">Undo</button>`;
    $('#mbar').after(bar); bar.style.margin = '8px 0'; const t0 = Date.now(); let pend = null; const iv = setInterval(() => { const c = $('#v2clock'); if (c && !ctx.over()) c.textContent = fmtClock(((Date.now() - t0) / 1000) | 0); }, 1000);
    bar.onclick = e => { const id = e.target.id;
      if (id === 'v2undo') { if (!ctx.undo()) toast('Nothing to undo yet.'); else toast('Move taken back. Games with undo count as practice.'); }
      if (id === 'v2hintb') { const m = ctx.hint(); if (m === undefined) return; if (pend !== null && Date.now() - pend < 6000) { pend = null; ctx.play(m); return; }
        const n = v2hint($('#board'), m); ctx.practice(); if (!n) { pend = Date.now(); toast('The computer has a move in mind. Press Hint again within a few seconds to play it.'); } } };
    const kh = e => { if (e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'u' || e.key === 'U') $('#v2undo') && $('#v2undo').click(); if ((e.key === 'h' || e.key === 'H') && $('#v2hintb')) $('#v2hintb').click(); }; addEventListener('keydown', kh);
    return { moves: n => { const e = $('#v2moves'); if (e) e.textContent = 'Move ' + n; }, stop: () => { clearInterval(iv); removeEventListener('keydown', kh); } }; },
  // Single-player games: countdown (arcade), pause/resume, personal best
  soloUI(id) { if (!Ver.is2()) return null; const g = GAME[id], best = ((me().scores || {})[id] || {}).best || 0, bar = $('.mbar'), board = $('#board');
    if (bar) bar.insertAdjacentHTML('beforeend', `<span class="v2tools"><span class="v2stat">Best ${best}</span><button class="btn" id="v2pause" title="Pause (P)">Pause</button></span>`);
    Pause.on = false; Pause.acc = 0; let timers = [];
    const toggle = v => { const on = v ?? !Pause.on; Pause.set(on); const ex = board && board.querySelector('.v2pause'); if (on && !ex && board) { const d = document.createElement('div'); d.className = 'v2pause'; d.innerHTML = '<div>Paused<button class="btn hot">Resume</button></div>'; board.appendChild(d); d.querySelector('button').onclick = () => toggle(false); } if (!on && ex) ex.remove(); const b = $('#v2pause'); if (b) b.textContent = on ? 'Resume' : 'Pause'; };
    const kh = e => { if (e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'p' || e.key === 'P') { e.preventDefault(); toggle(); } }, vis = () => { if (document.hidden) toggle(true); };
    $('#v2pause').onclick = () => toggle(); addEventListener('keydown', kh); document.addEventListener('visibilitychange', vis);
    return { best,
      begin(run) { if (g.cat !== 'Arcade') return run(); const cd = document.createElement('div'); cd.className = 'v2count'; board.appendChild(cd); board.style.minHeight = '360px';
        [3, 2, 1, 'Go!'].forEach((v, i) => timers.push(setTimeout(() => { cd.innerHTML = `<span>${v}</span>`; beep(v === 'Go!' ? 880 : 520, .1, 'triangle', .05); }, i * 550))); timers.push(setTimeout(() => { cd.remove(); board.style.minHeight = ''; run(); }, 2250)); },
      cleanup() { timers.forEach(clearTimeout); removeEventListener('keydown', kh); document.removeEventListener('visibilitychange', vis); Pause.on = false; Pause.acc = 0; } }; } };

// ---------- Sudoku family: highlight the selected cell's row, column, box and matching numbers ----------
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.sd button[data-i]'); if (!b || !Ver.is2()) return;
  setTimeout(() => { const grid = document.querySelector('.sd'); if (!grid) return; const cells = [...grid.querySelectorAll('button[data-i]')], n = cells.length === 36 ? 6 : 9, bw = 3, bh = n === 6 ? 2 : 3, sel = grid.querySelector('button.sel'); cells.forEach(c => c.classList.remove('sdrel', 'sdsame')); if (!sel) return;
    const i = +sel.dataset.i, r = i / n | 0, c = i % n, v = sel.textContent.replace(/^\d+(?=\d)/, '').trim();
    cells.forEach(x => { const j = +x.dataset.i, rr = j / n | 0, cc = j % n; if (j !== i && (rr === r || cc === c || ((rr / bh | 0) === (r / bh | 0) && (cc / bw | 0) === (c / bw | 0)))) x.classList.add('sdrel'); if (v && j !== i && x.textContent.trim().endsWith(v) && x.textContent.trim().length <= v.length + 2) x.classList.add('sdsame'); }); }, 0); });
