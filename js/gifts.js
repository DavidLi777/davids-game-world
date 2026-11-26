// Gift cards. The developer can send any tier as a monthly, annual or lifetime gift at no charge; players buy a monthly or
// annual gift for a friend (they pay first, then get the link). A gift link opens a 16:9 envelope: tap it, the flap
// opens, the card slides out and comes to the front over the envelope, with confetti. Links never expire; each one can
// be claimed once, by the first account that opens it and presses Claim.
COLLS.giftcards = {};
const GIFT_TIERS = [['member', 'Member', 'Unlimited games, no daily limit, member badge and perks'], ['family', 'Family', 'Everything in Member for the giver’s friend and up to 5 people they choose']];
const GIFT_DURS = [['month', 'Monthly membership', '1 month'], ['year', 'Annual membership', '12 months'], ['life', 'Lifetime ownership', 'Never expires']];
const GIFT_DESIGNS = ['Midnight Gold', 'Rose Champagne', 'Royal Velvet', 'Emerald Estate', 'Onyx Marble', 'Ivory Pearl', 'Sapphire Deco', 'Sunset Party', 'Blush Garden', 'Platinum Frost'];
const GIFT_FONTS = ['Great Vibes', 'Dancing Script', 'Parisienne', 'Allura', 'Pinyon Script', 'Alex Brush', 'Sacramento', 'Tangerine', 'Italianno', 'Rouge Script', 'Petit Formal Script', 'Mrs Saint Delafield', 'Herr Von Muellerhoff', 'Monsieur La Doulaise', 'Satisfy', 'Pacifico', 'Kaushan Script', 'Cookie', 'Yellowtail', 'Courgette', 'Lobster', 'Homemade Apple', 'Caveat', 'Indie Flower', 'Amatic SC',
  'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Cinzel Decorative', 'EB Garamond', 'Libre Baskerville', 'Lora', 'Merriweather', 'Crimson Text', 'Bodoni Moda', 'Abril Fatface', 'DM Serif Display', 'Marcellus', 'Italiana', 'Prata', 'Old Standard TT', 'Spectral', 'Forum', 'Yeseva One',
  'Montserrat', 'Poppins', 'Raleway', 'Josefin Sans', 'Quicksand', 'Nunito', 'Lato', 'Open Sans', 'Roboto', 'Inter', 'Work Sans', 'Outfit', 'Comfortaa', 'Lilita One', 'Rubik'];
const GIFT_SYS_FONTS = ['Georgia', 'Times New Roman', 'Garamond', 'Palatino', 'Baskerville', 'Didot', 'Arial', 'Helvetica', 'Verdana', 'Trebuchet MS', 'Brush Script MT', 'Snell Roundhand'];
const GIFT_COLORS = ['#1a1033', '#2a1d10', '#3b0d63', '#7c3aed', '#c026d3', '#db2777', '#e11d48', '#c2410c', '#a07a2c', '#0b6b52', '#14448f', '#475569'];
const Gift = {
  fontsLoaded: false,
  loadFonts() { if (this.fontsLoaded) return; this.fontsLoaded = true; const fam = GIFT_FONTS.map(f => 'family=' + f.replace(/ /g, '+')).join('&'); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + fam + '&display=swap'; document.head.appendChild(l); },
  code() { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); },
  link(code) { return Config.url().replace(/#.*$/, '') + '#gift-' + code; },
  pkgName(g) { const t = GIFT_TIERS.find(x => x[0] === g.tier) || GIFT_TIERS[0]; return g.dur === 'life' ? `${t[1]} · Lifetime ownership` : `${t[1]} · ${g.dur === 'year' ? 'Annual membership' : 'Monthly membership'}`; },
  price(tier, dur) { const p = Config.get().prices || {}; if (tier === 'family') return dur === 'year' ? (+p.familyYear || 99.99) : (+p.family || 12.99); return dur === 'year' ? (+p.yearly || 59.99) : (+p.monthly || 7.99); },
  key(tier, dur) { return `gc_${tier}_${dur}`; },
  days(dur) { return dur === 'life' ? 0 : dur === 'year' ? 366 : 31; },
  // Rich text from the letter editor: keep only simple formatting, never scripts, links or images
  clean(html) { const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html'), OK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN', 'FONT', 'UL', 'OL', 'LI', 'H2', 'H3', 'BLOCKQUOTE']);
    const STY = /^(font-family|color|font-size|text-align|font-weight|font-style|text-decoration|text-decoration-line)$/;
    const walk = n => { [...n.childNodes].forEach(c => { if (c.nodeType === 3) return; if (c.nodeType !== 1 || !OK.has(c.tagName)) { if (c.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|IMG|SVG|A|LINK|META)$/.test(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); } else c.remove(); return; }
      for (const at of [...c.attributes]) { const k = at.name.toLowerCase(); if (k === 'style') { const keep = at.value.split(';').map(s => s.trim()).filter(s => { const [p, ...v] = s.split(':'); return STY.test((p || '').trim()) && !/url\(|expression|javascript/i.test(v.join(':')); }).join(';'); keep ? c.setAttribute('style', keep) : c.removeAttribute('style'); }
        else if (!(c.tagName === 'FONT' && /^(face|color|size)$/.test(k))) c.removeAttribute(at.name); }
      walk(c); }); };
    walk(doc.body.firstChild); return doc.body.firstChild.innerHTML.slice(0, 60000); },
  stageHTML(g, opts = {}) { const d = Math.max(0, Math.min(9, +g.design || 0)); return `<div class="gfstage gfd${d} ${opts.lite ? 'lite' : ''}" data-gfstage="1" role="button" tabindex="0" aria-label="${opts.mini ? esc(GIFT_DESIGNS[d]) : 'Gift envelope. Press to open.'}">
      <div class="gfenv"><div class="gfback"></div><div class="gffront"></div><div class="gfflap"></div><div class="gfedge"></div><div class="gfseal">D</div>${g.to ? `<div class="gfto">For ${esc(g.to)}</div>` : '<div class="gfto">A gift for you</div>'}</div>
      <div class="gfcard"><div class="gfin"><div class="gfhead"><div class="gftitle">A Gift for You</div><div class="gfpkg">David’s Game World<b>${esc(this.pkgName(g))}</b></div></div>
        <div class="gfmsg">${g.html || ''}</div>${g.from ? `<div class="gffrom">With love, ${esc(g.from)}</div>` : ''}</div><div class="gfmono">D</div></div>
      ${opts.mini ? '' : '<div class="gfhint">Tap the envelope to open</div>'}</div>`; },
  play(stage, onDone) { if (!stage || stage.classList.contains('s1')) return; stage.classList.add('s1'); setTimeout(() => stage.classList.add('s2'), 750); setTimeout(() => { stage.classList.add('s3'); this.confetti(stage); }, 1550); setTimeout(() => onDone && onDone(), 2500); },
  reset(stage) { stage.classList.remove('s1', 's2', 's3'); },
  confetti(host) { const c = document.createElement('canvas'); c.className = 'gfconf'; host.appendChild(c); const W = c.width = host.clientWidth * 2, H = c.height = host.clientHeight * 2, x = c.getContext('2d');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(() => c.remove(), 50); return; }
    const cols = ['#f6e27a', '#d9b45a', '#ffffff', '#ec4899', '#a855f7', '#f97316', '#fcaf45', '#22d3ee'], P = Array.from({ length: 220 }, (_, i) => { const side = i % 2, a = (side ? -1 : 1) * (Math.PI / 2.6 + Math.random() * .5); return { x: side ? W * .02 : W * .98, y: H * .85, vx: Math.sin(a) * (14 + Math.random() * 16) * (side ? -1 : 1) * -1, vy: -(22 + Math.random() * 18), s: 6 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], sh: i % 3 }; });
    P.forEach((p, i) => { if (i % 2) p.vx = Math.abs(p.vx); else p.vx = -Math.abs(p.vx); });
    const t0 = performance.now(); const tick = t => { x.clearRect(0, 0, W, H); for (const p of P) { p.vy += .55; p.vx *= .99; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; if (p.sh === 0) x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); else if (p.sh === 1) { x.beginPath(); x.arc(0, 0, p.s / 3, 0, 7); x.fill(); } else { x.beginPath(); x.moveTo(0, -p.s / 2); x.lineTo(p.s / 2, p.s / 2); x.lineTo(-p.s / 2, p.s / 2); x.fill(); } x.restore(); }
      if (t - t0 < 4200) requestAnimationFrame(tick); else c.remove(); }; requestAnimationFrame(tick); },
  // Gifts this browser may use: on the full website the server decides; on the preview, a gift is real when the owner made it
  // (or confirmed its payment) and the first claim wins.
  valid(code) { const g = Store.get('giftcards', code); if (!g || g.status === 'draft') return null; if (window.B44) return g; return (Config.get().giftsOk || {})[code] ? g : null; },
  claimant(code) { let best = null; for (const p of Store.all('profiles')) for (const c of arr(p.giftClaims)) if (c.code === code && (!best || c.ts < best.ts)) best = { uid: p.id, ts: c.ts }; const g = Store.get('giftcards', code); if (g && g.claimedBy) return { uid: g.claimedBy, ts: g.claimedAt || 0 }; return best; },
  memberFromClaims(uid) { const p = Store.get('profiles', uid); for (const c of arr(p && p.giftClaims)) { const g = this.valid(c.code), w = g && this.claimant(c.code); if (!g || !w || w.uid !== uid) continue; if (g.dur === 'life') return { plan: g.tier, until: null }; const until = w.ts + this.days(g.dur) * 864e5; if (until > now()) return { plan: g.tier, until }; } return null; },
  async claim(code) { const g = Store.get('giftcards', code); if (!g) return toast('This gift link isn’t valid.');
    if (!Auth.signedIn()) { LS.set('pendingGift', code); toast('Please sign in or create a free account first. Your gift is claimed as soon as you do.'); return window.B44 ? B44.login() : authModal('up'); }
    if (window.B44) { try { const r = await B44.call('/api/gy/gift-redeem', { code }); toast(r.message || 'Your gift is active. Enjoy!'); render(true); } catch (e) { toast(e.message); } return; }
    if (!this.valid(code)) return toast('This gift isn’t ready yet. Ask the sender to finish paying for it.'); const w = this.claimant(code); if (w && w.uid !== Store.uid) return toast('This gift has already been claimed by another account.');
    await saveMe({ giftClaims: arr(me().giftClaims).filter(c => c.code !== code).concat({ code, ts: now() }) }); LS.set('pendingGift', ''); toast(`Your gift is active: ${this.pkgName(g)}. Enjoy!`); render(true); },
  shareRow(code) { const u = this.link(code), t = 'You have a gift waiting on David’s Game World! Open your envelope:', TU = encodeURIComponent(t + ' ' + u), U = encodeURIComponent(u);
    return `<div class="gflink"><input readonly value="${esc(u)}" aria-label="Gift link" onclick="this.select()"><button class="btn hot" data-gfcopy="${esc(u)}">Copy link</button>${navigator.share ? `<button class="btn" data-gfshare="${esc(u)}">Share…</button>` : ''}</div>
      <div class="row-btns small"><a class="btn sm" target="_blank" rel="noopener" href="mailto:?subject=${encodeURIComponent('A gift for you')}&body=${TU}">Email</a><a class="btn sm" target="_blank" rel="noopener" href="sms:?&body=${TU}">Text message</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${TU}">WhatsApp</a><a class="btn sm" target="_blank" rel="noopener" href="https://t.me/share/url?url=${U}&text=${encodeURIComponent(t)}">Telegram</a><a class="btn sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${U}">Facebook</a><a class="btn sm" href="#gift-${esc(code)}">Open it yourself</a></div>`; } };

// Copy / share buttons anywhere on the page
document.addEventListener('click', async e => { const c = e.target.closest && e.target.closest('[data-gfcopy],[data-gfshare]'); if (!c) return; if (c.dataset.gfcopy) { try { await navigator.clipboard.writeText(c.dataset.gfcopy); toast('Gift link copied.'); } catch (er) { toast('Copy was blocked. Select the link and copy it.'); } } else { try { await navigator.share({ title: 'A gift for you', text: 'You have a gift waiting on David’s Game World!', url: c.dataset.gfshare }); } catch (er) {} } });

// isMember also counts claimed gifts (on the full website gifts also write a real membership record on the server)
{ const im = isMember; isMember = id => im(id) || !!Gift.memberFromClaims(id || Store.uid); }

// ---------- The gift page a friend opens ----------
VIEWS.gift = { live: false, render(el, code) { Gift.loadFonts(); const g = Store.get('giftcards', code || '');
    if (!g || g.status === 'draft') { el.innerHTML = `<section class="band"><h1>Gift</h1><div class="empty">${g ? 'This gift is waiting for its payment to finish. Please check back soon.' : 'We couldn’t find this gift. Check that the whole link was copied.'}</div></section>`; return; }
    const w = Gift.claimant(code), mine = w && w.uid === Store.uid, taken = w && !mine;
    el.innerHTML = `<section class="band"><div class="gfwrap">${Gift.stageHTML(g)}<div class="gfclaim">${mine ? `<p class="okbox">This gift is yours: <b>${esc(Gift.pkgName(g))}</b> is active on your account.</p><a class="btn hot" href="#home">Start playing</a>` : taken ? '<p class="muted">This gift has already been claimed.</p>' : `<p>Open your envelope, then claim your gift. It’s free: no card needed.</p><button class="btn hot big" id="gfclaim">Claim my gift: ${esc(Gift.pkgName(g))}</button><p class="muted small">You’ll need a free David’s Game World account so the membership can be added to it.</p>`}</div></div></section>`;
    const st = el.querySelector('[data-gfstage]'), go = () => Gift.play(st); st.onclick = go; st.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    const b = el.querySelector('#gfclaim'); if (b) b.onclick = () => Gift.claim(code); },
  update(el, code) { const g = Store.get('giftcards', code || ''); const has = !!el.querySelector('[data-gfstage]'); if (!has && g && g.status !== 'draft') this.render(el, code); } };

// ---------- Making a gift (players buy; the developer sends free, with lifetime too) ----------
const GiftMake = { st: null,
  fresh() { return { tier: 'member', dur: 'month', design: 7, to: '', from: (me() && me().name) || '', html: '' }; } };
VIEWS.giftmake = { live: false, render(el) { Gift.loadFonts(); const dev = Dev.allowed(), s = GiftMake.st = GiftMake.st || GiftMake.fresh(); if (!dev && s.dur === 'life') s.dur = 'month';
    const sent = Store.all('giftcards').filter(g => g.by === Store.uid && g.status !== 'draft').sort((a, b) => b.ts - a.ts);
    const opt = (grp, [k, n, d], on) => `<button type="button" class="gfopt ${on ? 'on' : ''}" data-${grp}="${k}"><b>${esc(n)}</b><small>${esc(d)}</small></button>`;
    const fontOpts = `<optgroup label="Script and calligraphy">${GIFT_FONTS.slice(0, 25).map(f => `<option style="font-family:'${f}'">${f}</option>`).join('')}</optgroup><optgroup label="Elegant serif">${GIFT_FONTS.slice(25, 44).map(f => `<option style="font-family:'${f}'">${f}</option>`).join('')}</optgroup><optgroup label="Clean sans">${GIFT_FONTS.slice(44).map(f => `<option style="font-family:'${f}'">${f}</option>`).join('')}</optgroup><optgroup label="Classic">${GIFT_SYS_FONTS.map(f => `<option style="font-family:'${f}'">${f}</option>`).join('')}</optgroup>`;
    el.innerHTML = `<section class="band"><h1>${dev ? 'Send a gift (developer)' : 'Gift a membership'}</h1><p class="muted">${dev ? 'As the developer you can send any tier for free, including lifetime ownership. No card is needed for you or your friend.' : 'Buy a membership for a friend. Pay once, then send them a gift link: they open an envelope with your letter inside.'} Gift links never expire until they’re claimed.</p>
      <div class="gfwrap"><div><h3>1. Choose the tier</h3><div class="gfopts">${GIFT_TIERS.map(t => opt('gtier', t, s.tier === t[0])).join('')}</div></div>
      <div><h3>2. Choose the length</h3><div class="gfopts">${GIFT_DURS.filter(d => dev || d[0] !== 'life').map(d => opt('gdur', [d[0], d[1], dev ? d[2] : `${d[2]} · ${money(Gift.price(s.tier, d[0]))}`], s.dur === d[0])).join('')}</div></div>
      <div><h3>3. Choose a design</h3><div class="gfdesigns">${GIFT_DESIGNS.map((n, i) => `<button type="button" class="${+s.design === i ? 'on' : ''}" data-gdesign="${i}">${Gift.stageHTML({ ...s, design: i, html: '' }, { mini: true })}<small>${esc(n)}</small></button>`).join('')}</div></div>
      <div class="grid2"><label class="fld">To<input id="gfto" maxlength="60" value="${esc(s.to)}" placeholder="Your friend’s name"></label><label class="fld">From<input id="gffrom" maxlength="60" value="${esc(s.from)}" placeholder="Your name"></label></div>
      <div><h3>4. Write your letter</h3><div class="gftools gfd${s.design}" role="toolbar" aria-label="Letter formatting"><select id="gffont" aria-label="Font">${fontOpts}</select><select id="gfsize" aria-label="Text size"><option value="2">Small</option><option value="3" selected>Normal</option><option value="4">Large</option><option value="5">Larger</option><option value="6">Huge</option><option value="7">Grand</option></select>
        <button type="button" class="btn" data-cmd="bold" aria-label="Bold"><b>B</b></button><button type="button" class="btn" data-cmd="italic" aria-label="Italic"><i>I</i></button><button type="button" class="btn" data-cmd="underline" aria-label="Underline"><u>U</u></button>
        <button type="button" class="btn" data-cmd="justifyLeft" aria-label="Align left">⟸</button><button type="button" class="btn" data-cmd="justifyCenter" aria-label="Center">≡</button><button type="button" class="btn" data-cmd="justifyRight" aria-label="Align right">⟹</button>
        ${GIFT_COLORS.map(c => `<button type="button" class="gfsw" style="background:${c}" data-color="${c}" aria-label="Text colour ${c}"></button>`).join('')}<input type="color" id="gfcolor" value="#7c3aed" aria-label="Any text colour"><button type="button" class="btn sm" data-cmd="removeFormat">Clear formatting</button></div>
        <div class="gfeditor gfd${s.design}" id="gfed" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Your letter" data-ph="Dear friend, …">${s.html}</div></div>
      <div class="row-btns"><button class="btn" id="gfprev">Preview the envelope</button>${dev ? '<button class="btn hot big" id="gfmake">Create gift link (free)</button>' : `<button class="btn hot big" id="gfbuy">Pay ${money(Gift.price(s.tier, s.dur))} and get the gift link</button>`}</div>
      <div id="gfout"></div>
      ${sent.length ? `<div><h3>Gifts you’ve sent</h3><div class="gflist">${sent.map(g => { const w = Gift.claimant(g.id); return `<div class="gfitem"><span><b>${esc(g.to || 'Gift')}</b> · ${esc(Gift.pkgName(g))}<br><small class="muted">${D(g.ts)} · ${w ? 'claimed by ' + esc(Names.of(w.uid)) : 'waiting to be opened'}</small></span><span class="row-btns"><button class="btn sm" data-gfcopy="${esc(Gift.link(g.id))}">Copy link</button><a class="btn sm" href="#gift-${esc(g.id)}">Open</a></span></div>`; }).join('')}</div></div>` : ''}</div></section>`;
    const ed = el.querySelector('#gfed'), save = () => { s.html = ed.innerHTML; s.to = el.querySelector('#gfto').value.trim(); s.from = el.querySelector('#gffrom').value.trim(); };
    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
    let range = null; const keep = () => { const sel = getSelection(); if (sel.rangeCount && ed.contains(sel.anchorNode)) range = sel.getRangeAt(0).cloneRange(); }, back = () => { ed.focus(); if (range) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); } };
    ed.addEventListener('keyup', keep); ed.addEventListener('mouseup', keep); ed.addEventListener('input', () => { keep(); s.html = ed.innerHTML; });
    el.querySelector('.gftools').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    el.onclick = async e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.gtier || b.dataset.gdur || b.dataset.gdesign) { save(); if (b.dataset.gtier) s.tier = b.dataset.gtier; if (b.dataset.gdur) s.dur = b.dataset.gdur; if (b.dataset.gdesign) s.design = +b.dataset.gdesign; this.render(el); return; }
      if (b.dataset.cmd) { back(); document.execCommand(b.dataset.cmd, false, null); keep(); s.html = ed.innerHTML; return; }
      if (b.dataset.color) { back(); document.execCommand('foreColor', false, b.dataset.color); keep(); s.html = ed.innerHTML; return; }
      if (b.id === 'gfprev') { save(); const box = modal(`<h2>Preview</h2>${Gift.stageHTML({ ...s, html: Gift.clean(s.html) })}<p class="muted small center">Tap the envelope. Press it again after it opens to replay.</p>`, 'wide'); const st = box.querySelector('[data-gfstage]'); st.onclick = () => st.classList.contains('s3') ? Gift.reset(st) : Gift.play(st); return; }
      if (b.id === 'gfmake' || b.id === 'gfbuy') { save(); if (!Gift.clean(s.html).replace(/<[^>]+>/g, '').trim()) return toast('Write a short letter first.'); b.disabled = true;
        const code = Gift.code(), rec = { id: code, code, by: Store.uid, to: s.to, from: s.from, tier: s.tier, dur: dev ? s.dur : (s.dur === 'life' ? 'month' : s.dur), design: s.design, html: Gift.clean(s.html), ts: now(), status: b.id === 'gfmake' ? 'ready' : 'draft', dev: b.id === 'gfmake' };
        try {
          if (b.id === 'gfmake') { if (window.B44) { await B44.call('/api/gy/gift-create', { code, tier: rec.tier, dur: rec.dur }); } else { await Config.save({ giftsOk: { [code]: { by: 'dev', ts: now() } } }); } await Store.put('giftcards', code, rec); GiftMake.st = null; this.render(el); el.querySelector('#gfout').innerHTML = `<div class="okbox"><h3>Your gift link is ready</h3>${Gift.shareRow(code)}</div>`; el.querySelector('#gfout').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          else await GiftBuy.start(rec);
        } catch (er) { toast(er.message || 'That didn’t work. Please try again.'); b.disabled = false; } } };
    el.oninput = e => { if (e.target.id === 'gfto' || e.target.id === 'gffrom') save(); };
    el.onchange = e => { const t = e.target; if (t.id === 'gffont') { back(); document.execCommand('fontName', false, t.value); keep(); s.html = ed.innerHTML; } if (t.id === 'gfsize') { back(); document.execCommand('fontSize', false, t.value); keep(); s.html = ed.innerHTML; } if (t.id === 'gfcolor') { back(); document.execCommand('foreColor', false, t.value); keep(); s.html = ed.innerHTML; } }; } };

// Paying for a gift: on the full website through the secure checkout; on the preview the order waits for the developer
const GiftBuy = {
  async start(rec) { const ctx = Pay.ctx(); if (ctx !== 'web') { toast('Gift memberships can be bought on our website.'); throw new Error('Gift memberships can be bought on our website.'); }
    if (!Auth.signedIn() && !window.B44) { toast('Please sign in first, so your gift is linked to your account.'); authModal('in'); throw new Error('Please sign in first.'); }
    await Store.put('giftcards', rec.id, rec);
    if (window.B44) { const r = await B44.call('/api/gy/checkout', { kind: 'giftcard', key: Gift.key(rec.tier, rec.dur), gift: rec.id }); location.href = r.url; return; }
    const amount = Gift.price(rec.tier, rec.dur), link = (Config.get().stripe || {})[Gift.key(rec.tier, rec.dur)];
    await Pay.order({ kind: 'giftcard', item: Gift.key(rec.tier, rec.dur), amount, gift: rec.id, title: 'Gift: ' + Gift.pkgName(rec) });
    modal(`<h2>Checkout</h2><div class="osum"><div><b>Gift: ${esc(Gift.pkgName(rec))}</b><small>One payment. Your gift link appears here as soon as the payment is confirmed.</small></div><b class="oamt">${money(amount)}</b></div>
      ${link ? `<a class="btn hot wide" href="${esc(link)}" target="_blank" rel="noopener">Continue to secure checkout</a>` : '<p class="okbox">Checkout opens when payments are switched on. Your gift is saved and will be ready once it’s paid.</p>'}`); } };
// When the developer confirms a gift order on the preview, the gift becomes valid
{ const conf = Pay.confirm.bind(Pay); Pay.confirm = async function (uid, oid) { const r = await conf(uid, oid); const a = uid === Store.uid ? Acct.me : Acct.all.get(uid); const o = a && arr(a.orders).find(x => x.id === oid);
    if (o && o.kind === 'giftcard' && o.gift) { await Config.save({ giftsOk: { [o.gift]: { by: uid, order: oid, ts: now() } } }); await Store.patch('giftcards', o.gift, { status: 'ready' }); } return r; }; }

// Back from checkout on the full website: show the link
if (window.B44) { const ap = B44.afterPay; B44.afterPay = async () => { const q = new URLSearchParams(location.search), sid = q.get('session_id') || q.get('checkout_id'); if (sid && q.get('gy_gift')) { history.replaceState(null, '', location.pathname + location.hash); try { const r = await B44.call('/api/gy/confirm', { checkout_id: sid }); if (r.code) { location.hash = 'giftlink-' + r.code; toast('Payment received. Your gift link is ready!'); } } catch (e) { toast(e.message); } return; } return ap(); }; }
VIEWS.giftlink = { render(el, code) { const g = Store.get('giftcards', code || ''); el.innerHTML = `<section class="band"><h1>Your gift link</h1>${g && g.status !== 'draft' ? `<p>Send this link to ${esc(g.to || 'your friend')}. It never expires until it’s claimed.</p>${Gift.stageHTML(g)}<div style="margin-top:16px">${Gift.shareRow(code)}</div>` : '<div class="empty">Your payment is being confirmed. The link appears here in a moment.</div>'}</section>`; const st = el.querySelector('[data-gfstage]'); if (st) st.onclick = () => st.classList.contains('s3') ? Gift.reset(st) : Gift.play(st); } };

// After signing in, finish a claim that was waiting
setInterval(() => { const c = LS.get('pendingGift', ''); if (c && Auth.signedIn() && Store.ready) { LS.set('pendingGift', ''); Gift.claim(c); } }, 3000);

// Entry points: membership page button, account menu, developer tab
{ const prev = VIEWS.membership && VIEWS.membership.render; if (prev) VIEWS.membership.render = function (el) { prev.call(this, el); const bg = el.querySelector('#bgift'); if (bg) { bg.textContent = 'Gift a membership'; bg.onclick = () => { location.hash = 'giftmake'; }; } }; }
DEV_TABS.push(['gifts', 'Gift links']);
{ const orig = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { orig.call(this, el, tab); if (tab !== 'gifts' || !Dev.allowed()) return; const pane = el.querySelector('.apane'); if (!pane) return; const all = Store.all('giftcards').filter(g => g.status !== 'draft').sort((a, b) => b.ts - a.ts);
    pane.innerHTML = `<h2>Gift links</h2><p>Send any tier as a monthly, annual or lifetime gift, free. You write the letter, pick one of 10 designs, and send the link. Your friend opens the envelope and claims it with a free account.</p><p><a class="btn hot" href="#giftmake">Create a gift link</a></p>
      <h3>All gifts <small>${all.length}</small></h3><div class="scroll"><table class="lb"><thead><tr><th>Made</th><th>From</th><th>To</th><th>Package</th><th>Paid by</th><th>Status</th><th></th></tr></thead><tbody>${all.map(g => { const w = Gift.claimant(g.id); return `<tr><td>${D(g.ts)}</td><td>${esc(g.from || Names.of(g.by))}</td><td>${esc(g.to || '–')}</td><td>${esc(Gift.pkgName(g))}</td><td>${g.dev ? 'Developer (free)' : esc(Names.of(g.by))}</td><td>${w ? 'Claimed by ' + esc(Names.of(w.uid)) + ' · ' + D(w.ts) : 'Not claimed yet'}</td><td><button class="btn sm" data-gfcopy="${esc(Gift.link(g.id))}">Copy link</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">No gifts yet.</td></tr>'}</tbody></table></div>`; }; }
