// Solo & real-time games. Each: start(el, o) -> stop(). o = {level 1-10, score(n), end({score, won})}
const SO = {};
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', ' ': 'A', Enter: 'A' };
function keys(down, up) {
  const h = e => { if (e.target.closest && e.target.closest('input,textarea,select')) return; const k = KEYMAP[e.key]; if (!k) return; e.preventDefault(); (e.type === 'keydown' ? down : up)?.(k, e.repeat); };
  addEventListener('keydown', h); addEventListener('keyup', h); return () => { removeEventListener('keydown', h); removeEventListener('keyup', h); };
}
function pad(el, list, down, up) {
  const LB = { L: '◀', R: '▶', U: '▲', D: '▼', A: 'Fire' }; const d = document.createElement('div'); d.className = 'gpad';
  d.innerHTML = list.map(k => `<button data-k="${k}" aria-label="${k}">${LB[k] || k}</button>`).join(''); el.appendChild(d);
  d.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (b) { e.preventDefault(); down(b.dataset.k); } });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) d.addEventListener(ev, e => { const b = e.target.closest('[data-k]'); if (b && up) up(b.dataset.k); });
}
function swipe(el, fn) { let x0, y0; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); x0 = null; }, { passive: true }); }
function canvas(el, w, h) { el.innerHTML = `<div class="cvw"><canvas width="${w}" height="${h}" style="aspect-ratio:${w}/${h}"></canvas></div>`; const c = el.querySelector('canvas'), g = c.getContext('2d'); if (typeof v2ctx === 'function') v2ctx(g, w, h); return [c, g]; }
function loop(step) { let id, last = performance.now(), alive = true; const f = t => { if (!alive) return; if (typeof Pause !== 'undefined' && Pause.on) { last = t; id = requestAnimationFrame(f); return; } const dt = Math.min(50, t - last); last = t; if (step(dt, t) !== false) id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => { alive = false; cancelAnimationFrame(id); }; }
const C = { felt: '#0f5a43', felt2: '#0b4433', ink: '#f4f7f2', acc: '#ff5a3c', gold: '#ffc23d', blue: '#2f7cf6', vio: '#a259ff', teal: '#19c3b0', dark: '#0a1a14' };
function hud(el, html) { let h = el.querySelector('.hud'); if (!h) { h = document.createElement('div'); h.className = 'hud'; el.prepend(h); } h.innerHTML = html; }
function beep(f = 440, d = 0.08, type = 'square', v = 0.05) { try { if (LS.get('sfx', true) === false) return; const a = Music.ctx(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch (e) {} }

// ---------- Snake ----------
SO.snake = { start(el, o) {
  const N = 20, S = 24, [cv, g] = canvas(el, N * S, N * S); let sn = [[10, 10], [9, 10], [8, 10]], dir = [1, 0], nd = [1, 0], food = place(), acc = 0, score = 0, dead = false; const step = Math.max(55, 175 - o.level * 12);
  function place() { let p; do p = [R(N), R(N)]; while (sn.some(q => q[0] === p[0] && q[1] === p[1])); return p; }
  const turn = k => { const m = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[k]; if (m && (m[0] !== -dir[0] || m[1] !== -dir[1])) nd = m; };
  const un = keys(turn); pad(el, ['L', 'U', 'D', 'R'], turn); swipe(cv, turn);
  const stop = loop(dt => { if (dead) return false; acc += dt; while (acc >= step) { acc -= step; dir = nd; const h = [sn[0][0] + dir[0], sn[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || sn.some(q => q[0] === h[0] && q[1] === h[1])) { dead = true; beep(110, .3, 'sawtooth'); o.end({ score }); return false; }
      sn.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score += 10 + o.level; o.score(score); food = place(); beep(660); } else sn.pop(); }
    g.fillStyle = C.felt2; g.fillRect(0, 0, N * S, N * S); g.fillStyle = '#ffffff08'; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) g.fillRect(i * S, j * S, S, S);
    g.fillStyle = C.acc; g.beginPath(); g.arc(food[0] * S + S / 2, food[1] * S + S / 2, S / 2.6, 0, 7); g.fill();
    sn.forEach((q, i) => { g.fillStyle = i ? (i % 2 ? '#7be0a7' : '#5fd093') : C.gold; g.fillRect(q[0] * S + 2, q[1] * S + 2, S - 4, S - 4); });
  });
  return () => { stop(); un(); };
} };

// ---------- Falling Blocks ----------
// Falling Blocks uses its own set of ten pieces (fours, threes and a pair) on a 12 × 18 well
const SHAPES = [[[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]], [[1,1,1]], [[1,1],[1,0]], [[1,1]]];
const SHC = ['#7c3aed', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef', '#db2777', '#ec4899', '#f43f5e', '#f97316', '#fb923c'];
// One engine for both falling-block games: Falling Blocks (square blocks, seven four-block pieces) and Bead Drop
// (round beads, ten pieces of two to four beads)
function fallGame(el, o, P) {
  const { W, H, S, shapes: SHAPES, cols: SHC, round, ghost } = P;
  const [cv, g] = canvas(el, W * S + 120, H * S); const grid = [...Array(H)].map(() => Array(W).fill(-1));
  let cur, nxt = R(SHAPES.length), score = 0, lines = 0, acc = 0, dead = false, soft = false;
  const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  const fits = (m, x, y) => m.every((r, i) => r.every((v, j) => !v || (x + j >= 0 && x + j < W && y + i < H && (y + i < 0 || grid[y + i][x + j] < 0))));
  const spawn = () => { cur = { k: nxt, m: SHAPES[nxt], x: Math.floor((W - SHAPES[nxt][0].length) / 2), y: -1 }; nxt = R(SHAPES.length); if (!fits(cur.m, cur.x, cur.y)) { dead = true; o.end({ score }); } };
  const lock = () => { cur.m.forEach((r, i) => r.forEach((v, j) => { if (v && cur.y + i >= 0) grid[cur.y + i][cur.x + j] = cur.k; })); if (cur.y < 0) { dead = true; o.end({ score }); return; }
    let n = 0; for (let y = H - 1; y >= 0; y--) if (grid[y].every(v => v >= 0)) { grid.splice(y, 1); grid.unshift(Array(W).fill(-1)); n++; y++; }
    if (n) { lines += n; score += [0, 100, 300, 500, 800][n] * o.level; o.score(score); beep(520 + n * 120, .15); } spawn(); };
  const act = k => { if (dead) return; if (k === 'L' && fits(cur.m, cur.x - 1, cur.y)) cur.x--; if (k === 'R' && fits(cur.m, cur.x + 1, cur.y)) cur.x++;
    if (k === 'U') { const r = rot(cur.m); for (const dx of [0, -1, 1, -2, 2]) if (fits(r, cur.x + dx, cur.y)) { cur.m = r; cur.x += dx; break; } }
    if (k === 'D') soft = true; if (k === 'A') { while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 2; } lock(); } };
  const un = keys(act, k => { if (k === 'D') soft = false; }); pad(el, ['L', 'U', 'D', 'R', 'A'], act, k => { if (k === 'D') soft = false; }); swipe(cv, k => act(k === 'D' ? 'A' : k));
  spawn();
  const stop = loop(dt => { if (dead) return false; const sp = Math.max(70, 820 - (o.level - 1) * 72 - lines * 4); acc += dt * (soft ? 12 : 1);
    if (acc > sp) { acc = 0; if (fits(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); }
    g.fillStyle = C.dark; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = C.felt2; g.fillRect(0, 0, W * S, H * S);
    const cell = (x, y, k, a = 1) => { g.globalAlpha = a; const px = x * S, py = y * S; if (round) { g.fillStyle = SHC[k]; g.beginPath(); g.arc(px + S / 2, py + S / 2, S / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#ffffff55'; g.beginPath(); g.arc(px + S / 2 - 4, py + S / 2 - 4, S / 6, 0, 7); g.fill(); }
      else { g.fillStyle = SHC[k]; g.fillRect(px + 1, py + 1, S - 2, S - 2); g.fillStyle = '#ffffff59'; g.fillRect(px + 1, py + 1, S - 2, 4); g.fillRect(px + 1, py + 1, 4, S - 2); g.fillStyle = '#00000038'; g.fillRect(px + 1, py + S - 5, S - 2, 4); g.fillRect(px + S - 5, py + 1, 4, S - 2); } g.globalAlpha = 1; };
    grid.forEach((r, y) => r.forEach((v, x) => v >= 0 && cell(x, y, v)));
    if (cur && !dead) { let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++; cur.m.forEach((r, i) => r.forEach((v, j) => { if (v) { if (ghost && gy + i >= 0) cell(cur.x + j, gy + i, cur.k, .22); if (cur.y + i >= 0) cell(cur.x + j, cur.y + i, cur.k); } })); }
    g.fillStyle = C.ink; g.font = '600 14px Rubik,sans-serif'; g.fillText('Next', W * S + 16, 24); SHAPES[nxt].forEach((r, i) => r.forEach((v, j) => { if (v) { g.fillStyle = SHC[nxt]; g.fillRect(W * S + 16 + j * 18, 36 + i * 18, 16, 16); } }));
    g.fillStyle = C.ink; g.fillText('Lines', W * S + 16, 120); g.font = '700 22px Rubik,sans-serif'; g.fillText(lines, W * S + 16, 146);
  });
  return () => { stop(); un(); };
}
// Falling Blocks: the classic square-block game. Our own look: an 11 × 20 well and our own colours.
const FB_SHAPES = [[[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]]];
const FB_COLS = ['#ef4444', '#f59e0b', '#a855f7', '#3b82f6', '#ec4899', '#10b981', '#f97316'];
SO.blocks = { start(el, o) { return fallGame(el, o, { W: 11, H: 20, S: 25, shapes: FB_SHAPES, cols: FB_COLS, round: false, ghost: false }); } };
// Bead Drop: round beads, ten pieces of two, three or four beads, in a 12 × 18 well with a landing guide
SO.beads = { start(el, o) { return fallGame(el, o, { W: 12, H: 18, S: 26, shapes: SHAPES, cols: SHC, round: true, ghost: true }); } };

// ---------- 2048 ----------
SO.g2048 = { start(el, o) {
  let b = Array(16).fill(0), score = 0, over = false; const p4 = 0.08 + o.level * 0.035;
  const add = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[e[R(e.length)]] = Math.random() < p4 ? 4 : 2; };
  const line = a => { const f = a.filter(v => v), out = []; for (let i = 0; i < f.length; i++) { if (f[i] === f[i + 1]) { out.push(f[i] * 2); score += f[i] * 2; i++; } else out.push(f[i]); } while (out.length < 4) out.push(0); return out; };
  const idx = (k, i, j) => k === 'L' ? i * 4 + j : k === 'R' ? i * 4 + 3 - j : k === 'U' ? j * 4 + i : (3 - j) * 4 + i;
  const move = k => { if (over) return; const old = b.join(); const nb = b.slice(); for (let i = 0; i < 4; i++) { const ln = line([0, 1, 2, 3].map(j => b[idx(k, i, j)])); ln.forEach((v, j) => nb[idx(k, i, j)] = v); } b = nb; if (b.join() !== old) { add(); o.score(score); beep(300 + Math.log2(Math.max(...b)) * 40, .05, 'triangle'); } draw();
    if (!b.includes(0) && !['L', 'R', 'U', 'D'].some(d => { for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (b[idx(d, i, j)] === b[idx(d, i, j + 1)]) return true; return false; })) { over = true; o.end({ score, won: b.includes(2048) }); } };
  const draw = () => { el.querySelector('.g48').innerHTML = b.map(v => `<div class="t48 v${Math.min(v, 4096)}">${v || ''}</div>`).join(''); };
  el.innerHTML = '<div class="g48 bd"></div>'; add(); add(); draw(); const un = keys(move); swipe(el.querySelector('.g48'), move); pad(el, ['L', 'U', 'D', 'R'], move);
  return un;
} };

// ---------- Mine Sweep ----------
SO.mines = { start(el, o) {
  const W = Math.min(16, 8 + Math.floor(o.level * 0.8)), H = W, M = Math.round(W * H * (0.1 + o.level * 0.011)); let mines = null, open = new Set(), flags = new Set(), over = false, flagMode = false, t0 = Date.now();
  const nb = i => { const r = i / W | 0, c = i % W, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < H && cc >= 0 && cc < W) out.push(rr * W + cc); } return out; };
  const cnt = i => nb(i).filter(j => mines.has(j)).length;
  const reveal = i => { if (open.has(i) || flags.has(i)) return; open.add(i); if (!cnt(i) && !mines.has(i)) nb(i).forEach(reveal); };
  const score = () => open.size * o.level + (over === 'won' ? Math.max(0, 600 - (Date.now() - t0) / 1000 | 0) * o.level : 0);
  const click = (i, flag) => { if (over) return; if (flag || flagMode) { if (!open.has(i)) { flags.has(i) ? flags.delete(i) : flags.add(i); } draw(); return; }
    if (!mines) { mines = new Set(); const safe = new Set([i, ...nb(i)]); while (mines.size < M) { const k = R(W * H); if (!safe.has(k)) mines.add(k); } t0 = Date.now(); }
    if (open.has(i)) { const f = nb(i).filter(j => flags.has(j)).length; if (f === cnt(i)) nb(i).forEach(j => { if (!flags.has(j)) { if (mines.has(j)) { over = 'lost'; } reveal(j); } }); }
    else if (mines.has(i)) over = 'lost'; else reveal(i);
    if (!over && open.size === W * H - M) over = 'won'; o.score(score()); draw(); if (over) { beep(over === 'won' ? 880 : 120, .3); o.end({ score: score(), won: over === 'won' }); } };
  const draw = () => { el.querySelector('.ms').innerHTML = [...Array(W * H)].map((_, i) => { const isO = open.has(i) || (over && mines && mines.has(i)); const m = mines && mines.has(i); const n = mines && !m ? cnt(i) : 0;
      return `<button data-i="${i}" class="${isO ? 'o' : ''} ${isO && m ? 'boom' : ''} n${n}">${isO ? (m ? '●' : n || '') : flags.has(i) ? '<i class="flag"></i>' : ''}</button>`; }).join('');
    el.querySelector('.mshud').innerHTML = `Mines ${M} · Flags ${flags.size} <button class="btn sm ${flagMode ? 'on' : ''}" data-f="1">${flagMode ? 'Flag mode: on' : 'Flag mode: off'}</button>`; };
  el.innerHTML = `<div class="mshud"></div><div class="ms bd" style="grid-template-columns:repeat(${W},1fr)"></div>`;
  const ms = el.querySelector('.ms'); ms.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) click(+b.dataset.i); });
  ms.addEventListener('contextmenu', e => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); click(+b.dataset.i, true); } });
  let lp; ms.addEventListener('touchstart', e => { const b = e.target.closest('[data-i]'); if (b) lp = setTimeout(() => { click(+b.dataset.i, true); lp = 'done'; }, 450); }, { passive: true }); ms.addEventListener('touchend', e => { if (lp === 'done') e.preventDefault(); clearTimeout(lp); lp = null; });
  el.querySelector('.mshud').addEventListener('click', e => { if (e.target.closest('[data-f]')) { flagMode = !flagMode; draw(); } });
  draw(); return () => {};
} };

// ---------- Sudoku ----------
function sdSolve(g, count = false, limit = 2) { let n = 0; const b = g.slice();
  const ok = (i, v) => { const r = i / 9 | 0, c = i % 9, br = r - r % 3, bc = c - c % 3; for (let k = 0; k < 9; k++) { if (b[r * 9 + k] === v || b[k * 9 + c] === v || b[(br + (k / 3 | 0)) * 9 + bc + k % 3] === v) return false; } return true; };
  const rec = () => { const i = b.indexOf(0); if (i < 0) { n++; return !count || n >= limit; } for (const v of shuf([1, 2, 3, 4, 5, 6, 7, 8, 9])) { if (ok(i, v)) { b[i] = v; if (rec()) return true; b[i] = 0; } } return false; };
  rec(); return count ? n : b; }
SO.sudoku = { start(el, o) {
  const sol = sdSolve(Array(81).fill(0)), puz = sol.slice(), target = 81 - (46 - o.level * 2.4 | 0);
  let removed = 0; for (const i of shuf([...Array(81).keys()])) { if (removed >= target) break; const v = puz[i]; puz[i] = 0; if (sdSolve(puz, true) !== 1) puz[i] = v; else removed++; }
  const cur = puz.slice(), notes = [...Array(81)].map(() => new Set()); let sel = -1, pencil = false, mistakes = 0, t0 = Date.now(), done = false;
  const draw = () => { const sv = sel >= 0 ? cur[sel] : 0; el.querySelector('.sd').innerHTML = cur.map((v, i) => { const r = i / 9 | 0, c = i % 9, rel = sel >= 0 && (r === (sel / 9 | 0) || c === sel % 9 || ((r / 3 | 0) === ((sel / 9 | 0) / 3 | 0) && (c / 3 | 0) === ((sel % 9) / 3 | 0)));
      return `<button data-i="${i}" class="${puz[i] ? 'given' : ''} ${i === sel ? 'sel' : rel ? 'rel' : ''} ${v && v === sv ? 'same' : ''} ${v && v !== sol[i] ? 'bad' : ''} ${c % 3 === 2 && c < 8 ? 'br' : ''} ${r % 3 === 2 && r < 8 ? 'bb' : ''}">${v || (notes[i].size ? `<span class="nt">${[1,2,3,4,5,6,7,8,9].map(n => notes[i].has(n) ? n : '&nbsp;').join('')}</span>` : '')}</button>`; }).join('');
    el.querySelector('.sdinfo').textContent = `Mistakes: ${mistakes} · ${pencil ? 'Pencil marks on' : 'Pencil marks off'}`; };
  const put = v => { if (sel < 0 || puz[sel] || done) return; if (pencil && v) { notes[sel].has(v) ? notes[sel].delete(v) : notes[sel].add(v); } else { cur[sel] = v; notes[sel].clear(); if (v && v !== sol[sel]) { mistakes++; beep(150, .1); } }
    if (cur.every((x, i) => x === sol[i])) { done = true; const score = Math.max(50, o.level * 150 + Math.max(0, 900 - (Date.now() - t0) / 1000 | 0) - mistakes * 40); o.score(score); o.end({ score, won: true }); } draw(); };
  el.innerHTML = `<div class="sd bd"></div><p class="sdinfo muted small"></p><div class="numpad">${[1,2,3,4,5,6,7,8,9].map(n => `<button class="btn" data-n="${n}">${n}</button>`).join('')}<button class="btn" data-n="0">Erase</button><button class="btn" data-p="1">Pencil</button></div>`;
  el.querySelector('.sd').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { sel = +b.dataset.i; draw(); } });
  el.querySelector('.numpad').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.p) { pencil = !pencil; draw(); } else put(+b.dataset.n); });
  const kh = e => { if (e.target.closest('input,textarea')) return; if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key === 'Backspace' || e.key === '0') put(0); else if (KEYMAP[e.key] && sel >= 0 && e.key.startsWith('Arrow')) { e.preventDefault(); const d = { L: -1, R: 1, U: -9, D: 9 }[KEYMAP[e.key]]; sel = (sel + d + 81) % 81; draw(); } };
  addEventListener('keydown', kh); draw(); return () => removeEventListener('keydown', kh);
} };

// ---------- 15 Puzzle ----------
SO.fifteen = { start(el, o) {
  const N = o.level >= 8 ? 5 : 4; let b = [...Array(N * N).keys()].map(i => (i + 1) % (N * N)), moves = 0, t0 = Date.now(), done = false;
  const nb = e => { const r = e / N | 0, c = e % N, out = []; if (r) out.push(e - N); if (r < N - 1) out.push(e + N); if (c) out.push(e - 1); if (c < N - 1) out.push(e + 1); return out; };
  let prev = -1; for (let k = 0; k < 20 + o.level * 35; k++) { const e = b.indexOf(0), opts = nb(e).filter(x => x !== prev), m = opts[R(opts.length)]; prev = e; [b[e], b[m]] = [b[m], b[e]]; }
  const tap = i => { if (done) return; const e = b.indexOf(0); if (!nb(e).includes(i)) return; [b[e], b[i]] = [b[i], b[e]]; moves++; beep(500, .03, 'triangle'); draw();
    if (b.every((v, k) => v === (k + 1) % (N * N))) { done = true; const score = Math.max(50, Math.round(o.level * 120 + 3000 / Math.max(1, moves / 10) - (Date.now() - t0) / 1000)); o.score(score); o.end({ score, won: true }); } };
  const draw = () => { el.querySelector('.fif').innerHTML = b.map((v, i) => `<button data-i="${i}" class="${v ? '' : 'gap'} ${v && v === i + 1 ? 'ok' : ''}">${v || ''}</button>`).join(''); el.querySelector('.fifi').textContent = `Moves: ${moves}`; };
  el.innerHTML = `<div class="fif bd" style="grid-template-columns:repeat(${N},1fr)"></div><p class="fifi muted small"></p>`;
  el.querySelector('.fif').addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) tap(+t.dataset.i); });
  const un = keys(k => { const e = b.indexOf(0), r = e / N | 0, c = e % N; const m = { L: c < N - 1 ? e + 1 : -1, R: c ? e - 1 : -1, U: r < N - 1 ? e + N : -1, D: r ? e - N : -1 }[k]; if (m >= 0) tap(m); }); draw(); return un;
} };

// ---------- Lights Off ----------
SO.lightsout = { start(el, o) {
  const N = 5; let b = Array(25).fill(0), moves = 0, done = false; const press = (i, bb = b) => { const r = i / N | 0, c = i % N; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) bb[rr * N + cc] ^= 1; }); };
  for (let k = 0; k < o.level + 3; k++) press(R(25)); if (!b.some(v => v)) press(12);
  const draw = () => { el.querySelector('.lo').innerHTML = b.map((v, i) => `<button data-i="${i}" class="${v ? 'on' : ''}"></button>`).join(''); el.querySelector('.loi').textContent = `Presses: ${moves}`; };
  el.innerHTML = '<div class="lo bd"></div><p class="loi muted small"></p>';
  el.querySelector('.lo').addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (!t || done) return; press(+t.dataset.i); moves++; beep(b[+t.dataset.i] ? 700 : 400, .05, 'sine'); draw(); if (!b.some(v => v)) { done = true; const score = Math.max(50, 500 + o.level * 100 - moves * 15); o.score(score); o.end({ score, won: true }); } });
  draw(); return () => {};
} };

// ---------- Peg Solitaire ----------
SO.peg = { start(el, o) {
  const valid = i => { const r = i / 7 | 0, c = i % 7; return (r >= 2 && r <= 4) || (c >= 2 && c <= 4); };
  let b = [...Array(49)].map((_, i) => valid(i) ? 1 : -1); b[24] = 0; let sel = -1, hist = [], undos = Math.max(0, 11 - o.level), over = false;
  const jumps = () => { const out = []; b.forEach((v, i) => { if (v !== 1) return; const r = i / 7 | 0, c = i % 7; [[0, 2], [0, -2], [2, 0], [-2, 0]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return; const t = rr * 7 + cc, m = (r + dr / 2) * 7 + c + dc / 2; if (b[t] === 0 && b[m] === 1) out.push({ f: i, t, m }); }); }); return out; };
  const left = () => b.filter(v => v === 1).length, score = () => (32 - left()) * 20 * o.level / 3 + (left() === 1 ? 500 + (b[24] === 1 ? 500 : 0) : 0) | 0;
  const draw = () => { const js = jumps(), tg = new Set(js.filter(j => j.f === sel).map(j => j.t));
    el.querySelector('.peg').innerHTML = b.map((v, i) => v < 0 ? '<i></i>' : `<button data-i="${i}" class="${v ? 'p' : 'h'} ${i === sel ? 'sel' : ''} ${tg.has(i) ? 'tg' : ''}"></button>`).join('');
    el.querySelector('.pegi').innerHTML = `Pegs left: ${left()} <button class="btn sm" data-u="1" ${hist.length && undos ? '' : 'disabled'}>Undo (${undos} left)</button>`;
    if (!js.length && !over) { over = true; o.score(score()); o.end({ score: score(), won: left() === 1 }); } };
  el.innerHTML = '<div class="peg bd"></div><p class="pegi muted small"></p>';
  el.addEventListener('click', e => { if (e.target.closest('[data-u]') && hist.length && undos) { b = hist.pop(); undos--; over = false; draw(); return; } const t = e.target.closest('.peg [data-i]'); if (!t || over) return; const i = +t.dataset.i; const j = jumps().find(j => j.f === sel && j.t === i);
    if (j) { hist.push(b.slice()); b[j.f] = 0; b[j.m] = 0; b[j.t] = 1; sel = -1; beep(520, .05); o.score(score()); } else if (b[i] === 1) sel = i; draw(); });
  draw(); return () => {};
} };

// ---------- Code Breaker ----------
SO.codebreaker = { start(el, o) {
  const P = o.level <= 3 ? 4 : o.level <= 7 ? 5 : 6, NC = P + 2, COLS = ['#ff5a3c', '#2f7cf6', '#ffc23d', '#19a974', '#a259ff', '#ff7ac6', '#19c3b0', '#8b5a2b'].slice(0, NC);
  const code = [...Array(P)].map(() => R(NC)); let rows = [], cur = [], over = false;
  const fb = g => { let b = 0, w = 0; const cc = [], gg = []; g.forEach((v, i) => { if (v === code[i]) b++; else { cc.push(code[i]); gg.push(v); } }); gg.forEach(v => { const k = cc.indexOf(v); if (k >= 0) { w++; cc.splice(k, 1); } }); return [b, w]; };
  const draw = () => { el.querySelector('.cb').innerHTML = rows.map(r => `<div class="cbr">${r.g.map(v => `<i style="background:${COLS[v]}"></i>`).join('')}<span class="fb">${'<b></b>'.repeat(r.f[0])}${'<u></u>'.repeat(r.f[1])}</span></div>`).join('') +
      (over ? `<div class="cbr">${code.map(v => `<i style="background:${COLS[v]}"></i>`).join('')}<span class="muted">the code</span></div>` : `<div class="cbr cur">${[...Array(P)].map((_, i) => `<i style="background:${cur[i] !== undefined ? COLS[cur[i]] : 'transparent'}"></i>`).join('')}</div>`);
    el.querySelector('.cbp').innerHTML = COLS.map((c, i) => `<button class="peg1" data-c="${i}" style="background:${c}" aria-label="colour ${i + 1}"></button>`).join('') + `<button class="btn sm" data-x="1">Back</button><button class="btn sm hot" data-g="1" ${cur.length === P ? '' : 'disabled'}>Guess</button>`;
    el.querySelector('.cbi').textContent = `Guess ${Math.min(rows.length + 1, 10)} of 10 · ${P} pegs, ${NC} colours`; };
  el.innerHTML = '<p class="cbi muted small"></p><div class="cb"></div><div class="cbp"></div>';
  el.querySelector('.cbp').addEventListener('click', e => { const t = e.target.closest('button'); if (!t || over) return; if (t.dataset.c && cur.length < P) cur.push(+t.dataset.c); if (t.dataset.x) cur.pop();
    if (t.dataset.g && cur.length === P) { const f = fb(cur); rows.push({ g: cur, f }); cur = []; if (f[0] === P || rows.length >= 10) { over = true; const won = f[0] === P, score = won ? (11 - rows.length) * 60 * o.level : 0; o.score(score); o.end({ score, won }); } } draw(); });
  draw(); return () => {};
} };

// ---------- Memory Match ----------
const MSHAPES = ['<circle cx="20" cy="20" r="12"/>', '<rect x="8" y="8" width="24" height="24"/>', '<path d="M20 6 L34 32 H6Z"/>', '<path d="M20 5 L35 20 L20 35 L5 20Z"/>', '<path d="M20 4 L24 15 L36 15 L26 22 L30 34 L20 27 L10 34 L14 22 L4 15 L16 15Z"/>', '<path d="M15 6h10v9h9v10h-9v9H15v-9H6V15h9z"/>', '<circle cx="20" cy="20" r="13" fill="none" stroke-width="5"/>', '<path d="M20 4 L34 12 V28 L20 36 L6 28 V12Z"/>'];
SO.memory = { start(el, o) {
  const pairs = Math.min(16, 5 + o.level), cols = ['#ff5a3c', '#2f7cf6'], deck = shuf([...Array(pairs)].flatMap((_, k) => [k, k])); let up = [], done = new Set(), miss = 0, lock = false, t0 = Date.now();
  const face = k => `<svg viewBox="0 0 40 40" style="fill:${cols[k >> 3]};stroke:${cols[k >> 3]}">${MSHAPES[k % 8]}</svg>`;
  const draw = () => { el.querySelector('.mem').innerHTML = deck.map((k, i) => `<button data-i="${i}" class="${up.includes(i) || done.has(i) ? 'up' : ''} ${done.has(i) ? 'done' : ''}">${up.includes(i) || done.has(i) ? face(k) : ''}</button>`).join(''); el.querySelector('.memi').textContent = `Pairs ${done.size / 2} of ${pairs} · misses ${miss}`; };
  el.innerHTML = `<div class="mem bd" style="grid-template-columns:repeat(${pairs > 10 ? 8 : pairs > 6 ? 6 : 4},1fr)"></div><p class="memi muted small"></p>`;
  el.querySelector('.mem').addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (!t || lock) return; const i = +t.dataset.i; if (up.includes(i) || done.has(i)) return; up.push(i); beep(600, .04, 'sine'); draw();
    if (up.length === 2) { lock = true; setTimeout(() => { if (deck[up[0]] === deck[up[1]]) { up.forEach(x => done.add(x)); beep(880, .1, 'sine'); } else miss++; up = []; lock = false; draw();
      if (done.size === deck.length) { const score = Math.max(50, pairs * 100 - miss * 15 + Math.max(0, 300 - (Date.now() - t0) / 1000 | 0)); o.score(score); o.end({ score, won: true }); } }, 650); } });
  draw(); return () => {};
} };

// ---------- Tower of Hanoi ----------
SO.hanoi = { start(el, o) {
  const n = 2 + Math.ceil(o.level / 1.6); let pegs = [[...Array(n)].map((_, i) => n - i), [], []], hold = -1, moves = 0, done = false; const opt = 2 ** n - 1;
  const draw = () => { el.querySelector('.han').innerHTML = pegs.map((p, k) => `<button data-p="${k}" class="hp ${hold === k ? 'sel' : ''}"><i class="rod"></i>${p.map((d, j) => `<i class="disk" style="width:${20 + d * 70 / n}%;bottom:${j * 22 + 8}px;background:hsl(${d * 37},75%,58%)"></i>`).join('')}</button>`).join(''); el.querySelector('.hani').textContent = `Moves ${moves} · best possible ${opt}`; };
  el.innerHTML = '<div class="han bd"></div><p class="hani muted small"></p>';
  el.querySelector('.han').addEventListener('click', e => { const t = e.target.closest('[data-p]'); if (!t || done) return; const k = +t.dataset.p;
    if (hold < 0) { if (pegs[k].length) hold = k; } else { const d = pegs[hold][pegs[hold].length - 1], top = pegs[k][pegs[k].length - 1]; if (k !== hold && (!top || top > d)) { pegs[k].push(pegs[hold].pop()); moves++; beep(300 + d * 60, .06, 'triangle'); } hold = -1; }
    draw(); if (pegs[1].length === n || pegs[2].length === n) { done = true; const score = Math.round(1000 * n * opt / moves / 3); o.score(score); o.end({ score, won: true }); } });
  draw(); return () => {};
} };

// ---------- Word games ----------
const WORDS5 = 'about above actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter amber among angle angry apart apple apply arena argue arise array aside asset audio avoid award aware badge baker basic beach begin being below bench birth black blade blame blank blast blend bless blind block bloom board boast bonus boost booth brain brand brave bread break brick brief bring broad brown brush build bunch burst buyer cabin cable candy cargo carry catch cause chain chair chalk charm chart chase cheap check chess chest chief child chill civic claim class clean clear clerk click cliff climb clock close cloud coach coast color coral count court cover craft crane crash cream crime crisp cross crowd crown curve cycle daily dance dealt death delay depth diary dream dress drink drive eager early earth eight elbow elect empty enjoy enter entry equal error event exact exist extra faith false fancy feast fence field fifth fight final flame flash fleet float flock floor flour fluid focus force forge forth forum found frame fresh front frost fruit games giant given glass globe glory grace grade grain grand grant grape graph grass great green greet grill group guard guess guest guide habit happy harsh heart heavy honey horse hotel house human humor ideal image index inner input issue ivory jelly jewel joint judge juice knife label large laser later laugh layer learn lemon level light limit linen local logic loose lucky lunar lunch magic major maker maple march match mayor medal metal minor model money month moral motor mount mouse mouth movie music nerve never night noble noise north novel nurse ocean offer olive onion opera orbit order other outer owner paint panel paper party patch peace pearl phase phone photo piano piece pilot pitch pixel pizza place plain plane plant plate point polar power press price pride prime print prize proof proud queen quick quiet quite radio raise range rapid ratio reach ready realm relax reply river roast robot rocky round route royal rural salad sauce scale scene scope score sense serve seven shade shake shape share shark sharp sheep shelf shell shift shine shirt shock shore short shown sight skill slate sleep slice slide smart smile smoke snack solar solid solve sound south space spare speak speed spend spice spike spoon sport spray squad stack staff stage stair stamp stand start state steam steel stick still stone storm story stove strip study style sugar suite sunny super sweet swing table taste teach thank theme thick thing think third three throw thumb tiger timer title toast today token topic total touch tower track trade trail train treat trend trial tribe trick truck trust truth twist uncle under union unity upper urban usual valid value video vital vivid voice watch water whale wheat wheel white whole width woman world worth wrist yield young youth zebra'.split(' ');
SO.five = { start(el, o) {
  const ans = WORDS5[R(WORDS5.length)], tries = o.level >= 9 ? 5 : 6, hard = o.level >= 6; let rows = [], cur = '', over = false, known = {};
  const mark = g => { const res = Array(5).fill('x'), pool = ans.split(''); g.split('').forEach((ch, i) => { if (ch === ans[i]) { res[i] = 'g'; pool[i] = null; } }); g.split('').forEach((ch, i) => { if (res[i] === 'g') return; const k = pool.indexOf(ch); if (k >= 0) { res[i] = 'y'; pool[k] = null; } }); return res; };
  const draw = () => { el.querySelector('.fw').innerHTML = [...Array(tries)].map((_, r) => { const row = rows[r]; const w = row ? row.g : r === rows.length ? cur.padEnd(5) : '     '; return `<div class="fwr">${[...Array(5)].map((_, i) => `<span class="${row ? row.m[i] : ''}">${w[i] && w[i] !== ' ' ? w[i].toUpperCase() : ''}</span>`).join('')}</div>`; }).join('');
    el.querySelector('.kb').innerHTML = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r, i) => `<div>${i === 2 ? '<button data-k="enter" class="wide">Enter</button>' : ''}${r.split('').map(ch => `<button data-k="${ch}" class="${known[ch] || ''}">${ch.toUpperCase()}</button>`).join('')}${i === 2 ? '<button data-k="back" class="wide">Del</button>' : ''}</div>`).join(''); };
  const msg = t => { el.querySelector('.fwm').textContent = t; };
  const key = k => { if (over) return; if (k === 'back') cur = cur.slice(0, -1); else if (k === 'enter') { if (cur.length < 5) return msg('Five letters, please.');
      if (hard && rows.length) { const last = rows[rows.length - 1]; for (let i = 0; i < 5; i++) { if (last.m[i] === 'g' && cur[i] !== last.g[i]) return msg('Hard mode: keep green letters in place.'); if (last.m[i] === 'y' && !cur.includes(last.g[i])) return msg('Hard mode: use the yellow letters.'); } }
      const m = mark(cur); rows.push({ g: cur, m }); cur.split('').forEach((ch, i) => { const rank = { g: 3, y: 2, x: 1 }, now = { g: 'g', y: 'y', x: 'x' }[m[i]]; if (!known[ch] || rank[now] > rank[known[ch]]) known[ch] = now; }); cur = ''; msg('');
      if (m.every(v => v === 'g') || rows.length >= tries) { over = true; const won = m.every(v => v === 'g'), score = won ? (tries + 1 - rows.length) * 100 * (hard ? 2 : 1) + o.level * 10 : 0; msg(won ? 'Solved!' : 'The word was ' + ans.toUpperCase()); o.score(score); o.end({ score, won }); } }
    else if (/^[a-z]$/.test(k) && cur.length < 5) cur += k; draw(); };
  el.innerHTML = `<div class="fw"></div><p class="fwm"></p><div class="kb"></div>${hard ? '<p class="muted small">Hard mode: revealed hints must be used.</p>' : ''}`;
  el.querySelector('.kb').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) key(b.dataset.k); });
  const kh = e => { if (e.target.closest('input,textarea')) return; if (e.key === 'Enter') key('enter'); else if (e.key === 'Backspace') key('back'); else if (/^[a-zA-Z]$/.test(e.key)) key(e.key.toLowerCase()); };
  addEventListener('keydown', kh); draw(); return () => removeEventListener('keydown', kh);
} };
const HWORDS = { Animals: 'giraffe penguin dolphin elephant kangaroo octopus squirrel hedgehog flamingo cheetah tortoise butterfly', Food: 'pancake avocado spaghetti pineapple cinnamon broccoli dumpling lasagna pretzel blueberry omelette', Places: 'library volcano lighthouse harbor desert island village canyon museum stadium glacier meadow', Things: 'umbrella telescope keyboard backpack lantern compass bicycle notebook trumpet hammock calendar', Games: 'checkers dominoes solitaire marbles crossword jigsaw backgammon chess mahjong scrabble'.replace('scrabble', 'puzzle') };
SO.hangman = { start(el, o) {
  let score = 0, streak = 0, word, cat, guessed, wrong, over = false; const lives = 10 - Math.ceil(o.level / 2);
  const next = () => { const cats = Object.keys(HWORDS); cat = cats[R(cats.length)]; const ws = HWORDS[cat].split(' ').sort((a, b) => a.length - b.length); const band = Math.min(ws.length - 1, Math.floor(ws.length * (o.level - 1) / 10) + R(3)); word = ws[band]; guessed = new Set(); wrong = 0; draw(); };
  const parts = ['<line x1="10" y1="95" x2="60" y2="95"/>', '<line x1="25" y1="95" x2="25" y2="8"/>', '<line x1="25" y1="8" x2="65" y2="8"/>', '<line x1="65" y1="8" x2="65" y2="20"/>', '<circle cx="65" cy="28" r="8"/>', '<line x1="65" y1="36" x2="65" y2="62"/>', '<line x1="65" y1="44" x2="54" y2="54"/>', '<line x1="65" y1="44" x2="76" y2="54"/>', '<line x1="65" y1="62" x2="56" y2="78"/>', '<line x1="65" y1="62" x2="74" y2="78"/>'];
  const draw = () => { const show = parts.slice(0, Math.round(wrong * parts.length / lives));
    el.innerHTML = `<div class="hang"><svg viewBox="0 0 100 100">${show.join('')}</svg><div><p class="muted">Category: <b>${cat}</b> · lives ${lives - wrong} · streak ${streak} · score ${score}</p><div class="hw">${word.split('').map(ch => `<span>${guessed.has(ch) || over ? ch.toUpperCase() : ''}</span>`).join('')}</div>
      <div class="kb">${'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => `<button data-k="${ch}" class="${guessed.has(ch) ? (word.includes(ch) ? 'g' : 'x') : ''}" ${guessed.has(ch) || over ? 'disabled' : ''}>${ch.toUpperCase()}</button>`).join('')}</div></div></div>`; };
  const guess = ch => { if (over || guessed.has(ch)) return; guessed.add(ch); if (!word.includes(ch)) { wrong++; beep(160, .1); } else beep(640, .05, 'sine');
    if (word.split('').every(c => guessed.has(c))) { streak++; score += (word.length * 10 + (lives - wrong) * 20) * o.level; o.score(score); draw(); setTimeout(next, 900); return; }
    if (wrong >= lives) { over = true; draw(); o.end({ score, won: streak > 0 }); return; } draw(); };
  el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) guess(b.dataset.k); });
  const kh = e => { if (e.target.closest('input,textarea')) return; if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toLowerCase()); }; addEventListener('keydown', kh); next(); return () => removeEventListener('keydown', kh);
} };

// ---------- Brick Breaker ----------
SO.breaker = { start(el, o) {
  const W = 480, H = 600, [cv, g] = canvas(el, W, H); let px = W / 2, pw = 90 - o.level * 3, ball, bricks, lives = 3, score = 0, wave = 0, keysDown = {}, dead = false, stuck = true;
  const newWave = () => { wave++; bricks = []; const rows = 4 + Math.min(4, Math.floor(o.level / 2)); for (let r = 0; r < rows; r++) for (let c = 0; c < 10; c++) bricks.push({ x: 8 + c * 46.4, y: 60 + r * 24, hp: r < rows / 3 && o.level > 5 ? 2 : 1, c: SHC[r % 7] }); reset(); };
  const reset = () => { stuck = true; const sp = 4 + o.level * 0.45 + wave * 0.3; ball = { x: px, y: H - 50, vx: sp * 0.6, vy: -sp * 0.8, r: 7 }; };
  newWave(); const un = keys(k => { keysDown[k] = 1; if (k === 'A') stuck = false; }, k => { keysDown[k] = 0; }); pad(el, ['L', 'A', 'R'], k => { keysDown[k] = 1; if (k === 'A') stuck = false; }, k => { keysDown[k] = 0; });
  const mv = e => { const r = cv.getBoundingClientRect(); px = Math.max(pw / 2, Math.min(W - pw / 2, (e.clientX - r.left) * W / r.width)); }; cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', e => { mv(e); stuck = false; });
  const stop = loop(dt => { if (dead) return false; const f = dt / 16.7;
    if (keysDown.L) px = Math.max(pw / 2, px - 8 * f); if (keysDown.R) px = Math.min(W - pw / 2, px + 8 * f);
    if (stuck) { ball.x = px; ball.y = H - 42; } else { ball.x += ball.vx * f; ball.y += ball.vy * f;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x)); } if (ball.y < ball.r) { ball.vy = Math.abs(ball.vy); }
      if (ball.y > H - 40 && ball.y < H - 24 && Math.abs(ball.x - px) < pw / 2 + ball.r && ball.vy > 0) { const sp = Math.hypot(ball.vx, ball.vy), a = (ball.x - px) / (pw / 2) * 1.05; ball.vx = sp * Math.sin(a); ball.vy = -sp * Math.cos(a); beep(330, .03); }
      for (const b of bricks) { if (b.hp > 0 && ball.x > b.x - ball.r && ball.x < b.x + 42 + ball.r && ball.y > b.y - ball.r && ball.y < b.y + 18 + ball.r) { b.hp--; ball.vy *= -1; score += 10 * o.level; o.score(score); beep(600 + b.y, .03); break; } }
      if (ball.y > H + 20) { lives--; beep(110, .3); if (!lives) { dead = true; o.end({ score }); return false; } reset(); }
      if (bricks.every(b => b.hp <= 0)) { score += 200 * o.level; newWave(); } }
    g.fillStyle = C.dark; g.fillRect(0, 0, W, H); bricks.forEach(b => { if (b.hp > 0) { g.fillStyle = b.c; g.globalAlpha = b.hp > 1 ? 1 : .85; g.fillRect(b.x, b.y, 42, 18); g.globalAlpha = 1; g.fillStyle = '#ffffff40'; g.fillRect(b.x, b.y, 42, 4); } });
    g.fillStyle = C.gold; g.fillRect(px - pw / 2, H - 34, pw, 10); g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, 7); g.fill();
    g.fillStyle = C.ink; g.font = '600 16px Rubik,sans-serif'; g.fillText(`Lives ${lives}   Wave ${wave}`, 12, 26); if (stuck) g.fillText('Tap or press Space to launch', W / 2 - 110, H / 2);
  });
  return () => { stop(); un(); };
} };

// ---------- Paddle Ball (vs computer) ----------
SO.paddle = { start(el, o) {
  const W = 600, H = 400, [cv, g] = canvas(el, W, H); let py = H / 2, ay = H / 2, b, sc = [0, 0], kd = {}, over = false, wait = 60; const ph = 80;
  const serve = d => { const sp = 5 + o.level * 0.35; b = { x: W / 2, y: H / 2, vx: sp * d, vy: (Math.random() - .5) * sp }; wait = 50; }; serve(1);
  const un = keys(k => kd[k] = 1, k => kd[k] = 0); pad(el, ['U', 'D'], k => kd[k] = 1, k => kd[k] = 0);
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); py = (e.clientY - r.top) * H / r.height; });
  const stop = loop(dt => { if (over) return false; const f = dt / 16.7; if (kd.U) py -= 7 * f; if (kd.D) py += 7 * f; py = Math.max(ph / 2, Math.min(H - ph / 2, py));
    const aiSp = 1.6 + o.level * 0.55, target = b.vx > 0 ? b.y + (Math.sin(performance.now() / 400) * (11 - o.level) * 6) : H / 2; ay += Math.max(-aiSp, Math.min(aiSp, target - ay)) * f; ay = Math.max(ph / 2, Math.min(H - ph / 2, ay));
    if (wait > 0) wait -= f; else { b.x += b.vx * f; b.y += b.vy * f; if (b.y < 6 || b.y > H - 6) { b.vy *= -1; b.y = Math.max(6, Math.min(H - 6, b.y)); }
      if (b.x < 26 && b.x > 10 && Math.abs(b.y - py) < ph / 2 + 6 && b.vx < 0) { b.vx = -b.vx * 1.05; b.vy += (b.y - py) * 0.12; beep(440, .03); }
      if (b.x > W - 26 && b.x < W - 10 && Math.abs(b.y - ay) < ph / 2 + 6 && b.vx > 0) { b.vx = -b.vx * 1.05; b.vy += (b.y - ay) * 0.12; beep(380, .03); }
      if (b.x < -10) { sc[1]++; beep(140, .2); serve(1); } if (b.x > W + 10) { sc[0]++; o.score(sc[0] * 10 * o.level); beep(880, .15); serve(-1); }
      if (sc[0] >= 7 || sc[1] >= 7) { over = true; const won = sc[0] > sc[1], score = sc[0] * 10 * o.level + (won ? 200 * o.level : 0); o.score(score); o.end({ score, won }); } }
    g.fillStyle = C.felt2; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff22'; for (let y = 0; y < H; y += 24) g.fillRect(W / 2 - 2, y, 4, 12);
    g.fillStyle = C.ink; g.font = '700 42px Rubik,sans-serif'; g.fillText(sc[0], W / 2 - 60, 54); g.fillText(sc[1], W / 2 + 36, 54);
    g.fillStyle = C.gold; g.fillRect(12, py - ph / 2, 12, ph); g.fillStyle = C.acc; g.fillRect(W - 24, ay - ph / 2, 12, ph); g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, 7, 0, 7); g.fill();
  });
  return () => { stop(); un(); };
} };

// ---------- Star Defender ----------
SO.invaders = { start(el, o) {
  const W = 480, H = 600, [cv, g] = canvas(el, W, H); let px = W / 2, kd = {}, shots = [], bombs = [], foes, dir = 1, score = 0, lives = 3, wave = 0, cd = 0, dead = false, inv = 0;
  const newWave = () => { wave++; foes = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) foes.push({ x: 50 + c * 44, y: 60 + r * 36, r, alive: true }); };
  newWave(); const fire = () => { if (cd <= 0) { shots.push({ x: px, y: H - 60 }); cd = 18; beep(900, .03); } };
  const un = keys(k => { kd[k] = 1; if (k === 'A' || k === 'U') fire(); }, k => kd[k] = 0); pad(el, ['L', 'A', 'R'], k => { kd[k] = 1; if (k === 'A') fire(); }, k => kd[k] = 0);
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); px = (e.clientX - r.left) * W / r.width; fire(); });
  const drawFoe = (x, y, r) => { g.fillStyle = [C.acc, C.vio, C.teal, C.blue, C.gold][r]; g.beginPath(); g.moveTo(x - 14, y + 8); g.lineTo(x - 10, y - 8); g.lineTo(x + 10, y - 8); g.lineTo(x + 14, y + 8); g.lineTo(x + 6, y + 2); g.lineTo(x - 6, y + 2); g.closePath(); g.fill(); g.fillStyle = C.dark; g.fillRect(x - 6, y - 4, 4, 4); g.fillRect(x + 2, y - 4, 4, 4); };
  const stop = loop(dt => { if (dead) return false; const f = dt / 16.7; cd -= f; inv -= f; if (kd.L) px -= 6 * f; if (kd.R) px += 6 * f; px = Math.max(20, Math.min(W - 20, px));
    const alive = foes.filter(q => q.alive), sp = (0.4 + o.level * 0.08 + wave * 0.1) * (1 + (45 - alive.length) / 30) * f;
    let edge = alive.some(q => (q.x > W - 20 && dir > 0) || (q.x < 20 && dir < 0)); if (edge) { dir *= -1; alive.forEach(q => q.y += 14); } alive.forEach(q => q.x += dir * sp);
    if (Math.random() < (0.01 + o.level * 0.004) * f && alive.length) { const q = alive[R(alive.length)]; bombs.push({ x: q.x, y: q.y }); }
    shots.forEach(s => s.y -= 9 * f); bombs.forEach(s => s.y += (3 + o.level * 0.3) * f);
    for (const s of shots) for (const q of alive) if (q.alive && Math.abs(s.x - q.x) < 15 && Math.abs(s.y - q.y) < 12) { q.alive = false; s.y = -99; score += (5 - q.r) * 10 * o.level / 2 | 0; o.score(score); beep(300, .05, 'sawtooth'); }
    for (const s of bombs) if (inv <= 0 && Math.abs(s.x - px) < 18 && s.y > H - 64 && s.y < H - 36) { s.y = H + 99; lives--; inv = 60; beep(100, .3); if (!lives) { dead = true; o.end({ score }); return false; } }
    shots = shots.filter(s => s.y > -20); bombs = bombs.filter(s => s.y < H + 20);
    if (alive.some(q => q.y > H - 80)) { dead = true; o.end({ score }); return false; } if (!alive.length) newWave();
    g.fillStyle = '#071510'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff30'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53 + performance.now() / 40) % H, 2, 2);
    foes.forEach(q => q.alive && drawFoe(q.x, q.y, q.r)); g.fillStyle = C.gold; shots.forEach(s => g.fillRect(s.x - 2, s.y - 8, 4, 12)); g.fillStyle = C.acc; bombs.forEach(s => g.fillRect(s.x - 2, s.y - 6, 4, 10));
    if (inv <= 0 || (inv | 0) % 8 < 4) { g.fillStyle = '#7be0a7'; g.beginPath(); g.moveTo(px, H - 62); g.lineTo(px + 18, H - 38); g.lineTo(px - 18, H - 38); g.fill(); }
    g.fillStyle = C.ink; g.font = '600 16px Rubik,sans-serif'; g.fillText(`Lives ${lives}   Wave ${wave}`, 12, 26);
  });
  return () => { stop(); un(); };
} };

// ---------- Sky Hopper ----------
SO.hopper = { start(el, o) {
  const W = 400, H = 600, [cv, g] = canvas(el, W, H); let y = H / 2, vy = 0, cols = [], t = 0, score = 0, dead = false, started = false; const gap = 190 - o.level * 9, sp = 2.2 + o.level * 0.25;
  const flap = () => { started = true; vy = -7.2; beep(520, .04, 'sine'); }; const un = keys(k => { if (k === 'A' || k === 'U') flap(); }); cv.addEventListener('pointerdown', flap); pad(el, ['A'], flap);
  const stop = loop(dt => { if (dead) return false; const f = dt / 16.7; if (started) { vy += 0.42 * f; y += vy * f; t += f; if (t > 95) { t = 0; cols.push({ x: W + 30, gy: 90 + R(H - 180 - gap), passed: false }); } }
    cols.forEach(c => c.x -= sp * f); cols = cols.filter(c => c.x > -80);
    for (const c of cols) { if (!c.passed && c.x < 80) { c.passed = true; score += o.level; o.score(score); beep(760, .04, 'sine'); } if (c.x < 100 && c.x > 40 && (y - 14 < c.gy || y + 14 > c.gy + gap)) { dead = true; } }
    if (y > H - 20 || y < -40) dead = true; if (dead) { beep(120, .3); o.end({ score }); return false; }
    g.fillStyle = '#7fd3ff'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffffaa'; for (let i = 0; i < 5; i++) { const cx = (i * 130 - performance.now() / 30) % (W + 120); g.beginPath(); g.arc(cx < -60 ? cx + W + 120 : cx, 80 + i * 60, 26, 0, 7); g.fill(); }
    g.fillStyle = C.felt; cols.forEach(c => { g.fillRect(c.x - 30, 0, 60, c.gy); g.fillRect(c.x - 30, c.gy + gap, 60, H); g.fillStyle = '#ffffff30'; g.fillRect(c.x - 30, 0, 8, H); g.fillStyle = C.felt; });
    g.fillStyle = '#3f8f3a'; g.fillRect(0, H - 16, W, 16);
    g.save(); g.translate(70, y); g.rotate(Math.max(-.5, Math.min(1, vy / 10))); g.fillStyle = C.gold; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill(); g.fillStyle = C.acc; g.beginPath(); g.moveTo(12, -2); g.lineTo(24, 3); g.lineTo(12, 7); g.fill(); g.fillStyle = '#000'; g.fillRect(4, -7, 4, 4); g.restore();
    g.fillStyle = C.dark; g.font = '700 30px Rubik,sans-serif'; g.fillText(score, W / 2 - 10, 50); if (!started) g.fillText('Tap to fly', W / 2 - 70, H / 2 + 60);
  });
  return () => { stop(); un(); };
} };

// ---------- Color Echo ----------
SO.echo = { start(el, o) {
  const cols = ['#19a974', '#ff5a3c', '#ffc23d', '#2f7cf6'], tones = [330, 392, 494, 587]; let seq = [], idx = 0, busy = true, over = false, timers = [];
  el.innerHTML = `<div class="echo bd">${cols.map((c, i) => `<button data-i="${i}" style="--c:${c}"></button>`).join('')}<div class="echoc">Round <b>0</b></div></div>`;
  const pads = [...el.querySelectorAll('.echo [data-i]')]; const flash = (i, ms) => { pads[i].classList.add('lit'); beep(tones[i], ms / 1000, 'sine', .08); timers.push(setTimeout(() => pads[i].classList.remove('lit'), ms)); };
  const gap = Math.max(180, 650 - o.level * 45);
  const round = () => { seq.push(R(4)); idx = 0; busy = true; el.querySelector('.echoc b').textContent = seq.length; seq.forEach((v, k) => timers.push(setTimeout(() => flash(v, gap * 0.7), 500 + k * gap))); timers.push(setTimeout(() => busy = false, 500 + seq.length * gap)); };
  el.querySelector('.echo').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b || busy || over) return; const i = +b.dataset.i; flash(i, 200);
    if (i !== seq[idx]) { over = true; beep(110, .5, 'sawtooth'); const score = (seq.length - 1) * 10 * o.level; o.end({ score }); return; } idx++; if (idx === seq.length) { o.score(seq.length * 10 * o.level); timers.push(setTimeout(round, 700)); } });
  round(); return () => timers.forEach(clearTimeout);
} };

// ---------- Whack-a-Mole ----------
SO.whack = { start(el, o) {
  let score = 0, time = 45, up = new Map(), over = false; const stay = Math.max(380, 1300 - o.level * 95);
  el.innerHTML = `<div class="hud2">Time <b class="whkt">45</b> · Score <b class="whks">0</b></div><div class="whack bd">${[...Array(9)].map((_, i) => `<button data-i="${i}"><i></i></button>`).join('')}</div>`;
  const holes = [...el.querySelectorAll('.whack [data-i]')];
  const tick = setInterval(() => { time--; el.querySelector('.whkt').textContent = time; if (time <= 0) { over = true; clearInterval(tick); clearInterval(spawn); o.end({ score }); } }, 1000);
  const spawn = setInterval(() => { if (over) return; const i = R(9); if (up.has(i)) return; holes[i].classList.add('up'); up.set(i, setTimeout(() => { holes[i].classList.remove('up'); up.delete(i); }, stay)); }, Math.max(260, 900 - o.level * 60));
  el.querySelector('.whack').addEventListener('pointerdown', e => { const b = e.target.closest('[data-i]'); if (!b || over) return; const i = +b.dataset.i;
    if (up.has(i)) { clearTimeout(up.get(i)); up.delete(i); b.classList.remove('up'); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 200); score += 10 * o.level; beep(700, .05); } else { score = Math.max(0, score - 5); beep(150, .05); }
    el.querySelector('.whks').textContent = score; o.score(score); });
  return () => { clearInterval(tick); clearInterval(spawn); up.forEach(clearTimeout); };
} };

// ---------- Light Trails (vs computer) ----------
SO.trails = { start(el, o) {
  const GW = 60, GH = 40, S = 10, [cv, g] = canvas(el, GW * S, GH * S); let grid, p, a, wins = [0, 0], acc = 0, pause = 60, over = false; const step = Math.max(45, 95 - o.level * 4);
  const DIR = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };
  const reset = () => { grid = new Uint8Array(GW * GH); p = { x: 10, y: GH / 2, d: [1, 0], nd: [1, 0] }; a = { x: GW - 11, y: GH / 2, d: [-1, 0] }; pause = 50; };
  const free = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !grid[y * GW + x];
  const space = (x, y, lim) => { if (!free(x, y)) return 0; const seen = new Set([y * GW + x]), q = [[x, y]]; while (q.length && seen.size < lim) { const [cx, cy] = q.shift(); for (const [dx, dy] of Object.values(DIR)) { const nx = cx + dx, ny = cy + dy, k = ny * GW + nx; if (free(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } } return seen.size; };
  const turn = k => { const d = DIR[k]; if (d && (d[0] !== -p.d[0] || d[1] !== -p.d[1])) p.nd = d; };
  const un = keys(turn); pad(el, ['L', 'U', 'D', 'R'], turn); swipe(cv, turn); reset();
  const stop = loop(dt => { if (over) return false; if (pause > 0) { pause -= dt / 16.7; } else { acc += dt; while (acc >= step) { acc -= step;
      p.d = p.nd; if (Math.random() < 0.3 + o.level * 0.07) { let best = a.d, bv = -1; for (const d of Object.values(DIR)) { if (d[0] === -a.d[0] && d[1] === -a.d[1]) continue; const v = space(a.x + d[0], a.y + d[1], 80 + o.level * 40) + Math.random() * (11 - o.level); if (v > bv) { bv = v; best = d; } } a.d = best; } else if (!free(a.x + a.d[0], a.y + a.d[1])) { const opts = Object.values(DIR).filter(d => free(a.x + d[0], a.y + d[1])); if (opts.length) a.d = opts[R(opts.length)]; }
      grid[p.y * GW + p.x] = 1; grid[a.y * GW + a.x] = 2; p.x += p.d[0]; p.y += p.d[1]; a.x += a.d[0]; a.y += a.d[1];
      const pd = !free(p.x, p.y) || (p.x === a.x && p.y === a.y), ad = !free(a.x, a.y) || (p.x === a.x && p.y === a.y);
      if (pd || ad) { if (pd && !ad) wins[1]++; else if (ad && !pd) { wins[0]++; beep(880, .15); } else beep(300, .1); o.score(wins[0] * 100 * o.level);
        if (wins[0] >= 3 || wins[1] >= 3) { over = true; const won = wins[0] >= 3; o.end({ score: wins[0] * 100 * o.level + (won ? 300 * o.level : 0), won }); return false; } reset(); break; } } }
    g.fillStyle = '#06110d'; g.fillRect(0, 0, GW * S, GH * S); g.strokeStyle = '#ffffff10'; for (let x = 0; x < GW; x += 5) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, GH * S); g.stroke(); }
    for (let i = 0; i < grid.length; i++) if (grid[i]) { g.fillStyle = grid[i] === 1 ? C.gold : C.teal; g.fillRect((i % GW) * S, (i / GW | 0) * S, S, S); }
    g.fillStyle = '#fff'; g.fillRect(p.x * S, p.y * S, S, S); g.fillRect(a.x * S, a.y * S, S, S);
    g.fillStyle = C.ink; g.font = '600 16px Rubik,sans-serif'; g.fillText(`You ${wins[0]} – ${wins[1]} Computer · first to 3`, 12, 22);
  });
  return () => { stop(); un(); };
} };

// ---------- Klondike ----------
SO.klondike = { start(el, o) {
  const draw3 = o.level >= 6; const d = deck52(); const tab = [...Array(7)].map((_, i) => d.splice(0, i + 1).map((c, j) => ({ c, up: j === i }))); let stock = d.map(c => ({ c, up: false })), waste = [], found = [[], [], [], []], sel = null, score = 0, moves = 0, done = false, passes = 0;
  const red = c => 'HD'.includes(cSuit(c)), v = c => RANKS.indexOf(cRank(c));
  const canFound = (c, k) => { const f = found[k]; return f.length ? cSuit(f[f.length - 1]) === cSuit(c) && v(c) === v(f[f.length - 1]) + 1 : v(c) === 0; };
  const canTab = (c, k) => { const t = tab[k]; if (!t.length) return v(c) === 12; const top = t[t.length - 1]; return top.up && red(top.c) !== red(c) && v(top.c) === v(c) + 1; };
  const pick = () => { if (!sel) return []; if (sel.src === 'w') return [waste[waste.length - 1]]; if (sel.src === 'f') return [found[sel.k][found[sel.k].length - 1]]; return tab[sel.k].slice(sel.i).map(x => x.c); };
  const remove = () => { if (sel.src === 'w') waste.pop(); else if (sel.src === 'f') found[sel.k].pop(); else { tab[sel.k].splice(sel.i); const t = tab[sel.k]; if (t.length && !t[t.length - 1].up) { t[t.length - 1].up = true; score += 5; } } };
  const flip = () => { if (stock.length) { const n = draw3 ? 3 : 1; for (let k = 0; k < n && stock.length; k++) waste.push(stock.pop().c); } else if (waste.length) { stock = waste.reverse().map(c => ({ c, up: false })); waste = []; passes++; if (passes > 1) score = Math.max(0, score - 20); } sel = null; moves++; render(); };
  const autoFound = (src, k, i) => { sel = { src, k, i }; const cs = pick(); if (cs.length !== 1) { sel = null; return false; } for (let f = 0; f < 4; f++) if (canFound(cs[0], f)) { remove(); found[f].push(cs[0]); score += 10; moves++; sel = null; check(); return true; } sel = null; return false; };
  const check = () => { o.score(score); if (found.every(f => f.length === 13) && !done) { done = true; score += 500 + o.level * 50; o.score(score); o.end({ score, won: true }); } };
  const target = (dst, k) => { const cs = pick(); if (!cs.length) return; if (dst === 'f' && cs.length === 1 && canFound(cs[0], k)) { remove(); found[k].push(cs[0]); score += 10; }
    else if (dst === 't' && canTab(cs[0], k)) { remove(); tab[k].push(...cs.map(c => ({ c, up: true }))); if (sel.src === 'w') score += 5; } sel = null; moves++; check(); render(); };
  const C1 = (c, attrs, cls = '') => cardHTML(c, attrs, cls);
  const render = () => {
    const wtop = waste.slice(-(draw3 ? 3 : 1));
    el.innerHTML = `<div class="kl"><div class="klt"><div class="slot" data-a="stock">${stock.length ? C1(null, '') : '<span class="muted">↻</span>'}</div><div class="slot waste">${wtop.map((c, j) => C1(c, j === wtop.length - 1 ? 'data-a="w"' : 'disabled', sel && sel.src === 'w' && j === wtop.length - 1 ? 'sel' : '')).join('')}</div><span></span>${found.map((f, k) => `<div class="slot" data-a="f${k}">${f.length ? C1(f[f.length - 1], `data-a="f${k}"`, sel && sel.src === 'f' && sel.k === k ? 'sel' : '') : `<span class="muted">${'♠♥♦♣'[k]}</span>`}</div>`).join('')}</div>
      <div class="klb">${tab.map((t, k) => `<div class="col" data-a="t${k}">${t.map((x, i) => x.up ? C1(x.c, `data-a="t${k}:${i}"`, sel && sel.src === 't' && sel.k === k && i >= sel.i ? 'sel' : '') : C1(null, 'disabled')).join('')}</div>`).join('')}</div>
      <p class="muted small">Score ${score} · moves ${moves} · ${draw3 ? 'draw three' : 'draw one'}. Tap a card, then where to put it; double-tap sends to the foundations.</p></div>`;
  };
  let lastTap = { a: null, t: 0 };
  el.addEventListener('click', e => { if (done) return; const t = e.target.closest('[data-a]'); if (!t) { sel = null; render(); return; } const a = t.dataset.a, now = Date.now(), dbl = lastTap.a === a && now - lastTap.t < 380; lastTap = { a, t: now };
    if (a === 'stock') return flip();
    if (a === 'w') { if (dbl && autoFound('w')) return render(); if (sel && sel.src === 'w') sel = null; else sel = { src: 'w' }; return render(); }
    if (a[0] === 'f') { const k = +a[1]; if (sel && !(sel.src === 'f' && sel.k === k)) return target('f', k); sel = found[k].length ? { src: 'f', k } : null; return render(); }
    if (a[0] === 't') { const [k, i] = a.slice(1).split(':').map(Number); if (sel && !(sel.src === 't' && sel.k === k)) return target('t', k);
      if (i === undefined || isNaN(i)) { sel = null; return render(); } if (dbl && i === tab[k].length - 1 && autoFound('t', k, i)) return render(); sel = { src: 't', k, i }; return render(); } });
  render(); return () => {};
} };

// ---------- Blackjack ----------
SO.blackjack = { start(el, o) {
  let bank = 1000, peak = 1000, bet = 50, shoe = [], ph = [], dh = [], phase = 'bet', msg = 'Place your bet.', hands = 0; const decks = Math.min(8, 1 + Math.floor(o.level / 2)), h17 = o.level >= 5;
  const fill = () => { shoe = shuf([...Array(decks)].flatMap(() => deck52())); }; fill();
  const val = h => { let t = 0, a = 0; h.forEach(c => { const r = cRank(c); if (r === 'A') { a++; t += 11; } else t += 'JQK'.includes(r) || r === '10' ? 10 : +r; }); while (t > 21 && a) { t -= 10; a--; } return { t, soft: a > 0 }; };
  const deal = () => { if (shoe.length < 20) fill(); return shoe.pop(); };
  const finish = () => { phase = 'dealer'; while (true) { const v = val(dh); if (v.t < 17 || (h17 && v.t === 17 && v.soft)) dh.push(deal()); else break; }
    const p = val(ph).t, d = val(dh).t; let win = 0; if (p > 21) { win = -bet; msg = 'Bust.'; } else if (d > 21 || p > d) { win = bet; msg = 'You win!'; } else if (p === d) { msg = 'Push.'; } else { win = -bet; msg = 'Dealer wins.'; }
    end(win); };
  const end = w => { bank += w; peak = Math.max(peak, bank); hands++; phase = 'bet'; o.score(peak - 1000 > 0 ? (peak - 1000) * o.level / 5 | 0 : 0); if (bank < 10) { msg += ' Out of chips.'; o.end({ score: Math.max(0, (peak - 1000) * o.level / 5 | 0) }); phase = 'over'; } render(); };
  const act = a => {
    if (a === 'deal' && phase === 'bet') { bet = Math.min(bet, bank); ph = [deal(), deal()]; dh = [deal(), deal()]; phase = 'play'; msg = '';
      if (val(ph).t === 21) { phase = 'dealer'; if (val(dh).t === 21) { msg = 'Both blackjack. Push.'; end(0); } else { msg = 'Blackjack! Pays 3 to 2.'; end(bet * 1.5); } return; } }
    else if (a === 'hit' && phase === 'play') { ph.push(deal()); if (val(ph).t > 21) { msg = 'Bust.'; phase = 'dealer'; end(-bet); return; } }
    else if (a === 'stand' && phase === 'play') return finish();
    else if (a === 'double' && phase === 'play' && ph.length === 2 && bank >= bet * 2) { bet *= 2; ph.push(deal()); const r = finish(); bet /= 2; return r; }
    else if (a.startsWith('b') && phase === 'bet') bet = Math.max(10, Math.min(bank, bet + +a.slice(1)));
    else if (a === 'cash') { o.end({ score: Math.max(0, (peak - 1000) * o.level / 5 | 0) }); phase = 'over'; }
    render(); };
  const render = () => { const hide = phase === 'play';
    el.innerHTML = `<div class="bj"><div class="hud2">Chips <b>${bank}</b> · Bet <b>${bet}</b> · Best ${peak} · ${decks}-deck shoe${h17 ? ', dealer hits soft 17' : ''}</div>
      <div class="bjr"><span>Dealer ${dh.length ? (hide ? '' : val(dh).t) : ''}</span><div class="hand">${dh.map((c, i) => cardHTML(hide && i === 1 ? null : c, 'disabled')).join('')}</div></div>
      <div class="bjr"><span>You ${ph.length ? val(ph).t : ''}</span><div class="hand">${ph.map(c => cardHTML(c, 'disabled')).join('')}</div></div><p class="bjm">${esc(msg)}</p>
      <div class="row-btns">${phase === 'bet' ? `<button class="btn" data-a="b-10">−10</button><button class="btn" data-a="b10">+10</button><button class="btn" data-a="b50">+50</button><button class="btn hot" data-a="deal">Deal</button><button class="btn" data-a="cash">Cash out</button>` : phase === 'play' ? `<button class="btn hot" data-a="hit">Hit</button><button class="btn" data-a="stand">Stand</button><button class="btn" data-a="double" ${ph.length === 2 && bank >= bet * 2 ? '' : 'disabled'}>Double</button>` : ''}</div></div>`; };
  el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && phase !== 'over') act(b.dataset.a); }); render(); return () => {};
} };
