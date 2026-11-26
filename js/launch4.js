// Launch pack 4: the gradient editor for the developer (add, remove, move and recolour points on the colour strip, for
// each design option), and a setting for when to show the "people online" count.

// ---------- Gradient editor ----------
const GRAD_DEFAULTS = {
  2: { grad: { angle: 120, stops: [['#7c3aed', 0], ['#a855f7', 45], ['#ec4899', 100]] } },
  3: { grad: { angle: 120, stops: [['#7c3aed', 0], ['#ec4899', 52], ['#f97316', 100]] } },
  4: { grad: { angle: 120, stops: [['#06b6d4', 0], ['#8b5cf6', 38], ['#d946ef', 72], ['#fb7185', 100]] } },
  5: { grad: { angle: 45, stops: [['#fcaf45', 0], ['#f77737', 22], ['#e1306c', 50], ['#c13584', 70], ['#833ab4', 100]] },
       page: { angle: 150, stops: [['#5b2a9e', 0], ['#833ab4', 28], ['#c13584', 62], ['#e1306c', 85], ['#f56040', 100]] } } };
const GradEd = {
  target: 'grad', sel: 0, work: null,
  css(g) { const st = g.stops.slice().sort((a, b) => a[1] - b[1]); return `linear-gradient(${+g.angle || 0}deg, ${st.map(([c, p]) => `${c} ${Math.round(p * 10) / 10}%`).join(', ')})`; },
  skin() { return document.documentElement.dataset.skin || '2'; },
  saved(skin, t) { const g = (((Config.get().look || {}).grads || {})[skin] || {})[t]; return g && Array.isArray(g.stops) && g.stops.length >= 2 ? g : null; },
  current(skin, t) { const g = this.saved(skin, t) || (GRAD_DEFAULTS[skin] || {})[t]; return g ? JSON.parse(JSON.stringify(g)) : null; },
  rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; },
  hex(a) { return '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); },
  colorAt(g, p) { const st = g.stops.slice().sort((a, b) => a[1] - b[1]); if (p <= st[0][1]) return st[0][0]; if (p >= st[st.length - 1][1]) return st[st.length - 1][0];
    for (let i = 0; i < st.length - 1; i++) { const [c1, p1] = st[i], [c2, p2] = st[i + 1]; if (p >= p1 && p <= p2) { const t = (p - p1) / Math.max(.001, p2 - p1), A = this.rgb(c1), B = this.rgb(c2); return this.hex(A.map((v, k) => v + (B[k] - v) * t)); } } return st[0][0]; },
  preview() { const skin = this.skin(), all = JSON.parse(JSON.stringify(((Config.get().look || {}).grads) || {})); all[skin] = { ...(all[skin] || {}), [this.target]: this.work }; Look.preview = { ...(Look.preview || {}), grads: all }; Look.key = ''; Look.tune(); },
  html() { const skin = this.skin(), targets = [['grad', 'Main gradient (buttons, headings, highlights)']].concat(skin === '5' ? [['page', 'Page background']] : []);
    if (!GRAD_DEFAULTS[skin]) return `<section class="gradpane"><h2>Colour strip</h2><p class="muted">Option 1 (Classic Felt) has no colour gradient. Switch to option 2, 3, 4 or 5 to edit its colour strip.</p><button class="btn sm" type="button" id="gpick">Change the design option</button></section>`;
    if (!targets.some(t => t[0] === this.target)) this.target = 'grad'; if (!this.work) this.work = this.current(skin, this.target); const g = this.work; this.sel = Math.min(this.sel, g.stops.length - 1); const s = g.stops[this.sel];
    return `<section class="gradpane"><h2>Colour strip <small>Option ${skin}</small></h2><p class="muted small">This is the colour gradient the design uses right now. Click the strip to add a colour point, drag a point to move it (closer points blend faster, farther points give that colour more room), and pick a point to change its colour or remove it. Changes preview live; press Save to apply them for everyone.</p>
      ${targets.length > 1 ? `<div class="gfopts">${targets.map(([k, n]) => `<button type="button" class="chip ${this.target === k ? 'on' : ''}" data-gt="${k}">${esc(n)}</button>`).join('')}</div>` : ''}
      <div class="gstrip" id="gstrip" style="background:${this.css({ ...g, angle: 90 })}" role="group" aria-label="Colour strip">${g.stops.map(([c, p], i) => `<button type="button" class="gstop ${i === this.sel ? 'on' : ''}" data-gs="${i}" style="left:${p}%;--sc:${c}" aria-label="Colour point ${i + 1} at ${Math.round(p)}%"></button>`).join('')}</div>
      <div class="gscale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
      <div class="gedit"><label class="fld inline">Colour <input type="color" id="gcol" value="${s[0]}"></label><label class="fld inline">Position <input type="number" id="gpos" min="0" max="100" step="1" value="${Math.round(s[1])}">%</label><button class="btn sm" type="button" id="gdel" ${g.stops.length <= 2 ? 'disabled' : ''}>Remove this point</button><button class="btn sm" type="button" id="gadd">Add a point</button></div>
      <label class="fld lookfld"><span>Direction <b id="gangv">${g.angle}°</b></span><input type="range" id="gang" min="0" max="360" step="5" value="${g.angle}"></label>
      <div class="gpreview" style="background:${this.css(g)}"><span>Preview</span></div>
      <p class="small">Points: ${g.stops.slice().sort((a, b) => a[1] - b[1]).map(([c, p]) => `<code>${c} ${Math.round(p)}%</code>`).join(' · ')}</p>
      <div class="row-btns"><button class="btn hot" type="button" id="gsave">Save for everyone</button><button class="btn" type="button" id="geven">Space points evenly</button><button class="btn" type="button" id="grev">Reverse</button><button class="btn" type="button" id="gundo">Undo changes</button><button class="btn" type="button" id="greset">Reset to the original design</button></div></section>`; },
  mount(pane) { const host = pane.querySelector('.lookpane'); if (!host) return; let box = pane.querySelector('.gradpane'); const fresh = () => { const h = this.html(); if (box) box.outerHTML = h; else host.insertAdjacentHTML('afterend', h); box = pane.querySelector('.gradpane'); wire(); };
    const wire = () => { const g = this.work, strip = box.querySelector('#gstrip');
      box.onclick = async e => { const b = e.target.closest('button'); if (!b) return;
        if (b.id === 'gpick') return Skin.open();
        if (b.dataset.gt) { this.target = b.dataset.gt; this.work = null; this.sel = 0; Look.preview = null; Look.key = ''; Look.tune(); return fresh(); }
        if (b.dataset.gs != null) { this.sel = +b.dataset.gs; return fresh(); }
        if (b.id === 'gdel' && g.stops.length > 2) { g.stops.splice(this.sel, 1); this.sel = Math.max(0, this.sel - 1); }
        if (b.id === 'gadd') { const st = g.stops.slice().sort((a, c) => a[1] - c[1]); let gap = 0, at = 50; for (let i = 0; i < st.length - 1; i++) if (st[i + 1][1] - st[i][1] > gap) { gap = st[i + 1][1] - st[i][1]; at = (st[i][1] + st[i + 1][1]) / 2; } g.stops.push([this.colorAt(g, at), at]); this.sel = g.stops.length - 1; }
        if (b.id === 'geven') { g.stops.sort((a, c) => a[1] - c[1]); g.stops.forEach((s, i) => s[1] = Math.round(i / (g.stops.length - 1) * 100)); }
        if (b.id === 'grev') g.stops.forEach(s => s[1] = 100 - s[1]);
        if (b.id === 'gundo') { this.work = this.current(this.skin(), this.target); this.sel = 0; }
        if (b.id === 'greset') { const skin = this.skin(); await Config.save({ look: { grads: { [skin]: { [this.target]: null } } } }); Look.preview = null; this.work = null; Look.key = ''; Look.tune(); toast('Back to the original colours for this design.'); return fresh(); }
        if (b.id === 'gsave') { const skin = this.skin(); await Config.save({ look: { grads: { [skin]: { [this.target]: this.work } } } }); Look.preview = null; Look.key = ''; Look.tune(); toast('Colour strip saved for everyone.'); return fresh(); }
        this.preview(); fresh(); };
      box.oninput = e => { const t = e.target, s = g.stops[this.sel]; if (t.id === 'gcol') s[0] = t.value; if (t.id === 'gpos') s[1] = Math.max(0, Math.min(100, +t.value || 0)); if (t.id === 'gang') { g.angle = +t.value; box.querySelector('#gangv').textContent = g.angle + '°'; }
        strip.style.background = this.css({ ...g, angle: 90 }); box.querySelector('.gpreview').style.background = this.css(g); const h = strip.querySelector(`[data-gs="${this.sel}"]`); if (h) { h.style.left = s[1] + '%'; h.style.setProperty('--sc', s[0]); } this.preview(); };
      box.onchange = e => { if (['gcol', 'gpos', 'gang'].includes(e.target.id)) fresh(); };
      // Drag points; click the strip to add one
      strip.onpointerdown = e => { const r = strip.getBoundingClientRect(), pos = x => Math.max(0, Math.min(100, (x - r.left) / r.width * 100)); const h = e.target.closest('[data-gs]');
        if (!h) { const p = pos(e.clientX); g.stops.push([this.colorAt(g, p), Math.round(p)]); this.sel = g.stops.length - 1; this.preview(); return fresh(); }
        e.preventDefault(); this.sel = +h.dataset.gs; strip.querySelectorAll('.gstop').forEach(x => x.classList.toggle('on', x === h)); h.setPointerCapture(e.pointerId); const s = g.stops[this.sel];
        h.onpointermove = ev => { s[1] = Math.round(pos(ev.clientX)); h.style.left = s[1] + '%'; strip.style.background = this.css({ ...g, angle: 90 }); box.querySelector('.gpreview').style.background = this.css(g); box.querySelector('#gpos').value = s[1]; box.querySelector('#gcol').value = s[0]; this.preview(); };
        h.onpointerup = () => { h.onpointermove = null; h.onpointerup = null; fresh(); }; }; };
    fresh(); } };
// Show it under the Look sliders, and start fresh whenever the design option changes
{ const d0 = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { d0.call(this, el, tab); if (tab !== 'site' || !Dev.allowed()) return; const pane = el.querySelector('.apane'); if (!pane || pane.querySelector('.gradpane')) return; GradEd.work = null; GradEd.mount(pane); }; }
{ const ap = Skin.apply.bind(Skin); Skin.apply = function (v) { GradEd.work = null; ap(v); }; }
// Keep the live page free of re-renders while the developer drags (the Look tab doesn't need live data)
{ const dv = VIEWS.developer; const up = dv.update; dv.update = function (el, tab) { if (tab === 'site' && document.querySelector('.gradpane')) return; return up ? up.call(this, el, tab) : this.render(el, tab); }; }

// ---------- "People online" count ----------
// A small number can make a new site look empty, so by default the count only appears once enough people are online.
{ const sh = shell; shell = function () { sh(); const m = document.getElementById('mode'); if (!m || Store.mode !== 'shared') return; const c = Config.get(), mode = c.onlineShow || 'auto', min = +c.onlineMin || 25, n = Store.online().size;
    if (mode === 'never' || (mode === 'auto' && n < min) || (mode === 'members' && !(Dev.allowed()))) { const extra = `${Store.slow ? 'Data is slow to load' : ''}${!Store.canWrite ? (Store.slow ? ' · ' : '') + 'View-only' : ''}`; m.innerHTML = extra; m.hidden = !extra; } else m.hidden = false; }; }
{ const d0 = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { d0.call(this, el, tab); if (tab !== 'site' || !Dev.allowed()) return; const pane = el.querySelector('.apane'); if (!pane || pane.querySelector('.onlinepane')) return; const c = Config.get();
    pane.insertAdjacentHTML('beforeend', `<section class="onlinepane"><h2>"People online" count</h2><p class="muted small">Shown in the corner of every page. A low number (like "1 online") can make a new site feel empty, so by default it appears only when at least the number below are online.</p>
      <div class="grid2"><label class="fld">Show the count<select id="onshow"><option value="auto" ${(c.onlineShow || 'auto') === 'auto' ? 'selected' : ''}>Only when enough people are online</option><option value="always" ${c.onlineShow === 'always' ? 'selected' : ''}>Always</option><option value="members" ${c.onlineShow === 'members' ? 'selected' : ''}>Only to me (the developer)</option><option value="never" ${c.onlineShow === 'never' ? 'selected' : ''}>Never</option></select></label><label class="fld">Show it from this many people<input type="number" id="onmin" min="2" max="10000" value="${+c.onlineMin || 25}"></label></div></section>`);
    pane.querySelector('#onshow').onchange = async e => { await Config.save({ onlineShow: e.target.value }); shell(); toast('Saved.'); };
    pane.querySelector('#onmin').onchange = async e => { await Config.save({ onlineMin: Math.max(2, +e.target.value || 25) }); shell(); toast('Saved.'); }; }; }
