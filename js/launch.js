// Launch essentials: age check, cookie choices, error reporting, chat rate limits, and the account and membership screens for the Base44 backend.
(() => {
  const css = document.createElement('style'); css.textContent = `.ckbar{position:fixed;left:12px;right:12px;bottom:12px;z-index:90;max-width:720px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:14px 16px;border-radius:14px;background:var(--panel,#fff);color:var(--ink,#111);box-shadow:0 10px 40px rgba(0,0,0,.25);border:1px solid var(--line,#dde)}.ckbar p{flex:1 1 320px;margin:0;font-size:14px}@media (max-width:760px){.ckbar{bottom:70px}}`; document.head.appendChild(css);
  const onB44 = () => !!(window.B44 && window.B44.me && Store.mode === 'shared');

  // ---------- Age check (COPPA and dating rules) ----------
  const Age = window.Age = {
    years() { const y = +LS.get('birthYear', 0); return y ? new Date().getFullYear() - y : null; },
    under13() { const a = this.years(); return a !== null && a < 13; },
    under18() { const a = this.years(); return a !== null && a < 18; },
    ask() { return new Promise(res => { const yNow = new Date().getFullYear(); const box = modal(`<h2>Welcome to David’s Game World</h2><p>Before you start, what year were you born? We use it to keep the site right for your age. It stays on this device.</p>
      <label class="fld">Year of birth<select id="agey"><option value="">Choose…</option>${Array.from({ length: 100 }, (_, i) => yNow - 4 - i).map(y => `<option>${y}</option>`).join('')}</select></label><div class="row-btns"><button class="btn hot" id="ageok">Continue</button></div>`, 'agegate');
      box.parentElement.querySelectorAll('[data-close]').forEach(n => { n.removeAttribute('data-close'); if (n.classList.contains('x')) n.hidden = true; });
      box.querySelector('#ageok').onclick = () => { const v = +box.querySelector('#agey').value; if (!v) return toast('Please choose a year.'); LS.set('birthYear', v); closeModal(); this.apply(); res(); }; }); },
    apply() { if (this.under13()) { LS.set('family', true); if (!LS.get('familyPin', '')) LS.set('familyPin', String(1000 + Math.floor(Math.random() * 9000))); }
      document.documentElement.classList.toggle('minor', !!this.under18()); try { shell(); if (typeof Family !== 'undefined' && Family.on() && Family.hidden.includes(App.view)) location.hash = 'home'; } catch (e) {} }
  };
  // People under 18 never see dating; under 13 get family mode, which also hides public chat with strangers
  if (typeof Family !== 'undefined') { const hid = Family.hidden; const orig = Family.on.bind(Family); Family.on = () => orig() || !!Age.under18(); Object.defineProperty(Family, 'hidden', { get: () => !orig() && !Age.under13() && Age.under18() ? ['match'] : hid }); }

  // ---------- Cookie and analytics choices ----------
  const Consent = window.Consent = {
    get() { return LS.get('consent', null); },
    show() { if (this.get() || document.querySelector('.ckbar')) return; const b = document.createElement('div'); b.className = 'ckbar'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookie choices');
      b.innerHTML = `<p>We use essential storage to keep you signed in and save your games. With your permission we also measure how the site is used, to make it better. <a href="#info-cookies">Cookie Policy</a></p><div class="row-btns"><button class="btn sm" data-ck="essential">Essential only</button><button class="btn sm hot" data-ck="all">Accept all</button></div>`;
      b.onclick = e => { const k = e.target.closest('[data-ck]'); if (!k) return; LS.set('consent', { v: k.dataset.ck, ts: Date.now() }); b.remove(); }; document.body.appendChild(b); } };

  // ---------- Error reporting ----------
  let errs = 0; const report = (msg, src) => { if (!onB44() || errs >= 5) return; errs++; try { B44.api.entities.GyDoc.create({ coll: 'errlog', key: uid8(), ts: Date.now(), data: { msg: String(msg).slice(0, 500), src: String(src || '').slice(0, 200), at: location.hash.slice(0, 80), ua: navigator.userAgent.slice(0, 160), uid: Store.uid, ts: Date.now() } }).catch(() => {}); } catch (e) {} };
  window.addEventListener('error', e => report(e.message, (e.filename || '') + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', e => report((e.reason && (e.reason.message || e.reason)) || 'rejection', 'promise'));

  // ---------- Flood protection for chat ----------
  if (typeof sendMsg === 'function') { const orig = sendMsg; let times = [];
    window.sendMsg = async (chat, data) => { const t = Date.now(); times = times.filter(x => t - x < 10e3); if (times.length >= 8) return toast('Slow down a little. You can send more in a few seconds.'); times.push(t); return orig(chat, data); }; }

  // ---------- Base44 account screens ----------
  if (typeof VIEWS !== 'undefined' && VIEWS.account) { const orig = VIEWS.account.render.bind(VIEWS.account);
    VIEWS.account.render = function (el, tab) { orig(el, tab); if (!onB44() || tab !== 'security') return; const pane = el.querySelector('.apane') || el.querySelector('section');
      if (pane) pane.innerHTML = `<h2>Sign-in and security</h2><dl class="kv"><dt>Email</dt><dd>${esc(B44.me.email || '')}</dd><dt>Account ID</dt><dd><code>${esc(B44.me.id)}</code></dd></dl>
        <p>Your password, Google sign-in, email verification and password resets are handled by our secure sign-in service. We never see or store your password.</p>
        <div class="row-btns"><a class="btn" href="/login?from_url=${encodeURIComponent(location.href)}">Change or reset password</a><button class="btn" id="b44out">Sign out</button></div>
        <h3>Delete your account</h3><p class="muted small">To delete your account and data, use <a href="#account-data">Account › Your data</a> or <a href="#info-contact">contact us</a>. We erase it within 30 days.</p>`;
      const o = el.querySelector('#b44out'); if (o) o.onclick = () => B44.logout(); };
  }
  if (typeof VIEWS !== 'undefined' && VIEWS.membership) { const orig = VIEWS.membership.render.bind(VIEWS.membership);
    VIEWS.membership.render = function (el) { orig(el); if (!onB44()) return; const m = Store.get('members', Store.uid); if (!m || !m.member) return; const ok = el.querySelector('.okbox');
      const extra = m.sub ? (m.canceled ? `<p class="muted small">Your membership won't renew. It ends on ${new Date(m.until).toLocaleDateString()}.</p>` : `<p class="small">Renews automatically. <button class="link" id="mcancel">Cancel renewal</button></p>`) : '';
      if (ok) ok.insertAdjacentHTML('afterend', extra); const c = el.querySelector('#mcancel'); if (c) c.onclick = async () => { if (!confirm('Cancel your membership renewal? You keep membership until the end of the period you paid for.')) return; try { await B44.cancelSub(); } catch (e) { toast(e.message); } }; };
  }

  // ---------- Coin packs in the shop ----------
  if (typeof VIEWS !== 'undefined' && VIEWS.rewards) { const orig = VIEWS.rewards.render.bind(VIEWS.rewards);
    VIEWS.rewards.render = function (el, tab) { orig(el, tab); if ((tab || 'quests') !== 'shop') return; const pane = el.querySelector('.apane'); if (!pane) return;
      const packs = [['c500', 500, 0.99], ['c1500', 1500, 2.99], ['c4000', 4000, 6.99], ['c10000', 10000, 14.99]];
      pane.insertAdjacentHTML('afterbegin', `<h3>Get more coins</h3><div class="shop">${packs.map(([k, n, p], i) => `<div class="sitem"><span class="sprev" style="background:#f2b01e;color:#111">${n >= 1000 ? n / 1000 + 'k' : n}</span><b>${n.toLocaleString()} coins</b>${i === 2 ? '<span class="pill hot">Most popular</span>' : ''}<button class="btn sm hot" data-coins="${k}">${money(p)}</button></div>`).join('')}</div><p class="muted small">Coins buy looks only: themes, card backs, frames and titles. They never affect how games play and have no cash value. ${onB44() ? '' : 'Buying coins needs you to be signed in on the website.'}</p>`);
      pane.querySelectorAll('[data-coins]').forEach(b => b.onclick = e => { e.stopPropagation(); if (!onB44()) { toast('Sign in on the website to buy coins.'); if (window.B44) B44.login(); return; } Pay.open('coins', b.dataset.coins); }); };
  }

  // ---------- Start-up ----------
  window.Launch = { async after() {
    Age.apply(); if (window.B44 && B44.afterPay) B44.afterPay().catch(e => console.warn(e));
    const idle = () => !document.querySelector('.start') && !document.querySelector('#modal.open'); await new Promise(r => { let ok = 0; const t = setInterval(() => { ok = idle() ? ok + 1 : 0; if (ok >= 4) { clearInterval(t); r(); } }, 300); });
    if (Age.years() === null) await Age.ask(); Consent.show();
    if (onB44()) { const a = Acct.me || {}; if (!a.email || a.email !== B44.me.email) await Acct.save({ email: B44.me.email, provider: 'base44', created: a.created || Date.now(), lastLogin: Date.now() }); else if (!a.lastLogin || Date.now() - a.lastLogin > 3600e3) await Acct.save({ lastLogin: Date.now() }); }
    if (window.B44 && !onB44()) { /* guests: a gentle nudge once a day to sign in for online play */ if (!LS.get('nudged') || Date.now() - LS.get('nudged') > 864e5) { LS.set('nudged', Date.now()); setTimeout(() => toast('Playing as a guest on this device. Sign in to play people online, chat and keep your progress everywhere.'), 4000); } }
  } };
})();
