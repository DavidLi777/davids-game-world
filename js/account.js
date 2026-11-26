// Accounts, sign-in, membership plans, payments (Stripe on the web, Google Play and Apple in the store apps), donations and promo codes.

// ---------- Site configuration (set by the developer, readable by everyone) ----------
const CFG_DEFAULT = { siteUrl: '', contactEmail: '', currency: 'USD',
  prices: { monthly: 7.99, yearly: 59.99 },
  stripe: { monthly: '', yearly: '', d25: '', d50: '', d100: '', dcustom: '', portal: '' },
  play: { pkg: '', monthly: '', yearly: '', d25: '', d50: '', d100: '' },
  apple: { appId: '', monthly: '', yearly: '', d25: '', d50: '', d100: '' },
  firebase: { apiKey: '', authDomain: '', projectId: '', appId: '' },
  providers: { google: true, apple: true, microsoft: true, facebook: true, twitter: true, github: true, yahoo: true },
  freeAll: false };
const Config = {
  get() { const d = Store.get('config', 'site') || {}; const { id, ...rest } = d; const c = deepMerge(CFG_DEFAULT, rest); if (c.prices.monthly === 4.99) c.prices.monthly = 7.99; if (c.prices.yearly === 39.99) c.prices.yearly = 59.99; delete c.prices.lifetime; return c; },
  async save(patch) { const cur = this.get(); await Store.put('config', 'site', deepMerge(cur, patch)); },
  url() { const u = this.get().siteUrl; if (/^https:\/\//.test(u)) return u; try { if (/^https?:/.test(location.href) && !/usercontent|sandbox|localhost|127\.0\.0\.1/.test(location.host)) return location.origin + location.pathname; } catch (e) {} return 'https://claude.ai/artifact/CJbSeyTKv2Gut3H4edfB2H'; } };
const money = (n, cur) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || Config.get().currency || 'USD' }).format(+n || 0); } catch (e) { return '$' + (+n || 0).toFixed(2); } };
const PLAN_INFO = { monthly: { name: 'Member · monthly', per: '/month', days: 31 }, yearly: { name: 'Member · yearly', per: '/year', days: 366 } };

// ---------- Account records: accounts/{uid}, readable by that person and the site owner only ----------
const Acct = { me: null, all: new Map(), unsub: null,
  async init() { if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; }
    if (Store.mode === 'shared' && Store.db) { const col = Store.db.collection('accounts');
      if (Store.owner) { this.unsub = col.onSnapshot(s => { this.all = new Map(s.docs.map(d => [d.id, d.data()])); this.me = this.all.get(Store.uid) || null; Store.onChange('accounts'); }, e => console.warn('accounts', e && e.code)); }
      else { try { const d = await col.doc(Store.uid).get(); this.me = d.exists ? d.data() : null; } catch (e) { this.me = LS.get('acctCache', null); } this.all = new Map(this.me ? [[Store.uid, this.me]] : []); Store.onChange('accounts'); } }
    else { this.all = new Map(Object.entries(LS.get('c:accounts', {}))); this.me = this.all.get(Store.uid) || null; } },
  list() { return [...this.all.entries()].map(([id, d]) => ({ id, ...d })); },
  async save(patch, id = Store.uid, replace) { const cur = (id === Store.uid ? this.me : this.all.get(id)) || {}; const n = replace ? patch : deepMerge(cur, JSON.parse(JSON.stringify(patch))); n.updated = now();
    this.all.set(id, n); if (id === Store.uid) { this.me = n; LS.set('acctCache', { ...n, pass: undefined, rec: undefined }); }
    if (Store.mode === 'shared' && Store.db) { try { await Store.db.collection('accounts').doc(id).set(n); } catch (e) { Store.fail(e); } } else LS.set('c:accounts', Object.fromEntries(this.all));
    Store.onChange('accounts'); return n; },
  async remove(id = Store.uid) { this.all.delete(id); if (id === Store.uid) this.me = null; if (Store.mode === 'shared' && Store.db) { try { await Store.db.collection('accounts').doc(id).delete(); } catch (e) { Store.fail(e); } } else LS.set('c:accounts', Object.fromEntries(this.all)); Store.onChange('accounts'); } };
const device = () => { const u = navigator.userAgent; const os = /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac OS X/.test(u) ? 'macOS' : /CrOS/.test(u) ? 'ChromeOS' : /Linux/.test(u) ? 'Linux' : 'Other';
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Browser'; return `${br} on ${os}`; };

// ---------- Sign-in ----------
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pwHash(pw, salt, iter = 150000) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']); return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: iter, hash: 'SHA-256' }, k, 256)); }
const randCode = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); };
const pwScore = pw => { let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^\w\s]/.test(pw)) s++; return Math.min(4, s); };
const PROVIDERS = [['google', 'Google', 'google.com'], ['apple', 'Apple', 'apple.com'], ['microsoft', 'Microsoft', 'microsoft.com'], ['facebook', 'Facebook', 'facebook.com'], ['twitter', 'X (Twitter)', 'twitter.com'], ['github', 'GitHub', 'github.com'], ['yahoo', 'Yahoo', 'yahoo.com']];
const PROV_ICON = { google: '<path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0012 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 010-3.9V7.5H3.1a10 10 0 000 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 003.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6z"/>',
  apple: '<path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.3 4.3 0 00-3.4-1.8c-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8a4.5 4.5 0 00-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7 2-1.1 2.8-2.3a9.7 9.7 0 001.3-2.6 3.9 3.9 0 01-2.5-3.6zM14.2 5.6A3.9 3.9 0 0015.1 2.8a4 4 0 00-2.6 1.3 3.7 3.7 0 00-.9 2.7 3.3 3.3 0 002.6-1.2z"/>',
  microsoft: '<path fill="#F25022" d="M3 3h8.5v8.5H3z"/><path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z"/><path fill="#00A4EF" d="M3 12.5h8.5V21H3z"/><path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z"/>',
  facebook: '<circle cx="12" cy="12" r="10" fill="#1877F2"/><path fill="#fff" d="M13.2 21v-6.6h2.2l.4-2.6h-2.6v-1.7c0-.7.4-1.4 1.5-1.4h1.2V6.5a14 14 0 00-2-.2c-2.1 0-3.4 1.2-3.4 3.5v2H8.2v2.6h2.3V21z"/>',
  twitter: '<rect width="20" height="20" x="2" y="2" rx="4" fill="currentColor"/><path fill="var(--panel)" d="M6.5 6h3.1l2.6 3.6L15.3 6h1.5l-3.9 4.5L17.5 18h-3.1l-2.9-4-3.4 4H6.6l4.2-4.8z"/>',
  github: '<path fill="currentColor" d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5a3.9 3.9 0 011-2.7 3.6 3.6 0 01.1-2.7s.8-.3 2.8 1a9.5 9.5 0 015 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0012 2z"/>',
  yahoo: '<rect width="20" height="20" x="2" y="2" rx="5" fill="#6001D2"/><path fill="#fff" d="M6.5 8h2.6l1.6 4 1.6-4h2.5l-3.8 8.7H8.5l1-2.3zM16 8h2.4l-2.2 5.2h-2.4z"/>',
  email: '<path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h18v12H3zM3 6l9 7 9-7"/>' };
const provIcon = k => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${PROV_ICON[k] || PROV_ICON.email}</svg>`;

const Auth = { fb: null, fbLoading: null,
  signedIn() { const a = Acct.me; return !!(a && a.email && !a.deleted && LS.get('signed:' + Store.uid, false)); },
  email() { return this.signedIn() ? Acct.me.email : ''; },
  fbReady() { const f = Config.get().firebase; return !!(f.apiKey && f.authDomain && f.projectId); },
  async loadFirebase() { if (this.fb) return this.fb; if (!this.fbReady()) return null; if (!this.fbLoading) this.fbLoading = (async () => {
      const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      await load('https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-app-compat.js'); await load('https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-auth-compat.js');
      const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(Config.get().firebase); this.fb = window.firebase.auth(app); return this.fb; })().catch(e => { console.warn(e); this.fbLoading = null; return null; });
    return this.fbLoading; },
  async finish(email, provider, extra = {}) { const a = Acct.me || {}; const logins = [{ ts: now(), dev: device(), via: provider }, ...(a.logins || [])].slice(0, 40);
    await Acct.save({ email: email.toLowerCase(), provider: a.provider || provider, created: a.created || now(), lastLogin: now(), logins, connected: { [provider]: true }, ...extra });
    LS.set('signed:' + Store.uid, true); if (!me().name && extra.name) await saveMe({ name: extra.name.slice(0, 40) }); render(true); },
  async signUp({ email, pw, name, marketing }) { email = email.trim().toLowerCase();
    if (Acct.me && Acct.me.email && Acct.me.email !== email && Acct.me.pass) throw new Error('This browser already has an account (' + Acct.me.email + '). Sign in to it instead.');
    const fb = await this.loadFirebase(); if (fb) { try { await fb.createUserWithEmailAndPassword(email, pw); } catch (e) { throw new Error(fbMsg(e)); } }
    const salt = randCode(16), rec = randCode(12); const pass = { salt, hash: await pwHash(pw, salt) }, recH = await pwHash(rec, salt);
    await this.finish(email, 'email', { pass, rec: recH, name: name || '', marketing: !!marketing, terms: now() }); return rec; },
  async signIn(email, pw) { email = email.trim().toLowerCase(); const fb = await this.loadFirebase();
    if (fb) { try { await fb.signInWithEmailAndPassword(email, pw); return this.finish(email, 'email'); } catch (e) { if (!(Acct.me && Acct.me.pass)) throw new Error(fbMsg(e)); } }
    const a = Acct.me; if (!a || !a.email || a.email !== email || !a.pass) throw new Error('No account with that email on this sign-in. Check the address, or create an account.');
    if (a.lock && a.lock > now()) throw new Error('Too many tries. Wait a minute, then try again.');
    if (await pwHash(pw, a.pass.salt) !== a.pass.hash) { const fails = (a.fails || 0) + 1; await Acct.save({ fails, lock: fails >= 5 ? now() + 60e3 : 0 }); throw new Error('That password is not right.'); }
    await Acct.save({ fails: 0, lock: 0 }); return this.finish(email, 'email'); },
  async social(p) { const cfg = Config.get(); const fb = await this.loadFirebase(); const P = window.firebase && window.firebase.auth;
    if (!fb || !P || cfg.providers[p] === false) { toast(`${PROVIDERS.find(x => x[0] === p)[1]} sign-in isn't switched on yet. Use your email for now.`); return; }
    const prov = p === 'google' ? new P.GoogleAuthProvider() : p === 'facebook' ? new P.FacebookAuthProvider() : p === 'twitter' ? new P.TwitterAuthProvider() : p === 'github' ? new P.GithubAuthProvider() : new P.OAuthProvider(PROVIDERS.find(x => x[0] === p)[2]);
    try { const r = await fb.signInWithPopup(prov); const u = r.user; if (!u.email) throw new Error('That account did not share an email address.'); await this.finish(u.email, p, { name: (Acct.me && Acct.me.name) || u.displayName || '' }); closeModal(); toast('Signed in with ' + PROVIDERS.find(x => x[0] === p)[1]); }
    catch (e) { toast(fbMsg(e)); } },
  async reset(email, code, pw) { const a = Acct.me; email = email.trim().toLowerCase(); const fb = await this.loadFirebase();
    if (fb && !code) { try { await fb.sendPasswordResetEmail(email); return 'sent'; } catch (e) { throw new Error(fbMsg(e)); } }
    if (!a || a.email !== email || !a.rec) throw new Error('No account with that email on this sign-in.');
    if (await pwHash(code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), a.pass.salt) !== a.rec) throw new Error('That recovery code is not right.');
    const salt = randCode(16), rec = randCode(12); await Acct.save({ pass: { salt, hash: await pwHash(pw, salt) }, rec: await pwHash(rec, salt), fails: 0, lock: 0 }); await this.finish(email, 'email'); return rec; },
  signOut() { LS.set('signed:' + Store.uid, false); try { this.fb && this.fb.signOut(); } catch (e) {} toast('Signed out. You can keep playing as a guest.'); render(true); } };
const fbMsg = e => { const c = (e && e.code) || ''; return c.includes('email-already') ? 'That email already has an account. Sign in instead.' : c.includes('wrong-password') || c.includes('invalid-credential') ? 'Email or password is not right.' : c.includes('user-not-found') ? 'No account with that email.' : c.includes('weak-password') ? 'Choose a stronger password.' : c.includes('popup') ? 'The sign-in window was closed or blocked.' : c.includes('network') ? 'Could not reach the sign-in service.' : (e && e.message) || 'Sign-in failed.'; };

function authModal(tab = 'in') {
  const provs = PROVIDERS.filter(([k]) => Config.get().providers[k] !== false);
  const body = () => {
    const social = `<div class="social">${provs.map(([k, n]) => `<button class="btn sbtn" data-p="${k}">${provIcon(k)}<span>Continue with ${n}</span></button>`).join('')}</div><div class="or"><span>or use your email</span></div>`;
    if (tab === 'up') return `<h2>Create your account</h2><p class="muted small">Optional. An account keeps your payments, membership, spending and progress records together.</p>${social}
      <form id="af" class="aform"><label class="fld">Name <input name="name" autocomplete="name" maxlength="40" required></label><label class="fld">Email <input name="email" type="email" autocomplete="email" required></label>
      <label class="fld">Password <input name="pw" type="password" autocomplete="new-password" minlength="8" required><span class="meter"><i></i></span><small class="muted">At least 8 characters. Mix upper and lower case, numbers and symbols for a stronger password.</small></label>
      <label class="fld">Confirm password <input name="pw2" type="password" autocomplete="new-password" required></label><label class="chk"><input type="checkbox" name="show"> Show passwords</label>
      <label class="chk"><input type="checkbox" name="terms" required> I agree to the <a href="#info-terms" data-close="1">Terms of Service</a> and <a href="#info-privacy" data-close="1">Privacy Policy</a></label><label class="chk"><input type="checkbox" name="marketing"> Email me about new games and offers</label>
      <button class="btn hot wide">Create account</button></form><p class="center small">Already have an account? <button class="link" data-t="in">Sign in</button></p>`;
    if (tab === 'reset') return `<h2>Reset your password</h2><p class="muted small">${Auth.fbReady() ? 'We will email you a reset link. If you saved a recovery code, you can use it instead.' : 'Use the recovery code you saved when you created your account.'}</p>
      <form id="af" class="aform"><label class="fld">Email <input name="email" type="email" autocomplete="email" required></label><label class="fld">Recovery code ${Auth.fbReady() ? '(optional)' : ''}<input name="code" autocomplete="off" ${Auth.fbReady() ? '' : 'required'}></label>
      <label class="fld">New password <input name="pw" type="password" autocomplete="new-password" minlength="8"></label><button class="btn hot wide">Reset password</button></form><p class="center small"><button class="link" data-t="in">Back to sign in</button></p>`;
    return `<h2>Sign in</h2><p class="muted small">Signing in is optional. It links your payments, membership, spending and progress to your account.</p>${social}
      <form id="af" class="aform"><label class="fld">Email <input name="email" type="email" autocomplete="email" required value="${esc((Acct.me && Acct.me.email) || '')}"></label><label class="fld">Password <input name="pw" type="password" autocomplete="current-password" required></label>
      <div class="rowsb"><label class="chk"><input type="checkbox" name="show"> Show password</label><button type="button" class="link" data-t="reset">Forgot password?</button></div><button class="btn hot wide">Sign in</button></form>
      <p class="center small">New here? <button class="link" data-t="up">Create an account</button></p>`; };
  const box = modal(`<div class="authbox">${body()}</div>`, 'auth'); const host = box.querySelector('.authbox');
  const bind = () => { host.innerHTML = body(); const f = host.querySelector('#af'); const pw = f.querySelector('[name=pw]'), meter = f.querySelector('.meter i');
    if (pw && meter) pw.oninput = () => { const s = pwScore(pw.value); meter.style.width = (s * 25) + '%'; meter.dataset.s = s; };
    const show = f.querySelector('[name=show]'); if (show) show.onchange = () => f.querySelectorAll('input[type=password],input[data-pw]').forEach(i => { i.dataset.pw = 1; i.type = show.checked ? 'text' : 'password'; });
    f.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); const btn = f.querySelector('button.hot'); btn.disabled = true;
      try {
        if (tab === 'up') { if (d.pw !== d.pw2) throw new Error('The passwords do not match.'); if (pwScore(d.pw) < 2) throw new Error('Choose a stronger password.'); const rec = await Auth.signUp({ email: d.email, pw: d.pw, name: d.name, marketing: d.marketing }); showRecovery(rec, 'Welcome to David’s Game World!'); }
        else if (tab === 'reset') { const r = await Auth.reset(d.email, d.code, d.pw); if (r === 'sent') { toast('Check your email for a reset link.'); tab = 'in'; bind(); } else showRecovery(r, 'Password changed'); }
        else { await Auth.signIn(d.email, d.pw); closeModal(); toast('Welcome back!'); }
      } catch (err) { toast(err.message || 'Something went wrong.'); btn.disabled = false; } }; };
  host.addEventListener('click', e => { const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; bind(); } const p = e.target.closest('[data-p]'); if (p) Auth.social(p.dataset.p); }); bind(); }
function showRecovery(code, title) { modal(`<h2>${esc(title)}</h2><p>Save this recovery code somewhere safe. It is the only way to reset your password if you forget it, and we can't show it again.</p><p class="reccode">${esc(code.match(/.{1,4}/g).join('-'))}</p><div class="row-btns"><button class="btn" id="cprc">Copy code</button><button class="btn hot" data-close="1">I've saved it</button></div>`);
  $('#cprc').onclick = async () => { try { await navigator.clipboard.writeText(code); toast('Copied.'); } catch (e) { toast('Copy it by hand, please.'); } }; }

// ---------- Membership status ----------
const memberInfo = id => { const m = Store.get('members', id || Store.uid); if (!m || !m.member) return null; if (m.until && m.until < now()) return null; return m; };

// ---------- Payments ----------
const PAY_METHODS = ['Visa', 'Mastercard', 'American Express', 'Discover', 'Diners Club', 'JCB', 'UnionPay', 'Apple Pay', 'Google Pay', 'Link', 'PayPal', 'Cash App Pay', 'Amazon Pay', 'Klarna', 'Afterpay / Clearpay', 'Affirm', 'Zip', 'US bank account (ACH)', 'SEPA Direct Debit', 'iDEAL', 'Bancontact', 'EPS', 'Przelewy24', 'BLIK', 'TWINT', 'MobilePay', 'Swish', 'Revolut Pay', 'Multibanco', 'Alipay', 'WeChat Pay', 'GrabPay', 'PayNow', 'Konbini', 'OXXO', 'Boleto', 'Pix'];
const Pay = {
  ctx() { const pv = LS.get('payPreview', ''); if (pv && Dev.allowed()) return pv; const w = window.webkit && window.webkit.messageHandlers, ua = navigator.userAgent;
    if ((w && (w.iap || w.storekit)) || /GameyardApp-iOS/.test(ua)) return 'apple';
    if (document.referrer.startsWith('android-app://')) { try { sessionStorage.setItem('gy:twa', '1'); } catch (e) {} }
    let twa = false; try { twa = sessionStorage.getItem('gy:twa') === '1'; } catch (e) {} if (twa || /GameyardApp-Android/.test(ua) || ('getDigitalGoodsService' in window && /Android/.test(ua))) return 'play'; return 'web'; },
  ctxName: { web: 'Website (Stripe)', play: 'Google Play app', apple: 'Apple App Store app' },
  item(kind, key, amount) { const c = Config.get(); if (kind === 'plan') return { title: PLAN_INFO[key].name, amount: c.prices[key], key, per: PLAN_INFO[key].per }; return { title: key === 'dcustom' ? 'Donation · your amount' : 'Donation · ' + money(amount), amount, key, per: '' }; },
  async order(o) { const a = Acct.me || {}; const orders = [{ id: 'o' + uid8(), ts: now(), currency: Config.get().currency, status: 'started', ...o }, ...(a.orders || [])].slice(0, 200); await Acct.save({ orders }); return orders[0]; },
  async setStatus(uid, oid, status, extra = {}) { const a = uid === Store.uid ? Acct.me : Acct.all.get(uid); if (!a) return; const orders = (a.orders || []).map(o => o.id === oid ? { ...o, status, ...extra, [status + 'At']: now() } : o); await Acct.save({ orders }, uid); return orders.find(o => o.id === oid); },
  // Google Play Billing through the Digital Goods API (inside the Play Store app build)
  async playBuy(sku) { if (!('getDigitalGoodsService' in window)) throw new Error('Google Play Billing is only available in the Play Store app.');
    const svc = await window.getDigitalGoodsService('https://play.google.com/billing'); const pr = new PaymentRequest([{ supportedMethods: 'https://play.google.com/billing', data: { sku } }], { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } });
    const res = await pr.show(); const token = res.details && res.details.purchaseToken; await res.complete('success'); try { await svc.consume(token); } catch (e) {} return token; },
  async playPrice(sku) { try { const svc = await window.getDigitalGoodsService('https://play.google.com/billing'); const [d] = await svc.getDetails([sku]); return d ? money(d.price.value, d.price.currency) : null; } catch (e) { return null; } },
  // Apple StoreKit through the iOS app's message bridge (the native app calls window.GameyardIAP.result)
  appleBuy(productId, action = 'purchase', code) { return new Promise((res, rej) => { const w = window.webkit && window.webkit.messageHandlers, h = w && (w.iap || w.storekit); if (!h) return rej(new Error('Apple purchases are only available in the App Store app.'));
    const id = uid8(); (window.GameyardIAP = window.GameyardIAP || { cb: {} }).cb[id] = r => r && r.ok ? res(r) : rej(new Error((r && r.error) || 'Purchase cancelled.')); h.postMessage({ id, action, productId, code }); }); },
  open(kind, key, amount) { const c = Config.get(), ctx = this.ctx(), it = this.item(kind, key, amount), acct = Acct.me || {};
    const isDon = kind === 'donate', storeKey = isDon ? key : key, sku = ctx === 'play' ? c.play[storeKey] : ctx === 'apple' ? c.apple[storeKey] : '', link = c.stripe[storeKey];
    const customInStore = isDon && key === 'dcustom' && ctx !== 'web';
    const promoBlock = `<details class="promo" ${LS.get('promo', '') ? 'open' : ''}><summary>Have a coupon or promo code?</summary><div class="row-btns"><input id="pcode" maxlength="40" placeholder="Enter code" autocomplete="off" value="${esc(LS.get('promo', ''))}" aria-label="Promo code"><button class="btn" id="papply">Apply</button></div><p class="muted small" id="pnote">${ctx === 'web' ? 'Your code is checked and applied on the secure checkout page.' : ctx === 'play' ? 'Google Play codes are redeemed in the Play Store and then show up here.' : 'Apple offer codes are redeemed with the App Store sheet.'}</p></details>`;
    const sum = `<div class="osum"><div><b>${esc(it.title)}</b><small>${isDon ? 'Thank you for supporting David’s Game World' : kind === 'plan' ? 'Renews automatically. Cancel any time.' : ''}</small></div><b class="oamt">${key === 'dcustom' ? (amount ? money(amount) : 'You choose') : money(it.amount)}<small>${esc(it.per)}</small></b></div>`;
    const web = `<section data-ctx="web"><h3>Pay on the website</h3>${promoBlock}<label class="fld">Email for your receipt <input id="pemail" type="email" value="${esc(acct.email || '')}" autocomplete="email"></label>
      <p class="small"><b>Ways to pay</b> <span class="muted">(shown at checkout where available in your country)</span></p><div class="pmeth">${PAY_METHODS.map(m => `<span>${esc(m)}</span>`).join('')}</div>
      ${kind === 'plan' ? '<label class="chk"><input type="checkbox" id="pren"> I understand this subscription renews automatically until I cancel.</label>' : ''}
      ${link ? `<a class="btn hot wide" id="pgo" href="#" target="_blank" rel="noopener">Continue to secure checkout</a>` : `<button class="btn hot wide" disabled>Checkout is coming soon</button>`}
      <p class="muted small center">Payments are processed securely by Stripe. Card details never touch our servers.</p></section>`;
    const play = `<section data-ctx="play"><h3>Pay with Google Play</h3>${customInStore ? '<p>Custom amounts aren\'t available in the Play Store app. Please pick $25, $50 or $100, or donate on our website.</p>' : `${promoBlock}<p class="muted small" id="pprice">${sku ? 'Price is confirmed by Google Play.' : ''}</p>${sku ? '<button class="btn hot wide" id="pplay">Buy with Google Play</button>' : '<button class="btn hot wide" disabled>Coming soon in the Play Store app</button>'}<p class="muted small center">Charged to your Google Play payment method. Manage subscriptions in Google Play.</p>`}</section>`;
    const apple = `<section data-ctx="apple"><h3>Pay with Apple</h3>${customInStore ? '<p>Custom amounts aren\'t available in the App Store app. Please pick $25, $50 or $100, or donate on our website.</p>' : `${promoBlock}${sku ? '<button class="btn hot wide appl" id="papple">Buy with Apple</button>' : '<button class="btn hot wide" disabled>Coming soon in the App Store app</button>'}<p class="muted small center">Charged to your Apple Account. Manage subscriptions in Settings › Apple Account › Subscriptions.</p>`}</section>`;
    const box = modal(`<h2>${isDon ? 'Donate' : 'Checkout'}</h2>${sum}${web}${play}${apple}<div id="pafter"></div>`, 'pay');
    box.querySelectorAll('[data-ctx]').forEach(s => s.hidden = s.dataset.ctx !== ctx);
    const promo = () => { const i = box.querySelector(`[data-ctx="${ctx}"] #pcode`); return i ? i.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : ''; };
    const ap = box.querySelector(`[data-ctx="${ctx}"] #papply`); if (ap) ap.onclick = async () => { const code = promo(); LS.set('promo', code); if (!code) return toast('Enter a code first.');
      if (ctx === 'play') { const a = document.createElement('a'); a.href = 'https://play.google.com/redeem?code=' + encodeURIComponent(code); a.target = '_blank'; a.click(); }
      else if (ctx === 'apple') { try { await this.appleBuy(sku, 'redeem', code); toast('Code redeemed.'); } catch (e) { toast(e.message); } }
      else toast('Code saved. It will be applied at checkout.');
      const a = Acct.me || {}; await Acct.save({ promos: [{ code, ts: now(), ctx, item: key }, ...(a.promos || [])].slice(0, 50) }); };
    const after = async (o, how) => { box.querySelector('#pafter').innerHTML = `<div class="pdone"><h3>${how}</h3><p>Once your payment is confirmed, ${isDon ? 'your donation appears in your account' : 'your membership switches on automatically'}. You can see its status any time under <a href="#account-billing" data-close="1">Account › Billing</a>.</p>${ctx === 'web' ? `<button class="btn" id="ppaid">I've finished paying</button>` : ''}</div>`;
      const pp = box.querySelector('#ppaid'); if (pp) pp.onclick = async () => { await this.setStatus(Store.uid, o.id, 'awaiting'); toast('Thanks! We will confirm your payment shortly.'); closeModal(); }; };
    const go = box.querySelector('#pgo'); if (go) { const upd = () => { const code = promo(), em = (box.querySelector('#pemail') || {}).value || ''; const u = new URL(link); u.searchParams.set('client_reference_id', Store.uid.replace(/[^\w-]/g, '_').slice(0, 190)); if (em) u.searchParams.set('prefilled_email', em); if (code) u.searchParams.set('prefilled_promo_code', code); go.href = u.toString(); };
      try { upd(); } catch (e) { go.removeAttribute('href'); } box.addEventListener('input', () => { try { upd(); } catch (e) {} });
      go.addEventListener('click', async e => { const ren = box.querySelector('#pren'); if (ren && !ren.checked) { e.preventDefault(); return toast('Please confirm the renewal terms first.'); } if (!/^https:\/\//.test(go.href)) { e.preventDefault(); return toast('Checkout link is not set up yet.'); }
        const o = await this.order({ kind, item: key, amount: key === 'dcustom' ? (amount || null) : it.amount, promo: promo(), channel: 'web', email: (box.querySelector('#pemail') || {}).value || '' }); after(o, 'Checkout opened in a new tab'); }); }
    const pb = box.querySelector('#pplay'); if (pb) { this.playPrice(sku).then(p => { if (p) box.querySelector('#pprice').textContent = 'Google Play price: ' + p; });
      pb.onclick = async () => { try { const token = await this.playBuy(sku); const o = await this.order({ kind, item: key, amount: it.amount, promo: promo(), channel: 'play', token }); await this.setStatus(Store.uid, o.id, 'awaiting'); after(o, 'Purchase complete'); } catch (e) { toast(e.message || 'Purchase cancelled.'); } }; }
    const pa = box.querySelector('#papple'); if (pa) pa.onclick = async () => { try { const r = await this.appleBuy(sku); const o = await this.order({ kind, item: key, amount: it.amount, promo: promo(), channel: 'apple', token: r.transactionId || '' }); await this.setStatus(Store.uid, o.id, 'awaiting'); after(o, 'Purchase complete'); } catch (e) { toast(e.message); } };
  },
  // Developer confirms a payment: grants membership for plans
  async confirm(uid, oid) { const o = await this.setStatus(uid, oid, 'paid'); if (o && o.kind === 'plan') { const cur = memberInfo(uid), base = cur && cur.until && cur.until > now() ? cur.until : now(); const days = PLAN_INFO[o.item] ? PLAN_INFO[o.item].days : 31;
      await Store.put('members', uid, { member: true, plan: o.item, until: days ? base + days * 864e5 : null, ts: now(), order: oid }); } return o; } };
window.GameyardIAP = window.GameyardIAP || { cb: {} }; window.GameyardIAP.result = r => { const f = r && window.GameyardIAP.cb[r.id]; if (f) { delete window.GameyardIAP.cb[r.id]; f(r); } };

// ---------- Membership page ----------
VIEWS.membership = { render(el) { const c = Config.get(), m = memberInfo(), ctx = Pay.ctx(), my = (Acct.me && Acct.me.orders) || [], pend = my.find(o => o.kind === 'plan' && (o.status === 'awaiting' || o.status === 'started'));
  const plan = (k, best) => `<div class="plan ${best ? 'hot' : ''}">${best ? '<span class="pill hot">Best value</span>' : ''}<h3>${PLAN_INFO[k].name.replace('Member · ', 'Member, ')}</h3><p class="price">${money(c.prices[k])}<small>${PLAN_INFO[k].per}</small></p>
    <ul><li>Unlimited games every day</li><li>Member badge on your profile and in chat</li><li>Host as many online tables as you like</li>${k === 'yearly' ? `<li>About ${Math.round((1 - c.prices.yearly / (c.prices.monthly * 12)) * 100)}% less than monthly</li>` : '<li>Cancel any time</li>'}</ul>
    ${m && m.plan === k ? '<span class="pill">Your plan</span>' : `<button class="btn ${best ? 'hot' : ''}" data-plan="${k}">Choose ${k}</button>`}</div>`;
  el.innerHTML = `<section class="band"><h1>Membership</h1><p class="lead">David’s Game World is free to play: everyone gets ${Quota.LIMIT} games a day, whether you start them, challenge someone or accept a challenge. Members skip the daily limit and play as much as they like.</p>
    ${m ? `<p class="okbox">You're a member${m.until ? ' until ' + new Date(m.until).toLocaleDateString() : ''}. Thank you!</p>` : pend ? `<p class="okbox">Your ${esc(pend.item)} payment is being confirmed. Membership switches on as soon as it is.</p>` : ''}
    <div class="plans three"><div class="plan"><h3>Free</h3><p class="price">${money(0)}</p><ul><li>${Quota.LIMIT} games a day, all 200 games</li><li>Every social feature</li><li>Watch any table for free</li></ul>${m ? '' : '<span class="pill">Your plan</span>'}</div>${plan('monthly')}${plan('yearly', true)}</div>
    <p class="muted small">Paying in: ${esc(Pay.ctxName[ctx])}. ${Auth.signedIn() ? '' : '<button class="link" id="msign">Sign in</button> to keep your receipts and membership with your account (optional).'}</p>
    <h2>Support David’s Game World</h2><p>Enjoying the games? <a href="#donate">Make a donation</a> to help us build more.</p></section>`;
  el.onclick = e => { const b = e.target.closest('[data-plan]'); if (b) Pay.open('plan', b.dataset.plan); if (e.target.id === 'msign') authModal('in'); }; } };

VIEWS.donate = { render(el) { const ctx = Pay.ctx(), mine = ((Acct.me && Acct.me.orders) || []).filter(o => o.kind === 'donate');
  el.innerHTML = `<section class="band"><h1>Donate</h1><p class="lead">David’s Game World is free to play every day. Donations keep the servers running and pay for new games.</p>
    <div class="dons">${[25, 50, 100].map(v => `<button class="don" data-d="d${v}" data-v="${v}"><b>${money(v)}</b><small>${v === 25 ? 'Buy us a game night' : v === 50 ? 'Fund a new game' : 'Become a patron'}</small></button>`).join('')}
    <div class="don custom"><b>Custom amount</b>${ctx === 'web' ? `<div class="row-btns"><input id="damt" type="number" min="1" step="1" inputmode="decimal" placeholder="Amount" aria-label="Custom amount"><button class="btn hot" id="dgo">Donate</button></div><small>You confirm the exact amount at checkout.</small>` : '<small>Custom amounts are available on our website.</small>'}</div></div>
    ${mine.length ? `<h2>Your donations</h2><table class="lb"><tbody>${mine.map(o => `<tr><td>${new Date(o.ts).toLocaleDateString()}</td><td class="num">${o.amount ? money(o.amount) : 'Custom'}</td><td>${esc(o.status)}</td></tr>`).join('')}</tbody></table>` : ''}
    <p class="muted small">Donations are not tax-deductible. They do not buy membership; see <a href="#membership">Membership</a> for unlimited play.</p></section>`;
  el.onclick = e => { const b = e.target.closest('[data-d]'); if (b) return Pay.open('donate', b.dataset.d, +b.dataset.v); if (e.target.id === 'dgo') { const v = +$('#damt').value; if (!(v >= 1)) return toast('Enter an amount of at least 1.'); Pay.open('donate', 'dcustom', v); } }; } };

// ---------- Account page ----------
const ACCT_TABS = [['overview', 'Overview'], ['personal', 'Personal info'], ['security', 'Sign-in & security'], ['plan', 'Membership'], ['billing', 'Billing & payments'], ['donations', 'Donations'], ['progress', 'Progress'], ['notifications', 'Notifications'], ['privacy', 'Privacy'], ['data', 'Your data']];
const COUNTRIES = 'Afghanistan,Albania,Algeria,Andorra,Angola,Argentina,Armenia,Australia,Austria,Azerbaijan,Bahamas,Bahrain,Bangladesh,Barbados,Belarus,Belgium,Belize,Benin,Bhutan,Bolivia,Bosnia and Herzegovina,Botswana,Brazil,Brunei,Bulgaria,Burkina Faso,Burundi,Cambodia,Cameroon,Canada,Cape Verde,Chad,Chile,China,Colombia,Costa Rica,Croatia,Cuba,Cyprus,Czechia,Denmark,Dominican Republic,Ecuador,Egypt,El Salvador,Estonia,Eswatini,Ethiopia,Fiji,Finland,France,Gabon,Georgia,Germany,Ghana,Greece,Guatemala,Guinea,Haiti,Honduras,Hong Kong,Hungary,Iceland,India,Indonesia,Iran,Iraq,Ireland,Israel,Italy,Jamaica,Japan,Jordan,Kazakhstan,Kenya,Kuwait,Kyrgyzstan,Laos,Latvia,Lebanon,Liberia,Libya,Liechtenstein,Lithuania,Luxembourg,Macau,Madagascar,Malawi,Malaysia,Maldives,Mali,Malta,Mauritius,Mexico,Moldova,Monaco,Mongolia,Montenegro,Morocco,Mozambique,Myanmar,Namibia,Nepal,Netherlands,New Zealand,Nicaragua,Niger,Nigeria,North Macedonia,Norway,Oman,Pakistan,Panama,Papua New Guinea,Paraguay,Peru,Philippines,Poland,Portugal,Puerto Rico,Qatar,Romania,Russia,Rwanda,Saudi Arabia,Senegal,Serbia,Singapore,Slovakia,Slovenia,South Africa,South Korea,Spain,Sri Lanka,Sudan,Sweden,Switzerland,Taiwan,Tajikistan,Tanzania,Thailand,Togo,Trinidad and Tobago,Tunisia,Turkey,Turkmenistan,Uganda,Ukraine,United Arab Emirates,United Kingdom,United States,Uruguay,Uzbekistan,Venezuela,Vietnam,Yemen,Zambia,Zimbabwe'.split(',');
const fld = (label, name, val, type = 'text', extra = '') => `<label class="fld">${label}<input name="${name}" type="${type}" value="${esc(val ?? '')}" ${extra}></label>`;
const sel = (label, name, val, opts) => `<label class="fld">${label}<select name="${name}">${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const tog = (label, name, on, hint = '') => `<label class="chk"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span>${label}${hint ? `<small class="muted"> · ${hint}</small>` : ''}</span></label>`;
const statusPill = s => `<span class="pill st-${esc(s)}">${esc({ started: 'checkout opened', awaiting: 'confirming', paid: 'paid', refunded: 'refunded', cancelled: 'cancelled' }[s] || s)}</span>`;

VIEWS.account = { render(el, tab) { tab = ACCT_TABS.some(t => t[0] === tab) ? tab : 'overview'; const a = Acct.me || {}, p = me(), si = Auth.signedIn(), m = memberInfo(), orders = a.orders || [];
  if (!si) { el.innerHTML = `<section class="band"><h1>Your account</h1><p class="lead">Signing in is optional. You can play everything as a guest. An account keeps your payment, spending and membership records, plus your progress, together in one place.</p>
      <div class="row-btns"><button class="btn hot" id="asin">Sign in</button><button class="btn" id="asup">Create an account</button></div>
      <h2>As a guest you still have</h2><ul class="ticks"><li>${Quota.LIMIT} games a day across all ${pubCat().length} games</li><li>Your profile, friends and posts</li><li>Highscores and progress saved on this sign-in</li></ul></section>`;
    $('#asin').onclick = () => authModal('in'); $('#asup').onclick = () => authModal('up'); return; }
  const paid = orders.filter(o => o.status === 'paid'), spent = paid.filter(o => o.kind === 'plan').reduce((s, o) => s + (+o.amount || 0), 0), donated = paid.filter(o => o.kind === 'donate').reduce((s, o) => s + (+o.amount || 0), 0);
  const scores = Object.entries(p.scores || {}).filter(([gid]) => Hide.shows(gid)), plays = scores.reduce((s, [, v]) => s + (v.plays || 0), 0), wins = scores.reduce((s, [, v]) => s + (v.w || 0), 0), xp = p.xp || 0, lvl = 1 + Math.floor(Math.sqrt(xp / 50));
  const n = a.notify || {}, pv = a.privacy || {}, b = a.billing || {};
  const T = {
    overview: `<div class="acards"><div class="acard"><small>Plan</small><b>${m ? esc(PLAN_INFO[m.plan] ? PLAN_INFO[m.plan].name : 'Member') : 'Free'}</b><span>${m ? (m.until ? 'until ' + new Date(m.until).toLocaleDateString() : 'active') : Quota.left() + ' games left today'}</span></div>
      <div class="acard"><small>Spent</small><b>${money(spent)}</b><span>${paid.filter(o => o.kind === 'plan').length} payments</span></div><div class="acard"><small>Donated</small><b>${money(donated)}</b><span>thank you!</span></div>
      <div class="acard"><small>Level</small><b>${lvl}</b><span>${xp} XP · ${plays} games · ${wins} wins</span></div></div>
      <h3>Account</h3><dl class="kv"><dt>Email</dt><dd>${esc(a.email)}</dd><dt>Signed in with</dt><dd>${esc(PROVIDERS.find(x => x[0] === a.provider) ? PROVIDERS.find(x => x[0] === a.provider)[1] : 'Email and password')}</dd><dt>Member since</dt><dd>${new Date(a.created || now()).toLocaleDateString()}</dd><dt>Last sign-in</dt><dd>${a.lastLogin ? new Date(a.lastLogin).toLocaleString() : '–'}</dd><dt>Display name</dt><dd>${esc(p.name || '–')} · <a href="#profile">view profile</a></dd></dl>`,
    personal: `<form class="aform grid2" data-f="personal">${fld('Full name', 'name', a.name)}${fld('Display name (shown to others)', 'display', p.name, 'text', 'maxlength="40"')}${fld('Phone', 'phone', a.phone, 'tel', 'autocomplete="tel"')}${fld('Date of birth', 'birthday', a.birthday, 'date')}
      ${sel('Pronouns', 'pronouns', a.pronouns, ['', 'she/her', 'he/him', 'they/them', 'Prefer not to say'])}${sel('Country or region', 'country', a.country, [''].concat(COUNTRIES))}${fld('State / province', 'region', a.region)}${fld('City', 'city', a.city)}
      ${fld('Address line 1', 'line1', a.line1, 'text', 'autocomplete="address-line1"')}${fld('Address line 2', 'line2', a.line2, 'text', 'autocomplete="address-line2"')}${fld('Postal code', 'postal', a.postal, 'text', 'autocomplete="postal-code"')}
      ${sel('Language', 'lang', a.lang || 'en', [['en', 'English']])}${sel('Time zone', 'tz', a.tz || Intl.DateTimeFormat().resolvedOptions().timeZone, (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone]))}${sel('Currency', 'cur', a.cur || 'USD', ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'ZAR'])}
      <div class="full"><button class="btn hot">Save</button></div></form>`,
    security: `<h3>Email</h3><form class="aform row" data-f="email">${fld('Email address', 'email', a.email, 'email')}<button class="btn">Change email</button></form>
      <h3>Password</h3>${a.pass ? `<form class="aform grid2" data-f="pw">${fld('Current password', 'cur', '', 'password', 'autocomplete="current-password"')}${fld('New password', 'pw', '', 'password', 'autocomplete="new-password" minlength="8"')}<div class="full"><button class="btn">Change password</button> <button type="button" class="btn ghost" id="newrec">New recovery code</button></div></form>` : '<p class="muted">You sign in with ' + esc(a.provider) + ', so there is no password to manage here.</p>'}
      <h3>Connected accounts</h3><div class="conn">${PROVIDERS.map(([k, nm]) => `<div class="acrow">${provIcon(k)}<span>${nm}</span>${a.connected && a.connected[k] ? '<span class="pill on">Connected</span>' : `<button class="btn sm" data-link="${k}">Connect</button>`}</div>`).join('')}</div>
      <h3>Recent sign-ins</h3><table class="lb"><tbody>${(a.logins || []).slice(0, 15).map(l => `<tr><td>${new Date(l.ts).toLocaleString()}</td><td>${esc(l.dev)}</td><td>${esc(l.via)}</td></tr>`).join('') || '<tr><td>No sign-ins yet</td></tr>'}</tbody></table>
      <div class="row-btns"><button class="btn" id="aout">Sign out</button></div>`,
    plan: `<p>${m ? `You're on <b>${esc(PLAN_INFO[m.plan] ? PLAN_INFO[m.plan].name : 'Member')}</b>${m.until ? `, active until ${new Date(m.until).toLocaleDateString()}` : ''}.` : `You're on the <b>Free</b> plan: ${Quota.LIMIT} games a day, ${Quota.left()} left today.`}</p>
      <div class="row-btns"><a class="btn hot" href="#membership">${m ? 'Change plan' : 'See plans'}</a>${Config.get().stripe.portal && Pay.ctx() === 'web' ? `<a class="btn" href="${esc(Config.get().stripe.portal)}" target="_blank" rel="noopener">Manage or cancel subscription</a>` : ''}</div>
      <p class="muted small">${Pay.ctx() === 'play' ? 'Subscriptions bought in the Play Store app are managed in Google Play.' : Pay.ctx() === 'apple' ? 'Subscriptions bought in the App Store app are managed in your Apple Account settings.' : 'Subscriptions bought on the website are managed through the secure billing portal.'}</p>`,
    billing: `<h3>Billing details</h3><form class="aform grid2" data-f="billing">${fld('Name on receipts', 'bname', b.name || a.name)}${fld('Company (optional)', 'company', b.company)}${fld('Tax / VAT ID (optional)', 'tax', b.tax)}${fld('Receipt email', 'bemail', b.email || a.email, 'email')}${sel('Billing country', 'bcountry', b.country || a.country, [''].concat(COUNTRIES))}${fld('Billing address', 'baddr', b.addr)}<div class="full"><button class="btn hot">Save billing details</button></div></form>
      <h3>Payment methods</h3><p class="muted small">Cards and wallets are stored by our payment processor (Stripe, Google Play or Apple), never on David’s Game World.${Config.get().stripe.portal ? ` <a href="${esc(Config.get().stripe.portal)}" target="_blank" rel="noopener">Update payment method</a>` : ''}</p>
      <h3>Spending</h3><div class="acards"><div class="acard"><small>Total spent</small><b>${money(spent + donated)}</b></div><div class="acard"><small>Membership</small><b>${money(spent)}</b></div><div class="acard"><small>Donations</small><b>${money(donated)}</b></div><div class="acard"><small>This year</small><b>${money(paid.filter(o => new Date(o.ts).getFullYear() === new Date().getFullYear()).reduce((s, o) => s + (+o.amount || 0), 0))}</b></div></div>
      <h3>Payment history</h3>${orders.length ? `<table class="lb stack"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Paid with</th><th>Code</th><th>Status</th></tr></thead><tbody>${orders.map(o => `<tr><td>${new Date(o.ts).toLocaleDateString()}</td><td>${esc(o.kind === 'donate' ? 'Donation' : (PLAN_INFO[o.item] || {}).name || o.item)}</td><td class="num">${o.amount ? money(o.amount) : '–'}</td><td>${esc(Pay.ctxName[o.channel] || o.channel)}</td><td>${esc(o.promo || '–')}</td><td>${statusPill(o.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No payments yet.</p>'}
      <h3>Promo codes you've used</h3>${(a.promos || []).length ? `<p>${a.promos.map(x => `<span class="pill">${esc(x.code)}</span>`).join(' ')}</p>` : '<p class="muted">None yet.</p>'}`,
    donations: `${orders.filter(o => o.kind === 'donate').length ? `<table class="lb"><tbody>${orders.filter(o => o.kind === 'donate').map(o => `<tr><td>${new Date(o.ts).toLocaleDateString()}</td><td class="num">${o.amount ? money(o.amount) : 'Custom'}</td><td>${statusPill(o.status)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">You haven\'t donated yet.</p>'}<a class="btn hot" href="#donate">Make a donation</a>`,
    progress: `<div class="acards"><div class="acard"><small>Level</small><b>${lvl}</b><span>${xp} XP</span></div><div class="acard"><small>Games played</small><b>${plays}</b></div><div class="acard"><small>Wins</small><b>${wins}</b></div><div class="acard"><small>Games tried</small><b>${scores.length} / ${pubCat().length}</b></div><div class="acard"><small>Today</small><b>${Quota.data.used || 0}</b><span>games played</span></div></div>
      <div class="prog"><i style="width:${Math.min(100, scores.length / pubCat().length * 100)}%"></i></div><p class="muted small">Try every game to complete the library.</p>
      <table class="lb stack"><thead><tr><th>Game</th><th>Played</th><th>Won</th><th>Lost</th><th>Best</th></tr></thead><tbody>${scores.sort((x, y) => (y[1].plays || 0) - (x[1].plays || 0)).map(([g, v]) => `<tr><td><a href="#game-${esc(g)}">${esc((GAME[g] || { name: g }).name)}</a></td><td class="num">${v.plays || 0}</td><td class="num">${v.w || 0}</td><td class="num">${v.l || 0}</td><td class="num">${v.best || 0}</td></tr>`).join('') || '<tr><td>Play a game to start tracking progress.</td></tr>'}</tbody></table>`,
    notifications: `<form class="aform" data-f="notify">${tog('Challenges and invites', 'challenges', n.challenges !== false)}${tog('Friend requests and matches', 'friends', n.friends !== false)}${tog('Messages', 'messages', n.messages !== false)}${tog('Comments and mentions', 'comments', n.comments !== false)}${tog('Events I joined', 'events', n.events !== false)}${tog('Receipts and billing', 'billing', n.billing !== false, 'always on for payments')}${tog('New games and offers by email', 'marketing', !!a.marketing)}${tog('Weekly progress summary by email', 'weekly', !!n.weekly)}<button class="btn hot">Save</button></form>`,
    privacy: `<form class="aform" data-f="privacy">${sel('Who can see my profile', 'profile', pv.profile || 'everyone', [['everyone', 'Everyone'], ['friends', 'Friends only'], ['me', 'Only me']])}${sel('Who can challenge me', 'challenge', pv.challenge || 'everyone', [['everyone', 'Everyone'], ['friends', 'Friends only'], ['nobody', 'Nobody']])}${sel('Who can message me', 'message', pv.message || 'everyone', [['everyone', 'Everyone'], ['friends', 'Friends only']])}
      ${tog('Show when I am online', 'online', pv.online !== false)}${tog('Show me on leaderboards', 'leaders', pv.leaders !== false)}${tog('Show me in People suggestions', 'discover', pv.discover !== false)}${tog('Allow personalised suggestions', 'personal', pv.personal !== false)}<button class="btn hot">Save</button></form><p class="muted small">Read our <a href="#info-privacy">Privacy Policy</a>.</p>`,
    data: `<h3>Copy your data</h3><p>Everything we keep about your account, as text you can save.</p><button class="btn" id="acopy">Copy my data</button>
      <h3>Delete account</h3><p>Removes your account details, payment records and sign-in. Your public posts stay until you delete them. This can't be undone.</p><label class="fld">Type DELETE to confirm<input id="adel" autocomplete="off"></label><button class="btn danger" id="adelb">Delete my account</button>` };
  el.innerHTML = `<section class="band"><div class="ahead">${avatar(Store.uid, 56)}<div><h1>${esc(a.name || p.name || 'Your account')}</h1><p class="muted">${esc(a.email)}${m ? ' · <span class="badge">Member</span>' : ''}</p></div></div>
    <nav class="tabs" aria-label="Account sections">${ACCT_TABS.map(([k, l]) => `<a href="#account-${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav><div class="apane">${T[tab]}</div></section>`;
  el.onsubmit = async e => { e.preventDefault(); const f = e.target, kind = f.dataset.f, d = Object.fromEntries(new FormData(f)); f.querySelectorAll('input[type=checkbox]').forEach(c => d[c.name] = c.checked);
    try {
      if (kind === 'personal') { const { display, ...rest } = d; await Acct.save(rest); if (display && display !== p.name) await saveMe({ name: display.slice(0, 40) }); }
      if (kind === 'email') { if (!/^\S+@\S+\.\S+$/.test(d.email)) throw new Error('Enter a valid email.'); await Acct.save({ email: d.email.toLowerCase() }); }
      if (kind === 'pw') { if (await pwHash(d.cur, a.pass.salt) !== a.pass.hash) throw new Error('Current password is not right.'); if (pwScore(d.pw) < 2) throw new Error('Choose a stronger password.'); const salt = randCode(16); await Acct.save({ pass: { salt, hash: await pwHash(d.pw, salt) }, rec: null }); const rec = randCode(12); await Acct.save({ rec: await pwHash(rec, salt) }); showRecovery(rec, 'Password changed'); return; }
      if (kind === 'billing') await Acct.save({ billing: { name: d.bname, company: d.company, tax: d.tax, email: d.bemail, country: d.bcountry, addr: d.baddr } });
      if (kind === 'notify') { const { marketing, ...rest } = d; await Acct.save({ notify: rest, marketing }); }
      if (kind === 'privacy') await Acct.save({ privacy: d });
      toast('Saved.'); } catch (err) { toast(err.message); } };
  el.onclick = async e => { const t = e.target;
    if (t.id === 'aout') Auth.signOut();
    if (t.dataset.link) Auth.social(t.dataset.link);
    if (t.id === 'newrec') { const rec = randCode(12); await Acct.save({ rec: await pwHash(rec, a.pass.salt) }); showRecovery(rec, 'New recovery code'); }
    if (t.id === 'acopy') { const { pass, rec, ...safe } = Acct.me || {}; try { await navigator.clipboard.writeText(JSON.stringify({ account: safe, profile: me(), membership: memberInfo() }, null, 2)); toast('Copied to your clipboard.'); } catch (err) { toast('Copy was blocked by the browser.'); } }
    if (t.id === 'adelb') { if ($('#adel').value !== 'DELETE') return toast('Type DELETE to confirm.'); await Acct.remove(); LS.set('signed:' + Store.uid, false); toast('Your account was deleted.'); location.hash = 'home'; } }; } };
