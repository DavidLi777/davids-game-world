// Developer "Look" controls: confetti dot density and brightness / contrast / saturation of the theme colours.
// Each setting runs 1–10. 5 is the design as drawn (dots default to 4, fewer than before). Saved site-wide in config.look.
const LOOK_DEF = { all: 5, warm: 5, dots: 4, bright: 5, contrast: 5, sat: 5 };
const LOOK_TOKENS = ['--p1', '--p2', '--p3', '--grad', '--grad-soft', '--glow', '--felt', '--felt2', '--acc', '--acc2', '--gold', '--blue', '--spark1', '--spark2', '--spark3', '--spark4', '--page-bg'];
const Look = {
  preview: null, key: '',
  cur() { let c = {}; try { c = (Store.ready !== false && typeof Config !== 'undefined' ? Config.get().look : null) || {}; } catch (e) {} const v = { ...LOOK_DEF, ...c, ...(this.preview || {}) }; for (const k in LOOK_DEF) v[k] = Math.min(10, Math.max(1, Math.round(+v[k] || LOOK_DEF[k]))); return v; },
  // Colour maths: hex/rgb -> HSL, adjust, back
  hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; },
  rgb(h, s, l) { if (!s) return [l, l, l].map(x => Math.round(x * 255)); const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(x => Math.round(x * 255)); },
  adj(r, g, b, v) { let [h, s, l] = this.hsl(r, g, b); if (v.warm !== 5 && s > .12) h = this.warmHue(h * 360, (v.warm - 5) / 5) / 360; s = Math.min(1, s * (1 + (v.sat - 5) * .14)); l = .5 + (l - .5) * (1 + (v.contrast - 5) * .12); l += (v.bright - 5) * .045; l = Math.min(.97, Math.max(.03, l)); return this.rgb(h, s, l); },
  // Warm/cool balance: moves purples and blues round through pink and red toward orange (warmer), or pinks, reds and
  // oranges back toward violet and blue (cooler). Greens and yellows stay put.
  warmHue(h, w) { if (w > 0) { if (h >= 190) return h + (385 - h) * w * .7 - (h + (385 - h) * w * .7 >= 360 ? 360 : 0); return h; }
    const u = h < 70 ? h + 360 : h; if (u < 250) return h; const n = u - (u - 255) * -w * .7; return n >= 360 ? n - 360 : n; },
  hex(x) { return '#' + x.map(n => n.toString(16).padStart(2, '0')).join(''); },
  mapColors(str, v) {
    return String(str).replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, (m, h) => { if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return this.hex(this.adj(n >> 16, (n >> 8) & 255, n & 255, v)); })
      .replace(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/g, (m, r, g, b) => { const [R, G, B] = this.adj(+r, +g, +b, v); return m.replace(/\d+[ ,]+\d+[ ,]+\d+/, `${R} ${G} ${B}`).replace(/,/g, ' ').replace('rgba(', 'rgb('); }); },
  // A scattered star field: random positions, sizes and brightness on a large tile, so no rows or columns ever line up
  confetti(d) { const cs = getComputedStyle(document.documentElement), col = [1, 2, 3, 4].map(k => (cs.getPropertyValue('--spark' + k) || '#fff').trim() || '#fff'), key = d + col.join();
    if (this._sf && this._sf.key === key) return this._sf.val; let seed = 1234567; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const W = 1600, H = 1100, n = Math.round(d * d * 4 + d * 8); let body = '';
    for (let i = 0; i < n; i++) { const x = (rnd() * W).toFixed(1), y = (rnd() * H).toFixed(1), c = col[Math.floor(rnd() * 4)], op = (.45 + rnd() * .55).toFixed(2), big = rnd();
      if (big > .93) { const r = 3 + rnd() * 3; body += `<path d="M${x} ${(y - r * 1.8).toFixed(1)}L${(+x + r * .45).toFixed(1)} ${(y - r * .45).toFixed(1)}L${(+x + r * 1.8).toFixed(1)} ${y}L${(+x + r * .45).toFixed(1)} ${(+y + r * .45).toFixed(1)}L${x} ${(+y + r * 1.8).toFixed(1)}L${(x - r * .45).toFixed(1)} ${(+y + r * .45).toFixed(1)}L${(x - r * 1.8).toFixed(1)} ${y}L${(x - r * .45).toFixed(1)} ${(y - r * .45).toFixed(1)}Z" fill="${c}" opacity="${op}"/>`; }
      else body += `<circle cx="${x}" cy="${y}" r="${(.7 + Math.pow(rnd(), 2.2) * 2.4).toFixed(2)}" fill="${c}" opacity="${op}"/>`; }
    const val = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`)}") 0 0 / ${W}px ${H}px repeat`; this._sf = { key, val }; return val; },
  tune() {
    let v = this.cur(); const root = document.documentElement, key = JSON.stringify(v) + root.dataset.skin; if (key === this.key) return; this.key = key;
    for (const t of LOOK_TOKENS) root.style.removeProperty(t); root.style.removeProperty('--confetti');
    const a = v.all - 5; v = { ...v, sat: v.sat + a * 1.1, contrast: v.contrast + a * .6, bright: v.bright - a * .45 };
    const neutral = v.bright === 5 && v.contrast === 5 && v.sat === 5 && v.warm === 5;
    let fx = document.getElementById('lookfx'); if (a) { if (!fx) { fx = document.createElement('div'); fx.id = 'lookfx'; fx.setAttribute('aria-hidden', 'true'); document.body.appendChild(fx); } const f = `saturate(${(1 + a * .13).toFixed(2)}) contrast(${(1 + a * .045).toFixed(3)}) brightness(${(1 - a * .018).toFixed(3)})`; fx.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:2147483000;-webkit-backdrop-filter:${f};backdrop-filter:${f}`; } else if (fx) fx.remove();
    if (!neutral) { const cs = getComputedStyle(root); for (const t of LOOK_TOKENS) { const val = cs.getPropertyValue(t).trim(); if (val) root.style.setProperty(t, this.mapColors(val, v)); } }
    const cg = (v.grads || {})[root.dataset.skin] || {};
    for (const [tk, prop] of [['grad', '--grad'], ['page', '--page-bg']]) { const gd = cg[tk]; if (gd && Array.isArray(gd.stops) && gd.stops.length >= 2) { let str = GradEd.css(gd); if (!neutral) str = this.mapColors(str, v); root.style.setProperty(prop, tk === 'page' && root.dataset.skin === '5' ? `radial-gradient(70% 60% at 100% 100%, rgb(252 175 69 / .35), transparent 70%), ${str}` : str); } }
    root.style.setProperty('--confetti', this.confetti(v.dots));
    if (typeof Skin !== 'undefined' && Skin.base) { const sk = root.dataset.skin, base = (typeof SKIN_CATS !== 'undefined' && SKIN_CATS[sk]) || Skin.base; for (const c in base) CAT_COLOR[c] = neutral ? base[c] : this.mapColors(base[c], v); }
  },
  paneHTML() { const v = this.cur(), row = (k, label, lo, hi) => `<label class="fld lookfld"><span>${label} <b data-lv="${k}">${v[k]}</b></span><input type="range" min="1" max="10" step="1" data-look="${k}" value="${v[k]}" aria-label="${label}"><small class="muted">${lo} · ${hi}</small></label>`;
    return `<section class="lookpane"><h2>Look</h2><p class="muted small">Adjust the current design for everyone. 5 is the design as drawn. Changes preview as you drag and save when you let go.</p>
      <div class="lookall">${row('all', 'Overall colour strength (all)', '1 softer, lighter', '10 bolder, deeper, more vivid')}<p class="muted small">One slider for everything: if the site looks washed out, pastel or creamy, move this up. It deepens and enriches every colour on the page, including game art, photos and boards.</p></div><div class="grid2">${row('warm', 'Warm and cool balance', '1 more purple and blue', '10 more pink, red and orange')}${row('dots', 'Background dots', '1 few', '10 many')}${row('bright', 'Brightness', '1 darker', '10 lighter')}${row('contrast', 'Contrast', '1 softer', '10 stronger')}${row('sat', 'Saturation', '1 muted', '10 vivid')}</div>
      <div class="row-btns"><button class="btn sm" type="button" id="lookreset">Reset to default</button><button class="btn sm" type="button" id="lookpick">Change the design option</button></div></section>`; },
  bind(pane) { const sec = pane.querySelector('.lookpane'); if (!sec) return;
    sec.oninput = e => { const t = e.target; if (!t.dataset.look) return; this.preview = { ...(this.preview || {}), [t.dataset.look]: +t.value }; sec.querySelector(`[data-lv="${t.dataset.look}"]`).textContent = t.value; this.tune(); };
    sec.onchange = async e => { const t = e.target; if (!t.dataset.look) return; const look = { ...this.cur() }; await Config.save({ look }); this.preview = null; this.tune(); toast('Look saved for everyone.'); };
    sec.querySelector('#lookreset').onclick = async () => { this.preview = null; await Config.save({ look: { ...LOOK_DEF } }); this.tune(); render(true); toast('Look reset.'); };
    sec.querySelector('#lookpick').onclick = () => Skin.open(); } };
// Run after every design-option change, and keep in step with the saved site config
{ const ap = Skin.apply.bind(Skin); Skin.apply = function (v) { ap(v); Look.key = ''; Look.tune(); }; }
Look.tune(); setInterval(() => { if (!Look.preview) Look.tune(); }, 1500);
// Developer › Site tab gets the Look section at the top
{ const orig = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { orig.call(this, el, tab); if (tab !== 'site' || !(typeof Dev === 'undefined' || Dev.allowed())) return; const pane = el.querySelector('.apane'); if (!pane || pane.querySelector('.lookpane')) return; pane.insertAdjacentHTML('afterbegin', Look.paneHTML()); Look.bind(pane); }; }
