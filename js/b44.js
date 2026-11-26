// Base44 backend for David’s Game World: real accounts, a server database with live updates, presence, uploads and server-checked payments.
// Loaded last. It does nothing unless the Base44 SDK bundle (js/b44sdk.js) is present, so the same files still run anywhere else.
(() => {
  if (!window.B44SDK || (window.claude && window.claude.use)) return;
  const APP_ID = '6b067331c074c1febee09de4';
  const token = (() => { try { return window.B44SDK.getAccessToken() || null; } catch (e) { return null; } })();
  const api = window.B44SDK.createClient({ appId: APP_ID, token: token || undefined, serverUrl: '', appBaseUrl: '', requiresAuth: false });
  const B44 = window.B44 = { api, me: null, token };
  const ENT = c => c === 'profiles' ? 'GyProfile' : ['config', 'members', 'donations'].includes(c) ? 'GyAdmin' : ['accounts', 'feedback', 'priv', 'tickets', 'push'].includes(c) ? 'GyPrivate' : 'GyDoc';
  const E = c => api.entities[ENT(c)];
  const rid = {}; // coll -> Map(key -> record id)
  const back = new Map(); // record id -> [coll, key]
  const remember = r => { if (!r || !r.coll || r.key == null) return; (rid[r.coll] = rid[r.coll] || new Map()).set(r.key, r.id); back.set(r.id, [r.coll, r.key]); };
  const fresh = (a, b) => (Date.parse(a.updated_date || 0) || 0) >= (Date.parse(b.updated_date || 0) || 0);

  // ---- realtime: one subscription per entity, fanned out to the collections that listen ----
  const listeners = {}; // coll -> Set(fn(event))
  const subscribed = new Set();
  function listen(c, fn) {
    (listeners[c] = listeners[c] || new Set()).add(fn); const ent = ENT(c);
    if (!subscribed.has(ent)) { subscribed.add(ent); try { api.entities[ent].subscribe(ev => { const r = ev.data || {}; let coll = r.coll, key = r.key; if (ev.type === 'delete' || !coll) { const k = back.get(ev.id); if (k) [coll, key] = k; } if (!coll) return; if (ev.type !== 'delete') remember({ ...r, id: ev.id }); (listeners[coll] || new Set()).forEach(f => { try { f(ev.type, key, r, ev.id); } catch (e) { console.warn(e); } }); }); } catch (e) { console.warn('realtime', e); } }
    return () => listeners[c].delete(fn);
  }

  // ---- a small stand-in for the document-database API the app was written against ----
  const snap = m => ({ docs: [...m.entries()].map(([id, d]) => ({ id, data: () => d, exists: true })), metadata: { fromCache: false } });
  function docRef(c, key) {
    return {
      id: key,
      async set(data) { const res = await E(c).upsert([{ coll: c, key, data, ts: Date.now() }], { key: ['coll', 'key'] }); (res.records || []).forEach(remember); },
      async update(patch) { const cur = (Store.cache[c] && Store.cache[c].get(key)) || {}; const merged = typeof deepMerge === 'function' ? deepMerge(cur, patch) : { ...cur, ...patch }; return this.set(merged); },
      async delete() { let id = rid[c] && rid[c].get(key); if (!id) { const rs = await E(c).filter({ coll: c, key }); rs.forEach(remember); id = rs[0] && rs[0].id; } if (id) { await E(c).delete(id); back.delete(id); rid[c].delete(key); } },
      async get() { const rs = await E(c).filter({ coll: c, key }); rs.forEach(remember); const r = rs.sort((a, b) => fresh(a, b) ? -1 : 1)[0]; return { exists: !!r, id: key, data: () => (r ? r.data || {} : undefined) }; },
      async acquire() { return { acquired: true }; } };
  }
  function query(c, lim) {
    return {
      orderBy() { return this; }, limit(n) { return query(c, n); }, doc: key => docRef(c, key),
      async get() { const m = await load(c, lim); return snap(m); },
      onSnapshot(cb, err) { let m = new Map(), dead = false;
        load(c, lim).then(x => { if (dead) return; m = x; cb(snap(m)); }).catch(e => { console.warn('load', c, e); err ? err(e) : cb(snap(m)); });
        const off = listen(c, (type, key, r) => { if (type === 'delete') m.delete(key); else m.set(key, r.data || {}); if (lim && m.size > lim * 1.2) { const ks = [...m.keys()]; ks.slice(0, ks.length - lim).forEach(k => m.delete(k)); } cb(snap(m)); });
        return () => { dead = true; off(); }; } };
  }
  async function load(c, lim) { const rs = await E(c).filter({ coll: c }, '-updated_date', Math.min(lim || 5000, 5000)); const best = new Map();
    for (const r of rs) { remember(r); const cur = best.get(r.key); if (!cur || fresh(r, cur)) best.set(r.key, r); }
    const m = new Map(); [...best.values()].reverse().forEach(r => m.set(r.key, r.data || {})); return m; }
  const db = { collection: c => query(c), doc: path => { const p = String(path).split('/'); return docRef('priv', p[2] || p[p.length - 1]); } };

  // ---- presence: one heartbeat record per signed-in player ----
  const room = { cb: null, state: {}, t: null, last: 0, peers: new Map(),
    presence(st) { this.state = st || {}; clearTimeout(this.t); const wait = Math.max(0, 1500 - (Date.now() - this.last)); this.t = setTimeout(() => this.beat(), wait); },
    async beat() { this.last = Date.now(); try { await api.entities.GyPresence.upsert([{ coll: 'presence', key: B44.me.id, data: this.state, ts: Date.now() }], { key: ['coll', 'key'] }); } catch (e) {} },
    emit() { const cut = Date.now() - 75e3; const list = [...this.peers.values()].filter(p => p.ts > cut).map(p => p.data).filter(Boolean); this.cb && this.cb(list); },
    async onPeers(cb) { this.cb = cb; try { const rs = await api.entities.GyPresence.list('-updated_date', 1000); rs.forEach(r => this.peers.set(r.key, r)); } catch (e) {} this.emit();
      try { api.entities.GyPresence.subscribe(ev => { const r = ev.data || {}; if (ev.type === 'delete') return; if (r.key) { this.peers.set(r.key, r); this.emit(); } }); } catch (e) {}
      setInterval(() => { this.beat(); this.emit(); }, 25e3); } };

  const assets = { async upload(file) { const r = await api.integrations.Core.UploadFile({ file }); return { url: r.file_url || r.url }; } };
  const user = { id: async () => B44.me.id, isOwner: async () => B44.me.role === 'admin', can: async () => true, profiles: async () => ({}) };

  // ---- sign-in ----
  B44.login = () => { try { api.auth.redirectToLogin(location.href); } catch (e) { location.href = '/login?from_url=' + encodeURIComponent(location.href); } };
  B44.logout = () => { try { localStorage.removeItem('base44_access_token'); } catch (e) {} try { api.auth.logout(location.origin + location.pathname); } catch (e) { location.reload(); } };

  const origUpgrade = Store.upgrade;
  Store.upgrade = async function () {
    if (!token) return false; // visitors who have not signed in play on this device until they do
    try { B44.me = await api.auth.me(); } catch (e) { return false; }
    if (!B44.me || !B44.me.id) return false;
    const localUid = this.uid, localProfile = this.cache.profiles && this.cache.profiles.get(localUid);
    window.claude = { use: async n => ({ db, user, room, assets })[n] || null };
    const ok = await origUpgrade.call(this);
    if (ok) {
      this.canWrite = true;
      try { await this.profilesLoaded; } catch (e) {}
      if (!this.cache.profiles.get(this.uid)) { // first sign-in: carry over what was played on this device
        const base = localProfile ? JSON.parse(JSON.stringify(localProfile)) : {}; delete base.id;
        await this.put('profiles', this.uid, { name: '', friends: [], likes: [], passes: [], blocked: [], joined: [], scores: {}, ...base, name: (base.name || B44.me.full_name || '').slice(0, 40), seen: Date.now() });
      }
    }
    return ok;
  };

  // Accounts: Base44 handles email, passwords, Google sign-in, verification and resets
  const patchAuth = () => {
    if (typeof Auth === 'undefined') return;
    Auth.signedIn = () => Store.mode === 'shared' && !!B44.me;
    Auth.email = () => (B44.me && B44.me.email) || '';
    Auth.signOut = () => B44.logout();
    Auth.signIn = Auth.signUp = Auth.social = async () => { B44.login(); return new Promise(() => {}); };
    Auth.reset = async () => { location.href = '/login?from_url=' + encodeURIComponent(location.href); return new Promise(() => {}); };
    window.authModal = () => B44.login();
  };
  patchAuth();

  // ---- payments, created and verified on the server ----
  const call = async (path, body) => { const t = localStorage.getItem('base44_access_token') || token; const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Id': APP_ID, ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body || {}) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); return j; };
  B44.call = call;
  if (typeof Pay !== 'undefined') {
    const origOpen = Pay.open.bind(Pay);
    Pay.open = function (kind, key, amount) {
      if (this.ctx() !== 'web') return origOpen(kind, key, amount);
      if (!Auth.signedIn()) { toast('Please sign in first, so your purchase is linked to your account.'); return B44.login(); }
      const COINP = { c500: [500, 0.99], c1500: [1500, 2.99], c4000: [4000, 6.99], c10000: [10000, 14.99] };
      if (kind === 'coins' && typeof Age !== 'undefined' && Age.under18()) return toast('Coin packs need a parent or guardian. Please ask an adult to help.');
      const it = kind === 'coins' ? { title: `${COINP[key][0].toLocaleString()} David’s Game World coins`, amount: COINP[key][1], per: '' } : key === 'family' ? { title: 'Family membership (you + up to 5 people)', amount: (Config.get().prices || {}).family || 12.99, per: '/month' } : this.item(kind, key, amount), isDon = kind === 'donate';
      const firstTime = kind === 'plan' && key === 'monthly' && !Store.get('members', Store.uid) && (Config.get().trialDays ?? 7) > 0;
      const box = modal(`<h2>${isDon ? 'Donate' : 'Checkout'}</h2><div class="osum"><div><b>${esc(it.title)}</b><small>${isDon ? 'Thank you for supporting David’s Game World' : kind === 'coins' ? 'One-time purchase. Coins buy cosmetics only and have no cash value.' : 'Renews automatically. Cancel any time from Account › Membership.'}</small></div><b class="oamt">${money(key === 'dcustom' ? amount : it.amount)}<small>${esc(it.per || '')}</small></b></div>
        <p class="small"><b>Ways to pay</b> <span class="muted">(shown at checkout where available)</span></p><div class="pmeth">${PAY_METHODS.map(m => `<span>${esc(m)}</span>`).join('')}</div>
        ${firstTime ? `<p class="pill hot">Your first ${Config.get().trialDays ?? 7} days are free. You won't be charged if you cancel before the trial ends.</p>` : ''}<p class="muted small">Prices may be adjusted for your country.</p>${kind === 'plan' ? '<label class="chk"><input type="checkbox" id="pren"> I understand this subscription renews automatically until I cancel.</label>' : ''}
        <button class="btn hot wide" id="pgo2">Continue to secure checkout</button><p class="muted small center">You'll pay on a secure checkout page. Card details never touch David’s Game World's servers. Promo codes can be entered there.</p>`, 'pay');
      box.querySelector('#pgo2').onclick = async e => { const ren = box.querySelector('#pren'); if (ren && !ren.checked) return toast('Please confirm the renewal terms first.'); e.target.disabled = true; e.target.textContent = 'Opening checkout…';
        try { const r = await call('/api/gy/checkout', { kind, key, amount: key === 'dcustom' ? Number(amount) || 0 : undefined }); location.href = r.url; } catch (er) { toast(er.message); e.target.disabled = false; e.target.textContent = 'Continue to secure checkout'; } };
    };
  }
  B44.afterPay = async () => {
    const q = new URLSearchParams(location.search), sid = q.get('session_id') || q.get('checkout_id');
    if (sid && q.get('gy_paid')) { history.replaceState(null, '', location.pathname + location.hash);
      try { const r = await call('/api/gy/confirm', { checkout_id: sid }); toast(r.kind === 'gift' ? 'Thank you! Your friend now has a month of membership.' : r.trial ? 'Your free trial has started. Enjoy membership!' : r.kind === 'plan' ? 'Payment received. Your membership is active. Thank you!' : r.kind === 'coins' ? `Payment received. ${r.coins} coins added. Enjoy!` : 'Payment received. Thank you so much for your donation!'); } catch (e) { toast(e.message); } }
    if (Store.mode === 'shared' && isMember()) { const m = Store.get('members', Store.uid); if (m && m.sub && (!m.synced || Date.now() - m.synced > 6 * 3600e3)) call('/api/gy/sync', {}).catch(() => {}); }
  };
  B44.cancelSub = async () => { const r = await call('/api/gy/cancel', {}); toast(r.message || 'Your membership will end at the close of this billing period.'); };

  // Stop the old device-only "service worker" path from fighting the Base44 host
  document.documentElement.classList.add('on-b44');
})();
