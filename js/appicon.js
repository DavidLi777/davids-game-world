// ---------- Developer › App icon: a full editor for the site's app icon ----------
// The icon is drawn from settings (background + three artwork layers + an optional picture of your own),
// so it stays sharp at any size. "Apply to the site" saves the settings for everyone and updates the
// browser tab icon, the home-screen icon and (optionally) the mark in the top bar.
const AppIcon = (() => {
  const V = 4358, AC = { x: 2176, y: 2184 };
  const LAYERS = { controller: { name: 'Controller', box: [665, 1775, 1313, 1155] }, king: { name: 'King', box: [1666, 1108, 1030, 2152] }, card: { name: 'Ace card', box: [2426, 1555, 1261, 1534] }, custom: { name: 'Your picture', box: [AC.x - 1307, AC.y - 1307, 2614, 2614] } };
  const PRESETS = {
    original: { name: 'Original', stops: ['#6d28d9', '#a62bd8', '#d9369f', '#ef4b82'], glow: '#ff8a4c' },
    sunset: { name: 'Sunset', stops: ['#7c2d92', '#d9367a', '#f9724a', '#ffb547'], glow: '#ffd36b' },
    ocean: { name: 'Ocean', stops: ['#1e3a8a', '#2563eb', '#06b6d4', '#2dd4bf'], glow: '#a7f3d0' },
    midnight: { name: 'Midnight', stops: ['#0f0a2e', '#2a1a6e', '#5b21b6', '#9333ea'], glow: '#f472b6' },
    forest: { name: 'Forest', stops: ['#064e3b', '#047857', '#10b981', '#a3e635'], glow: '#fde047' },
    candy: { name: 'Candy', stops: ['#f472b6', '#e879f9', '#a78bfa', '#60a5fa'], glow: '#ffffff' },
    ember: { name: 'Ember', stops: ['#450a0a', '#b91c1c', '#ea580c', '#facc15'], glow: '#fff7ae' },
    mono: { name: 'Graphite', stops: ['#111827', '#1f2937', '#374151', '#4b5563'], glow: '#a78bfa' } };
  const L0 = () => ({ x: 0, y: 0, s: 100, r: 0, flip: false, on: true, op: 100 });
  const DEF = () => ({ v: 1, bg: { mode: 'linear', stops: PRESETS.original.stops.slice(), angle: 135, glow: 55, glowColor: '#ff8a4c', glowAt: 'br', shine: 10, solid: '#7c3aed', grain: 1.2, img: null, imgFit: 'cover' },
    art: { main: '#ffffff', accent: '#e83e9c', buttons: '#9d2fd6', shadow: 0, shadowColor: '#2a0a4a' },
    g: { x: 0, y: 0, s: 100, r: 0, flip: false, on: true, op: 100 }, L: { controller: L0(), king: L0(), card: L0(), custom: { ...L0(), on: false } },
    order: ['controller', 'card', 'king', 'custom'], img: null, corner: 0, apply: { favicon: true, touch: true, header: false } });
  const clone = o => JSON.parse(JSON.stringify(o));
  const fix = s => { const d = DEF(); s = s && s.v ? s : d; const m = { ...d, ...s, bg: { ...d.bg, ...(s.bg || {}) }, art: { ...d.art, ...(s.art || {}) }, g: { ...d.g, ...(s.g || {}) }, apply: { ...d.apply, ...(s.apply || {}) }, L: {} };
    for (const k in d.L) m.L[k] = { ...d.L[k], ...((s.L || {})[k] || {}) }; if (!Array.isArray(m.order) || m.order.length !== 4) m.order = d.order; return m; };

  // ----- drawing -----
  const imgCache = new Map();
  const loadImg = src => { if (imgCache.has(src)) return imgCache.get(src); const p = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not load the picture.')); i.src = src; }); imgCache.set(src, p); if (imgCache.size > 60) imgCache.delete(imgCache.keys().next().value); return p; };
  const layerSVG = (k, st, px) => { let a = ICON_ART[k]; if (k === 'controller') a = a.replace(/fill="#9d2fd6"/g, `fill="${st.art.buttons}"`); if (k === 'card') a = a.replace(/fill="#e83e9c"/g, `fill="${st.art.accent}"`); a = a.replace(/fill="#fff"/g, `fill="${st.art.main}"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${px}" height="${px}">${a}</svg>`; };
  const svgURL = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const at = { tl: [0, 0], tr: [1, 0], bl: [0, 1], br: [1, 1], c: [.5, .5], t: [.5, 0], b: [.5, 1] };
  function gMatrix(st, n) { const k = n / V, g = st.g; return new DOMMatrix().translate(n / 2 + g.x / 100 * n, n / 2 + g.y / 100 * n).rotate(g.r).scale((g.flip ? -1 : 1) * g.s / 100, g.s / 100).translate(-AC.x * k, -AC.y * k); }
  function lMatrix(st, key, n) { const k = n / V, L = st.L[key], b = LAYERS[key].box, cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
    return gMatrix(st, n).translate((cx + L.x / 100 * V) * k, (cy + L.y / 100 * V) * k).rotate(L.r).scale((L.flip ? -1 : 1) * L.s / 100, L.s / 100).translate(-cx * k, -cy * k); }
  function drawBg(c, st, n, transparent) { const bg = st.bg; if (transparent || bg.mode === 'none') return;
    if (bg.mode === 'solid') { c.fillStyle = bg.solid; c.fillRect(0, 0, n, n); }
    else if (bg.mode === 'radial') { const gr = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * .72); bg.stops.forEach((s, i) => gr.addColorStop([0, .45, .78, 1][i], s)); c.fillStyle = gr; c.fillRect(0, 0, n, n); }
    else { const a = (bg.angle - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), h = (Math.abs(dx) + Math.abs(dy)) * n / 2; const gr = c.createLinearGradient(n / 2 - dx * h, n / 2 - dy * h, n / 2 + dx * h, n / 2 + dy * h); bg.stops.forEach((s, i) => gr.addColorStop([0, .45, .78, 1][i], s)); c.fillStyle = gr; c.fillRect(0, 0, n, n); }
    if (bg.glow > 0 && bg.glowAt !== 'off') { const [gx, gy] = at[bg.glowAt] || at.br, gr = c.createRadialGradient(gx * n, gy * n, 0, gx * n, gy * n, n * .78); gr.addColorStop(0, hexA(bg.glowColor, bg.glow / 100)); gr.addColorStop(1, hexA(bg.glowColor, 0)); c.fillStyle = gr; c.fillRect(0, 0, n, n); }
    if (bg.shine > 0) { const gr = c.createRadialGradient(n * .25, n * .15, 0, n * .25, n * .15, n * .6); gr.addColorStop(0, `rgba(255,255,255,${bg.shine / 100})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, n, n); } }
  const hexA = (h, a) => { const m = /^#?([\da-f]{6})$/i.exec(h || '') ; const v = m ? parseInt(m[1], 16) : 0xffffff; return `rgba(${v >> 16},${v >> 8 & 255},${v & 255},${a})`; };
  // A touch of noise removes the 8-bit "steps" (posterization) a smooth gradient would otherwise show.
  function dither(c, n, amt) { if (!amt) return; const d = c.getImageData(0, 0, n, n), p = d.data; let s = 12345; for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; s = (s * 1103515245 + 12345) >>> 0; const r = ((s >>> 8) / 16777216 * 2 - 1) * amt; p[i] += r; p[i + 1] += r; p[i + 2] += r; } c.putImageData(d, 0, 0); }
  async function render(st, n, o = {}) { st = fix(st); const cv = o.canvas || document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'); c.clearRect(0, 0, n, n);
    c.save(); if (st.corner > 0 && o.corner !== false) { roundRect(c, 0, 0, n, n, st.corner / 100 * n / 2); c.clip(); }
    drawBg(c, st, n, o.transparent);
    if (st.bg.mode === 'image' && st.bg.img) { try { const im = await loadImg(st.bg.img), r = st.bg.imgFit === 'contain' ? Math.min(n / im.width, n / im.height) : Math.max(n / im.width, n / im.height); c.drawImage(im, (n - im.width * r) / 2, (n - im.height * r) / 2, im.width * r, im.height * r); } catch (e) {} }
    if (!o.transparent && n >= 64) dither(c, n, st.bg.grain);
    if (st.g.on) { c.globalAlpha = st.g.op / 100;
      for (const key of st.order) { const L = st.L[key]; if (!L.on) continue; if (key === 'custom' && !st.img) continue;
        c.save(); c.globalAlpha = st.g.op / 100 * L.op / 100; if (st.art.shadow > 0) { c.shadowColor = hexA(st.art.shadowColor, .55); c.shadowBlur = st.art.shadow / 100 * n * .06; c.shadowOffsetY = st.art.shadow / 100 * n * .02; }
        const m = lMatrix(st, key, n); c.setTransform(m);
        if (key === 'custom') { try { const im = await loadImg(st.img), b = LAYERS.custom.box, k = n / V, r = Math.min(b[2] / im.width, b[3] / im.height) * k, w = im.width * r, h = im.height * r; c.drawImage(im, (AC.x * k) - w / 2, (AC.y * k) - h / 2, w, h); } catch (e) {} }
        else { const px = Math.min(4096, Math.max(64, Math.ceil(n * Math.max(1, st.g.s / 100 * L.s / 100) / 256) * 256)); const im = await loadImg(svgURL(layerSVG(key, st, px))); c.drawImage(im, 0, 0, n, n); }
        c.restore(); } }
    c.restore(); return cv; }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // Bounding box (in canvas pixels) of one layer or of the whole artwork.
  function bbox(st, target, n) { const keys = target === 'g' ? st.order.filter(k => st.L[k].on && (k !== 'custom' || st.img)) : [target]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const k = n / V;
    for (const key of keys) { const b = LAYERS[key].box, m = lMatrix(st, key, n); for (const [px, py] of [[b[0], b[1]], [b[0] + b[2], b[1]], [b[0], b[1] + b[3]], [b[0] + b[2], b[1] + b[3]]]) { const p = m.transformPoint(new DOMPoint(px * k, py * k)); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } }
    return keys.length ? { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } : null; }
  // Move a target by (dx, dy) canvas pixels.
  function moveBy(st, target, dx, dy, n) { if (target === 'g') { st.g.x += dx / n * 100; st.g.y += dy / n * 100; return; }
    const g = gMatrix(st, n); g.e = 0; g.f = 0; const p = g.inverse().transformPoint(new DOMPoint(dx, dy)), k = n / V; st.L[target].x += p.x / k / V * 100; st.L[target].y += p.y / k / V * 100; }
  const T = st => t => t === 'g' ? st.g : st.L[t];

  // ----- the site: tab icon, home-screen icon and the top-bar mark -----
  let appliedKey = '';
  async function applySite() { const s = Config.get().appIcon; const key = JSON.stringify(s || null); if (key === appliedKey) return; appliedKey = key;
    const brand = document.querySelector('.top .brand, a.brand'); if (!s || !s.v) { document.querySelectorAll('link[data-appicon]').forEach(l => { l.href = l.dataset.orig; l.removeAttribute('data-appicon'); }); if (brand) { const im = brand.querySelector('img.appmark'); if (im) { im.remove(); const sv = brand.querySelector('svg'); if (sv) sv.style.display = ''; } } return; }
    try { const st = fix(s); const set = (sel, url) => document.querySelectorAll(sel).forEach(l => { if (!l.dataset.appicon) { l.dataset.orig = l.getAttribute('href'); l.dataset.appicon = 1; } l.href = url; });
      if (st.apply.favicon) { const u = (await render(st, 64)).toDataURL('image/png'); set('link[rel="icon"]', u); }
      if (st.apply.touch) { const u = (await render(st, 180, { corner: false })).toDataURL('image/png'); set('link[rel="apple-touch-icon"]', u); }
      if (brand) { let im = brand.querySelector('img.appmark'); const sv = brand.querySelector('svg');
        if (st.apply.header) { if (!im) { im = document.createElement('img'); im.className = 'appmark'; im.alt = ''; brand.prepend(im); } im.src = (await render(st, 96)).toDataURL('image/png'); if (sv) sv.style.display = 'none'; }
        else if (im) { im.remove(); if (sv) sv.style.display = ''; } } } catch (e) { console.warn('app icon', e); } }
  setTimeout(applySite, 600); setInterval(applySite, 2000);

  // ----- downloads -----
  const blobOf = (cv, type = 'image/png', q) => new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('Could not draw the icon.')), type, q));
  async function png(st, n, o) { return blobOf(await render(st, n, o)); }
  async function ico(st) { const sizes = [16, 32, 48, 64, 128, 256], bufs = []; for (const s of sizes) bufs.push(new Uint8Array(await (await png(st, s)).arrayBuffer()));
    const head = 6 + 16 * sizes.length, total = head + bufs.reduce((a, b) => a + b.length, 0), out = new Uint8Array(total), dv = new DataView(out.buffer); dv.setUint16(2, 1, true); dv.setUint16(4, sizes.length, true); let off = head;
    sizes.forEach((s, i) => { const e = 6 + 16 * i; out[e] = s >= 256 ? 0 : s; out[e + 1] = s >= 256 ? 0 : s; dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true); dv.setUint32(e + 8, bufs[i].length, true); dv.setUint32(e + 12, off, true); out.set(bufs[i], off); off += bufs[i].length; });
    return new Blob([out], { type: 'image/x-icon' }); }
  function svgFile(st) { st = fix(st); const n = 1024, k = n / V, bg = st.bg, stops = bg.stops.map((s, i) => `<stop offset="${[0, .45, .78, 1][i]}" stop-color="${s}"/>`).join(''); const a = (bg.angle - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), h = (Math.abs(dx) + Math.abs(dy)) / 2;
    const [gx, gy] = at[bg.glowAt] || at.br; let defs = `<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="${(.5 - dx * h) * n}" y1="${(.5 - dy * h) * n}" x2="${(.5 + dx * h) * n}" y2="${(.5 + dy * h) * n}">${stops}</linearGradient><radialGradient id="rbg" cx=".5" cy=".5" r=".72">${stops}</radialGradient><radialGradient id="glow" cx="${gx}" cy="${gy}" r=".78"><stop offset="0" stop-color="${bg.glowColor}" stop-opacity="${bg.glow / 100}"/><stop offset="1" stop-color="${bg.glowColor}" stop-opacity="0"/></radialGradient><radialGradient id="shine" cx=".25" cy=".15" r=".6"><stop offset="0" stop-color="#fff" stop-opacity="${bg.shine / 100}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    let body = bg.mode === 'none' ? '' : bg.mode === 'solid' ? `<rect width="${n}" height="${n}" fill="${bg.solid}"/>` : bg.mode === 'image' && bg.img ? `<image href="${bg.img}" width="${n}" height="${n}" preserveAspectRatio="xMidYMid ${bg.imgFit === 'contain' ? 'meet' : 'slice'}"/>` : `<rect width="${n}" height="${n}" fill="url(#${bg.mode === 'radial' ? 'rbg' : 'bg'})"/>`;
    if (bg.mode !== 'none' && bg.glow > 0 && bg.glowAt !== 'off') body += `<rect width="${n}" height="${n}" fill="url(#glow)"/>`; if (bg.mode !== 'none' && bg.shine > 0) body += `<rect width="${n}" height="${n}" fill="url(#shine)"/>`;
    if (st.art.shadow > 0) defs += `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${st.art.shadow / 100 * n * .02}" stdDeviation="${st.art.shadow / 100 * n * .03}" flood-color="${st.art.shadowColor}" flood-opacity=".55"/></filter>`;
    if (st.g.on) for (const key of st.order) { const L = st.L[key]; if (!L.on || (key === 'custom' && !st.img)) continue; const m = lMatrix(st, key, n); const tf = `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`, op = st.g.op / 100 * L.op / 100, f = st.art.shadow > 0 ? ' filter="url(#sh)"' : '';
      if (key === 'custom') { const b = LAYERS.custom.box; body += `<g transform="${tf}" opacity="${op}"${f}><image href="${st.img}" x="${b[0] * k}" y="${b[1] * k}" width="${b[2] * k}" height="${b[3] * k}"/></g>`; }
      else body += `<g transform="${tf}" opacity="${op}"${f}><g transform="scale(${k})">${layerSVG(key, st, n).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></g>`; }
    const r = st.corner / 100 * n / 2, clip = r > 0 ? `<clipPath id="cl"><rect width="${n}" height="${n}" rx="${r}"/></clipPath>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n}" height="${n}"><defs>${defs}${clip}</defs><g${r > 0 ? ' clip-path="url(#cl)"' : ''}>${body}</g></svg>`; }
  // Small "stored" ZIP writer, so the whole icon pack downloads as one file.
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = ~0; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
  function zip(files) { const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const [name, data] of files) { const nm = enc.encode(name), crc = crc32(data), lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(lh.buffer), nm, data); const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true); cen.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + data.length; }
    const cs = cen.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cs, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(end.buffer)], { type: 'application/zip' }); }
  async function pack(st) { const f = [], u8 = async b => new Uint8Array(await b.arrayBuffer());
    for (const s of [16, 32, 48, 64, 96, 128, 152, 167, 180, 192, 256, 384, 512, 1024]) f.push([`icon-${s}.png`, await u8(await png(st, s))]);
    f.push(['apple-touch-icon.png', await u8(await png(st, 180, { corner: false }))]);
    const ms = fix(clone(st)); ms.g.s *= .8; f.push(['icon-maskable-512.png', await u8(await png(ms, 512, { corner: false }))]);
    f.push(['favicon.ico', await u8(await ico(st))]); f.push(['icon.svg', new TextEncoder().encode(svgFile(st))]);
    f.push(['manifest-icons.json', new TextEncoder().encode(JSON.stringify({ icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2))]);
    f.push(['README.txt', new TextEncoder().encode('David’s Game World app icon pack.\nfavicon.ico: browser tab. apple-touch-icon.png: iPhone and iPad home screen. icon-192/512: Android and installed web app. icon-maskable-512: Android adaptive icon (artwork kept inside the safe zone). icon-1024: App Store and Google Play listing. icon.svg: scalable master.\n')]);
    return zip(f); }

  // ----- the editor -----
  const Ed = { st: null, tgt: 'g', undo: [], redo: [], guides: true, safe: true, grid: false, snapped: { x: false, y: false }, busy: 0, N: 1024 };
  const draft = () => LS.get('iconDraft', null);
  function commit() { Ed.undo.push(JSON.stringify(Ed.st)); if (Ed.undo.length > 80) Ed.undo.shift(); Ed.redo = []; }
  const saveDraft = () => { try { LS.set('iconDraft', Ed.st); } catch (e) { const s = clone(Ed.st); s.img = null; s.bg.img = null; LS.set('iconDraft', s); } };
  let drawQ = null; function redraw(pane) { if (drawQ) return; drawQ = requestAnimationFrame(async () => { drawQ = null; const cv = pane.querySelector('#aicv'); if (!cv) return; const my = ++Ed.busy; const off = await render(Ed.st, Ed.N); if (my !== Ed.busy) return; cv.getContext('2d').drawImage(off, 0, 0); overlay(pane); previews(pane); syncUI(pane); saveDraft(); }); }
  function overlay(pane) { const ov = pane.querySelector('#aiov'); if (!ov) return; const n = Ed.N, c = ov.getContext('2d'); c.clearRect(0, 0, n, n); c.lineWidth = 3;
    if (Ed.grid) { c.strokeStyle = 'rgba(255,255,255,.22)'; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(i * n / 8, 0); c.lineTo(i * n / 8, n); c.moveTo(0, i * n / 8); c.lineTo(n, i * n / 8); c.stroke(); } }
    if (Ed.safe) { c.setLineDash([14, 10]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(n / 2, n / 2, n * .4, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,214,90,.6)'; c.strokeRect(n * .1, n * .1, n * .8, n * .8); c.setLineDash([]); }
    if (Ed.guides) { c.strokeStyle = Ed.snapped.x ? '#22d3ee' : 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(n / 2, 0); c.lineTo(n / 2, n); c.stroke(); c.strokeStyle = Ed.snapped.y ? '#22d3ee' : 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(0, n / 2); c.lineTo(n, n / 2); c.stroke(); }
    const b = bbox(Ed.st, Ed.tgt, n); if (b) { c.strokeStyle = '#22d3ee'; c.lineWidth = 4; c.setLineDash([]); c.strokeRect(b.x0, b.y0, b.w, b.h); c.fillStyle = '#22d3ee'; for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) c.fillRect(x - 9, y - 9, 18, 18); c.beginPath(); c.arc(b.cx, b.cy, 7, 0, 7); c.fill(); } }
  let pvT = 0; function previews(pane) { clearTimeout(pvT); pvT = setTimeout(async () => { const box = pane.querySelector('#aipv'); if (!box) return; const big = await render(Ed.st, 512, { corner: false });
    box.querySelectorAll('canvas[data-s]').forEach(cv => { const s = +cv.dataset.s, d = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = s * d; const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(big, 0, 0, s * d, s * d); }); }, 120); }
  const tgtObj = () => T(Ed.st)(Ed.tgt);
  function syncUI(pane) { const o = tgtObj(); pane.querySelectorAll('[data-tf]').forEach(i => { const k = i.dataset.tf; if (document.activeElement === i) return; if (i.type === 'checkbox') i.checked = !!o[k]; else i.value = Math.round(o[k] * 10) / 10; const out = pane.querySelector(`[data-out="${k}"]`); if (out) out.textContent = Math.round(o[k] * 10) / 10 + ({ s: '%', r: '°', op: '%', x: '%', y: '%' }[k] || ''); });
    pane.querySelectorAll('[data-tg]').forEach(b => b.classList.toggle('on', b.dataset.tg === Ed.tgt)); const b = bbox(Ed.st, Ed.tgt, Ed.N), inf = pane.querySelector('#aiinfo'); if (inf) inf.textContent = b ? `Selected: ${Ed.tgt === 'g' ? 'whole artwork' : LAYERS[Ed.tgt].name} · centre ${Math.round(b.cx / Ed.N * 1000) / 10}%, ${Math.round(b.cy / Ed.N * 1000) / 10}% · size ${Math.round(b.w / Ed.N * 100)}% × ${Math.round(b.h / Ed.N * 100)}% of the icon` : 'Nothing visible is selected.';
    const ub = pane.querySelector('#aiundo'), rb = pane.querySelector('#airedo'); if (ub) ub.disabled = !Ed.undo.length; if (rb) rb.disabled = !Ed.redo.length; }
  function align(how) { const n = Ed.N, b = bbox(Ed.st, Ed.tgt, n); if (!b) return toast('Turn on a layer first.'); const m = n * .1; let dx = 0, dy = 0;
    if (how === 'ch' || how === 'cc') dx = n / 2 - b.cx; if (how === 'cv' || how === 'cc') dy = n / 2 - b.cy; if (how === 'l') dx = m - b.x0; if (how === 'r') dx = n - m - b.x1; if (how === 't') dy = m - b.y0; if (how === 'b') dy = n - m - b.y1; moveBy(Ed.st, Ed.tgt, dx, dy, n); }
  function fit(frac) { const n = Ed.N, o = tgtObj(); for (let i = 0; i < 3; i++) { const b = bbox(Ed.st, Ed.tgt, n); if (!b) return; o.s *= (n * frac) / Math.max(b.w, b.h); } o.s = Math.max(5, Math.min(400, o.s)); align('cc'); }
  function spread() { const ks = ['controller', 'king', 'card'].filter(k => Ed.st.L[k].on); if (ks.length < 2) return toast('Turn on at least two layers.'); const n = Ed.N; const bs = ks.map(k => ({ k, b: bbox(Ed.st, k, n) })).sort((a, b) => a.b.cx - b.b.cx);
    const tot = bs.reduce((a, x) => a + x.b.w, 0), g = bbox(Ed.st, 'g', n), gap = (g.w - tot) / (bs.length - 1); let x = g.x0; for (const { k, b } of bs) { moveBy(Ed.st, k, x - b.x0, 0, n); x += b.w + gap; } }

  function html() { const st = Ed.st, bg = st.bg, art = st.art, sl = (k, lab, min, max, step = 1) => `<label class="aisl"><span>${lab} <output data-out="${k}"></output></span><input type="range" data-tf="${k}" min="${min}" max="${max}" step="${step}"></label>`;
    const col = (path, lab, v) => `<label class="aicol"><input type="color" data-c="${path}" value="${v}"><span>${lab}</span></label>`;
    return `<div class="aied"><h2>App icon</h2><p>Edit the icon people see in the browser tab, on their phone’s home screen and when they install the app. It is drawn from layers, so it stays sharp at every size and the gradient has no colour banding. Drag on the icon to move the selected layer, use the mouse wheel or pinch to resize it, and double-click a part to select it. Arrow keys nudge (hold Shift for bigger steps), + and − resize, [ and ] rotate, Ctrl+Z undoes.</p>
      <div class="aiwrap"><div class="aistage"><div class="aicanv" tabindex="0" aria-label="App icon editor canvas"><canvas id="aicv" width="${Ed.N}" height="${Ed.N}"></canvas><canvas id="aiov" width="${Ed.N}" height="${Ed.N}"></canvas></div>
        <div class="row-btns"><button class="btn sm" id="aiundo">↶ Undo</button><button class="btn sm" id="airedo">↷ Redo</button><label class="chk"><input type="checkbox" data-view="guides" ${Ed.guides ? 'checked' : ''}> Centre lines</label><label class="chk"><input type="checkbox" data-view="safe" ${Ed.safe ? 'checked' : ''}> Safe zone</label><label class="chk"><input type="checkbox" data-view="grid" ${Ed.grid ? 'checked' : ''}> Grid</label></div><p class="small muted" id="aiinfo"></p>
        <h3>Previews</h3><div id="aipv" class="aipv">${[[16, 'sq', 'Tab'], [32, 'sq', 'Tab (sharp screens)'], [48, 'sq', 'Desktop'], [64, 'ios', 'iPhone'], [64, 'and', 'Android'], [64, 'sqc', 'Rounded square'], [120, 'ios', 'Home screen'], [120, 'sq', 'Store listing']].map(([s, sh, l]) => `<figure class="pv-${sh}"><canvas data-s="${s}" style="width:${s}px;height:${s}px"></canvas><figcaption>${l} · ${s}px</figcaption></figure>`).join('')}
          <div class="aiphone"><div class="aiph-app"><canvas data-s="58" style="width:58px;height:58px"></canvas><small>Game World</small></div>${['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf'].map(c => `<div class="aiph-app"><i style="background:${c}"></i><small>App</small></div>`).join('')}</div></div></div>
      <div class="aictl">
        <fieldset><legend>Select what to edit</legend><div class="segs">${[['g', 'Whole artwork'], ['controller', 'Controller'], ['king', 'King'], ['card', 'Ace card'], ['custom', 'Your picture']].map(([k, l]) => `<button class="seg" data-tg="${k}">${l}</button>`).join('')}</div>
          <label class="chk"><input type="checkbox" data-tf="on"> Show it</label> <label class="chk"><input type="checkbox" data-tf="flip"> Mirror</label>
          ${sl('x', 'Left / right', -60, 60, .1)}${sl('y', 'Up / down', -60, 60, .1)}${sl('s', 'Size', 5, 400, 1)}${sl('r', 'Rotation', -180, 180, 1)}${sl('op', 'Opacity', 0, 100, 1)}
          <div class="aigrid"><button class="btn sm hot" data-al="cc">⊕ Centre</button><button class="btn sm" data-al="ch">↔ Centre left-right</button><button class="btn sm" data-al="cv">↕ Centre up-down</button><button class="btn sm" data-al="l">⇤ Left</button><button class="btn sm" data-al="r">Right ⇥</button><button class="btn sm" data-al="t">⤒ Top</button><button class="btn sm" data-al="b">Bottom ⤓</button><button class="btn sm" data-fit=".8">Fit safe zone</button><button class="btn sm" data-fit=".66">Fit with padding</button><button class="btn sm" data-fit=".94">Fill</button><button class="btn sm" data-op="spread">Even spacing</button><button class="btn sm" data-op="r0">Straighten</button><button class="btn sm" data-op="front">Bring to front</button><button class="btn sm" data-op="back">Send to back</button><button class="btn sm" data-op="treset">Reset this part</button></div>
          <div class="ainudge" aria-label="Nudge"><button class="btn sm" data-nd="0,-1">▲</button><div><button class="btn sm" data-nd="-1,0">◀</button><button class="btn sm" data-nd="1,0">▶</button></div><button class="btn sm" data-nd="0,1">▼</button></div></fieldset>
        <fieldset><legend>Background</legend><div class="segs">${[['linear', 'Gradient'], ['radial', 'Radial'], ['solid', 'Solid'], ['image', 'Picture'], ['none', 'Transparent']].map(([k, l]) => `<button class="seg ${bg.mode === k ? 'on' : ''}" data-bgm="${k}">${l}</button>`).join('')}</div>
          <div class="aipre">${Object.entries(PRESETS).map(([k, p]) => `<button class="aiswatch" data-pre="${k}" title="${p.name}" style="background:linear-gradient(135deg,${p.stops.join(',')})"><span>${p.name}</span></button>`).join('')}</div>
          <div class="aicols">${bg.stops.map((s, i) => col('bg.stops.' + i, ['Top-left', 'Middle', 'Lower', 'Corner'][i], s)).join('')}${col('bg.solid', 'Solid colour', bg.solid)}${col('bg.glowColor', 'Glow', bg.glowColor)}</div>
          <label class="aisl"><span>Angle <output>${bg.angle}°</output></span><input type="range" data-bg="angle" min="0" max="360" value="${bg.angle}"></label>
          <label class="aisl"><span>Glow strength <output>${bg.glow}%</output></span><input type="range" data-bg="glow" min="0" max="100" value="${bg.glow}"></label>
          <label class="fld inline">Glow position<select data-bg="glowAt">${[['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left'], ['t', 'Top'], ['b', 'Bottom'], ['c', 'Centre'], ['off', 'Off']].map(([k, l]) => `<option value="${k}" ${bg.glowAt === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="aisl"><span>Shine <output>${bg.shine}%</output></span><input type="range" data-bg="shine" min="0" max="40" value="${bg.shine}"></label>
          <label class="aisl"><span>Anti-banding grain <output>${bg.grain}</output></span><input type="range" data-bg="grain" min="0" max="4" step=".1" value="${bg.grain}"></label>
          <label class="btn sm">Background picture…<input type="file" accept="image/*" id="aibgimg" hidden></label> <label class="fld inline">Fit<select data-bg="imgFit"><option value="cover" ${bg.imgFit === 'cover' ? 'selected' : ''}>Fill the square</option><option value="contain" ${bg.imgFit === 'contain' ? 'selected' : ''}>Show all of it</option></select></label></fieldset>
        <fieldset><legend>Artwork colours & effects</legend><div class="aicols">${col('art.main', 'Pieces', art.main)}${col('art.accent', 'Spade', art.accent)}${col('art.buttons', 'Buttons', art.buttons)}${col('art.shadowColor', 'Shadow', art.shadowColor)}</div>
          <label class="aisl"><span>Drop shadow <output>${art.shadow}%</output></span><input type="range" data-art="shadow" min="0" max="100" value="${art.shadow}"></label>
          <label class="btn sm">Add your own picture…<input type="file" accept="image/*" id="aiimg" hidden></label> ${st.img ? '<button class="btn sm" data-op="rmimg">Remove your picture</button>' : ''}
          <label class="aisl"><span>Corner rounding in downloads <output>${st.corner}%</output></span><input type="range" data-top="corner" min="0" max="100" value="${st.corner}"></label><p class="small muted">0% keeps a full square with sharp corners (best for app stores, which round the corners themselves).</p></fieldset>
        <fieldset><legend>Download</legend><label class="fld inline">Size<select id="aisz">${[16, 32, 48, 64, 128, 180, 192, 256, 512, 1024, 2048, 4096].map(s => `<option ${s === LS.get('iconSz', 1024) ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <div class="row-btns"><button class="btn sm hot" data-dl="png">PNG</button><button class="btn sm" data-dl="tpng">PNG, no background</button><button class="btn sm" data-dl="jpg">JPG</button><button class="btn sm" data-dl="svg">SVG</button><button class="btn sm" data-dl="ico">favicon.ico</button><button class="btn sm" data-dl="pack">Full icon pack (.zip)</button><button class="btn sm" data-dl="json">Save settings</button><label class="btn sm">Load settings…<input type="file" accept=".json,application/json" id="aijson" hidden></label></div></fieldset>
        <fieldset><legend>Use on the site</legend><label class="chk"><input type="checkbox" data-ap="favicon" ${st.apply.favicon ? 'checked' : ''}> Browser tab icon</label><label class="chk"><input type="checkbox" data-ap="touch" ${st.apply.touch ? 'checked' : ''}> Home-screen icon (iPhone, iPad)</label><label class="chk"><input type="checkbox" data-ap="header" ${st.apply.header ? 'checked' : ''}> Show it in the top bar next to the site name</label>
          <div class="row-btns"><button class="btn hot" data-op="apply">Apply to the site for everyone</button><button class="btn" data-op="revert">Use the published icon</button><button class="btn" data-op="reset">Start over</button></div>
          <p class="small muted">${Config.get().appIcon ? 'A custom icon is live on the site.' : 'The site is using the published icon files.'} Installed copies of the app keep the icon they were installed with until they are reinstalled; the full icon pack has every file the app stores need.</p></fieldset></div></div></div>`; }

  function mount(pane) { Ed.st = fix(draft() || Config.get().appIcon || DEF()); Ed.undo = []; Ed.redo = []; pane.innerHTML = html(); bind(pane); redraw(pane); }
  function readImg(file, max) { return new Promise((res, rej) => { if (!file) return rej(new Error('No file.')); if (file.size > 15e6) return rej(new Error('That picture is over 15 MB.')); const r = new FileReader(); r.onload = async () => { try { const im = await loadImg(r.result), k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/webp', .9)); } catch (e) { rej(e); } }; r.onerror = () => rej(new Error('Could not read the file.')); r.readAsDataURL(file); }); }
  function bind(pane) { const cv = pane.querySelector('.aicanv'), st = () => Ed.st, ch = () => redraw(pane), setPath = (p, v) => { const ks = p.split('.'); let o = Ed.st; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = v; };
    const refresh = () => { pane.innerHTML = html(); bind(pane); redraw(pane); };
    if (!pane._aiBound) { pane._aiBound = true;
    pane.addEventListener('input', e => { const t = e.target, o = tgtObj();
      if (t.dataset.tf && t.type === 'range') { o[t.dataset.tf] = +t.value; const out = pane.querySelector(`[data-out="${t.dataset.tf}"]`); if (out) out.textContent = t.value; ch(); }
      else if (t.dataset.bg && t.type === 'range') { st().bg[t.dataset.bg] = +t.value; t.previousElementSibling.querySelector('output').textContent = t.value + (t.dataset.bg === 'angle' ? '°' : t.dataset.bg === 'grain' ? '' : '%'); ch(); }
      else if (t.dataset.art) { st().art[t.dataset.art] = +t.value; t.previousElementSibling.querySelector('output').textContent = t.value + '%'; ch(); }
      else if (t.dataset.top) { st()[t.dataset.top] = +t.value; t.previousElementSibling.querySelector('output').textContent = t.value + '%'; ch(); }
      else if (t.dataset.c) { setPath(t.dataset.c, t.value); if (t.dataset.c.startsWith('bg.stops') && !['linear', 'radial'].includes(st().bg.mode)) st().bg.mode = 'linear'; ch(); } });
    pane.addEventListener('pointerdown', e => { if (e.target.matches('input[type=range],input[type=color]')) commit(); }, true);
    pane.addEventListener('change', async e => { const t = e.target;
      if (t.dataset.tf && t.type === 'checkbox') { commit(); tgtObj()[t.dataset.tf] = t.checked; if (Ed.tgt === 'custom' && t.checked && !st().img) toast('Add your own picture first, below.'); ch(); }
      else if (t.dataset.view) { Ed[t.dataset.view] = t.checked; overlay(pane); }
      else if (t.dataset.ap) { st().apply[t.dataset.ap] = t.checked; saveDraft(); }
      else if (t.dataset.bg && t.tagName === 'SELECT') { commit(); st().bg[t.dataset.bg] = t.value; ch(); }
      else if (t.id === 'aisz') LS.set('iconSz', +t.value);
      else if (t.id === 'aiimg' || t.id === 'aibgimg') { try { const u = await readImg(t.files[0], 640); commit(); if (t.id === 'aiimg') { st().img = u; st().L.custom.on = true; Ed.tgt = 'custom'; } else { st().bg.img = u; st().bg.mode = 'image'; } refresh(); toast('Picture added.'); } catch (er) { toast(er.message); } }
      else if (t.id === 'aijson') { try { const j = JSON.parse(await t.files[0].text()); commit(); Ed.st = fix(j); refresh(); toast('Settings loaded.'); } catch (er) { toast('That file is not an icon settings file.'); } } });
    pane.addEventListener('click', async e => { const b = e.target.closest('button'); if (!b) return; const s = st();
      if (b.dataset.tg) { Ed.tgt = b.dataset.tg; syncUI(pane); overlay(pane); return; }
      if (b.id === 'aiundo' && Ed.undo.length) { Ed.redo.push(JSON.stringify(s)); Ed.st = fix(JSON.parse(Ed.undo.pop())); return refresh(); }
      if (b.id === 'airedo' && Ed.redo.length) { Ed.undo.push(JSON.stringify(s)); Ed.st = fix(JSON.parse(Ed.redo.pop())); return refresh(); }
      if (b.dataset.al) { commit(); align(b.dataset.al); return ch(); }
      if (b.dataset.fit) { commit(); fit(+b.dataset.fit); return ch(); }
      if (b.dataset.nd) { commit(); const [x, y] = b.dataset.nd.split(',').map(Number), step = e.shiftKey ? 20 : 4; moveBy(s, Ed.tgt, x * step, y * step, Ed.N); return ch(); }
      if (b.dataset.bgm) { commit(); s.bg.mode = b.dataset.bgm; if (b.dataset.bgm === 'image' && !s.bg.img) toast('Choose a background picture below.'); return refresh(); }
      if (b.dataset.pre) { commit(); const p = PRESETS[b.dataset.pre]; s.bg.stops = p.stops.slice(); s.bg.glowColor = p.glow; if (!['linear', 'radial'].includes(s.bg.mode)) s.bg.mode = 'linear'; return refresh(); }
      if (b.dataset.dl) { b.disabled = true; try { const n = +LS.get('iconSz', 1024), nm = 'davids-game-world-icon';
          if (b.dataset.dl === 'png') saveBlob(`${nm}-${n}.png`, await png(s, n));
          if (b.dataset.dl === 'tpng') saveBlob(`${nm}-${n}-transparent.png`, await png(s, n, { transparent: true }));
          if (b.dataset.dl === 'jpg') { const c = await render(s, n); saveBlob(`${nm}-${n}.jpg`, await blobOf(c, 'image/jpeg', .95)); }
          if (b.dataset.dl === 'svg') saveBlob(nm + '.svg', new Blob([svgFile(s)], { type: 'image/svg+xml' }));
          if (b.dataset.dl === 'ico') saveBlob('favicon.ico', await ico(s));
          if (b.dataset.dl === 'pack') saveBlob(nm + '-pack.zip', await pack(s));
          if (b.dataset.dl === 'json') saveBlob(nm + '-settings.json', new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' })); } catch (er) { toast(er.message); } b.disabled = false; return; }
      const op = b.dataset.op; if (!op) return;
      if (op === 'spread') { commit(); spread(); return ch(); }
      if (op === 'r0') { commit(); tgtObj().r = 0; return ch(); }
      if (op === 'treset') { commit(); if (Ed.tgt === 'g') Ed.st.g = DEF().g; else Ed.st.L[Ed.tgt] = { ...L0(), on: Ed.tgt === 'custom' ? !!s.img : true }; return ch(); }
      if (op === 'front' || op === 'back') { if (Ed.tgt === 'g') return toast('Pick one part (Controller, King, Ace card or Your picture) first.'); commit(); s.order = s.order.filter(k => k !== Ed.tgt); op === 'front' ? s.order.push(Ed.tgt) : s.order.unshift(Ed.tgt); toast(op === 'front' ? 'Brought to the front.' : 'Sent to the back.'); return ch(); }
      if (op === 'rmimg') { commit(); s.img = null; s.L.custom.on = false; if (Ed.tgt === 'custom') Ed.tgt = 'g'; return refresh(); }
      if (op === 'reset') { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Press again to start over'; return; } commit(); Ed.st = DEF(); Ed.tgt = 'g'; return refresh(); }
      if (op === 'apply') { b.disabled = true; try { await Config.save({ appIcon: null }); await Config.save({ appIcon: clone(s) }); appliedKey = ''; await applySite(); toast('The new icon is live on the site.'); } catch (er) { toast(er.message || 'Could not save.'); } b.disabled = false; return; }
      if (op === 'revert') { await Config.save({ appIcon: null }); appliedKey = ''; await applySite(); toast('Back to the published icon files.'); return refresh(); } }); }
    // Drag to move, wheel to resize, double-click to pick a part, keys to nudge.
    const toCanvas = (ev) => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * Ed.N, y: (ev.clientY - r.top) / r.height * Ed.N, k: Ed.N / r.width }; };
    let drag = null, pts = new Map(), pinch = null;
    cv.addEventListener('pointerdown', ev => { cv.focus(); cv.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, ev); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s: tgtObj().s }; drag = null; return; } commit(); drag = toCanvas(ev); });
    cv.addEventListener('pointermove', ev => { if (pts.has(ev.pointerId)) pts.set(ev.pointerId, ev);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; tgtObj().s = Math.max(5, Math.min(400, pinch.s * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d)); return ch(); }
      if (!drag) return; const p = toCanvas(ev); moveBy(Ed.st, Ed.tgt, p.x - drag.x, p.y - drag.y, Ed.N); drag = p;
      const bb = bbox(Ed.st, Ed.tgt, Ed.N), sn = Ed.N * .012; Ed.snapped = { x: false, y: false }; if (bb && !ev.altKey) { if (Math.abs(bb.cx - Ed.N / 2) < sn) { moveBy(Ed.st, Ed.tgt, Ed.N / 2 - bb.cx, 0, Ed.N); Ed.snapped.x = true; } if (Math.abs(bb.cy - Ed.N / 2) < sn) { moveBy(Ed.st, Ed.tgt, 0, Ed.N / 2 - bb.cy, Ed.N); Ed.snapped.y = true; } } ch(); });
    const up = ev => { pts.delete(ev.pointerId); if (pts.size < 2) pinch = null; drag = null; Ed.snapped = { x: false, y: false }; overlay(pane); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', ev => { ev.preventDefault(); const o = tgtObj(); if (ev.shiftKey) o.r = ((o.r + (ev.deltaY > 0 ? 3 : -3) + 540) % 360) - 180; else o.s = Math.max(5, Math.min(400, o.s * (ev.deltaY > 0 ? .96 : 1.04))); ch(); }, { passive: false });
    cv.addEventListener('dblclick', ev => { const p = toCanvas(ev); const hit = Ed.st.order.slice().reverse().find(k => { if (!Ed.st.L[k].on || (k === 'custom' && !Ed.st.img)) return false; const b = bbox(Ed.st, k, Ed.N); return b && p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1; }); Ed.tgt = hit || 'g'; syncUI(pane); overlay(pane); });
    cv.addEventListener('keydown', ev => { const o = tgtObj(), step = ev.shiftKey ? 20 : 4, map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); pane.querySelector(ev.shiftKey ? '#airedo' : '#aiundo').click(); return; }
      if (map[ev.key]) { ev.preventDefault(); commit(); moveBy(Ed.st, Ed.tgt, map[ev.key][0] * step, map[ev.key][1] * step, Ed.N); return ch(); }
      if (ev.key === '+' || ev.key === '=') { commit(); o.s = Math.min(400, o.s * 1.04); return ch(); } if (ev.key === '-') { commit(); o.s = Math.max(5, o.s / 1.04); return ch(); }
      if (ev.key === '[' || ev.key === ']') { commit(); o.r += ev.key === ']' ? 5 : -5; return ch(); } if (ev.key.toLowerCase() === 'c') { commit(); align('cc'); return ch(); } }); }
  return { render, applySite, mount, svgFile, pack, ico, fix, DEF, PRESETS, bbox, Ed, align, fit };
})();
DEV_TABS.push(['appicon', 'App icon']);
{ const d0 = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { d0.call(this, el, tab); if (tab !== 'appicon' || !Dev.allowed()) return; const pane = el.querySelector('.apane'); if (!pane || pane.querySelector('.aied')) return; AppIcon.mount(pane); }; }
{ const dv = VIEWS.developer; const up = dv.update; dv.update = function (el, tab) { if (tab === 'appicon' && document.querySelector('.aied')) return; return up ? up.call(this, el, tab) : this.render(el, tab); }; }
