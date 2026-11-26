// Launch pack 6: an uncluttered top bar, "My games" (favourites, your own lists, personal tags, full sorting and
// filtering of all games), member challenges in members-only games (30 a day), and no dating features.

// ---------- Top bar: fewer things side by side; extras live in a "More" menu ----------
{ const sh = shell; shell = function () { sh(); const q = document.getElementById('quota'); if (q) { const left = Quota.left(); q.title = left === Infinity ? 'Member: unlimited games' : `${left} of ${Quota.LIMIT} free games left today`; q.innerHTML = left === Infinity ? '<b>Member</b>' : `<b>${left}</b>/${Quota.LIMIT} today`; } TopMore.tidy(); }; }
const TopMore = {
  get IDS() { return ['skinbtn', 'verbtn', 'shrbtn'].concat(matchMedia('(max-width: 600px)').matches ? ['setbtn'] : []); },
  tidy() { const top = document.querySelector('.top'); if (!top) return; let m = top.querySelector('#topmore');
    if (!m) { m = document.createElement('div'); m.id = 'topmore'; m.innerHTML = '<button class="tbtn" id="topmorebtn" aria-label="More options" aria-haspopup="true" aria-expanded="false"><svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button><div class="tmpanel" role="menu" hidden></div>';
      const bell = top.querySelector('#bell'); bell ? bell.before(m) : top.appendChild(m);
      const btn = m.querySelector('#topmorebtn'), pan = m.querySelector('.tmpanel'); btn.onclick = e => { e.stopPropagation(); pan.hidden = !pan.hidden; btn.setAttribute('aria-expanded', String(!pan.hidden)); };
      document.addEventListener('click', e => { if (!m.contains(e.target)) { pan.hidden = true; btn.setAttribute('aria-expanded', 'false'); } }); }
    const pan = m.querySelector('.tmpanel'), label = { skinbtn: 'Change the look', verbtn: 'Design version', shrbtn: 'Share the site', setbtn: 'Settings' };
    for (const id of this.IDS) { const el = top.querySelector(':scope > #' + id); if (el) { const row = document.createElement('div'); row.className = 'tmrow'; row.appendChild(el); row.insertAdjacentHTML('beforeend', `<span>${label[id]}</span>`); row.onclick = e => { if (e.target === row || e.target.tagName === 'SPAN') el.click(); }; pan.appendChild(row); } }
    // Track skip and volume join the menu; the music on/off button stays in the bar
    const mb = top.querySelector(':scope > .musicbox'); if (mb && !pan.querySelector('.tmmusic')) { const keep = mb.querySelector('#musicbtn'); const row = document.createElement('div'); row.className = 'tmrow tmmusic'; [...mb.children].filter(x => x !== keep).forEach(x => row.appendChild(x)); row.insertAdjacentHTML('beforeend', '<span>Next track and volume</span>'); pan.prepend(row); }
    m.hidden = !pan.children.length; } };
new MutationObserver(() => { const top = document.querySelector('.top'); if (top && TopMore.IDS.some(id => top.querySelector(':scope > #' + id))) TopMore.tidy(); }).observe(document.querySelector('.top') || document.body, { childList: true });

// ---------- My games: favourites, lists, tags, sorting and filtering ----------
NAV.splice(1, 0, ['mygames', 'My games']); (NAV.__added = NAV.__added || []).push(['mygames', 'My games']);
const MG = {
  st: { list: 'all', q: '', sort: 'pop', cats: [], players: 'any', access: 'any', tags: [], view: 'grid' },
  lists() { return arr(me().colls); },
  myTags() { return me().gtags || {}; },
  tagsOf(gid) { return arr(this.myTags()[gid]); },
  allMyTags() { return [...new Set(Object.values(this.myTags()).flat())].sort(); },
  stats(gid) { const s = (me().scores || {})[gid] || {}; return { plays: s.plays || 0, best: s.best || s.hi || 0, last: s.last || s.ts || 0 }; },
  source() { const L = this.st.list; if (L === 'all') return pubCat(); if (L === 'fav') return arr(me().favs).map(id => GAME[id]).filter(Boolean); if (L === 'recent') return arr(me().recent).map(id => GAME[id]).filter(Boolean); if (L === 'played') return pubCat().filter(g => this.stats(g.id).plays);
    if (L.startsWith('tag:')) { const t = L.slice(4); return pubCat().filter(g => this.tagsOf(g.id).includes(t)); } const c = this.lists().find(x => x.id === L); return c ? arr(c.games).map(id => GAME[id]).filter(Boolean) : []; },
  filtered() { const s = this.st, q = s.q.trim().toLowerCase(); let out = this.source().filter(g => Hide.shows(g.id));
    if (q) out = out.filter(g => (g.name + ' ' + g.cat + ' ' + gameTags(g).join(' ') + ' ' + this.tagsOf(g.id).join(' ') + ' ' + (g.rules || '')).toLowerCase().includes(q));
    if (s.cats.length) out = out.filter(g => s.cats.includes(g.cat));
    if (s.players !== 'any') out = out.filter(g => s.players === '1' ? g.minP <= 1 : s.players === '2' ? g.minP <= 2 && g.maxP >= 2 : s.players === '34' ? g.maxP >= 3 && g.minP <= 4 : g.maxP >= 5);
    if (s.access === 'free') out = out.filter(g => Access.free(g.id)); if (s.access === 'members') out = out.filter(g => !Access.free(g.id)); if (s.access === 'open') out = out.filter(g => Access.open(g.id));
    if (s.tags.length) out = out.filter(g => s.tags.every(t => gameTags(g).includes(t) || this.tagsOf(g.id).includes(t)));
    const lst = this.lists().find(x => x.id === s.list), added = (lst && lst.added) || {}, idx = id => lst ? arr(lst.games).indexOf(id) : 0;
    const cmp = { pop: (a, b) => a.rank - b.rank, az: (a, b) => a.name.localeCompare(b.name), za: (a, b) => b.name.localeCompare(a.name), cat: (a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name), most: (a, b) => b.maxP - a.maxP || a.name.localeCompare(b.name), fewest: (a, b) => a.minP - b.minP || a.maxP - b.maxP,
      played: (a, b) => this.stats(b.id).plays - this.stats(a.id).plays, recent: (a, b) => this.stats(b.id).last - this.stats(a.id).last, best: (a, b) => this.stats(b.id).best - this.stats(a.id).best, rating: (a, b) => (typeof Reviews !== 'undefined' && Reviews.avg ? (Reviews.avg(b.id) || 0) - (Reviews.avg(a.id) || 0) : 0), added: (a, b) => (added[b.id] || 0) - (added[a.id] || 0), order: (a, b) => idx(a.id) - idx(b.id) }[s.sort] || ((a, b) => a.rank - b.rank);
    return out.slice().sort(cmp); },
  async saveLists(ls) { await saveMe({ colls: ls }); },
  async addTo(listId, gid) { const ls = this.lists().map(c => c.id !== listId ? c : arr(c.games).includes(gid) ? c : { ...c, games: arr(c.games).concat(gid), added: { ...(c.added || {}), [gid]: now() } }); await this.saveLists(ls); },
  async removeFrom(listId, gid) { await this.saveLists(this.lists().map(c => c.id !== listId ? c : { ...c, games: arr(c.games).filter(x => x !== gid) })); },
  async setTags(gid, tags) { const t = { ...this.myTags() }; const clean = [...new Set(tags.map(x => x.trim().slice(0, 24)).filter(Boolean))].slice(0, 12); if (clean.length) t[gid] = clean; else delete t[gid]; await saveMe({ gtags: t }); },
  listMenu(gid) { const ls = this.lists(), g = GAME[gid];
    const box = modal(`<h2>${esc(g.name)}</h2><p class="muted">Favourite it, put it in your lists, and tag it your way.</p><div class="row-btns"><button class="btn ${Fav.has(gid) ? 'on' : ''}" data-mf="1">${Fav.has(gid) ? '★ In favourites' : '☆ Add to favourites'}</button></div>
      <h3>Your lists</h3><div class="stackbtns">${ls.map(c => `<button class="btn ${arr(c.games).includes(gid) ? 'on' : ''}" data-ml="${esc(c.id)}">${arr(c.games).includes(gid) ? '✓ ' : ''}${esc(c.name)} <small>(${arr(c.games).length})</small></button>`).join('') || '<p class="muted small">No lists yet.</p>'}</div>
      <form id="mlnew" class="row-btns"><input name="n" maxlength="40" placeholder="New list name" aria-label="New list name"><button class="btn">Create list and add</button></form>
      <h3>Your tags</h3><form id="mltag"><input name="t" value="${esc(this.tagsOf(gid).join(', '))}" placeholder="e.g. family night, learning, favourite with Sam" aria-label="Your tags, separated by commas"><p class="muted small">Separate tags with commas. Only you see your tags.</p><div class="gtags">${this.allMyTags().map(t => `<a href="#" data-tg="${esc(t)}">+ ${esc(t)}</a>`).join('')}</div><button class="btn hot">Save tags</button></form>`);
    box.onclick = async e => { const b = e.target.closest('[data-mf],[data-ml],[data-tg]'); if (!b) return; e.preventDefault();
      if (b.dataset.mf) { await Fav.toggle(gid); return this.listMenu(gid); }
      if (b.dataset.ml) { const c = this.lists().find(x => x.id === b.dataset.ml); arr(c.games).includes(gid) ? await this.removeFrom(c.id, gid) : await this.addTo(c.id, gid); return this.listMenu(gid); }
      if (b.dataset.tg) { const i = box.querySelector('#mltag [name=t]'); const cur = i.value.split(',').map(x => x.trim()).filter(Boolean); if (!cur.includes(b.dataset.tg)) cur.push(b.dataset.tg); i.value = cur.join(', '); } };
    box.querySelector('#mlnew').onsubmit = async e => { e.preventDefault(); const n = e.target.n.value.trim().slice(0, 40); if (!n) return; if (ls.length >= 50) return toast('50 lists at most.'); await this.saveLists(ls.concat({ id: uid8(), name: n, games: [gid], added: { [gid]: now() }, ts: now() })); toast('List created.'); this.listMenu(gid); };
    box.querySelector('#mltag').onsubmit = async e => { e.preventDefault(); await this.setTags(gid, e.target.t.value.split(',')); closeModal(); toast('Tags saved.'); render(true); }; } };
// A small "+" on every tile opens the favourites / lists / tags menu
{ const t0 = tile; tile = function (g, big) { return t0(g, big).replace(/(<a class="tile[^"]*"[^>]*>)/, `$1<button class="tadd" data-mg="${g.id}" aria-label="Add ${esc(g.name)} to a list" title="Add to a list">+</button>`); }; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-mg]'); if (!b) return; e.preventDefault(); e.stopPropagation(); MG.listMenu(b.dataset.mg); }, true);
// The game page's "Add to collection" now opens the same menu
window.addToCollection = gid => MG.listMenu(gid);

VIEWS.mygames = { render(el) { const s = MG.st, ls = MG.lists(), shown = MG.filtered(), cur = ls.find(x => x.id === s.list), tagsAll = [...new Set(pubCat().flatMap(gameTags))].sort(), mine = MG.allMyTags();
    const side = [['all', `All games`, pubCat().length], ['fav', '★ Favourites', arr(me().favs).length], ['recent', 'Recently played', arr(me().recent).length], ['played', 'Games I’ve played', pubCat().filter(g => MG.stats(g.id).plays).length]];
    el.innerHTML = `<section class="band"><div class="libhead"><h1>My games</h1><button class="btn hot" id="mgnew">+ New list</button></div>
      <div class="mgwrap"><aside class="mgside" aria-label="Lists">${side.map(([k, n, c]) => `<button class="mgli ${s.list === k ? 'on' : ''}" data-li="${k}"><span>${esc(n)}</span><small>${c}</small></button>`).join('')}
        <h4>Your lists</h4>${ls.map(c => `<button class="mgli ${s.list === c.id ? 'on' : ''}" data-li="${esc(c.id)}"><span>${esc(c.name)}</span><small>${arr(c.games).length}</small></button>`).join('') || '<p class="muted small">Create a list to group games your way.</p>'}
        ${mine.length ? `<h4>Your tags</h4>${mine.map(t => `<button class="mgli ${s.list === 'tag:' + t ? 'on' : ''}" data-li="tag:${esc(t)}"><span># ${esc(t)}</span><small>${pubCat().filter(g => MG.tagsOf(g.id).includes(t)).length}</small></button>`).join('')}` : ''}</aside>
      <div class="mgmain"><div class="mgbar"><input type="search" id="mgq" placeholder="Search names, rules and tags" value="${esc(s.q)}" aria-label="Search games">
          <label class="fld inline">Sort<select id="mgsort">${[['pop', 'Most popular'], ['az', 'Name A–Z'], ['za', 'Name Z–A'], ['cat', 'Category'], ['most', 'Most players'], ['fewest', 'Fewest players'], ['played', 'Most played by me'], ['recent', 'Recently played'], ['best', 'My best score'], ['rating', 'Best rated'], ...(cur ? [['added', 'Recently added to this list'], ['order', 'List order']] : [])].map(([v, n]) => `<option value="${v}" ${s.sort === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="fld inline">Players<select id="mgp">${[['any', 'Any'], ['1', 'Solo'], ['2', '2 players'], ['34', '3–4 players'], ['5', '5 or more']].map(([v, n]) => `<option value="${v}" ${s.players === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="fld inline">Access<select id="mga">${[['any', 'All games'], ['free', 'Free for everyone'], ['members', 'Members only'], ['open', 'I can play now']].map(([v, n]) => `<option value="${v}" ${s.access === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <div class="seg" role="group" aria-label="View"><button class="chip ${s.view === 'grid' ? 'on' : ''}" data-vw="grid">Tiles</button><button class="chip ${s.view === 'rows' ? 'on' : ''}" data-vw="rows">List</button></div></div>
        <div class="chips">${CATS.map(c => `<button class="chip ${s.cats.includes(c) ? 'on' : ''}" data-ct="${c}">${c}</button>`).join('')}</div>
        <details class="mgtags" ${s.tags.length ? 'open' : ''}><summary>Filter by tag${s.tags.length ? ` (${s.tags.length})` : ''}</summary><div class="gtags">${tagsAll.concat(mine.filter(t => !tagsAll.includes(t))).map(t => `<a href="#" class="${s.tags.includes(t) ? 'on' : ''}" data-tf="${esc(t)}">${mine.includes(t) && !tagsAll.includes(t) ? '# ' : ''}${esc(t)}</a>`).join('')}</div></details>
        <div class="mghead"><b>${shown.length} game${shown.length === 1 ? '' : 's'}</b>${s.q || s.cats.length || s.tags.length || s.players !== 'any' || s.access !== 'any' ? ' <button class="btn sm ghost" id="mgclr">Clear filters</button>' : ''}
          ${cur ? `<span class="row-btns"><button class="btn sm" id="mgren">Rename</button><button class="btn sm" id="mgdup">Duplicate</button><a class="btn sm" href="#coll-${esc(Store.uid)}~${esc(cur.id)}">Share page</a><button class="btn sm danger" id="mgdel">Delete list</button></span>` : ''}</div>
        ${s.view === 'grid' ? `<div class="libgrid">${shown.map(g => tile(g)).join('') || '<p class="empty">No games here yet.</p>'}</div>` :
          `<div class="scroll"><table class="lb mgtable"><thead><tr><th>Game</th><th>Category</th><th>Players</th><th>Access</th><th class="num">My plays</th><th>My tags</th><th></th></tr></thead><tbody>${shown.map((g, i) => `<tr><td><a href="#game-${g.id}">${esc(g.name)}</a> ${Fav.has(g.id) ? '★' : ''}</td><td>${g.cat}</td><td>${g.minP === g.maxP ? g.minP : g.minP + '–' + g.maxP}</td><td>${Access.free(g.id) ? 'Free' : 'Members'}</td><td class="num">${MG.stats(g.id).plays}</td><td>${MG.tagsOf(g.id).map(t => `<span class="pill">${esc(t)}</span>`).join(' ')}</td><td class="nowrap"><button class="btn sm" data-mg="${g.id}">Lists & tags</button>${cur && s.sort === 'order' ? `<button class="btn sm" data-up="${g.id}" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn sm" data-dn="${g.id}" ${i < shown.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button>` : ''}${cur ? `<button class="btn sm ghost" data-rm="${g.id}" aria-label="Remove from list">✕</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No games here yet.</td></tr>'}</tbody></table></div>`}
      </div></div></section>`;
    const set = (k, v) => { s[k] = v; render(true); };
    el.onclick = async e => { const b = e.target.closest('button, a[data-tf]'); if (!b) return;
      if (b.dataset.li) { s.list = b.dataset.li; if ((s.sort === 'added' || s.sort === 'order') && !ls.find(x => x.id === s.list)) s.sort = 'pop'; return render(true); }
      if (b.dataset.ct) { const c = b.dataset.ct; return set('cats', s.cats.includes(c) ? s.cats.filter(x => x !== c) : s.cats.concat(c)); }
      if (b.dataset.tf) { e.preventDefault(); const t = b.dataset.tf; return set('tags', s.tags.includes(t) ? s.tags.filter(x => x !== t) : s.tags.concat(t)); }
      if (b.dataset.vw) return set('view', b.dataset.vw);
      if (b.id === 'mgclr') { Object.assign(s, { q: '', cats: [], tags: [], players: 'any', access: 'any' }); return render(true); }
      if (b.id === 'mgnew') { const box = modal('<h2>New list</h2><form id="nlf"><label class="fld">Name<input name="n" maxlength="40" required placeholder="e.g. Game night with Sam"></label><label class="fld">Description (optional)<input name="d" maxlength="120"></label><button class="btn hot">Create list</button></form>'); box.querySelector('#nlf').onsubmit = async ev => { ev.preventDefault(); const id = uid8(); await MG.saveLists(ls.concat({ id, name: ev.target.n.value.trim().slice(0, 40), desc: ev.target.d.value.trim(), games: [], added: {}, ts: now() })); closeModal(); s.list = id; render(true); toast('List created. Use the + on any game to add it.'); }; return; }
      if (b.id === 'mgren' && cur) { const box = modal(`<h2>Rename list</h2><form id="rnf"><input name="n" maxlength="40" required value="${esc(cur.name)}"><button class="btn hot">Save</button></form>`); box.querySelector('#rnf').onsubmit = async ev => { ev.preventDefault(); await MG.saveLists(ls.map(c => c.id === cur.id ? { ...c, name: ev.target.n.value.trim().slice(0, 40) } : c)); closeModal(); render(true); }; return; }
      if (b.id === 'mgdup' && cur) { const id = uid8(); await MG.saveLists(ls.concat({ ...cur, id, name: (cur.name + ' (copy)').slice(0, 40), ts: now() })); s.list = id; return render(true); }
      if (b.id === 'mgdel' && cur) { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Press again to delete'; return; } await MG.saveLists(ls.filter(c => c.id !== cur.id)); s.list = 'all'; return render(true); }
      if (b.dataset.rm && cur) { await MG.removeFrom(cur.id, b.dataset.rm); return render(true); }
      if ((b.dataset.up || b.dataset.dn) && cur) { const g = arr(cur.games).slice(), id = b.dataset.up || b.dataset.dn, i = g.indexOf(id), j = i + (b.dataset.up ? -1 : 1); if (i < 0 || j < 0 || j >= g.length) return; [g[i], g[j]] = [g[j], g[i]]; await MG.saveLists(ls.map(c => c.id === cur.id ? { ...c, games: g } : c)); return render(true); } };
    const q = el.querySelector('#mgq'); q.oninput = () => { s.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { render(true); const n = document.querySelector('#mgq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
    el.querySelector('#mgsort').onchange = e => set('sort', e.target.value); el.querySelector('#mgp').onchange = e => set('players', e.target.value); el.querySelector('#mga').onchange = e => set('access', e.target.value); } };
// Home: an obvious way to see every game
{ const h0 = VIEWS.home.render; VIEWS.home.render = function (el) { h0.call(this, el); const p = el.querySelector('.herot p'); if (p && !el.querySelector('.allgames')) p.insertAdjacentHTML('afterend', `<p class="allgames"><a class="btn" href="#mygames">Browse all ${pubCat().length} games</a> <a class="btn ghost" href="#" id="tolib">Jump to the full library</a></p>`);
    const j = el.querySelector('#tolib'); if (j) j.onclick = e => { e.preventDefault(); const l = el.querySelector('.lib'); if (l) l.scrollIntoView({ behavior: 'smooth' }); };
    if (App.freeOnly && !el.querySelector('.freebar')) { const lib = el.querySelector('.lib .libhead'); if (lib) lib.insertAdjacentHTML('afterend', `<p class="freebar okbox">Showing only the ${Access.list().size} free games. <button class="btn sm" id="showall">Show all ${pubCat().length}</button></p>`); const sa = el.querySelector('#showall'); if (sa) sa.onclick = () => { App.freeOnly = false; render(true); }; } }; }

// ---------- Members challenging non-members to members-only games ----------
// A non-member may join a members-only game when a member hosts the table. When it starts, the non-member uses one of
// their daily free games (as with any game) and the member uses one of 30 "premium invites" for the day. Games from
// the free 50 never use premium invites.
const PREMIUM_PER_DAY = 30;
const Prem = {
  day: () => new Date().toISOString().slice(0, 10),
  used() { const v = me().pinv || {}; return v.day === this.day() ? v.n || 0 : 0; },
  left() { return Math.max(0, PREMIUM_PER_DAY - this.used()); },
  needs(t) { if (!t || !GAME[t.game] || Access.free(t.game)) return false; return arr(t.seats).some(u => u && !String(u).startsWith('ai:') && u !== Store.uid && !isMember(u)); },
  async spend(t) { const k = 'pinv:' + t.id + ':' + ((t.round || 0) + 1); if (LS.get(k)) return; LS.set(k, 1); await saveMe({ pinv: { day: this.day(), n: this.used() + 1 } }); } };
Access.guestOK = t => !!t && (isMember(t.host) || (typeof Dev !== 'undefined' && Dev.allowed && t.host === Store.uid && Dev.allowed()));
{ const g0 = gate; gate = async function () { if (App.view === 'table') { const t = Store.get('tables', App.arg); if (t && Access.locked(t.game) && Access.guestOK(t)) { return Quota.left() > 0 ? await Quota.use() : (Access.prompt(t.game), false); } } return g0(); }; }
{ const T = VIEWS.table, sc = T.seatClick; T.seatClick = async function (id, e) { const b = e.target.closest && e.target.closest('button'), t = Store.get('tables', id);
    if (b && b.dataset.sit !== undefined && t && Access.locked(t.game)) { if (!Access.guestOK(t)) { Access.prompt(t.game); return; } if (Quota.left() <= 0) { toast('You’ve used today’s free games. Become a member to keep playing.'); return; } }
    return sc.call(this, id, e); };
  const cc = T.ctlClick; T.ctlClick = async function (id, e) { const b = e.target.closest && e.target.closest('[data-c]'), t = Store.get('tables', id), c = b && b.dataset.c;
    const starting = t && (c === 'start' || c === 'rematch') && t.host === Store.uid && Prem.needs(t);
    if (starting && isMember() && Prem.left() <= 0) { toast(`You’ve used all ${PREMIUM_PER_DAY} members-only game invites for today. Games from the free ${Access.list().size} are always unlimited.`); return; }
    const r = await cc.call(this, id, e); if (starting) { const nt = Store.get('tables', id); if (nt && nt.status === 'playing') await Prem.spend(nt); } return r; }; }
// Show the allowance where a member invites people
{ const ch = challenge; challenge = function (gid, n) { ch(gid, n); const box = document.querySelector('#modal.open .mbox'); if (!box) return; const h = box.querySelector('h2'); if (!h) return;
    if (!Access.free(gid)) h.insertAdjacentHTML('afterend', `<p class="okbox small">${isMember() ? `Members-only game. Friends without a membership can join you: each game you start with them uses one of your <b>${Prem.left()} of ${PREMIUM_PER_DAY}</b> members-only invites left today, and one of their daily free games. Games from the free ${Access.list().size} are unlimited.` : 'This is a members-only game. Become a member to challenge friends to it.'}</p>`); }; }
// Members see their allowance in the account menu line
{ const sh = shell; shell = function () { sh(); const q = document.getElementById('quota'); if (q && isMember()) q.title = `Member: unlimited games · ${Prem.left()} of ${PREMIUM_PER_DAY} members-only invites to non-members left today`; }; }

// ---------- Not a dating site: Match and every dating option are gone ----------
{ const off = Flags.off.bind(Flags); Flags.off = k => k === 'match' || off(k); Flags.FEATS = Flags.FEATS.filter(f => f[0] !== 'match'); }
{ const g = Config.get; Config.get = function () { const c = g.call(this); if (!arr(c.featuresOff).includes('match')) c.featuresOff = arr(c.featuresOff).concat('match'); return c; }; }
for (let i = NAV.length - 1; i >= 0; i--) if (NAV[i][0] === 'match') NAV.splice(i, 1);
if (NAV.__added) NAV.__added = NAV.__added.filter(n => n[0] !== 'match');
VIEWS.match = { render(el) { location.replace('#home'); el.innerHTML = ''; } };
// Keep "My games" right under "Games" in the menu
{ const sh = shell; shell = function () { const i = NAV.findIndex(n => n[0] === 'mygames'); if (i > 1) { const [x] = NAV.splice(i, 1); NAV.splice(1, 0, x); } sh(); }; }
