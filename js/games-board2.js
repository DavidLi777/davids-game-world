// More turn-based games: race, abstract strategy and dice games.
const roll6 = () => 1 + R(6);
const sum = a => a.reduce((x, y) => x + y, 0);
const pickBest = (ms, score, level) => { let best = ms[0], bv = -Infinity; for (const m of ms) { const v = score(m) + Math.random() * (11 - level) * (level < 4 ? 40 : 6); if (v > bv) { bv = v; best = m; } } return best; };
const diceFace = v => `<span class="die sm">${[...Array(9)].map((_, k) => `<i class="${({1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]})[v]?.includes(k) ? 'on' : ''}"></i>`).join('')}</span>`;
const seatDot = i => `<i class="sdot" style="background:${SEATCOL[i % 8]}"></i>`;

// ---------- Backgammon ----------
function bgSingle(s) { // single-checker moves with current dice
  const t = s.t, out = [], dir = t ? 1 : -1, own = v => t ? v < 0 : v > 0, opp2 = v => t ? v >= 2 : v <= -2, p = s.p;
  const home = t ? [18, 23] : [0, 5]; const allHome = !s.bar[t] && p.every((v, i) => !own(v) || (i >= home[0] && i <= home[1]));
  for (const d of [...new Set(s.dice)]) {
    if (s.bar[t]) { const to = t ? d - 1 : 24 - d; if (!opp2(p[to])) out.push({ f: -1, d }); continue; }
    for (let f = 0; f < 24; f++) { if (!own(p[f])) continue; const to = f + dir * d;
      if (to >= 0 && to <= 23) { if (!opp2(p[to])) out.push({ f, d }); }
      else if (allHome) { const exact = t ? to === 24 : to === -1; const further = t ? p.slice(home[0], f).some(own) : p.slice(f + 1, 6).some(own); if (exact || !further) out.push({ f, d }); } }
  }
  return out;
}
function bgApply(s, m) { const n = { ...s, p: s.p.slice(), bar: s.bar.slice(), off: s.off.slice(), dice: s.dice.slice() }, t = s.t, sg = t ? -1 : 1;
  n.dice.splice(n.dice.indexOf(m.d), 1); let to;
  if (m.f < 0) { n.bar[t]--; to = t ? m.d - 1 : 24 - m.d; } else { n.p[m.f] -= sg; to = m.f + (t ? m.d : -m.d); }
  if (to < 0 || to > 23) n.off[t]++; else { if (n.p[to] === -sg) { n.p[to] = 0; n.bar[1 - t]++; n.hit = true; } n.p[to] += sg; }
  return n; }
function bgMax(s, depth = 0) { if (!s.dice.length || depth > 4) return 0; let best = 0; for (const m of bgSingle(s)) { best = Math.max(best, 1 + bgMax(bgApply(s, m), depth + 1)); if (best === s.dice.length) break; } return best; }
TB.backgammon = {
  seats: ['White', 'Red'],
  init() { const p = Array(24).fill(0); p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5; return { p, bar: [0, 0], off: [0, 0], t: 0, dice: [], rolled: false }; },
  turn: s => s.t,
  moves(s) { if (TB.backgammon.result(s)) return []; if (!s.rolled) return ['roll']; const ms = bgSingle(s); if (!ms.length) return ['pass'];
    const mx = bgMax(s); let ok = ms.filter(m => 1 + bgMax(bgApply(s, m)) === mx);
    if (mx === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]) { const hi = Math.max(...s.dice); if (ok.some(m => m.d === hi)) ok = ok.filter(m => m.d === hi); }
    return ok.length ? ok : ['pass']; },
  play(s, m) { if (m === 'roll') { const a = roll6(), b = roll6(); return { ...s, dice: a === b ? [a, a, a, a] : [a, b], rolled: true, last: null }; }
    if (m === 'pass') return { ...s, dice: [], rolled: false, t: 1 - s.t };
    const n = bgApply(s, m); n.last = m; n.hit = false; if (!n.dice.length || !bgSingle(n).length) { n.dice = []; n.rolled = false; n.t = 1 - s.t; } return n; },
  result: s => s.off[0] === 15 ? { winner: 0 } : s.off[1] === 15 ? { winner: 1 } : null,
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; const t = s.t;
    const ev = n => { let v = (n.off[t] - n.off[1 - t]) * 12 + n.bar[1 - t] * 14 - n.bar[t] * 14; const own = x => t ? x < 0 : x > 0; let pip = 0, opip = 0;
      n.p.forEach((x, i) => { const c = Math.abs(x); if (own(x)) { pip += c * (t ? 24 - i : i + 1); if (c === 1) v -= 5; if (c >= 2) v += 3; } else if (x) opip += c * (t ? i + 1 : 24 - i); }); return v + (opip - pip) * 0.6; };
    return pickBest(ms, m => ev(bgApply(s, m)), level); },
  view(s, x) {
    const ms = x.can ? TB.backgammon.moves(s) : [], sel = x.sel, srcs = new Set(ms.filter(m => m.f !== undefined).map(m => m.f)), tgt = new Map();
    if (sel !== null && sel !== undefined) ms.filter(m => m.f === sel).forEach(m => { const to = sel < 0 ? (s.t ? m.d - 1 : 24 - m.d) : sel + (s.t ? m.d : -m.d); tgt.set(to < 0 || to > 23 ? 'off' : to, m); });
    const pt = i => { const v = s.p[i], c = Math.abs(v), col = v > 0 ? 'w' : 'r'; return `<button class="bgp ${i < 12 ? 'bot' : 'top'} ${(i + (i < 12 ? 0 : 1)) % 2 ? 'a' : 'b'} ${srcs.has(i) ? 'src' : ''} ${sel === i ? 'sel' : ''} ${tgt.has(i) ? 'tg' : ''}" data-i="${i}" ${srcs.has(i) || tgt.has(i) ? '' : 'disabled'}><span>${[...Array(Math.min(c, 5))].map((_, k) => `<i class="bgc ${col}">${k === 4 && c > 5 ? c : ''}</i>`).join('')}</span></button>`; };
    const top = [12, 13, 14, 15, 16, 17, 'bar', 18, 19, 20, 21, 22, 23], bot = [11, 10, 9, 8, 7, 6, 'bar', 5, 4, 3, 2, 1, 0];
    const bar = k => `<button class="bgbar ${srcs.has(-1) && s.t === k ? 'src' : ''} ${sel === -1 ? 'sel' : ''}" data-i="-1" ${srcs.has(-1) && s.t === k ? '' : 'disabled'}>${[...Array(s.bar[k])].map(() => `<i class="bgc ${k ? 'r' : 'w'}"></i>`).join('')}</button>`;
    x.el.innerHTML = `<div class="score2"><span>White off ${s.off[0]} · bar ${s.bar[0]}</span><span>${s.dice.map(diceFace).join('')}</span><span>Red off ${s.off[1]} · bar ${s.bar[1]}</span></div>
      <div class="bd bg"><div class="bgrow">${top.map(i => i === 'bar' ? bar(1) : pt(i)).join('')}</div><div class="bgrow">${bot.map(i => i === 'bar' ? bar(0) : pt(i)).join('')}</div></div>
      <div class="row-btns">${ms.includes('roll') ? '<button class="btn hot" data-i="roll">Roll dice</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">No move: pass</button>' : ''}${tgt.has('off') ? '<button class="btn hot" data-i="off">Bear off</button>' : ''}<span class="muted small">White moves toward the bottom right; Red toward the top right.</span></div>`;
    x.on(d => { if (d === 'roll' || d === 'pass') return x.act(d); if (d === 'off') { x.act(tgt.get('off')); x.sel = null; return; } const i = +d; if (tgt.has(i)) { const m = tgt.get(i); x.sel = null; x.act(m); } else if (srcs.has(i)) { x.sel = i; x.redraw(); } });
  }
};

// ---------- Hop-race engine (Star Checkers, Halma) ----------
function hopRace(cfg) { // cfg: cells [[r,c]], nb(r,c)->[[dr,dc]], camps [setA,setB], seats, render
  const key = (r, c) => r + ',' + c, idx = new Map(cfg.cells.map((p, i) => [key(p[0], p[1]), i]));
  const at = (r, c) => idx.has(key(r, c)) ? idx.get(key(r, c)) : -1;
  const goal = [cfg.camps[1], cfg.camps[0]];
  const dist = (i, p) => { const g = cfg.target[p]; return Math.abs(cfg.cells[i][0] - g[0]) + Math.abs(cfg.cells[i][1] - g[1]) * (cfg.cw || 1); };
  const G = {
    seats: cfg.seats,
    init() { const b = Array(cfg.cells.length).fill(-1); cfg.camps[0].forEach(i => b[i] = 0); cfg.camps[1].forEach(i => b[i] = 1); return { b, t: 0, n: 0 }; }, turn: s => s.t,
    moves(s) { if (G.result(s)) return []; const out = [];
      s.b.forEach((v, i) => { if (v !== s.t) return; const [r, c] = cfg.cells[i]; const seen = new Set([i]);
        for (const [dr, dc] of cfg.dirs) { const j = at(r + dr, c + dc); if (j >= 0 && s.b[j] < 0) out.push({ f: i, t: j }); }
        const q = [i]; while (q.length) { const k = q.pop(); const [kr, kc] = cfg.cells[k]; for (const [dr, dc] of cfg.dirs) { const m = at(kr + dr, kc + dc), l = at(kr + 2 * dr, kc + 2 * dc); if (m >= 0 && l >= 0 && s.b[m] >= 0 && s.b[l] < 0 && !seen.has(l)) { seen.add(l); q.push(l); out.push({ f: i, t: l }); } } } });
      return out; },
    play(s, m) { const b = s.b.slice(); b[m.t] = b[m.f]; b[m.f] = -1; return { b, t: 1 - s.t, n: s.n + 1, last: [m.f, m.t] }; },
    result(s) { for (const p of [0, 1]) { const g = goal[p]; const inG = g.filter(i => s.b[i] === p).length; if (inG === g.length || (g.every(i => s.b[i] >= 0) && inG > 0)) return { winner: p }; } return s.n > 400 ? { winner: -1 } : null; },
    eval(s, me) { let v = 0; s.b.forEach((p, i) => { if (p < 0) return; const d = dist(i, p); v += p === me ? -d * d * 0.2 - d : d * d * 0.2 + d; }); return v; },
    ai(s, level, ms) { const me = s.t; return pickBest(ms, m => dist(m.f, me) - dist(m.t, me) + (dist(m.f, me) > 6 ? 0.3 : 0) - (goal[me].includes(m.f) && !goal[me].includes(m.t) ? 5 : 0), level); },
    view(s, x) { const ms = x.can ? G.moves(s) : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m)); const last = new Set(s.last || []);
      x.el.innerHTML = cfg.render(s, (i, v) => `<button data-i="${i}" class="hole ${v >= 0 ? 'p' + v : ''} ${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''} ${last.has(i) ? 'last' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}></button>`);
      x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
  };
  return G;
}
(() => { // Star board: rows of holes in doubled coordinates
  const L = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1], cells = [];
  L.forEach((n, r) => { for (let i = 0; i < n; i++) cells.push([r, 2 * i - (n - 1)]); });
  const camp = rows => cells.map((c, i) => rows.includes(c[0]) ? i : -1).filter(i => i >= 0);
  TB.starcheckers = hopRace({ cells, dirs: [[0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [-1, -1]], camps: [camp([0, 1, 2, 3]), camp([13, 14, 15, 16])], target: [[16, 0], [0, 0]], cw: 0.5, seats: ['Gold (top)', 'Blue (bottom)'],
    render: (s, hole) => `<div class="bd star">${L.map((n, r) => `<div class="srow">${cells.map((c, i) => c[0] === r ? hole(i, s.b[i]) : '').join('')}</div>`).join('')}</div>` });
  const N = 10, sq = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) sq.push([r, c]);
  const cA = sq.map((p, i) => p[0] + p[1] <= 4 ? i : -1).filter(i => i >= 0), cB = sq.map((p, i) => (N - 1 - p[0]) + (N - 1 - p[1]) <= 4 ? i : -1).filter(i => i >= 0);
  TB.halma = hopRace({ cells: sq, dirs: D8, camps: [cA, cB], target: [[N - 1, N - 1], [0, 0]], seats: ['Gold', 'Blue'],
    render: (s, hole) => `<div class="bd halma">${sq.map((p, i) => `<div class="hc ${cA.includes(i) ? 'ca' : cB.includes(i) ? 'cb' : ''}">${hole(i, s.b[i])}</div>`).join('')}</div>` });
})();

// ---------- Xiangqi ----------
const XV = { K: 0, A: 200, E: 200, H: 400, R: 900, C: 450, P: 100 }, XG = { K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵', k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒' };
const xRed = p => p && p < 'a';
function xPseudo(b, t) { const ms = [], mine = p => p && (t === 0 ? xRed(p) : !xRed(p)), at = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9 ? b[r * 9 + c] : null;
  for (let i = 0; i < 90; i++) { const p = b[i]; if (!mine(p)) continue; const r = i / 9 | 0, c = i % 9, u = p.toUpperCase(); const add = (rr, cc) => { const q = at(rr, cc); if (q === null || mine(q)) return; ms.push({ f: i, t: rr * 9 + cc }); };
    const inPal = (rr, cc) => cc >= 3 && cc <= 5 && (t === 0 ? rr >= 7 : rr <= 2);
    if (u === 'K') [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => inPal(r + dr, c + dc) && add(r + dr, c + dc));
    else if (u === 'A') [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => inPal(r + dr, c + dc) && add(r + dr, c + dc));
    else if (u === 'E') [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => { const rr = r + dr; if ((t === 0 ? rr < 5 : rr > 4) || at(r + dr / 2, c + dc / 2) !== '') return; add(rr, c + dc); });
    else if (u === 'H') [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { if (at(r + dr, c + dc) !== '') return; (dr ? [[2 * dr, 1], [2 * dr, -1]] : [[1, 2 * dc], [-1, 2 * dc]]).forEach(([a, bb]) => add(r + a, c + bb)); });
    else if (u === 'R' || u === 'C') for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let rr = r + dr, cc = c + dc, jumped = false; while (at(rr, cc) !== null) { const q = at(rr, cc); if (!jumped) { if (q === '') ms.push({ f: i, t: rr * 9 + cc }); else { if (u === 'R') { if (!mine(q)) ms.push({ f: i, t: rr * 9 + cc }); break; } jumped = true; } } else if (q) { if (!mine(q)) ms.push({ f: i, t: rr * 9 + cc }); break; } rr += dr; cc += dc; } }
    else if (u === 'P') { const fw = t === 0 ? -1 : 1; add(r + fw, c); const crossed = t === 0 ? r <= 4 : r >= 5; if (crossed) { add(r, c - 1); add(r, c + 1); } } }
  return ms; }
function xMake(s, m) { const b = s.b.slice(), cap = b[m.t]; b[m.t] = b[m.f]; b[m.f] = ''; return { b, t: 1 - s.t, n: s.n + 1, np: cap ? 0 : s.np + 1, last: [m.f, m.t] }; }
function xInCheck(b, t) { const k = b.indexOf(t === 0 ? 'K' : 'k'), ok = b.indexOf(t === 0 ? 'k' : 'K'); if (k < 0) return true;
  if (ok >= 0 && k % 9 === ok % 9) { let clear = true; for (let i = Math.min(k, ok) + 9; i < Math.max(k, ok); i += 9) if (b[i]) { clear = false; break; } if (clear) return true; }
  return xPseudo(b, 1 - t).some(m => m.t === k); }
const xLegal = s => xPseudo(s.b, s.t).filter(m => !xInCheck(xMake(s, m).b, s.t));
TB.xiangqi = {
  seats: ['Red', 'Black'],
  init() { const b = Array(90).fill(''), back = 'rheakaehr'; for (let c = 0; c < 9; c++) { b[c] = back[c]; b[81 + c] = back[c].toUpperCase(); } b[19] = b[25] = 'c'; b[64] = b[70] = 'C'; [0, 2, 4, 6, 8].forEach(c => { b[27 + c] = 'p'; b[54 + c] = 'P'; }); return { b, t: 0, n: 0, np: 0 }; },
  turn: s => s.t, moves: s => s.np >= 120 ? [] : xLegal(s), play: xMake,
  result(s, ms) { if (s.np >= 120) return { winner: -1 }; ms = ms || xLegal(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { let v = 0; s.b.forEach((p, i) => { if (!p) return; const red = xRed(p), u = p.toUpperCase(), r = i / 9 | 0; let x = XV[u]; if (u === 'P' && (red ? r <= 4 : r >= 5)) x += 90; if (u === 'H' || u === 'C') x += 8 - Math.abs(4 - i % 9) * 2; v += red ? x : -x; }); return me === 0 ? v : -v; },
  order: (s, ms) => ms.sort((a, b) => (s.b[b.t] ? XV[s.b[b.t].toUpperCase()] : 0) - (s.b[a.t] ? XV[s.b[a.t].toUpperCase()] : 0)),
  depth: l => l <= 3 ? 1 : l <= 7 ? 2 : 3, budget: 900,
  view(s, x) { const ms = x.can ? xLegal(s) : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m)); const last = new Set(s.last || []);
    const flip = x.me === 1; const P = i => { const r = i / 9 | 0, c = i % 9; return flip ? [5 + (8 - c) * 10, 5 + (9 - r) * 10] : [5 + c * 10, 5 + r * 10]; };
    let lines = ''; for (let r = 0; r < 10; r++) lines += `<line x1="5" y1="${5 + r * 10}" x2="85" y2="${5 + r * 10}"/>`; for (let c = 0; c < 9; c++) lines += c === 0 || c === 8 ? `<line x1="${5 + c * 10}" y1="5" x2="${5 + c * 10}" y2="95"/>` : `<line x1="${5 + c * 10}" y1="5" x2="${5 + c * 10}" y2="45"/><line x1="${5 + c * 10}" y1="55" x2="${5 + c * 10}" y2="95"/>`;
    lines += '<line x1="35" y1="5" x2="55" y2="25"/><line x1="55" y1="5" x2="35" y2="25"/><line x1="35" y1="75" x2="55" y2="95"/><line x1="55" y1="75" x2="35" y2="95"/><text x="45" y="52" class="river">river</text>';
    const pcs = s.b.map((p, i) => { const [cx, cy] = P(i); return `<g data-i="${i}" class="${src.has(i) || tg.has(i) ? 'tg' : ''} ${sel === i ? 'sel' : ''}"><rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" class="hit"/>${p ? `<circle cx="${cx}" cy="${cy}" r="4.3" class="xp ${xRed(p) ? 'xr' : 'xb'} ${last.has(i) ? 'last' : ''}"/><text x="${cx}" y="${cy + 1.7}" class="xt ${xRed(p) ? 'xr' : 'xb'}">${XG[p]}</text>` : tg.has(i) ? `<circle cx="${cx}" cy="${cy}" r="1.4" class="xdot"/>` : ''}</g>`; }).join('');
    x.el.innerHTML = `<svg class="bd xq" viewBox="0 0 90 100"><rect width="90" height="100" class="wood"/>${lines}${pcs}</svg>${x.can && xInCheck(s.b, s.t) ? '<p class="warn">Check!</p>' : ''}`;
    x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Shogi ----------
const SHV = { P: 100, L: 300, N: 350, S: 500, G: 550, B: 800, R: 1000, K: 0, '+P': 520, '+L': 520, '+N': 520, '+S': 540, '+B': 1050, '+R': 1250 };
const SHK = { K: '王', R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩', '+R': '龍', '+B': '馬', '+S': '全', '+N': '圭', '+L': '杏', '+P': 'と' };
const shOwn = (p, t) => p && (t === 0 ? p[p.length - 1] < 'a' : p[p.length - 1] >= 'a');
const shKind = p => p.toUpperCase();
function shSteps(kind, t) { const f = t === 0 ? -1 : 1, G = [[f, 0], [f, -1], [f, 1], [0, -1], [0, 1], [-f, 0]];
  switch (kind) { case 'K': return { s: D8 }; case 'G': case '+P': case '+L': case '+N': case '+S': return { s: G }; case 'S': return { s: [[f, 0], [f, -1], [f, 1], [-f, -1], [-f, 1]] }; case 'N': return { s: [[2 * f, -1], [2 * f, 1]] }; case 'P': return { s: [[f, 0]] }; case 'L': return { r: [[f, 0]] };
    case 'R': return { r: [[1, 0], [-1, 0], [0, 1], [0, -1]] }; case 'B': return { r: [[1, 1], [1, -1], [-1, 1], [-1, -1]] }; case '+R': return { r: [[1, 0], [-1, 0], [0, 1], [0, -1]], s: [[1, 1], [1, -1], [-1, 1], [-1, -1]] }; case '+B': return { r: [[1, 1], [1, -1], [-1, 1], [-1, -1]], s: [[1, 0], [-1, 0], [0, 1], [0, -1]] }; }
  return {}; }
function shTargets(b, i, t) { const p = b[i], k = shKind(p), mv = shSteps(k, t), r = i / 9 | 0, c = i % 9, out = [];
  for (const [dr, dc] of mv.s || []) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9 && !shOwn(b[rr * 9 + cc], t)) out.push(rr * 9 + cc); }
  for (const [dr, dc] of mv.r || []) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) { const q = b[rr * 9 + cc]; if (shOwn(q, t)) break; out.push(rr * 9 + cc); if (q) break; rr += dr; cc += dc; } }
  return out; }
const shAttacked = (b, sq, by) => { for (let i = 0; i < 81; i++) if (shOwn(b[i], by) && shTargets(b, i, by).includes(sq)) return true; return false; };
function shPseudo(s) { const t = s.t, b = s.b, out = [], zone = r => t === 0 ? r <= 2 : r >= 6, last = r => t === 0 ? r : 8 - r;
  for (let i = 0; i < 81; i++) { if (!shOwn(b[i], t)) continue; const k = shKind(b[i]), fr = i / 9 | 0;
    for (const to of shTargets(b, i, t)) { const tr = to / 9 | 0, canPro = ['P', 'L', 'N', 'S', 'B', 'R'].includes(k) && (zone(fr) || zone(tr)); const must = (k === 'P' || k === 'L') && last(tr) === 0 || k === 'N' && last(tr) <= 1;
      if (!must) out.push({ f: i, t: to }); if (canPro) out.push({ f: i, t: to, pr: 1 }); } }
  for (const [k, n] of Object.entries(s.h[t])) { if (!n) continue; for (let to = 0; to < 81; to++) { if (b[to]) continue; const tr = to / 9 | 0;
      if ((k === 'P' || k === 'L') && last(tr) === 0) continue; if (k === 'N' && last(tr) <= 1) continue;
      if (k === 'P') { let two = false; for (let r = 0; r < 9; r++) if (b[r * 9 + to % 9] === (t === 0 ? 'P' : 'p')) two = true; if (two) continue; }
      out.push({ d: k, t: to }); } }
  return out; }
function shMake(s, m) { const b = s.b.slice(), h = [{ ...s.h[0] }, { ...s.h[1] }], t = s.t; let cap = '';
  if (m.d) { b[m.t] = t === 0 ? m.d : m.d.toLowerCase(); h[t][m.d]--; }
  else { cap = b[m.t]; let p = b[m.f]; b[m.f] = ''; if (m.pr) p = '+' + p; b[m.t] = p; if (cap) { const base = shKind(cap).replace('+', ''); if (base !== 'K') h[t][base] = (h[t][base] || 0) + 1; } }
  return { b, h, t: 1 - t, n: s.n + 1, last: [m.f ?? -1, m.t] }; }
const shKing = (b, t) => b.indexOf(t === 0 ? 'K' : 'k');
function shLegal(s) { return shPseudo(s).filter(m => { const n = shMake(s, m); if (shAttacked(n.b, shKing(n.b, s.t), 1 - s.t)) return false;
  if (m.d === 'P' && shAttacked(n.b, shKing(n.b, 1 - s.t), s.t) && !shPseudo(n).some(r => { const q = shMake(n, r); return !shAttacked(q.b, shKing(q.b, n.t), 1 - n.t); })) return false; return true; }); }
TB.shogi = {
  seats: ['Sente (bottom)', 'Gote (top)'],
  init() { const b = Array(81).fill(''), back = 'lnsgkgsnl'; for (let c = 0; c < 9; c++) { b[c] = back[c]; b[72 + c] = back[c].toUpperCase(); b[18 + c] = 'p'; b[54 + c] = 'P'; } b[10] = 'r'; b[16] = 'b'; b[64] = 'B'; b[70] = 'R'; return { b, h: [{}, {}], t: 0, n: 0 }; },
  turn: s => s.t, moves: s => s.n >= 300 ? [] : shLegal(s), play: shMake,
  result(s, ms) { if (s.n >= 300) return { winner: -1 }; ms = ms || shLegal(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { let v = 0; s.b.forEach(p => { if (!p) return; const x = SHV[shKind(p)] || 0; v += shOwn(p, 0) ? x : -x; }); for (const t of [0, 1]) for (const [k, n] of Object.entries(s.h[t])) v += (t === 0 ? 1 : -1) * n * SHV[k] * 1.1; return me === 0 ? v : -v; },
  order: (s, ms) => ms.sort((a, b) => (b.t !== undefined && s.b[b.t] ? SHV[shKind(s.b[b.t])] || 0 : 0) + (b.pr ? 300 : 0) - (a.t !== undefined && s.b[a.t] ? SHV[shKind(s.b[a.t])] || 0 : 0) - (a.pr ? 300 : 0)).slice(0, 40),
  depth: l => l <= 4 ? 1 : 2, budget: 900,
  view(s, x) { const ms = x.can ? shLegal(s) : [], sel = x.sel, flip = x.me === 1; const src = new Set(ms.filter(m => m.f !== undefined).map(m => m.f)), tg = new Map();
    if (sel != null) ms.filter(m => (typeof sel === 'string' ? m.d === sel : m.f === sel)).forEach(m => { if (!tg.has(m.t) || m.pr) tg.set(m.t, tg.has(m.t) ? [tg.get(m.t)].flat().concat(m) : m); });
    const order = [...Array(81).keys()]; if (flip) order.reverse(); const last = new Set(s.last || []);
    const hand = t => `<div class="shh">${['R', 'B', 'G', 'S', 'N', 'L', 'P'].filter(k => s.h[t][k]).map(k => `<button data-i="d${k}" class="shp ${t === 1 ? 'g' : ''} ${sel === k ? 'sel' : ''}" ${x.can && t === s.t && ms.some(m => m.d === k) ? '' : 'disabled'}>${SHK[k]}<sub>${s.h[t][k]}</sub></button>`).join('') || '<span class="muted small">No pieces in hand</span>'}</div>`;
    x.el.innerHTML = `${hand(flip ? 0 : 1)}<div class="bd shogi">${order.map(i => { const p = s.b[i]; return `<button data-i="${i}" class="${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''} ${last.has(i) ? 'last' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}>${p ? `<span class="shp ${shOwn(p, 1) !== flip ? 'g' : ''} ${p[0] === '+' ? 'pro' : ''}">${SHK[shKind(p)]}</span>` : ''}</button>`; }).join('')}</div>${hand(flip ? 1 : 0)}
      ${x.ask ? `<div class="row-btns"><span>Promote?</span><button class="btn hot" data-i="pY">Promote</button><button class="btn" data-i="pN">Keep</button></div>` : ''}`;
    x.on(d => { if (d === 'pY' || d === 'pN') { const opts = x.ask; x.ask = null; x.sel = null; x.act(opts.find(m => d === 'pY' ? m.pr : !m.pr)); return; }
      if (d[0] === 'd') { x.sel = d.slice(1); x.redraw(); return; } const i = +d;
      if (tg.has(i)) { const o = [tg.get(i)].flat(); if (o.length > 1) { x.ask = o; x.redraw(); } else { x.sel = null; x.act(o[0]); } } else if (src.has(i)) { x.sel = i; x.ask = null; x.redraw(); } }); }
};

// ---------- Ludo ----------
const LUDO_PATH = (() => { const p = []; const seg = (a, b, fixed, isRow) => { const st = a <= b ? 1 : -1; for (let k = a; k !== b + st; k += st) p.push(isRow ? [fixed, k] : [k, fixed]); };
  seg(1, 5, 6, true); seg(5, 0, 6, false); p.push([0, 7], [0, 8]); seg(1, 5, 8, false); seg(9, 14, 6, true); p.push([7, 14], [8, 14]); seg(13, 9, 8, true); seg(9, 14, 8, false); p.push([14, 7], [14, 6]); seg(13, 9, 6, false); seg(5, 0, 8, true); p.push([7, 0], [6, 0]); return p; })();
const LUDO_HOME = [[[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]];
const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const ludoCol = (s, p) => s.n === 2 ? p * 2 : p;
const ludoAbs = (s, p, prog) => (ludoCol(s, p) * 13 + prog) % 52;
TB.ludo = {
  seats: ['Red', 'Green', 'Yellow', 'Blue'], init: n => ({ n, pos: [...Array(n)].map(() => [-1, -1, -1, -1]), t: 0, die: 0, sixes: 0, log: '' }), turn: s => s.t,
  moves(s) { if (TB.ludo.result(s)) return []; if (!s.die) return ['roll']; const out = s.pos[s.t].map((pr, k) => { if (pr === 56) return null; if (pr < 0) return s.die === 6 ? { k } : null; return pr + s.die <= 56 ? { k } : null; }).filter(Boolean); return out.length ? out : ['pass']; },
  play(s, m) { const n = cl(s), t = s.t;
    if (m === 'roll') { n.die = roll6(); n.sixes = n.die === 6 ? s.sixes + 1 : 0; n.log = 'rolled ' + n.die; if (n.sixes === 3) { n.log += ' (third six: turn lost)'; n.die = 0; n.sixes = 0; n.t = (t + 1) % s.n; } return n; }
    const next = () => { n.t = (t + 1) % s.n; n.sixes = 0; };
    if (m === 'pass') { n.die = 0; n.log = 'could not move'; next(); return n; }
    const pr = s.pos[t][m.k]; let np = pr < 0 ? 0 : pr + s.die; n.pos[t][m.k] = np; let bonus = s.die === 6;
    if (np <= 50) { const a = ludoAbs(s, t, np); if (!LUDO_SAFE.has(a)) for (let o = 0; o < s.n; o++) if (o !== t) n.pos[o].forEach((q, j) => { if (q >= 0 && q <= 50 && ludoAbs(s, o, q) === a) { n.pos[o][j] = -1; bonus = true; n.log = 'captured a token!'; } }); }
    if (np === 56) bonus = true; n.die = 0; if (!bonus) next(); return n; },
  result: s => { const w = s.pos.findIndex(p => p.every(q => q === 56)); return w >= 0 ? { winner: w } : null; },
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; const t = s.t;
    return pickBest(ms, m => { const pr = s.pos[t][m.k], np = pr < 0 ? 0 : pr + s.die; let v = np; if (pr < 0) v += 30; if (np === 56) v += 40; if (np <= 50) { const a = ludoAbs(s, t, np); for (let o = 0; o < s.n; o++) if (o !== t) s.pos[o].forEach(q => { if (q >= 0 && q <= 50 && ludoAbs(s, o, q) === a && !LUDO_SAFE.has(a)) v += 60; }); if (LUDO_SAFE.has(a)) v += 10; } if (np > 50) v += 15; return v; }, level); },
  view(s, x) { const ms = x.can ? TB.ludo.moves(s) : [], movable = new Set(ms.filter(m => m.k !== undefined).map(m => m.k)); const cell = {};
    const put = (rc, html) => { const k = rc[0] * 15 + rc[1]; cell[k] = (cell[k] || '') + html; };
    for (let p = 0; p < s.n; p++) s.pos[p].forEach((pr, k) => { const col = ludoCol(s, p), tok = `<button class="tok2" style="background:${SEATCOL[col]}" data-i="${p === s.t && movable.has(k) ? 'k' + k : ''}" ${p === s.t && movable.has(k) ? '' : 'disabled'}>${p === s.t && movable.has(k) ? '★' : ''}</button>`;
      if (pr < 0) { const base = [[1, 1], [1, 10], [10, 10], [10, 1]][col]; put([base[0] + (k >> 1) * 2, base[1] + (k & 1) * 2], tok); } else if (pr <= 50) put(LUDO_PATH[(col * 13 + pr) % 52], tok); else if (pr < 56) put(LUDO_HOME[col][pr - 51], tok); else put([7, 7], tok); });
    const yard = (r, c) => r < 6 && c < 6 ? 0 : r < 6 && c > 8 ? 1 : r > 8 && c > 8 ? 2 : r > 8 && c < 6 ? 3 : -1;
    const pathIdx = new Map(LUDO_PATH.map((p, i) => [p[0] * 15 + p[1], i])), homeCol = new Map(); LUDO_HOME.forEach((h, c) => h.forEach(p => homeCol.set(p[0] * 15 + p[1], c)));
    let h = ''; for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) { const k = r * 15 + c, y = yard(r, c), pi = pathIdx.get(k), hc = homeCol.get(k);
      const bg = y >= 0 ? `background:${SEATCOL[y]}33` : pi !== undefined ? (pi % 13 === 0 ? `background:${SEATCOL[pi / 13]}aa` : LUDO_SAFE.has(pi) ? 'background:#ffffffcc' : 'background:#fff') : hc !== undefined ? `background:${SEATCOL[hc]}aa` : r >= 6 && r <= 8 && c >= 6 && c <= 8 ? 'background:#ffc23d' : 'background:transparent';
      h += `<div class="lc" style="${bg}">${LUDO_SAFE.has(pi) && pi % 13 ? '<i class="star2">✦</i>' : ''}${cell[k] || ''}</div>`; }
    x.el.innerHTML = `<div class="bd ludo">${h}</div><div class="slbar"><span>${s.die ? 'Die: ' + diceFace(s.die) : ''}</span><span class="muted small">${esc(s.log || '')}</span>${ms.includes('roll') ? '<button class="btn hot" data-i="roll">Roll</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">No move: pass</button>' : ''}${movable.size ? '<span class="muted small">Tap a starred token to move it.</span>' : ''}</div>`;
    x.on(d => { if (d === 'roll' || d === 'pass') x.act(d); else if (d[0] === 'k') x.act({ k: +d.slice(1) }); }); }
};

// ---------- Fox & Geese (cross board) ----------
const XB = i => { const r = i / 7 | 0, c = i % 7; return (r >= 2 && r <= 4) || (c >= 2 && c <= 4); };
TB.foxgeese = {
  seats: ['Geese', 'Fox'],
  init() { const b = Array(49).fill(-1).map((_, i) => XB(i) ? 0 : -2); for (let i = 0; i < 49; i++) { if (!XB(i)) continue; const r = i / 7 | 0; if (r >= 4) b[i] = 1; } b[24 - 14 + 0] = 2; return { b, t: 0, n: 0 }; },
  turn: s => s.t,
  moves(s) { if (TB.foxgeese.result(s)) return []; const out = [], b = s.b, ok = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7 && XB(r * 7 + c);
    if (s.t === 0) b.forEach((v, i) => { if (v !== 1) return; const r = i / 7 | 0, c = i % 7; [[-1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { if (ok(r + dr, c + dc) && b[(r + dr) * 7 + c + dc] === 0) out.push({ f: i, t: (r + dr) * 7 + c + dc, caps: [] }); }); });
    else { const f = b.indexOf(2), r = f / 7 | 0, c = f % 7; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { if (ok(r + dr, c + dc) && b[(r + dr) * 7 + c + dc] === 0) out.push({ f, t: (r + dr) * 7 + c + dc, caps: [] }); });
      const jump = (i, caps) => { const rr = i / 7 | 0, cc = i % 7; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const m = (rr + dr) * 7 + cc + dc, l = (rr + 2 * dr) * 7 + cc + 2 * dc; if (ok(rr + 2 * dr, cc + 2 * dc) && b[m] === 1 && !caps.includes(m) && (b[l] === 0 || l === f)) { const nc = caps.concat(m); out.push({ f, t: l, caps: nc }); if (nc.length < 6) jump(l, nc); } } };
      jump(f, []); }
    return out; },
  play(s, m) { const b = s.b.slice(); b[m.t] = b[m.f]; if (m.t !== m.f) b[m.f] = 0; m.caps.forEach(i => b[i] = 0); return { b, t: 1 - s.t, n: s.n + 1, last: [m.f, m.t] }; },
  result(s) { if (s.b.filter(v => v === 1).length <= 4) return { winner: 1 }; if (s.n > 200) return { winner: -1 }; const b = s.b, f = b.indexOf(2), r = f / 7 | 0, c = f % 7; const ok = (r2, c2) => r2 >= 0 && r2 < 7 && c2 >= 0 && c2 < 7 && XB(r2 * 7 + c2);
    const free = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => (ok(r + dr, c + dc) && b[(r + dr) * 7 + c + dc] === 0) || (ok(r + 2 * dr, c + 2 * dc) && b[(r + dr) * 7 + c + dc] === 1 && b[(r + 2 * dr) * 7 + c + 2 * dc] === 0));
    if (!free) return { winner: 0 }; if (s.t === 0 && !b.some((v, i) => v === 1 && [[-1, 0], [0, -1], [0, 1]].some(([dr, dc]) => ok((i / 7 | 0) + dr, i % 7 + dc) && b[((i / 7 | 0) + dr) * 7 + i % 7 + dc] === 0))) return { winner: 1 }; return null; },
  eval(s, me) { const g = s.b.filter(v => v === 1).length, f = s.b.indexOf(2), r = f / 7 | 0, c = f % 7; let mob = 0; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { const q = (r + dr) * 7 + c + dc; if (r + dr >= 0 && r + dr < 7 && c + dc >= 0 && c + dc < 7 && s.b[q] === 0) mob++; }); let adv = 0; s.b.forEach((v, i) => { if (v === 1) adv += 6 - (i / 7 | 0); }); const v = g * 30 - mob * 12 + adv * 1.5; return me === 0 ? v : -v; },
  depth: l => Math.min(4, Math.ceil(l / 2.5)), budget: 900,
  view(s, x) { const ms = x.can ? TB.foxgeese.moves(s) : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => { if (!tg.has(m.t) || m.caps.length > tg.get(m.t).caps.length) tg.set(m.t, m); });
    x.el.innerHTML = `<p class="center">Geese left: <b>${s.b.filter(v => v === 1).length}</b></p><div class="bd fg">${s.b.map((v, i) => v === -2 ? '<i></i>' : `<button data-i="${i}" class="${v === 1 ? 'goose' : v === 2 ? 'fox' : ''} ${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}></button>`).join('')}</div>`;
    x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Senet ----------
const senetThrow = () => { const w = [0, 0, 0, 0].map(() => R(2)).reduce((a, b) => a + b, 0); return w || 5; };
const senetXY = i => { const r = i / 10 | 0, c = i % 10; return r === 1 ? [r, 9 - c] : [r, c]; };
TB.senet = {
  seats: ['Cones', 'Spools'], init() { const p = [[], []]; for (let i = 0; i < 10; i++) p[i % 2].push(i); return { p, off: [0, 0], t: 0, roll: 0, log: '' }; }, turn: s => s.t,
  moves(s) { if (TB.senet.result(s)) return []; if (!s.roll) return ['throw']; const t = s.t, mine = new Set(s.p[t]), theirs = new Set(s.p[1 - t]), out = [];
    for (const f of s.p[t]) { const to = f + s.roll; if (f < 25 && to > 25) continue; if (to === 30) { out.push({ f }); continue; } if (to > 29) continue; if (mine.has(to)) continue;
      if (theirs.has(to) && (theirs.has(to - 1) || theirs.has(to + 1))) continue; let blocked = false; for (let k = f + 1; k < to - 1; k++) if (theirs.has(k) && theirs.has(k + 1) && theirs.has(k + 2)) blocked = true; if (blocked) continue; out.push({ f }); }
    return out.length ? out : ['pass']; },
  play(s, m) { const n = cl(s), t = s.t; if (m === 'throw') { n.roll = senetThrow(); n.log = 'threw ' + n.roll; return n; }
    const extra = [1, 4, 5].includes(s.roll); if (m === 'pass') { n.roll = 0; n.t = extra ? t : 1 - t; n.log = 'no move'; return n; }
    const to = m.f + s.roll, k = n.p[t].indexOf(m.f);
    if (to === 30) { n.p[t].splice(k, 1); n.off[t]++; n.log = 'bore off a piece'; }
    else { const e = n.p[1 - t].indexOf(to); if (e >= 0) { n.p[1 - t][e] = m.f; n.log = 'swapped places'; } n.p[t][k] = to;
      if (to === 26) { let back = 14; while (n.p[0].includes(back) || n.p[1].includes(back)) back--; n.p[t][k] = back; n.log = 'fell in the water'; } }
    n.roll = 0; n.t = extra ? t : 1 - t; n.last = to; return n; },
  result: s => s.off[0] === 5 ? { winner: 0 } : s.off[1] === 5 ? { winner: 1 } : null,
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; const t = s.t; return pickBest(ms, m => { const to = m.f + s.roll; let v = to; if (to === 30) v += 40; if (to === 26) v -= 50; if (s.p[1 - t].includes(to)) v += 15; if (s.p[t].includes(to - 1) || s.p[t].includes(to + 1)) v += 6; return v; }, level); },
  view(s, x) { const ms = x.can ? TB.senet.moves(s) : [], src = new Set(ms.filter(m => m.f !== undefined).map(m => m.f)); const cells = Array(30).fill('');
    s.p.forEach((ps, t) => ps.forEach(i => cells[i] = `<i class="sp${t}"></i>`)); const mark = { 14: '☥', 25: '𓄤', 26: '≈', 27: 'III', 28: 'II', 29: '•' };
    const grid = [...Array(30)].map((_, k) => { const r = k / 10 | 0, c = k % 10, i = r === 1 ? 10 + (9 - c) : k; return `<button data-i="${i}" class="${src.has(i) ? 'tg' : ''}" ${src.has(i) ? '' : 'disabled'}><small>${mark[i] || ''}</small>${cells[i]}</button>`; }).join('');
    x.el.innerHTML = `<div class="score2"><span>Cones off ${s.off[0]}</span><span>${s.roll ? 'Throw: <b>' + s.roll + '</b>' : ''}</span><span>Spools off ${s.off[1]}</span></div><div class="bd senet">${grid}</div><div class="slbar"><span class="muted small">${esc(s.log)}</span>${ms.includes('throw') ? '<button class="btn hot" data-i="throw">Throw sticks</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}</div><p class="muted small">Path runs left to right, then back, then forward. Square 27 (≈) is water; exact throws bear off from the last squares.</p>`;
    x.on(d => { if (d === 'throw' || d === 'pass') x.act(d); else x.act({ f: +d }); }); }
};

// ---------- Royal Game of Ur ----------
const UR_ROS = new Set([4, 8, 14]);
const urCell = (t, pos) => pos <= 4 ? [t ? 0 : 2, 4 - pos] : pos <= 12 ? [1, pos - 5] : [t ? 0 : 2, 20 - pos];
TB.ur = {
  seats: ['Light', 'Dark'], init: () => ({ p: [Array(7).fill(0), Array(7).fill(0)], t: 0, roll: -1, log: '' }), turn: s => s.t,
  moves(s) { if (TB.ur.result(s)) return []; if (s.roll < 0) return ['roll']; if (s.roll === 0) return ['pass']; const t = s.t, out = [], seen = new Set();
    s.p[t].forEach((pos, k) => { if (pos === 15 || seen.has(pos)) return; seen.add(pos); const to = pos + s.roll; if (to > 15) return; if (to < 15 && s.p[t].includes(to)) return; if (to === 8 && s.p[1 - t].includes(8)) return; out.push({ k }); });
    return out.length ? out : ['pass']; },
  play(s, m) { const n = cl(s), t = s.t; if (m === 'roll') { n.roll = [0, 0, 0, 0].map(() => R(2)).reduce((a, b) => a + b); n.log = 'rolled ' + n.roll; return n; }
    if (m === 'pass') { n.roll = -1; n.t = 1 - t; return n; } const to = s.p[t][m.k] + s.roll; n.p[t][m.k] = to;
    if (to >= 5 && to <= 12) { const e = n.p[1 - t].indexOf(to); if (e >= 0) { n.p[1 - t][e] = 0; n.log = 'captured!'; } }
    n.roll = -1; if (!UR_ROS.has(to)) n.t = 1 - t; else n.log = 'landed on a rosette: roll again'; return n; },
  result: s => s.p[0].every(v => v === 15) ? { winner: 0 } : s.p[1].every(v => v === 15) ? { winner: 1 } : null,
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; const t = s.t; return pickBest(ms, m => { const pos = s.p[t][m.k], to = pos + s.roll; let v = s.roll; if (UR_ROS.has(to)) v += 12; if (to >= 5 && to <= 12 && s.p[1 - t].includes(to)) v += 15; if (to === 15) v += 8; if (pos === 8) v -= 6; if (to >= 5 && to <= 12 && to !== 8) v -= 3; return v; }, level); },
  view(s, x) { const ms = x.can ? TB.ur.moves(s) : [], mv = new Set(ms.filter(m => m.k !== undefined).map(m => s.p[s.t][m.k])); const g = {};
    [0, 1].forEach(t => s.p[t].forEach(pos => { if (pos >= 1 && pos <= 14) { const [r, c] = urCell(t, pos); g[r * 8 + c] = { t, pos }; } }));
    let h = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const gap = r !== 1 && (c === 4 || c === 5); if (gap) { h += '<i></i>'; continue; } const posHere = r === 1 ? c + 5 : c < 4 ? 4 - c : 20 - c; const ros = UR_ROS.has(posHere); const pc = g[r * 8 + c]; const click = pc && pc.t === s.t && mv.has(pc.pos);
      h += `<button class="${ros ? 'ros' : ''}" data-i="${click ? 'p' + pc.pos : ''}" ${click ? '' : 'disabled'}>${pc ? `<i class="ur${pc.t} ${click ? 'mv' : ''}"></i>` : ''}</button>`; }
    const pool = t => `<div class="urpool">${s.p[t].filter(v => v === 0).map(() => `<i class="ur${t}"></i>`).join('')}${t === s.t && mv.has(0) ? '<button class="btn sm" data-i="p0">Enter a piece</button>' : ''}<span class="muted small">home ${s.p[t].filter(v => v === 15).length}/7</span></div>`;
    x.el.innerHTML = `${pool(1)}<div class="bd ur">${h}</div>${pool(0)}<div class="slbar"><span>${s.roll >= 0 ? 'Roll: <b>' + s.roll + '</b>' : ''} <span class="muted small">${esc(s.log)}</span></span>${ms.includes('roll') ? '<button class="btn hot" data-i="roll">Roll</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}</div>`;
    x.on(d => { if (d === 'roll' || d === 'pass') return x.act(d); const pos = +d.slice(1); const k = s.p[s.t].indexOf(pos); const m = ms.find(q => q.k !== undefined && s.p[s.t][q.k] === pos); if (m) x.act(m); }); }
};

// ---------- Hnefatafl ----------
const TN = 11, TTHRONE = 60, TCORN = new Set([0, 10, 110, 120]);
TB.tafl = {
  seats: ['Attackers', 'Defenders'],
  init() { const b = Array(121).fill(0); const A = [3, 4, 5, 6, 7, 16, 33, 44, 55, 66, 77, 56, 43, 54, 65, 76, 87, 113, 114, 115, 116, 117, 104, 64]; A.forEach(i => b[i] = 1);
    [38, 48, 49, 50, 58, 59, 61, 62, 70, 71, 72, 82].forEach(i => b[i] = 2); b[60] = 3; return { b, t: 0, n: 0 }; },
  turn: s => s.t,
  moves(s) { if (TB.tafl.result(s)) return []; const out = [], b = s.b, mine = v => s.t === 0 ? v === 1 : v === 2 || v === 3;
    b.forEach((v, i) => { if (!mine(v)) return; const r = i / TN | 0, c = i % TN; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < TN && cc >= 0 && cc < TN && !b[rr * TN + cc]) { const j = rr * TN + cc; if (v === 3 || (!TCORN.has(j) && j !== TTHRONE)) out.push({ f: i, t: j }); if (j === TTHRONE && v !== 3) break; rr += dr; cc += dc; } } });
    return out; },
  play(s, m) { const b = s.b.slice(), v = b[m.f]; b[m.t] = v; b[m.f] = 0; const r = m.t / TN | 0, c = m.t % TN, att = v === 1;
    const hostile = (j, forKing) => { if (j < 0) return false; if (TCORN.has(j)) return true; if (j === TTHRONE && !b[j]) return true; return att ? b[j] === 1 : (b[j] === 2 || b[j] === 3); };
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + dr, cc = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc; if (rr < 0 || rr >= TN || cc < 0 || cc >= TN) continue; const q = rr * TN + cc, en = b[q];
      if (att && en === 2 || !att && en === 1) { if (r2 >= 0 && r2 < TN && c2 >= 0 && c2 < TN && hostile(r2 * TN + c2)) b[q] = 0; } }
    return { b, t: 1 - s.t, n: s.n + 1, last: [m.f, m.t] }; },
  result(s) { const k = s.b.indexOf(3); if (k < 0) return { winner: 0 }; if (TCORN.has(k)) return { winner: 1 }; const r = k / TN | 0, c = k % TN;
    const sur = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= TN || cc < 0 || cc >= TN) return false; const j = rr * TN + cc; return s.b[j] === 1 || j === TTHRONE; });
    if (sur) return { winner: 0 }; if (s.n >= 300) return { winner: -1 }; return null; },
  eval(s, me) { const b = s.b, k = b.indexOf(3); if (k < 0) return me === 0 ? 1e6 : -1e6; const r = k / TN | 0, c = k % TN; const cd = Math.min(r + c, r + 10 - c, 10 - r + c, 20 - r - c);
    let open = 0; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let rr = r + dr, cc = c + dc, clear = true; while (rr >= 0 && rr < TN && cc >= 0 && cc < TN) { if (b[rr * TN + cc]) { clear = false; break; } rr += dr; cc += dc; } if (clear && (r === 0 || r === 10 || c === 0 || c === 10 || dr ? (cc === 0 || cc === 10) : (rr === 0 || rr === 10))) open++; }
    const a = b.filter(v => v === 1).length, d = b.filter(v => v === 2).length; let adj = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < TN && cc >= 0 && cc < TN && b[rr * TN + cc] === 1) adj++; });
    const v = a * 10 - d * 18 + adj * 25 + cd * 6 - open * 60; return me === 0 ? v : -v; },
  depth: l => l <= 5 ? 1 : 2, budget: 1100,
  view(s, x) { const ms = x.can ? TB.tafl.moves(s) : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m)); const last = new Set(s.last || []);
    x.el.innerHTML = `<div class="bd tafl">${s.b.map((v, i) => `<button data-i="${i}" class="${TCORN.has(i) || i === TTHRONE ? 'sp' : ''} ${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''} ${last.has(i) ? 'last' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}>${v ? `<i class="tf${v}"></i>` : ''}</button>`).join('')}</div>`;
    x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Dominoes (draw game) ----------
const domTile = (t, attrs = '', cls = '') => `<button class="dom ${cls}" ${attrs}>${[t[0], t[1]].map(v => `<span class="dh">${[...Array(9)].map((_, k) => `<i class="${({0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]})[v].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`).join('')}</button>`;
TB.dominoes = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'],
  init(n) { const all = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]); shuf(all); const h = n === 2 ? 7 : 5; return { n, hands: [...Array(n)].map(() => all.splice(0, h)), yard: all, line: [], t: 0, passes: 0, log: '' }; },
  turn: s => s.t,
  moves(s) { if (TB.dominoes.result(s)) return []; const h = s.hands[s.t], out = []; if (!s.line.length) return h.map((_, i) => ({ i, e: 'R' }));
    const L = s.line[0][0], Rr = s.line[s.line.length - 1][1]; h.forEach((t, i) => { if (t.includes(L)) out.push({ i, e: 'L' }); if (t.includes(Rr) && !(L === Rr && t.includes(L) && out.some(o => o.i === i))) out.push({ i, e: 'R' }); });
    if (!out.length) out.push(s.yard.length ? 'draw' : 'pass'); return out; },
  play(s, m) { const n = cl(s), t = s.t; if (m === 'draw') { n.hands[t].push(n.yard.pop()); n.log = 'drew a tile'; return n; } if (m === 'pass') { n.passes++; n.t = (t + 1) % s.n; n.log = 'passed'; return n; }
    let tile = n.hands[t].splice(m.i, 1)[0]; if (!n.line.length) n.line.push(tile); else if (m.e === 'L') { const L = n.line[0][0]; if (tile[1] !== L) tile = [tile[1], tile[0]]; n.line.unshift(tile); } else { const Rr = n.line[n.line.length - 1][1]; if (tile[0] !== Rr) tile = [tile[1], tile[0]]; n.line.push(tile); }
    n.passes = 0; n.log = `played ${tile[0]}|${tile[1]}`; n.who = t; if (n.hands[t].length) n.t = (t + 1) % s.n; return n; },
  result(s) { const w = s.hands.findIndex(h => !h.length); if (w >= 0) return { winner: w }; if (s.passes >= s.n) { const pips = s.hands.map(h => sum(h.flat())), mn = Math.min(...pips); return { winner: pips.filter(p => p === mn).length > 1 ? -1 : pips.indexOf(mn), score: pips }; } return null; },
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; return pickBest(ms, m => sum(s.hands[s.t][m.i]) + (s.hands[s.t][m.i][0] === s.hands[s.t][m.i][1] ? 3 : 0), level); },
  view(s, x) { const ms = x.can ? TB.dominoes.moves(s) : [], me = x.me; const pl = new Map(); ms.filter(m => m.i !== undefined).forEach(m => { if (!pl.has(m.i)) pl.set(m.i, []); pl.get(m.i).push(m.e); });
    const others = s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}</span><small>${h.length} tiles</small></div>`).join('');
    x.el.innerHTML = `<div class="ctable"><div class="opps">${others}</div><div class="domline">${s.line.map(t => domTile(t, 'disabled', t[0] === t[1] ? 'dbl' : '')).join('') || '<span class="muted">Play any tile to start the line.</span>'}</div><p class="muted small">Boneyard ${s.yard.length} · ${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' : ''}${esc(s.log)}</p>
      ${x.sel != null && pl.get(x.sel)?.length > 1 ? `<div class="row-btns"><button class="btn" data-i="eL">Play on the left end</button><button class="btn" data-i="eR">Play on the right end</button></div>` : ''}
      <div class="hand">${me >= 0 ? s.hands[me].map((t, i) => domTile(t, `data-i="t${i}" ${pl.has(i) ? '' : 'disabled'}`, (pl.has(i) ? 'ok' : '') + (x.sel === i ? ' sel' : ''))).join('') : ''}</div>${ms.includes('draw') ? '<button class="btn hot" data-i="draw">Draw from the boneyard</button>' : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}</div>`;
    x.on(d => { if (d === 'draw' || d === 'pass') return x.act(d); if (d[0] === 'e') { const m = ms.find(q => q.i === x.sel && q.e === d[1]); x.sel = null; if (m) x.act(m); return; } const i = +d.slice(1), e = pl.get(i); if (!e) return; if (e.length === 1) { x.sel = null; x.act({ i, e: e[0] }); } else { x.sel = i; x.redraw(); } }); }
};

// ---------- Alquerque ----------
const AQ_DIRS = i => { const r = i / 5 | 0, c = i % 5, ds = [[1, 0], [-1, 0], [0, 1], [0, -1]]; if ((r + c) % 2 === 0) ds.push([1, 1], [1, -1], [-1, 1], [-1, -1]); return ds; };
TB.alquerque = {
  seats: ['Red', 'Blue'],
  init() { const b = Array(25).fill(-1); for (let i = 0; i < 25; i++) { const r = i / 5 | 0, c = i % 5; if (r < 2 || (r === 2 && c < 2)) b[i] = 1; if (r > 2 || (r === 2 && c > 2)) b[i] = 0; } return { b, t: 0, n: 0 }; },
  turn: s => s.t,
  moves(s) { if (s.n > 150) return []; const b = s.b, t = s.t, jumps = [], steps = [], fw = t === 0 ? -1 : 1, inB = (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5;
    const jump = (bb, i, path, caps) => { const r = i / 5 | 0, c = i % 5; let any = false; for (const [dr, dc] of AQ_DIRS(i)) { const m = (r + dr) * 5 + c + dc, l = (r + 2 * dr) * 5 + c + 2 * dc; if (!inB(r + 2 * dr, c + 2 * dc) || bb[m] !== 1 - t || caps.includes(m) || bb[l] !== -1) continue; any = true; jump(bb, l, path.concat(l), caps.concat(m)); } if (!any && caps.length) jumps.push({ path, caps }); };
    b.forEach((v, i) => { if (v !== t) return; const bb = b.slice(); bb[i] = -1; jump(bb, i, [i], []); const r = i / 5 | 0, c = i % 5; for (const [dr, dc] of AQ_DIRS(i)) { if (dr === -fw) continue; if (inB(r + dr, c + dc) && b[(r + dr) * 5 + c + dc] === -1) steps.push({ path: [i, (r + dr) * 5 + c + dc], caps: [] }); } });
    return jumps.length ? jumps : steps; },
  play(s, m) { const b = s.b.slice(); b[m.path[m.path.length - 1]] = s.t; b[m.path[0]] = -1; m.caps.forEach(i => b[i] = -1); return { b, t: 1 - s.t, n: s.n + 1, last: m.path }; },
  result(s, ms) { if (s.n > 150) { const a = s.b.filter(v => v === 0).length, c = s.b.filter(v => v === 1).length; return { winner: a > c ? 0 : c > a ? 1 : -1 }; } ms = ms || TB.alquerque.moves(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { return (s.b.filter(v => v === me).length - s.b.filter(v => v === 1 - me).length) * 10; },
  order: (s, ms) => ms.sort((a, b) => b.caps.length - a.caps.length), depth: l => Math.min(6, Math.ceil(l * 0.6)), budget: 900,
  view(s, x) { const ms = x.can ? TB.alquerque.moves(s) : [], sel = x.sel, src = new Set(ms.map(m => m.path[0])), tg = new Map(); if (sel != null) ms.filter(m => m.path[0] === sel).forEach(m => tg.set(m.path[m.path.length - 1], m));
    const P = i => [10 + (i % 5) * 20, 10 + (i / 5 | 0) * 20]; let ln = ''; for (let k = 0; k < 5; k++) ln += `<line x1="10" y1="${10 + k * 20}" x2="90" y2="${10 + k * 20}"/><line x1="${10 + k * 20}" y1="10" x2="${10 + k * 20}" y2="90"/>`; ln += '<line x1="10" y1="10" x2="90" y2="90"/><line x1="90" y1="10" x2="10" y2="90"/><line x1="50" y1="10" x2="10" y2="50"/><line x1="50" y1="10" x2="90" y2="50"/><line x1="10" y1="50" x2="50" y2="90"/><line x1="90" y1="50" x2="50" y2="90"/>';
    x.el.innerHTML = `<svg class="bd mor" viewBox="0 0 100 100">${ln}${s.b.map((v, i) => { const [cx, cy] = P(i); return `<g data-i="${i}" class="${src.has(i) || tg.has(i) ? 'tg' : ''} ${sel === i ? 'sel' : ''}"><circle cx="${cx}" cy="${cy}" r="8" class="hit"/>${v >= 0 ? `<circle cx="${cx}" cy="${cy}" r="6.5" fill="${SEATCOL[v]}" stroke="#0004"/>` : `<circle cx="${cx}" cy="${cy}" r="1.8" class="pt"/>`}</g>`; }).join('')}</svg>`;
    x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- International draughts (10x10) ----------
function idMoves(s) { const N = 10, b = s.b, t = s.t, own = p => p && p.toLowerCase() === (t ? 'b' : 'a'), enemy = p => p && !own(p), inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N; const caps = [], steps = [];
  const DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const jump = (bb, i, king, path, taken) => { const r = i / N | 0, c = i % N; let any = false;
    for (const [dr, dc] of DG) { if (!king) { const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc; if (!inB(lr, lc)) continue; const m = mr * N + mc, l = lr * N + lc; if (enemy(bb[m]) && !taken.includes(m) && !bb[l]) { any = true; jump(bb, l, king, path.concat(l), taken.concat(m)); } }
      else { let rr = r + dr, cc = c + dc; while (inB(rr, cc) && !bb[rr * N + cc]) { rr += dr; cc += dc; } if (!inB(rr, cc)) continue; const m = rr * N + cc; if (!enemy(bb[m]) || taken.includes(m)) continue; let lr = rr + dr, lc = cc + dc; while (inB(lr, lc) && !bb[lr * N + lc]) { any = true; jump(bb, lr * N + lc, king, path.concat(lr * N + lc), taken.concat(m)); lr += dr; lc += dc; } } }
    if (!any && taken.length) caps.push({ path, caps: taken }); };
  for (let i = 0; i < 100; i++) { const p = b[i]; if (!own(p)) continue; const king = p === 'A' || p === 'B', bb = b.slice(); bb[i] = ''; jump(bb, i, king, [i], []);
    const r = i / N | 0, c = i % N; for (const [dr, dc] of DG) { if (!king) { if (dr !== (t ? 1 : -1)) continue; if (inB(r + dr, c + dc) && !b[(r + dr) * N + c + dc]) steps.push({ path: [i, (r + dr) * N + c + dc], caps: [] }); } else { let rr = r + dr, cc = c + dc; while (inB(rr, cc) && !b[rr * N + cc]) { steps.push({ path: [i, rr * N + cc], caps: [] }); rr += dr; cc += dc; } } } }
  if (caps.length) { const mx = Math.max(...caps.map(m => m.caps.length)); return caps.filter(m => m.caps.length === mx); } return steps; }
TB.intdraughts = {
  seats: ['White', 'Black'],
  init() { const b = Array(100).fill(''); for (let i = 0; i < 100; i++) { const r = i / 10 | 0, c = i % 10; if ((r + c) % 2) { if (r < 4) b[i] = 'b'; if (r > 5) b[i] = 'a'; } } return { b, t: 0, np: 0 }; }, turn: s => s.t,
  moves: s => s.np >= 100 ? [] : idMoves(s),
  play(s, m) { const b = s.b.slice(), f = m.path[0], to = m.path[m.path.length - 1]; let p = b[f]; b[f] = ''; m.caps.forEach(i => b[i] = ''); if (p === 'a' && to < 10) p = 'A'; if (p === 'b' && to >= 90) p = 'B'; b[to] = p; return { b, t: 1 - s.t, np: m.caps.length || p === 'a' || p === 'b' ? 0 : s.np + 1, last: m.path }; },
  result(s, ms) { if (s.np >= 100) return { winner: -1 }; ms = ms || idMoves(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { let v = 0; s.b.forEach((p, i) => { if (!p) return; const own = p.toLowerCase() === (me ? 'b' : 'a'), r = i / 10 | 0; const x = p === 'A' || p === 'B' ? 320 : 100 + (p === 'a' ? 9 - r : r) * 3; v += own ? x : -x; }); return v; },
  depth: l => Math.min(5, Math.ceil(l / 2)), budget: 1100,
  view(s, x) { const ms = x.can ? idMoves(s) : [], sel = x.sel, from = new Set(ms.map(m => m.path[0])), to = new Map(); if (sel != null) ms.filter(m => m.path[0] === sel).forEach(m => to.set(m.path[m.path.length - 1], m)); const last = new Set(s.last || []);
    x.el.innerHTML = `<div class="bd ck id">${s.b.map((p, i) => { const dark = ((i / 10 | 0) + i % 10) % 2; return `<button data-i="${i}" class="${dark ? 'dk' : 'lt'}${i === sel ? ' sel' : ''}${to.has(i) ? ' tg' : ''}${last.has(i) ? ' last' : ''}" ${dark && (from.has(i) || to.has(i)) ? '' : 'disabled'}>${p ? `<i class="pc ${p.toLowerCase() === 'a' ? 'wht' : 'blk'}${p === 'A' || p === 'B' ? ' king' : ''}"></i>` : ''}</button>`; }).join('')}</div>${ms[0] && ms[0].caps.length ? `<p class="muted small">You must take the maximum capture (${ms[0].caps.length}).</p>` : ''}`;
    x.on(d => { const i = +d; if (to.has(i)) { x.sel = null; x.act(to.get(i)); } else if (from.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Lines of Action ----------
function loaConnected(b, p) { const ps = []; b.forEach((v, i) => v === p && ps.push(i)); if (ps.length <= 1) return true; const seen = new Set([ps[0]]), st = [ps[0]];
  while (st.length) { const i = st.pop(), r = i >> 3, c = i & 7; for (const [dr, dc] of D8) { const rr = r + dr, cc = c + dc, j = rr * 8 + cc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[j] === p && !seen.has(j)) { seen.add(j); st.push(j); } } } return seen.size === ps.length; }
TB.lines = {
  seats: ['Black', 'White'],
  init() { const b = Array(64).fill(-1); for (let k = 1; k < 7; k++) { b[k] = 0; b[56 + k] = 0; b[k * 8] = 1; b[k * 8 + 7] = 1; } return { b, t: 0, n: 0 }; }, turn: s => s.t,
  moves(s) { if (TB.lines.result(s)) return []; const out = [], b = s.b, t = s.t;
    b.forEach((v, i) => { if (v !== t) return; const r = i >> 3, c = i & 7;
      for (const [dr, dc] of D8) { let cnt = 0; for (let k = -7; k <= 7; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] >= 0) cnt++; }
        const tr = r + dr * cnt, tc = c + dc * cnt; if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue; let ok = true; for (let k = 1; k < cnt; k++) if (b[(r + dr * k) * 8 + c + dc * k] === 1 - t) ok = false; if (!ok || b[tr * 8 + tc] === t) continue; out.push({ f: i, t: tr * 8 + tc }); } });
    return out; },
  play(s, m) { const b = s.b.slice(); b[m.t] = s.t; b[m.f] = -1; return { b, t: 1 - s.t, n: s.n + 1, last: [m.f, m.t], mover: s.t }; },
  result(s, ms) { const a = loaConnected(s.b, 0), c = loaConnected(s.b, 1); if (a && c) return { winner: s.mover ?? 0 }; if (a) return { winner: 0 }; if (c) return { winner: 1 }; if (s.n > 250) return { winner: -1 }; return null; },
  eval(s, me) { const spread = p => { const ps = []; s.b.forEach((v, i) => v === p && ps.push(i)); const mr = sum(ps.map(i => i >> 3)) / ps.length, mc = sum(ps.map(i => i & 7)) / ps.length; return sum(ps.map(i => Math.max(Math.abs((i >> 3) - mr), Math.abs((i & 7) - mc)))) / ps.length + ps.length * 0.05; }; return (spread(1 - me) - spread(me)) * 20; },
  depth: l => Math.min(3, Math.ceil(l / 3.5)), budget: 1000,
  view(s, x) { const ms = x.can ? TB.lines.moves(s) : [], sel = x.sel, src = new Set(ms.map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m)); const last = new Set(s.last || []);
    x.el.innerHTML = `<div class="bd ck loa">${s.b.map((v, i) => `<button data-i="${i}" class="${((i >> 3) + (i & 7)) % 2 ? 'dk' : 'lt'} ${sel === i ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''} ${last.has(i) ? 'last' : ''}" ${src.has(i) || tg.has(i) ? '' : 'disabled'}>${v >= 0 ? `<i class="pc ${v ? 'wht' : 'blk'}"></i>` : ''}</button>`).join('')}</div>`;
    x.on(d => { const i = +d; if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Kōnane (6x6) ----------
TB.konane = {
  seats: ['Black', 'White'], init: () => ({ b: [...Array(36)].map((_, i) => ((i / 6 | 0) + i % 6) % 2), t: 0, ph: 0, first: -1 }), turn: s => s.t,
  moves(s) { const b = s.b, t = s.t; if (s.ph === 0) return [0, 14, 21, 35].filter(i => b[i] === 0).map(i => ({ rm: i }));
    if (s.ph === 1) { const r = s.first / 6 | 0, c = s.first % 6; return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => rr >= 0 && rr < 6 && cc >= 0 && cc < 6 && b[rr * 6 + cc] === 1).map(([rr, cc]) => ({ rm: rr * 6 + cc })); }
    const out = []; b.forEach((v, i) => { if (v !== t) return; const r = i / 6 | 0, c = i % 6; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let rr = r, cc = c, caps = []; while (true) { const mr = rr + dr, mc = cc + dc, lr = rr + 2 * dr, lc = cc + 2 * dc; if (lr < 0 || lr > 5 || lc < 0 || lc > 5) break; if (b[mr * 6 + mc] !== 1 - t || b[lr * 6 + lc] !== -1) break; caps = caps.concat(mr * 6 + mc); rr = lr; cc = lc; out.push({ f: i, t: rr * 6 + cc, caps }); } } }); return out; },
  play(s, m) { const b = s.b.slice(); if (m.rm !== undefined) { b[m.rm] = -1; return { ...s, b, t: 1 - s.t, ph: s.ph + 1, first: s.ph === 0 ? m.rm : s.first }; } b[m.t] = s.t; b[m.f] = -1; m.caps.forEach(i => b[i] = -1); return { ...s, b, t: 1 - s.t, last: [m.f, m.t] }; },
  result(s, ms) { if (s.ph < 2) return null; ms = ms || TB.konane.moves(s); return ms.length ? null : { winner: 1 - s.t }; },
  eval(s, me) { const mob = t => TB.konane.moves({ ...s, t }).length; return (mob(me) - mob(1 - me)) * 10; }, depth: l => Math.min(6, Math.ceil(l * 0.6)), budget: 900,
  view(s, x) { const ms = x.can ? TB.konane.moves(s) : [], sel = x.sel, rm = new Map(ms.filter(m => m.rm !== undefined).map(m => [m.rm, m])), src = new Set(ms.filter(m => m.f !== undefined).map(m => m.f)), tg = new Map(); if (sel != null) ms.filter(m => m.f === sel).forEach(m => tg.set(m.t, m));
    x.el.innerHTML = `${s.ph < 2 ? `<p class="center">${s.ph === 0 ? 'Black removes one of its stones from a corner or the centre.' : 'White removes a stone next to the gap.'}</p>` : ''}<div class="bd kon">${s.b.map((v, i) => `<button data-i="${i}" class="${sel === i ? 'sel' : ''} ${tg.has(i) || rm.has(i) ? 'tg' : ''}" ${src.has(i) || tg.has(i) || rm.has(i) ? '' : 'disabled'}>${v >= 0 ? `<i class="st s${v}"></i>` : ''}</button>`).join('')}</div>`;
    x.on(d => { const i = +d; if (rm.has(i)) return x.act(rm.get(i)); if (tg.has(i)) { x.sel = null; x.act(tg.get(i)); } else if (src.has(i)) { x.sel = i; x.redraw(); } }); }
};

// ---------- Liar's Dice ----------
const ldRoll = n => [...Array(n)].map(roll6);
TB.liars = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'],
  init: n => ({ n, d: [...Array(n)].map(() => ldRoll(5)), bid: null, bidder: -1, t: 0, reveal: null, log: 'New round.' }),
  turn: s => s.t,
  moves(s) { if (TB.liars.result(s)) return []; const total = sum(s.d.map(x => x.length)), out = []; if (s.bid) out.push('liar');
    for (let q = s.bid ? s.bid.q : 1; q <= Math.min(total, (s.bid ? s.bid.q : 1) + 3); q++) for (let f = 2; f <= 6; f++) if (!s.bid || q > s.bid.q || (q === s.bid.q && f > s.bid.f)) out.push({ q, f });
    return out; },
  play(s, m) { const n = cl(s), alive = i => n.d[i].length > 0, nextAlive = i => { let j = i; do j = (j + 1) % s.n; while (!alive(j)); return j; };
    if (m !== 'liar') { n.bid = m; n.bidder = s.t; n.t = nextAlive(s.t); n.log = `bid ${m.q} × ${m.f}s`; n.reveal = null; return n; }
    const cnt = sum(n.d.map(x => x.filter(v => v === s.bid.f || v === 1).length)), loser = cnt >= s.bid.q ? s.t : s.bidder;
    n.reveal = { dice: cl(s.d), bid: s.bid, cnt, loser, caller: s.t }; n.d[loser].pop(); n.log = `called liar: there were ${cnt}. ${loser === s.t ? 'The caller' : 'The bidder'} loses a die.`;
    n.d = n.d.map(x => ldRoll(x.length)); n.bid = null; n.bidder = -1; n.t = alive(loser) ? loser : nextAlive(loser); return n; },
  result: s => { const alive = s.d.map((x, i) => x.length ? i : -1).filter(i => i >= 0); return alive.length === 1 ? { winner: alive[0] } : null; },
  ai(s, level, ms) { const mine = s.d[s.t], total = sum(s.d.map(x => x.length)), others = total - mine.length; const exp = f => mine.filter(v => v === f || v === 1).length + others / 3;
    if (s.bid) { const e = exp(s.bid.f); const tol = level >= 7 ? 0.6 : level >= 4 ? 1.2 : 2.5 + Math.random() * 2; if (s.bid.q > e + tol) return 'liar'; }
    const bids = ms.filter(m => m !== 'liar'); if (!bids.length) return 'liar';
    return pickBest(bids, m => -(m.q - exp(m.f)) * 10 - m.q, level); },
  view(s, x) { const ms = x.can ? TB.liars.moves(s) : [], me = x.me, R0 = s.reveal;
    const row = (d, i) => `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}</span><div class="dice">${d.map(v => i === me ? diceFace(v) : '<span class="die sm blank"></span>').join('') || '<small>out</small>'}</div></div>`;
    const qs = [...new Set(ms.filter(m => m.q).map(m => m.q))];
    x.el.innerHTML = `<div class="ctable"><div class="opps">${s.d.map(row).join('')}</div><p><b>${s.bid ? `Current bid: ${s.bid.q} × ${s.bid.f}s by ${esc(x.names[s.bidder] || '')}` : 'No bid yet.'}</b> <span class="muted small">Ones are wild.</span></p>
      ${R0 ? `<div class="reveal"><p>${esc(x.names[R0.caller] || '')} called liar on ${R0.bid.q} × ${R0.bid.f}s: there were <b>${R0.cnt}</b>. ${esc(x.names[R0.loser] || '')} loses a die.</p>${R0.dice.map((d, i) => `<div class="dice"><small>${esc(x.names[i] || '')}</small>${d.map(diceFace).join('')}</div>`).join('')}</div>` : ''}
      ${x.can ? `<div class="row-btns"><label>Quantity <select id="lq">${qs.map(q => `<option>${q}</option>`).join('')}</select></label><label>Face <select id="lf">${[2, 3, 4, 5, 6].map(f => `<option>${f}</option>`).join('')}</select></label><button class="btn hot" data-i="bid">Bid</button>${ms.includes('liar') ? '<button class="btn" data-i="liar">Liar!</button>' : ''}</div>` : ''}</div>`;
    x.on(d => { if (d === 'liar') return x.act('liar'); const q = +x.el.querySelector('#lq').value, f = +x.el.querySelector('#lf').value; const m = ms.find(m => m.q === q && m.f === f); if (m) x.act(m); else toast('That bid must be higher than the current one.'); }); }
};

// ---------- Farkle ----------
function fkScore(vals) { if (!vals.length) return 0; const c = [0, 0, 0, 0, 0, 0, 0]; vals.forEach(v => c[v]++); if (vals.length === 6 && c.slice(1).every(n => n === 1)) return 1500; if (vals.length === 6 && c.filter(n => n === 2).length === 3) return 1500;
  let s = 0; for (let f = 1; f <= 6; f++) { let n = c[f]; if (n >= 3) { s += (f === 1 ? 1000 : f * 100) * 2 ** (n - 3); n = 0; } if (f === 1) s += n * 100; else if (f === 5) s += n * 50; else if (n) return -1; } return s; }
const fkAny = d => d.some(v => v === 1 || v === 5) || [1, 2, 3, 4, 5, 6].some(f => d.filter(v => v === f).length >= 3) || fkScore(d) > 0;
TB.farkle = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => ({ n, sc: Array(n).fill(0), d: [], sel: [], turn: 0, t: 0, log: '', goal: 5000 }), turn: s => s.t,
  moves(s) { if (TB.farkle.result(s)) return []; if (!s.d.length) return ['roll']; const out = s.d.map((_, i) => ({ s: i })); const v = fkScore(s.sel.map(i => s.d[i])); if (s.sel.length && v > 0) out.push('roll', 'bank'); return out; },
  play(s, m) { const n = cl(s), next = () => { n.t = (s.t + 1) % s.n; n.d = []; n.sel = []; n.turn = 0; };
    if (m.s !== undefined) { const k = n.sel.indexOf(m.s); k >= 0 ? n.sel.splice(k, 1) : n.sel.push(m.s); return n; }
    if (m === 'bank') { n.turn += fkScore(s.sel.map(i => s.d[i])); n.sc[s.t] += n.turn; n.log = `banked ${n.turn}`; n.who = s.t; next(); return n; }
    let keep = 6; if (s.d.length) { n.turn += fkScore(s.sel.map(i => s.d[i])); keep = s.d.length - s.sel.length; if (!keep) { keep = 6; n.log = 'hot dice! all six back'; } }
    n.d = ldRoll(keep); n.sel = []; if (!fkAny(n.d)) { n.log = `farkled and lost ${n.turn}`; n.who = s.t; n.farkle = n.d; next(); } else { n.log = s.d.length ? n.log : ''; n.farkle = null; } return n; },
  result(s) { const w = s.sc.findIndex(v => v >= s.goal); return w >= 0 && s.t === 0 ? { winner: s.sc.indexOf(Math.max(...s.sc)), score: s.sc } : null; },
  ai(s, level, ms) { if (!s.d.length) return 'roll'; const d = s.d; let best = [], bv = 0; for (let mask = 1; mask < 1 << d.length; mask++) { const idx = d.map((_, i) => i).filter(i => mask >> i & 1), v = fkScore(idx.map(i => d[i])); if (v > bv || (v === bv && idx.length < best.length)) { bv = v; best = idx; } }
    if (noisy(level) && best.length > 1) { const singles = best.filter(i => d[i] === 1 || d[i] === 5); if (singles.length && fkScore([d[singles[0]]]) > 0) best = [singles[0]]; }
    const want = new Set(best), cur = new Set(s.sel); for (let i = 0; i < d.length; i++) if (want.has(i) !== cur.has(i)) return { s: i };
    const left = d.length - best.length, turn = s.turn + bv, thr = level >= 7 ? (left >= 3 ? 400 : left === 2 ? 300 : 250) : 200 + R(400); return (left === 0 || turn < thr) ? 'roll' : 'bank'; },
  view(s, x) { const ms = x.can ? TB.farkle.moves(s) : [], selV = fkScore(s.sel.map(i => s.d[i]));
    x.el.innerHTML = `<div class="pig"><div class="pigs">${s.sc.map((v, i) => `<div class="pg ${i === s.t ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}</span><b>${v}</b><div class="bar"><i style="width:${Math.min(100, v / s.goal * 100)}%"></i></div></div>`).join('')}</div>
      <div class="dice">${s.d.map((v, i) => `<button class="dbtn ${s.sel.includes(i) ? 'held' : ''}" data-i="s${i}" ${x.can ? '' : 'disabled'}>${diceFace(v)}</button>`).join('') || (s.farkle ? s.farkle.map(diceFace).join('') : '<span class="muted">Roll six dice to start your turn.</span>')}</div>
      <p>Turn points: <b>${s.turn}</b>${s.sel.length ? ` · selected: <b>${selV > 0 ? selV : 'not a scoring set'}</b>` : ''} <span class="muted small">${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' + esc(s.log) : ''}</span></p>
      <div class="row-btns"><button class="btn hot" data-i="roll" ${ms.includes('roll') ? '' : 'disabled'}>${s.d.length ? 'Keep selected and roll the rest' : 'Roll'}</button><button class="btn" data-i="bank" ${ms.includes('bank') ? '' : 'disabled'}>Keep selected and bank</button></div><p class="muted small">Ones 100, fives 50, three of a kind 100 × face (ones 1000), each extra die doubles; straight or three pairs 1500. First to ${s.goal}.</p></div>`;
    x.on(d => x.act(d[0] === 's' && d.length > 1 && !isNaN(+d.slice(1)) ? { s: +d.slice(1) } : d)); }
};

// ---------- Ship, Captain & Crew ----------
function sccKeep(dice, have) { const h = { ...have }, rest = []; let pool = dice.slice(); for (const [need, k] of [[6, 'ship'], [5, 'cap'], [4, 'crew']]) { if (h[k]) continue; const i = pool.indexOf(need); if (i >= 0) { h[k] = true; pool.splice(i, 1); } else break; } return { h, pool }; }
TB.shipcap = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => ({ n, round: 1, tot: Array(n).fill(0), cargo: Array(n).fill(null), have: {}, dice: [], rolls: 0, t: 0, log: '' }), turn: s => s.t,
  moves(s) { if (TB.shipcap.result(s)) return []; const out = []; if (s.rolls < 3) out.push('roll'); if (s.rolls > 0) out.push('stop'); return out; },
  play(s, m) { const n = cl(s); const endTurn = () => { const full = n.have.ship && n.have.cap && n.have.crew; n.cargo[s.t] = full ? sum(n.dice) : 0; n.log = full ? `scored cargo ${n.cargo[s.t]}` : 'never got ship, captain and crew'; n.who = s.t; n.have = {}; n.dice = []; n.rolls = 0;
      if (s.t === s.n - 1) { n.cargo.forEach((c, i) => n.tot[i] += c || 0); n.round++; n.lastRound = n.cargo; n.cargo = Array(s.n).fill(null); n.t = 0; } else n.t = s.t + 1; };
    if (m === 'stop') { endTurn(); return n; }
    const need = 5 - ['ship', 'cap', 'crew'].filter(k => s.have[k]).length - (s.have.ship && s.have.cap && s.have.crew ? 0 : 0); const k = sccKeep(ldRoll(s.have.ship && s.have.cap && s.have.crew ? 2 : 5 - ['ship', 'cap', 'crew'].filter(q => s.have[q]).length), s.have);
    n.have = k.h; n.dice = k.pool; n.rolls++; n.log = 'rolled'; if (n.rolls >= 3) endTurn(); return n; },
  result(s) { if (s.round <= 3) return null; const mx = Math.max(...s.tot); return { winner: s.tot.filter(v => v === mx).length > 1 ? -1 : s.tot.indexOf(mx), score: s.tot }; },
  ai(s, level, ms) { const full = s.have.ship && s.have.cap && s.have.crew; if (!full || !ms.includes('stop')) return 'roll'; return sum(s.dice) >= (level >= 6 ? 8 : 6 + R(5)) ? 'stop' : 'roll'; },
  view(s, x) { const ms = x.can ? TB.shipcap.moves(s) : [];
    x.el.innerHTML = `<div class="pig"><p>Round ${Math.min(s.round, 3)} of 3</p><div class="pigs">${s.tot.map((v, i) => `<div class="pg ${i === s.t ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><b>${v}</b><small>${s.cargo[i] !== null ? 'this round ' + s.cargo[i] : ''}</small></div>`).join('')}</div>
      <p>${['ship', 'cap', 'crew'].map((k, i) => `<span class="pill ${s.have[k] ? 'on' : ''}">${['Ship 6', 'Captain 5', 'Crew 4'][i]}</span>`).join(' ')}</p><div class="dice">${s.dice.map(diceFace).join('') || '<span class="muted">No cargo yet</span>'}</div>
      <p class="muted small">Rolls used ${s.rolls}/3 · ${s.who !== undefined ? esc(x.names[s.who] || '') + ' ' + esc(s.log) : ''}</p><div class="row-btns"><button class="btn hot" data-i="roll" ${ms.includes('roll') ? '' : 'disabled'}>Roll</button><button class="btn" data-i="stop" ${ms.includes('stop') ? '' : 'disabled'}>Stop and keep cargo</button></div></div>`;
    x.on(d => x.act(d)); }
};

// ---------- Mexico ----------
const mxVal = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); if (hi === 2 && lo === 1) return 1000; if (a === b) return 500 + a * 10; return hi * 10 + lo; };
const mxName = v => v === 1000 ? 'Mexico!' : v >= 500 ? `double ${(v - 500) / 10}s` : String(v);
TB.mexico = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => ({ n, lives: Array(n).fill(3), t: 0, lead: 0, max: 3, rolls: 0, cur: null, best: Array(n).fill(null), done: [], log: '' }), turn: s => s.t,
  moves(s) { if (TB.mexico.result(s)) return []; const out = []; if (s.rolls < s.max) out.push('roll'); if (s.rolls > 0) out.push('stop'); return out; },
  play(s, m) { const n = cl(s), alive = i => n.lives[i] > 0; const finishTurn = () => { n.best[s.t] = n.cur; n.done.push(s.t); if (s.t === s.lead) n.max = n.rolls; n.rolls = 0; n.cur = null;
      let j = s.t; do j = (j + 1) % s.n; while (!alive(j)); if (j === s.lead || n.done.length >= n.lives.filter(l => l > 0).length) { const vals = n.done.map(i => n.best[i]), mn = Math.min(...vals), mexico = vals.includes(1000); const losers = n.done.filter(i => n.best[i] === mn);
        losers.forEach(i => n.lives[i] = Math.max(0, n.lives[i] - (mexico ? 2 : 1))); if (!n.lives.some(l => l > 0)) losers.forEach(i => n.lives[i] = 1); n.log = `${losers.map(i => 'Seat ' + (i + 1)).join(', ')} lowest with ${mxName(mn)}${mexico ? ' (Mexico doubles the loss)' : ''}`; n.last = n.done.map(i => [i, n.best[i]]);
        let lead = losers[0]; while (!alive(lead)) lead = (lead + 1) % s.n; n.lead = lead; n.t = lead; n.max = 3; n.done = []; n.best = Array(s.n).fill(null); } else n.t = j; };
    if (m === 'stop') { finishTurn(); return n; } const a = roll6(), b = roll6(); n.cur = mxVal(a, b); n.dice = [a, b]; n.rolls++; if (n.rolls >= n.max) finishTurn(); return n; },
  result: s => { const a = s.lives.map((l, i) => l > 0 ? i : -1).filter(i => i >= 0); return a.length === 1 ? { winner: a[0] } : null; },
  ai(s, level) { if (!s.rolls) return 'roll'; const tgt = level >= 6 ? 54 : 40 + R(30); return s.cur >= tgt || s.rolls >= s.max ? 'stop' : 'roll'; },
  view(s, x) { const ms = x.can ? TB.mexico.moves(s) : [];
    x.el.innerHTML = `<div class="pig"><div class="pigs">${s.lives.map((l, i) => `<div class="pg ${i === s.t ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><b>${'♥'.repeat(l) || 'out'}</b><small>${s.best[i] !== null ? mxName(s.best[i]) : ''}</small></div>`).join('')}</div>
      <div class="dice">${s.dice && s.cur !== null ? s.dice.map(diceFace).join('') : ''}</div><p>${s.cur !== null ? 'Current: <b>' + mxName(s.cur) + '</b>' : ''} · rolls ${s.rolls}/${s.max}${s.t === s.lead ? ' (you set the roll limit)' : ''}</p><p class="muted small">${esc(s.log)}</p>
      <div class="row-btns"><button class="btn hot" data-i="roll" ${ms.includes('roll') ? '' : 'disabled'}>Roll</button><button class="btn" data-i="stop" ${ms.includes('stop') ? '' : 'disabled'}>Stand on this roll</button></div><p class="muted small">21 (Mexico) is best, then doubles, then high numbers.</p></div>`;
    x.on(d => x.act(d)); }
};
