// Core: helpers, data store (shared db or this-browser fallback), identity, quota, presence, music.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now(), uid8 = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); };
const today = () => new Date().toLocaleDateString('en-CA');
const ago = ts => { const s = (now() - ts) / 1000; if (s < 60) return 'just now'; if (s < 3600) return (s / 60 | 0) + 'm'; if (s < 86400) return (s / 3600 | 0) + 'h'; if (s < 604800) return (s / 86400 | 0) + 'd'; return new Date(ts).toLocaleDateString(); };
const LS = { get(k, d) { try { const v = localStorage.getItem('gy:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('gy:' + k, JSON.stringify(v)); } catch (e) {} } };
const deepMerge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? deepMerge(o[k], v) : v; return o; };
const hash = s => { let h = 5381; for (const ch of s) h = (h * 33 ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
const safeUrl = u => typeof u === 'string' && (u.startsWith('data:image/') || u.startsWith('https://') || /^\/_blob\/[\w.-]+$/.test(u)) ? u : '';
function toast(t) { let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); } while (box.children.length > 3) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; box.appendChild(d); setTimeout(() => d.classList.add('in'), 10); setTimeout(() => { d.classList.remove('in'); setTimeout(() => d.remove(), 300); }, 2600); }

// Collections watched, newest first where it matters.
const COLLS = { config: {}, profiles: {}, members: {}, posts: { o: 'ts', l: 500 }, comments: { o: 'ts', l: 1500 }, communities: {}, chats: {}, msgs: { o: 'ts', l: 1200 }, tables: { o: 'ts', l: 150 }, reports: { o: 'ts', l: 200 }, requests: {}, notes: { o: 'ts', l: 400 }, visits: { o: 'ts', l: 800 }, races: { o: 'ts', l: 400 }, replays: { o: 'ts', l: 200 }, daily: { o: 'ts', l: 800 }, tours: { o: 'ts', l: 120 }, tourq: { o: 'ts', l: 500 }, tourpts: { o: 'ts', l: 1000 }, reviews: { o: 'ts', l: 1500 } };

const Store = {
  mode: 'local', db: null, user: null, uid: null, owner: false, canWrite: true, cache: {}, ready: false, subs: [], onChange: () => {}, room: null, peers: [],
  async boot() {
    this.uid = LS.get('localUid') || ('local-' + uid8()); LS.set('localUid', this.uid);
    for (const c of Object.keys(COLLS)) this.cache[c] = new Map(Object.entries(LS.get('c:' + c, {})));
    this.ready = true;
  },
  async upgrade() {
    const use = window.claude && window.claude.use ? n => window.claude.use(n).catch(() => null) : async () => null;
    const [db, user] = await Promise.all([use('db'), use('user')]);
    if (!db || !user) return false;
    let id = null; try { id = await user.id(); } catch (e) {}
    if (!id) return false;
    let profRes; this.profilesLoaded = new Promise(r => { profRes = r; setTimeout(() => r(false), 10000); });
    this.db = db; this.user = user; this.uid = id; this.mode = 'shared';
    try { this.owner = !!(await user.isOwner()); } catch (e) {}
    try { const w = await user.can('data.write'); this.canWrite = w !== false; } catch (e) {}
    for (const c of Object.keys(COLLS)) this.cache[c] = new Map();
    let pending = Object.keys(COLLS).length; const timer = setTimeout(() => { this.slow = true; this.onChange('*'); }, 10000);
    for (const [c, o] of Object.entries(COLLS)) {
      let q = db.collection(c); if (o.o) q = q.orderBy(o.o, 'desc'); if (o.l) q = q.limit(o.l);
      this.subs.push(q.onSnapshot(snap => { const m = new Map(); snap.docs.forEach(d => m.set(d.id, d.data())); this.cache[c] = m; if (c === 'profiles' && !snap.metadata.fromCache) profRes(true); if (!snap.metadata.fromCache && pending > 0) { pending--; if (!pending) { clearTimeout(timer); this.slow = false; } } this.onChange(c); }, err => { console.warn('db', c, err && err.code); if (err && err.code === 'revoked') this.mode = 'local'; this.onChange(c); }));
    }
    this.onChange('*');
    use('assets').then(a => { this.assets = a; this.onChange('assets'); });
    use('room').then(room => { if (room) { this.room = room; try { room.onPeers(ps => { this.peers = Store.normPeers(ps); this.onChange('presence'); }); this.presence({}); } catch (e) {} } });
    return true;
  },
  presence(p) { this._pres = { ...(this._pres || {}), ...p, uid: this.uid }; try { this.room && this.room.presence(this._pres); } catch (e) {} },
  normPeers(ps) { try { if (!ps) return []; if (ps instanceof Map) ps = [...ps.values()]; else if (!Array.isArray(ps)) ps = typeof ps === 'object' ? Object.values(ps) : []; return ps.map(p => { if (!p || typeof p !== 'object') return null; const st = [p.state, p.presence, p.data, p.value, p].find(x => x && typeof x === 'object' && typeof x.uid === 'string'); return st || null; }).filter(Boolean); } catch (e) { return []; } },
  online() { const s = new Set(); for (const st of arr(this.peers)) if (st && st.uid) s.add(st.uid); s.add(this.uid); return s; },
  peerStates() { return arr(this.peers).filter(s => s && s.uid); },
  all(c) { return [...(this.cache[c] || new Map()).entries()].map(([id, d]) => ({ id, ...d })); },
  get(c, id) { const d = this.cache[c] && this.cache[c].get(id); return d ? { id, ...d } : null; },
  persist(c) { if (this.mode === 'local') LS.set('c:' + c, Object.fromEntries(this.cache[c])); },
  async put(c, id, data) { id = id || uid8(); const clean = JSON.parse(JSON.stringify(data)); this.cache[c].set(id, clean); this.persist(c); this.onChange(c);
    if (this.mode === 'shared') { try { await this.db.collection(c).doc(id).set(clean); } catch (e) { this.fail(e); } } return id; },
  async patch(c, id, data) { const cur = this.cache[c].get(id) || {}; this.cache[c].set(id, deepMerge(cur, JSON.parse(JSON.stringify(data)))); this.persist(c); this.onChange(c);
    if (this.mode === 'shared') { try { await this.db.collection(c).doc(id).update(data); } catch (e) { try { await this.db.collection(c).doc(id).set(this.cache[c].get(id)); } catch (e2) { this.fail(e2); } } } },
  async del(c, id) { this.cache[c].delete(id); this.persist(c); this.onChange(c); if (this.mode === 'shared') { try { await this.db.collection(c).doc(id).delete(); } catch (e) { this.fail(e); } } },
  async acquire(c, id) { if (this.mode !== 'shared') return true; try { const r = await this.db.collection(c).doc(id).acquire({ holder: this.uid, ttlMs: 3000 }); return r.acquired; } catch (e) { return true; } },
  fail(e) { const code = e && e.code; if (code === 'invalid_argument') { this.canWrite = false; toast('You have view-only access here, so changes are not saved.'); } else if (code === 'quota_exceeded') toast('Storage is full. Ask the owner to clear old content.'); else if (code === 'resource_exhausted') toast('Slow down a little, then try again.'); else toast('Could not save. Try again.'); },
  // private per-person doc (quota, saved posts, settings)
  async priv() { if (this.mode === 'shared') { try { const s = await this.db.doc('data/users/' + this.uid + '/private').get(); return s.exists ? s.data() : {}; } catch (e) { return LS.get('priv', {}); } } return LS.get('priv', {}); },
  async setPriv(d) { LS.set('priv', d); if (this.mode === 'shared') { try { await this.db.doc('data/users/' + this.uid + '/private').set(d); } catch (e) {} } },
};

// ---------- People ----------
const Names = { cache: {}, pending: new Set(), t: null,
  of(id) { if (!id) return 'Someone'; if (id.startsWith('ai:')) return 'Computer · level ' + id.slice(3); const p = Store.get('profiles', id); if (p && p.name) return p.name; if (this.cache[id]) return this.cache[id]; if (Store.user && !this.pending.has(id)) { this.pending.add(id); clearTimeout(this.t); this.t = setTimeout(() => this.load(), 60); } return id === Store.uid ? 'You' : 'Player'; },
  async load() { const ids = [...this.pending]; this.pending.clear(); try { const ps = await Store.user.profiles(ids); for (const id of ids) if (ps[id] && ps[id].name) this.cache[id] = ps[id].name; Store.onChange('names'); } catch (e) {} } };
const me = () => Store.get('profiles', Store.uid) || { name: '', friends: [], likes: [], passes: [], blocked: [], joined: [], scores: {} };
const prof = id => Store.get('profiles', id) || { friends: [], likes: [], blocked: [], joined: [], scores: {} };
const arr = a => Array.isArray(a) ? a : [];
const isFriend = id => arr(me().friends).includes(id) && arr(prof(id).friends).includes(Store.uid);
const following = id => arr(me().friends).includes(id);
const blockedSet = () => { const s = new Set(arr(me().blocked)); Store.all('profiles').forEach(p => { if (arr(p.blocked).includes(Store.uid)) s.add(p.id); }); return s; };
let isMember = id => { if (typeof Dev !== 'undefined' && Dev.unlocked(id)) return true; const m = Store.get('members', id || Store.uid); return !!(m && m.member && !(m.until && m.until < now())); };
async function saveMe(patch) { const cur = Store.get('profiles', Store.uid); if (cur) await Store.patch('profiles', Store.uid, { ...patch, seen: now() }); else await Store.put('profiles', Store.uid, { name: '', friends: [], likes: [], passes: [], blocked: [], joined: [], scores: {}, ts: now(), seen: now(), color: AV_COLORS[R(AV_COLORS.length)], ...patch }); }
const AV_COLORS = ['#ff5a3c', '#2f7cf6', '#f2b600', '#19a974', '#a259ff', '#ff7ac6', '#0f7d79', '#d1342b'];
function avatar(id, size = 36) { const p = prof(id), n = Names.of(id), img = safeUrl(p.avatar); const on = Store.online().has(id) && id !== Store.uid;
  const fr = (p.eq && p.eq.frame && p.eq.frame !== 'none') ? ' fr-' + String(p.eq.frame).replace(/\W/g, '') : '';
  return `<span class="av${fr}" style="--s:${size}px;background:${esc(AV_COLORS.includes(p.color) ? p.color : '#0f5a43')}">${img ? `<img src="${esc(img)}" alt="">` : esc((n[0] || '?').toUpperCase())}${on ? '<i class="on"></i>' : ''}</span>`; }
let nameLink = id => id && id.startsWith('ai:') ? esc(Names.of(id)) : `<a href="#u-${encodeURIComponent(id)}" class="nm">${esc(Names.of(id))}</a>${isMember(id) ? '<span class="badge">Member</span>' : ''}`;

// ---------- Daily quota: 15 games a day unless member (counts games you start, accept or are challenged into) ----------
const Quota = { LIMIT: 15, data: { day: today(), used: 0 },
  async load() { const p = await Store.priv(); this.priv = p; const q = p.quota || LS.get('quota', null); this.data = q && q.day === today() ? q : { day: today(), used: 0 }; Store.onChange('quota'); },
  left() { if (this.data.day !== today()) this.data = { day: today(), used: 0 }; return isMember() ? Infinity : Math.max(0, this.LIMIT - this.data.used); },
  async use() { if (isMember()) return true; if (this.left() <= 0) return false; this.data = { day: today(), used: this.data.used + 1 }; LS.set('quota', this.data); this.priv = { ...(this.priv || {}), quota: this.data }; await Store.setPriv(this.priv); Store.onChange('quota'); return true; } };

// ---------- Records: wins/scores on own profile ----------
async function recordResult(gameId, { score = 0, outcome, level = 5 }) {
  const cur = (me().scores || {})[gameId] || { best: 0, w: 0, l: 0, d: 0, pts: 0, plays: 0 }; const n = { ...cur, plays: (cur.plays || 0) + 1 };
  if (outcome === 'win') { n.w = (n.w || 0) + 1; n.pts = (n.pts || 0) + level * 10; } else if (outcome === 'loss') n.l = (n.l || 0) + 1; else if (outcome === 'draw') { n.d = (n.d || 0) + 1; n.pts = (n.pts || 0) + level * 3; }
  if (score > (n.best || 0)) n.best = Math.round(score);
  if (outcome === 'win' && !score) n.best = Math.max(n.best || 0, n.pts);
  await saveMe({ scores: { [gameId]: n }, xp: (me().xp || 0) + (outcome === 'win' ? 25 : 10) });
}

// ---------- Background music: 15 original songs, generated live in the browser (no audio files) ----------
// Each song is written below in full: key, scale, tempo, chord progressions, melodies (hook, answer, two verse lines,
// bridge) and its sound. The arranger plays it as a complete song — intro, verses, pre-chorus, chorus, breakdown,
// bridge, solo, a key-change final chorus and outro — at least 7 minutes long, then loops forever.
// Melody notation: one token per eighth note across two bars. 1–7 = scale degree, ' = octave up, , = octave down,
// - = hold the previous note, . = rest.
const Music = (() => {
  let ac = null, master = null, fx = null, timer = null, step = 0, nextT = 0, on = LS.get('music', true), vol = LS.get('vol', 0.5), track = LS.get('track', 0), noiseBuf = null, plan = null;
  const SC = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], mix: [0, 2, 4, 5, 7, 9, 10] };
  const f = m => 440 * 2 ** ((m - 69) / 12);
  const TRACKS = [
    // ----- Free for everyone -----
    { name: 'Felt & Neon', bpm: 124, key: 60, sc: 'maj', lead: 'square', bass: 'oct', drums: 'four', arp: 'up',
      verse: [1, 6, 4, 5], chorus: [4, 5, 3, 6], bridge: [6, 4, 1, 5],
      hook: "5 . 5 6 5 3 1 - | 2 - 3 2 1 . 5, .", answer: "4 . 4 5 4 2 7, - | 1 - 2 3 5 - - .",
      v1: "3 - 3 2 1 - . 1 | 2 3 4 3 2 - . .", v2: "3 - 5 - 6 5 3 . | 2 - 1 2 3 - . .", br: "6 - 5 - 4 - 3 2 | 1 - 2 - 3 - 5 -" },
    { name: 'Lobby Hop', bpm: 100, key: 57, sc: 'min', lead: 'triangle', bass: 'sync', drums: 'pop', arp: 'bounce',
      verse: [1, 6, 3, 7], chorus: [6, 7, 1, 1], bridge: [4, 5, 3, 6],
      hook: "1' - 7 5 . 5 6 7 | 1' - 3' 2' 1' . 7 .", answer: "6 - 5 3 . 3 4 5 | 4 - 3 2 1 - - .",
      v1: "1 . 3 . 5 4 3 . | 2 . 4 . 3 2 1 .", v2: "5 . 5 4 3 . 1 . | 2 3 4 5 3 - . .", br: "4 - 5 6 5 - 4 3 | 2 - 3 4 5 - - -" },
    { name: 'Pixel Parade', bpm: 140, key: 65, sc: 'maj', lead: 'square', bass: 'pulse', drums: 'four', arp: 'down',
      verse: [1, 4, 6, 5], chorus: [1, 5, 6, 4], bridge: [2, 5, 3, 6],
      hook: "1' 7 1' 5 3 5 1' . | 2' 1' 7 1' 5 - - .", answer: "6 5 6 4 1 4 6 . | 5 4 3 2 1 - - .",
      v1: "3 . 5 3 1 . 3 . | 4 . 6 4 2 . 4 .", v2: "5 . 1' 5 3 . 5 . | 4 3 2 3 1 - . .", br: "2 - 4 - 6 - 5 4 | 3 - 5 - 1' - 7 -" },
    { name: 'Sunset Rally', bpm: 118, key: 62, sc: 'maj', lead: 'saw', bass: 'walk', drums: 'pop', arp: 'up',
      verse: [1, 3, 4, 5], chorus: [4, 1, 5, 6], bridge: [6, 5, 4, 5],
      hook: "3 5 6 5 - 3 2 3 | 5 - 6 1' - 6 5 .", answer: "4 6 1' 6 - 4 3 2 | 1 - 2 3 - 2 1 .",
      v1: "1 - 1 2 3 - 2 1 | 6, - 1 2 1 - . .", v2: "3 - 3 4 5 - 4 3 | 2 - 3 2 1 - . .", br: "6 - 1' - 7 6 5 - | 4 - 5 6 5 - - -" },
    { name: 'Confetti Cannon', bpm: 132, key: 55, sc: 'maj', lead: 'square', bass: 'oct', drums: 'four', arp: 'bounce',
      verse: [1, 5, 6, 4], chorus: [4, 5, 6, 1], bridge: [2, 4, 5, 5],
      hook: "5 5 6 5 1' - 7 . | 5 5 6 5 2' - 1' .", answer: "5 5 5' 3' 1' 7 6 . | 4' 4' 3' 1' 2' 1' - .",
      v1: "1 . 1 3 5 . 3 . | 4 . 4 3 2 - . .", v2: "3 . 3 5 1' . 6 . | 5 4 3 2 1 - . .", br: "2 - 3 4 5 - 6 5 | 4 - 5 6 7 - 1' -" },
    // ----- Members -----
    { name: 'Midnight Arcade', bpm: 110, key: 64, sc: 'min', lead: 'saw', bass: 'sync', drums: 'half', arp: 'up', member: true,
      verse: [1, 6, 7, 5], chorus: [6, 7, 1, 1], bridge: [4, 1, 7, 5],
      hook: "5 - 7 1' - 7 5 4 | 5 - 3 1 - . 5 .", answer: "4 - 6 7 - 6 4 3 | 2 - 1 7, - . . .",
      v1: "1 . . 1 3 . 1 . | 7, . . 7, 2 . 7, .", v2: "3 . 4 . 5 . 3 . | 4 3 2 1 2 - . .", br: "6 - 5 - 4 - 3 - | 2 3 4 5 7 - - -" },
    { name: 'Victory Lap', bpm: 136, key: 58, sc: 'maj', lead: 'square', bass: 'pulse', drums: 'four', arp: 'down', member: true,
      verse: [1, 5, 4, 5], chorus: [1, 4, 5, 1], bridge: [6, 3, 4, 5],
      hook: "1 3 5 1' - 5 3 5 | 6 - 5 4 3 - 2 .", answer: "1 3 5 1' - 5 3 5 | 2' - 1' 7 1' - - .",
      v1: "5, . 1 . 3 . 2 1 | 6, . 2 . 4 . 3 2", v2: "3 . 5 . 1' . 7 6 | 5 4 3 2 1 - . .", br: "6 - - 5 4 - - 3 | 2 - 3 4 5 - - -" },
    { name: 'Neon Boulevard', bpm: 115, key: 54, sc: 'dor', lead: 'saw', bass: 'walk', drums: 'pop', arp: 'bounce', member: true,
      verse: [1, 4, 1, 4], chorus: [7, 4, 1, 5], bridge: [3, 4, 5, 4],
      hook: "1' - 7 1' . 6 4 . | 5 - 4 5 . 3 1 .", answer: "6 - 5 6 . 4 2 . | 3 - 2 1 . 7, 1 .",
      v1: "1 . 3 4 . 3 1 . | 6, . 1 2 . 1 6, .", v2: "4 . 6 7 . 6 4 . | 3 2 1 2 1 - . .", br: "3 - 4 - 5 - 6 - | 7 - 6 5 4 - - -" },
    { name: 'Bubblegum Rocket', bpm: 150, key: 64, sc: 'maj', lead: 'square', bass: 'oct', drums: 'four', arp: 'up', member: true,
      verse: [1, 6, 2, 5], chorus: [4, 5, 1, 6], bridge: [4, 4, 5, 5],
      hook: "3' 2' 1' 2' 3' 3' 3' . | 2' 2' 2' . 3' 5' 5' .", answer: "3' 2' 1' 2' 3' 3' 3' 1' | 2' 2' 3' 2' 1' - - .",
      v1: "1 . 3 . 5 . 3 . | 2 . 4 . 6 . 4 .", v2: "3 . 5 . 1' . 5 . | 2 . 3 . 1 - . .", br: "4 - 6 - 1' - 6 - | 5 - 7 - 2' - - -" },
    { name: 'Checkmate Funk', bpm: 105, key: 55, sc: 'dor', lead: 'saw', bass: 'sync', drums: 'break', arp: 'down', member: true,
      verse: [1, 4, 1, 4], chorus: [4, 7, 1, 1], bridge: [3, 6, 2, 5],
      hook: "1 . 3 4 . 3 . 1 | 7, . 1 . 3 4 3 .", answer: "4 . 6 7 . 6 . 4 | 3 . 4 . 3 1 - .",
      v1: "1 . . 1 . 3 . . | 4 . . 4 . 3 1 .", v2: "5 . . 5 . 4 . 3 | 4 3 1 . 7, 1 - .", br: "3 - 4 - 6 - 7 - | 1' - 7 6 5 - - -" },
    { name: 'Starlight Dice', bpm: 122, key: 56, sc: 'maj', lead: 'triangle', bass: 'walk', drums: 'pop', arp: 'bounce', member: true,
      verse: [1, 6, 4, 5], chorus: [4, 5, 3, 6], bridge: [2, 5, 1, 1],
      hook: "5 - 1' - 7 6 5 . | 3 - 5 - 4 3 2 .", answer: "4 - 6 - 5 4 3 . | 2 - 3 - 1 - - .",
      v1: "1 2 3 . 3 2 1 . | 6, 7, 1 . 1 7, 6, .", v2: "3 4 5 . 5 4 3 . | 2 3 4 3 2 - . .", br: "2 - 4 - 6 - 5 - | 1' - 7 - 1' - - -" },
    { name: 'Turbo Tiles', bpm: 145, key: 60, sc: 'min', lead: 'saw', bass: 'pulse', drums: 'four', arp: 'up', member: true,
      verse: [1, 7, 6, 7], chorus: [6, 7, 1, 5], bridge: [4, 5, 6, 7],
      hook: "1' 1' 7 5 . 5 7 1' | 3' 2' 1' 7 1' - - .", answer: "6 6 5 3 . 3 5 6 | 7 6 5 4 5 - - .",
      v1: "1 . 1 . 3 1 . 1 | 7, . 7, . 2 7, . 7,", v2: "3 . 3 . 5 3 . 4 | 5 4 3 2 1 - . .", br: "4 - 5 - 6 - 7 - | 1' - 2' - 3' - - -" },
    { name: 'Lucky Streak', bpm: 128, key: 57, sc: 'maj', lead: 'square', bass: 'oct', drums: 'four', arp: 'down', member: true,
      verse: [1, 3, 6, 4], chorus: [1, 5, 6, 4], bridge: [4, 5, 4, 5],
      hook: "5 3 5 6 5 - 3 2 | 3 1 2 3 1 - . .", answer: "6 4 6 1' 7 - 6 5 | 6 5 4 3 2 - . .",
      v1: "1 . 1 2 3 . 3 . | 3 2 1 2 3 - . .", v2: "6, . 6, 1 2 . 2 . | 2 1 7, 1 1 - . .", br: "4 - 6 - 5 - 3 - | 4 - 6 - 7 - - -" },
    { name: 'Moonlit Marbles', bpm: 92, key: 62, sc: 'min', lead: 'triangle', bass: 'walk', drums: 'half', arp: 'bounce', member: true,
      verse: [1, 6, 3, 7], chorus: [6, 3, 7, 1], bridge: [4, 5, 1, 1],
      hook: "5 - - 4 3 - 1 - | 2 - 3 4 5 - - .", answer: "6 - - 5 4 - 2 - | 3 - 2 7, 1 - - .",
      v1: "1 - 3 - 5 - 4 3 | 2 - - - 1 - . .", v2: "3 - 5 - 1' - 7 6 | 5 - - - 3 - . .", br: "4 - 5 - 6 - 7 - | 1' - - - 5 - - -" },
    { name: 'Grand Finale', bpm: 126, key: 63, sc: 'maj', lead: 'saw', bass: 'pulse', drums: 'four', arp: 'up', member: true,
      verse: [1, 4, 5, 1], chorus: [4, 5, 6, 1], bridge: [2, 6, 4, 5],
      hook: "1' - 5 - 1' 2' 3' . | 2' - 7 - 2' 3' 4' .", answer: "3' - 1' - 6 7 1' . | 7 - 5 - 6 - 7 .",
      v1: "1 . 3 . 5 . 1' . | 7 . 5 . 2 . 4 .", v2: "3 . 5 . 1' . 3' . | 2' 1' 7 6 5 - . .", br: "6 - - 5 4 - - 3 | 2 - 4 - 5 - - -" },
  ];
  // ----- Parsing and helpers -----
  const parse = s => s.replace('|', ' ').trim().split(/\s+/).map(t => { if (t === '.' || t === '-') return t; const m = t.match(/^(\d)([',]*)$/); if (!m) return '.'; return { d: +m[1], o: (m[2].match(/'/g) || []).length - (m[2].match(/,/g) || []).length }; });
  const semi = (T, d, o = 0) => { const s = SC[T.sc], i = d - 1; return s[((i % 7) + 7) % 7] + 12 * (Math.floor(i / 7) + o); };
  const shift = (ph, n) => ph.map(x => typeof x === 'object' ? { d: x.d + n, o: x.o } : x);
  const sparse = ph => ph.map((x, i) => i % 2 ? (typeof x === 'object' ? '-' : x) : x);
  const ornament = ph => ph.map((x, i) => typeof x === 'object' && i % 4 === 3 ? { d: x.d + 1, o: x.o } : x);
  const resolve = ph => { const p = ph.slice(); for (let i = p.length - 1; i >= 0; i--) if (typeof p[i] === 'object') { p[i] = { d: 1, o: 0 }; break; } return p; };
  // ----- Arranging a full song (at least 7 minutes) -----
  function arrange(T) { const P = { hook: parse(T.hook), answer: parse(T.answer), v1: parse(T.v1), v2: parse(T.v2), br: parse(T.br) };
    const sec = (type, prog, mel, opt = {}) => ({ type, prog, mel, ...opt }), V = T.verse, C = T.chorus, B = T.bridge;
    const verse = (alt) => sec('verse', V, alt ? [P.v1, shift(P.v2, 0), P.v1, resolve(P.v2)] : [P.v1, P.v2, P.v1, resolve(P.v2)]);
    const pre = () => sec('pre', [V[2], V[3], C[0], C[1]], [shift(P.v2, 2), shift(P.v1, 2)], { bars: 4, build: true });
    const chorus = (opt) => sec('chorus', C, [P.hook, P.answer, P.hook, P.answer], { harm: true, ...opt });
    const cycle = k => [verse(k % 2), pre(), chorus(), ...(k % 2 ? [sec('solo', C, [ornament(P.hook), ornament(P.answer), shift(ornament(P.hook), 0), resolve(P.answer)], { lead2: true })] : [sec('break', C, [sparse(shift(P.hook, -7)), sparse(shift(P.answer, -7))], { bars: 4, soft: true })]), sec('bridge', B, [P.br, shift(P.br, 2)], { bars: 4 }), chorus({ big: k % 2 === 1 })];
    const L = [sec('intro', V, [], { bars: 4, intro: true }), ...cycle(0)];
    const barS = 240 / T.bpm, dur = () => L.reduce((a, s) => a + (s.bars || 8), 0) * barS; let k = 1;
    while (dur() + (8 + 8 + 4) * barS < 425) L.push(...cycle(k++));
    L.push(chorus({ up: 1, big: true }), chorus({ up: 1, big: true }), sec('outro', C, [P.answer, resolve(P.hook)], { bars: 4, outro: true }));
    // Expand to a bar list
    const bars = []; L.forEach((s, si) => { const n = s.bars || 8; for (let b = 0; b < n; b++) bars.push({ s, si, b, chord: s.prog[b % s.prog.length], mel: s.mel.length ? s.mel[Math.floor(b / 2) % s.mel.length] : null, half: b % 2, last: b === n - 1 }); });
    return { bars, seconds: bars.length * barS }; }
  // ----- Sound -----
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = vol * 0.55; const comp = ac.createDynamicsCompressor(); master.connect(comp).connect(ac.destination);
        fx = ac.createDelay(); fx.delayTime.value = 0.28; const fb = ac.createGain(); fb.gain.value = 0.28; const wet = ac.createGain(); wet.gain.value = 0.22; fx.connect(fb).connect(fx); fx.connect(wet).connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
  function voice(freq, t, dur, type, gain, cut = 0, send = 0, vib = 0) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type === 'pulse' ? 'square' : type; o.frequency.value = freq; let node = o;
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * 0.006; l.connect(lg).connect(o.frequency); l.start(t + 0.08); l.stop(t + dur + 0.05); }
    if (cut) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = 2; node.connect(fl); node = fl; }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.012); g.gain.setTargetAtTime(gain * 0.7, t + 0.05, 0.08); g.gain.setTargetAtTime(0.0001, t + Math.max(0.03, dur - 0.04), 0.04);
    node.connect(g); g.connect(master); if (send) { const s = ac.createGain(); s.gain.value = send; g.connect(s).connect(fx); } o.start(t); o.stop(t + dur + 0.25); }
  function noise(t, dur, hp, gain) { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; fl.type = 'highpass'; fl.frequency.value = hp; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + dur); }
  function kick(t, a = 0.55) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); o.connect(g).connect(master); o.start(t); o.stop(t + 0.26); }
  const snare = (t, a = 0.2) => { noise(t, 0.16, 1400, a); voice(190, t, 0.07, 'triangle', a * 0.5); };
  const DR = { four: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14] }, pop: { k: [0, 7, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] }, half: { k: [0, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14] }, break: { k: [0, 3, 10], s: [4, 12, 15], h: [0, 2, 4, 6, 8, 10, 12, 14] } };
  const LEAD = { square: ['square', 2600], saw: ['sawtooth', 2200], triangle: ['triangle', 0], pulse: ['square', 1800] };
  function schedule() { const T = TRACKS[track]; if (!plan || plan.t !== track) plan = { t: track, ...arrange(T) }; const s16 = 60 / T.bpm / 4;
    while (nextT < ac.currentTime + 0.2) { const bi = Math.floor(step / 16) % plan.bars.length, st = step % 16, B = plan.bars[bi], S = B.s, up = S.up || 0, key = T.key + up;
      const fadeOut = S.outro ? Math.max(0.15, 1 - (B.b * 16 + st) / 64) : 1, fadeIn = S.intro ? 0.6 : 1, amp = fadeOut * fadeIn, ch = B.chord;
      const triad = [semi(T, ch), semi(T, ch + 2), semi(T, ch + 4)];
      // Pad: the chord, held for the bar
      if (st === 0) triad.forEach(n => voice(f(key - 12 + n), nextT, s16 * 15.5, 'sawtooth', 0.018 * amp * (S.soft ? 1.4 : 1), 900, 0.15));
      // Arpeggio
      if (st % 2 === 0 && !S.outro) { const pat = T.arp === 'down' ? [2, 1, 0, 1] : T.arp === 'bounce' ? [0, 2, 1, 2] : [0, 1, 2, 1]; const n = triad[pat[(st / 2) % 4]] + (st >= 8 ? 12 : 0); voice(f(key + 12 + n), nextT, s16 * 1.6, 'triangle', (S.intro || S.soft ? 0.05 : 0.028) * amp, 0, 0.3); }
      // Bass
      if (!S.intro || B.b >= 2) { const r = key - 24 + triad[0]; const bp = { pulse: [0, 2, 4, 6, 8, 10, 12, 14], oct: [0, 4, 8, 12], sync: [0, 3, 6, 10, 12], walk: [0, 4, 8, 12] }[T.bass];
        if (bp.includes(st)) { const n = T.bass === 'oct' ? r + (st % 8 ? 12 : 0) : T.bass === 'walk' ? key - 24 + [triad[0], triad[1], triad[2], triad[1]][st / 4] : r; voice(f(n), nextT, s16 * (T.bass === 'pulse' ? 1.7 : 3.2), 'sawtooth', 0.11 * amp, 520); } }
      // Drums
      if (!S.intro && !S.soft) { const D = DR[T.drums], big = S.big || S.type === 'chorus';
        if (D.k.includes(st)) kick(nextT, 0.55 * amp); if (D.s.includes(st)) snare(nextT, (big ? 0.22 : 0.17) * amp); if (D.h.includes(st) || (big && st % 2)) noise(nextT, 0.035, 7500, (st % 4 === 2 ? 0.07 : 0.045) * amp);
        if (S.build && B.last && st >= 8) snare(nextT, 0.08 + (st - 8) * 0.02); if (big && B.b === 0 && st === 0) noise(nextT, 0.9, 3500, 0.12 * amp); }
      else if (S.soft && st % 8 === 0) kick(nextT, 0.25);
      // Melody (eighth notes)
      if (B.mel && st % 2 === 0) { const i = B.half * 8 + st / 2, tok = B.mel[i]; if (tok && typeof tok === 'object') { let len = 1; for (let k = i + 1; k < 16 && B.mel[k] === '-'; k++) len++;
          const n = key + 12 + semi(T, tok.d, tok.o), [ty, cut] = LEAD[T.lead], g = (S.soft ? 0.05 : S.lead2 ? 0.075 : 0.065) * amp;
          voice(f(n), nextT, s16 * 2 * len * 0.92, ty, g, cut, 0.35, len > 1);
          if (S.harm) voice(f(key + 12 + semi(T, tok.d + 2, tok.o)), nextT, s16 * 2 * len * 0.9, 'triangle', g * 0.45, 0, 0.2);
          if (S.big) voice(f(n - 12), nextT, s16 * 2 * len * 0.9, 'square', g * 0.35, 1400); } }
      nextT += s16; step++; } }
  const canUse = i => !TRACKS[i].member || (typeof isMember === 'function' && isMember()) || (typeof Dev !== 'undefined' && Dev.allowed && Dev.allowed());
  return { TRACKS, ctx, canUse, get on() { return on; }, get vol() { return vol; }, get track() { return track; }, get running() { return !!(timer && ac && ac.state === 'running'); },
    length(i = track) { return Math.round(arrange(TRACKS[i]).seconds); },
    start() { if (!on) return; if (!canUse(track)) { track = 0; LS.set('track', 0); plan = null; } if (!ctx()) return; if (timer) return; nextT = ac.currentTime + 0.08; timer = setInterval(() => { if (ac.state === 'running') schedule(); else nextT = ac.currentTime + 0.08; }, 50); },
    stop() { clearInterval(timer); timer = null; },
    toggle() { on = !on; LS.set('music', on); on ? this.start() : this.stop(); return on; },
    setVol(v) { vol = v; LS.set('vol', v); if (master) master.gain.value = v * 0.55; },
    set(i) { if (!TRACKS[i] || !canUse(i)) return false; track = i; LS.set('track', i); step = 0; plan = null; if (timer && ac) nextT = ac.currentTime + 0.08; return true; },
    next() { for (let k = 1; k <= TRACKS.length; k++) { const i = (track + k) % TRACKS.length; if (canUse(i)) { this.set(i); break; } } return TRACKS[track].name; } };
})();
// Start the music on the first tap, click or key press (browsers only allow sound after you interact), and keep
// trying on later interactions until the sound is actually running.
['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, () => { if (Music.on && !Music.running) { Music.stop(); Music.start(); } }, { passive: true }));

// ---------- Dictionary (SCOWL-derived word list shipped beside the page) ----------
const Words = { list: [], set: new Set(), common: [], ready: false, p: null,
  init(text, common) { this.list = text.split('\n').filter(Boolean); this.set = new Set(this.list); this.common = (common || '').split('\n').filter(Boolean); this.ready = true; },
  load() { if (this.p) return this.p; this.p = Promise.all([fetch('words.txt').then(r => r.ok ? r.text() : ''), fetch('common.txt').then(r => r.ok ? r.text() : '')]).then(([a, b]) => { this.init(a, b); return this; }).catch(() => { this.ready = true; return this; }); return this.p; },
  is(w) { return this.set.has(String(w).toLowerCase()); },
  lb(p) { let lo = 0, hi = this.list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.list[m] < p) lo = m + 1; else hi = m; } return lo; },
  hasPrefix(p) { const i = this.lb(p); return i < this.list.length && this.list[i].startsWith(p); },
  wordsWith(p, shortest) { let i = this.lb(p), best = null; for (; i < this.list.length && this.list[i].startsWith(p); i++) { const w = this.list[i]; if (w.length > p.length && w.length >= 4) { if (!shortest) return w; if (!best || w.length < best.length) best = w; } } return best; },
  pick(len, from) { const src = (from || this.common).filter(w => w.length === len); return src[R(src.length)]; } };
