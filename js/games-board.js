// Turn-based games. Each: init(n), turn(s), moves(s), play(s,m), result(s,ms), view(s,x), optional eval/depth/ai.
// State is plain JSON so it can be stored in a shared table document for online play.
const TB = {};
const R = n => Math.random() * n | 0;
const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cl = o => JSON.parse(JSON.stringify(o));
const D8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const L3 = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const line3 = (b, o = 0) => { for (const [a, c, d] of L3) { const v = b[o + a]; if ((v === 0 || v === 1) && v === b[o + c] && v === b[o + d]) return v; } return -1; };
const MK = v => `<span class="mk m${v}">${v ? 'O' : 'X'}</span>`;
const SEATCOL = ['#ff5a3c', '#2f7cf6', '#f2b600', '#19a974', '#a259ff', '#ff7ac6', '#0fb5c9', '#8b5a2b'];

// k in a row through idx on WxH board
function kRow(b, W, H, idx, k) {
  const p = b[idx]; if (p < 0) return -1; const r = idx / W | 0, c = idx % W;
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    let n = 1;
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < H && cc >= 0 && cc < W && b[rr * W + cc] === p) { n++; rr += dr * s; cc += dc * s; } }
    if (n >= k) return p;
  }
  return -1;
}

// ---------- Generic AI: random blend by level + alpha-beta minimax ----------
function mm(G, s, d, a, b, me, dl) {
  const ms = G.moves(s); const r = G.result(s, ms);
  if (r) return r.winner === me ? 1e7 + d : r.winner === -1 ? 0 : -1e7 - d;
  if (d === 0 || performance.now() > dl) return G.eval(s, me);
  let list = G.order ? G.order(s, ms) : ms;
  const max = G.turn(s) === me; let v = max ? -Infinity : Infinity;
  for (const m of list) {
    const c = mm(G, G.play(s, m), d - 1, a, b, me, dl);
    if (max) { if (c > v) v = c; if (v > a) a = v; } else { if (c < v) v = c; if (v < b) b = v; }
    if (b <= a) break;
  }
  return v;
}
function aiMove(G, s, level) {
  const ms = G.moves(s); if (!ms.length) return null; if (ms.length === 1 && !G.check) return ms[0];
  if (G.ai) return G.ai(s, level, ms);
  if (Math.random() < Math.max(0, (9 - level) / 11)) return ms[R(ms.length)];
  const me = G.turn(s), depth = G.depth ? G.depth(level) : Math.max(1, Math.ceil(level / 3));
  const dl = performance.now() + (G.budget || 900) * (0.5 + level / 10);
  let best = [], bv = -Infinity;
  const list = G.order ? G.order(s, shuf(ms.slice())) : shuf(ms.slice());
  for (const m of list) {
    const v = mm(G, G.play(s, m), depth - 1, -Infinity, Infinity, me, dl) + Math.random() * (11 - level) * 0.01;
    if (v > bv) { bv = v; best = [m]; } else if (v === bv) best.push(m);
  }
  return best[R(best.length)] ?? ms[0];
}
const noisy = (level) => Math.random() < Math.max(0, (9 - level) / 11);

// ---------- Tic-Tac-Toe ----------
TB.ttt = {
  seats: ['X', 'O'], init: () => ({ b: Array(9).fill(-1), t: 0 }), turn: s => s.t,
  moves: s => line3(s.b) >= 0 ? [] : s.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0),
  play: (s, m) => { const b = s.b.slice(); b[m] = s.t; return { b, t: 1 - s.t }; },
  result: s => { const w = line3(s.b); return w >= 0 ? { winner: w } : s.b.every(v => v >= 0) ? { winner: -1 } : null; },
  eval: () => 0, depth: l => l >= 7 ? 9 : Math.ceil(l / 2),
  view(s, x) { x.el.innerHTML = `<div class="bd g3">${s.b.map((v, i) => `<button class="cl" data-i="${i}" ${v >= 0 || !x.can ? 'disabled' : ''}>${v < 0 ? '' : MK(v)}</button>`).join('')}</div>`; x.on(i => x.act(+i)); }
};

// ---------- Four in a Row ----------
TB.c4 = {
  seats: ['Red', 'Yellow'], init: () => ({ b: Array(42).fill(-1), t: 0, last: -1 }), turn: s => s.t,
  moves(s) { if (s.last >= 0 && kRow(s.b, 7, 6, s.last, 4) >= 0) return []; return [3, 2, 4, 1, 5, 0, 6].filter(c => s.b[c] < 0); },
  play(s, c) { const b = s.b.slice(); let r = 5; while (b[r * 7 + c] >= 0) r--; b[r * 7 + c] = s.t; return { b, t: 1 - s.t, last: r * 7 + c }; },
  result(s) { if (s.last < 0) return null; const w = kRow(s.b, 7, 6, s.last, 4); if (w >= 0) return { winner: w }; return s.b.slice(0, 7).every(v => v >= 0) ? { winner: -1 } : null; },
  eval(s, me) {
    let v = 0; const b = s.b;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      if (b[r * 7 + c] === me && c === 3) v += 4;
      for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        const er = r + dr * 3, ec = c + dc * 3; if (er < 0 || er > 5 || ec < 0 || ec > 6) continue;
        let m = 0, o = 0; for (let k = 0; k < 4; k++) { const p = b[(r + dr * k) * 7 + c + dc * k]; if (p === me) m++; else if (p >= 0) o++; }
        if (m && !o) v += m === 3 ? 60 : m === 2 ? 6 : 1; else if (o && !m) v -= o === 3 ? 80 : o === 2 ? 7 : 1;
      }
    }
    return v;
  },
  depth: l => Math.min(7, Math.ceil(l * 0.7)), budget: 1100,
  view(s, x) {
    const cells = s.b.map((v, i) => `<div class="c4c${i === s.last ? ' last' : ''}">${v >= 0 ? `<i style="background:${['#ff5a3c', '#f2b600'][v]}"></i>` : ''}</div>`).join('');
    x.el.innerHTML = `<div class="bd c4">${cells}<div class="c4cols">${[0,1,2,3,4,5,6].map(c => `<button data-i="${c}" ${!x.can || s.b[c] >= 0 ? 'disabled' : ''} aria-label="Drop in column ${c + 1}"></button>`).join('')}</div></div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Gomoku ----------
function gScore(b, i, p) {
  const W = 15, r = i / W | 0, c = i % W; let sc = 0;
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    let n = 1, open = 0;
    for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < W && cc >= 0 && cc < W && b[rr * W + cc] === p) { n++; rr += dr * s; cc += dc * s; } if (rr >= 0 && rr < W && cc >= 0 && cc < W && b[rr * W + cc] < 0) open++; }
    sc += n >= 5 ? 1e6 : n === 4 ? (open === 2 ? 1e5 : open ? 1e4 : 0) : n === 3 ? (open === 2 ? 5e3 : open ? 400 : 0) : n === 2 ? (open === 2 ? 150 : open ? 30 : 0) : open * 4;
  }
  return sc;
}
TB.gomoku = {
  seats: ['Black', 'White'], init: () => ({ b: Array(225).fill(-1), t: 0, last: -1 }), turn: s => s.t,
  moves(s) { if (s.last >= 0 && kRow(s.b, 15, 15, s.last, 5) >= 0) return []; const out = []; s.b.forEach((v, i) => { if (v < 0) out.push(i); }); return out; },
  play(s, m) { const b = s.b.slice(); b[m] = s.t; return { b, t: 1 - s.t, last: m }; },
  result(s) { if (s.last >= 0 && kRow(s.b, 15, 15, s.last, 5) >= 0) return { winner: s.b[s.last] }; return s.b.every(v => v >= 0) ? { winner: -1 } : null; },
  ai(s, level, ms) {
    if (s.last < 0) return 112;
    const near = ms.filter(i => { const r = i / 15 | 0, c = i % 15; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && s.b[rr * 15 + cc] >= 0) return true; } return false; });
    let best = near[0], bv = -1;
    for (const i of near) {
      const b = s.b; b[i] = s.t; const a = gScore(b, i, s.t); b[i] = 1 - s.t; const d = gScore(b, i, 1 - s.t); b[i] = -1;
      const v = a + d * (0.5 + level * 0.045) + Math.random() * (11 - level) * 60 * (level < 4 ? 30 : 1);
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  },
  view(s, x) {
    x.el.innerHTML = `<div class="bd gom">${s.b.map((v, i) => `<button class="gp${i === s.last ? ' last' : ''}" data-i="${i}" ${v >= 0 || !x.can ? 'disabled' : ''}>${v >= 0 ? `<i class="st s${v}"></i>` : ''}</button>`).join('')}</div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Reversi ----------
const RW = [100,-20,10,5,5,10,-20,100,-20,-50,-2,-2,-2,-2,-50,-20,10,-2,1,1,1,1,-2,10,5,-2,1,0,0,1,-2,5,5,-2,1,0,0,1,-2,5,10,-2,1,1,1,1,-2,10,-20,-50,-2,-2,-2,-2,-50,-20,100,-20,10,5,5,10,-20,100];
function rvFlips(b, i, t) {
  if (b[i] >= 0) return []; const r = i >> 3, c = i & 7, out = [];
  for (const [dr, dc] of D8) { const tmp = []; let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 1 - t) { tmp.push(rr * 8 + cc); rr += dr; cc += dc; } if (tmp.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === t) out.push(...tmp); }
  return out;
}
TB.reversi = {
  seats: ['Black', 'White'],
  init() { const b = Array(64).fill(-1); b[27] = 1; b[36] = 1; b[28] = 0; b[35] = 0; return { b, t: 0, pass: 0 }; }, turn: s => s.t,
  moves(s) { if (s.pass >= 2 || s.b.every(v => v >= 0)) return []; const m = []; for (let i = 0; i < 64; i++) if (s.b[i] < 0 && rvFlips(s.b, i, s.t).length) m.push(i); return m.length ? m : ['pass']; },
  play(s, m) { if (m === 'pass') return { b: s.b, t: 1 - s.t, pass: s.pass + 1 }; const b = s.b.slice(); for (const f of rvFlips(b, m, s.t)) b[f] = s.t; b[m] = s.t; return { b, t: 1 - s.t, pass: 0, last: m }; },
  result(s) { if (s.pass >= 2 || s.b.every(v => v >= 0)) { const a = s.b.filter(v => v === 0).length, b = s.b.filter(v => v === 1).length; return { winner: a > b ? 0 : b > a ? 1 : -1, score: [a, b] }; } return null; },
  eval(s, me) { let v = 0; s.b.forEach((p, i) => { if (p === me) v += RW[i]; else if (p >= 0) v -= RW[i]; }); return v; },
  depth: l => Math.min(5, Math.ceil(l / 2)), budget: 1000,
  view(s, x) {
    const legal = x.can ? new Set(TB.reversi.moves(s)) : new Set();
    const c = [0, 1].map(p => s.b.filter(v => v === p).length);
    x.el.innerHTML = `<div class="score2"><span><i class="st s0"></i> ${c[0]}</span><span><i class="st s1"></i> ${c[1]}</span></div><div class="bd rv">${s.b.map((v, i) => `<button data-i="${i}" class="${legal.has(i) ? 'hint' : ''}${i === s.last ? ' last' : ''}" ${legal.has(i) ? '' : 'disabled'}>${v >= 0 ? `<i class="st s${v}"></i>` : ''}</button>`).join('')}</div>${legal.has('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}`;
    x.on(i => x.act(i === 'pass' ? 'pass' : +i));
  }
};

// ---------- Mancala (Kalah) ----------
TB.mancala = {
  seats: ['South', 'North'], init: () => ({ p: [4,4,4,4,4,4,0,4,4,4,4,4,4,0], t: 0 }), turn: s => s.t,
  moves(s) { if (TB.mancala.result(s)) return []; const o = s.t ? 7 : 0, m = []; for (let i = o; i < o + 6; i++) if (s.p[i]) m.push(i); return m; },
  play(s, i) {
    const p = s.p.slice(); let n = p[i]; p[i] = 0; let j = i; const store = s.t ? 13 : 6, skip = s.t ? 6 : 13;
    while (n) { j = (j + 1) % 14; if (j === skip) continue; p[j]++; n--; }
    let t = 1 - s.t;
    if (j === store) t = s.t;
    else { const own = s.t ? j >= 7 && j <= 12 : j <= 5; if (own && p[j] === 1 && p[12 - j] > 0) { p[store] += p[12 - j] + 1; p[j] = 0; p[12 - j] = 0; } }
    const a = p.slice(0, 6).reduce((x, y) => x + y, 0), b = p.slice(7, 13).reduce((x, y) => x + y, 0);
    if (!a || !b) { p[6] += a; p[13] += b; for (let k = 0; k < 13; k++) if (k !== 6) p[k] = 0; }
    return { p, t, last: i };
  },
  result(s) { const p = s.p; if (p.slice(0, 6).some(v => v) && p.slice(7, 13).some(v => v)) return null; return { winner: p[6] > p[13] ? 0 : p[13] > p[6] ? 1 : -1, score: [p[6], p[13]] }; },
  eval(s, me) { const p = s.p, d = p[6] - p[13] + 0.25 * (p.slice(0, 6).reduce((a, b) => a + b, 0) - p.slice(7, 13).reduce((a, b) => a + b, 0)); return me ? -d : d; },
  depth: l => l + 1, budget: 800,
  view(s, x) {
    const legal = x.can ? new Set(TB.mancala.moves(s)) : new Set();
    const pit = i => `<button class="pit" data-i="${i}" ${legal.has(i) ? '' : 'disabled'}><b>${s.p[i]}</b>${'<i></i>'.repeat(Math.min(s.p[i], 12))}</button>`;
    x.el.innerHTML = `<div class="bd man"><div class="store">${s.p[13]}<small>North</small></div><div class="rows"><div class="row">${[12,11,10,9,8,7].map(pit).join('')}</div><div class="row">${[0,1,2,3,4,5].map(pit).join('')}</div></div><div class="store">${s.p[6]}<small>South</small></div></div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Dots and Boxes (4x4 boxes) ----------
const DB_BOX = [...Array(16)].map((_, k) => { const r = k >> 2, c = k & 3; return [r * 4 + c, (r + 1) * 4 + c, 20 + r * 5 + c, 20 + r * 5 + c + 1]; });
const DB_ADJ = [...Array(40)].map((_, l) => DB_BOX.map((s, k) => s.includes(l) ? k : -1).filter(k => k >= 0));
TB.dots = {
  seats: ['Red', 'Blue'], init: () => ({ L: Array(40).fill(-1), B: Array(16).fill(-1), t: 0, sc: [0, 0] }), turn: s => s.t,
  moves: s => s.L.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0),
  play(s, l) { const L = s.L.slice(), B = s.B.slice(), sc = s.sc.slice(); L[l] = s.t; let got = 0; for (const k of DB_ADJ[l]) if (B[k] < 0 && DB_BOX[k].every(e => L[e] >= 0)) { B[k] = s.t; sc[s.t]++; got++; } return { L, B, t: got ? s.t : 1 - s.t, sc, last: l }; },
  result: s => s.L.every(v => v >= 0) ? { winner: s.sc[0] > s.sc[1] ? 0 : s.sc[1] > s.sc[0] ? 1 : -1, score: s.sc } : null,
  ai(s, level, ms) {
    const sides = k => DB_BOX[k].filter(e => s.L[e] >= 0).length;
    if (noisy(level)) return ms[R(ms.length)];
    const take = ms.filter(l => DB_ADJ[l].some(k => sides(k) === 3)); if (take.length) return take[0];
    const safe = ms.filter(l => DB_ADJ[l].every(k => sides(k) < 2)); if (safe.length) return safe[R(safe.length)];
    let best = ms[0], bv = 1e9;
    for (const l of ms) { let st = TB.dots.play(s, l), give = 0;
      for (let guard = 0; guard < 40; guard++) { const nx = st.L.findIndex((v, e) => v < 0 && DB_ADJ[e].some(k => DB_BOX[k].filter(q => st.L[q] >= 0).length === 3)); if (nx < 0) break; const before = st.sc[1 - s.t]; st = TB.dots.play(st, nx); give += st.sc[1 - s.t] - before; }
      if (give < bv) { bv = give; best = l; } }
    return best;
  },
  view(s, x) {
    let h = ''; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (!(i & 1) && !(j & 1)) h += '<i class="dd"></i>';
      else if (!(i & 1)) { const l = (i / 2) * 4 + (j - 1) / 2; h += `<button class="dl h ${s.L[l] >= 0 ? 'on p' + s.L[l] : ''}" data-i="${l}" ${s.L[l] >= 0 || !x.can ? 'disabled' : ''}></button>`; }
      else if (!(j & 1)) { const l = 20 + ((i - 1) / 2) * 5 + j / 2; h += `<button class="dl v ${s.L[l] >= 0 ? 'on p' + s.L[l] : ''}" data-i="${l}" ${s.L[l] >= 0 || !x.can ? 'disabled' : ''}></button>`; }
      else { const k = ((i - 1) / 2) * 4 + (j - 1) / 2; h += `<i class="bx ${s.B[k] >= 0 ? 'p' + s.B[k] : ''}"></i>`; }
    }
    x.el.innerHTML = `<div class="score2"><span style="color:${SEATCOL[0]}">Red ${s.sc[0]}</span><span style="color:${SEATCOL[1]}">Blue ${s.sc[1]}</span></div><div class="bd dots">${h}</div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Nim ----------
TB.nim = {
  seats: ['First', 'Second'], init: () => ({ h: [1, 3, 5, 7], t: 0 }), turn: s => s.t,
  moves: s => { const m = []; s.h.forEach((v, h) => { for (let n = 1; n <= v; n++) m.push({ h, n }); }); return m; },
  play: (s, m) => { const h = s.h.slice(); h[m.h] -= m.n; return { h, t: 1 - s.t, last: m }; },
  result: s => s.h.every(v => !v) ? { winner: 1 - s.t } : null,
  ai(s, level, ms) { const x = s.h.reduce((a, b) => a ^ b, 0); if (x && Math.random() < level / 10) { for (const m of ms) { const h = s.h.slice(); h[m.h] -= m.n; if (!h.reduce((a, b) => a ^ b, 0)) return m; } } return ms[R(ms.length)]; },
  view(s, x) {
    x.el.innerHTML = `<div class="bd nim">${s.h.map((v, h) => `<div class="nrow">${[...Array(v)].map((_, k) => `<button class="stick" data-i="${h},${v - k}" ${x.can ? '' : 'disabled'} aria-label="Take ${v - k} from row ${h + 1}"></button>`).join('') || '<span class="muted">empty</span>'}</div>`).join('')}<p class="muted small">Tap a stick to take it and every stick to its right.</p></div>`;
    x.on(d => { const [h, n] = d.split(',').map(Number); x.act({ h, n }); });
  }
};

// ---------- Hex 9x9 ----------
const HN = 9, HNB = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
function hexDist(b, p) { // cost to connect for player p (0: top-bottom, 1: left-right)
  const d = Array(81).fill(1e9), q = [];
  for (let k = 0; k < HN; k++) { const i = p ? k * HN : k; if (b[i] === 1 - p) continue; d[i] = b[i] === p ? 0 : 1; q.push(i); }
  while (q.length) { q.sort((a, c) => d[a] - d[c]); const i = q.shift(), r = i / HN | 0, c = i % HN;
    for (const [dr, dc] of HNB) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= HN || cc < 0 || cc >= HN) continue; const j = rr * HN + cc; if (b[j] === 1 - p) continue; const nd = d[i] + (b[j] === p ? 0 : 1); if (nd < d[j]) { d[j] = nd; q.push(j); } } }
  let m = 1e9; for (let k = 0; k < HN; k++) m = Math.min(m, d[p ? k * HN + HN - 1 : (HN - 1) * HN + k]); return m;
}
TB.hex = {
  seats: ['Red (top–bottom)', 'Blue (left–right)'], init: () => ({ b: Array(81).fill(-1), t: 0, last: -1 }), turn: s => s.t,
  moves: s => TB.hex.result(s) ? [] : s.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0),
  play: (s, m) => { const b = s.b.slice(); b[m] = s.t; return { b, t: 1 - s.t, last: m }; },
  result: s => { for (const p of [0, 1]) if (hexDist(s.b, p) === 0) return { winner: p }; return null; },
  ai(s, level, ms) {
    if (s.last < 0) return 40; let best = ms[0], bv = -1e9;
    for (const i of ms) { const b = s.b.slice(); b[i] = s.t; const v = hexDist(b, 1 - s.t) - hexDist(b, s.t) * 1.05 + Math.random() * (11 - level) * 0.6; if (v > bv) { bv = v; best = i; } }
    return best;
  },
  view(s, x) {
    let h = ''; for (let r = 0; r < HN; r++) { h += `<div class="hrow" style="margin-left:${r * 5.2}%">`; for (let c = 0; c < HN; c++) { const i = r * HN + c, v = s.b[i]; h += `<button class="hx ${v >= 0 ? 'p' + v : ''}${i === s.last ? ' last' : ''}" data-i="${i}" ${v >= 0 || !x.can ? 'disabled' : ''}></button>`; } h += '</div>'; }
    x.el.innerHTML = `<div class="bd hex">${h}</div>`; x.on(i => x.act(+i));
  }
};

// ---------- Nine Men's Morris ----------
const MP = [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]];
const MADJ = (() => { const e = [[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[9,10],[10,11],[12,13],[13,14],[15,16],[16,17],[18,19],[19,20],[21,22],[22,23],[0,9],[9,21],[3,10],[10,18],[6,11],[11,15],[1,4],[4,7],[16,19],[19,22],[8,12],[12,17],[5,13],[13,20],[2,14],[14,23]]; const a = [...Array(24)].map(() => []); e.forEach(([x, y]) => { a[x].push(y); a[y].push(x); }); return { a, e }; })();
const MILLS = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const inMill = (b, i) => b[i] >= 0 && MILLS.some(m => m.includes(i) && m.every(k => b[k] === b[i]));
TB.morris = {
  seats: ['Red', 'Blue'], init: () => ({ b: Array(24).fill(-1), t: 0, hand: [9, 9], n: 0 }), turn: s => s.t,
  moves(s) {
    if (TB.morris.result(s)) return [];
    const t = s.t, b = s.b, out = [], cnt = b.filter(v => v === t).length, steps = [];
    if (s.hand[t] > 0) b.forEach((v, i) => { if (v < 0) steps.push([-1, i]); });
    else b.forEach((v, i) => { if (v !== t) return; (cnt === 3 ? b.map((w, j) => w < 0 ? j : -1).filter(j => j >= 0) : MADJ.a[i].filter(j => b[j] < 0)).forEach(j => steps.push([i, j])); });
    const opp = b.map((v, i) => v === 1 - t ? i : -1).filter(i => i >= 0); const free = opp.filter(i => !inMill(b, i)); const rem = free.length ? free : opp;
    for (const [f, to] of steps) { const nb = b.slice(); if (f >= 0) nb[f] = -1; nb[to] = t; if (inMill(nb, to)) rem.forEach(r => out.push({ f, to, r })); else out.push({ f, to, r: -1 }); }
    return out;
  },
  play(s, m) { const b = s.b.slice(), hand = s.hand.slice(); if (m.f >= 0) b[m.f] = -1; else hand[s.t]--; b[m.to] = s.t; if (m.r >= 0) b[m.r] = -1; return { b, t: 1 - s.t, hand, n: s.n + 1, last: m }; },
  result(s) {
    if (s.n > 200) return { winner: -1 };
    const t = s.t; if (s.hand[t] === 0 && s.b.filter(v => v === t).length < 3) return { winner: 1 - t };
    if (s.hand[t] === 0 && s.b.filter(v => v === t).length > 3 && !s.b.some((v, i) => v === t && MADJ.a[i].some(j => s.b[j] < 0))) return { winner: 1 - t };
    return null;
  },
  eval(s, me) { const c = p => s.b.filter(v => v === p).length + s.hand[p]; const mob = p => s.b.reduce((a, v, i) => a + (v === p ? MADJ.a[i].filter(j => s.b[j] < 0).length : 0), 0); return (c(me) - c(1 - me)) * 20 + (mob(me) - mob(1 - me)); },
  depth: l => Math.min(4, Math.ceil(l / 3)), budget: 900,
  view(s, x) {
    const ms = x.can ? TB.morris.moves(s) : []; const sel = x.sel;
    const pending = sel && sel.to !== undefined; // waiting for removal
    let targets = new Set();
    if (pending) ms.filter(m => m.f === sel.f && m.to === sel.to && m.r >= 0).forEach(m => targets.add(m.r));
    else if (s.hand[s.t] > 0) ms.forEach(m => targets.add(m.to));
    else if (sel) ms.filter(m => m.f === sel.f).forEach(m => targets.add(m.to));
    else ms.forEach(m => targets.add(m.f));
    const P = i => [8 + MP[i][0] * 14, 8 + MP[i][1] * 14];
    const lines = MADJ.e.map(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
    const pts = s.b.map((v, i) => { const [cx, cy] = P(i); return `<g data-i="${i}" class="${targets.has(i) ? 'tg' : ''}${sel && sel.f === i ? ' sel' : ''}"><circle cx="${cx}" cy="${cy}" r="5.5" class="hit"/>${v >= 0 ? `<circle cx="${cx}" cy="${cy}" r="4.6" fill="${SEATCOL[v]}" stroke="#0004" stroke-width=".6"/>` : `<circle cx="${cx}" cy="${cy}" r="1.6" class="pt"/>`}</g>`; }).join('');
    x.el.innerHTML = `<div class="score2"><span style="color:${SEATCOL[0]}">Red · in hand ${s.hand[0]}</span><span style="color:${SEATCOL[1]}">Blue · in hand ${s.hand[1]}</span></div><svg class="bd mor" viewBox="0 0 100 100">${lines}${pts}</svg><p class="muted small">${pending ? 'Mill! Choose an enemy piece to remove.' : s.hand[s.t] > 0 ? 'Place a piece on an empty point.' : 'Select a piece, then where to move it.'}</p>`;
    x.on(d => {
      if (!x.can) return; const i = +d;
      if (pending) { const m = ms.find(m => m.f === sel.f && m.to === sel.to && m.r === i); if (m) { x.sel = null; x.act(m); } return; }
      if (s.hand[s.t] > 0) { const c = ms.filter(m => m.to === i); if (!c.length) return; if (c[0].r < 0) x.act(c[0]); else { x.sel = { f: -1, to: i }; x.redraw(); } return; }
      if (s.b[i] === s.t) { x.sel = { f: i }; x.redraw(); return; }
      if (sel) { const c = ms.filter(m => m.f === sel.f && m.to === i); if (!c.length) return; if (c[0].r < 0) { x.sel = null; x.act(c[0]); } else { x.sel = { f: sel.f, to: i }; x.redraw(); } }
    });
  }
};

// ---------- Ultimate Tic-Tac-Toe ----------
TB.uttt = {
  seats: ['X', 'O'], init: () => ({ b: Array(81).fill(-1), W: Array(9).fill(-1), nx: -1, t: 0 }), turn: s => s.t,
  moves(s) { if (TB.uttt.result(s)) return []; const m = []; for (let B = 0; B < 9; B++) { if (s.W[B] >= 0 || (s.nx >= 0 && s.nx !== B)) continue; for (let k = 0; k < 9; k++) if (s.b[B * 9 + k] < 0) m.push(B * 9 + k); } return m; },
  play(s, i) { const b = s.b.slice(), W = s.W.slice(), B = i / 9 | 0, k = i % 9; b[i] = s.t; if (W[B] < 0) { const w = line3(b, B * 9); if (w >= 0) W[B] = w; else if (b.slice(B * 9, B * 9 + 9).every(v => v >= 0)) W[B] = 2; } return { b, W, nx: W[k] >= 0 ? -1 : k, t: 1 - s.t, last: i }; },
  result(s) { const w = line3(s.W); if (w >= 0) return { winner: w }; return s.W.every(v => v >= 0) ? { winner: -1 } : null; },
  eval(s, me) { let v = 0; s.W.forEach((w, B) => { if (w === me) v += B === 4 ? 30 : 20; else if (w === 1 - me) v -= B === 4 ? 30 : 20; }); for (const ln of L3) { const a = ln.filter(B => s.W[B] === me).length, o = ln.filter(B => s.W[B] === 1 - me).length; if (a === 2 && !o) v += 25; if (o === 2 && !a) v -= 25; } return v; },
  depth: l => Math.min(5, Math.ceil(l / 2)), budget: 1000,
  view(s, x) {
    const legal = x.can ? new Set(TB.uttt.moves(s)) : new Set();
    x.el.innerHTML = `<div class="bd ut">${[...Array(9)].map((_, B) => `<div class="ub ${s.W[B] >= 0 && s.W[B] < 2 ? 'won w' + s.W[B] : ''} ${(s.nx < 0 || s.nx === B) && s.W[B] < 0 ? 'act' : ''}">${s.W[B] >= 0 && s.W[B] < 2 ? `<div class="big">${MK(s.W[B])}</div>` : ''}${[...Array(9)].map((_, k) => { const i = B * 9 + k, v = s.b[i]; return `<button data-i="${i}" ${legal.has(i) ? '' : 'disabled'} class="${i === s.last ? 'last' : ''}">${v >= 0 ? MK(v) : ''}</button>`; }).join('')}</div>`).join('')}</div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Sea Battle ----------
function sbFleet() {
  const ships = [], occ = new Set();
  for (const len of [5, 4, 3, 3, 2]) { for (let tries = 0; tries < 500; tries++) { const h = R(2), r = R(h ? 10 : 11 - len), c = R(h ? 11 - len : 10), cells = []; for (let k = 0; k < len; k++) cells.push((r + (h ? 0 : k)) * 10 + c + (h ? k : 0)); if (cells.some(i => occ.has(i))) continue; cells.forEach(i => occ.add(i)); ships.push(cells); break; } }
  return ships;
}
const sbSunk = (ship, shots) => ship.every(i => shots.includes(i));
TB.seabattle = {
  seats: ['Fleet A', 'Fleet B'], init: () => ({ ships: [sbFleet(), sbFleet()], shots: [[], []], t: 0, last: -1 }), turn: s => s.t,
  moves(s) { if (TB.seabattle.result(s)) return []; const sh = new Set(s.shots[s.t]); return [...Array(100).keys()].filter(i => !sh.has(i)); },
  play(s, i) { const shots = [s.shots[0].slice(), s.shots[1].slice()]; shots[s.t].push(i); return { ships: s.ships, shots, t: 1 - s.t, last: i }; },
  result(s) { for (const p of [0, 1]) if (s.ships[1 - p].every(sh => sbSunk(sh, s.shots[p]))) return { winner: p }; return null; },
  ai(s, level, ms) {
    const me = s.t, shots = s.shots[me], enemy = s.ships[1 - me], all = new Set(enemy.flat());
    const hits = shots.filter(i => all.has(i) && !enemy.find(sh => sh.includes(i) && sbSunk(sh, shots)));
    const ok = new Set(ms);
    if (Math.random() < 0.35 + level * 0.065 && hits.length) {
      const cand = [];
      for (const h of hits) { const r = h / 10 | 0, c = h % 10; for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) { const rr = r + dr, cc = c + dc, j = rr * 10 + cc; if (rr < 0 || rr > 9 || cc < 0 || cc > 9 || !ok.has(j)) continue; const inLine = hits.includes((r - dr) * 10 + (c - dc)); cand.push([j, inLine ? 2 : 1]); } }
      if (cand.length) { cand.sort((a, b) => b[1] - a[1]); return cand[0][0]; }
    }
    const par = level >= 4 ? ms.filter(i => ((i / 10 | 0) + i) % 2 === 0) : ms;
    const pool = par.length ? par : ms; return pool[R(pool.length)];
  },
  view(s, x) {
    const me = x.me >= 0 ? x.me : -1, opp = me >= 0 ? 1 - me : 1;
    const grid = (owner, shooter, clickable) => { const occ = new Set(s.ships[owner].flat()), shots = new Set(s.shots[shooter]), showShips = owner === me || TB.seabattle.result(s);
      return `<div class="sb">${[...Array(100)].map((_, i) => { const hit = shots.has(i) && occ.has(i), miss = shots.has(i) && !occ.has(i), sunk = hit && s.ships[owner].find(sh => sh.includes(i) && sbSunk(sh, s.shots[shooter])); return `<button data-i="${i}" class="${showShips && occ.has(i) ? 'ship ' : ''}${hit ? 'hit ' : ''}${miss ? 'miss ' : ''}${sunk ? 'sunk ' : ''}${i === s.last && s.shots[shooter].includes(i) ? 'last' : ''}" ${clickable && !shots.has(i) ? '' : 'disabled'}></button>`; }).join('')}</div>`; };
    if (me < 0) x.el.innerHTML = `<div class="sbwrap"><div><h4>Fleet A</h4>${grid(0, 1, false)}</div><div><h4>Fleet B</h4>${grid(1, 0, false)}</div></div>`;
    else x.el.innerHTML = `<div class="sbwrap"><div><h4>Enemy waters · fire here</h4>${grid(opp, me, x.can)}</div><div><h4>Your fleet</h4>${grid(me, opp, false)}</div></div>`;
    x.on(i => x.act(+i));
  }
};

// ---------- Snakes & Ladders ----------
const JUMPS = { 3: 22, 8: 30, 21: 42, 28: 84, 50: 67, 71: 92, 80: 99, 17: 4, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 79 };
const sqXY = k => { const row = (k - 1) / 10 | 0, col = row % 2 ? 9 - (k - 1) % 10 : (k - 1) % 10; return [col + 0.5, 9 - row + 0.5]; };
TB.ladders = {
  seats: ['Red', 'Blue', 'Gold', 'Green'], init: n => ({ pos: Array(n).fill(0), t: 0, n, roll: 0, msg: '' }), turn: s => s.t,
  moves: s => TB.ladders.result(s) ? [] : ['roll'],
  play(s) { const pos = s.pos.slice(), d = 1 + R(6); let p = pos[s.t] + d, msg = `rolled ${d}`; if (p > 100) { p = pos[s.t]; msg += ', too far'; } else if (JUMPS[p]) { msg += JUMPS[p] > p ? ', climbed a ladder' : ', slid down a snake'; p = JUMPS[p]; } pos[s.t] = p; return { ...s, pos, t: p === 100 ? s.t : (s.t + 1) % s.n, roll: d, msg, who: s.t }; },
  result: s => { const w = s.pos.indexOf(100); return w >= 0 ? { winner: w } : null; },
  ai: () => 'roll',
  view(s, x) {
    let cells = ''; for (let row = 9; row >= 0; row--) for (let c = 0; c < 10; c++) { const col = row % 2 ? 9 - c : c, k = row * 10 + col + 1; cells += `<div class="sq ${(row + c) % 2 ? 'a' : 'b'}"><small>${k}</small>${s.pos.map((p, i) => p === k ? `<i class="tok" style="background:${SEATCOL[i]}"></i>` : '').join('')}</div>`; }
    const art = Object.entries(JUMPS).map(([a, b]) => { const [x1, y1] = sqXY(+a), [x2, y2] = sqXY(b); return b > a ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="lad"/>` : `<path d="M${x1} ${y1} Q ${(x1 + x2) / 2 + 1.2} ${(y1 + y2) / 2} ${x2} ${y2}" class="snk"/><circle cx="${x1}" cy="${y1}" r=".22" class="snkh"/>`; }).join('');
    const home = s.pos.map((p, i) => p === 0 ? `<i class="tok" style="background:${SEATCOL[i]}"></i>` : '').join('');
    x.el.innerHTML = `<div class="bd sl"><div class="slg">${cells}</div><svg viewBox="0 0 10 10">${art}</svg></div><div class="slbar"><span>Start: ${home || '—'}</span><span>${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' + s.msg : ''}</span><button class="btn hot" data-i="roll" ${x.can ? '' : 'disabled'}>Roll the die</button></div>`;
    x.on(() => x.act('roll'));
  }
};

// ---------- Checkers ----------
const ckOwn = (p, t) => p && p.toLowerCase() === (t ? 'b' : 'a');
function ckMoves(s) {
  const b = s.b, t = s.t, jumps = [], steps = [];
  const dirs = p => p === 'A' || p === 'B' ? [-1, 1] : p === 'a' ? [-1] : [1];
  const jumpFrom = (bb, i, p, path, caps) => {
    const r = i >> 3, c = i & 7; let found = false;
    for (const dr of dirs(p)) for (const dc of [-1, 1]) { const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc; if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue; const mi = mr * 8 + mc, li = lr * 8 + lc; if (!bb[mi] || ckOwn(bb[mi], t) || caps.includes(mi) || bb[li]) continue;
      found = true; const np = path.concat(li), nc = caps.concat(mi); const crown = (p === 'a' && lr === 0) || (p === 'b' && lr === 7);
      if (crown) jumps.push({ path: np, caps: nc }); else jumpFrom(bb, li, p, np, nc); }
    if (!found && caps.length) jumps.push({ path, caps });
  };
  for (let i = 0; i < 64; i++) { const p = b[i]; if (!ckOwn(p, t)) continue; const bb = b.slice(); bb[i] = ''; jumpFrom(bb, i, p, [i], []);
    const r = i >> 3, c = i & 7; for (const dr of dirs(p)) for (const dc of [-1, 1]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !b[rr * 8 + cc]) steps.push({ path: [i, rr * 8 + cc], caps: [] }); } }
  return jumps.length ? jumps : steps;
}
TB.checkers = {
  seats: ['Red', 'Black'],
  init() { const b = Array(64).fill(''); for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; if ((r + c) % 2) { if (r < 3) b[i] = 'b'; if (r > 4) b[i] = 'a'; } } return { b, t: 0, np: 0 }; }, turn: s => s.t,
  moves: s => s.np >= 80 ? [] : ckMoves(s),
  play(s, m) { const b = s.b.slice(), f = m.path[0], to = m.path[m.path.length - 1]; let p = b[f]; b[f] = ''; m.caps.forEach(i => b[i] = ''); if (p === 'a' && to < 8) p = 'A'; if (p === 'b' && to >= 56) p = 'B'; b[to] = p; return { b, t: 1 - s.t, np: m.caps.length ? 0 : s.np + 1, last: m.path }; },
  result(s, ms) { if (s.np >= 80) return { winner: -1 }; ms = ms || ckMoves(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { let v = 0; s.b.forEach((p, i) => { if (!p) return; const own = ckOwn(p, me), r = i >> 3; let x = p === 'A' || p === 'B' ? 165 : 100 + (p === 'a' ? 7 - r : r) * 4; v += own ? x : -x; }); return v; },
  order: (s, ms) => ms.sort((a, b) => b.caps.length - a.caps.length),
  depth: l => Math.min(7, Math.ceil(l * 0.7)), budget: 1000,
  view(s, x) {
    const ms = x.can ? ckMoves(s) : [], sel = x.sel, from = new Set(ms.map(m => m.path[0])), to = new Map();
    if (sel != null) ms.filter(m => m.path[0] === sel).forEach(m => to.set(m.path[m.path.length - 1], m));
    const last = new Set(s.last || []);
    x.el.innerHTML = `<div class="bd ck">${s.b.map((p, i) => { const dark = ((i >> 3) + (i & 7)) % 2; return `<button data-i="${i}" class="${dark ? 'dk' : 'lt'}${i === sel ? ' sel' : ''}${to.has(i) ? ' tg' : ''}${last.has(i) ? ' last' : ''}" ${dark && (from.has(i) || to.has(i)) ? '' : 'disabled'}>${p ? `<i class="pc ${p.toLowerCase() === 'a' ? 'red' : 'blk'}${p === 'A' || p === 'B' ? ' king' : ''}"></i>` : ''}</button>`; }).join('')}</div>`;
    x.on(d => { const i = +d; if (to.has(i)) { const m = to.get(i); if (m.p) return chPromo(s, x, m, all.filter(q => q.f === m.f && q.t === m.t).map(q => q.p)); x.sel = null; x.act(m); } else if (from.has(i)) { x.sel = i; x.redraw(); } });
  }
};
// Promotion: let the player choose queen, rook, bishop or knight
function chPromo(s, x, m, opts) { const w = s.t === 0, d = document.createElement('div'); d.className = 'promo4'; d.innerHTML = `<p>Promote to</p><div>${(opts && opts.length ? opts : ['Q', 'R', 'B', 'N']).map(q => `<button data-pp="${q}" aria-label="${{ Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', K: 'King' }[q]}"><span class="cp ${w ? 'w' : 'b'}">${GLY[w ? q : q.toLowerCase()]}</span></button>`).join('')}</div><button class="btn sm" data-pp="x">Cancel</button>`;
  x.el.style.position = 'relative'; x.el.appendChild(d); d.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-pp]'); if (!b) return; d.remove(); if (b.dataset.pp === 'x') return; x.sel = null; x.act({ ...m, p: b.dataset.pp }); }); }

// ---------- Chess ----------
const PV = { P: 100, N: 310, B: 325, R: 500, Q: 900, K: 0 };
const GLY = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
function chAtt(b, sq, w) {
  const r = sq >> 3, c = sq & 7, P = w ? 'P' : 'p', N = w ? 'N' : 'n', B = w ? 'B' : 'b', Rk = w ? 'R' : 'r', Q = w ? 'Q' : 'q', K = w ? 'K' : 'k';
  const pr = w ? r + 1 : r - 1; if (pr >= 0 && pr < 8) { if (c > 0 && b[pr * 8 + c - 1] === P) return true; if (c < 7 && b[pr * 8 + c + 1] === P) return true; }
  for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) return true; }
  for (const [dr, dc] of D8) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) return true; }
  for (const [dr, dc] of D8) { const dg = dr && dc; let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (p === Q || (dg ? p === B : p === Rk)) return true; break; } rr += dr; cc += dc; } }
  return false;
}
function chPseudo(s) {
  const b = s.b, w = s.t === 0, ms = [], mine = p => p && (w ? p < 'a' : p >= 'a'), theirs = p => p && !mine(p);
  for (let i = 0; i < 64; i++) { const p = b[i]; if (!mine(p)) continue; const r = i >> 3, c = i & 7, u = p.toUpperCase();
    if (u === 'P') { const d = w ? -1 : 1, r1 = r + d; const add = t => { if ((t >> 3) === (w ? 0 : 7)) for (const q of 'QRBN') ms.push({ f: i, t, p: q }); else ms.push({ f: i, t }); };
      if (r1 >= 0 && r1 < 8) { if (!b[r1 * 8 + c]) { add(r1 * 8 + c); if (r === (w ? 6 : 1) && !b[(r + 2 * d) * 8 + c]) ms.push({ f: i, t: (r + 2 * d) * 8 + c }); }
        for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7) continue; const t = r1 * 8 + cc; if (theirs(b[t]) || t === s.ep) add(t); } } }
    else if (u === 'N' || u === 'K') { for (const [dr, dc] of (u === 'N' ? KN : D8)) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; const t = rr * 8 + cc; if (!mine(b[t])) ms.push({ f: i, t }); } }
    else { const dirs = u === 'B' ? D8.filter(d => d[0] && d[1]) : u === 'R' ? D8.filter(d => !(d[0] && d[1])) : D8;
      for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const t = rr * 8 + cc; if (mine(b[t])) break; ms.push({ f: i, t }); if (b[t]) break; rr += dr; cc += dc; } } } }
  const k = w ? 60 : 4, K = w ? 'K' : 'k', Rk = w ? 'R' : 'r';
  if (b[k] === K && !chAtt(b, k, !w)) {
    if (s.c.includes(w ? 'K' : 'k') && !b[k + 1] && !b[k + 2] && b[k + 3] === Rk && !chAtt(b, k + 1, !w) && !chAtt(b, k + 2, !w)) ms.push({ f: k, t: k + 2 });
    if (s.c.includes(w ? 'Q' : 'q') && !b[k - 1] && !b[k - 2] && !b[k - 3] && b[k - 4] === Rk && !chAtt(b, k - 1, !w) && !chAtt(b, k - 2, !w)) ms.push({ f: k, t: k - 2 });
  }
  return ms;
}
function chMake(s, m) {
  const b = s.b.slice(), p = b[m.f], w = s.t === 0, u = p.toUpperCase(); let cap = b[m.t];
  b[m.t] = m.p ? (w ? m.p : m.p.toLowerCase()) : p; b[m.f] = '';
  if (u === 'P' && m.t === s.ep && !cap) { const ci = m.t + (w ? 8 : -8); cap = b[ci]; b[ci] = ''; }
  if (u === 'K' && Math.abs(m.t - m.f) === 2) { if (m.t > m.f) { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = ''; } else { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = ''; } }
  let c = s.c; const strip = ch => { c = c.replace(ch, ''); };
  if (u === 'K') { if (w) { strip('K'); strip('Q'); } else { strip('k'); strip('q'); } }
  for (const sq of [m.f, m.t]) { if (sq === 63) strip('K'); if (sq === 56) strip('Q'); if (sq === 7) strip('k'); if (sq === 0) strip('q'); }
  return { b, t: 1 - s.t, c, ep: u === 'P' && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) / 2 : -1, h: u === 'P' || cap ? 0 : s.h + 1, n: s.n + (w ? 0 : 1), last: [m.f, m.t] };
}
const chOnlyKings = b => b.every(p => !p || p === 'K' || p === 'k');
function chLegal(s) { const w = s.t === 0; return chPseudo(s).filter(m => { const n = chMake(s, m); return !chAtt(n.b, n.b.indexOf(w ? 'K' : 'k'), !w); }); }
const chCheck = s => chAtt(s.b, s.b.indexOf(s.t === 0 ? 'K' : 'k'), s.t !== 0);
TB.chess = {
  seats: ['White', 'Black'],
  init: () => ({ b: 'rnbqkbnrpppppppp'.split('').concat(Array(32).fill(''), 'PPPPPPPPRNBQKBNR'.split('')), t: 0, c: 'KQkq', ep: -1, h: 0, n: 1 }), turn: s => s.t,
  moves: s => s.h >= 100 || chOnlyKings(s.b) ? [] : chLegal(s),
  play: chMake,
  result(s, ms) { if (s.h >= 100 || chOnlyKings(s.b)) return { winner: -1 }; ms = ms || chLegal(s); if (ms.length) return null; return chCheck(s) ? { winner: 1 - s.t } : { winner: -1 }; },
  eval(s, me) { let v = 0; for (let i = 0; i < 64; i++) { const p = s.b[i]; if (!p) continue; const w = p < 'a', u = p.toUpperCase(), r = i >> 3, c = i & 7, cd = Math.abs(3.5 - r) + Math.abs(3.5 - c); let x = PV[u];
      if (u === 'P') x += (w ? 6 - r : r - 1) * 8 + (c > 1 && c < 6 ? 4 : 0); else if (u === 'N' || u === 'B') x += (7 - cd) * 5; else if (u === 'Q') x += 7 - cd; else if (u === 'K') x += s.n < 30 ? ((w ? r === 7 : r === 0) ? 12 : -12) : (7 - cd) * 3;
      v += w ? x : -x; } return me === 0 ? v : -v; },
  order: (s, ms) => ms.sort((a, b) => (s.b[b.t] ? PV[s.b[b.t].toUpperCase()] : 0) + (b.p === 'Q' ? 800 : 0) - (s.b[a.t] ? PV[s.b[a.t].toUpperCase()] : 0) - (a.p === 'Q' ? 800 : 0)),
  depth: l => l <= 3 ? 1 : l <= 6 ? 2 : 3, budget: 1400,
  view(s, x) {
    const all = x.can ? (this && this.moves ? this.moves(s) : chLegal(s)) : [], ms = all.filter(m => !m.p || m.p === all.find(q => q.f === m.f && q.t === m.t && q.p).p), sel = x.sel, from = new Set(ms.map(m => m.f)), to = new Map();
    if (sel != null) ms.filter(m => m.f === sel).forEach(m => to.set(m.t, m));
    const flip = x.me === 1, order = [...Array(64).keys()]; if (flip) order.reverse();
    const last = new Set(s.last || []), chk = chCheck(s) ? s.b.indexOf(s.t === 0 ? 'K' : 'k') : -1;
    x.el.innerHTML = `<div class="bd chess">${order.map(i => { const p = s.b[i], lt = ((i >> 3) + (i & 7)) % 2 === 0; return `<button data-i="${i}" class="${lt ? 'lt' : 'dk'}${i === sel ? ' sel' : ''}${to.has(i) ? (p ? ' cap' : ' tg') : ''}${last.has(i) ? ' last' : ''}${i === chk ? ' incheck' : ''}" ${from.has(i) || to.has(i) ? '' : 'disabled'}>${p ? `<span class="cp ${p < 'a' ? 'w' : 'b'}">${GLY[p.toLowerCase()]}</span>` : ''}</button>`; }).join('')}</div>${chk >= 0 && x.can ? '<p class="warn">Check!</p>' : ''}`;
    x.on(d => { const i = +d; if (to.has(i)) { const m = to.get(i); if (m.p) return chPromo(s, x, m, all.filter(q => q.f === m.f && q.t === m.t).map(q => q.p)); x.sel = null; x.act(m); } else if (from.has(i)) { x.sel = i; x.redraw(); } });
  }
};
// Promotion: let the player choose queen, rook, bishop or knight
function chPromo(s, x, m, opts) { const w = s.t === 0, d = document.createElement('div'); d.className = 'promo4'; d.innerHTML = `<p>Promote to</p><div>${(opts && opts.length ? opts : ['Q', 'R', 'B', 'N']).map(q => `<button data-pp="${q}" aria-label="${{ Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', K: 'King' }[q]}"><span class="cp ${w ? 'w' : 'b'}">${GLY[w ? q : q.toLowerCase()]}</span></button>`).join('')}</div><button class="btn sm" data-pp="x">Cancel</button>`;
  x.el.style.position = 'relative'; x.el.appendChild(d); d.addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('[data-pp]'); if (!b) return; d.remove(); if (b.dataset.pp === 'x') return; x.sel = null; x.act({ ...m, p: b.dataset.pp }); }); }

// ---------- Go 9x9 ----------
const GN = 9, gNb = i => { const r = i / GN | 0, c = i % GN, o = []; if (r) o.push(i - GN); if (r < GN - 1) o.push(i + GN); if (c) o.push(i - 1); if (c < GN - 1) o.push(i + 1); return o; };
function gGroup(b, i) { const col = b[i], st = [i], seen = new Set([i]), libs = new Set(); while (st.length) { const j = st.pop(); for (const k of gNb(j)) { if (b[k] < 0) libs.add(k); else if (b[k] === col && !seen.has(k)) { seen.add(k); st.push(k); } } } return { stones: [...seen], libs }; }
function gPlace(s, i) { // returns new board info or null if illegal
  if (s.b[i] >= 0 || i === s.ko) return null; const b = s.b.slice(), t = s.t; b[i] = t; let caps = [];
  for (const k of gNb(i)) if (b[k] === 1 - t) { const g = gGroup(b, k); if (!g.libs.size) { g.stones.forEach(x => b[x] = -1); caps = caps.concat(g.stones); } }
  const own = gGroup(b, i); if (!own.libs.size) return null;
  return { b, caps, own };
}
function gScoreArea(b) { const sc = [0, 6.5], seen = new Set(); b.forEach((v, i) => { if (v >= 0) sc[v]++; });
  for (let i = 0; i < 81; i++) { if (b[i] >= 0 || seen.has(i)) continue; const st = [i], reg = [i], border = new Set(); seen.add(i); while (st.length) { const j = st.pop(); for (const k of gNb(j)) { if (b[k] < 0 && !seen.has(k)) { seen.add(k); st.push(k); reg.push(k); } else if (b[k] >= 0) border.add(b[k]); } } if (border.size === 1) sc[[...border][0]] += reg.length; }
  return sc; }
TB.go = {
  seats: ['Black', 'White'], init: () => ({ b: Array(81).fill(-1), t: 0, ko: -1, pass: 0, cap: [0, 0], n: 0 }), turn: s => s.t,
  moves(s) { if (s.pass >= 2) return []; const m = []; for (let i = 0; i < 81; i++) if (gPlace(s, i)) m.push(i); m.push('pass'); return m; },
  play(s, m) { if (m === 'pass') return { ...s, t: 1 - s.t, ko: -1, pass: s.pass + 1, n: s.n + 1, last: -1 }; const r = gPlace(s, m); const cap = s.cap.slice(); cap[s.t] += r.caps.length; const ko = r.caps.length === 1 && r.own.stones.length === 1 && r.own.libs.size === 1 ? r.caps[0] : -1; return { b: r.b, t: 1 - s.t, ko, pass: 0, cap, n: s.n + 1, last: m }; },
  result(s) { if (s.pass < 2) return null; const sc = gScoreArea(s.b); return { winner: sc[0] > sc[1] ? 0 : 1, score: sc }; },
  ai(s, level, ms) {
    const t = s.t; if (s.pass === 1) { const sc = gScoreArea(s.b); if (sc[t] > sc[1 - t]) return 'pass'; }
    let best = 'pass', bv = 0.5;
    for (const i of ms) { if (i === 'pass') continue; const r = gPlace(s, i); let v = r.caps.length * 12 + Math.min(r.own.libs.size, 4);
      if (r.own.libs.size === 1 && !r.caps.length) v -= 15;
      const nb = gNb(i); if (nb.every(k => s.b[k] === t)) { const saving = nb.some(k => gGroup(s.b, k).libs.size === 1); if (!saving) v -= 30; }
      for (const k of nb) { if (s.b[k] === t && gGroup(s.b, k).libs.size === 1 && r.own.libs.size >= 2) v += 14; if (r.b[k] === 1 - t && gGroup(r.b, k).libs.size === 1) v += 6; }
      const rr = i / GN | 0, cc = i % GN; const edge = Math.min(rr, cc, 8 - rr, 8 - cc); if (s.n < 24) v += edge === 0 ? -4 : edge === 2 ? 3 : 1;
      if (nb.some(k => s.b[k] >= 0)) v += 1.5;
      v += Math.random() * (11 - level) * 2.2;
      if (v > bv) { bv = v; best = i; } }
    return s.n < 6 && best === 'pass' ? ms[R(ms.length - 1)] : best;
  },
  view(s, x) {
    const legal = x.can ? new Set(TB.go.moves(s)) : new Set(); const P = i => [6 + (i % GN) * 11, 6 + (i / GN | 0) * 11];
    let ln = ''; for (let k = 0; k < GN; k++) ln += `<line x1="6" y1="${6 + k * 11}" x2="94" y2="${6 + k * 11}"/><line x1="${6 + k * 11}" y1="6" x2="${6 + k * 11}" y2="94"/>`;
    const stars = [20, 24, 40, 56, 60].map(i => { const [a, b] = P(i); return `<circle cx="${a}" cy="${b}" r="1" class="star"/>`; }).join('');
    const pts = s.b.map((v, i) => { const [a, b] = P(i); return `<g ${legal.has(i) ? `data-i="${i}"` : ''} class="${legal.has(i) ? 'tg' : ''}"><rect x="${a - 5.5}" y="${b - 5.5}" width="11" height="11" class="hit"/>${v >= 0 ? `<circle cx="${a}" cy="${b}" r="4.8" class="gs g${v}"/>${i === s.last ? `<circle cx="${a}" cy="${b}" r="1.6" class="lastdot"/>` : ''}` : ''}</g>`; }).join('');
    x.el.innerHTML = `<div class="score2"><span>Black captures ${s.cap[0]}</span><span>White captures ${s.cap[1]} · komi 6.5</span></div><svg class="bd goB" viewBox="0 0 100 100"><rect width="100" height="100" class="wood"/>${ln}${stars}${pts}</svg><div class="row-btns"><button class="btn" data-i="pass" ${x.can ? '' : 'disabled'}>Pass</button>${s.pass === 1 ? '<span class="muted">Opponent passed. Pass again to end and count.</span>' : ''}</div>`;
    x.on(d => x.act(d === 'pass' ? 'pass' : +d));
  }
};

// ---------- Cards helpers ----------
const SUITS = ['S', 'H', 'D', 'C'], SUITG = { S: '♠', H: '♥', D: '♦', C: '♣' }, RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const deck52 = () => shuf(SUITS.flatMap(s => RANKS.map(r => r + s)));
const cRank = c => c.slice(0, -1), cSuit = c => c.slice(-1), cVal = c => RANKS.indexOf(cRank(c));
const cardHTML = (c, attrs = '', cls = '') => c ? `<button class="card ${'HD'.includes(cSuit(c)) ? 'red' : ''} ${cls}" ${attrs}><b>${cRank(c)}</b><i>${SUITG[cSuit(c)]}</i></button>` : `<button class="card back ${cls}" ${attrs}></button>`;

// ---------- Crazy Eights ----------
TB.crazy8 = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5'],
  init(n) { const d = deck52(), hands = []; for (let p = 0; p < n; p++) hands.push(d.splice(0, n === 2 ? 7 : 5)); let top = d.shift(); while (cRank(top) === '8') { d.push(top); top = d.shift(); } return { n, deck: d, disc: [top], hands, suit: cSuit(top), t: 0, drew: 0, turns: 0 }; },
  turn: s => s.t,
  moves(s) { if (TB.crazy8.result(s)) return []; const h = s.hands[s.t], top = s.disc[s.disc.length - 1], m = [];
    h.forEach((c, i) => { if (cRank(c) === '8') SUITS.forEach(su => m.push({ c: i, s: su })); else if (cSuit(c) === s.suit || cRank(c) === cRank(top)) m.push({ c: i }); });
    if (!m.length) m.push(s.drew < 3 && (s.deck.length || s.disc.length > 1) ? 'draw' : 'pass'); return m; },
  play(s, m) { const n = cl(s); n.turns++;
    if (m === 'draw') { if (!n.deck.length) { const top = n.disc.pop(); n.deck = shuf(n.disc); n.disc = [top]; } if (n.deck.length) n.hands[n.t].push(n.deck.shift()); n.drew++; n.log = 'drew a card'; return n; }
    if (m === 'pass') { n.t = (n.t + 1) % n.n; n.drew = 0; n.log = 'passed'; return n; }
    const c = n.hands[n.t].splice(m.c, 1)[0]; n.disc.push(c); n.suit = m.s || cSuit(c); n.drew = 0; n.log = `played ${cRank(c)}${SUITG[cSuit(c)]}${m.s ? ' and called ' + SUITG[m.s] : ''}`; n.who = n.t; if (n.hands[n.t].length) n.t = (n.t + 1) % n.n; return n; },
  result(s) { const w = s.hands.findIndex(h => !h.length); if (w >= 0) return { winner: w }; if (s.turns > 500) { let b = 0; s.hands.forEach((h, i) => { if (h.length < s.hands[b].length) b = i; }); return { winner: b }; } return null; },
  ai(s, level, ms) { if (noisy(level)) return ms[R(ms.length)]; const h = s.hands[s.t], cnt = {}; h.forEach(c => { if (cRank(c) !== '8') cnt[cSuit(c)] = (cnt[cSuit(c)] || 0) + 1; }); const fav = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 'S';
    const non8 = ms.filter(m => m.c !== undefined && !m.s); if (non8.length) return non8.sort((a, b) => (cnt[cSuit(h[b.c])] || 0) - (cnt[cSuit(h[a.c])] || 0))[0];
    return ms.find(m => m.s === fav) || ms[0]; },
  view(s, x) {
    const top = s.disc[s.disc.length - 1], me = x.me, ms = x.can ? TB.crazy8.moves(s) : [];
    const playable = new Set(ms.filter(m => m.c !== undefined).map(m => m.c));
    const others = s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}</span><div class="fan">${h.map(() => '<i class="mini"></i>').join('')}</div><small>${h.length} cards</small></div>`).join('');
    const mine = me >= 0 ? s.hands[me].map((c, i) => cardHTML(c, `data-i="c${i}" ${playable.has(i) ? '' : 'disabled'}`, playable.has(i) ? 'ok' : '')).join('') : '';
    x.el.innerHTML = `<div class="ctable"><div class="opps">${others}</div><div class="pile">${cardHTML(null, 'disabled')}<small>${s.deck.length} left</small>${cardHTML(top, 'disabled')}<span class="suitnow">Suit: <b class="${'HD'.includes(s.suit) ? 'red' : ''}">${SUITG[s.suit]}</b></span></div><p class="muted small">${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' : ''}${esc(s.log || '')}</p>
      ${x.sel != null ? `<div class="suitpick">Choose a suit: ${SUITS.map(su => `<button class="btn" data-i="s${su}">${SUITG[su]}</button>`).join('')}</div>` : ''}
      <div class="hand">${mine}</div>${ms.includes('draw') ? '<button class="btn hot" data-i="draw">Draw a card</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}</div>`;
    x.on(d => { if (d === 'draw' || d === 'pass') return x.act(d); if (d[0] === 's') { const m = ms.find(m => m.c === x.sel && m.s === d.slice(1)); x.sel = null; if (m) x.act(m); return; } const i = +d.slice(1); const opts = ms.filter(m => m.c === i); if (!opts.length) return; if (opts[0].s) { x.sel = i; x.redraw(); } else x.act(opts[0]); });
  }
};

// ---------- War ----------
TB.war = {
  seats: ['North', 'South'],
  init() { const d = deck52(); return { piles: [d.slice(0, 26), d.slice(26)], table: [], up: [null, null], t: 0, rounds: 0, last: null }; }, turn: s => s.t,
  moves: s => TB.war.result(s) ? [] : ['flip'],
  play(s) { const n = cl(s); const c = n.piles[n.t].shift(); n.up[n.t] = c; n.table.push(c);
    if (n.up[0] && n.up[1]) { const a = cVal(n.up[0]) || 13, b = cVal(n.up[1]) || 13; // ace high
      if (a === b) { for (const p of [0, 1]) n.table.push(...n.piles[p].splice(0, Math.min(3, Math.max(0, n.piles[p].length - 1)))); n.last = { a: n.up[0], b: n.up[1], w: -1 }; }
      else { const w = a > b ? 0 : 1; n.piles[w].push(...shuf(n.table)); n.table = []; n.last = { a: n.up[0], b: n.up[1], w }; }
      n.up = [null, null]; n.t = 0; n.rounds++; } else n.t = 1 - n.t;
    return n; },
  result(s) { if (!s.up[0] && !s.up[1]) { if (!s.piles[0].length) return { winner: 1 }; if (!s.piles[1].length) return { winner: 0 }; } else if (!s.piles[s.t].length) return { winner: 1 - s.t }; if (s.rounds >= 300) return { winner: s.piles[0].length > s.piles[1].length ? 0 : s.piles[1].length > s.piles[0].length ? 1 : -1 }; return null; },
  ai: () => 'flip',
  view(s, x) { const L = s.last;
    x.el.innerHTML = `<div class="ctable war"><div class="opp"><span>${esc(x.names[1] || 'South')}</span><small>${s.piles[1].length} cards</small></div><div class="pile">${cardHTML(s.up[0] || (L && L.a), 'disabled')}<span class="vs">vs</span>${cardHTML(s.up[1] || (L && L.b), 'disabled')}</div><p class="muted">${L && !s.up[0] ? (L.w < 0 ? 'War! Three cards each go face down.' : esc(x.names[L.w] || '') + ' takes the cards.') : ''} Round ${s.rounds} · ${s.table.length} on the table</p><div class="opp"><span>${esc(x.names[0] || 'North')}</span><small>${s.piles[0].length} cards</small></div><button class="btn hot" data-i="flip" ${x.can ? '' : 'disabled'}>Flip your card</button></div>`;
    x.on(() => x.act('flip')); }
};

// ---------- Yacht ----------
const YC = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Three of a kind', 'Four of a kind', 'Full house', 'Small straight', 'Large straight', 'Yacht', 'Chance'];
function yScore(k, d) { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++); const sum = d.reduce((a, b) => a + b, 0), mx = Math.max(...c), has = s => s.every(v => c[v]);
  if (k < 6) return c[k + 1] * (k + 1); switch (k) { case 6: return mx >= 3 ? sum : 0; case 7: return mx >= 4 ? sum : 0; case 8: return c.includes(3) && c.includes(2) ? 25 : 0; case 9: return has([1,2,3,4]) || has([2,3,4,5]) || has([3,4,5,6]) ? 30 : 0; case 10: return has([1,2,3,4,5]) || has([2,3,4,5,6]) ? 40 : 0; case 11: return mx === 5 ? 50 : 0; default: return sum; } }
const yTotal = sc => { let up = 0, t = 0; for (const [k, v] of Object.entries(sc)) { t += v; if (+k < 6) up += v; } return t + (up >= 63 ? 35 : 0); };
TB.yacht = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'],
  init: n => ({ n, d: [1, 2, 3, 4, 5], held: [0, 0, 0, 0, 0], rolls: 0, t: 0, sc: [...Array(n)].map(() => ({})) }), turn: s => s.t,
  moves(s) { if (TB.yacht.result(s)) return []; const m = []; if (s.rolls < 3) m.push('roll'); if (s.rolls > 0) { if (s.rolls < 3) for (let i = 0; i < 5; i++) m.push({ h: i }); YC.forEach((_, k) => { if (s.sc[s.t][k] === undefined) m.push({ k }); }); } return m; },
  play(s, m) { const n = cl(s);
    if (m === 'roll') { n.d = n.d.map((v, i) => n.held[i] ? v : 1 + R(6)); n.rolls++; }
    else if (m.h !== undefined) n.held[m.h] ^= 1;
    else { n.sc[n.t][m.k] = yScore(m.k, n.d); n.log = { who: n.t, k: m.k, v: n.sc[n.t][m.k] }; n.held = [0, 0, 0, 0, 0]; n.rolls = 0; n.t = (n.t + 1) % n.n; }
    return n; },
  result(s) { if (!s.sc.every(c => Object.keys(c).length === 13)) return null; const tot = s.sc.map(yTotal), mx = Math.max(...tot), w = tot.filter(v => v === mx).length > 1 ? -1 : tot.indexOf(mx); return { winner: w, score: tot }; },
  ai(s, level, ms) {
    if (s.rolls === 0) return 'roll'; const open = YC.map((_, k) => k).filter(k => s.sc[s.t][k] === undefined), d = s.d;
    const pick = () => { let best = open[0], bv = -1e9; for (const k of open) { let v = yScore(k, d); if (k < 6) v = v * 1.1 + (v >= (k + 1) * 3 ? 8 : -2); if (k === 12) v -= 12; if (k === 11 && !v) v = -6; if (k === 0 && !v) v = -1; if (!v && k >= 6) v -= 8 + k; v += noisy(level) ? Math.random() * 30 : 0; if (v > bv) { bv = v; best = k; } } return { k: best }; };
    if (s.rolls === 3) return pick();
    for (const k of [11, 10, 8]) if (open.includes(k) && yScore(k, d) > 0) return { k };
    const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++); let want;
    const run = [[1,2,3,4],[2,3,4,5],[3,4,5,6]].find(r => r.filter(v => c[v]).length >= 3);
    if (run && (open.includes(9) || open.includes(10)) && Math.max(...c) < 3) { const keep = new Set(); want = d.map(v => run.includes(v) && !keep.has(v) && keep.add(v) ? 1 : 0); }
    else { let bestV = 6; for (let v = 6; v >= 1; v--) if (c[v] > c[bestV]) bestV = v; want = d.map(v => v === bestV ? 1 : 0); }
    if (noisy(level)) want = d.map(() => R(2));
    for (let i = 0; i < 5; i++) if (want[i] !== s.held[i]) return { h: i };
    return 'roll';
  },
  view(s, x) {
    const ms = x.can ? TB.yacht.moves(s) : [], can = k => ms.some(m => m.k === k);
    const pips = v => `<span class="die">${[...Array(9)].map((_, k) => `<i class="${({1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]})[v].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`;
    const head = `<tr><th>Category</th>${s.sc.map((_, i) => `<th class="${i === s.t ? 'turn' : ''}">${esc(x.names[i] || 'Seat ' + (i + 1))}</th>`).join('')}</tr>`;
    const rows = YC.map((nm, k) => `<tr><td>${nm}</td>${s.sc.map((c, i) => c[k] !== undefined ? `<td class="num">${c[k]}</td>` : i === s.t && s.rolls > 0 && can(k) ? `<td class="num"><button class="chip" data-i="k${k}">+${yScore(k, s.d)}</button></td>` : '<td></td>').join('')}</tr>`).join('');
    x.el.innerHTML = `<div class="yacht"><div class="dice">${s.d.map((v, i) => `<button class="dbtn ${s.held[i] ? 'held' : ''}" data-i="h${i}" ${x.can && s.rolls > 0 && s.rolls < 3 ? '' : 'disabled'}>${s.rolls ? pips(v) : '<span class="die blank"></span>'}<small>${s.held[i] ? 'Held' : ''}</small></button>`).join('')}</div>
      <div class="row-btns"><button class="btn hot" data-i="roll" ${ms.includes('roll') ? '' : 'disabled'}>${s.rolls ? `Roll again (${3 - s.rolls} left)` : 'Roll dice'}</button><span class="muted small">Tap dice to hold them between rolls, then choose a category.</span></div>
      <table class="ytab">${head}${rows}<tr class="tot"><td>Total (upper bonus 35 at 63+)</td>${s.sc.map(c => `<td class="num">${yTotal(c)}</td>`).join('')}</tr></table></div>`;
    x.on(d => { if (d === 'roll') x.act('roll'); else if (d[0] === 'h') x.act({ h: +d.slice(1) }); else x.act({ k: +d.slice(1) }); });
  }
};

// ---------- Pig ----------
TB.pig = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'], init: n => ({ n, sc: Array(n).fill(0), cur: 0, t: 0, d: 0, log: '' }), turn: s => s.t,
  moves: s => TB.pig.result(s) ? [] : s.cur > 0 ? ['roll', 'hold'] : ['roll'],
  play(s, m) { const n = cl(s); if (m === 'roll') { n.d = 1 + R(6); if (n.d === 1) { n.log = 'rolled a 1 and lost ' + n.cur; n.cur = 0; n.t = (n.t + 1) % n.n; } else { n.cur += n.d; n.log = 'rolled ' + n.d; } } else { n.sc[n.t] += n.cur; n.log = 'banked ' + n.cur; n.cur = 0; if (n.sc[n.t] < 100) n.t = (n.t + 1) % n.n; } n.who = s.t; return n; },
  result: s => { const w = s.sc.findIndex(v => v >= 100); return w >= 0 ? { winner: w, score: s.sc } : null; },
  ai(s, level) { if (s.cur === 0) return 'roll'; if (s.sc[s.t] + s.cur >= 100) return 'hold'; const lead = Math.max(...s.sc.filter((_, i) => i !== s.t)); const target = level >= 7 ? (lead >= 80 ? 30 : 21) : 8 + R(level * 3 + 4); return s.cur >= target ? 'hold' : 'roll'; },
  view(s, x) { x.el.innerHTML = `<div class="pig"><div class="pigs">${s.sc.map((v, i) => `<div class="pg ${i === s.t ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}</span><b>${v}</b><div class="bar"><i style="width:${Math.min(100, v)}%"></i></div></div>`).join('')}</div><div class="bigdie">${s.d || '–'}</div><p>Turn total: <b>${s.cur}</b></p><p class="muted small">${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' + esc(s.log) : ''}</p><div class="row-btns"><button class="btn hot" data-i="roll" ${x.can ? '' : 'disabled'}>Roll</button><button class="btn" data-i="hold" ${x.can && s.cur ? '' : 'disabled'}>Hold and bank</button></div></div>`; x.on(d => x.act(d)); }
};

// ---------- Rock Paper Scissors ----------
const RPS = ['rock', 'paper', 'scissors'];
TB.rps = {
  seats: ['Player 1', 'Player 2'], init: () => ({ p: [null, null], sc: [0, 0], hist: [[], []], last: null }),
  turn: s => s.p[0] === null ? 0 : 1,
  moves: s => TB.rps.result(s) ? [] : [0, 1, 2],
  play(s, m) { const n = cl(s), t = TB.rps.turn(s); n.p[t] = m; if (n.p[0] !== null && n.p[1] !== null) { const a = n.p[0], b = n.p[1], w = a === b ? -1 : (a - b + 3) % 3 === 1 ? 0 : 1; if (w >= 0) n.sc[w]++; n.hist[0].push(a); n.hist[1].push(b); n.last = { a, b, w }; n.p = [null, null]; } return n; },
  result: s => s.sc[0] >= 3 ? { winner: 0, score: s.sc } : s.sc[1] >= 3 ? { winner: 1, score: s.sc } : null,
  ai(s, level) { const opp = s.hist[1 - TB.rps.turn(s)]; if (opp.length < 2 || noisy(level)) return R(3); const f = [0, 0, 0]; opp.forEach((v, i) => f[v] += 1 + i / opp.length); const guess = f.indexOf(Math.max(...f)); return (guess + 1) % 3; },
  view(s, x) { const L = s.last;
    const pic = v => `<svg viewBox="0 0 40 40" class="rpsi">${v === 0 ? '<circle cx="20" cy="22" r="13"/>' : v === 1 ? '<rect x="9" y="6" width="22" height="28" rx="2"/>' : '<path d="M12 8 L28 32 M28 8 L12 32" stroke-width="4"/><circle cx="12" cy="32" r="4"/><circle cx="28" cy="32" r="4"/>'}</svg>`;
    x.el.innerHTML = `<div class="rps"><div class="score2"><span>${esc(x.names[0] || 'P1')} ${s.sc[0]}</span><span>${esc(x.names[1] || 'P2')} ${s.sc[1]}</span></div>${L ? `<div class="rpsl"><div>${pic(L.a)}<small>${RPS[L.a]}</small></div><b>${L.w < 0 ? 'Tie' : esc(x.names[L.w] || '') + ' wins the round'}</b><div>${pic(L.b)}<small>${RPS[L.b]}</small></div></div>` : '<p class="muted">First to three round wins.</p>'}
      <p class="muted small">${s.p[0] !== null ? esc(x.names[0] || '') + ' has chosen.' : ''}</p><div class="row-btns">${RPS.map((r, i) => `<button class="btn big" data-i="${i}" ${x.can ? '' : 'disabled'}>${pic(i)}<span>${r}</span></button>`).join('')}</div></div>`;
    x.on(d => x.act(+d)); }
};
