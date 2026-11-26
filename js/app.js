// App shell, routing, games hub, matches, online tables, leaderboards, tutorials, membership, admin.
const App = { view: null, arg: null, cleanup: null, dirty: false, search: '', lvl: LS.get('lvl', {}), cat: 'All', libq: '' };
const VIEWS = {};
const isPlayable = id => !!(TB[id] || SO[id]);
// Hidden games: the developer can hide any game from the public. Hidden games vanish from every list and can't be opened by players.
const Hide = { list() { return typeof Config !== 'undefined' ? arr(Config.get().hidden) : []; }, is(id) { return this.list().includes(id); },
  mode() { return typeof Dev !== 'undefined' && Dev.allowed() && LS.get('devHide', false); }, shows(id) { return !this.is(id) || this.mode(); },
  async toggle(id) { const l = this.list(), n = l.includes(id) ? l.filter(x => x !== id) : l.concat(id); await Config.save({ hidden: n }); toast(n.includes(id) ? `${GAME[id].name} is now hidden from the public.` : `${GAME[id].name} is visible again.`); render(true); } };
const pubCat = () => CATALOG.filter(g => Hide.shows(g.id));
const main = () => $('#main');

// ---------- Glyph art for game tiles ----------
const GLYPH = {
  board: '<rect x="9" y="9" width="46" height="46" rx="4" fill="none" stroke="#fff" stroke-width="2.5"/>' + [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => (r + c) % 2 ? '' : `<rect x="${12 + c * 10}" y="${12 + r * 10}" width="10" height="10" fill="#fff"/>`).join('')).join(''),
  disc: '<circle cx="21" cy="21" r="9.5" fill="#fff"/><circle cx="43" cy="21" r="9.5" fill="#0b0b0b" stroke="#fff" stroke-width="2"/><circle cx="21" cy="43" r="9.5" fill="#0b0b0b" stroke="#fff" stroke-width="2"/><circle cx="43" cy="43" r="9.5" fill="#fff"/>',
  stones: '<g stroke="#fff9" stroke-width="2">' + [14, 23, 32, 41, 50].map(v => `<path d="M14 ${v}H50M${v} 14V50"/>`).join('') + '</g><circle cx="23" cy="23" r="6.5" fill="#fff"/><circle cx="41" cy="23" r="6.5" fill="#111" stroke="#fff" stroke-width="1.5"/><circle cx="23" cy="41" r="6.5" fill="#111" stroke="#fff" stroke-width="1.5"/><circle cx="41" cy="41" r="6.5" fill="#fff"/>',
  grid3: '<path d="M24.7 10v44M39.3 10v44M10 24.7h44M10 39.3h44" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M13.8 13.8l7 7M20.8 13.8l-7 7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="46.7" cy="46.7" r="3.9" fill="none" stroke="#fff" stroke-width="2.8"/><path d="M28.5 28.5l7 7M35.5 28.5l-7 7" stroke="#fff9" stroke-width="3" stroke-linecap="round"/>',
  cards: '<rect x="9" y="16" width="21" height="31" rx="3.5" fill="#fff"/><rect x="34" y="16" width="21" height="31" rx="3.5" fill="#fff"/><path d="M19.5 25c-4 4-6 6-6 8.5a3 3 0 006 .5l-1 3.5h2l-1-3.5a3 3 0 006-.5c0-2.5-2-4.5-6-8.5z" fill="#222"/><path d="M44.5 24l5 7.5-5 7.5-5-7.5z" fill="#e2412f"/>',
  dice: '<rect x="8" y="20" width="23" height="23" rx="5" fill="#fff"/><rect x="34" y="20" width="23" height="23" rx="5" fill="#fff"/><g fill="#222"><circle cx="14" cy="26" r="2.4"/><circle cx="19.5" cy="31.5" r="2.4"/><circle cx="25" cy="37" r="2.4"/><circle cx="40" cy="26" r="2.4"/><circle cx="51" cy="26" r="2.4"/><circle cx="45.5" cy="31.5" r="2.4"/><circle cx="40" cy="37" r="2.4"/><circle cx="51" cy="37" r="2.4"/></g>',
  tiles: '<rect x="9" y="9" width="21" height="21" rx="4" fill="#fff"/><rect x="34" y="9" width="21" height="21" rx="4" fill="#fff8"/><rect x="9" y="34" width="21" height="21" rx="4" fill="#fff8"/><rect x="34" y="34" width="21" height="21" rx="4" fill="#fff"/>',
  pegs: '<g>' + [0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4].map(c => (r < 1 || r > 3) && (c < 1 || c > 3) ? '' : r === 2 && c === 2 ? `<circle cx="${12 + c * 10}" cy="${12 + r * 10}" r="3.4" fill="none" stroke="#fff" stroke-width="1.6"/>` : `<circle cx="${12 + c * 10}" cy="${12 + r * 10}" r="3.6" fill="#fff"/>`).join('')).join('') + '</g>',
  blocks: '<g fill="#fff"><rect x="10" y="43" width="10" height="10" rx="1.5"/><rect x="21" y="43" width="10" height="10" rx="1.5"/><rect x="32" y="43" width="10" height="10" rx="1.5"/><rect x="21" y="32" width="10" height="10" rx="1.5"/></g><g fill="#fffa"><rect x="43" y="43" width="10" height="10" rx="1.5"/><rect x="43" y="32" width="10" height="10" rx="1.5"/><rect x="43" y="21" width="10" height="10" rx="1.5"/><rect x="32" y="21" width="10" height="10" rx="1.5"/></g><g fill="#fff"><rect x="21" y="8" width="10" height="10" rx="1.5"/><rect x="32" y="8" width="10" height="10" rx="1.5"/></g>',
  snake: '<path d="M12 48h14V32h18V16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="46" r="5" fill="#ffc23d"/><circle cx="41.5" cy="15" r="1.4" fill="#333"/>',
  ball: '<rect x="10" y="49" width="22" height="6" rx="3" fill="#fff"/><circle cx="44" cy="18" r="7" fill="#fff"/><path d="M23 45L37 26" stroke="#fff8" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/>',
  ship: '<path d="M8 36h48l-8 12H16z" fill="#fff"/><rect x="22" y="25" width="18" height="9" rx="1.5" fill="#fffb"/><rect x="29.5" y="13" width="3" height="11" fill="#fff"/><path d="M4 56c6-4 10 4 16 0s10 4 16 0 10 4 16 0 8 3 8 3" stroke="#fff8" stroke-width="3" fill="none" stroke-linecap="round"/>',
  letters: '<rect x="5" y="20" width="16" height="22" rx="3" fill="#fff"/><rect x="24" y="20" width="16" height="22" rx="3" fill="#fff"/><rect x="43" y="20" width="16" height="22" rx="3" fill="#fff8"/><g font-size="13" font-weight="800" text-anchor="middle" fill="#333" font-family="Rubik,sans-serif"><text x="13" y="36">A</text><text x="32" y="36">B</text><text x="51" y="36">C</text></g>',
  star: '<path d="M32 9l6.2 14.1 15.3 1.4-11.6 10.2 3.4 15L32 41.9l-13.3 7.8 3.4-15L10.5 24.5l15.3-1.4z" fill="#fff"/>',
  target: '<circle cx="32" cy="32" r="22" fill="#fff"/><circle cx="32" cy="32" r="15" fill="none" stroke="#e2412f" stroke-width="5"/><circle cx="32" cy="32" r="5.5" fill="#e2412f"/>',
  hole: '<ellipse cx="32" cy="50" rx="22" ry="6" fill="#ffffff40"/><ellipse cx="38" cy="50" rx="5" ry="1.8" fill="#0007"/><rect x="37" y="12" width="2.5" height="38" fill="#fff"/><path d="M39.5 12l13 5.5-13 5.5z" fill="#ffc23d"/><circle cx="19" cy="46" r="4.5" fill="#fff"/>',
  maze: '<path d="M10 10h44v44H10zM10 22h30M24 22v20M24 42h20M44 22v20M54 32H44" stroke="#fff" stroke-width="4" fill="none" stroke-linejoin="round"/>',
  car: '<path d="M18 30l5-10h18l5 10" fill="#fffa"/><rect x="9" y="30" width="46" height="13" rx="5" fill="#fff"/><circle cx="20" cy="45" r="5.5" fill="#222" stroke="#fff" stroke-width="2"/><circle cx="44" cy="45" r="5.5" fill="#222" stroke="#fff" stroke-width="2"/>',
};
const art = (g, size = 64) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${GLYPH[g.glyph] || GLYPH.tiles}</svg>`;
const playersLabel = g => g.solo ? `1–${g.maxP} players` : g.minP === g.maxP ? g.maxP + ' players' : `${g.minP}–${g.maxP} players`;
function onlineIn(gid) { return Store.peerStates().filter(p => p.game === gid).length; }
function tile(g, big) { const live = onlineIn(g.id), hid = Hide.is(g.id), hm = Hide.mode(), fav = typeof Fav !== 'undefined' && Fav.has(g.id);
  return `<a class="tile ${big ? 'big' : ''} ${isPlayable(g.id) ? '' : 'soon'} ${hid ? 'hidg' : ''}" href="#game-${g.id}" style="--c:${CAT_COLOR[g.cat]}"><button class="tfav ${fav ? 'on' : ''}" data-fav="${g.id}" aria-label="${fav ? 'Remove from' : 'Add to'} favourites" title="${fav ? 'Remove from' : 'Add to'} favourites">${fav ? '♥' : '♡'}</button>${typeof NEWSET !== 'undefined' && NEWSET.has(g.id) ? '<span class="tnew">New</span>' : ''}${hm ? `<button class="hidebtn ${hid ? 'on' : ''}" data-hide="${g.id}" title="${hid ? 'Hidden from the public. Tap to show it again' : 'Hide this game from the public'}" aria-label="${hid ? 'Unhide' : 'Hide'} ${esc(g.name)}"><svg viewBox="0 0 24 24" class="ic"><path d="${hid ? 'M3 3l18 18M10.6 6.1A10 10 0 0122 12a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 7 10 7a9.7 9.7 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2' : 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z'}"/></svg><span>${hid ? 'Hidden' : 'Hide'}</span></button>` : ''}<span class="art">${art(g, big ? 84 : 56)}</span><span class="tn">${esc(g.name)}</span><span class="tm">${g.cat} · ${playersLabel(g)}${live ? ` · <b>${live} here</b>` : ''}</span>${isPlayable(g.id) ? '' : '<span class="tag">Rules ready · game in progress</span>'}</a>`; }

// ---------- Shell ----------
const NAV = [['home', 'Games'], ['feed', 'Feed'], ['explore', 'Explore'], ['watch', 'Watch'], ['communities', 'Communities'], ['messages', 'Messages'], ['people', 'Friends'], ['match', 'Match'], ['qa', 'Questions'], ['local', 'Neighbourhood'], ['events', 'Events'], ['leaders', 'Leaderboards'], ['tournaments', 'Tournaments'], ['tv', 'Live games'], ['rewards', 'Rewards'], ['membership', 'Membership'], ['donate', 'Donate']];
const NAVI = { tournaments: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4', tv: 'M3 6h18v12H3zM8 21h8M10 9l5 3-5 3z', rewards: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7a3 3 0 10-3-3c0 2 3 3 3 3zm0 0a3 3 0 113-3c0 2-3 3-3 3z', donate: 'M12 21s-8-5-8-11a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11zM12 8v6M9 11h6', developer: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16', watch: 'M4 5h16v14H4zM10 9l5 3-5 3z', home: 'M4 10l8-6 8 6v10H4z', feed: 'M4 5h16M4 12h16M4 19h10', explore: 'M12 3a9 9 0 100 18 9 9 0 000-18zm3 6l-2 5-5 2 2-5z', communities: 'M7 11a3 3 0 100-6 3 3 0 000 6zm10 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 2-5 5-5s5 2 5 5m0 0c0-3 2-5 5-5s5 2 5 5', messages: 'M4 5h16v11H9l-5 4z', people: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-7 7-7s7 3 7 7M17 8h5M19.5 5.5v5', match: 'M12 20s-8-5-8-11a4 4 0 018-1 4 4 0 018 1c0 6-8 11-8 11z', qa: 'M9 9a3 3 0 116 0c0 2-3 2-3 5M12 18h.01M12 3a9 9 0 100 18 9 9 0 000-18z', local: 'M12 21s-7-6-7-12a7 7 0 0114 0c0 6-7 12-7 12zm0-9a3 3 0 100-6 3 3 0 000 6z', events: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', leaders: 'M6 20V10M12 20V4M18 20v-7', membership: 'M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z', admin: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z', profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9c0-4 4-6 8-6s8 2 8 6' };
const icon = k => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="${NAVI[k] || NAVI.home}"/></svg>`;
function shell() {
  const left = Quota.left(), notes = Notif.list(), unseen = notes.filter(n => n.ts > LS.get('nseen', 0)).length;
  $('#quota').innerHTML = left === Infinity ? '<b>Member</b> · unlimited games' : `<b>${left}</b> of ${Quota.LIMIT} games left today`;
  $('#quota').className = 'quota' + (left === 0 ? ' out' : '');
  $('#bell').innerHTML = `<svg viewBox="0 0 24 24" class="ic"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/></svg>${unseen ? `<i class="dot">${unseen > 9 ? '9+' : unseen}</i>` : ''}`;
  if (typeof Site !== 'undefined') Site.acct();
  $('#musicbtn').classList.toggle('on', Music.on); $('#musicbtn').setAttribute('aria-pressed', Music.on);
  const nav = NAV.filter(([k]) => !(typeof Family !== 'undefined' && Family.on() && Family.hidden.includes(k))).concat(typeof Dev !== 'undefined' && Dev.allowed() ? [['developer', 'Developer']] : []);
  $('#rail').innerHTML = nav.map(([k, l]) => `<a href="#${k}" class="${App.view === k || (App.view === 'game' && k === 'home') ? 'on' : ''}">${icon(k)}<span>${l}</span>${k === 'messages' && Notif.unread() ? `<i class="dot">${Notif.unread()}</i>` : ''}</a>`).join('') + '<div id="mode"></div>';
  $('#mode').innerHTML = Store.mode === 'shared' ? `<i class="live"></i>${Store.online().size} online${Store.slow ? ' · data is slow to load' : ''}${!Store.canWrite ? ' · view-only' : ''}` : 'Solo mode · saved in this browser';
}
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'home'; const m = h.match(/^([a-z]+)(?:-(.+))?$/) || ['', 'home'];
  let v = m[1], arg = m[2] || null; if (!VIEWS[v]) { v = 'home'; arg = null; } if (typeof Family !== 'undefined' && Family.on() && Family.hidden.includes(v)) { v = 'home'; arg = null; }
  if (App.cleanup) { try { App.cleanup(); } catch (e) {} App.cleanup = null; }
  App.view = v; App.arg = arg; Store.presence({ at: v, game: v === 'game' ? arg : v === 'table' ? (Store.get('tables', arg) || {}).game : null, table: v === 'table' ? arg : null });
  window.scrollTo(0, 0); main().onclick = null; render(true);
}
function render(force) { try { renderInner(force); } catch (e) { console.error(e); const el = main(); if (el && !el.querySelector('.errnote')) el.insertAdjacentHTML('afterbegin', `<div class="errnote">This view hit a problem (${esc(e && e.message || e)}). Other pages still work. <button class="btn sm" onclick="location.hash='home'">Go to games</button></div>`); } }
function renderInner(force) {
  if (!Store.ready || !App.view) return; try { shell(); } catch (e) { console.error('shell', e); }
  const el = main(), V = VIEWS[App.view];
  if (!force) { const a = document.activeElement; if (a && el.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.value) { App.dirty = true; return; } }
  if (!force && V.update) { V.update(el, App.arg); return; }
  if (!force && V.live === false) return;
  V.render(el, App.arg); App.dirty = false;
}
let rt = null; Store.onChange = kind => { clearTimeout(rt); rt = setTimeout(() => render(false), 120); };
document.addEventListener('focusout', () => { if (App.dirty) setTimeout(() => { if (!(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render(false); }, 200); });

document.addEventListener('click', e => { const f = e.target.closest && e.target.closest('[data-fav]'); if (f) { e.preventDefault(); e.stopPropagation(); Fav.toggle(f.dataset.fav); return; } }, true);
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-hide]'); if (!b) return; e.preventDefault(); e.stopPropagation(); if (Hide.mode()) Hide.toggle(b.dataset.hide); }, true);

// ---------- Modal ----------
function modal(html, cls = '') { const m = $('#modal'); m.innerHTML = `<div class="mback" data-close="1"></div><div class="mbox ${cls}" role="dialog" aria-modal="true"><button class="x" data-close="1" aria-label="Close">×</button>${html}</div>`; m.classList.add('open'); return m.querySelector('.mbox'); }
function closeModal() { const m = $('#modal'); if (m._cleanup) { m._cleanup(); m._cleanup = null; } m.classList.remove('open'); m.innerHTML = ''; }
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

// ---------- Home ----------
VIEWS.home = { render(el) {
  const tops = TOP.map(id => GAME[id]).filter(g => Hide.shows(g.id)), invites = Store.all('tables').filter(t => Hide.shows(t.game) && t.status === 'open' && arr(t.invited).includes(Store.uid) && !arr(t.seats).includes(Store.uid));
  const open = Store.all('tables').filter(t => Hide.shows(t.game) && t.status === 'open' && now() - t.ts < 6 * 3600e3 && arr(t.seats).includes(null)).slice(0, 8);
  const live = Store.all('tables').filter(t => t.status === 'playing' && now() - t.ts < 3600e3).slice(0, 6);
  const shown = libFilter(pubCat());
  el.innerHTML = `<section class="hero band"><div class="herot"><h1>Top games tonight</h1><p>Pick a classic, set the computer from 1 to 10, or pull up a chair at a live table. ${Quota.left() === Infinity ? 'You have unlimited games as a member.' : `Free players get ${Quota.LIMIT} games a day — you have <b>${Quota.left()}</b> left.`}</p></div>
    <div class="topgrid">${tops.map(g => tile(g, true)).join('')}</div></section>
    <section class="band tight homex"><div class="homecol">${dailyCard()}</div><div class="homecol"><h3>Today's quests <a class="small" href="#rewards">All rewards</a></h3>${Quests.today().map(([qid, name, need]) => { const st = Quests.state(), n = Math.min(need, st.prog[qid] || 0); return `<div class="quest sm ${st.done.includes(qid) ? 'done' : ''}"><b>${esc(name)}</b><div class="prog"><i style="width:${n / need * 100}%"></i></div></div>`; }).join('')}<p class="muted small">${Coins.get()} coins · ${(me().streak || {}).n || 0}-day streak</p><form class="codejoin" id="hcj"><input placeholder="Have a join code?" maxlength="6" aria-label="Join a table with a code" autocomplete="off"><button class="btn sm">Join</button></form></div></section>
    ${(() => { const yt = Store.all('tables').filter(t => t.status === 'playing' && arr(t.seats).includes(Store.uid) && TB[t.game] && t.state && arr(t.seats)[TB[t.game].turn(t.state)] === Store.uid); return yt.length ? `<section class="band tight"><h2>Your turn</h2><div class="tables">${yt.map(tableCard).join('')}</div></section>` : ''; })()}
    ${arr(me().favs).length ? `<section class="band tight"><h2>Favourites</h2><div class="row-scroll">${arr(me().favs).map(id => GAME[id]).filter(g => g && Hide.shows(g.id)).map(g => tile(g)).join('')}</div></section>` : ''}
    ${arr(me().recent).length ? `<section class="band tight"><h2>Recently played</h2><div class="row-scroll">${arr(me().recent).map(id => GAME[id]).filter(g => g && Hide.shows(g.id)).map(g => tile(g)).join('')}</div></section>` : ''}
    ${invites.length ? `<section class="band tight"><h2>Challenges for you</h2><div class="tables">${invites.map(tableCard).join('')}</div></section>` : ''}
    ${open.length || live.length ? `<section class="band tight"><h2>Live tables</h2><div class="tables">${open.concat(live).map(tableCard).join('')}</div></section>` : ''}
    <section class="band lib"><div class="libhead"><h2>The full library <small>${pubCat().length} games${Hide.list().length && Hide.mode() ? ` · ${Hide.list().length} hidden from the public` : ''}</small></h2><input id="libq" type="search" placeholder="Search the library" value="${esc(App.libq)}" aria-label="Search the library"></div>
    <div class="chips">${['All', 'Free', 'New', ...CATS].map(c => `<button class="chip ${App.cat === c ? 'on' : ''}" data-cat="${c}">${c === 'Free' && typeof Access !== 'undefined' ? 'Free (' + Access.list().size + ')' : c}</button>`).join('')}</div><div class="libtools"><label class="fld inline">Players <select id="libp">${[['any', 'Any number'], ['1', 'Solo'], ['2', '2 players'], ['34', '3–4 players'], ['58', '5–8 players']].map(([v, l]) => `<option value="${v}" ${App.libp === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="fld inline">Sort <select id="libs">${[['pop', 'Most popular'], ['played', 'Most played'], ['rated', 'Top rated'], ['new', 'Newest'], ['az', 'A to Z']].map(([v, l]) => `<option value="${v}" ${App.libs === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn sm" id="surprise">Surprise me</button></div>
    <div class="libgrid">${shown.map(g => tile(g)).join('') || '<p class="empty">No games match that search.</p>'}</div></section>`;
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { App.cat = b.dataset.cat; render(true); });
  const q = $('#libq'); q.oninput = () => { App.libq = q.value; const g = el.querySelector('.libgrid'); g.innerHTML = libFilter(pubCat()).map(x => tile(x)).join('') || '<p class="empty">No games match that search.</p>'; };
  $('#libp').onchange = e => { App.libp = e.target.value; render(true); }; $('#libs').onchange = e => { App.libs = e.target.value; render(true); }; $('#surprise').onclick = () => { const p = libFilter(pubCat()); if (p.length) location.hash = 'game-' + p[Math.floor(Math.random() * p.length)].id; };
  $('#hcj').onsubmit = e => { e.preventDefault(); joinByCode(e.target.querySelector('input').value); }; const dg = $('#dgo'); if (dg) dg.onclick = () => Daily.start();
} };
function libFilter(list) { const q = (App.libq || '').toLowerCase(), p = App.libp || 'any', s = App.libs || 'pop';
  let out = list.filter(g => (App.cat === 'All' || g.cat === App.cat || (App.cat === 'New' && NEWSET.has(g.id)) || (App.cat === 'Free' && typeof Access !== 'undefined' && Access.free(g.id))) && (!q || g.name.toLowerCase().includes(q)) && (p === 'any' || (p === '1' ? g.minP <= 1 : p === '2' ? g.minP <= 2 && g.maxP >= 2 : p === '34' ? g.maxP >= 3 && g.minP <= 4 : g.maxP >= 5)));
  const playsOf = id => Store.all('profiles').reduce((a, pr) => a + (((pr.scores || {})[id] || {}).plays || 0), 0);
  if (s === 'played') { const m = Object.fromEntries(out.map(g => [g.id, playsOf(g.id)])); out = out.slice().sort((a, b) => m[b.id] - m[a.id]); }
  if (s === 'rated') out = out.slice().sort((a, b) => Reviews.avg(b.id) - Reviews.avg(a.id) || Reviews.of(b.id).length - Reviews.of(a.id).length);
  if (s === 'new') out = out.slice().sort((a, b) => b.rank - a.rank); if (s === 'az') out = out.slice().sort((a, b) => a.name.localeCompare(b.name)); return out; }
function ratingTable(gid, n) { const rows = Store.all('profiles').filter(p => ((p.ratings || {})[gid] || {}).n).map(p => ({ id: p.id, r: p.ratings[gid].r, n: p.ratings[gid].n })).sort((a, b) => b.r - a.r).slice(0, n);
  return rows.length ? `<table class="lb"><thead><tr><th>#</th><th>Player</th><th class="num">Rating</th><th class="num">Games</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${avatar(r.id, 22)} ${nameLink(r.id)}</td><td class="num">${r.r}${r.n < 10 ? '?' : ''}</td><td class="num">${r.n}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No rated games yet. Play people online to get a rating.</p>'; }
function tableCard(t) { const g = GAME[t.game] || { name: t.game, cat: 'Board' }; const seats = arr(t.seats); const free = seats.filter(s => s === null).length;
  return `<a class="tcard" href="#table-${t.id}" style="--c:${CAT_COLOR[g.cat]}"><span class="art">${art(g, 40)}</span><span><b>${esc(g.name)}</b><small>${t.status === 'playing' ? 'In play · watch' : free ? `${free} seat${free > 1 ? 's' : ''} open` : 'Full'} · hosted by ${esc(Names.of(t.host))}</small></span></a>`; }

// ---------- Game page ----------
VIEWS.game = { render(el, id) {
  const g = GAME[id]; if (!g) { location.hash = 'home'; return; }
  if (Hide.is(id) && !(typeof Dev !== 'undefined' && Dev.allowed())) { el.innerHTML = '<section class="band"><h1>Game not available</h1><p>This game isn\'t available right now.</p><a class="btn hot" href="#home">Browse all games</a></section>'; return; }
  const tb = TB[id], so = SO[id], lvl = App.lvl[id] || LS.get('deflvl', 3), tab = App.gtab || 'rules';
  const openT = Store.all('tables').filter(t => t.game === id && t.status !== 'done' && now() - t.ts < 6 * 3600e3);
  el.innerHTML = `<section class="ghead" style="--c:${CAT_COLOR[g.cat]}"><a href="#home" class="back">← All games</a><div class="ghrow"><span class="art">${art(g, 72)}</span><div><h1>${esc(g.name)} ${NEWSET.has(id) ? '<span class="pill hot">New</span>' : ''}</h1><p>${g.cat} · ${playersLabel(g)}${tb ? ' · computer opponent levels 1–10' : so ? ' · difficulty levels 1–10' : ''}</p><p class="gmeta">${Reviews.of(id).length ? `${stars(Reviews.avg(id))} ${Reviews.avg(id).toFixed(1)} · ${Reviews.of(id).length} review${Reviews.of(id).length > 1 ? 's' : ''}` : 'No reviews yet'}${tb && g.maxP >= 2 ? ` · your rating <b>${Rating.label(Store.uid, id)}</b>` : ''} <button class="favbtn ${Fav.has(id) ? 'on' : ''}" id="favb" aria-pressed="${Fav.has(id)}">${Fav.has(id) ? '♥ Favourite' : '♡ Add to favourites'}</button></p></div></div></section>
    <div class="gwrap"><div class="stage" id="stage">
      ${isPlayable(id) ? `<div class="setup">
        <label class="lvl">Computer difficulty <output id="lvo">${lvl}</output><input type="range" id="lvl" min="1" max="10" value="${lvl}"><span class="lvlh"><span>1 · relaxed</span><span>10 · ruthless</span></span></label>
        ${tb && g.maxP > 2 ? `<label class="fld">Players at the table (computer players fill every empty seat) <select id="np">${[...Array(g.maxP - Math.max(2, g.minP) + 1)].map((_, k) => { const n = Math.max(2, g.minP) + k; return `<option ${n === 2 ? 'selected' : ''}>${n}</option>`; }).join('')}</select></label>` : ''}${so ? `<label class="fld">Players <select id="np">${[...Array(g.maxP)].map((_, k) => `<option value="${k + 1}" ${k === 0 ? 'selected' : ''}>${k === 0 ? '1 · just me' : `${k + 1} · compete (you + ${k})`}</option>`).join('')}</select></label>` : ''}
        <div class="row-btns"><button class="btn hot big" id="vsai">${tb ? 'Play vs computer' : 'Play'}</button>${tb ? '<button class="btn big" id="hot">Pass &amp; play on this device</button>' : ''}</div>
        ${tb || so ? `${so ? '<p class="muted small">Compete: everyone plays the same game at the same time, with a live scoreboard. With computers you race their scores; online, invite up to 7 people.</p>' : ''}<div class="row-btns">${tb ? '<button class="btn hot" id="qm">Quick match</button>' : ''}<button class="btn" id="mkt">${so ? 'Open an online race' : 'Open an online table'}</button><button class="btn" id="chal">Challenge friends or a group</button></div>${tb && Math.max(2, g.minP) === 2 ? `<label class="fld inline">Clock for online games <select id="qtc">${TCS.map(([v, l]) => `<option value="${v}" ${v === (App.qtc || 'none') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}<form class="codejoin" id="cj"><input placeholder="Join code" maxlength="6" aria-label="Join a table with a code" autocomplete="off"><button class="btn sm">Join</button></form>
          <div class="otables"><h3>Tables for ${esc(g.name)}</h3>${openT.length ? `<div class="tables">${openT.map(tableCard).join('')}</div>` : '<p class="muted">No tables yet. Open one and invite people.</p>'}</div>` : ''}
        <button class="btn ghost" id="tut">Watch the motion tutorial</button>
        <p class="muted small">${Quota.left() === Infinity ? 'Member: unlimited games.' : `Each game you play — against the computer, as challenger or as the one challenged — uses 1 of your ${Quota.LIMIT} daily games. ${Quota.left()} left today. Tutorials and watching are free.`}</p></div>`
      : `<div class="setup soon"><h3>Rules and guide are ready</h3><p>The playable version of ${esc(g.name)} is still being built. Learn it now with the motion tutorial, talk tactics in the comments, and look out for it in the library.</p><button class="btn hot" id="tut">Watch the motion tutorial</button></div>`}
    </div><aside class="side"><div class="tabs">${[['rules', 'Rules'], ['guide', 'Guide'], ['leaders', 'Highscores'], ['reviews', 'Reviews'], ['talk', 'Comments']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="tabc"></div></aside></div>`;
  const tc = $('#tabc'); const showTab = k => { App.gtab = k; el.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    if (k === 'rules') tc.innerHTML = `<ol class="rules">${g.rules.split(/(?<=\.)\s+/).map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
    if (k === 'guide') tc.innerHTML = `<p class="tip"><b>Strategy tip.</b> ${esc(g.tip)}</p>${tb ? `<p class="muted small">Controls: tap a square or piece; for pieces that move, tap the piece and then its destination.</p>` : so ? '<p class="muted small">Controls: arrow keys or WASD, Space for action. On phones use the on-screen pad or swipe.</p>' : ''}<p class="muted small">Difficulty 1–3 makes many casual moves, 4–7 thinks a few moves ahead, 8–10 searches deepest and rarely blunders.</p>`;
    if (k === 'leaders') tc.innerHTML = leaderTable(id, 15) + (tb ? `<h4>Top rated players</h4>${ratingTable(id, 10)}` : '');
    if (k === 'reviews') { const rs = Reviews.of(id).sort((a, b) => b.ts - a.ts), mine = rs.find(r => r.uid === Store.uid);
      tc.innerHTML = `<form id="rvf" class="aform"><label class="fld">Your rating<span class="starpick">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-st="${n}" class="${mine && mine.stars >= n ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</span></label><label class="fld">Review (optional)<textarea name="text" rows="3" maxlength="600">${esc((mine || {}).text || '')}</textarea></label><button class="btn hot sm">${mine ? 'Update review' : 'Post review'}</button></form>
        ${rs.map(r => `<div class="rev">${avatar(r.uid, 24)} <b>${nameLink(r.uid)}</b> ${stars(r.stars, 12)} <small class="muted">${ago(r.ts)}</small>${r.text ? `<p>${esc(r.text)}</p>` : ''}</div>`).join('') || '<p class="muted">Be the first to review this game.</p>'}`;
      let pick = mine ? mine.stars : 0; tc.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { pick = +b.dataset.st; tc.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', +x.dataset.st <= pick)); });
      $('#rvf').onsubmit = async e => { e.preventDefault(); if (!pick) return toast('Pick 1 to 5 stars.'); await Reviews.save(id, pick, e.target.text.value); toast('Thanks for your review!'); showTab('reviews'); }; }
    if (k === 'talk') { tc.innerHTML = threadHTML('game:' + id); bindThread(tc, 'game:' + id); } };
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab)); showTab(tab);
  const lv = $('#lvl'); if (lv) lv.oninput = () => { $('#lvo').textContent = lv.value; App.lvl[id] = +lv.value; LS.set('lvl', App.lvl); };
  const np = () => +(($('#np') || {}).value || Math.max(g.minP, 2)); const npOnline = () => Math.max(2, np());
  $('#tut') && ($('#tut').onclick = () => tutorial(id)); $('#favb').onclick = () => Fav.toggle(id); $('#qm') && ($('#qm').onclick = () => quickMatch(id)); $('#qtc') && ($('#qtc').onchange = e => { App.qtc = e.target.value; }); $('#cj') && ($('#cj').onsubmit = e => { e.preventDefault(); joinByCode(e.target.querySelector('input').value); });
  $('#vsai') && ($('#vsai').onclick = async () => { if (!await gate()) return; const L = App.lvl[id] || LS.get('deflvl', 3); if (tb) startLocal(id, [{ h: 1 }, ...[...Array(np() - 1)].map(() => ({ ai: L }))], L); else if (np() > 1) startCompete(id, L, np() - 1); else startSolo(id, L); });
  const npSel = $('#np'); if (npSel && so) npSel.onchange = () => { $('#vsai').textContent = np() > 1 ? `Compete vs ${np() - 1} computer${np() > 2 ? 's' : ''}` : 'Play'; };
  $('#hot') && ($('#hot').onclick = async () => { if (!await gate()) return; startLocal(id, [...Array(np())].map(() => ({ h: 1 })), 0, true); });
  $('#mkt') && ($('#mkt').onclick = async () => { const tid = await createTable(id, npOnline(), []); if (!tid) return; location.hash = 'table-' + tid; });
  $('#chal') && ($('#chal').onclick = () => challenge(id, npOnline()));
}, update(el, id) { const tc = $('#tabc'); if (App.gtab === 'talk' && tc) { const box = tc.querySelector('textarea'); if (!(box && box.value)) { tc.innerHTML = threadHTML('game:' + id); bindThread(tc, 'game:' + id); } } if (App.gtab === 'leaders' && tc) tc.innerHTML = leaderTable(id, 15); shell(); } };
async function gate() { if (Quota.left() > 0) { return await Quota.use(); }
  modal(`<h2>You've played your ${Quota.LIMIT} games today</h2><p>Free players get ${Quota.LIMIT} games a day, and the count resets at midnight. Members play without limits.</p><div class="row-btns"><a class="btn hot" href="#membership" data-close="1">See membership</a><button class="btn" data-close="1">Maybe later</button></div><p class="muted small">You can still watch tables, read rules and use every social feature.</p>`); return false; }

// ---------- Local match controller (vs computer / pass & play) ----------
function startLocal(id, seats, level, hotseat) {
  const G = TB[id], g = GAME[id], n = seats.length;
  if (G.needsWords && !Words.ready) { $('#stage').innerHTML = '<p class="muted">Loading the dictionary…</p>'; Words.load().then(() => startLocal(id, seats, level, hotseat)); return; } let s = G.init(n), over = false, aiT = null; const names = seats.map((x, i) => x.ai ? `Computer ${n > 2 ? i : ''} · L${x.ai}`.replace('  ', ' ') : hotseat ? `Player ${i + 1}` : 'You');
  const st = $('#stage'); st.innerHTML = `<div class="match"><div class="mbar" id="mbar"></div><div class="board" id="board"></div><div class="row-btns"><button class="btn" id="resign">Resign</button><button class="btn" id="again">New game</button><button class="btn ghost" id="setup">Back to setup</button></div></div>`;
  const x = { el: $('#board'), names, sel: null, on(fn) { this.el.onclick = e => { const t = e.target.closest('[data-i]'); if (t && !t.disabled && t.dataset.i !== '' && this.el.contains(t)) fn(t.dataset.i); }; }, redraw: () => draw(), act: m => act(m) };
  const humanAt = t => !!seats[t] && !!seats[t].h; let hist = [], plies = 0, practice = false; const init0 = s, moves = [];
  const v2 = V2.local({ hotseat, over: () => over, practice: () => { practice = true; },
    undo: () => { if (!hist.length) return false; clearTimeout(aiT); const h = hist.pop(); s = h.s; plies = h.p; moves.length = h.mv; over = false; practice = true; $('#board').querySelectorAll('.v2over').forEach(e => e.remove()); draw(); return true; },
    hint: () => { if (over || G.result(s) || !humanAt(G.turn(s))) { toast('Wait for your turn.'); return undefined; } const m = aiMove(G, s, 10); return m === null ? undefined : m; },
    play: m => act(m) });
  function draw() { const r = G.result(s), t = G.turn(s); x.me = hotseat ? t : 0; x.hot = hotseat; x.can = !r && !over && humanAt(t) && (hotseat || t === 0);
    $('#mbar').innerHTML = r || over ? resultLine(r, names, hotseat ? -1 : 0) : `<span class="turn" style="--c:${SEATCOL[t % 8]}">${esc(names[t])}${G.seats ? ' · ' + esc(G.seats[t] || '') : ''}</span><span class="muted">${humanAt(t) ? 'your move' : 'thinking…'}</span>`;
    v2view(G, s, x); v2 && v2.moves(plies + 1); }
  function act(m) { if (over || G.result(s)) return; if (!legal(G, s, m)) { console.warn('ui-illegal', id, JSON.stringify(m)); toast("That move isn't allowed."); return; } hist.push({ s, p: plies, mv: moves.length }); if (hist.length > 300) hist.shift(); s = G.play(s, m); moves.push(m); plies++; x.sel = null; beepMove(); draw(); after(); }
  function after() { const r = G.result(s); if (r) return finish(r); const t = G.turn(s); if (seats[t].ai) { clearTimeout(aiT); aiT = setTimeout(() => { const m = aiMove(G, s, seats[t].ai); if (m !== null && m !== undefined) { s = G.play(s, m); moves.push(m); plies++; Ver.is2() ? beep(380, 0.05, 'triangle', 0.04) : beepMove(); draw(); after(); } }, 380 + R(300)); } }
  function finish(r) { over = true; draw(); const out = hotseat ? null : outcomeFor(r, 0); if (!hotseat && !practice) { recordResult(id, { outcome: out, level: level || 1, score: r.winner === 0 ? level * 10 : 0 }); celebrate(out); }
    v2result($('#board'), { title: hotseat ? (r.winner === -1 ? 'Draw' : (r.team ? `${names[r.winner]} & ${names[r.winner + 2]} win` : `${names[r.winner]} wins`)) : out === 'win' ? 'You win!' : out === 'draw' ? 'Draw' : 'You lost', sub: `${plies} moves${practice && !hotseat ? ' · practice game (undo or hints used), not recorded' : ''}`, win: out === 'win' || hotseat, buttons: [['again', 'Play again', 1], ['lreplay', 'Watch replay'], ['setup', 'Back to setup']] }); Replays.local = { game: id, init: init0, moves: moves.slice(), names: names.slice(), result: r, ts: now() }; }
  $('#resign').onclick = () => { if (over) return; over = true; clearTimeout(aiT); $('#mbar').innerHTML = '<b>You resigned.</b>'; if (!hotseat) recordResult(id, { outcome: 'loss', level }); };
  { const rb = document.createElement('button'); rb.id = 'lreplay'; rb.className = 'btn'; rb.textContent = 'Watch replay'; rb.hidden = true; rb.onclick = () => { Replays.local = Replays.local || { game: id, init: init0, moves: moves.slice(), names: names.slice(), result: null }; location.hash = 'replay-local'; }; $('#again').after(rb); }
  $('#again').onclick = async () => { clearTimeout(aiT); v2 && v2.stop(); if (!await gate()) return; startLocal(id, seats, level, hotseat); };
  $('#setup').onclick = () => { clearTimeout(aiT); v2 && v2.stop(); render(true); };
  App.cleanup = () => { clearTimeout(aiT); v2 && v2.stop(); }; VIEWS.game.live = false; const old = App.cleanup; App.cleanup = () => { old(); VIEWS.game.live = true; };
  draw(); after();
}
const legal = (G, s, m) => G.check ? G.check(s, m) : G.moves(s).some(v => JSON.stringify(v) === JSON.stringify(m));
const outcomeFor = (r, seat) => r.winner === -1 ? 'draw' : (r.team ? seat % 2 === r.winner : r.winner === seat) ? 'win' : 'loss';
const beepMove = () => beep(520, 0.04, 'triangle', 0.04);
function resultLine(r, names, mySeat) { if (!r) return '<b>Game over.</b>'; const sc = r.score ? ` <span class="muted">(${r.score.map(v => Math.round(v * 10) / 10).join(' – ')})</span>` : ''; if (r.winner === -1) return `<b>Draw.</b>${sc}`; const mine = mySeat >= 0 && outcomeFor(r, mySeat) === 'win'; const who = r.team ? `${esc(names[r.winner])} &amp; ${esc(names[r.winner + 2])}` : esc(names[r.winner]); return `<b>${mine ? (r.team ? 'Your team wins!' : 'You win!') : who + (r.team ? ' win.' : ' wins.')}</b>${sc}`; }
function celebrate(out) { if (out === 'win') { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .12, 'square', .05), i * 110)); toast('Victory recorded on the leaderboard.'); } }

// ---------- Solo games ----------
function startSolo(id, level) {
  const st = $('#stage'); let score = 0, ended = false; st.innerHTML = `<div class="match"><div class="mbar"><span>Score <b id="sc">0</b></span><span class="muted">Level ${level}</span></div><div class="board solo" id="board"></div><div class="row-btns"><button class="btn" id="again">New game</button><button class="btn ghost" id="setup">Back to setup</button></div></div>`;
  const host = document.createElement('div'); host.className = 'sohost'; $('#board').appendChild(host); let stop = null, alive = true; const ui = V2.soloUI(id), best = ui ? ui.best : 0;
  const run = () => { if (!alive) return; stop = SO[id].start(host, { level, score: v => { if (ui && v > score) scorePop($('#sc'), v - score); score = v; const e = $('#sc'); if (e) e.textContent = Math.round(v); }, end: ({ score: v, won }) => { if (ended) return; ended = true; score = v ?? score; recordResult(id, { score, outcome: won ? 'win' : won === false ? 'loss' : undefined, level }); const nb = ui && score > best && score > 0; const b = document.createElement('div'); b.className = 'endcard'; b.innerHTML = `<b>${won ? 'Well played!' : 'Game over'}</b><span>Score ${Math.round(score)}</span>${nb ? '<span>New personal best!</span>' : ''}`; $('#board') && $('#board').appendChild(b); if (won) celebrate('win'); if (nb || (ui && won)) confetti(); } }); };
  ui ? ui.begin(run) : run();
  App.cleanup = () => { alive = false; ui && ui.cleanup(); try { stop && stop(); } catch (e) {} VIEWS.game.live = true; }; VIEWS.game.live = false;
  $('#again').onclick = async () => { if (!await gate()) return; App.cleanup(); startSolo(id, level); };
  $('#setup').onclick = () => { App.cleanup(); App.cleanup = null; render(true); };
}

// ---------- Online tables ----------
async function createTable(gid, n, invited) { if (Quota.left() <= 0) { gate(); return null; } const id = uid8(); const seats = [Store.uid, ...Array(n - 1).fill(null)]; await Store.put('tables', id, { game: gid, host: Store.uid, seats, n, status: 'open', invited, ts: now(), state: null, round: 0, code: Tbl.code(), tc: n === 2 && TB[gid] ? (App.qtc || 'none') : 'none', ...(SO[gid] ? { mode: 'race', limit: 300 } : {}) }); return id; }
function challenge(gid, n) {
  const fr = arr(me().friends).filter(isFriend), groups = Store.all('chats').filter(c => c.kind !== 'dm' && arr(c.members).includes(Store.uid)), comms = Store.all('communities').filter(c => arr(me().joined).includes(c.id));
  const box = modal(`<h2>Challenge to ${esc(GAME[gid].name)}</h2><p class="muted">Invite people to your table. ${n} seats: the first to arrive sit down; anyone extra can watch or start their own table.</p>
    <h4>Friends</h4><div class="picks">${fr.map(id => `<label class="pick"><input type="checkbox" value="${esc(id)}" data-k="u">${avatar(id, 28)} ${esc(Names.of(id))}</label>`).join('') || '<p class="muted small">Add friends from the Friends page to challenge them.</p>'}</div>
    <h4>Groups and communities</h4><div class="picks">${groups.map(c => `<label class="pick"><input type="checkbox" value="${esc(c.id)}" data-k="c">${esc(c.name || 'Group')} <small>${arr(c.members).length} members</small></label>`).join('')}${comms.map(c => `<label class="pick"><input type="checkbox" value="${esc(c.id)}" data-k="m">${esc(c.name)} <small>community</small></label>`).join('') || (groups.length ? '' : '<p class="muted small">Join a group chat or community to challenge it.</p>')}</div>
    <div class="row-btns"><button class="btn hot" id="send">Send challenge</button></div>`);
  box.querySelector('#send').onclick = async () => { const ids = new Set(); box.querySelectorAll('input:checked').forEach(i => { if (i.dataset.k === 'u') ids.add(i.value); if (i.dataset.k === 'c') arr((Store.get('chats', i.value) || {}).members).forEach(m => ids.add(m)); if (i.dataset.k === 'm') Store.all('profiles').filter(p => arr(p.joined).includes(i.value)).forEach(p => ids.add(p.id)); });
    ids.delete(Store.uid); if (!ids.size) return toast('Pick at least one person or group.'); const tid = await createTable(gid, n, [...ids]); if (!tid) return; closeModal(); toast(`Challenge sent to ${ids.size} ${ids.size > 1 ? 'people' : 'person'}.`); location.hash = 'table-' + tid; };
}
VIEWS.table = { aiT: null, playedKey: null,
  render(el, id) { const t = Store.get('tables', id); if (!t) { el.innerHTML = `<section class="band"><h1>Table not found</h1><p>${Store.mode === 'shared' && !Store.slow ? 'It may have closed.' : 'Loading…'}</p><a class="btn" href="#home">Back to games</a></section>`; return; }
    const g = GAME[t.game];
    el.innerHTML = `<section class="ghead" style="--c:${CAT_COLOR[g.cat]}"><a href="#game-${t.game}" class="back">← ${esc(g.name)}</a><div class="ghrow"><span class="art">${art(g, 56)}</span><div><h1>${esc(g.name)} ${SO[t.game] ? 'race' : 'table'}</h1><p>Hosted by ${nameLink(t.host)} · ${t.n} seats</p></div></div></section>
      <div class="gwrap"><div class="stage"><div class="match"><div class="mbar" id="mbar"></div><div id="tclock"></div><div class="board" id="board"></div><div class="row-btns" id="tctl"></div><div id="textras"></div></div></div>
      <aside class="side"><h3>Seats</h3><div id="seats"></div><h3>Watching</h3><div id="specs" class="specs"></div><h3>Table chat</h3><div id="tchat"></div></aside></div>`;
    this.x = { el: $('#board'), sel: null, on(fn) { this.el.onclick = e => { const b = e.target.closest('[data-i]'); if (b && !b.disabled && b.dataset.i !== '' && this.el.contains(b)) fn(b.dataset.i); }; }, redraw: () => this.draw(id), act: m => this.act(id, m) };
    chatPane($('#tchat'), 'table:' + id, { compact: true }); this.update(el, id); clearInterval(this.clkIv); this.clkIv = setInterval(() => { const t2 = Store.get('tables', id); if (!t2) return; const c = $('#tclock'); if (c) c.innerHTML = Tbl.clockHTML(t2); Tbl.timeoutCheck(t2); }, 500); App.cleanup = () => { clearTimeout(this.aiT); clearInterval(this.clkIv); Race.cleanup(); };
  },
  update(el, id) { const t = Store.get('tables', id); if (!t || !$('#seats')) return this.render(el, id); shell(); this.drawSeats(t); this.draw(id); chatPane.refresh && chatPane.refresh(); this.maybeAI(id); this.quota(t);
    const ex = $('#textras'); if (ex) { ex.innerHTML = Tbl.extrasHTML(t); ex.onclick = e => Tbl.extrasClick(Store.get('tables', id), e); ex.onchange = e => Tbl.extrasChange(Store.get('tables', id), e); } const c = $('#tclock'); if (c) c.innerHTML = Tbl.clockHTML(t);
    if (t.emote && now() - t.emote.ts < 4000 && this._emo !== t.emote.ts) { this._emo = t.emote.ts; const b = document.createElement('div'); b.className = 'emobub'; b.innerHTML = `<span>${esc(t.emote.e)}</span><small>${esc(Names.of(t.emote.by))}</small>`; $('#board').appendChild(b); setTimeout(() => b.remove(), 2600); }
    if (t.quick && t.status === 'open' && t.host === Store.uid && !arr(t.seats).includes(null) && this._qs !== t.id) { this._qs = t.id; this.ctlClick(id, { target: { closest: () => ({ dataset: { c: 'start' } }) } }); } },
  seatNames(t) { return arr(t.seats).map(s => s ? Names.of(s) : 'Empty seat'); },
  drawSeats(t) { const mine = arr(t.seats).indexOf(Store.uid), host = t.host === Store.uid, G = TB[t.game], g = GAME[t.game];
    $('#seats').innerHTML = arr(t.seats).map((s, i) => `<div class="seat" style="--c:${SEATCOL[i % 8]}"><i></i>${s ? (s.startsWith('ai:') ? `<span>Computer · level ${esc(s.slice(3))}</span>` : `${avatar(s, 26)} ${nameLink(s)} <small class="muted">${TB[t.game] ? Rating.label(s, t.game) : ''}${Cosm.title(s) ? ' · ' + esc(Cosm.title(s)) : ''}</small>`) : '<span class="muted">Empty seat</span>'}
      ${t.status === 'open' ? (!s && mine < 0 ? `<button class="btn sm" data-sit="${i}">Sit here</button>` : '') + (!s && host ? `<button class="btn sm ghost" data-ai="${i}">Add computer</button>` : '') + (s === Store.uid && i > 0 ? '<button class="btn sm ghost" data-stand="1">Stand up</button>' : '') + (host && s && s !== Store.uid ? `<button class="btn sm ghost" data-kick="${i}">Free seat</button>` : '') : ''}</div>`).join('')
      + (t.status === 'open' && host ? `<div class="row-btns">${t.n < g.maxP ? '<button class="btn sm" data-n="1">Add a seat</button>' : ''}${t.n > Math.max(2, g.minP) ? '<button class="btn sm" data-n="-1">Remove a seat</button>' : ''}</div>` : '');
    const specs = Store.peerStates().filter(p => p.table === t.id && !arr(t.seats).includes(p.uid)); const inv = arr(t.invited).filter(u => !arr(t.seats).includes(u));
    $('#specs').innerHTML = (specs.map(p => `<span class="spec">${avatar(p.uid, 24)} ${esc(Names.of(p.uid))}</span>`).join('') || '<span class="muted small">No one watching yet.</span>') + (inv.length ? `<p class="muted small">Invited: ${inv.map(u => esc(Names.of(u))).join(', ')}</p>` : '');
    $('#tctl').innerHTML = this.controls(t);
    $('#seats').onclick = e => this.seatClick(t.id, e); $('#tctl').onclick = e => this.ctlClick(t.id, e); $('#tctl').onchange = async e => { if (e.target.dataset.limit) { const cur = Store.get('tables', t.id), base = { ...cur }; delete base.id; await Store.put('tables', t.id, { ...base, limit: +e.target.value, ts: now() }); } };
  },
  controls(t) { const mine = arr(t.seats).indexOf(Store.uid), host = t.host === Store.uid, full = !arr(t.seats).includes(null), g = GAME[t.game], hostHere = Store.online().has(t.host) || Store.mode !== 'shared';
    let h = '';
    if (t.status === 'open') { if (host) h += `<button class="btn hot" data-c="start" ${full ? '' : 'disabled'}>${full ? (SO[t.game] ? 'Start race' : 'Start game') : 'Fill every seat to start'}</button><button class="btn" data-c="invite">Invite more</button>${SO[t.game] ? `<label class="fld inline">Time limit <select data-limit="1">${RACE_LIMITS.map(([v, l]) => `<option value="${v}" ${v === (t.limit || 300) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}`;
      if (mine < 0 && full) h += `<span class="muted">Seats are full. Watch from here, or </span><button class="btn" data-c="fork">start another table</button>`; }
    if (t.status === 'playing' && mine >= 0) h += SO[t.game] ? '<button class="btn" data-c="giveup">Finish now</button>' : '<button class="btn" data-c="resign">Resign</button>';
    if (t.status === 'done' && host) h += '<button class="btn hot" data-c="rematch">Rematch</button>';
    if (t.status === 'done' && mine < 0) h += '<button class="btn" data-c="fork">Start a new table</button>';
    if (!host && !hostHere && mine >= 0) h += '<button class="btn ghost" data-c="takeover">Host left — take over</button>';
    if (host) h += '<button class="btn ghost" data-c="close">Close table</button>'; else if (mine >= 0 && t.status === 'open') h += '<button class="btn ghost" data-c="leave">Leave seat</button>';
    return h; },
  async seatClick(id, e) { const b = e.target.closest('button'); if (!b) return; const t = Store.get('tables', id); if (!t) return; const seats = arr(t.seats).slice();
    if (b.dataset.sit !== undefined) { if (Quota.left() <= 0) return gate(); if (!(await Store.acquire('tables', id))) return toast('Someone is sitting down, try again.'); const cur = Store.get('tables', id); const ss = arr(cur.seats).slice(); if (ss[+b.dataset.sit] !== null) return toast('That seat was just taken.'); if (ss.includes(Store.uid)) return; ss[+b.dataset.sit] = Store.uid; await Store.put('tables', id, { ...cur, id: undefined, seats: ss, ts: now() }); }
    if (b.dataset.ai !== undefined) { seats[+b.dataset.ai] = 'ai:' + (App.lvl[t.game] || 3); await Store.put('tables', id, { ...t, id: undefined, seats, ts: now() }); }
    if (b.dataset.kick !== undefined) { seats[+b.dataset.kick] = null; await Store.put('tables', id, { ...t, id: undefined, seats, ts: now() }); }
    if (b.dataset.stand) { const i = seats.indexOf(Store.uid); if (i >= 0) seats[i] = null; await Store.put('tables', id, { ...t, id: undefined, seats, ts: now() }); }
    if (b.dataset.n) { const d = +b.dataset.n; let ss = seats.slice(); if (d > 0) ss.push(null); else { const k = ss.lastIndexOf(null); if (k > 0) ss.splice(k, 1); else ss.pop(); } await Store.put('tables', id, { ...t, id: undefined, seats: ss, n: ss.length, ts: now() }); }
  },
  async ctlClick(id, e) { const b = e.target.closest('[data-c]'); if (!b) return; const t = Store.get('tables', id), c = b.dataset.c, G = TB[t.game]; const base = { ...t }; delete base.id;
    if (c === 'giveup') { if (Race.run && !Race.run.ended) { try { Race.run.stop && Race.run.stop(); } catch (er) {} Race.run.end(Race.run.score); } return; }
    if ((c === 'start' || c === 'rematch') && SO[t.game]) { await Store.put('tables', id, { ...base, status: 'playing', state: Race.start(t), result: null, endedAt: null, round: (t.round || 0) + 1, ts: now() }); return; }
    if (c === 'start' || c === 'rematch') { const st = G.init(t.n); await Store.put('tables', id, { ...base, status: 'playing', state: st, result: null, round: (t.round || 0) + 1, ts: now(), ...Tbl.onStart(t, st) }); }
    if (c === 'resign') { const mine = arr(t.seats).indexOf(Store.uid); const winner = t.n === 2 ? 1 - mine : -1; await Store.put('tables', id, { ...base, status: 'done', result: { winner, resigned: mine }, ts: now() }); }
    if (c === 'close') { await Store.del('tables', id); location.hash = 'game-' + t.game; }
    if (c === 'leave') { const seats = arr(t.seats).map(s => s === Store.uid ? null : s); await Store.put('tables', id, { ...base, seats, ts: now() }); }
    if (c === 'takeover') await Store.put('tables', id, { ...base, host: Store.uid, ts: now() });
    if (c === 'invite') challengeMore(id);
    if (c === 'fork') { const others = Store.peerStates().filter(p => p.table === id && !arr(t.seats).includes(p.uid) && p.uid !== Store.uid).map(p => p.uid); const nid = await createTable(t.game, t.n, others.concat(arr(t.invited).filter(u => !arr(t.seats).includes(u) && u !== Store.uid))); if (!nid) return; location.hash = 'table-' + nid; }
  },
  draw(id) { const t = Store.get('tables', id); if (!t || !this.x) return; if (SO[t.game]) { this.x.names = this.seatNames(t); return Race.draw(t, this.x); } if (TB[t.game].needsWords && !Words.ready) { Words.load().then(() => this.draw(id)); x0(this.x); return; } const G = TB[t.game], x = this.x, names = this.seatNames(t), mine = arr(t.seats).indexOf(Store.uid); x.names = names; x.me = mine;
    if (!t.state) { $('#mbar').innerHTML = `<span class="muted">${t.status === 'open' ? 'Waiting for players. The host starts the game when every seat is filled.' : ''}</span>`; x.el.innerHTML = `<div class="waiting">${art(GAME[t.game], 120)}</div>`; return; }
    const s = t.state, r = t.result || G.result(s), turn = G.turn(s); x.can = t.status === 'playing' && !r && turn === mine;
    $('#mbar').innerHTML = r ? (r.resigned !== undefined ? `<b>${esc(names[r.resigned])} resigned.</b>` : r.timeout !== undefined ? `<b>${esc(names[r.timeout])} ran out of time. ${esc(names[r.winner])} wins.</b>` : r.agreed ? '<b>Draw agreed.</b>' : resultLine(r, names, mine)) : `<span class="turn" style="--c:${SEATCOL[turn % 8]}">${esc(names[turn])}</span><span class="muted">${turn === mine ? 'your move' : 'to move'}</span>${mine < 0 ? '<span class="pill">Watching</span>' : ''}`;
    v2view(G, s, x);
    if (r && (t.status === 'playing' || t.status === 'done') && mine >= 0) this.finish(t, r);
  },
  async act(id, m) { const t = Store.get('tables', id); if (!t || t.status !== 'playing') return; const G = TB[t.game], mine = arr(t.seats).indexOf(Store.uid); if (G.turn(t.state) !== mine) return;
    if (!legal(G, t.state, m)) { console.warn('ui-illegal', t.game, JSON.stringify(m)); toast("That move isn't allowed."); return; } const st = G.play(t.state, m); this.x.sel = null; beepMove();
    const r = G.result(st); const base = { ...t }; delete base.id; await Store.put('tables', id, { ...base, ...Tbl.onMove(t, m, mine), state: st, status: r ? 'done' : 'playing', result: r || null, ts: now() }); },
  maybeAI(id) { const t = Store.get('tables', id); if (!t || t.status !== 'playing' || t.host !== Store.uid || SO[t.game]) return; const G = TB[t.game], turn = G.turn(t.state), seat = arr(t.seats)[turn]; if (!seat || !seat.startsWith('ai:') || G.result(t.state)) return;
    clearTimeout(this.aiT); const key = JSON.stringify(t.state).length + ':' + t.ts; this.aiKey = key;
    this.aiT = setTimeout(async () => { const cur = Store.get('tables', id); if (!cur || this.aiKey !== key) return; const m = aiMove(G, cur.state, +seat.slice(3)); if (m === null || m === undefined) return; const st = G.play(cur.state, m), r = G.result(st); const base = { ...cur }; delete base.id; await Store.put('tables', id, { ...base, ...Tbl.onMove(cur, m, turn), state: st, status: r ? 'done' : 'playing', result: r || null, ts: now() }); }, 600); },
  quota(t) { const mine = arr(t.seats).indexOf(Store.uid); if (mine < 0 || t.status !== 'playing') return; const k = 'played:' + Store.uid + ':' + t.id + ':' + (t.round || 0); if (LS.get(k)) return; LS.set(k, 1); Quota.use(); },
  finish(t, r) { const k = 'rec:' + Store.uid + ':' + t.id + ':' + (t.round || 0); if (LS.get(k)) return; LS.set(k, 1); const mine = arr(t.seats).indexOf(Store.uid); const out = outcomeFor(r, mine); const lvl = Math.max(5, ...arr(t.seats).filter(s => s && s.startsWith('ai:')).map(s => +s.slice(3))); recordResult(t.game, { outcome: out, level: lvl }); celebrate(out); const humans = arr(t.seats).filter(s => s && !s.startsWith('ai:')); if (humans.length >= 2) { Rating.apply(t, r); saveMe({ online: (me().online || 0) + 1 }); Quests.event({ type: 'online' }); } Tour.score(t, r); }
};
function x0(x) { x.el.innerHTML = '<p class="muted">Loading the dictionary…</p>'; }
function challengeMore(tid) { const t = Store.get('tables', tid); const fr = arr(me().friends).filter(isFriend).filter(u => !arr(t.invited).includes(u));
  const box = modal(`<h2>Invite more people</h2><div class="picks">${fr.map(id => `<label class="pick"><input type="checkbox" value="${esc(id)}">${avatar(id, 28)} ${esc(Names.of(id))}</label>`).join('') || '<p class="muted">Everyone on your friends list is already invited.</p>'}</div><button class="btn hot" id="go">Invite</button>`);
  box.querySelector('#go').onclick = async () => { const ids = [...box.querySelectorAll('input:checked')].map(i => i.value); const cur = Store.get('tables', tid); const base = { ...cur }; delete base.id; await Store.put('tables', tid, { ...base, invited: [...new Set(arr(cur.invited).concat(ids))] }); closeModal(); }; }

// ---------- Leaderboards ----------
function leaderRows(gid) { const solo = !!SO[gid]; return Store.all('profiles').map(p => ({ id: p.id, s: (p.scores || {})[gid] })).filter(r => r.s && (solo ? r.s.best > 0 : (r.s.w || r.s.pts))).sort((a, b) => solo ? b.s.best - a.s.best : (b.s.pts || 0) - (a.s.pts || 0) || (b.s.w || 0) - (a.s.w || 0)); }
function leaderTable(gid, n = 25) { const solo = !!SO[gid], rows = leaderRows(gid).slice(0, n);
  if (!rows.length) return `<p class="empty">No scores yet. Play ${esc(GAME[gid].name)} to claim the top spot.</p>${Store.mode !== 'shared' ? '<p class="muted small">In solo mode the board only shows players on this browser.</p>' : ''}`;
  return `<table class="lb"><thead><tr><th>#</th><th>Player</th>${solo ? '<th class="num">Best</th><th class="num">Plays</th>' : '<th class="num">Points</th><th class="num">W–L–D</th>'}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.id === Store.uid ? 'mine' : ''}"><td>${i + 1}</td><td>${avatar(r.id, 24)} ${nameLink(r.id)}</td>${solo ? `<td class="num">${r.s.best}</td><td class="num">${r.s.plays || 0}</td>` : `<td class="num">${r.s.pts || 0}</td><td class="num">${r.s.w || 0}–${r.s.l || 0}–${r.s.d || 0}</td>`}</tr>`).join('')}</tbody></table><p class="muted small">${solo ? 'Best single score. Higher difficulty scores more.' : 'Points: 10 × difficulty for a win, 3 × for a draw.'}</p>`; }
VIEWS.leaders = { render(el, gid) { gid = GAME[gid] && isPlayable(gid) ? gid : (App.lbg || 'chess'); App.lbg = gid;
  el.innerHTML = `<section class="band"><h1>Leaderboards</h1><p class="muted">The world's best on every playable game.</p><label class="fld">Game <select id="lbg">${pubCat().filter(g => isPlayable(g.id)).map(g => `<option value="${g.id}" ${g.id === gid ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label><label class="chk"><input type="checkbox" id="lbf" ${App.lbf ? 'checked' : ''}> Friends only</label><div id="lbt">${lbBody(gid)}</div>
  <h2>Today's daily challenge</h2>${dailyCard()}<h2>Overall champions</h2>${overall()}</section>`; $('#lbf').onchange = e => { App.lbf = e.target.checked; $('#lbt').innerHTML = lbBody(App.lbg); }; const dg = $('#dgo'); if (dg) dg.onclick = () => Daily.start(); $('#lbg').onchange = e => { App.lbg = e.target.value; $('#lbt').innerHTML = lbBody(App.lbg); }; } };
function lbBody(gid) { let h = leaderTable(gid, 50), r = TB[gid] ? `<h3>Ratings</h3>${ratingTable(gid, 50)}` : ''; if (App.lbf) { const fr = new Set(arr(me().friends).filter(isFriend).concat(Store.uid)); const d = document.createElement('div'); d.innerHTML = h + r; d.querySelectorAll('tbody tr').forEach(tr => { const a = tr.querySelector('a[href^="#u-"]'); if (a && !fr.has(decodeURIComponent(a.getAttribute('href').slice(3)))) tr.remove(); }); return d.innerHTML; } return h + r; }
function overall() { const rows = Store.all('profiles').map(p => ({ id: p.id, xp: p.xp || 0, w: Object.values(p.scores || {}).reduce((a, s) => a + (s.w || 0), 0) })).filter(r => r.xp).sort((a, b) => b.xp - a.xp).slice(0, 20);
  return rows.length ? `<table class="lb"><thead><tr><th>#</th><th>Player</th><th class="num">XP</th><th class="num">Wins</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${avatar(r.id, 24)} ${nameLink(r.id)}</td><td class="num">${r.xp}</td><td class="num">${r.w}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No champions yet.</p>'; }

// ---------- Motion tutorial ----------
function tutorial(id) {
  const g = GAME[id], steps = g.rules.split(/(?<=\.)\s+/).concat(['Tip: ' + g.tip]), G = TB[id]; let k = 0, playing = true, demo = null, timer = null, aiT = null;
  const box = modal(`<h2>${esc(g.name)} · how to play</h2><div class="tut"><div class="tutstage" id="tstage"></div><div class="tutsteps"><ol>${steps.map((s, i) => `<li data-k="${i}">${esc(s)}</li>`).join('')}</ol><div class="row-btns"><button class="btn" id="tp">Previous</button><button class="btn" id="tpp">Pause</button><button class="btn hot" id="tn">Next</button></div></div></div>`, 'wide');
  const stage = box.querySelector('#tstage');
  if (G && G.needsWords && !Words.ready) Words.load();
  if (G) { let s = G.init(Math.max(2, g.minP)); const x = { el: stage, me: 0, can: false, names: (G.seats || []).slice(0, 6), sel: null, on() {}, redraw() {}, act() {} };
    const tick = () => { if (!playing) { aiT = setTimeout(tick, 400); return; } if (G.result(s)) s = G.init(Math.max(2, g.minP)); const m = aiMove(G, s, 4); if (m !== null && m !== undefined) s = G.play(s, m); x.me = id === 'seabattle' ? -1 : 0; try { G.view(s, x); } catch (e) {} aiT = setTimeout(tick, id === 'yacht' ? 450 : 900); };
    G.view(s, x); aiT = setTimeout(tick, 700); }
  else stage.innerHTML = `<div class="tutart" style="--c:${CAT_COLOR[g.cat]}">${art(g, 150)}<div class="keys">${SO[id] ? ['◀', '▲', '▼', '▶', 'Space'].map((kk, i) => `<kbd style="animation-delay:${i * .4}s">${kk}</kbd>`).join('') : ''}</div></div>`;
  const show = () => { box.querySelectorAll('[data-k]').forEach(li => li.classList.toggle('on', +li.dataset.k === k)); };
  const go = d => { k = (k + d + steps.length) % steps.length; show(); };
  timer = setInterval(() => playing && go(1), 3600); show();
  box.querySelector('#tp').onclick = () => go(-1); box.querySelector('#tn').onclick = () => go(1);
  box.querySelector('#tpp').onclick = e => { playing = !playing; e.target.textContent = playing ? 'Pause' : 'Play'; };
  box.querySelectorAll('[data-k]').forEach(li => li.onclick = () => { k = +li.dataset.k; show(); });
  $('#modal')._cleanup = () => { clearInterval(timer); clearTimeout(aiT); };
}

// ---------- Notifications ----------
const Notif = {
  list() { if (!Store.ready) return []; const out = [], mine = me(), blocked = blockedSet();
    Store.all('profiles').forEach(p => { if (p.id === Store.uid || blocked.has(p.id)) return; if (arr(p.friends).includes(Store.uid) && !arr(mine.friends).includes(p.id)) out.push({ ts: (p.fts || {})[Store.uid] || 0, html: `${nameLink(p.id)} sent you a friend request.`, href: '#people' });
      if (arr(p.likes).includes(Store.uid) && arr(mine.likes).includes(p.id)) out.push({ ts: Math.max((p.lts || {})[Store.uid] || 0, (mine.lts || {})[p.id] || 0), html: `You matched with ${nameLink(p.id)}.`, href: '#match' }); });
    Store.all('tables').forEach(t => { if (t.status === 'open' && arr(t.invited).includes(Store.uid) && !arr(t.seats).includes(Store.uid)) out.push({ ts: t.ts, html: `${nameLink(t.host)} challenged you to ${esc((GAME[t.game] || {}).name)}.`, href: '#table-' + t.id }); });
    const myPosts = new Map(Store.all('posts').filter(p => p.author === Store.uid).map(p => [p.id, p]));
    Store.all('comments').forEach(c => { if (c.author !== Store.uid && myPosts.has(c.post)) out.push({ ts: c.ts, html: `${nameLink(c.author)} commented: “${esc((c.text || '').slice(0, 60))}”`, href: postHref(myPosts.get(c.post)) }); });
    const myName = (me().name || Names.of(Store.uid) || '').toLowerCase(); if (myName.length >= 2 && myName !== 'you' && myName !== 'player') { const tag = '@' + myName; Store.all('posts').forEach(p => { if (p.author !== Store.uid && ((p.text || '') + ' ' + (p.title || '')).toLowerCase().includes(tag)) out.push({ ts: p.ts, html: `${nameLink(p.author)} mentioned you in a post.`, href: '#p-' + p.id }); }); Store.all('comments').forEach(c => { if (c.author !== Store.uid && (c.text || '').toLowerCase().includes(tag)) out.push({ ts: c.ts, html: `${nameLink(c.author)} mentioned you in a comment.`, href: String(c.post).startsWith('game:') ? '#game-' + String(c.post).slice(5) : '#p-' + c.post }); }); }
    Store.all('notes').forEach(n => { if (n.to !== Store.uid || blocked.has(n.from)) return; if (n.kind === 'poke') out.push({ ts: n.ts, html: `${nameLink(n.from)} poked you. <button class="btn sm" data-poke="${esc(n.from)}">Poke back</button>`, href: '#u-' + encodeURIComponent(n.from) }); if (n.kind === 'reqans') out.push({ ts: n.ts, html: `${nameLink(n.from)} asked you to answer a question.`, href: '#p-' + n.ref }); });
    Store.all('posts').forEach(p => { if (p.kind === 'ask' && p.to === Store.uid && !p.answered) out.push({ ts: p.ts, html: `${p.anon ? 'Someone' : nameLink(p.from)} sent you an ask.`, href: '#profile' }); if (p.kind === 'ask' && p.from === Store.uid && p.answered) out.push({ ts: p.ts, html: `${nameLink(p.to)} answered your ask.`, href: '#p-' + p.id }); });
    const fq = new Set(LS.get('followQ', [])); if (fq.size) Store.all('comments').forEach(c => { if (fq.has(c.post) && c.author !== Store.uid && !c.parent) out.push({ ts: c.ts, html: `${nameLink(c.author)} answered a question you follow.`, href: '#p-' + c.post }); });
    Store.all('profiles').forEach(p => { if (p.id !== Store.uid && isFriend(p.id) && typeof birthdayToday === 'function' && birthdayToday(p.id)) out.push({ ts: new Date().setHours(0, 0, 0, 0), html: `It's ${nameLink(p.id)}'s birthday today.`, href: '#feed' }); });
    return out.sort((a, b) => b.ts - a.ts).slice(0, 50); },
  unread() { if (!Store.ready) return 0; const lr = LS.get('lastRead', {}); const mineChats = new Set(Store.all('chats').filter(c => arr(c.members).includes(Store.uid)).map(c => c.id)); let n = 0; const seen = new Set(); Store.all('msgs').forEach(m => { if (m.author !== Store.uid && mineChats.has(m.chat) && m.ts > (lr[m.chat] || 0) && !seen.has(m.chat)) { seen.add(m.chat); n++; } }); return n; },
  open() { const list = this.list(); LS.set('nseen', now()); shell();
    modal(`<h2>Notifications</h2>${list.length ? `<ul class="nlist">${list.map(n => `<li><a href="${n.href}" data-close="1">${n.html}</a><small>${n.ts ? ago(n.ts) : ''}</small></li>`).join('')}</ul>` : '<p class="empty">Nothing new. Challenges, friend requests, matches and comments show up here.</p>'}`); }
};

// ---------- Membership & admin ----------
VIEWS.membership = { render(el) { const m = isMember(), req = Store.get('requests', Store.uid);
  el.innerHTML = `<section class="band"><h1>Membership</h1><p class="lead">Everyone gets ${Quota.LIMIT} games a day, whether you start them, challenge someone or accept a challenge. Members play as much as they like.</p>
    <div class="plans"><div class="plan"><h3>Free</h3><p class="price">${Quota.LIMIT} games a day</p><ul><li>Every game in the library, vs computer or friends</li><li>All social features: feed, chat, communities, match</li><li>Watch any table without using a game</li></ul>${m ? '' : '<span class="pill">Your plan</span>'}</div>
    <div class="plan hot"><h3>Member</h3><p class="price">Unlimited games</p><ul><li>No daily limit, on every game and table</li><li>Member badge on your profile and in chat</li><li>Host as many online tables as you like</li></ul>${m ? '<span class="pill">Your plan</span>' : req ? '<p class="muted">Request sent. The site owner will review it.</p>' : '<button class="btn hot" id="req">Request membership</button>'}</div></div>
    <p class="muted small">Online payment is not connected on this site; the owner grants memberships from the admin page.</p></section>`;
  $('#req') && ($('#req').onclick = async () => { await Store.put('requests', Store.uid, { ts: now() }); toast('Membership requested.'); }); } };
VIEWS.admin = { render(el) { if (!Store.owner && Store.mode === 'shared') { el.innerHTML = '<section class="band"><h1>Admin</h1><p>Only the site owner can open this page.</p></section>'; return; }
  const reqs = Store.all('requests'), mems = Store.all('members').filter(m => m.member), reps = Store.all('reports');
  el.innerHTML = `<section class="band"><h1>Admin</h1><p class="muted">${Store.all('profiles').length} profiles · ${Store.all('posts').length} posts · ${Store.all('msgs').length} recent messages · ${Store.all('tables').length} tables</p>
    <h2>Membership requests</h2>${reqs.length ? reqs.map(r => `<div class="arow">${avatar(r.id, 28)} ${nameLink(r.id)} <small>${ago(r.ts)}</small><button class="btn sm hot" data-grant="${esc(r.id)}">Grant</button><button class="btn sm ghost" data-deny="${esc(r.id)}">Dismiss</button></div>`).join('') : '<p class="muted">No requests.</p>'}
    <h2>Members</h2>${mems.length ? mems.map(r => `<div class="arow">${avatar(r.id, 28)} ${nameLink(r.id)}<button class="btn sm ghost" data-revoke="${esc(r.id)}">Revoke</button></div>`).join('') : '<p class="muted">No members yet.</p>'}
    <h3>Grant membership to anyone</h3><div class="row-btns"><select id="gsel">${Store.all('profiles').map(p => `<option value="${esc(p.id)}">${esc(Names.of(p.id))}</option>`).join('')}</select><button class="btn" id="gbtn">Grant</button></div>
    <h2>Reports</h2>${reps.length ? reps.map(r => `<div class="arow"><div><b>${esc(r.kind)}</b> reported by ${nameLink(r.by)} <small>${ago(r.ts)}</small><p>${esc(r.reason || '')}</p><p class="muted small">${esc(r.preview || '')}</p></div>${r.kind !== 'user' ? `<button class="btn sm hot" data-rm="${esc(r.kind)}:${esc(r.target)}:${esc(r.id)}">Remove content</button>` : ''}<button class="btn sm ghost" data-done="${esc(r.id)}">Dismiss</button></div>`).join('') : '<p class="muted">No reports.</p>'}
    <h2>Housekeeping</h2><button class="btn" id="prune">Delete messages older than 30 days and finished tables</button></section>`;
  el.onclick = async e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.grant) { await Store.put('members', d.grant, { member: true, ts: now() }); await Store.del('requests', d.grant); }
    if (d.deny) await Store.del('requests', d.deny); if (d.revoke) await Store.put('members', d.revoke, { member: false, ts: now() });
    if (b.id === 'gbtn') await Store.put('members', $('#gsel').value, { member: true, ts: now() });
    if (d.rm) { const [kind, target, rid] = d.rm.split(':'); await Store.del(kind === 'comment' ? 'comments' : kind === 'message' ? 'msgs' : 'posts', target); await Store.del('reports', rid); }
    if (d.done) await Store.del('reports', d.done);
    if (b.id === 'prune') { const old = now() - 30 * 864e5; let n = 0; for (const m of Store.all('msgs')) if (m.ts < old) { await Store.del('msgs', m.id); n++; } for (const t of Store.all('tables')) if (t.status === 'done' || now() - t.ts > 864e5) { await Store.del('tables', t.id); n++; } toast(`Removed ${n} items.`); }
    render(true); }; } };

// ---------- Search ----------
VIEWS.search = { render(el) { const q = App.search.toLowerCase().trim(); const games = pubCat().filter(g => g.name.toLowerCase().includes(q)), people = Store.all('profiles').filter(p => Names.of(p.id).toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q) || arr(p.interests).join(' ').toLowerCase().includes(q)), comms = Store.all('communities').filter(c => (c.name + ' ' + (c.desc || '')).toLowerCase().includes(q)), posts = visiblePosts().filter(p => ((p.title || '') + ' ' + (p.text || '') + ' ' + arr(p.tags).join(' ')).toLowerCase().includes(q)).slice(0, 20);
  el.innerHTML = `<section class="band"><h1>Results for “${esc(App.search)}”</h1><h2>Games</h2><div class="libgrid">${games.map(g => tile(g)).join('') || '<p class="muted">No games.</p>'}</div>
    <h2>People</h2><div class="people">${people.map(personCard).join('') || '<p class="muted">No people.</p>'}</div><h2>Communities</h2>${comms.map(commCard).join('') || '<p class="muted">No communities.</p>'}<h2>Posts</h2><div class="feedcol">${posts.map(postCard).join('') || '<p class="muted">No posts.</p>'}</div></section>`; bindPosts(el); } };

// ---------- Boot ----------
async function boot() {
  $('#musicbtn').onclick = () => { const on = Music.toggle(); shell(); toast(on ? 'Music on · ' + Music.TRACKS[Music.track].name : 'Music off'); };
  $('#tracknext').onclick = () => toast('Now playing: ' + Music.next());
  $('#vol').value = Music.vol; $('#vol').oninput = e => Music.setVol(+e.target.value);
  $('#bell').onclick = () => Notif.open();
  $('#searchf').onsubmit = e => { e.preventDefault(); App.search = $('#q').value; if (App.search.trim()) { if (location.hash === '#search') render(true); else location.hash = 'search'; } };
  document.addEventListener('pointerdown', () => { if (Music.on) Music.start(); }, { once: true });
  addEventListener('hashchange', () => { try { route(); } catch (e) { console.error(e); } });
  Words.load();
  await Store.boot();
  if (!Store.get('profiles', Store.uid)) await saveMe({});
  await Quota.load(); route();
  if (!me().name) setTimeout(() => { if (Store.mode !== 'shared' && !$('#modal').classList.contains('open') && !document.querySelector('.start')) editProfile(true); }, 1500);
  const shared = await Store.upgrade().catch(e => { console.warn(e); return false; });
  if (shared) { const ok = await Store.profilesLoaded; try { if (ok && !Store.get('profiles', Store.uid)) await saveMe({}); await Quota.load(); } catch (e) { console.warn(e); } render(false); }
  setInterval(() => { if (Store.mode === 'shared' && Store.canWrite && Store.get('profiles', Store.uid)) Store.patch('profiles', Store.uid, { seen: now() }); }, 5 * 60e3);
}
