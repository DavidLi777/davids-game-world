// Chinese Checkers: the full six-pointed star (121 holes) for 2, 3, 4, 5 or 6 players, against friends or the computer.
(() => {
  const L = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1], cells = [];
  L.forEach((n, r) => { for (let i = 0; i < n; i++) cells.push([r, 2 * i - (n - 1)]); });
  const key = (r, c) => r + ',' + c, idx = new Map(cells.map((p, i) => [key(p[0], p[1]), i])), at = (r, c) => idx.has(key(r, c)) ? idx.get(key(r, c)) : -1;
  // The six points, clockwise from the top: 0 top, 1 upper right, 2 lower right, 3 bottom, 4 lower left, 5 upper left
  const rowCells = r => cells.map((c, i) => c[0] === r ? i : -1).filter(i => i >= 0);
  const POINTS = [[], [], [], [], [], []];
  for (let r = 0; r <= 3; r++) POINTS[0].push(...rowCells(r));
  for (let r = 13; r <= 16; r++) POINTS[3].push(...rowCells(r));
  for (let r = 4; r <= 7; r++) { const row = rowCells(r), k = 4 - (r - 4); POINTS[5].push(...row.slice(0, k)); POINTS[1].push(...row.slice(-k)); }
  for (let r = 9; r <= 12; r++) { const row = rowCells(r), k = r - 8; POINTS[4].push(...row.slice(0, k)); POINTS[2].push(...row.slice(-k)); }
  const TIP = [[0, 0], [4, 12], [12, 12], [16, 0], [12, -12], [4, -12]];
  // Seat 0 starts at the bottom point; seats go round the star clockwise
  const LAYOUT = { 2: [3, 0], 3: [3, 5, 1], 4: [3, 4, 0, 1], 5: [3, 4, 5, 0, 1], 6: [3, 4, 5, 0, 1, 2] };
  // Turning the star by 60° steps, so each player sees their own point at the front (bottom)
  const rotCell = (i, k) => { let [r, c] = cells[i]; for (let t = 0; t < k; t++) { const y = r - 8, q = (c - y) / 2, z = y, x = q; /* cube (x, y, z) turns to (-z, -x, -y) */ const cy = -x - z; const X = -z, Z = -cy; r = Z + 8; c = 2 * X + Z; } return [r, c]; };
  const DIRS = [[0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const hexd = (a, b) => { const dr = Math.abs(a[0] - b[0]), dc = Math.abs(a[1] - b[1]); return dr + Math.max(0, (dc - dr) / 2); };
  const home = (s, p) => LAYOUT[s.n][p], goalPt = (s, p) => (home(s, p) + 3) % 6;
  const dist = (s, i, p) => hexd(cells[i], TIP[goalPt(s, p)]);
  const G = {
    seats: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'],
    init(n) { n = Math.max(2, Math.min(6, n || 2)); const b = Array(cells.length).fill(-1); LAYOUT[n].forEach((pt, p) => POINTS[pt].forEach(i => b[i] = p)); return { n, b, t: 0, mv: 0, won: [] }; },
    turn: s => s.t,
    moves(s) { if (G.result(s)) return []; const out = [], p = s.t;
      s.b.forEach((v, i) => { if (v !== p) return; const [r, c] = cells[i], seen = new Set([i]);
        for (const [dr, dc] of DIRS) { const j = at(r + dr, c + dc); if (j >= 0 && s.b[j] < 0) out.push({ f: i, t: j }); }
        const q = [i]; while (q.length) { const k = q.pop(), [kr, kc] = cells[k]; for (const [dr, dc] of DIRS) { const m = at(kr + dr, kc + dc), l = at(kr + 2 * dr, kc + 2 * dc); if (m >= 0 && l >= 0 && s.b[m] >= 0 && s.b[l] < 0 && !seen.has(l)) { seen.add(l); q.push(l); out.push({ f: i, t: l }); } } } });
      return out.length ? out : ['pass']; },
    play(s, m) { if (m === 'pass') return { ...s, t: (s.t + 1) % s.n, mv: s.mv + 1, last: null }; const b = s.b.slice(); b[m.t] = b[m.f]; b[m.f] = -1; return { ...s, b, t: (s.t + 1) % s.n, mv: s.mv + 1, last: [m.f, m.t] }; },
    result(s) { for (let p = 0; p < s.n; p++) { const g = POINTS[goalPt(s, p)], mine = g.filter(i => s.b[i] === p).length; if (mine === g.length || (mine > 0 && g.every(i => s.b[i] >= 0))) return { winner: p }; }
      return s.mv > 300 * s.n ? { winner: -1 } : null; },
    ai(s, level, ms) { if (ms[0] === 'pass') return 'pass'; const p = s.t, g = new Set(POINTS[goalPt(s, p)]);
      const behind = Math.max(...s.b.map((v, i) => v === p ? dist(s, i, p) : 0));
      return pickBest(ms, m => { const gain = dist(s, m.f, p) - dist(s, m.t, p); return gain * 10 + (dist(s, m.f, p) >= behind - 1 ? 4 : 0) + (g.has(m.t) ? 3 : 0) - (g.has(m.f) && !g.has(m.t) ? 30 : 0); }, level); },
    view(s, x) { const ms = x.can ? G.moves(s).filter(m => m !== 'pass') : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m)); const last = new Set(s.last || []);
      const pt = new Map(); LAYOUT[s.n].forEach((h, p) => POINTS[h].forEach(i => pt.set(i, p)));
      const viewer = x.hot || !(x.me >= 0) || x.me >= s.n ? 0 : x.me, k = (3 - home(s, viewer) + 6) % 6, pos = cells.map((_, i) => rotCell(i, k));
      x.el.innerHTML = `<div class="bd star ccbd">${L.map((n, r) => `<div class="srow">${cells.map((c, i) => i).filter(i => pos[i][0] === r).sort((a, b) => pos[a][1] - pos[b][1]).map(i => `<button data-i="${i}" aria-label="Hole ${i + 1}${s.b[i] >= 0 ? ', ' + G.seats[s.b[i]] + ' peg' : ''}" class="hole ${s.b[i] >= 0 ? 'p' + s.b[i] : ''} ${pt.has(i) ? 'pt' + pt.get(i) : ''} ${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''} ${last.has(i) ? 'last' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}></button>`).join('')}</div>`).join('')}</div>`;
      x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
  };
  TB.chinesecheckers = G;
})();
