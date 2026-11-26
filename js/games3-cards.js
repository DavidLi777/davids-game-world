// Third wave: card games (multiplayer trick/shedding/fishing games and solitaires/casino).
const trickRank = (trump) => c => hv(c) + (cSuit(c) === trump ? 100 : 0);
const tWin = (trick, trump) => trickWinner(trick, c => cSuit(c) === trump ? 'T' : cSuit(c) === cSuit(trick[0].c) ? 'L' : 'x', hv);
const followable = (h, trick) => { if (!trick.length) return h; const f = h.filter(c => cSuit(c) === cSuit(trick[0].c)); return f.length ? f : h; };
function trickAI(s, level, cs, team) { if (noisy(level)) return cs[R(cs.length)]; const tr = s.trump, rank = c => hv(c) + (cSuit(c) === tr ? 50 : 0);
  if (!s.trick.length) return cs.slice().sort((a, b) => rank(b) - rank(a))[hv(cs[0]) === 12 ? 0 : cs.length - 1];
  const cur = tWin(s.trick, tr), ally = team ? cur % 2 === s.t % 2 : false; const beats = cs.filter(c => tWin(s.trick.concat({ p: s.t, c }), tr) === s.t);
  if (!ally && beats.length) return beats.sort((a, b) => rank(a) - rank(b))[0]; return cs.slice().sort((a, b) => rank(a) - rank(b))[0]; }

// ---------- Whist (partners, to 5 points) ----------
function whDeal(s) { const d = deck52(), hands = [0, 1, 2, 3].map(() => sortHand(d.splice(0, 13))); return { ...s, hands, trump: cSuit(hands[s.dealer][12]), trick: [], tricks: [0, 0, 0, 0], played: 0, t: nextSeat(s.dealer, 4) }; }
TB.whist = { seats: ['South', 'West', 'North', 'East'], init: () => whDeal({ team: [0, 0], dealer: 3, log: '' }), turn: s => s.t,
  moves: s => TB.whist.result(s) ? [] : followable(s.hands[s.t], s.trick).map(c => ({ c })),
  play(s, m) { const n = cl(s), t = s.t; n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); if (n.trick.length < 4) { n.t = nextSeat(t, 4); return n; }
    const w = tWin(n.trick, n.trump); n.tricks[w]++; n.trick = []; n.t = w; n.played++;
    if (n.played === 13) { const a = n.tricks[0] + n.tricks[2], b = 13 - a, tm = a > b ? 0 : 1, pts = Math.max(a, b) - 6; n.team[tm] += pts; n.log = `${tm ? 'West/East' : 'South/North'} took ${Math.max(a, b)} tricks: +${pts}`; if (Math.max(...n.team) < 5) return { ...whDeal({ ...n, dealer: nextSeat(n.dealer, 4) }), log: n.log }; }
    return n; },
  result: s => Math.max(...s.team) >= 5 ? { winner: s.team[0] > s.team[1] ? 0 : 1, team: true, score: s.team } : null,
  ai: (s, level, ms) => ({ c: trickAI(s, level, ms.map(m => m.c), true) }),
  view(s, x) { const legal = new Set(x.can ? TB.whist.moves(s).map(m => m.c) : []); x.turnSeat = s.t; x.ctl = x.me; x.seatInfo = i => `tricks ${s.tricks[i]}${s.dealer === i ? ' · dealer' : ''}`;
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>South/North ${s.team[0]}</span><span>Trump <b class="${'HD'.includes(s.trump) ? 'redt' : ''}">${SUITG[s.trump]}</b></span><span>West/East ${s.team[1]}</span></div>${trickTable(s, x, legal)}<p class="muted small center">${esc(s.log)}</p></div>`; x.on(d => x.act({ c: d.slice(1) })); } };

// ---------- Oh Hell (exact bidding) ----------
const OH_ROUNDS = [7, 6, 5, 4, 3, 2, 1];
function ohDeal(s) { const k = OH_ROUNDS[s.round], d = deck52(), hands = [...Array(s.n)].map(() => sortHand(d.splice(0, k))); return { ...s, hands, trump: cSuit(d[0]), up: d[0], bids: Array(s.n).fill(null), phase: 'bid', trick: [], tricks: Array(s.n).fill(0), played: 0, t: nextSeat(s.dealer, s.n) }; }
TB.ohhell = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5'], init: n => ohDeal({ n, sc: Array(n).fill(0), round: 0, dealer: n - 1, log: '' }), turn: s => s.t,
  moves(s) { if (TB.ohhell.result(s)) return []; if (s.phase === 'bid') { const k = OH_ROUNDS[s.round], made = sum(s.bids.filter(b => b !== null)); return [...Array(k + 1).keys()].filter(b => !(s.t === s.dealer && made + b === k)).map(b => ({ b })); } return followable(s.hands[s.t], s.trick).map(c => ({ c })); },
  play(s, m) { const n = cl(s), t = s.t; if (m.b !== undefined) { n.bids[t] = m.b; n.t = nextSeat(t, s.n); if (n.bids.every(b => b !== null)) { n.phase = 'play'; n.t = nextSeat(s.dealer, s.n); } return n; }
    n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); if (n.trick.length < s.n) { n.t = nextSeat(t, s.n); return n; }
    const w = tWin(n.trick, n.trump); n.tricks[w]++; n.trick = []; n.t = w; n.played++;
    if (n.played === OH_ROUNDS[s.round]) { n.sc = n.sc.map((v, i) => v + (n.tricks[i] === n.bids[i] ? 10 + n.bids[i] : 0)); n.log = 'Made it: ' + n.bids.map((b, i) => n.tricks[i] === b ? 'Seat ' + (i + 1) : null).filter(Boolean).join(', '); n.round++; if (n.round < OH_ROUNDS.length) return { ...ohDeal({ ...n, dealer: nextSeat(n.dealer, s.n) }), log: n.log }; n.phase = 'over'; }
    return n; },
  result(s) { if (s.phase !== 'over') return null; const mx = Math.max(...s.sc); return { winner: s.sc.filter(v => v === mx).length > 1 ? -1 : s.sc.indexOf(mx), score: s.sc }; },
  ai(s, level, ms) { if (s.phase === 'bid') { const h = s.hands[s.t]; let est = sum(h.map(c => hv(c) >= 11 ? 0.8 : cSuit(c) === s.trump && hv(c) >= 8 ? 0.6 : 0)); est = Math.round(est); const opts = ms.map(m => m.b); return { b: opts.reduce((a, b) => Math.abs(b - est) < Math.abs(a - est) ? b : a, opts[0]) }; }
    const need = s.bids[s.t] - s.tricks[s.t], cs = ms.map(m => m.c), tr = s.trump, rank = c => hv(c) + (cSuit(c) === tr ? 50 : 0); if (noisy(level)) return ms[R(ms.length)];
    const wins = cs.filter(c => !s.trick.length || tWin(s.trick.concat({ p: s.t, c }), tr) === s.t); if (need > 0) return { c: (wins.length ? wins : cs).sort((a, b) => rank(b) - rank(a))[0] }; const lose = cs.filter(c => !wins.includes(c)); return { c: (lose.length ? lose : cs).sort((a, b) => rank(b) - rank(a))[0] }; },
  view(s, x) { const ms = x.can ? TB.ohhell.moves(s) : [], legal = new Set(ms.filter(m => m.c).map(m => m.c)); x.turnSeat = s.t; x.ctl = x.me; x.seatInfo = i => `${s.sc[i]} pts · bid ${s.bids[i] ?? '–'} · won ${s.tricks[i]}`;
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>Round ${Math.min(s.round + 1, 7)} of 7 · ${OH_ROUNDS[Math.min(s.round, 6)]} cards</span><span>Trump ${cardHTML(s.up, 'disabled', 'tiny')}</span></div>${trickTable(s, x, legal)}
      ${s.phase === 'bid' && x.can ? `<div class="row-btns"><span>Bid exactly how many tricks you will take:</span>${ms.map(m => `<button class="btn sm" data-i="b${m.b}">${m.b}</button>`).join('')}</div>` : ''}<p class="muted small center">${esc(s.log)} The dealer may not bid a total that equals the cards in hand.</p></div>`;
    x.on(d => x.act(d[0] === 'b' ? { b: +d.slice(1) } : { c: d.slice(1) })); } };

// ---------- Knock-Out Whist ----------
function koDeal(s) { const d = deck52(), hands = s.alive.map(a => a ? sortHand(d.splice(0, s.size)) : []); return { ...s, hands, trump: cSuit(d[0]), up: d[0], trick: [], tricks: Array(s.n).fill(0), played: 0, t: s.alive.indexOf(true) }; }
TB.knockout = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => koDeal({ n, alive: Array(n).fill(true), size: 7, log: '' }), turn: s => s.t,
  moves: s => TB.knockout.result(s) ? [] : followable(s.hands[s.t], s.trick).map(c => ({ c })),
  play(s, m) { const n = cl(s), t = s.t, nextAlive = i => { let j = i; do j = (j + 1) % s.n; while (!n.alive[j]); return j; }; n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c });
    if (n.trick.length < n.alive.filter(Boolean).length) { n.t = nextAlive(t); return n; } const w = tWin(n.trick, n.trump); n.tricks[w]++; n.trick = []; n.t = w; n.played++;
    if (n.played === s.size) { n.alive = n.alive.map((a, i) => a && n.tricks[i] > 0); const out = s.alive.map((a, i) => a && !n.alive[i] ? 'Seat ' + (i + 1) : null).filter(Boolean); n.log = out.length ? out.join(', ') + ' knocked out' : 'Everyone survives'; n.size--; if (n.alive.filter(Boolean).length > 1 && n.size > 0) return { ...koDeal(n), log: n.log }; n.winner = n.tricks.indexOf(Math.max(...n.tricks.map((v, i) => n.alive[i] ? v : -1))); }
    return n; },
  result: s => s.winner !== undefined ? { winner: s.winner } : s.alive.filter(Boolean).length === 1 ? { winner: s.alive.indexOf(true) } : null,
  ai: (s, level, ms) => ({ c: trickAI(s, level, ms.map(m => m.c), false) }),
  view(s, x) { const legal = new Set(x.can ? TB.knockout.moves(s).map(m => m.c) : []); x.turnSeat = s.t; x.ctl = x.me; x.seatInfo = i => s.alive[i] ? `tricks ${s.tricks[i]}` : 'knocked out';
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>${s.size} cards this round</span><span>Trump ${cardHTML(s.up, 'disabled', 'tiny')}</span></div>${trickTable(s, x, legal)}<p class="muted small center">${esc(s.log)} Take no tricks and you are out.</p></div>`; x.on(d => x.act({ c: d.slice(1) })); } };

// ---------- Durak ----------
const DK_R = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], dkv = c => DK_R.indexOf(cRank(c));
const dkBeats = (a, d, tr) => (cSuit(d) === cSuit(a) && dkv(d) > dkv(a)) || (cSuit(d) === tr && cSuit(a) !== tr);
const dkSort = (h, tr) => h.slice().sort((a, b) => (cSuit(a) === tr) - (cSuit(b) === tr) || dkv(a) - dkv(b));
TB.durak = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'],
  init(n) { const d = shuf(SUITS.flatMap(su => DK_R.map(r => r + su))), tr = cSuit(d[0]); const hands = [...Array(n)].map(() => dkSort(d.splice(d.length - 6), tr)); return { n, hands, deck: d, trump: tr, trumpCard: d[0], att: 0, def: 1 % n, table: [], out: [], log: '' }; },
  turn: s => s.table.some(p => !p.d) ? s.def : s.att,
  moves(s) { if (TB.durak.result(s)) return []; const t = TB.durak.turn(s), h = s.hands[t];
    if (t === s.def && s.table.some(p => !p.d)) { const a = s.table.find(p => !p.d).a; return [...h.filter(c => dkBeats(a, c, s.trump)).map(c => ({ d: c })), 'take']; }
    if (!s.table.length) return h.map(c => ({ a: c })); const ranks = new Set(s.table.flatMap(p => [p.a, p.d].filter(Boolean).map(cRank))); const room = s.table.length < 6 && s.hands[s.def].length > s.table.filter(p => !p.d).length;
    return [...(room ? h.filter(c => ranks.has(cRank(c))).map(c => ({ a: c })) : []), 'done']; },
  play(s, m) { const n = cl(s), t = TB.durak.turn(s), alive = i => n.hands[i].length > 0 || n.deck.length > 0, nx = i => { let j = i; for (let k = 0; k < s.n; k++) { j = (j + 1) % s.n; if (alive(j) && !n.out.includes(j)) return j; } return i; };
    const refill = () => { for (const p of [n.att, ...[...Array(s.n).keys()].filter(i => i !== n.att && i !== n.def), n.def]) while (n.hands[p].length < 6 && n.deck.length) n.hands[p].push(n.deck.pop()); n.hands = n.hands.map(h => dkSort(h, n.trump)); [...Array(s.n).keys()].forEach(i => { if (!n.hands[i].length && !n.deck.length && !n.out.includes(i)) n.out.push(i); }); };
    if (m.a) { n.hands[t] = n.hands[t].filter(c => c !== m.a); n.table.push({ a: m.a }); n.log = `Seat ${t + 1} attacks with ${cRank(m.a)}${SUITG[cSuit(m.a)]}`; return n; }
    if (m.d) { n.hands[t] = n.hands[t].filter(c => c !== m.d); n.table.find(p => !p.d).d = m.d; n.log = `Seat ${t + 1} beats it`; return n; }
    if (m === 'take') { n.hands[s.def] = dkSort(n.hands[s.def].concat(n.table.flatMap(p => [p.a, p.d].filter(Boolean))), n.trump); n.table = []; n.log = `Seat ${s.def + 1} picks up the cards`; refill(); n.att = nx(s.def); n.def = nx(n.att); return n; }
    n.table = []; n.log = 'Defended! Cards discarded.'; refill(); n.att = alive(s.def) && !n.out.includes(s.def) ? s.def : nx(s.def); n.def = nx(n.att); return n; },
  result(s) { const left = [...Array(s.n).keys()].filter(i => !s.out.includes(i) && (s.hands[i].length || s.deck.length)); if (left.length <= 1) return { winner: s.out[0] ?? -1, loser: left[0] }; return null; },
  ai(s, level, ms) { const t = TB.durak.turn(s), tr = s.trump; if (noisy(level)) return ms[R(ms.length)]; const cards = ms.filter(m => m.a || m.d), val = c => dkv(c) + (cSuit(c) === tr ? 10 : 0);
    if (t === s.def) { if (!cards.length) return 'take'; const best = cards.sort((a, b) => val(a.d) - val(b.d))[0]; return cSuit(best.d) === tr && s.deck.length > 10 && dkv(best.d) > 5 && level < 8 ? 'take' : best; }
    if (!cards.length) return 'done'; const cheap = cards.sort((a, b) => val(a.a) - val(b.a))[0]; if (s.table.length && val(cheap.a) > 8) return 'done'; return cheap; },
  view(s, x) { const ms = x.can ? TB.durak.moves(s) : [], me = x.me, ok = new Set(ms.map(m => m.a || m.d).filter(Boolean)), t = TB.durak.turn(s);
    x.el.innerHTML = `<div class="ctable"><div class="opps">${s.hands.map((h, i) => i === me ? '' : `<div class="opp ${t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}${s.att === i ? ' · attacking' : s.def === i ? ' · defending' : ''}</span><div class="fan">${h.map(() => '<i class="mini"></i>').join('')}</div><small>${h.length} cards${s.out.includes(i) ? ' · out' : ''}</small></div>`).join('')}</div>
      <div class="pile">${cardHTML(s.trumpCard, 'disabled', 'tiny')}<small>trump ${SUITG[s.trump]} · deck ${s.deck.length}</small></div><div class="dtable">${s.table.map(p => `<div class="dpair">${cardHTML(p.a, 'disabled')}${p.d ? cardHTML(p.d, 'disabled', 'over') : ''}</div>`).join('') || '<span class="muted">Table is empty</span>'}</div><p class="muted small center">${esc(s.log)}</p>
      <div class="hand">${me >= 0 ? s.hands[me].map(c => cardHTML(c, ok.has(c) ? `data-i="c${c}"` : 'disabled', ok.has(c) ? 'ok' : '')).join('') : ''}</div><div class="row-btns">${ms.includes('take') ? '<button class="btn" data-i="take">Pick up</button>' : ''}${ms.includes('done') ? '<button class="btn hot" data-i="done">Done attacking</button>' : ''}</div></div>`;
    x.on(d => { if (d === 'take' || d === 'done') return x.act(d); const c = d.slice(1); x.act(ms.find(m => m.a === c || m.d === c)); }); } };

// ---------- Cheat ----------
const CH_R = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
TB.cheat = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'],
  init(n) { const d = deck52(), hands = [...Array(n)].map(() => []); d.forEach((c, i) => hands[i % n].push(c)); return { n, hands: hands.map(sortHand), pile: [], rank: 0, t: 0, last: null, phase: 'play', log: 'Play aces to start.' }; },
  turn: s => s.t, moves: s => TB.cheat.result(s) ? [] : s.last ? ['cheat', 'accept'] : s.hands[s.t].map(c => ({ p: [c] })),
  check(s, m) { if (TB.cheat.result(s)) return false; if (m === 'cheat' || m === 'accept') return !!s.last; if (s.last || !m || !Array.isArray(m.p) || !m.p.length || m.p.length > 4) return false; return m.p.every(c => s.hands[s.t].includes(c)) && new Set(m.p).size === m.p.length; },
  play(s, m) { const n = cl(s), t = s.t, nx = i => (i + 1) % s.n;
    if (m === 'accept') { n.last = null; if (!n.hands[n.prev].length) { n.winner = n.prev; return n; } return n; }
    if (m === 'cheat') { const L = s.last, lie = L.cards.some(c => cRank(c) !== CH_R[L.rank]); const loser = lie ? L.p : t; n.hands[loser] = sortHand(n.hands[loser].concat(n.pile)); n.pile = []; n.log = `Seat ${t + 1} called cheat: ${lie ? 'it was a lie! Seat ' + (L.p + 1) : 'it was honest. Seat ' + (t + 1)} takes the pile.`; n.reveal = L.cards; n.last = null; if (!lie && !n.hands[L.p].length) n.winner = L.p; return n; }
    n.hands[t] = n.hands[t].filter(c => !m.p.includes(c)); n.pile.push(...m.p); n.last = { p: t, cards: m.p, rank: s.rank }; n.prev = t; n.log = `Seat ${t + 1} played ${m.p.length} × ${CH_R[s.rank]}`; n.reveal = null; n.rank = (s.rank + 1) % 13; n.t = nx(t); return n; },
  result: s => s.winner !== undefined ? { winner: s.winner } : null,
  ai(s, level) { const h = s.hands[s.t]; if (s.last) { const claimed = s.last.cards.length, have = h.filter(c => cRank(c) === CH_R[s.last.rank]).length; const sus = claimed + have > 4 || (!s.hands[s.last.p].length) || Math.random() < 0.08 + (claimed >= 3 ? 0.15 : 0) - level * 0.005; return sus ? 'cheat' : 'accept'; }
    const real = h.filter(c => cRank(c) === CH_R[s.rank]); if (real.length) return { p: real.slice(0, 4) }; const lie = h.slice().sort((a, b) => Math.abs(cVal(a) - s.rank) - Math.abs(cVal(b) - s.rank)).slice(-1); return { p: lie }; },
  view(s, x) { const me = x.me, sel = x.sel || []; x.el.innerHTML = `<div class="ctable"><div class="opps">${s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><small>${h.length} cards</small></div>`).join('')}</div><div class="pile">${s.pile.length ? cardHTML(null, 'disabled') : ''}<small>${s.pile.length} in pile</small>${s.reveal ? s.reveal.map(c => cardHTML(c, 'disabled', 'tiny')).join('') : ''}</div>
    <p class="center"><b>${s.last ? `Seat ${s.last.p + 1} claims ${s.last.cards.length} × ${CH_R[s.last.rank]}` : `Play your ${CH_R[s.rank]}s (or bluff)`}</b> <span class="muted small">${esc(s.log)}</span></p>
    <div class="hand">${me >= 0 ? s.hands[me].map(c => cardHTML(c, x.can && !s.last ? `data-i="c${c}"` : 'disabled', sel.includes(c) ? 'sel' : '')).join('') : ''}</div>${x.can ? (s.last ? '<div class="row-btns"><button class="btn hot" data-i="cheat">Call cheat!</button><button class="btn" data-i="accept">Believe it</button></div>' : `<button class="btn hot" data-i="go" ${sel.length ? '' : 'disabled'}>Play ${sel.length} as ${CH_R[s.rank]}s</button>`) : ''}</div>`;
    x.on(d => { if (d === 'cheat' || d === 'accept') return x.act(d); if (d === 'go') { const p = sel.slice(); x.sel = []; return x.act({ p }); } const c = d.slice(1); x.sel = sel.includes(c) ? sel.filter(q => q !== c) : sel.length < 4 ? sel.concat(c) : sel; x.redraw(); }); } };

// ---------- Beggar-My-Neighbour ----------
const BMN_P = { J: 1, Q: 2, K: 3, A: 4 };
TB.beggar = { seats: ['North', 'South'], init() { const d = deck52(); return { piles: [d.slice(0, 26), d.slice(26)], table: [], t: 0, debt: 0, payee: -1, n: 0, log: '' }; }, turn: s => s.t,
  moves: s => TB.beggar.result(s) ? [] : ['flip'],
  play(s) { const n = cl(s), t = s.t, c = n.piles[t].shift(); n.table.push(c); n.n++; const pen = BMN_P[cRank(c)];
    if (pen) { n.debt = pen; n.payee = t; n.t = 1 - t; n.log = `${cRank(c)} played: pay ${pen}`; } else if (n.debt) { n.debt--; if (!n.debt) { n.piles[n.payee].push(...n.table); n.table = []; n.log = `Seat ${n.payee + 1} collects the pile`; n.t = n.payee; n.payee = -1; } } else n.t = 1 - t;
    if (!n.piles[n.t].length && n.table.length) { n.piles[1 - n.t].push(...n.table); n.table = []; } return n; },
  result(s) { if (!s.piles[0].length && !s.table.length) return { winner: 1 }; if (!s.piles[1].length && !s.table.length) return { winner: 0 }; if (s.n > 3000) return { winner: s.piles[0].length > s.piles[1].length ? 0 : 1 }; if (!s.piles[s.t].length) return { winner: 1 - s.t }; return null; }, ai: () => 'flip',
  view(s, x) { x.el.innerHTML = `<div class="ctable war"><div class="opp"><span>${esc(x.names[1] || '')}</span><small>${s.piles[1].length} cards</small></div><div class="pile">${s.table.slice(-3).map(c => cardHTML(c, 'disabled')).join('') || '<span class="muted">Empty</span>'}</div><p class="muted">${esc(s.log)}${s.debt ? ` · ${s.debt} left to pay` : ''} · ${s.table.length} on the table</p><div class="opp"><span>${esc(x.names[0] || '')}</span><small>${s.piles[0].length} cards</small></div><button class="btn hot" data-i="flip" ${x.can ? '' : 'disabled'}>Turn your card</button><p class="muted small">Jack, queen, king and ace demand 1, 2, 3 or 4 cards from your opponent.</p></div>`; x.on(() => x.act('flip')); } };

// ---------- Scopa (40 cards) ----------
const SC_R = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'], scv = c => SC_R.indexOf(cRank(c)) + 1;
const scDeck = () => shuf(SUITS.flatMap(su => SC_R.map(r => r + su)));
function scCaps(table, c) { const v = scv(c), same = table.filter(q => scv(q) === v); if (same.length) return same.map(q => [q]); const out = []; const rec = (i, cur, s2) => { if (s2 === v && cur.length > 1) { out.push(cur.slice()); return; } if (s2 >= v) return; for (let k = i; k < table.length; k++) { cur.push(table[k]); rec(k + 1, cur, s2 + scv(table[k])); cur.pop(); } }; rec(0, [], 0); return out; }
function scDeal(s) { const d = scDeck(); return { ...s, deck: d.slice(10), table: d.slice(0, 4), hands: [d.slice(4, 7), d.slice(7, 10)], taken: [[], []], scope: [0, 0], lastCap: -1, t: s.dealer ^ 1 }; }
TB.scopa = { seats: ['South', 'North'], init: () => scDeal({ sc: [0, 0], dealer: 1, log: '' }), turn: s => s.t,
  moves(s) { if (TB.scopa.result(s)) return []; const out = []; s.hands[s.t].forEach(c => { const caps = scCaps(s.table, c); if (caps.length) caps.forEach(cap => out.push({ c, cap })); else out.push({ c, cap: [] }); }); return out; },
  play(s, m) { const n = cl(s), t = s.t; n.hands[t] = n.hands[t].filter(c => c !== m.c); if (m.cap.length) { n.table = n.table.filter(c => !m.cap.includes(c)); n.taken[t].push(m.c, ...m.cap); n.lastCap = t; if (!n.table.length && (n.deck.length || n.hands.some(h => h.length))) { n.scope[t]++; n.log = `Seat ${t + 1} swept the table: scopa!`; } else n.log = `Seat ${t + 1} captured ${m.cap.length + 1} cards`; } else { n.table.push(m.c); n.log = `Seat ${t + 1} laid a card`; }
    n.t = 1 - t; if (!n.hands[0].length && !n.hands[1].length) { if (n.deck.length) { n.hands = [n.deck.splice(0, 3), n.deck.splice(0, 3)]; } else { if (n.lastCap >= 0) n.taken[n.lastCap].push(...n.table); n.table = [];
        const pts = [0, 0], cmp = f => { const a = f(n.taken[0]), b = f(n.taken[1]); if (a > b) pts[0]++; else if (b > a) pts[1]++; }; cmp(x => x.length); cmp(x => x.filter(c => cSuit(c) === 'D').length); if (n.taken[0].includes('7D')) pts[0]++; else if (n.taken[1].includes('7D')) pts[1]++; cmp(x => x.filter(c => cRank(c) === '7').length);
        pts[0] += n.scope[0]; pts[1] += n.scope[1]; n.sc = [n.sc[0] + pts[0], n.sc[1] + pts[1]]; n.log = `Hand points ${pts[0]} – ${pts[1]}`; if (Math.max(...n.sc) < 11 || n.sc[0] === n.sc[1]) return { ...scDeal({ ...n, dealer: n.dealer ^ 1 }), log: n.log }; n.over = true; } }
    return n; },
  result: s => s.over ? { winner: s.sc[0] > s.sc[1] ? 0 : 1, score: s.sc } : null,
  ai(s, level, ms) { return pickBest(ms, m => (m.cap.length ? 10 + m.cap.length * 3 : -scv(m.c)) + (m.cap.length && m.cap.length === s.table.length ? 40 : 0) + (m.cap.concat(m.c).includes('7D') ? 25 : 0) + m.cap.concat(m.c).filter(c => cSuit(c) === 'D').length * 2 + m.cap.concat(m.c).filter(c => cRank(c) === '7').length * 4, level); },
  view(s, x) { const ms = x.can ? TB.scopa.moves(s) : [], me = x.me >= 0 ? x.me : 0, sel = x.sel; const opts = sel ? ms.filter(m => m.c === sel) : [];
    x.el.innerHTML = `<div class="ctable"><div class="score2"><span>${esc(x.names[0] || '')} ${s.sc[0]}</span><span>to 11 · deck ${s.deck.length}</span><span>${esc(x.names[1] || '')} ${s.sc[1]}</span></div><div class="opp"><div class="fan">${s.hands[1 - me].map(() => '<i class="mini"></i>').join('')}</div><small>captured ${s.taken[1 - me].length} · scope ${s.scope[1 - me]}</small></div>
      <div class="pile">${s.table.map(c => cardHTML(c, 'disabled')).join('') || '<span class="muted">Table empty</span>'}</div><p class="muted small center">${esc(s.log)}</p>${opts.length > 1 ? `<div class="row-btns"><span>Capture:</span>${opts.map((m, k) => `<button class="btn sm hot" data-i="o${k}">${m.cap.map(c => cRank(c) + SUITG[cSuit(c)]).join(' + ')}</button>`).join('')}</div>` : ''}
      <div class="hand">${s.hands[me].map(c => cardHTML(c, x.can ? `data-i="c${c}"` : 'disabled', sel === c ? 'sel' : 'ok')).join('')}</div><p class="muted small center">You: captured ${s.taken[me].length} · scope ${s.scope[me]}. Face cards are 8, 9 and 10.</p></div>`;
    x.on(d => { if (d[0] === 'o') { const m = opts[+d.slice(1)]; x.sel = null; return x.act(m); } const c = d.slice(1), o = ms.filter(m => m.c === c); if (o.length === 1) { x.sel = null; x.act(o[0]); } else { x.sel = c; x.redraw(); } }); } };

// ---------- Briscola ----------
const BR_PTS = { A: 11, '3': 10, K: 4, Q: 3, J: 2 }, brv = c => BR_PTS[cRank(c)] || 0, brRank = c => [2, 4, 5, 6, 7, 'J', 'Q', 'K', 3, 'A'].map(String).indexOf(cRank(c));
TB.briscola = { seats: ['South', 'North'], init() { const d = scDeck(); const trumpCard = d[d.length - 1]; return { deck: d.slice(6), hands: [d.slice(0, 3), d.slice(3, 6)], trumpCard, trump: cSuit(trumpCard), trick: [], pts: [0, 0], t: 0, log: '' }; }, turn: s => s.t,
  moves: s => TB.briscola.result(s) ? [] : s.hands[s.t].map(c => ({ c })),
  play(s, m) { const n = cl(s), t = s.t; n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); if (n.trick.length < 2) { n.t = 1 - t; return n; }
    const [a, b] = n.trick, tr = n.trump; let w = a.p; if (cSuit(b.c) === cSuit(a.c)) { if (brRank(b.c) > brRank(a.c)) w = b.p; } else if (cSuit(b.c) === tr) w = b.p; n.pts[w] += brv(a.c) + brv(b.c); n.log = `Seat ${w + 1} takes ${brv(a.c) + brv(b.c)} points`; n.last = n.trick; n.trick = [];
    for (const p of [w, 1 - w]) if (n.deck.length) n.hands[p].push(n.deck.shift()); n.t = w; return n; },
  result: s => !s.hands[0].length && !s.hands[1].length && !s.trick.length ? { winner: s.pts[0] > 60 ? 0 : s.pts[1] > 60 ? 1 : -1, score: s.pts } : null,
  ai(s, level, ms) { if (noisy(level)) return ms[R(ms.length)]; const cs = ms.map(m => m.c), tr = s.trump; if (!s.trick.length) return { c: cs.sort((a, b) => brv(a) + (cSuit(a) === tr ? 6 : 0) - brv(b) - (cSuit(b) === tr ? 6 : 0))[0] };
    const lead = s.trick[0].c, wins = cs.filter(c => (cSuit(c) === cSuit(lead) && brRank(c) > brRank(lead)) || (cSuit(c) === tr && cSuit(lead) !== tr)); if (wins.length && (brv(lead) >= 4 || wins.some(c => cSuit(c) !== tr))) return { c: wins.sort((a, b) => (cSuit(a) === tr) - (cSuit(b) === tr) || brv(b) - brv(a))[0] }; return { c: cs.sort((a, b) => brv(a) - brv(b) || (cSuit(a) === tr) - (cSuit(b) === tr))[0] }; },
  view(s, x) { const me = x.me >= 0 ? x.me : 0, legal = new Set(x.can ? s.hands[me] : []); x.el.innerHTML = `<div class="ctable"><div class="score2"><span>${esc(x.names[0] || '')} ${s.pts[0]}</span><span>Trump ${cardHTML(s.trumpCard, 'disabled', 'tiny')} · deck ${s.deck.length}</span><span>${esc(x.names[1] || '')} ${s.pts[1]}</span></div><div class="opp"><div class="fan">${s.hands[1 - me].map(() => '<i class="mini"></i>').join('')}</div></div>
    <div class="pile">${(s.trick.length ? s.trick : s.last || []).map(p => cardHTML(p.c, 'disabled')).join('') || '<span class="muted">Lead a card</span>'}</div><p class="muted small center">${esc(s.log)} Ace 11, three 10, king 4, queen 3, jack 2. Over 60 wins.</p><div class="hand">${s.hands[me].map(c => cardHTML(c, legal.has(c) ? `data-i="c${c}"` : 'disabled', legal.has(c) ? 'ok' : '')).join('')}</div></div>`; x.on(d => x.act({ c: d.slice(1) })); } };

// ---------- Thirty-One ----------
const s31 = h => Math.max(...SUITS.map(su => sum(h.filter(c => cSuit(c) === su).map(c => cRank(c) === 'A' ? 11 : Math.min(10, cVal(c) + 1)))));
function s31Deal(s) { const d = deck52(), hands = s.lives.map(l => l > 0 ? d.splice(0, 3) : []); return { ...s, hands, deck: d.slice(1), disc: [d[0]], phase: 'draw', knock: -1, t: s.lives.findIndex((l, i) => l > 0 && i >= (s.start || 0)) >= 0 ? s.lives.findIndex((l, i) => l > 0 && i >= (s.start || 0)) : s.lives.findIndex(l => l > 0) }; }
TB.scat = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => s31Deal({ n, lives: Array(n).fill(3), log: '' }), turn: s => s.t,
  moves(s) { if (TB.scat.result(s)) return []; if (s.phase === 'draw') return ['stock', 'disc', ...(s.knock < 0 ? ['knock'] : [])]; return s.hands[s.t].map(c => ({ d: c })); },
  play(s, m) { const n = cl(s), t = s.t, alive = i => n.lives[i] > 0, nx = i => { let j = i; do j = (j + 1) % s.n; while (!alive(j)); return j; };
    const endHand = why => { const vals = n.hands.map((h, i) => alive(i) ? s31(h) : 99), mn = Math.min(...vals); n.lives = n.lives.map((l, i) => alive(i) && vals[i] === mn ? l - (n.knock === i ? 2 : 1) : l).map(l => Math.max(0, l)); n.reveal = n.hands.map((h, i) => alive(i) || s.lives[i] > 0 ? h : null); n.log = `${why} Lowest: ${vals.map((v, i) => v === mn ? 'Seat ' + (i + 1) : null).filter(Boolean).join(', ')}`; if (n.lives.filter(l => l > 0).length <= 1) { n.over = true; return n; } return { ...s31Deal({ ...n, start: nx(t) }), log: n.log, reveal: n.reveal }; };
    if (m === 'knock') { n.knock = t; n.log = `Seat ${t + 1} knocked`; n.t = nx(t); if (n.t === n.knock) return endHand('Knock round over.'); return n; }
    if (m === 'stock' || m === 'disc') { if (!n.deck.length) { const top = n.disc.pop(); n.deck = shuf(n.disc); n.disc = [top]; } n.hands[t].push(m === 'stock' ? n.deck.pop() : n.disc.pop()); n.phase = 'discard'; return n; }
    n.hands[t] = n.hands[t].filter(c => c !== m.d); n.disc.push(m.d); n.phase = 'draw'; if (s31(n.hands[t]) === 31) return endHand(`Seat ${t + 1} has 31!`); n.t = nx(t); if (n.t === n.knock) return endHand('Knock round over.'); return n; },
  result: s => s.over ? { winner: s.lives.findIndex(l => l > 0) } : null,
  ai(s, level, ms) { const h = s.hands[s.t]; if (s.phase === 'draw') { if (s.knock < 0 && s31(h) >= (level >= 6 ? 25 : 28) && ms.includes('knock')) return 'knock'; const top = s.disc[s.disc.length - 1], withTop = Math.max(...h.map((_, i) => s31(h.filter((__, j) => j !== i).concat(top)))); return withTop > s31(h) + 2 ? 'disc' : 'stock'; }
    return { d: h.slice().sort((a, b) => s31(h.filter(c => c !== b)) - s31(h.filter(c => c !== a)))[0] }; },
  view(s, x) { const ms = x.can ? TB.scat.moves(s) : [], me = x.me >= 0 ? x.me : 0; x.el.innerHTML = `<div class="ctable"><div class="pigs">${s.lives.map((l, i) => `<div class="pg ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}${s.knock === i ? ' · knocked' : ''}</span><b>${'♥'.repeat(l) || 'out'}</b>${s.reveal && s.reveal[i] ? `<small>${s.reveal[i].map(c => cRank(c) + SUITG[cSuit(c)]).join(' ')}</small>` : ''}</div>`).join('')}</div>
    <div class="pile"><button class="card back" data-i="stock" ${ms.includes('stock') ? '' : 'disabled'} aria-label="Draw"></button>${s.disc.length ? cardHTML(s.disc[s.disc.length - 1], ms.includes('disc') ? 'data-i="disc"' : 'disabled', ms.includes('disc') ? 'ok' : '') : ''}${ms.includes('knock') ? '<button class="btn" data-i="knock">Knock</button>' : ''}</div><p class="center">Your hand: <b>${s31(s.hands[me])}</b> <span class="muted small">${esc(s.log)}</span></p>
    <div class="hand">${s.hands[me].map(c => cardHTML(c, ms.some(m => m.d === c) ? `data-i="d${c}"` : 'disabled', ms.some(m => m.d === c) ? 'ok' : '')).join('')}</div><p class="muted small center">Count one suit only: ace 11, faces 10. Lowest hand loses a life; a knocker who is lowest loses two.</p></div>`;
    x.on(d => x.act(['disc', 'stock', 'knock'].includes(d) ? d : d[0] === 'd' && d.length > 2 ? { d: d.slice(1) } : d)); } };

// ---------- Six-Card Golf ----------
const g6v = c => cRank(c) === 'K' ? 0 : cRank(c) === 'A' ? 1 : 'JQ'.includes(cRank(c)) ? 10 : +cRank(c);
const g6Score = (h) => { let sc = 0; for (let c = 0; c < 3; c++) { const a = h[c], b = h[c + 3]; sc += cRank(a.c) === cRank(b.c) ? 0 : g6v(a.c) + g6v(b.c); } return sc; };
function g6Deal(s) { const d = deck52(); const grids = [...Array(s.n)].map(() => d.splice(0, 6).map((c, i) => ({ c, up: i === 0 || i === 4 }))); return { ...s, grids, deck: d.slice(1), disc: [d[0]], held: null, phase: 'draw', t: s.hole % s.n, ender: -1, turns: 0 }; }
TB.sixgolf = { seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'], init: n => g6Deal({ n, hole: 0, tot: Array(n).fill(0), log: '' }), turn: s => s.t,
  moves(s) { if (TB.sixgolf.result(s)) return []; if (s.phase === 'draw') return ['stock', 'disc']; const g = s.grids[s.t], out = g.map((_, i) => ({ sw: i })); if (s.from === 'stock') g.forEach((x, i) => { if (!x.up) out.push({ fl: i }); }); return out; },
  play(s, m) { const n = cl(s), t = s.t, g = n.grids[t]; if (m === 'stock' || m === 'disc') { if (!n.deck.length) { const top = n.disc.pop(); n.deck = shuf(n.disc); n.disc = [top]; } n.held = m === 'stock' ? n.deck.pop() : n.disc.pop(); n.from = m; n.phase = 'place'; return n; }
    if (m.sw !== undefined) { n.disc.push(g[m.sw].c); g[m.sw] = { c: n.held, up: true }; } else { n.disc.push(n.held); g[m.fl].up = true; } n.held = null; n.phase = 'draw';
    n.turns = (s.turns || 0) + 1; if (n.ender < 0 && (g.every(x => x.up) || n.turns >= 10 * s.n)) { n.ender = t; n.log = `Seat ${t + 1} turned all cards: one last turn each`; } n.t = (t + 1) % s.n;
    if (n.ender >= 0 && n.t === n.ender) { n.grids.forEach(gg => gg.forEach(x => x.up = true)); const sc = n.grids.map(g6Score); n.tot = n.tot.map((v, i) => v + sc[i]); n.log = `Hole ${s.hole + 1}: ` + sc.join(' / '); n.hole++; if (n.hole >= 4) { n.over = true; n.lastGrids = n.grids; return n; } return { ...g6Deal(n), log: n.log }; } return n; },
  result(s) { if (!s.over) return null; const mn = Math.min(...s.tot); return { winner: s.tot.filter(v => v === mn).length > 1 ? -1 : s.tot.indexOf(mn), score: s.tot }; },
  ai(s, level, ms) { const g = s.grids[s.t]; if (s.phase === 'draw') { const top = s.disc[s.disc.length - 1]; return g6v(top) <= 4 || g.some((x, i) => x.up && cRank(x.c) === cRank(top) && !(g[(i + 3) % 6] || {}).up) ? 'disc' : 'stock'; }
    const h = s.held; let best = null, bv = -1e9; for (const m of ms) { const ng = g.map(x => ({ ...x })); if (m.sw !== undefined) ng[m.sw] = { c: h, up: true }; else ng[m.fl].up = true; const known = ng.map(x => x.up ? x : { c: '5S', up: false }); const v = -g6Score(known) - (m.fl !== undefined ? 1 : 0) + (noisy(level) ? Math.random() * 10 : 0); if (v > bv) { bv = v; best = m; } } return best; },
  view(s, x) { const ms = x.can ? TB.sixgolf.moves(s) : [], me = x.me >= 0 ? x.me : 0; const grid6 = (g, mine) => `<div class="g6">${g.map((cc, i) => cc.up ? cardHTML(cc.c, mine && ms.some(m => m.sw === i) ? `data-i="s${i}"` : 'disabled', mine && ms.some(m => m.sw === i) ? 'ok' : '') : cardHTML(null, mine && (ms.some(m => m.fl === i) || ms.some(m => m.sw === i)) ? `data-i="${ms.some(m => m.fl === i) ? 'f' : 's'}${i}"` : 'disabled')).join('')}</div>`;
    x.el.innerHTML = `<div class="ctable"><div class="score2"><span>Hole ${Math.min(s.hole + 1, 4)} of 4</span><span>${s.tot.map((v, i) => esc(x.names[i] || '') + ' ' + v).join(' · ')}</span></div><div class="opps">${s.grids.map((g, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span>${grid6(g, false)}</div>`).join('')}</div>
      <div class="pile"><button class="card back" data-i="stock" ${ms.includes('stock') ? '' : 'disabled'} aria-label="Draw"></button>${s.disc.length ? cardHTML(s.disc[s.disc.length - 1], ms.includes('disc') ? 'data-i="disc"' : 'disabled', ms.includes('disc') ? 'ok' : '') : ''}${s.held ? `<span>Holding</span>${cardHTML(s.held, 'disabled', 'sel')}` : ''}</div>
      <p class="center">${s.held ? 'Tap a card to swap it' + (s.from === 'stock' ? ', or a face-down card to discard and turn it over.' : '.') : x.can ? 'Draw from the stock or the discard.' : ''} <span class="muted small">${esc(s.log)}</span></p>${grid6(s.grids[me], true)}<p class="muted small center">Low score wins. Kings 0, aces 1, jacks and queens 10; a matching column scores 0.</p></div>`;
    x.on(d => { if (d === 'stock' || d === 'disc') return x.act(d); const i = +d.slice(1); x.act(d[0] === 's' ? { sw: i } : { fl: i }); }); } };

// ---------- Solitaire helpers ----------
function soloCards(el, o, cfg) { // generic click-to-move solitaire shell
  let st = cfg.init(), sel = null, moves = 0, done = false, hist = [], last = { a: '', t: 0 };
  const draw = () => { el.innerHTML = cfg.render(st, sel, moves) + `<div class="row-btns"><button class="btn sm" data-a="undo" ${hist.length ? '' : 'disabled'}>Undo</button>${cfg.auto ? '<button class="btn sm" data-a="auto">Send to foundations</button>' : ''}<button class="btn sm ghost" data-a="giveup">Give up</button><span class="muted small">Moves ${moves}</span></div>`; };
  const finish = won => { if (done) return; done = true; const sc = cfg.score(st, won, moves); o.score(sc); o.end({ score: sc, won }); draw(); };
  const commit = (fn) => { const snap = JSON.stringify(st); if (fn() !== false) { hist.push(snap); moves++; sel = null; o.score(cfg.score(st, false, moves)); if (cfg.won(st)) finish(true); else if (cfg.stuck && cfg.stuck(st)) finish(false); } else sel = null; draw(); };
  el.addEventListener('click', e => { if (done) return; const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a, dbl = last.a === a && Date.now() - last.t < 380; last = { a, t: Date.now() };
    if (a === 'undo') { st = JSON.parse(hist.pop()); sel = null; moves++; return draw(); } if (a === 'giveup') return finish(false); if (a === 'auto') return commit(() => cfg.auto(st));
    const r = cfg.click(st, sel, a, dbl); if (r && r.sel !== undefined) { sel = r.sel; return draw(); } if (r && r.move) return commit(r.move); sel = null; draw(); });
  draw(); return () => {}; }
const CH = (c, attrs, cls) => cardHTML(c, attrs, cls);
const alt = (a, b) => red(a) !== red(b) && rk(a) === rk(b) + 1;
const foundTo = (f, c) => rk(c) === (f[cSuit(c)] || []).length + 1;

// ---------- Yukon ----------
SO.yukon = { start(el, o) { return soloCards(el, o, {
  init() { const d = deck52(), cols = [[{ c: d.pop(), up: true }]]; for (let k = 1; k < 7; k++) { const col = []; for (let j = 0; j < k; j++) col.push({ c: d.pop(), up: false }); for (let j = 0; j < 4; j++) col.push({ c: d.pop(), up: true }); cols.push(col); } return { cols, f: { S: [], H: [], D: [], C: [] } }; },
  render: (s, sel) => `<div class="kl"><div class="klt">${SUITS.map(su => `<div class="slot" data-a="f">${s.f[su].length ? CH(s.f[su][s.f[su].length - 1], 'disabled') : `<span class="muted">${SUITG[su]}</span>`}</div>`).join('')}</div><div class="klb">${s.cols.map((col, k) => `<div class="col" data-a="t${k}">${col.map((x, i) => x.up ? CH(x.c, `data-a="t${k}:${i}"`, sel && sel.k === k && i >= sel.i ? 'sel' : '') : CH(null, 'disabled')).join('')}</div>`).join('')}</div><p class="muted small">Any face-up card moves with everything on top of it. Build down in alternating colours; only kings fill empty columns.</p></div>`,
  click(s, sel, a, dbl) { const flip = k => { const c = s.cols[k]; if (c.length && !c[c.length - 1].up) c[c.length - 1].up = true; };
    if (a === 'f') return sel && sel.i === s.cols[sel.k].length - 1 ? { move: () => { const x = s.cols[sel.k][sel.i]; if (!foundTo(s.f, x.c)) return false; s.f[cSuit(x.c)].push(s.cols[sel.k].pop().c); flip(sel.k); } } : null;
    const [k, i] = a.slice(1).split(':').map(Number); if (sel && sel.k !== k) return { move: () => { const run = s.cols[sel.k].slice(sel.i), tgt = s.cols[k], top = tgt[tgt.length - 1]; if (tgt.length ? !alt(top.c, run[0].c) : rk(run[0].c) !== 13) return false; s.cols[sel.k].splice(sel.i); tgt.push(...run); flip(sel.k); } };
    if (isNaN(i)) return { sel: null }; if (dbl && i === s.cols[k].length - 1 && foundTo(s.f, s.cols[k][i].c)) return { move: () => { s.f[cSuit(s.cols[k][i].c)].push(s.cols[k].pop().c); flip(k); } }; return { sel: { k, i } }; },
  won: s => sum(Object.values(s.f).map(f => f.length)) === 52, score: (s, won, m) => sum(Object.values(s.f).map(f => f.length)) * 10 * o.level / 2 + (won ? 500 : 0) | 0 }); } };

// ---------- Scorpion ----------
SO.scorpion = { start(el, o) { return soloCards(el, o, {
  init() { const d = deck52(), cols = [...Array(7)].map((_, k) => [...Array(7)].map((_, j) => ({ c: d.pop(), up: !(k < 4 && j < 3) }))); return { cols, reserve: d, done: 0 }; },
  render: (s, sel) => `<div class="kl"><div class="row-btns"><button class="btn sm" data-a="deal" ${s.reserve.length ? '' : 'disabled'}>Deal the last ${s.reserve.length} cards</button><span class="muted small">Completed suits ${s.done}/4</span></div><div class="klb">${s.cols.map((col, k) => `<div class="col" data-a="t${k}">${col.map((x, i) => x.up ? CH(x.c, `data-a="t${k}:${i}"`, sel && sel.k === k && i >= sel.i ? 'sel' : '') : CH(null, 'disabled')).join('')}</div>`).join('')}</div><p class="muted small">Move any face-up card (with everything on it) onto the next higher card of the same suit. Kings go into empty columns. Build each suit from king down to ace.</p></div>`,
  click(s, sel, a) { const tidy = k => { const c = s.cols[k]; if (c.length && !c[c.length - 1].up) c[c.length - 1].up = true; if (c.length >= 13) { const tail = c.slice(-13); if (tail.every((x, j) => x.up && cSuit(x.c) === cSuit(tail[0].c) && rk(x.c) === 13 - j)) { c.splice(-13); s.done++; } } };
    if (a === 'deal') return { move: () => { s.reserve.splice(0).forEach((c, k) => s.cols[k].push({ c, up: true })); s.cols.forEach((_, k) => tidy(k)); } };
    const [k, i] = a.slice(1).split(':').map(Number); if (sel && sel.k !== k) return { move: () => { const run = s.cols[sel.k].slice(sel.i), tgt = s.cols[k], top = tgt[tgt.length - 1]; if (tgt.length ? !(cSuit(top.c) === cSuit(run[0].c) && rk(top.c) === rk(run[0].c) + 1) : rk(run[0].c) !== 13) return false; s.cols[sel.k].splice(sel.i); tgt.push(...run); tidy(sel.k); tidy(k); } };
    return isNaN(i) ? { sel: null } : { sel: { k, i } }; },
  won: s => s.done === 4, score: (s, won) => s.done * 150 * o.level / 2 + (won ? 500 : 0) | 0 }); } };

// ---------- Canfield ----------
SO.canfield = { start(el, o) { return soloCards(el, o, {
  init() { const d = deck52(), reserve = d.splice(0, 13), base = d.pop(), tab = [0, 1, 2, 3].map(() => [d.pop()]); return { reserve, base: cRank(base), f: { [cSuit(base)]: [base] }, tab, stock: d, waste: [] }; },
  render(s, sel) { const bi = RANKS.indexOf(s.base); return `<div class="kl"><div class="klt"><div class="slot" data-a="stock">${s.stock.length ? CH(null, '') : '<span class="muted">↻</span>'}</div><div class="slot">${s.waste.length ? CH(s.waste[s.waste.length - 1], 'data-a="w"', sel && sel.w ? 'sel' : '') : ''}</div><div class="slot">${s.reserve.length ? CH(s.reserve[s.reserve.length - 1], 'data-a="r"', sel && sel.r ? 'sel' : '') : ''}<small>${s.reserve.length}</small></div>${SUITS.map(su => `<div class="slot" data-a="f${su}">${(s.f[su] || []).length ? CH(s.f[su][s.f[su].length - 1], 'disabled') : `<span class="muted">${s.base}${SUITG[su]}</span>`}</div>`).join('')}</div>
    <div class="klb" style="grid-template-columns:repeat(4,1fr)">${s.tab.map((col, k) => `<div class="col" data-a="t${k}">${col.map((c, i) => CH(c, `data-a="t${k}:${i}"`, sel && sel.k === k && i >= sel.i ? 'sel' : '')).join('')}</div>`).join('')}</div><p class="muted small">Foundations start at ${s.base} and wrap from king to ace. Tableau builds down in alternating colours; empty spaces fill from the reserve.</p></div>`; },
  click(s, sel, a, dbl) { const bi = RANKS.indexOf(s.base), next = (top, c) => (RANKS.indexOf(cRank(c)) - RANKS.indexOf(cRank(top)) + 13) % 13 === 1, canF = c => { const f = s.f[cSuit(c)]; return f && f.length ? next(f[f.length - 1], c) : RANKS.indexOf(cRank(c)) === bi; }, canT = (col, c) => !col.length || (red(col[col.length - 1]) !== red(c) && next(c, col[col.length - 1]));
    const pick = () => sel.w ? [s.waste[s.waste.length - 1]] : sel.r ? [s.reserve[s.reserve.length - 1]] : s.tab[sel.k].slice(sel.i), take = () => sel.w ? s.waste.pop() : sel.r ? s.reserve.pop() : s.tab[sel.k].splice(sel.i), refill = () => s.tab.forEach(col => { if (!col.length && s.reserve.length) col.push(s.reserve.pop()); });
    if (a === 'stock') return { move: () => { if (s.stock.length) for (let k = 0; k < 3 && s.stock.length; k++) s.waste.push(s.stock.pop()); else { s.stock = s.waste.reverse(); s.waste = []; } } };
    if (a[0] === 'f') return sel ? { move: () => { const cs = pick(); if (cs.length !== 1 || !canF(cs[0])) return false; take(); (s.f[cSuit(cs[0])] = s.f[cSuit(cs[0])] || []).push(cs[0]); refill(); } } : null;
    if (a === 'w' || a === 'r') { const ns = a === 'w' ? { w: true } : { r: true }; const c = a === 'w' ? s.waste[s.waste.length - 1] : s.reserve[s.reserve.length - 1]; if (dbl && canF(c)) return { move: () => { (a === 'w' ? s.waste : s.reserve).pop(); (s.f[cSuit(c)] = s.f[cSuit(c)] || []).push(c); refill(); } }; return { sel: ns }; }
    const [k, i] = a.slice(1).split(':').map(Number); if (sel && !(sel.k === k && !sel.w && !sel.r)) return { move: () => { const cs = pick(); if (!canT(s.tab[k], cs[0])) return false; take(); s.tab[k].push(...[cs].flat()); refill(); } };
    if (isNaN(i)) return { sel: null }; if (dbl && i === s.tab[k].length - 1 && canF(s.tab[k][i])) return { move: () => { const c = s.tab[k].pop(); (s.f[cSuit(c)] = s.f[cSuit(c)] || []).push(c); refill(); } }; return { sel: { k, i } }; },
  won: s => sum(Object.values(s.f).map(f => f.length)) === 52, score: (s, won) => sum(Object.values(s.f).map(f => f.length)) * 10 * o.level / 2 + (won ? 500 : 0) | 0 }); } };

// ---------- Forty Thieves (two decks) ----------
SO.fortythieves = { start(el, o) { return soloCards(el, o, {
  init() { const d = shuf(deck52().concat(deck52())), tab = [...Array(10)].map(() => d.splice(0, 4)); return { tab, stock: d, waste: [], f: [...Array(8)].map(() => []) }; },
  render: (s, sel) => `<div class="kl"><div class="klt" style="grid-template-columns:repeat(10,1fr)"><div class="slot" data-a="stock">${s.stock.length ? CH(null, '') : ''}<small>${s.stock.length}</small></div><div class="slot">${s.waste.length ? CH(s.waste[s.waste.length - 1], 'data-a="w"', sel && sel.w ? 'sel' : '') : ''}</div>${s.f.map((f, k) => `<div class="slot" data-a="f${k}">${f.length ? CH(f[f.length - 1], 'disabled') : ''}</div>`).join('')}</div><div class="klb sp">${s.tab.map((col, k) => `<div class="col" data-a="t${k}">${col.map((c, i) => CH(c, i === col.length - 1 ? `data-a="t${k}:${i}"` : 'disabled', sel && sel.k === k ? 'sel' : '')).join('')}</div>`).join('')}</div><p class="muted small">Move one card at a time. Build down by suit; any card fills a space. The stock is dealt once.</p></div>`,
  click(s, sel, a, dbl) { const pick = () => sel.w ? s.waste[s.waste.length - 1] : s.tab[sel.k][s.tab[sel.k].length - 1], take = () => sel.w ? s.waste.pop() : s.tab[sel.k].pop(); const canF = (f, c) => f.length ? cSuit(f[0]) === cSuit(c) && rk(c) === f.length + 1 : rk(c) === 1; const autoF = c => s.f.findIndex(f => canF(f, c));
    if (a === 'stock') return s.stock.length ? { move: () => { s.waste.push(s.stock.pop()); } } : null;
    if (a[0] === 'f') return sel ? { move: () => { const c = pick(), f = s.f[+a.slice(1)]; if (!canF(f, c)) { const k2 = autoF(c); if (k2 < 0) return false; take(); s.f[k2].push(c); return; } take(); f.push(c); } } : null;
    if (a === 'w') { if (dbl && autoF(s.waste[s.waste.length - 1]) >= 0) return { move: () => { const c = s.waste.pop(); s.f[autoF(c)].push(c); } }; return { sel: { w: true } }; }
    const [k, i] = a.slice(1).split(':').map(Number); if (sel && !(sel.k === k && !sel.w)) return { move: () => { const c = pick(), col = s.tab[k], top = col[col.length - 1]; if (col.length && !(cSuit(top) === cSuit(c) && rk(top) === rk(c) + 1)) return false; take(); col.push(c); } };
    if (isNaN(i)) return { sel: null }; if (dbl && autoF(s.tab[k][i]) >= 0) return { move: () => { const c = s.tab[k].pop(); s.f[autoF(c)].push(c); } }; return { sel: { k, i } }; },
  won: s => s.f.every(f => f.length === 13), score: (s, won) => sum(s.f.map(f => f.length)) * 5 * o.level / 2 + (won ? 800 : 0) | 0 }); } };

// ---------- Accordion ----------
SO.accordion = { start(el, o) { return soloCards(el, o, {
  init: () => ({ piles: [], stock: deck52() }),
  render: (s, sel) => `<div class="acc">${s.piles.map((c, i) => CH(c, `data-a="p${i}"`, sel === i ? 'sel' : '')).join('')}<button class="card back" data-a="deal" ${s.stock.length ? '' : 'disabled'} aria-label="Deal"></button></div><p class="muted small center">Piles ${s.piles.length} · stock ${s.stock.length}. Move a pile onto the one directly left or three to the left if suit or rank matches. Aim for one pile.</p>`,
  click(s, sel, a) { if (a === 'deal') return { move: () => { s.piles.push(s.stock.shift()); } }; const i = +a.slice(1); if (sel === null || sel === undefined) return { sel: i }; const j = sel; const d = j - i; if (d !== 1 && d !== 3) return { sel: i }; return { move: () => { const x = s.piles[j], y = s.piles[i]; if (cSuit(x) !== cSuit(y) && cRank(x) !== cRank(y)) return false; s.piles[i] = x; s.piles.splice(j, 1); } }; },
  won: s => !s.stock.length && s.piles.length === 1, score: (s, won) => Math.max(0, (52 - s.piles.length - s.stock.length) * 8 * o.level / 2 + (won ? 1000 : 0)) | 0 }); } };

// ---------- Three Peaks ----------
SO.tripeaks = { start(el, o) { const wrap = o.level <= 6; return soloCards(el, o, {
  init() { const d = deck52(), cards = d.splice(0, 28); return { cards, gone: Array(28).fill(false), stock: d.slice(1), waste: [d[0]], streak: 0, pts: 0 }; },
  // rows: 3 tops (0-2), 6 (3-8), 9 (9-17), 10 (18-27)
  render(s, sel) { const covers = TP_COV, free = i => !s.gone[i] && covers[i].every(j => s.gone[j]); const rows = [[0, 1, 2], [3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16, 17], [18, 19, 20, 21, 22, 23, 24, 25, 26, 27]];
    return `<div class="tpk">${rows.map((r, ri) => `<div class="tprow r${ri}">${r.map(i => s.gone[i] ? '<i class="gap"></i>' : free(i) ? CH(s.cards[i], `data-a="c${i}"`, 'ok') : CH(null, 'disabled')).join('')}</div>`).join('')}</div><div class="pile"><button class="card back" data-a="stock" ${s.stock.length ? '' : 'disabled'} aria-label="Turn"></button><small>${s.stock.length}</small>${CH(s.waste[s.waste.length - 1], 'disabled')}<span>Streak ${s.streak}</span></div><p class="muted small center">Play an uncovered card one higher or lower than the waste card${wrap ? ' (ace and king connect)' : ''}.</p>`; },
  click(s, sel, a) { if (a === 'stock') return s.stock.length ? { move: () => { s.waste.push(s.stock.pop()); s.streak = 0; } } : null; const i = +a.slice(1); return { move: () => { const w = rk(s.waste[s.waste.length - 1]), v = rk(s.cards[i]), d = Math.abs(w - v); if (!(d === 1 || (wrap && d === 12))) return false; s.gone[i] = true; s.waste.push(s.cards[i]); s.streak++; s.pts += s.streak * 10; } }; },
  won: s => s.gone.every(Boolean), stuck: s => !s.stock.length && !s.cards.some((c, i) => !s.gone[i] && TP_COV[i].every(j => s.gone[j]) && [1, 12].includes(Math.abs(rk(s.waste[s.waste.length - 1]) - rk(c))) && (Math.abs(rk(s.waste[s.waste.length - 1]) - rk(c)) === 1 || wrap)),
  score: (s, won) => (s.pts + (won ? 500 + s.stock.length * 30 : 0)) * o.level / 3 | 0 }); } };
const TP_COV = (() => { const c = Array(28).fill(0).map(() => []); for (let p = 0; p < 3; p++) { c[p] = [3 + p * 2, 4 + p * 2]; } for (let k = 0; k < 6; k++) { const p = Math.floor(k / 2), off = k % 2; c[3 + k] = [9 + p * 3 + off, 10 + p * 3 + off]; } for (let k = 0; k < 9; k++) c[9 + k] = [18 + k, 19 + k]; return c; })();

// ---------- Aces Up ----------
SO.acesup = { start(el, o) { return soloCards(el, o, {
  init() { const d = deck52(); return { cols: [0, 1, 2, 3].map(() => [d.pop()]), stock: d, gone: 0 }; },
  render: (s, sel) => `<div class="klb" style="grid-template-columns:repeat(4,1fr)">${s.cols.map((col, k) => `<div class="col" data-a="t${k}">${col.map((c, i) => CH(c, i === col.length - 1 ? `data-a="t${k}"` : 'disabled', sel === k ? 'sel' : '')).join('')}</div>`).join('')}</div><div class="pile"><button class="card back" data-a="deal" ${s.stock.length ? '' : 'disabled'} aria-label="Deal four"></button><small>${s.stock.length} left · discarded ${s.gone}</small></div><p class="muted small center">Tap a top card to discard it when a higher card of the same suit tops another column (aces are high). Select a card, then an empty column, to move it. Finish with only the four aces.</p>`,
  click(s, sel, a) { if (a === 'deal') return { move: () => { s.cols.forEach(c => s.stock.length && c.push(s.stock.pop())); } }; const k = +a.slice(1), col = s.cols[k];
    if (sel !== null && sel !== undefined && sel !== k && !col.length) return { move: () => { s.cols[k].push(s.cols[sel].pop()); } }; if (!col.length) return { sel: null }; const top = col[col.length - 1], hi = c => (cVal(c) + 12) % 13;
    if (s.cols.some((c2, j) => j !== k && c2.length && cSuit(c2[c2.length - 1]) === cSuit(top) && hi(c2[c2.length - 1]) > hi(top))) return { move: () => { col.pop(); s.gone++; } }; return { sel: k }; },
  won: s => !s.stock.length && s.gone === 48, score: (s, won) => s.gone * 10 * o.level / 2 + (won ? 500 : 0) | 0 }); } };

// ---------- Beleaguered Castle ----------
SO.beleaguered = { start(el, o) { return soloCards(el, o, {
  init() { const d = deck52().filter(c => cRank(c) !== 'A'); return { rows: [...Array(8)].map(() => d.splice(0, 6)), f: { S: ['AS'], H: ['AH'], D: ['AD'], C: ['AC'] } }; },
  render: (s, sel) => `<div class="bc"><div class="bcf">${SUITS.map(su => `<div class="slot" data-a="f${su}">${CH(s.f[su][s.f[su].length - 1], 'disabled')}</div>`).join('')}</div><div class="bcr">${s.rows.map((r, k) => `<div class="brow" data-a="r${k}">${r.map((c, i) => CH(c, i === r.length - 1 ? `data-a="r${k}"` : 'disabled', sel === k && i === r.length - 1 ? 'sel' : '')).join('') || '<span class="muted small">empty</span>'}</div>`).join('')}</div></div><p class="muted small center">Move the last card of a row onto a card one rank higher (any suit), into an empty row, or up to its foundation. Double-tap sends a card home.</p>`,
  click(s, sel, a, dbl) { const toF = c => rk(c) === s.f[cSuit(c)].length + 1;
    if (a[0] === 'f') return sel !== null && sel !== undefined ? { move: () => { const c = s.rows[sel][s.rows[sel].length - 1]; if (!c || !toF(c)) return false; s.f[cSuit(c)].push(s.rows[sel].pop()); } } : null;
    const k = +a.slice(1), row = s.rows[k], top = row[row.length - 1]; if (sel !== null && sel !== undefined && sel !== k) return { move: () => { const c = s.rows[sel][s.rows[sel].length - 1]; if (row.length && rk(top) !== rk(c) + 1) return false; row.push(s.rows[sel].pop()); } };
    if (!top) return { sel: null }; if (dbl && toF(top)) return { move: () => { s.f[cSuit(top)].push(row.pop()); } }; return { sel: k }; },
  won: s => SUITS.every(su => s.f[su].length === 13), score: (s, won) => (sum(SUITS.map(su => s.f[su].length)) - 4) * 10 * o.level / 2 + (won ? 500 : 0) | 0, auto: s => { let moved = false, go = true; while (go) { go = false; s.rows.forEach(r => { const c = r[r.length - 1]; if (c && rk(c) === s.f[cSuit(c)].length + 1) { s.f[cSuit(c)].push(r.pop()); go = moved = true; } }); } return moved; } }); } };

// ---------- Video Poker (Jacks or Better) ----------
const VP_PAY = [['Royal flush', 800], ['Straight flush', 50], ['Four of a kind', 25], ['Full house', 9], ['Flush', 6], ['Straight', 4], ['Three of a kind', 3], ['Two pair', 2], ['Jacks or better', 1]];
function vpHand(h) { const v = eval5(h), cat = Math.floor(v / 1e10); if (cat === 8) return h.map(hv).includes(12) && h.map(hv).includes(8) ? 0 : 1; const map = { 7: 2, 6: 3, 5: 4, 4: 5, 3: 6, 2: 7 }; if (map[cat] !== undefined) return map[cat]; if (cat === 1) { const c = {}; h.forEach(x => c[hv(x)] = (c[hv(x)] || 0) + 1); const pr = +Object.keys(c).find(k => c[k] === 2); return pr >= 9 ? 8 : -1; } return -1; }
SO.videopoker = { start(el, o) { let bank = 500, peak = 500, bet = 5, hand = [], held = [0, 0, 0, 0, 0], deck = [], phase = 'bet', msg = 'Set your bet and deal.';
  const draw = () => { el.innerHTML = `<div class="bj"><div class="hud2">Credits <b>${bank}</b> · bet <b>${bet}</b> · best ${peak}</div><table class="lb vp"><tbody>${VP_PAY.map(([n, p], i) => `<tr class="${phase === 'done' && vpHand(hand) === i ? 'mine' : ''}"><td>${n}</td><td class="num">${p * bet}</td></tr>`).join('')}</tbody></table>
    <div class="hand">${hand.map((c, i) => `<div class="vpc">${cardHTML(c, phase === 'hold' ? `data-a="h${i}"` : 'disabled', held[i] ? 'sel' : '')}<small>${held[i] ? 'HELD' : ''}</small></div>`).join('')}</div><p class="bjm">${esc(msg)}</p>
    <div class="row-btns">${phase !== 'hold' ? `<button class="btn" data-a="b-1">Bet −</button><button class="btn" data-a="b1">Bet +</button><button class="btn hot" data-a="deal" ${bank >= bet ? '' : 'disabled'}>Deal</button><button class="btn" data-a="cash">Cash out</button>` : '<button class="btn hot" data-a="draw">Draw</button>'}</div></div>`; };
  el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a[0] === 'b' && phase !== 'hold') bet = Math.max(1, Math.min(5, bet + +a.slice(1)));
    if (a === 'deal' && phase !== 'hold') { bank -= bet; deck = deck52(); hand = deck.splice(0, 5); held = [0, 0, 0, 0, 0]; phase = 'hold'; msg = 'Tap cards to hold, then draw.'; }
    if (a[0] === 'h') held[+a.slice(1)] ^= 1;
    if (a === 'draw') { hand = hand.map((c, i) => held[i] ? c : deck.pop()); const r = vpHand(hand); const win = r >= 0 ? VP_PAY[r][1] * bet : 0; bank += win; peak = Math.max(peak, bank); msg = r >= 0 ? `${VP_PAY[r][0]}! You win ${win}.` : 'No win.'; phase = 'done'; o.score(Math.max(0, peak - 500) * o.level / 2 | 0); if (bank < 1) { msg += ' Out of credits.'; o.end({ score: Math.max(0, peak - 500) * o.level / 2 | 0 }); } }
    if (a === 'cash') o.end({ score: Math.max(0, peak - 500) * o.level / 2 | 0, won: peak > 500 }); draw(); }); draw(); return () => {}; } };

// ---------- Higher or Lower ----------
SO.higherlower = { start(el, o) { let deck = deck52(), cur = deck.pop(), streak = 0, best = 0, lives = Math.max(1, 4 - (o.level >> 2)), msg = 'Will the next card be higher or lower? Ties count against you.', over = false;
  const draw = () => { el.innerHTML = `<div class="bj"><div class="hud2">Streak <b>${streak}</b> · best ${best} · lives ${lives}</div><div class="pile">${cardHTML(cur, 'disabled', 'big')}<small>${deck.length} left</small></div><p class="bjm">${esc(msg)}</p><div class="row-btns"><button class="btn hot big" data-a="hi" ${over ? 'disabled' : ''}>Higher</button><button class="btn big" data-a="lo" ${over ? 'disabled' : ''}>Lower</button></div></div>`; };
  el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || over) return; if (!deck.length) deck = deck52(); const nx = deck.pop(), a = hv(cur), n = hv(nx), ok = b.dataset.a === 'hi' ? n > a : n < a; msg = `${cRank(nx)}${SUITG[cSuit(nx)]}: ${ok ? 'correct!' : 'wrong.'}`;
    if (ok) { streak++; best = Math.max(best, streak); beep(700, .06); } else { lives--; streak = 0; beep(150, .1); } cur = nx; o.score(best * 20 * o.level); if (!lives) { over = true; msg += ' Game over.'; o.end({ score: best * 20 * o.level, won: best >= 10 }); } draw(); }); draw(); return () => {}; } };

// ---------- Snap & Egyptian Ratscrew (vs computer, real time) ----------
function slapGame(el, o, rules) { const d = deck52(); let me = d.slice(0, 26), ai = d.slice(26), pile = [], turn = 0, over = false, msg = rules.intro, aiT = null, flipT = null, debt = 0, debtor = -1; const react = Math.max(220, 1000 - o.level * 75);
  const finish = () => { if (over) return; over = true; clearTimeout(aiT); clearTimeout(flipT); soloEnd(o, me.length * 10 * o.level, me.length > ai.length); draw(); };
  const give = who => { (who ? ai : me).push(...pile); pile = []; debt = 0; debtor = -1; turn = who; };
  const slap = who => { if (over) return; clearTimeout(aiT); if (rules.valid(pile)) { give(who); msg = who ? 'The computer was faster!' : 'You took the pile!'; beep(who ? 200 : 880, .1); } else if (!who) { if (me.length) pile.unshift(me.shift()); msg = 'Wrong slap: you lost a card to the bottom of the pile.'; beep(150, .1); }
    if (!me.length || !ai.length) finish(); draw(); sched(); };
  const flip = who => { if (over) return; const src = who ? ai : me; if (!src.length) { if (pile.length) give(1 - who); return finish(); } pile.push(src.shift()); const top = pile[pile.length - 1];
    if (rules.penalties) { const p = { J: 1, Q: 2, K: 3, A: 4 }[cRank(top)]; if (p) { debt = p; debtor = 1 - who; turn = 1 - who; } else if (debt) { debt--; if (!debt) { msg = `${who ? 'You' : 'The computer'} won the pile by penalty.`; const w = 1 - who; setTimeout(() => { if (!over && !rules.valid(pile)) { give(w); draw(); sched(); } }, 900); } else turn = who; } else turn = 1 - who; } else turn = 1 - who;
    if (rules.valid(pile)) aiT = setTimeout(() => slap(1), react + R(250)); draw(); sched(); };
  const sched = () => { clearTimeout(flipT); if (turn === 1 && !over) flipT = setTimeout(() => flip(1), 700); };
  const draw = () => { el.innerHTML = `<div class="ctable"><div class="opp"><span>Computer</span><small>${ai.length} cards</small></div><div class="pile">${pile.slice(-3).map((c, i, a) => cardHTML(c, 'disabled', i === a.length - 1 ? 'big' : 'tiny')).join('') || '<span class="muted">Empty pile</span>'}<small>${pile.length} in pile${debt ? ` · ${debt} to pay` : ''}</small></div><p class="center">${esc(msg)}</p><div class="opp"><span>You</span><small>${me.length} cards</small></div><div class="row-btns"><button class="btn" data-a="flip" ${turn === 0 && !over ? '' : 'disabled'}>Flip (Enter)</button><button class="btn hot big" data-a="slap">${rules.word} (Space)</button></div><p class="muted small center">${rules.help}</p></div>`; };
  el.addEventListener('pointerdown', e => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; if (b.dataset.a === 'flip' && turn === 0) flip(0); if (b.dataset.a === 'slap') slap(0); });
  const kh = e => { if (e.key === ' ') { e.preventDefault(); slap(0); } if (e.key === 'Enter' && turn === 0) flip(0); }; addEventListener('keydown', kh); const end = setTimeout(finish, 240000); draw();
  return () => { removeEventListener('keydown', kh); clearTimeout(aiT); clearTimeout(flipT); clearTimeout(end); }; }
SO.snap = { start: (el, o) => slapGame(el, o, { word: 'SNAP!', intro: 'Take turns flipping. Shout snap when the top two cards match in rank!', help: 'Matching ranks on top of the pile: snap first to win the pile.', valid: p => p.length >= 2 && cRank(p[p.length - 1]) === cRank(p[p.length - 2]) }) };
SO.ratscrew = { start: (el, o) => slapGame(el, o, { word: 'SLAP!', penalties: true, intro: 'Flip in turn. Slap doubles and sandwiches; face cards demand payment.', help: 'Slap on a pair (7-7) or a sandwich (7-K-7). J, Q, K and A force your opponent to pay 1–4 cards.', valid: p => { const n = p.length; return (n >= 2 && cRank(p[n - 1]) === cRank(p[n - 2])) || (n >= 3 && cRank(p[n - 1]) === cRank(p[n - 3])); } }) };
