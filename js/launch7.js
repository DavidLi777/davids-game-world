// Launch pack 7: each player sees the board from their own side, sharper game icons with a developer sharpness
// control, a "Free" tag filter, and better "what next" options at tables (rematch, change players, leave, ask).

// ---------- Your side of the board at the front ----------
// Games whose first player starts at the bottom turn round for the second player; Star Checkers and Halma start the
// first player at the top, so they turn for the first player instead. Ludo turns so your corner is bottom-left.
const PERSP_BOTTOM0 = ['checkers', 'intdraughts', 'russian', 'giveaway', 'breakthrough', 'mancala', 'oware', 'backgammon', 'foxgeese', 'alquerque', 'amazons', 'fences'];
const PERSP_TOP0 = ['starcheckers', 'halma'];
const viewerOf = x => (x.hot || !(x.me >= 0)) ? -1 : x.me;
function perspTurn(x, deg) { const root = x.el.querySelector('.bd') || x.el.firstElementChild; if (!root) return; root.classList.remove('persp90', 'persp180', 'persp270'); if (deg) root.classList.add('persp' + deg); }
for (const id of PERSP_BOTTOM0.concat(PERSP_TOP0)) { const G = TB[id]; if (!G || !G.view) continue; const v0 = G.view.bind(G);
  G.view = (s, x) => { v0(s, x); const v = viewerOf(x); const flip = PERSP_TOP0.includes(id) ? v === 0 || v === -1 && !x.hot : v === 1; perspTurn(x, flip ? 180 : 0); }; }
if (TB.ludo) { const v0 = TB.ludo.view.bind(TB.ludo); TB.ludo.view = (s, x) => { v0(s, x); const v = viewerOf(x); if (v < 0) return perspTurn(x, 0); const col = typeof ludoCol === 'function' ? ludoCol(s, v) : v; perspTurn(x, ((3 - col + 4) % 4) * 90); }; }

// ---------- Game icons: crisp everywhere, with a sharpness control ----------
// Icons are vector drawings, so they stay sharp at any size. Sharpness 1–10 sets line weight and how solid the lighter
// parts are; 6 is the default. The developer sets it for everyone in Developer › Look, banners & features.
const IconSharp = {
  base: null,
  level() { const v = +((Config.get().look || {}).icons || 6); return Math.max(1, Math.min(10, v)); },
  tune(src, lv) { const sw = .7 + lv * .07, alpha = Math.min(1, .45 + lv * .065);
    return src.replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${(+w * sw).toFixed(2)}"`)
      .replace(/#fff([0-9a-f])(?![0-9a-f])/gi, (m, a) => { const v = Math.max(parseInt(a, 16) / 15, alpha); return v >= .99 ? '#fff' : `rgb(255 255 255 / ${v.toFixed(2)})`; }); },
  apply() { if (!this.base) this.base = { ...GLYPH }; const lv = this.level(); if (this._lv === lv) return; this._lv = lv; for (const k in this.base) GLYPH[k] = this.tune(this.base[k], lv); document.documentElement.style.setProperty('--icon-edge', lv >= 8 ? '0 0 .6px rgb(0 0 0 / .55)' : 'none'); } };
IconSharp.apply();
{ const sh = shell; shell = function () { const was = IconSharp._lv; IconSharp.apply(); sh(); if (was !== undefined && was !== IconSharp._lv) { try { render(true); } catch (e) {} } }; }
{ const d0 = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { d0.call(this, el, tab); if (tab !== 'site' || !Dev.allowed()) return; const pane = el.querySelector('.apane'), lp = pane && pane.querySelector('.lookpane'); if (!lp || lp.querySelector('#icsh')) return; const lv = IconSharp.level();
    lp.insertAdjacentHTML('beforeend', `<div class="lookall"><label class="fld lookfld"><span>Game icon sharpness <b id="icshv">${lv}</b></span><input type="range" id="icsh" min="1" max="10" step="1" value="${lv}" aria-label="Game icon sharpness"><small class="muted">1 soft and light · 10 bold, solid and crisp-edged</small></label><div class="icprev">${['board', 'grid3', 'stones', 'cards', 'dice', 'blocks', 'tiles', 'maze'].map(k => `<span class="art" style="--c:${CAT_COLOR.Board}">${art({ glyph: k }, 48)}</span>`).join('')}</div></div>`);
    const r = lp.querySelector('#icsh'); r.oninput = () => { lp.querySelector('#icshv').textContent = r.value; IconSharp._lv = null; const keep = Config.get; Config.get = () => { const c = keep.call(Config); return { ...c, look: { ...(c.look || {}), icons: +r.value } }; }; IconSharp.apply(); Config.get = keep; lp.querySelector('.icprev').innerHTML = ['board', 'grid3', 'stones', 'cards', 'dice', 'blocks', 'tiles', 'maze'].map(k => `<span class="art" style="--c:${CAT_COLOR.Board}">${art({ glyph: k }, 48)}</span>`).join(''); };
    r.onchange = async () => { await Config.save({ look: { icons: +r.value } }); IconSharp._lv = null; IconSharp.apply(); toast('Icon sharpness saved for everyone.'); }; }; }

// ---------- "Free" in the tag filter ----------
{ const f0 = MG.filtered.bind(MG); MG.filtered = function () { const tags = this.st.tags; if (!tags.includes('Free')) return f0(); this.st.tags = tags.filter(t => t !== 'Free'); try { return f0().filter(g => Access.free(g.id)); } finally { this.st.tags = tags; } }; }
{ const r0 = VIEWS.mygames.render; VIEWS.mygames.render = function (el) { r0.call(this, el); const box = el.querySelector('.mgtags .gtags'); if (box && !box.querySelector('[data-tf="Free"]')) box.insertAdjacentHTML('afterbegin', `<a href="#" class="${MG.st.tags.includes('Free') ? 'on' : ''}" data-tf="Free">Free (${Access.list().size})</a>`); }; }

// ---------- What happens after a game ----------
// Host: Rematch (same players) or Change players (reopen the seats: people can leave, new people can sit, seats can
// be added or removed, computer players can be added), then Start. Players: Leave the table, or Ask for a rematch.
{ const T = VIEWS.table, c0 = T.controls;
  T.controls = function (t) { let h = c0.call(this, t); const mine = arr(t.seats).indexOf(Store.uid), host = t.host === Store.uid;
    if (t.status === 'done') { if (host) h += '<button class="btn" data-c="reopen">Change players or seats</button>';
      if (mine >= 0) h += '<button class="btn ghost" data-c="leave2">Leave table</button>';
      if (!host && mine >= 0) h += arr(t.askRe).includes(Store.uid) ? '<span class="pill on">You asked for a rematch</span>' : '<button class="btn" data-c="askre">Ask for a rematch</button>';
      if (host && arr(t.askRe).length) h += `<span class="pill on">${arr(t.askRe).map(u => esc(Names.of(u))).join(', ')} want${arr(t.askRe).length === 1 ? 's' : ''} a rematch</span>`; }
    if (t.status === 'open' && host && t.round) h = '<span class="muted small">Seats are open for the next game. Add or remove seats, invite people or add computer players, then start.</span> ' + h;
    return h; };
  const cc = T.ctlClick; T.ctlClick = async function (id, e) { const b = e.target.closest && e.target.closest('[data-c]'), t = Store.get('tables', id); if (!b || !t) return cc.call(this, id, e); const c = b.dataset.c, base = { ...t }; delete base.id;
    if (c === 'reopen' && t.host === Store.uid) { await Store.put('tables', id, { ...base, status: 'open', result: null, askRe: [], ts: now() }); toast('Seats are open. Change players, then press Start game.'); return; }
    if (c === 'leave2') { const seats = arr(t.seats).map(u => u === Store.uid ? null : u); let host = t.host; if (host === Store.uid) host = seats.find(u => u && !String(u).startsWith('ai:')) || null;
      await Store.put('tables', id, { ...base, seats, host, status: host ? (t.status === 'done' ? 'open' : t.status) : 'closed', askRe: arr(t.askRe).filter(u => u !== Store.uid), ts: now() }); location.hash = 'game-' + t.game; toast('You left the table.'); return; }
    if (c === 'askre') { await Store.put('tables', id, { ...base, askRe: [...new Set(arr(t.askRe).concat(Store.uid))], ts: now() }); toast('Asked the host for a rematch.'); return; }
    if (c === 'rematch' || c === 'start') { const r = await cc.call(this, id, e); const nt = Store.get('tables', id); if (nt && nt.status === 'playing' && arr(nt.askRe).length) { const b2 = { ...nt }; delete b2.id; await Store.put('tables', id, { ...b2, askRe: [] }); } return r; }
    return cc.call(this, id, e); }; }
