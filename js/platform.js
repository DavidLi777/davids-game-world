// Platform features found on the leading game sites: ratings, matchmaking, join codes, clocks, draw offers and takebacks,
// replays, tournaments, daily challenge, quests, streaks, achievements, coins and cosmetics, favourites, reviews, live games,
// emotes, profanity filter, family mode and referrals.
const dayStr = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const NEWSET = new Set(CATALOG.filter(g => g.rank >= 100).map(g => g.id));

// ---------- Profanity filter (applied when messages, posts and comments are saved) ----------
const BADWORDS = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'dick', 'pussy', 'slut', 'whore', 'fag', 'nigger', 'nigga', 'retard', 'motherfucker', 'bullshit', 'wanker', 'twat', 'prick', 'cock'];
const BADRE = new RegExp('\\b(' + BADWORDS.map(w => w.split('').join('[\\W_]*')).join('|') + ')(s|es|ed|ing|er|ers)?\\b', 'gi');
const scrubText = s => typeof s === 'string' ? s.replace(BADRE, m => m[0] + '*'.repeat(Math.max(2, m.length - 1))) : s;
const scrubDoc = d => { if (!d || typeof d !== 'object') return d; const o = { ...d }; for (const k of ['text', 'body', 'title', 'caption', 'bio']) if (typeof o[k] === 'string') o[k] = scrubText(o[k]); return o; };
{ const _put = Store.put.bind(Store); Store.put = (c, id, d) => _put(c, id, ['msgs', 'posts', 'comments', 'reviews'].includes(c) && LS.get('profan', true) !== false ? scrubDoc(d) : d); }

// ---------- Ratings (Elo, per game, for games against people) ----------
const Rating = {
  of(uid, gid) { const r = ((prof(uid).ratings || {})[gid]) || null; return r ? r.r : 1200; },
  games(uid, gid) { return (((prof(uid).ratings || {})[gid]) || {}).n || 0; },
  label(uid, gid) { const n = this.games(uid, gid); return n ? `${this.of(uid, gid)}${n < 10 ? '?' : ''}` : '1200?'; },
  async apply(t, r) { const seats = arr(t.seats), mine = seats.indexOf(Store.uid), humans = seats.filter(s => s && !s.startsWith('ai:')); if (mine < 0 || humans.length < 2) return;
    const opp = humans.filter(u => u !== Store.uid), oppR = opp.reduce((a, u) => a + this.of(u, t.game), 0) / opp.length, R = this.of(Store.uid, t.game), n = this.games(Store.uid, t.game);
    const S = r.winner === -1 ? 0.5 : r.team ? (mine % 2 === r.winner % 2 ? 1 : 0) : r.winner === mine ? 1 : 0, E = 1 / (1 + 10 ** ((oppR - R) / 400)), K = n < 10 ? 40 : n < 30 ? 24 : 16;
    const nr = Math.max(100, Math.round(R + K * (S - E))); await saveMe({ ratings: { [t.game]: { r: nr, n: n + 1, peak: Math.max(nr, (((me().ratings || {})[t.game]) || {}).peak || 0) } } });
    toast(`Rating ${R} → ${nr} (${nr >= R ? '+' : ''}${nr - R})`); } };

// ---------- Coins, streaks, quests, achievements ----------
const Coins = { get() { return me().coins || 0; }, async add(n, why) { await saveMe({ coins: Math.max(0, this.get() + n) }); if (n > 0) toast(`+${n} coins${why ? ' · ' + why : ''}`); shell(); } };
const QUEST_POOL = [
  ['play3', 'Play 3 games', 3, e => e.type === 'result'], ['win2', 'Win 2 games', 2, e => e.type === 'result' && e.outcome === 'win'],
  ['beat5', 'Beat the computer at level 5 or higher', 1, e => e.type === 'result' && e.outcome === 'win' && e.level >= 5], ['card2', 'Play 2 card games', 2, e => e.type === 'result' && GAME[e.gid].cat === 'Card'],
  ['board2', 'Play 2 board games', 2, e => e.type === 'result' && GAME[e.gid].cat === 'Board'], ['puzzle1', 'Finish a puzzle', 1, e => e.type === 'result' && GAME[e.gid].cat === 'Puzzle' && e.outcome === 'win'],
  ['arcade2', 'Play 2 arcade games', 2, e => e.type === 'result' && GAME[e.gid].cat === 'Arcade'], ['word1', 'Play a word game', 1, e => e.type === 'result' && GAME[e.gid].cat === 'Word'],
  ['dice2', 'Play 2 dice games', 2, e => e.type === 'result' && GAME[e.gid].cat === 'Dice'], ['online1', 'Finish a game against a person', 1, e => e.type === 'online'],
  ['daily1', "Play today's daily challenge", 1, e => e.type === 'daily'], ['new1', 'Try a game you have never played', 1, e => e.type === 'result' && e.first],
  ['chat3', 'Send 3 chat messages', 3, e => e.type === 'chat']];
const Quests = {
  today() { const d = dayStr(), h = hashStr(d + Store.uid), pool = QUEST_POOL.slice(), out = []; let x = h; while (out.length < 3) { x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; const q = pool.splice(x % pool.length, 1)[0]; out.push(q); } return out; },
  state() { const q = me().quests || {}; return q.day === dayStr() ? q : { day: dayStr(), prog: {}, done: [] }; },
  async event(e) { const st = this.state(), qs = this.today(); let changed = false, reward = 0;
    for (const [id, name, need, test] of qs) { if (st.done.includes(id)) continue; try { if (!test(e)) continue; } catch (er) { continue; } st.prog[id] = (st.prog[id] || 0) + 1; changed = true; if (st.prog[id] >= need) { st.done.push(id); reward += 40; toast(`Quest complete: ${name}`); } }
    if (st.done.length === 3 && !st.bonus) { st.bonus = true; reward += 60; toast('All daily quests done! +60 bonus coins'); }
    if (changed) { await saveMe({ quests: st }); if (reward) await Coins.add(reward, 'daily quests'); } } };
const Streak = { async check() { const s = me().streak || {}, d = dayStr(), y = dayStr(Date.now() - 864e5); if (s.last === d) return; const n = s.last === y ? (s.n || 0) + 1 : 1; await saveMe({ streak: { last: d, n, best: Math.max(n, s.best || 0) } }); await Coins.add(Math.min(10 * n, 70), `day ${n} streak`); } };
const ACH = [
  ['first', 'First game', 'Play your first game', p => plays(p) >= 1], ['p10', 'Regular', 'Play 10 games', p => plays(p) >= 10], ['p100', 'Dedicated', 'Play 100 games', p => plays(p) >= 100], ['p500', 'David’s Game World legend', 'Play 500 games', p => plays(p) >= 500],
  ['w1', 'First win', 'Win a game', p => wins(p) >= 1], ['w25', 'Winner', 'Win 25 games', p => wins(p) >= 25], ['w100', 'Champion', 'Win 100 games', p => wins(p) >= 100],
  ['try10', 'Explorer', 'Try 10 different games', p => tried(p) >= 10], ['try50', 'Adventurer', 'Try 50 different games', p => tried(p) >= 50], ['try200', 'Completionist', 'Try every game in the library', p => tried(p) >= CATALOG.length],
  ['allcat', 'All-rounder', 'Play a game in every category', p => new Set(Object.keys(p.scores || {}).map(g => (GAME[g] || {}).cat)).size >= CATS.length],
  ['l10', 'Ruthless', 'Beat the computer at level 10', p => !!p.beat10], ['chess', 'Grandmaster in the making', 'Win 10 games of chess', p => ((p.scores || {}).chess || {}).w >= 10],
  ['r1400', 'Rising star', 'Reach a 1400 rating in any game', p => Object.values(p.ratings || {}).some(r => r.r >= 1400)], ['r1600', 'Expert', 'Reach a 1600 rating in any game', p => Object.values(p.ratings || {}).some(r => r.r >= 1600)],
  ['online10', 'Social player', 'Finish 10 games against people', p => (p.online || 0) >= 10], ['streak7', 'Week streak', 'Visit 7 days in a row', p => ((p.streak || {}).best || 0) >= 7], ['streak30', 'Month streak', 'Visit 30 days in a row', p => ((p.streak || {}).best || 0) >= 30],
  ['daily5', 'Daily devotee', 'Play 5 daily challenges', p => (p.dailies || 0) >= 5], ['tour', 'Tournament player', 'Play in a tournament', p => (p.tours || 0) >= 1], ['tourwin', 'Tournament champion', 'Win a tournament', p => (p.tourwins || 0) >= 1],
  ['friends5', 'Popular', 'Make 5 friends', p => arr(p.friends).filter(isFriend).length >= 5], ['review', 'Critic', 'Review a game', p => !!p.reviewed], ['fav', 'Collector', 'Favourite 5 games', p => arr(p.favs).length >= 5],
  ['shop', 'Stylish', 'Buy something in the shop', p => arr(p.owned).length >= 1], ['lvl10', 'Level 10', 'Reach player level 10', p => 1 + Math.floor(Math.sqrt((p.xp || 0) / 50)) >= 10]];
const plays = p => Object.values(p.scores || {}).reduce((a, s) => a + (s.plays || 0), 0), wins = p => Object.values(p.scores || {}).reduce((a, s) => a + (s.w || 0), 0), tried = p => Object.keys(p.scores || {}).length;
const Ach = { earned(p = me()) { return ACH.filter(a => { try { return a[3](p); } catch (e) { return false; } }); },
  async check() { const got = new Set(arr(me().ach)), now2 = this.earned().map(a => a[0]), fresh = now2.filter(id => !got.has(id)); if (!fresh.length) return; await saveMe({ ach: now2 }); for (const id of fresh) { const a = ACH.find(x => x[0] === id); toast(`Achievement unlocked: ${a[1]}`); } await Coins.add(25 * fresh.length, 'achievements'); } };

// ---------- Shop: cosmetics bought with coins ----------
const SHOP = [
  ['theme', 'classic', 'Classic green felt', 0], ['theme', 'midnight', 'Midnight blue', 150], ['theme', 'walnut', 'Walnut table', 200], ['theme', 'marble', 'Marble hall', 300], ['theme', 'sakura', 'Cherry blossom', 300], ['theme', 'neon', 'Neon arcade', 400],
  ['back', 'red', 'Red card backs', 0], ['back', 'blue', 'Blue card backs', 100], ['back', 'green', 'Green card backs', 100], ['back', 'gold', 'Gold card backs', 250], ['back', 'night', 'Starry night backs', 300],
  ['frame', 'none', 'No frame', 0], ['frame', 'gold', 'Gold frame', 200], ['frame', 'silver', 'Silver frame', 120], ['frame', 'neon', 'Neon frame', 300], ['frame', 'rainbow', 'Rainbow frame', 500],
  ['title', 'none', 'No title', 0], ['title', 'Rookie', 'Title: Rookie', 50], ['title', 'Strategist', 'Title: Strategist', 200], ['title', 'Puzzle wizard', 'Title: Puzzle wizard', 200], ['title', 'Card shark', 'Title: Card shark', 200], ['title', 'Arcade ace', 'Title: Arcade ace', 200], ['title', 'Grandmaster', 'Title: Grandmaster', 600], ['title', 'Legend', 'Title: Legend', 1000]];
const Cosm = { eq(uid = Store.uid) { return prof(uid).eq || {}; }, owns(kind, id) { const it = SHOP.find(s => s[0] === kind && s[1] === id); return !it || it[3] === 0 || arr(me().owned).includes(kind + ':' + id); },
  apply() { const e = this.eq(), r = document.documentElement; r.dataset.theme2 = e.theme || 'classic'; r.dataset.back = e.back || 'red'; },
  title(uid) { const t = this.eq(uid).title; return t && t !== 'none' ? t : ''; } };

// ---------- Favourites, recents, reviews ----------
const Fav = { has(g) { return arr(me().favs).includes(g); }, async toggle(g) { const f = arr(me().favs); await saveMe({ favs: f.includes(g) ? f.filter(x => x !== g) : [g, ...f].slice(0, 60) }); render(true); } };
const Reviews = { of(g) { return Store.all('reviews').filter(r => r.game === g); }, avg(g) { const rs = this.of(g); return rs.length ? rs.reduce((a, r) => a + r.stars, 0) / rs.length : 0; },
  async save(g, stars, text) { await Store.put('reviews', `${g}_${Store.uid}`, { game: g, uid: Store.uid, stars, text: (text || '').slice(0, 600), ts: now() }); if (!me().reviewed) await saveMe({ reviewed: true }); Ach.check(); } };
const stars = (v, size = 14) => `<span class="stars" style="--s:${size}px" aria-label="${v.toFixed(1)} of 5 stars"><i style="width:${v / 5 * 100}%"></i></span>`;

// ---------- Daily challenge: the same seeded game for everyone today ----------
const Daily = { game() { const solo = pubCat().filter(g => g.solo && !['twentyq', 'bingo', 'typing'].includes(g.id)); return solo[hashStr('daily' + dayStr()) % solo.length]; }, seed() { return hashStr('seed' + dayStr()); },
  rows() { return Store.all('daily').filter(d => d.day === dayStr()).sort((a, b) => b.score - a.score); },
  async start() { const g = this.game(); if (!await gate()) return; location.hash = 'game-' + g.id; await new Promise(r => setTimeout(r, 250)); App.dailyRun = { day: dayStr(), gid: g.id }; Rng.use(this.seed()); startSolo(g.id, 5); const old = App.cleanup; App.cleanup = () => { Rng.restore(); App.dailyRun = null; old && old(); };
    const bar = $('.mbar'); if (bar) bar.insertAdjacentHTML('afterbegin', `<span class="pill hot">Daily challenge · ${dayStr()}</span>`); },
  async record(score) { const id = `${dayStr()}_${String(Store.uid).replace(/[^\w-]/g, '_')}`, cur = Store.get('daily', id); if (!cur || score > cur.score) await Store.put('daily', id, { day: dayStr(), game: this.game().id, uid: Store.uid, score: Math.round(score), ts: now() }); await saveMe({ dailies: (me().dailies || 0) + 1 }); Quests.event({ type: 'daily' }); } };

// ---------- Hook into results ----------
{ const _rec = recordResult; recordResult = async function (gid, o) { const first = !((me().scores || {})[gid]); await _rec(gid, o);
    if (o.outcome === 'win' && (o.level || 0) >= 10 && TB[gid]) await saveMe({ beat10: true });
    if (App.dailyRun && App.dailyRun.gid === gid) Daily.record(o.score || 0);
    const recent = [gid, ...arr(me().recent).filter(x => x !== gid)].slice(0, 12); await saveMe({ recent });
    await Quests.event({ type: 'result', gid, outcome: o.outcome, level: o.level || 0, score: o.score || 0, first }); if (o.outcome === 'win') await Coins.add(5 + Math.round((o.level || 3) / 2), 'win'); Ach.check(); }; }

// ---------- Online table extras: join codes, clocks, offers, history, emotes ----------
const TCS = [['none', 'No clock'], ['1+0', 'Bullet · 1 min'], ['3+2', 'Blitz · 3 min + 2 s'], ['5+0', 'Blitz · 5 min'], ['10+5', 'Rapid · 10 min + 5 s'], ['30+0', 'Classical · 30 min'], ['d1', 'Daily · 1 day per move'], ['d3', 'Daily · 3 days per move']];
const Tbl = {
  code: () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); },
  clockInit(t) { const tc = t.tc || 'none'; if (tc === 'none' || t.n !== 2) return null; if (tc[0] === 'd') return { left: [0, 0], last: now(), daily: +tc.slice(1) * 864e5 }; const [m, inc] = tc.split('+').map(Number); return { left: [m * 60e3, m * 60e3], last: now(), inc: inc * 1000 }; },
  clockMove(c, turn) { if (!c) return c; const n = { ...c, left: c.left.slice() }; if (c.daily) { n.last = now(); return n; } n.left[turn] = Math.max(0, n.left[turn] - (now() - c.last)) + (c.inc || 0); n.last = now(); return n; },
  remaining(c, seat, turn) { if (!c) return null; if (c.daily) return seat === turn ? c.daily - (now() - c.last) : c.daily; return seat === turn ? c.left[seat] - (now() - c.last) : c.left[seat]; },
  fmt(ms) { if (ms == null) return ''; ms = Math.max(0, ms); if (ms > 864e5) return Math.floor(ms / 864e5) + 'd ' + Math.floor(ms % 864e5 / 36e5) + 'h'; if (ms > 36e5) return Math.floor(ms / 36e5) + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm'; const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; },
  // extra fields to write with every move
  onMove(t, m, turn) { return { hist: arr(t.hist).concat([m]).slice(-800), prev: { state: t.state, hist: arr(t.hist), clock: t.clock || null }, clock: this.clockMove(t.clock, turn), offer: null, lastMove: now() }; },
  onStart(t, st) { return { init: st, hist: [], prev: null, clock: this.clockInit(t), offer: null, emote: null, rated: false }; },
  emotes: ['👍', '😂', '😮', '😢', '🔥', '🤝', '🎉', '🤔'], phrases: ['Good game!', 'Nice move!', 'Good luck!', 'Thanks!', 'Your turn', 'Oops', 'Well played', 'Rematch?'],
  async patch(id, p) { const cur = Store.get('tables', id); if (!cur) return; const base = { ...cur }; delete base.id; await Store.put('tables', id, { ...base, ...p, ts: now() }); },
  extrasHTML(t) { const mine = arr(t.seats).indexOf(Store.uid), two = t.n === 2 && !SO[t.game], G = TB[t.game]; let h = '';
    if (t.status === 'open' && t.code) h += `<div class="tcode"><span>Join code <b>${esc(t.code)}</b></span><button class="btn sm" data-x="copycode">Copy invite link</button></div>`;
    if (t.status === 'open' && t.host === Store.uid && two) h += `<label class="fld inline">Clock <select data-x="tc">${TCS.map(([v, l]) => `<option value="${v}" ${v === (t.tc || 'none') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    if (t.status === 'playing' && mine >= 0 && two) { const o = t.offer; h += o && o.by !== Store.uid ? `<span class="pill hot">${o.type === 'draw' ? 'Draw offered' : 'Takeback requested'}</span><button class="btn sm hot" data-x="accept">Accept</button><button class="btn sm" data-x="decline">Decline</button>` : o ? `<span class="muted small">${o.type === 'draw' ? 'Draw offer' : 'Takeback request'} sent</span>` : `<button class="btn sm" data-x="draw">Offer draw</button>${t.prev && G.turn(t.state) !== mine ? '<button class="btn sm" data-x="undo">Ask to take back</button>' : ''}`; }
    if (mine >= 0 && t.status === 'playing') h += `<div class="emotes">${this.emotes.map(e => `<button class="emo" data-emo="${e}" aria-label="Send ${e}">${e}</button>`).join('')}<select data-x="phrase" aria-label="Quick chat"><option value="">Quick chat…</option>${this.phrases.map(p => `<option>${esc(p)}</option>`).join('')}</select></div>`;
    if (t.status === 'done' && t.init && TB[t.game]) h += `<button class="btn sm" data-x="replay">Watch replay</button>`;
    return h ? `<div class="textras">${h}</div>` : ''; },
  async extrasClick(t, e) { const b = e.target.closest('[data-x],[data-emo]'); if (!b) return; const x = b.dataset.x, mine = arr(t.seats).indexOf(Store.uid);
    if (b.dataset.emo) return this.patch(t.id, { emote: { by: Store.uid, e: b.dataset.emo, ts: now() } });
    if (x === 'copycode') { try { await navigator.clipboard.writeText(`${Config.url()}#table-${t.id}  (join code ${t.code})`); toast('Invite link copied.'); } catch (er) { toast('Code: ' + t.code); } }
    if (x === 'draw' || x === 'undo') { await this.patch(t.id, { offer: { type: x, by: Store.uid } }); toast(x === 'draw' ? 'Draw offered.' : 'Takeback requested.'); }
    if (x === 'decline') await this.patch(t.id, { offer: null });
    if (x === 'accept') { const o = t.offer; if (!o) return; if (o.type === 'draw') await this.patch(t.id, { status: 'done', result: { winner: -1, agreed: true }, offer: null }); else if (t.prev) await this.patch(t.id, { state: t.prev.state, hist: t.prev.hist, clock: t.prev.clock ? { ...t.prev.clock, last: now() } : null, prev: null, offer: null }); }
    if (x === 'replay') { const id = await Replays.save(t.game, t.init, arr(t.hist), arr(t.seats).map(s => s ? (s.startsWith('ai:') ? 'Computer L' + s.slice(3) : Names.of(s)) : ''), t.result); location.hash = 'replay-' + id; } },
  async extrasChange(t, e) { const x = e.target.dataset.x; if (x === 'tc') await this.patch(t.id, { tc: e.target.value }); if (x === 'phrase' && e.target.value) { await sendMsg('table:' + t.id, { text: e.target.value }); e.target.value = ''; } },
  timeoutCheck(t) { if (t.status !== 'playing' || !t.clock || SO[t.game]) return; const G = TB[t.game], turn = G.turn(t.state), left = this.remaining(t.clock, turn, turn); if (left > 0) return; const mine = arr(t.seats).indexOf(Store.uid); if (mine < 0 && t.host !== Store.uid) return;
    if (this._to === t.id + t.lastMove) return; this._to = t.id + t.lastMove; this.patch(t.id, { status: 'done', result: { winner: 1 - turn, timeout: turn } }); },
  clockHTML(t) { if (!t.clock || !t.state || SO[t.game]) return ''; const G = TB[t.game], turn = t.status === 'playing' ? G.turn(t.state) : -1, names = arr(t.seats).map(s => s ? (s.startsWith('ai:') ? 'Computer' : Names.of(s)) : '');
    return `<div class="clocks">${[0, 1].map(i => `<span class="clk ${i === turn ? 'on' : ''} ${this.remaining(t.clock, i, turn) < 20e3 && !t.clock.daily ? 'low' : ''}" data-clk="${i}"><small>${esc(names[i])}</small><b>${this.fmt(this.remaining(t.clock, i, turn))}</b></span>`).join('')}</div>`; } };

// ---------- Replays ----------
const Replays = {
  async save(game, init, moves, names, result) { const id = uid8(); await Store.put('replays', id, { game, init, moves, names, result: result || null, by: Store.uid, ts: now() }); return id; },
  local: null };
VIEWS.replay = { render(el, id) { const r = id === 'local' ? Replays.local : Store.get('replays', id); if (!r) { el.innerHTML = '<section class="band"><h1>Replay not found</h1><a class="btn" href="#home">Back to games</a></section>'; return; }
  const G = TB[r.game], g = GAME[r.game]; if (!G) return; const states = [r.init]; for (const m of r.moves) { try { states.push(G.play(states[states.length - 1], m)); } catch (e) { break; } } let k = 0, play = null;
  el.innerHTML = `<section class="ghead" style="--c:${CAT_COLOR[g.cat]}"><a href="#game-${r.game}" class="back">← ${esc(g.name)}</a><div class="ghrow"><span class="art">${art(g, 56)}</span><div><h1>${esc(g.name)} replay</h1><p>${esc(arr(r.names).filter(Boolean).join(' vs '))}${r.ts ? ' · ' + new Date(r.ts).toLocaleDateString() : ''}</p></div></div></section>
    <div class="gwrap"><div class="stage"><div class="match"><div class="mbar" id="mbar"></div><div class="board" id="board"></div><div class="row-btns rpctl"><button class="btn" data-r="first" aria-label="First move">⏮</button><button class="btn" data-r="prev" aria-label="Previous move">◀</button><button class="btn hot" data-r="play">Play</button><button class="btn" data-r="next" aria-label="Next move">▶</button><button class="btn" data-r="last" aria-label="Last move">⏭</button>${id !== 'local' ? '<button class="btn" data-r="share">Share replay</button>' : '<button class="btn" data-r="save">Save and share</button>'}</div><input type="range" id="rpk" min="0" max="${states.length - 1}" value="0" aria-label="Move"></div></div><aside class="side"><h3>Moves</h3><ol class="mlist">${r.moves.map((m, i) => `<li data-k="${i + 1}">${esc(JSON.stringify(m).replace(/[{}"]/g, '').slice(0, 24))}</li>`).join('')}</ol></aside></div>`;
  const x = { el: $('#board'), can: false, me: 0, names: arr(r.names), sel: null, on() {}, act() {}, redraw() {} };
  const show = () => { k = Math.max(0, Math.min(states.length - 1, k)); v2view(G, states[k], x); $('#mbar').innerHTML = `<b>Move ${k} of ${states.length - 1}</b>${k === states.length - 1 && r.result ? `<span class="muted">${esc(resultLine(r.result, arr(r.names), -1).replace(/<[^>]+>/g, '').replace(/\bYou wins\b/, 'You win'))}</span>` : ''}`; $('#rpk').value = k; el.querySelectorAll('.mlist li').forEach(li => li.classList.toggle('on', +li.dataset.k === k)); };
  el.querySelector('.rpctl').onclick = async e => { const b = e.target.closest('[data-r]'); if (!b) return; const a = b.dataset.r; if (a === 'first') k = 0; if (a === 'last') k = states.length - 1; if (a === 'prev') k--; if (a === 'next') k++;
    if (a === 'play') { if (play) { clearInterval(play); play = null; b.textContent = 'Play'; } else { b.textContent = 'Pause'; play = setInterval(() => { if (k >= states.length - 1) { clearInterval(play); play = null; b.textContent = 'Play'; return; } k++; show(); }, 900); } }
    if (a === 'share') { try { await navigator.clipboard.writeText(`${Config.url()}#replay-${id}`); toast('Replay link copied.'); } catch (er) { toast('Copy blocked.'); } }
    if (a === 'save') { const nid = await Replays.save(r.game, r.init, r.moves, r.names, r.result); location.hash = 'replay-' + nid; return; } show(); };
  el.querySelector('.mlist').onclick = e => { const li = e.target.closest('li'); if (li) { k = +li.dataset.k; show(); } }; $('#rpk').oninput = e => { k = +e.target.value; show(); };
  App.cleanup = () => clearInterval(play); show(); } };

// ---------- Matchmaking ----------
async function quickMatch(gid) { const g = GAME[gid]; if (!await gate()) return; const myR = Rating.of(Store.uid, gid);
  const open = Store.all('tables').filter(t => t.game === gid && t.quick && t.status === 'open' && arr(t.seats).includes(null) && !arr(t.seats).includes(Store.uid) && now() - t.ts < 15 * 60e3 && (Store.online().has(t.host) || Store.mode !== 'shared'))
    .sort((a, b) => Math.abs(Rating.of(a.host, gid) - myR) - Math.abs(Rating.of(b.host, gid) - myR));
  for (const t of open) { if (!(await Store.acquire('tables', t.id))) continue; const cur = Store.get('tables', t.id), ss = arr(cur.seats).slice(), i = ss.indexOf(null); if (i < 0) continue; ss[i] = Store.uid; const base = { ...cur }; delete base.id; await Store.put('tables', t.id, { ...base, seats: ss, ts: now() }); location.hash = 'table-' + t.id; toast('Match found!'); return; }
  const id = await createTable(gid, Math.max(2, g.minP), []); if (!id) return; await Tbl.patch(id, { quick: true, tc: TB[gid] && Math.max(2, g.minP) === 2 ? (App.qtc || 'none') : 'none' }); location.hash = 'table-' + id; toast('Looking for an opponent. The game starts when someone joins.'); }
function joinByCode(code) { code = String(code || '').trim().toUpperCase(); const t = Store.all('tables').find(x => x.code === code && x.status !== 'done'); if (!t) return toast('No open table with that code.'); location.hash = 'table-' + t.id; }

// ---------- Tournaments ----------
const Tour = {
  list() { return Store.all('tours').sort((a, b) => b.start - a.start); },
  status(t) { return now() < t.start ? 'soon' : now() < t.start + t.dur * 60e3 ? 'live' : 'over'; },
  pts(tid) { return Store.all('tourpts').filter(p => p.tour === tid).sort((a, b) => b.pts - a.pts || b.w - a.w); },
  key: (tid, uid) => `${tid}_${String(uid).replace(/[^\w-]/g, '_')}`,
  async join(t) { const k = this.key(t.id, Store.uid); if (!Store.get('tourpts', k)) await Store.put('tourpts', k, { tour: t.id, uid: Store.uid, pts: 0, w: 0, d: 0, l: 0, games: 0, best: 0, ts: now() }); await saveMe({ tours: (me().tours || 0) + 1 }); Ach.check(); toast('You joined the tournament.'); },
  async queue(t, on) { await Store.put('tourq', this.key(t.id, Store.uid), { tour: t.id, uid: Store.uid, waiting: on, ts: now() }); },
  async pair(t) { if (this.status(t) !== 'live' || SO[t.game]) return; const w = Store.all('tourq').filter(q => q.tour === t.id && q.waiting && (Store.online().has(q.uid) || Store.mode !== 'shared') && now() - q.ts < 10 * 60e3).sort((a, b) => a.ts - b.ts);
    if (w.length < 2 || w[0].uid !== Store.uid) return; const [a, b] = w, tid = 'T' + uid8(), st = TB[t.game].init(2);
    await Store.put('tables', tid, { game: t.game, host: a.uid, seats: [a.uid, b.uid], n: 2, status: 'playing', invited: [], ts: now(), state: st, round: 1, tour: t.id, tc: t.tc || 'none', ...Tbl.onStart({ n: 2, tc: t.tc || 'none', game: t.game }, st) });
    await Store.put('tourq', this.key(t.id, a.uid), { tour: t.id, uid: a.uid, waiting: false, ts: now(), table: tid }); await Store.put('tourq', this.key(t.id, b.uid), { tour: t.id, uid: b.uid, waiting: false, ts: now(), table: tid }); },
  async score(table, r) { if (!table.tour) return; const k = this.key(table.tour, Store.uid), cur = Store.get('tourpts', k); if (!cur) return; const mine = arr(table.seats).indexOf(Store.uid), win = r.winner === mine, draw = r.winner === -1;
    await Store.put('tourpts', k, { ...cur, id: undefined, pts: cur.pts + (win ? 2 : draw ? 1 : 0), w: cur.w + (win ? 1 : 0), d: cur.d + (draw ? 1 : 0), l: cur.l + (!win && !draw ? 1 : 0), games: cur.games + 1, ts: now() }); },
  async soloScore(tour, score) { const k = this.key(tour.id, Store.uid), cur = Store.get('tourpts', k); if (!cur || this.status(tour) !== 'live') return; if (score > (cur.best || 0)) await Store.put('tourpts', k, { ...cur, id: undefined, best: Math.round(score), pts: Math.round(score), games: cur.games + 1, ts: now() }); },
  async claim(t) { const rows = this.pts(t.id), pos = rows.findIndex(r => r.uid === Store.uid); if (pos < 0 || pos > 2 || LS.get('tclaim:' + t.id)) return; LS.set('tclaim:' + t.id, 1); await Coins.add([300, 150, 75][pos], `tournament place ${pos + 1}`); if (pos === 0) { await saveMe({ tourwins: (me().tourwins || 0) + 1 }); Ach.check(); } } };
VIEWS.tournaments = { render(el) { const ts = Tour.list(), playable = pubCat().filter(g => isPlayable(g.id) && (g.solo || g.minP <= 2));
  el.innerHTML = `<section class="band"><h1>Tournaments</h1><p class="lead">Arena tournaments: join, then press "Find a game" as often as you like while it runs. Win 2 points, draw 1. In single-player tournaments everyone plays the same seeded game and your best score counts. Top three win coins.</p>
    <div class="tgrid">${ts.map(t => { const st = Tour.status(t), g = GAME[t.game] || { name: t.game, cat: 'Board' }; return `<a class="tourcard ts-${st}" href="#tour-${t.id}" style="--c:${CAT_COLOR[g.cat]}">${art(g, 44)}<span><b>${esc(t.name)}</b><small>${esc(g.name)} · ${st === 'soon' ? 'starts ' + new Date(t.start).toLocaleString() : st === 'live' ? 'live now · ends ' + new Date(t.start + t.dur * 60e3).toLocaleTimeString() : 'finished'} · ${Tour.pts(t.id).length} players</small></span></a>`; }).join('') || '<p class="empty">No tournaments yet. Create the first one.</p>'}</div>
    <h2>Create a tournament</h2><form class="aform grid2" id="tf"><label class="fld">Name<input name="name" required maxlength="60" value="${esc(Names.of(Store.uid))}'s arena"></label><label class="fld">Game<select name="game">${playable.map(g => `<option value="${g.id}">${esc(g.name)}${g.solo ? ' (score)' : ''}</option>`).join('')}</select></label>
      <label class="fld">Starts<select name="start"><option value="0">Now</option><option value="10">In 10 minutes</option><option value="60">In 1 hour</option><option value="1440">Tomorrow</option></select></label><label class="fld">Length<select name="dur"><option value="10">10 minutes</option><option value="30" selected>30 minutes</option><option value="60">1 hour</option><option value="1440">1 day</option></select></label>
      <label class="fld">Clock (two-player games)<select name="tc">${TCS.filter(x => x[0][0] !== 'd').map(([v, l]) => `<option value="${v}" ${v === '3+2' ? 'selected' : ''}>${l}</option>`).join('')}</select></label><div class="full"><button class="btn hot">Create tournament</button></div></form></section>`;
  $('#tf').onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), id = uid8(); await Store.put('tours', id, { name: d.name.slice(0, 60), game: d.game, start: now() + +d.start * 60e3, dur: +d.dur, tc: d.tc, by: Store.uid, seed: (Math.random() * 2 ** 31) | 0, ts: now() }); location.hash = 'tour-' + id; }; } };
VIEWS.tour = { render(el, id) { const t = Store.get('tours', id); if (!t) { el.innerHTML = '<section class="band"><h1>Tournament not found</h1><a class="btn" href="#tournaments">All tournaments</a></section>'; return; }
  const g = GAME[t.game], st = Tour.status(t), rows = Tour.pts(id), meIn = rows.some(r => r.uid === Store.uid), q = Store.get('tourq', Tour.key(id, Store.uid)), solo = !!SO[t.game], left = t.start + t.dur * 60e3 - now();
  const myTable = Store.all('tables').find(x => x.tour === id && x.status === 'playing' && arr(x.seats).includes(Store.uid));
  if (myTable && App.view === 'tour' && LS.get('tgo:' + Store.uid) !== myTable.id) { LS.set('tgo:' + Store.uid, myTable.id); location.hash = 'table-' + myTable.id; return; }
  if (st === 'over' && meIn) Tour.claim(t);
  el.innerHTML = `<section class="band"><a href="#tournaments" class="back">← Tournaments</a><h1>${esc(t.name)}</h1><p class="lead">${esc(g.name)} · ${st === 'soon' ? 'starts ' + new Date(t.start).toLocaleString() : st === 'live' ? `<b>Live</b> · ${Tbl.fmt(left)} left` : 'Finished'} · ${solo ? 'best score wins' : 'arena: win 2, draw 1'}${!solo && t.tc && t.tc !== 'none' ? ' · clock ' + esc(t.tc) : ''}</p>
    <div class="row-btns">${!meIn && st !== 'over' ? '<button class="btn hot" data-t="join">Join tournament</button>' : ''}${meIn && st === 'live' ? (solo ? '<button class="btn hot" data-t="solo">Play your round</button>' : q && q.waiting ? '<span class="pill hot">Looking for an opponent…</span><button class="btn" data-t="stop">Stop searching</button>' : '<button class="btn hot" data-t="find">Find a game</button>') : ''}<button class="btn" data-t="share">Share</button></div>
    <h2>Standings</h2>${rows.length ? `<table class="lb"><thead><tr><th>#</th><th>Player</th><th class="num">${solo ? 'Best score' : 'Points'}</th>${solo ? '' : '<th class="num">W</th><th class="num">D</th><th class="num">L</th>'}<th class="num">Games</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.uid === Store.uid ? 'me' : ''}"><td>${i < 3 && st === 'over' ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td>${avatar(r.uid, 24)} ${nameLink(r.uid)} <small class="muted">${Rating.label(r.uid, t.game)}</small></td><td class="num">${r.pts}</td>${solo ? '' : `<td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td>`}<td class="num">${r.games}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No players yet.</p>'}
    ${!solo ? `<h3>Games in progress</h3><div class="tables">${Store.all('tables').filter(x => x.tour === id && x.status === 'playing').map(tableCard).join('') || '<p class="muted">None right now.</p>'}</div>` : ''}</section>`;
  el.onclick = async e => { const b = e.target.closest('[data-t]'); if (!b) return; const a = b.dataset.t;
    if (a === 'join') await Tour.join(t); if (a === 'find') { if (!await gate()) return; LS.set('tgo:' + Store.uid, ''); await Tour.queue(t, true); setTimeout(() => Tour.pair(Store.get('tours', id)), 600); } if (a === 'stop') await Tour.queue(t, false);
    if (a === 'solo') { if (!await gate()) return; location.hash = 'game-' + t.game; await new Promise(r => setTimeout(r, 250)); App.tourRun = t.id; Rng.use(t.seed); startSolo(t.game, 5); const old = App.cleanup; App.cleanup = () => { Rng.restore(); App.tourRun = null; old && old(); }; const bar = $('.mbar'); if (bar) bar.insertAdjacentHTML('afterbegin', `<span class="pill hot">${esc(t.name)}</span>`); }
    if (a === 'share') { try { await navigator.clipboard.writeText(`${Config.url()}#tour-${id}`); toast('Tournament link copied.'); } catch (er) { toast('Copy blocked.'); } }
    if (a !== 'solo' && a !== 'share') render(true); };
  clearInterval(this.iv); this.iv = setInterval(() => { if (App.view !== 'tour') return clearInterval(this.iv); const cur = Store.get('tours', id); if (cur && Tour.status(cur) === 'live') Tour.pair(cur); }, 2500); App.cleanup = () => clearInterval(this.iv); } };
{ const _rec2 = recordResult; recordResult = async function (gid, o) { await _rec2(gid, o); if (App.tourRun) { const t = Store.get('tours', App.tourRun); if (t && t.game === gid) Tour.soloScore(t, o.score || 0); } }; }

// ---------- Live games (spectate) ----------
VIEWS.tv = { render(el) { const live = Store.all('tables').filter(t => t.status === 'playing' && Hide.shows(t.game) && now() - t.ts < 3 * 3600e3).sort((a, b) => Math.max(...arr(b.seats).map(s => s && !s.startsWith('ai:') ? Rating.of(s, b.game) : 0)) - Math.max(...arr(a.seats).map(s => s && !s.startsWith('ai:') ? Rating.of(s, a.game) : 0)));
  const feat = live[0];
  el.innerHTML = `<section class="band"><h1>Live games</h1><p class="lead">Watch any game in progress. Spectators can chat at the table and never use their daily games.</p>${feat ? `<h2>Featured game</h2><div class="tables">${tableCard(feat)}</div>` : ''}<h2>All live games <small>${live.length}</small></h2><div class="tables">${live.map(tableCard).join('') || '<p class="empty">No live games right now. Start one from any game page.</p>'}</div>
    <h2>Recent replays</h2><div class="tables">${Store.all('replays').slice(0, 12).map(r => `<a class="tcard" href="#replay-${esc(r.id)}" style="--c:${CAT_COLOR[(GAME[r.game] || { cat: 'Board' }).cat]}"><span class="art">${art(GAME[r.game] || { glyph: 'board', cat: 'Board' }, 40)}</span><span><b>${esc((GAME[r.game] || { name: r.game }).name)}</b><small>${esc(arr(r.names).filter(Boolean).join(' vs '))} · ${ago(r.ts)}</small></span></a>`).join('') || '<p class="muted">No replays saved yet.</p>'}</div></section>`; } };

// ---------- Rewards hub: quests, streak, achievements, shop, invite friends ----------
VIEWS.rewards = { render(el, tab) { tab = tab || 'quests'; const p = me(), st = Quests.state(), qs = Quests.today(), earned = new Set(Ach.earned().map(a => a[0])), e = Cosm.eq(), s = p.streak || {};
  const T = {
    quests: `<div class="acards"><div class="acard"><small>Coins</small><b>${Coins.get()}</b><span>spend them in the shop</span></div><div class="acard"><small>Streak</small><b>${s.n || 0} day${s.n === 1 ? '' : 's'}</b><span>best ${s.best || 0}</span></div><div class="acard"><small>Achievements</small><b>${earned.size} / ${ACH.length}</b></div></div>
      <h2>Today's quests</h2><div class="quests">${qs.map(([id, name, need]) => { const n = Math.min(need, st.prog[id] || 0), done = st.done.includes(id); return `<div class="quest ${done ? 'done' : ''}"><b>${esc(name)}</b><div class="prog"><i style="width:${n / need * 100}%"></i></div><small>${done ? 'Done · +40 coins' : `${n} / ${need} · 40 coins`}</small></div>`; }).join('')}</div><p class="muted small">Finish all three for a 60-coin bonus. New quests every day.</p>
      <h2>Daily challenge</h2>${dailyCard()}`,
    achievements: `<div class="achgrid">${ACH.map(([id, name, desc]) => `<div class="ach ${earned.has(id) ? 'got' : ''}"><b>${esc(name)}</b><small>${esc(desc)}</small>${earned.has(id) ? '<span class="pill on">Unlocked</span>' : ''}</div>`).join('')}</div>`,
    shop: `<p>You have <b>${Coins.get()} coins</b>. Earn coins from wins, quests, streaks, achievements and tournaments.</p>${['theme', 'back', 'frame', 'title'].map(kind => `<h3>${{ theme: 'Board themes', back: 'Card backs', frame: 'Avatar frames', title: 'Profile titles' }[kind]}</h3><div class="shop">${SHOP.filter(x => x[0] === kind).map(([k, id, name, price]) => { const own = Cosm.owns(k, id), on = (e[k] || (k === 'theme' ? 'classic' : k === 'back' ? 'red' : 'none')) === id; return `<div class="sitem ${on ? 'on' : ''}"><span class="sprev sp-${k}" data-v="${esc(id)}">${k === 'title' ? esc(id === 'none' ? '—' : id) : k === 'frame' ? avatar(Store.uid, 40) : ''}</span><b>${esc(name)}</b>${on ? '<span class="pill on">Equipped</span>' : own ? `<button class="btn sm" data-eq="${k}:${esc(id)}">Equip</button>` : `<button class="btn sm hot" data-buy="${k}:${esc(id)}" ${Coins.get() < price ? 'disabled' : ''}>${price} coins</button>`}</div>`; }).join('')}</div>`).join('')}`,
    invite: `<p class="lead">Invite friends to David’s Game World. When someone joins with your link, you both get 100 coins.</p><div class="row-btns linkrow"><input readonly value="${esc(Config.url())}#ref-${esc(Store.uid)}" id="refurl" aria-label="Your invite link"><button class="btn hot" id="refcp">Copy invite link</button><button class="btn" id="refsh">More ways to share</button></div><p>Friends who joined with your link: <b>${Store.all('profiles').filter(x => x.ref === Store.uid).length}</b></p>` };
  el.innerHTML = `<section class="band"><h1>Rewards</h1><nav class="tabs">${[['quests', 'Quests & streak'], ['achievements', 'Achievements'], ['shop', 'Shop'], ['invite', 'Invite friends']].map(([k, l]) => `<a href="#rewards-${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav><div class="apane">${T[tab]}</div></section>`;
  el.onclick = async ev => { const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.buy) { const [k, id] = b.dataset.buy.split(':'), it = SHOP.find(x => x[0] === k && x[1] === id); if (Coins.get() < it[3]) return toast('Not enough coins yet.'); await saveMe({ owned: arr(me().owned).concat(k + ':' + id), coins: Coins.get() - it[3], eq: { ...Cosm.eq(), [k]: id } }); Cosm.apply(); toast('Bought and equipped: ' + it[2]); Ach.check(); render(true); }
    if (b.dataset.eq) { const [k, id] = b.dataset.eq.split(':'); await saveMe({ eq: { ...Cosm.eq(), [k]: id } }); Cosm.apply(); render(true); }
    if (b.id === 'refcp') { try { await navigator.clipboard.writeText($('#refurl').value); toast('Invite link copied.'); } catch (er) { $('#refurl').select(); } } if (b.id === 'refsh') shareModal(); if (b.id === 'dgo') Daily.start(); }; } };
function dailyCard() { const g = Daily.game(), rows = Daily.rows(), mine = rows.find(r => r.uid === Store.uid);
  return `<div class="dailycard" style="--c:${CAT_COLOR[g.cat]}">${art(g, 56)}<div><b>${esc(g.name)}</b><small>Everyone gets the same game today. ${rows.length} played${mine ? ` · your best ${mine.score} (#${rows.indexOf(mine) + 1})` : ''}</small></div><button class="btn hot" id="dgo">Play today's challenge</button></div>
    ${rows.length ? `<table class="lb"><tbody>${rows.slice(0, 10).map((r, i) => `<tr class="${r.uid === Store.uid ? 'me' : ''}"><td>${i + 1}</td><td>${avatar(r.uid, 22)} ${nameLink(r.uid)}</td><td class="num">${r.score}</td></tr>`).join('')}</tbody></table>` : ''}`; }
VIEWS.ref = { render(el, uid) { if (uid && uid !== Store.uid && !me().ref) { saveMe({ ref: uid }).then(() => Coins.add(100, 'welcome gift from a friend')); } location.replace('#home'); } };
// The referrer collects their reward when they see a new friend who joined with their link
async function refRewards() { const mine = Store.all('profiles').filter(x => x.ref === Store.uid).map(x => x.id), paid = arr(me().refPaid), fresh = mine.filter(x => !paid.includes(x)); if (!fresh.length) return; await saveMe({ refPaid: paid.concat(fresh) }); await Coins.add(100 * fresh.length, `${fresh.length} friend${fresh.length > 1 ? 's' : ''} joined with your link`); }

// ---------- Family mode ----------
const Family = { on() { return !!LS.get('family', false); }, hidden: ['match', 'local', 'explore', 'watch'],
  async toggle() { if (this.on()) { const pin = LS.get('familyPin', ''); const entered = await askPin('Enter the family-mode PIN to turn it off'); if (entered !== pin) return toast('Wrong PIN.'); LS.set('family', false); toast('Family mode is off.'); }
    else { const pin = await askPin('Choose a 4-digit PIN. You will need it to turn family mode off.'); if (!/^\d{4}$/.test(pin || '')) return toast('The PIN must be 4 digits.'); LS.set('familyPin', pin); LS.set('family', true); toast('Family mode is on: neighbourhood features and public video feeds are hidden.'); } shell(); render(true); } };
function askPin(msg) { return new Promise(res => { const b = modal(`<h2>Family mode</h2><p>${esc(msg)}</p><input id="pin" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN"><div class="row-btns"><button class="btn hot" id="pinok">OK</button></div>`); const done = () => { const v = $('#pin').value; closeModal(); res(v); }; b.querySelector('#pinok').onclick = done; b.querySelector('#pin').onkeydown = e => { if (e.key === 'Enter') done(); }; setTimeout(() => $('#pin').focus(), 50); }); }

// ---------- Boot hook ----------
const Plat = { async boot() { Cosm.apply(); if (Store.mode === 'shared' || me().name) { try { await Streak.check(); await refRewards(); await Ach.check(); } catch (e) { console.warn(e); } } } };
