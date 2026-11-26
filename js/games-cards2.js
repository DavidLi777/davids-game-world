// Card games (trick-taking, poker, rummy, cribbage, family games) and word board games.
const hv = c => (cVal(c) + 12) % 13; // 2..A -> 0..12
const SORD = { S: 0, H: 1, C: 2, D: 3 };
const sortHand = h => h.slice().sort((a, b) => SORD[cSuit(a)] - SORD[cSuit(b)] || hv(a) - hv(b));
const deal = (n, k, deck = deck52()) => { const hands = [...Array(n)].map(() => sortHand(deck.splice(0, k))); return { hands, deck }; };
const nextSeat = (i, n) => (i + 1) % n;
function trickWinner(trick, trumpOf, rankOf) { const led = trumpOf(trick[0].c, true); let best = trick[0]; for (const p of trick.slice(1)) { const s = trumpOf(p.c), bs = trumpOf(best.c); if ((s === 'T' && bs !== 'T') || (s === bs && rankOf(p.c) > rankOf(best.c))) best = p; } return best.p; }
// shared table renderer for 4-hand trick games
function trickTable(s, x, legal, extra = '') { const me = x.me >= 0 ? x.me : 0, n = s.hands.length, pos = i => ['s', 'w', 'n', 'e'][(i - me + n) % n] || 'n';
  const opp = s.hands.map((h, i) => i === me ? '' : `<div class="tseat ${pos(i)} ${x.turnSeat === i ? 'turn' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}${s.dummy === i ? ' · dummy' : ''}</span>${s.dummy === i && s.trick !== undefined && s.dummyUp ? `<div class="hand mini">${h.map(c => cardHTML(c, legal.has(c) && x.ctl === i ? `data-i="c${c}"` : 'disabled', legal.has(c) && x.ctl === i ? 'ok' : '')).join('')}</div>` : `<div class="fan">${h.map(() => '<i class="mini"></i>').join('')}</div>`}<small>${x.seatInfo ? x.seatInfo(i) : ''}</small></div>`).join('');
  const tr = (s.trick || []).map(p => `<div class="tc ${pos(p.p)}">${cardHTML(p.c, 'disabled')}</div>`).join('');
  return `<div class="trick"><div class="tcenter">${tr}</div>${opp}</div>${extra}<div class="tseat s ${x.turnSeat === me ? 'turn' : ''}"><span>${esc(x.names[me] || 'You')}</span><small>${x.seatInfo ? x.seatInfo(me) : ''}</small></div><div class="hand">${(s.hands[me] || []).map(c => cardHTML(c, legal.has(c) && x.ctl === me ? `data-i="c${c}"` : 'disabled', legal.has(c) && x.ctl === me ? 'ok' : '')).join('')}</div>`; }

// ---------- Hearts ----------
const hPts = c => cSuit(c) === 'H' ? 1 : c === 'QS' ? 13 : 0;
function hDeal(s) { const { hands } = deal(4, 13); const dir = s.handNo % 4; return { ...s, hands, passing: [[], [], [], []], phase: dir === 3 ? 'play' : 'pass', trick: [], taken: [[], [], [], []], broken: false, played: 0, t: hands.findIndex(h => h.includes('2C')), first: true }; }
TB.hearts = {
  seats: ['South', 'West', 'North', 'East'], init: () => hDeal({ scores: [0, 0, 0, 0], handNo: 0, log: '' }),
  turn: s => s.phase === 'pass' ? s.passing.findIndex(p => p.length < 3) : s.t,
  moves(s) { if (TB.hearts.result(s)) return []; const t = TB.hearts.turn(s), h = s.hands[t];
    if (s.phase === 'pass') return h.map(c => ({ c }));
    let ok = h; if (!s.trick.length) { if (s.first) ok = h.filter(c => c === '2C'); else if (!s.broken && h.some(c => cSuit(c) !== 'H')) ok = h.filter(c => cSuit(c) !== 'H'); }
    else { const led = cSuit(s.trick[0].c), f = h.filter(c => cSuit(c) === led); if (f.length) ok = f; else if (s.first) { const safe = h.filter(c => !hPts(c)); if (safe.length) ok = safe; } }
    return ok.map(c => ({ c })); },
  play(s, m) { const n = cl(s), t = TB.hearts.turn(s); n.hands[t] = n.hands[t].filter(c => c !== m.c);
    if (s.phase === 'pass') { n.passing[t].push(m.c); if (n.passing.every(p => p.length === 3)) { const off = [1, 3, 2][s.handNo % 4]; n.passing.forEach((cs, i) => { const to = (i + off) % 4; n.hands[to] = sortHand(n.hands[to].concat(cs)); }); n.phase = 'play'; n.t = n.hands.findIndex(h => h.includes('2C')); n.log = 'Cards passed.'; } return n; }
    n.trick.push({ p: t, c: m.c }); if (hPts(m.c)) n.broken = true;
    if (n.trick.length < 4) { n.t = nextSeat(t, 4); return n; }
    const w = trickWinner(n.trick, (c, lead) => cSuit(c) === cSuit(n.trick[0].c) ? 'L' : 'x', hv); n.taken[w].push(...n.trick.map(p => p.c)); n.lastTrick = n.trick; n.trick = []; n.t = w; n.first = false; n.played++;
    if (n.played === 13) { const pts = n.taken.map(cs => sum(cs.map(hPts))), moon = pts.indexOf(26); if (moon >= 0) { n.scores = n.scores.map((v, i) => v + (i === moon ? 0 : 26)); n.log = `${['South', 'West', 'North', 'East'][moon]} shot the moon!`; } else { n.scores = n.scores.map((v, i) => v + pts[i]); n.log = 'Hand points: ' + pts.join(' / '); }
      if (Math.max(...n.scores) < 100) return { ...hDeal({ ...n, handNo: n.handNo + 1 }), log: n.log, lastTrick: n.lastTrick }; }
    return n; },
  result(s) { if (Math.max(...s.scores) < 100) return null; const mn = Math.min(...s.scores); return { winner: s.scores.filter(v => v === mn).length > 1 ? -1 : s.scores.indexOf(mn), score: s.scores }; },
  ai(s, level, ms) { const cs = ms.map(m => m.c); if (noisy(level)) return ms[R(ms.length)];
    if (s.phase === 'pass') { const pri = c => (c === 'QS' ? 100 : c === 'AS' || c === 'KS' ? 90 : 0) + (cSuit(c) === 'H' ? 20 : 0) + hv(c); return { c: cs.sort((a, b) => pri(b) - pri(a))[0] }; }
    if (!s.trick.length) { const nonH = cs.filter(c => cSuit(c) !== 'H' && c !== 'QS'); const pool = nonH.length ? nonH : cs; return { c: pool.sort((a, b) => hv(a) - hv(b))[0] }; }
    const led = cSuit(s.trick[0].c), win = Math.max(...s.trick.filter(p => cSuit(p.c) === led).map(p => hv(p.c)));
    if (cSuit(cs[0]) === led) { const under = cs.filter(c => hv(c) < win).sort((a, b) => hv(b) - hv(a)); if (under.length) return { c: under[0] }; const pts = s.trick.some(p => hPts(p.c)); return { c: cs.sort((a, b) => pts || s.trick.length < 3 ? hv(a) - hv(b) : hv(b) - hv(a))[0] }; }
    if (cs.includes('QS')) return { c: 'QS' }; const hs = cs.filter(c => cSuit(c) === 'H'); return { c: (hs.length ? hs : cs).sort((a, b) => hv(b) - hv(a))[0] }; },
  view(s, x) { const ms = x.can ? TB.hearts.moves(s) : [], legal = new Set(ms.map(m => m.c)); x.turnSeat = TB.hearts.turn(s); x.ctl = x.me;
    x.seatInfo = i => `${s.scores[i]} pts · ${sum(s.taken[i].map(hPts))} this hand${s.phase === 'pass' ? ` · passed ${s.passing[i].length}/3` : ''}`;
    x.el.innerHTML = `<div class="ctable trickg">${s.phase === 'pass' ? `<p class="center"><b>Choose 3 cards to pass ${['left', 'right', 'across'][s.handNo % 4]}.</b></p>` : ''}${trickTable(s, x, legal)}<p class="muted small center">${esc(s.log || '')} ${s.broken ? '· Hearts broken' : ''}</p></div>`;
    x.on(d => x.act({ c: d.slice(1) })); }
};

// ---------- Spades (partners 0+2 vs 1+3, to 300) ----------
function spDeal(s) { const { hands } = deal(4, 13); return { ...s, hands, bids: [null, null, null, null], tricks: [0, 0, 0, 0], phase: 'bid', trick: [], broken: false, played: 0, t: nextSeat(s.dealer, 4) }; }
const spRank = c => hv(c);
TB.spades = {
  seats: ['South', 'West', 'North', 'East'], init: () => spDeal({ team: [0, 0], bags: [0, 0], dealer: 3, log: '' }), turn: s => s.t,
  moves(s) { if (TB.spades.result(s)) return []; if (s.phase === 'bid') return [...Array(14).keys()].map(b => ({ b })); const h = s.hands[s.t];
    if (!s.trick.length) { const ok = !s.broken && h.some(c => cSuit(c) !== 'S') ? h.filter(c => cSuit(c) !== 'S') : h; return ok.map(c => ({ c })); }
    const led = cSuit(s.trick[0].c), f = h.filter(c => cSuit(c) === led); return (f.length ? f : h).map(c => ({ c })); },
  play(s, m) { const n = cl(s), t = s.t; if (m.b !== undefined) { n.bids[t] = m.b; n.t = nextSeat(t, 4); if (n.bids.every(b => b !== null)) n.phase = 'play'; return n; }
    n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); if (cSuit(m.c) === 'S') n.broken = true; if (n.trick.length < 4) { n.t = nextSeat(t, 4); return n; }
    const w = trickWinner(n.trick, c => cSuit(c) === 'S' ? 'T' : cSuit(c) === cSuit(n.trick[0].c) ? 'L' : 'x', spRank); n.tricks[w]++; n.lastTrick = n.trick; n.trick = []; n.t = w; n.played++;
    if (n.played === 13) { const log = []; for (const tm of [0, 1]) { const a = tm, b = tm + 2; let pts = 0, contract = 0, took = 0; for (const p of [a, b]) { if (n.bids[p] === 0) { pts += n.tricks[p] === 0 ? 100 : -100; n.bags[tm] += n.tricks[p]; } else { contract += n.bids[p]; took += n.tricks[p]; } }
        if (contract) { if (took >= contract) { pts += contract * 10 + (took - contract); n.bags[tm] += took - contract; } else pts -= contract * 10; } if (n.bags[tm] >= 10) { pts -= 100; n.bags[tm] -= 10; } n.team[tm] += pts; log.push(`${tm ? 'West/East' : 'South/North'} ${pts >= 0 ? '+' : ''}${pts}`); }
      n.log = log.join(' · '); if (!TB.spades.result(n)) return { ...spDeal({ ...n, dealer: nextSeat(n.dealer, 4) }), log: n.log }; }
    return n; },
  result(s) { if (Math.max(...s.team) < 300 && Math.min(...s.team) > -200) return null; const w = s.team[0] === s.team[1] ? -1 : s.team[0] > s.team[1] ? 0 : 1; return { winner: w, team: true, score: s.team }; },
  ai(s, level, ms) { const h = s.hands[s.t];
    if (s.phase === 'bid') { let est = 0; h.forEach(c => { const r = hv(c), su = cSuit(c), len = h.filter(q => cSuit(q) === su).length; if (r === 12) est += 1; else if (r === 11 && len >= 2) est += 0.7; else if (su === 'S' && r >= 9) est += 0.6; }); est += Math.max(0, h.filter(c => cSuit(c) === 'S').length - 3) * 0.8; let b = Math.max(1, Math.round(est)); if (noisy(level)) b = Math.max(0, b + R(3) - 1); return { b }; }
    if (noisy(level)) return ms[R(ms.length)]; const cs = ms.map(m => m.c), tm = s.t % 2;
    if (!s.trick.length) { const aces = cs.filter(c => hv(c) === 12 && cSuit(c) !== 'S'); if (aces.length) return { c: aces[0] }; return { c: cs.sort((a, b) => hv(a) - hv(b))[0] }; }
    const curW = trickWinner(s.trick, c => cSuit(c) === 'S' ? 'T' : cSuit(c) === cSuit(s.trick[0].c) ? 'L' : 'x', spRank), partnerWin = curW % 2 === tm;
    const beats = cs.filter(c => trickWinner(s.trick.concat({ p: s.t, c }), q => cSuit(q) === 'S' ? 'T' : cSuit(q) === cSuit(s.trick[0].c) ? 'L' : 'x', spRank) === s.t);
    if (!partnerWin && beats.length) return { c: beats.sort((a, b) => (cSuit(a) === 'S') - (cSuit(b) === 'S') || hv(a) - hv(b))[0] }; return { c: cs.sort((a, b) => (cSuit(a) === 'S') - (cSuit(b) === 'S') || hv(a) - hv(b))[0] }; },
  view(s, x) { const ms = x.can ? TB.spades.moves(s) : [], legal = new Set(ms.filter(m => m.c).map(m => m.c)); x.turnSeat = s.t; x.ctl = x.me;
    x.seatInfo = i => `bid ${s.bids[i] === null ? '–' : s.bids[i] === 0 ? 'nil' : s.bids[i]} · won ${s.tricks[i]}`;
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>South/North ${s.team[0]} (bags ${s.bags[0]})</span><span>West/East ${s.team[1]} (bags ${s.bags[1]})</span></div>${trickTable(s, x, legal)}
      ${s.phase === 'bid' && x.can ? `<div class="row-btns"><span>Your bid:</span>${[...Array(14).keys()].map(b => `<button class="btn sm" data-i="b${b}">${b === 0 ? 'Nil' : b}</button>`).join('')}</div>` : ''}<p class="muted small center">${esc(s.log)}${s.broken ? ' · Spades broken' : ''}</p></div>`;
    x.on(d => x.act(d[0] === 'b' ? { b: +d.slice(1) } : { c: d.slice(1) })); }
};

// ---------- Euchre ----------
const EU_R = ['9', '10', 'J', 'Q', 'K', 'A'], sameColor = { S: 'C', C: 'S', H: 'D', D: 'H' };
const euSuit = (c, tr) => cRank(c) === 'J' && cSuit(c) === sameColor[tr] ? tr : cSuit(c);
const euRank = (c, tr) => cRank(c) === 'J' && cSuit(c) === tr ? 100 : cRank(c) === 'J' && cSuit(c) === sameColor[tr] ? 99 : EU_R.indexOf(cRank(c));
function euDeal(s) { const d = shuf(SUITS.flatMap(su => EU_R.map(r => r + su))); const hands = [0, 1, 2, 3].map(() => sortHand(d.splice(0, 5))); return { ...s, hands, up: d[0], phase: 'order1', trump: null, maker: -1, t: nextSeat(s.dealer, 4), passes: 0, trick: [], tricks: [0, 0, 0, 0], played: 0 }; }
TB.euchre = {
  seats: ['South', 'West', 'North', 'East'], init: () => euDeal({ team: [0, 0], dealer: 3, log: '' }), turn: s => s.t,
  moves(s) { if (TB.euchre.result(s)) return []; const h = s.hands[s.t];
    if (s.phase === 'order1') return ['pass', 'order']; if (s.phase === 'discard') return h.map(c => ({ d: c }));
    if (s.phase === 'order2') { const opts = SUITS.filter(su => su !== cSuit(s.up)).map(su => ({ name: su })); return s.t === s.dealer ? opts : ['pass', ...opts]; }
    if (!s.trick.length) return h.map(c => ({ c })); const led = euSuit(s.trick[0].c, s.trump), f = h.filter(c => euSuit(c, s.trump) === led); return (f.length ? f : h).map(c => ({ c })); },
  play(s, m) { const n = cl(s), t = s.t;
    if (s.phase === 'order1') { if (m === 'order') { n.trump = cSuit(s.up); n.maker = t; n.hands[s.dealer] = sortHand(n.hands[s.dealer].concat(s.up)); n.phase = 'discard'; n.t = s.dealer; n.log = `${['South', 'West', 'North', 'East'][t]} ordered up ${SUITG[n.trump]}`; } else { n.passes++; n.t = nextSeat(t, 4); if (n.passes === 4) { n.phase = 'order2'; n.passes = 0; n.t = nextSeat(s.dealer, 4); } } return n; }
    if (s.phase === 'discard') { n.hands[t] = n.hands[t].filter(c => c !== m.d); n.phase = 'play'; n.t = nextSeat(s.dealer, 4); return n; }
    if (s.phase === 'order2') { if (m === 'pass') { n.t = nextSeat(t, 4); return n; } n.trump = m.name; n.maker = t; n.phase = 'play'; n.t = nextSeat(s.dealer, 4); n.log = `${['South', 'West', 'North', 'East'][t]} named ${SUITG[m.name]}`; return n; }
    n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); if (n.trick.length < 4) { n.t = nextSeat(t, 4); return n; }
    const tr = n.trump, w = trickWinner(n.trick, c => euSuit(c, tr) === tr ? 'T' : euSuit(c, tr) === euSuit(n.trick[0].c, tr) ? 'L' : 'x', c => euRank(c, tr)); n.tricks[w]++; n.lastTrick = n.trick; n.trick = []; n.t = w; n.played++;
    if (n.played === 5) { const mt = n.maker % 2, got = n.tricks[mt] + n.tricks[mt + 2]; if (got >= 3) { const p = got === 5 ? 2 : 1; n.team[mt] += p; n.log = `Makers took ${got}: +${p}`; } else { n.team[1 - mt] += 2; n.log = 'Euchred! Defenders +2'; }
      if (Math.max(...n.team) < 10) return { ...euDeal({ ...n, dealer: nextSeat(n.dealer, 4) }), log: n.log }; }
    return n; },
  result: s => Math.max(...s.team) >= 10 ? { winner: s.team[0] > s.team[1] ? 0 : 1, team: true, score: s.team } : null,
  ai(s, level, ms) { const h = s.hands[s.t]; const strength = tr => h.concat(s.phase === 'order1' && s.t === s.dealer ? [s.up] : []).filter(c => euSuit(c, tr) === tr).reduce((a, c) => a + 1 + euRank(c, tr) / 50, 0);
    if (s.phase === 'order1') return strength(cSuit(s.up)) >= (level >= 6 ? 3 : 2.5 + Math.random()) ? 'order' : 'pass';
    if (s.phase === 'discard') { const tr = s.trump; return { d: h.filter(c => euSuit(c, tr) !== tr).sort((a, b) => euRank(a, tr) - euRank(b, tr))[0] || h[0] }; }
    if (s.phase === 'order2') { const opts = ms.filter(m => m.name); const best = opts.sort((a, b) => strength(b.name) - strength(a.name))[0]; return ms.includes('pass') && strength(best.name) < 2.6 ? 'pass' : best; }
    if (noisy(level)) return ms[R(ms.length)]; const tr = s.trump, cs = ms.map(m => m.c), rk = c => euRank(c, tr) + (euSuit(c, tr) === tr ? 200 : 0);
    if (!s.trick.length) return { c: cs.sort((a, b) => rk(b) - rk(a))[0] };
    const tw = (tk) => trickWinner(tk, c => euSuit(c, tr) === tr ? 'T' : euSuit(c, tr) === euSuit(tk[0].c, tr) ? 'L' : 'x', c => euRank(c, tr));
    if (tw(s.trick) % 2 === s.t % 2) return { c: cs.sort((a, b) => rk(a) - rk(b))[0] }; const beats = cs.filter(c => tw(s.trick.concat({ p: s.t, c })) === s.t); return { c: (beats.length ? beats : cs).sort((a, b) => rk(a) - rk(b))[0] }; },
  view(s, x) { const ms = x.can ? TB.euchre.moves(s) : [], legal = new Set(ms.filter(m => m.c || m.d).map(m => m.c || m.d)); x.turnSeat = s.t; x.ctl = x.me; x.seatInfo = i => `tricks ${s.tricks[i]}${s.dealer === i ? ' · dealer' : ''}${s.maker === i ? ' · maker' : ''}`;
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>South/North ${s.team[0]}</span><span>${s.trump ? 'Trump ' + `<b class="${'HD'.includes(s.trump) ? 'redt' : ''}">${SUITG[s.trump]}</b>` : 'Up card ' + cardHTML(s.up, 'disabled', 'tiny')}</span><span>West/East ${s.team[1]}</span></div>${trickTable(s, x, legal)}
      ${x.can && s.phase === 'order1' ? `<div class="row-btns"><button class="btn hot" data-i="order">Order it up (${SUITG[cSuit(s.up)]} trump)</button><button class="btn" data-i="pass">Pass</button></div>` : ''}
      ${x.can && s.phase === 'order2' ? `<div class="row-btns">${ms.filter(m => m.name).map(m => `<button class="btn" data-i="n${m.name}">Name ${SUITG[m.name]}</button>`).join('')}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : '<span class="muted small">Dealer must name a suit.</span>'}</div>` : ''}
      ${x.can && s.phase === 'discard' ? '<p class="center"><b>Discard one card.</b></p>' : ''}<p class="muted small center">${esc(s.log)}</p></div>`;
    x.on(d => { if (d === 'order' || d === 'pass') return x.act(d); if (d[0] === 'n') return x.act({ name: d.slice(1) }); const c = d.slice(1); x.act(s.phase === 'discard' ? { d: c } : { c }); }); }
};

// ---------- Contract Bridge (4 deals, simplified duplicate scoring, non-vulnerable) ----------
const STR = ['C', 'D', 'H', 'S', 'N'], STRG = { C: '♣', D: '♦', H: '♥', S: '♠', N: 'NT' };
const hcp = h => sum(h.map(c => ({ A: 4, K: 3, Q: 2, J: 1 })[cRank(c)] || 0));
const bidLabel = b => b === 'P' ? 'Pass' : b === 'X' ? 'Double' : b === 'XX' ? 'Redouble' : b[0] + STRG[b[1]];
const bidVal = b => (+b[0] - 1) * 5 + STR.indexOf(b[1]);
function brDeal(s) { const { hands } = deal(4, 13); return { ...s, hands, phase: 'auction', calls: [], t: s.dealer, contract: null, trick: [], tricks: [0, 0, 0, 0], played: 0, dummyUp: false, dummy: -1, declarer: -1 }; }
function brContract(calls, dealer) { let last = null, who = -1, dbl = 0; calls.forEach((c, k) => { const p = (dealer + k) % 4; if (c !== 'P' && c !== 'X' && c !== 'XX') { last = c; who = p; dbl = 0; } else if (c === 'X') dbl = 1; else if (c === 'XX') dbl = 2; }); if (!last) return null;
  const side = who % 2; let decl = -1; calls.forEach((c, k) => { const p = (dealer + k) % 4; if (decl < 0 && p % 2 === side && c.length === 2 && c[1] === last[1]) decl = p; }); return { bid: last, level: +last[0], strain: last[1], dbl, declarer: decl, by: who }; }
function brScore(ct, took) { const need = ct.level + 6, mult = [1, 2, 4][ct.dbl]; if (took >= need) { const per = 'CD'.includes(ct.strain) ? 20 : 30; let tp = ct.level * per + (ct.strain === 'N' ? 10 : 0); tp *= mult; let sc = tp + (tp >= 100 ? 300 : 50) + (ct.level === 6 ? 500 : ct.level === 7 ? 1000 : 0) + (ct.dbl ? 50 * ct.dbl : 0); const over = took - need; sc += over * (ct.dbl ? 100 * ct.dbl : per); return sc; }
  const down = need - took; if (!ct.dbl) return -50 * down; let p = 0; for (let k = 1; k <= down; k++) p += k === 1 ? 100 : k <= 3 ? 200 : 300; return -p * ct.dbl; }
TB.bridge = {
  seats: ['South', 'West', 'North', 'East'], init: () => brDeal({ team: [0, 0], dealer: 0, deals: 0, log: '' }),
  turn: s => s.phase === 'play' && s.t === s.dummy ? s.declarer : s.t,
  legalCalls(s) { const out = ['P']; const last = [...s.calls].reverse().find(c => c.length === 2); for (let l = 1; l <= 7; l++) for (const st of STR) { const b = l + st; if (!last || bidVal(b) > bidVal(last)) out.push(b); }
    const lastNonPass = [...s.calls].map((c, k) => ({ c, p: (s.dealer + k) % 4 })).reverse().find(o => o.c !== 'P'); if (lastNonPass && lastNonPass.c.length === 2 && lastNonPass.p % 2 !== s.t % 2) out.push('X'); if (lastNonPass && lastNonPass.c === 'X' && lastNonPass.p % 2 !== s.t % 2) out.push('XX'); return out; },
  moves(s) { if (TB.bridge.result(s)) return []; if (s.phase === 'auction') return TB.bridge.legalCalls(s).map(c => ({ call: c })); const h = s.hands[s.t];
    if (!s.trick.length) return h.map(c => ({ c })); const f = h.filter(c => cSuit(c) === cSuit(s.trick[0].c)); return (f.length ? f : h).map(c => ({ c })); },
  play(s, m) { const n = cl(s), t = s.t;
    if (m.call) { n.calls.push(m.call); n.t = nextSeat(t, 4); const c = n.calls, k = c.length; if (k >= 4 && c.slice(-3).every(x => x === 'P') && c.some(x => x !== 'P')) { const ct = brContract(c, s.dealer); n.contract = ct; n.declarer = ct.declarer; n.dummy = (ct.declarer + 2) % 4; n.phase = 'play'; n.t = nextSeat(ct.declarer, 4); n.log = `Contract ${bidLabel(ct.bid)}${ct.dbl ? ' ' + ['', 'doubled', 'redoubled'][ct.dbl] : ''} by ${TB.bridge.seats[ct.declarer]}`; }
      else if (k === 4 && c.every(x => x === 'P')) { n.deals++; n.log = 'Passed out. Next deal.'; if (n.deals < 4) return brDeal({ ...n, dealer: nextSeat(s.dealer, 4) }); n.phase = 'over'; } return n; }
    n.hands[t] = n.hands[t].filter(c => c !== m.c); n.trick.push({ p: t, c: m.c }); n.dummyUp = true; if (n.trick.length < 4) { n.t = nextSeat(t, 4); return n; }
    const tr = n.contract.strain, w = trickWinner(n.trick, c => cSuit(c) === tr ? 'T' : cSuit(c) === cSuit(n.trick[0].c) ? 'L' : 'x', hv); n.tricks[w]++; n.lastTrick = n.trick; n.trick = []; n.t = w; n.played++;
    if (n.played === 13) { const side = n.declarer % 2, took = n.tricks[side] + n.tricks[side + 2], sc = brScore(n.contract, took); if (sc >= 0) n.team[side] += sc; else n.team[1 - side] -= sc; n.deals++; n.log = `${bidLabel(n.contract.bid)} ${took >= n.contract.level + 6 ? 'made' : 'went down'} with ${took} tricks: ${sc > 0 ? '+' : ''}${sc}`;
      if (n.deals < 4) return { ...brDeal({ ...n, dealer: nextSeat(n.dealer, 4) }), log: n.log }; n.phase = 'over'; }
    return n; },
  result: s => s.phase === 'over' ? { winner: s.team[0] === s.team[1] ? -1 : s.team[0] > s.team[1] ? 0 : 1, team: true, score: s.team } : null,
  ai(s, level, ms) { const t = s.t, h = s.hands[t];
    if (s.phase === 'auction') { const pts = hcp(h), len = su => h.filter(c => cSuit(c) === su).length, legal = new Set(ms.map(m => m.call)), bid = b => legal.has(b) ? { call: b } : { call: 'P' };
      const mine = s.calls.map((c, k) => ({ c, p: (s.dealer + k) % 4 })), partner = mine.filter(o => o.p === (t + 2) % 4 && o.c.length === 2).pop(), myBids = mine.filter(o => o.p === t && o.c.length === 2), opp = mine.filter(o => o.p % 2 !== t % 2 && o.c.length === 2).pop();
      const longest = ['S', 'H', 'D', 'C'].sort((a, b) => len(b) - len(a))[0], bal = ['S', 'H', 'D', 'C'].every(su => len(su) >= 2) && ['S', 'H', 'D', 'C'].filter(su => len(su) === 2).length <= 1;
      if (!partner && !myBids.length) { if (pts >= 15 && pts <= 17 && bal) return bid('1N'); if (pts >= 12) { const maj = ['S', 'H'].find(su => len(su) >= 5); return bid('1' + (maj || (len('D') > len('C') ? 'D' : 'C'))); } if (opp && pts >= 9 && len(longest) >= 5) { for (let l = 1; l <= 3; l++) if (legal.has(l + longest)) return bid(l + longest); } return bid('P'); }
      if (partner && myBids.length < 2) { const ps = partner.c[1], est = pts + (partner.c === '1N' ? 16 : 13); const fit = ps !== 'N' && len(ps) >= 3;
        const gameLvl = st => st === 'N' ? 3 : 'HS'.includes(st) ? 4 : 5; if (est >= 33) return bid((fit ? 6 : 6) + (fit ? ps : 'N'));
        if (est >= 25) { const st = fit ? ps : (bal || ps === 'N' ? 'N' : (len(longest) >= 6 ? longest : 'N')); return bid(gameLvl(st) + st); }
        if (est >= 22 && !myBids.length) { if (fit) return bid('3' + ps); if (legal.has('2N')) return bid('2N'); } if (pts >= 6 && !myBids.length) { if (fit) return bid('2' + ps); if (legal.has('1N')) return bid('1N'); } }
      return bid('P'); }
    if (noisy(level)) return ms[R(ms.length)]; const cs = ms.map(m => m.c), tr = s.contract.strain, tw = tk => trickWinner(tk, c => cSuit(c) === tr ? 'T' : cSuit(c) === cSuit(tk[0].c) ? 'L' : 'x', hv);
    if (!s.trick.length) { const top = cs.filter(c => hv(c) === 12 && cSuit(c) !== tr); return { c: (top.length ? top : cs.sort((a, b) => hv(a) - hv(b)))[0] }; }
    if (tw(s.trick) % 2 === t % 2) return { c: cs.sort((a, b) => (cSuit(a) === tr) - (cSuit(b) === tr) || hv(a) - hv(b))[0] }; const beats = cs.filter(c => tw(s.trick.concat({ p: t, c })) === t); return { c: (beats.length ? beats : cs).sort((a, b) => (cSuit(a) === tr) - (cSuit(b) === tr) || hv(a) - hv(b))[0] }; },
  view(s, x) { const ms = x.can ? TB.bridge.moves(s) : [], legal = new Set(ms.filter(m => m.c).map(m => m.c)); x.turnSeat = s.t; x.ctl = x.can ? (s.t === s.dummy ? s.dummy : x.me) : -1; x.seatInfo = i => `tricks ${s.tricks[i]}${s.dealer === i ? ' · dealer' : ''}${s.declarer === i ? ' · declarer' : ''}`;
    if (x.can && s.t === s.dummy) { /* declarer plays dummy's cards */ }
    const auction = `<div class="auction"><div class="arowh">${['South', 'West', 'North', 'East'].map(n => `<b>${n}</b>`).join('')}</div><div class="agrid">${[...Array(s.dealer)].map(() => '<span></span>').join('')}${s.calls.map(c => `<span>${bidLabel(c)}</span>`).join('')}</div></div>`;
    const callBtns = x.can && s.phase === 'auction' ? `<div class="bidbox">${[1, 2, 3, 4, 5, 6, 7].map(l => `<div>${STR.map(st => { const b = l + st; return ms.some(m => m.call === b) ? `<button class="btn sm" data-i="k${b}">${l}${STRG[st]}</button>` : ''; }).join('')}</div>`).join('')}<div><button class="btn sm" data-i="kP">Pass</button>${ms.some(m => m.call === 'X') ? '<button class="btn sm" data-i="kX">Double</button>' : ''}${ms.some(m => m.call === 'XX') ? '<button class="btn sm" data-i="kXX">Redouble</button>' : ''}</div></div>` : '';
    x.el.innerHTML = `<div class="ctable trickg"><div class="score2"><span>N/S ${s.team[0]}</span><span>Deal ${Math.min(s.deals + 1, 4)} of 4 · your HCP ${x.me >= 0 ? hcp(s.hands[x.me]) : '–'}</span><span>E/W ${s.team[1]}</span></div>${s.phase === 'auction' ? auction + callBtns : `<p class="center">${esc(s.log)}</p>`}${trickTable(s, x, legal)}${s.phase !== 'auction' ? '' : `<p class="muted small center">${esc(s.log)}</p>`}</div>`;
    x.on(d => x.act(d[0] === 'k' ? { call: d.slice(1) } : { c: d.slice(1) })); }
};

// ---------- Texas Hold'em ----------
function eval5(cs) { const r = cs.map(hv).sort((a, b) => b - a), su = cs.map(cSuit), fl = su.every(x => x === su[0]), cnt = {}; r.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const groups = Object.entries(cnt).map(([v, n]) => [+v, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]); const uniq = [...new Set(r)]; let st = -1;
  if (uniq.length === 5) { if (uniq[0] - uniq[4] === 4) st = uniq[0]; else if (uniq.join() === '12,3,2,1,0') st = 3; }
  const kick = groups.map(g => g[0]); const code = (cat, ks) => cat * 1e10 + ks.reduce((a, k, i) => a + k * 13 ** (4 - i), 0);
  if (st >= 0 && fl) return code(8, [st]); if (groups[0][1] === 4) return code(7, kick); if (groups[0][1] === 3 && groups[1][1] === 2) return code(6, kick); if (fl) return code(5, r); if (st >= 0) return code(4, [st]); if (groups[0][1] === 3) return code(3, kick); if (groups[0][1] === 2 && groups[1][1] === 2) return code(2, kick); if (groups[0][1] === 2) return code(1, kick); return code(0, r); }
function eval7(cs) { let best = 0; for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) { const five = cs.filter((_, i) => i !== a && i !== b); const v = eval5(five); if (v > best) best = v; } return best; }
const HNAME = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
function heNew(s) { const n = cl(s); n.out = n.st.map(v => v <= 0); const alive = n.st.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0); if (alive.length < 2) return n;
  const nx = i => { let j = i; do j = (j + 1) % n.n; while (n.out[j]); return j; }; n.dealer = nx(n.dealer); n.hand++; const lvl = Math.floor((n.hand - 1) / 8); n.bb = Math.round(20 * 1.5 ** lvl / 10) * 10; const sbAmt = n.bb / 2;
  n.deck = deck52(); n.hole = n.st.map((_, i) => n.out[i] ? [] : [n.deck.pop(), n.deck.pop()]); n.board = []; n.put = Array(n.n).fill(0); n.bet = Array(n.n).fill(0); n.fold = n.out.slice(); n.allin = Array(n.n).fill(false); n.acted = Array(n.n).fill(false); n.street = 0;
  const sb = alive.length === 2 ? n.dealer : nx(n.dealer), bb = nx(sb); const post = (i, a) => { const x = Math.min(a, n.st[i]); n.st[i] -= x; n.bet[i] += x; n.put[i] += x; if (!n.st[i]) n.allin[i] = true; }; post(sb, sbAmt); post(bb, n.bb); n.cur = n.bb; n.minR = n.bb;
  n.t = nx(bb); let guard = 0; while ((n.fold[n.t] || n.allin[n.t]) && guard++ < 12) n.t = nx(n.t); n.log = `Hand ${n.hand}: blinds ${sbAmt}/${n.bb}`; return n; }
function heShowdown(n) { const live = [...Array(n.n).keys()].filter(i => !n.fold[i]); while (n.board.length < 5) n.board.push(n.deck.pop()); const val = Object.fromEntries(live.map(i => [i, eval7(n.hole[i].concat(n.board))]));
  const levels = [...new Set(n.put.filter(v => v > 0))].sort((a, b) => a - b); let prev = 0; const won = Array(n.n).fill(0);
  for (const L of levels) { const pot = sum(n.put.map(v => Math.max(0, Math.min(v, L) - prev))); const elig = live.filter(i => n.put[i] >= L); if (pot && elig.length) { const mx = Math.max(...elig.map(i => val[i])), ws = elig.filter(i => val[i] === mx); ws.forEach((w, k) => won[w] += Math.floor(pot / ws.length) + (k === 0 ? pot % ws.length : 0)); } else if (pot) { const back = live.sort((a, b) => n.put[b] - n.put[a])[0]; won[back] += pot; } prev = L; }
  won.forEach((v, i) => n.st[i] += v); n.show = { hands: live.map(i => ({ i, cards: n.hole[i], name: HNAME[Math.floor(val[i] / 1e10)], won: won[i] })), board: n.board.slice() }; n.log = live.filter(i => won[i]).map(i => `Seat ${i + 1} wins ${won[i]} with ${HNAME[Math.floor(val[i] / 1e10)]}`).join('; '); return heNew(n); }
TB.holdem = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => heNew({ n, st: Array(n).fill(1000), dealer: n - 1, hand: 0, out: Array(n).fill(false) }), turn: s => s.t,
  moves(s) { if (TB.holdem.result(s)) return []; const t = s.t, toCall = s.cur - s.bet[t], out = []; if (toCall > 0) out.push('fold', 'call'); else out.push('check'); if (s.st[t] > toCall) out.push({ r: 'min' }, { r: 'pot' }, { r: 'all' }); else if (toCall > 0 && s.st[t] <= toCall) { } return out; },
  play(s, m) { let n = cl(s); const t = s.t, nx = i => { let j = i; do j = (j + 1) % n.n; while (n.out[j]); return j; }; const pot = sum(n.put);
    const put = a => { const x = Math.min(a, n.st[t]); n.st[t] -= x; n.bet[t] += x; n.put[t] += x; if (!n.st[t]) n.allin[t] = true; };
    if (m === 'fold') { n.fold[t] = true; n.log = `Seat ${t + 1} folds`; } else if (m === 'check') n.log = `Seat ${t + 1} checks`; else if (m === 'call') { put(n.cur - n.bet[t]); n.log = `Seat ${t + 1} calls`; }
    else { const toCall = n.cur - n.bet[t]; let target = m.r === 'min' ? n.cur + n.minR : m.r === 'pot' ? n.cur + pot + toCall : n.bet[t] + n.st[t]; const before = n.cur; put(target - n.bet[t]); if (n.bet[t] > before) { n.minR = Math.max(n.minR, n.bet[t] - before); n.cur = n.bet[t]; n.acted = n.acted.map(() => false); } n.log = `Seat ${t + 1} ${n.allin[t] ? 'is all in' : 'raises to ' + n.bet[t]}`; }
    n.acted[t] = true; n.show = null; const live = [...Array(n.n).keys()].filter(i => !n.fold[i]);
    if (live.length === 1) { n.st[live[0]] += sum(n.put); n.log = `Seat ${live[0] + 1} wins ${sum(n.put)} uncontested`; return heNew(n); }
    const actors = live.filter(i => !n.allin[i]); const done = actors.every(i => n.acted[i] && n.bet[i] === n.cur);
    if (!done) { let j = nx(t); while (n.fold[j] || n.allin[j]) j = nx(j); n.t = j; return n; }
    if (actors.length <= 1 || n.street === 3) return heShowdown(n);
    n.street++; if (n.street === 1) n.board.push(n.deck.pop(), n.deck.pop(), n.deck.pop()); else n.board.push(n.deck.pop()); n.bet = n.bet.map(() => 0); n.cur = 0; n.minR = n.bb; n.acted = n.acted.map(() => false);
    let j = nx(n.dealer); while (n.fold[j] || n.allin[j]) j = nx(j); n.t = j; return n; },
  result(s) { const alive = s.st.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0); if (alive.length === 1) return { winner: alive[0], score: s.st }; if (s.hand > 40 && s.street === 0 && sum(s.put) <= s.bb * 1.5) { const mx = Math.max(...s.st); return { winner: s.st.indexOf(mx), score: s.st }; } return null; },
  ai(s, level, ms) { const t = s.t, opp = [...Array(s.n).keys()].filter(i => i !== t && !s.fold[i]).length, known = s.hole[t].concat(s.board); const deckLeft = deck52().filter(c => !known.includes(c)); let wins = 0; const sims = 60 + level * 15;
    for (let k = 0; k < sims; k++) { const d = shuf(deckLeft.slice()), board = s.board.concat(d.splice(0, 5 - s.board.length)), me = eval7(s.hole[t].concat(board)); let best = true; for (let o = 0; o < opp; o++) if (eval7([d.pop(), d.pop()].concat(board)) > me) { best = false; break; } if (best) wins++; }
    const eq = wins / sims, toCall = s.cur - s.bet[t], pot = sum(s.put), odds = toCall / (pot + toCall || 1), bold = noisy(level) ? Math.random() * 0.3 : 0, has = x => ms.some(m => JSON.stringify(m) === JSON.stringify(x));
    if (eq > 0.75 - bold && has({ r: 'pot' })) return Math.random() < 0.3 && has({ r: 'all' }) && eq > 0.85 ? { r: 'all' } : { r: 'pot' }; if (eq > 0.55 - bold && has({ r: 'min' }) && Math.random() < 0.5) return { r: 'min' };
    if (toCall === 0) return 'check'; if (eq > odds + 0.05 - bold) return 'call'; return 'fold'; },
  view(s, x) { const ms = x.can ? TB.holdem.moves(s) : [], me = x.me, pot = sum(s.put), sh = s.show;
    const seat = i => `<div class="pseat ${s.t === i ? 'turn' : ''} ${s.fold[i] ? 'folded' : ''}"><span>${esc(x.names[i] || 'Seat ' + (i + 1))}${s.dealer === i ? ' <b class="dealer">D</b>' : ''}</span><b>${s.st[i]}</b><div class="hand">${s.out[i] ? '<small>out</small>' : (i === me || (sh && sh.hands.some(h => h.i === i)) ? (sh && i !== me ? sh.hands.find(h => h.i === i)?.cards || s.hole[i] : s.hole[i]).map(c => cardHTML(c, 'disabled', 'tiny')).join('') : s.hole[i].map(() => cardHTML(null, 'disabled', 'tiny')).join(''))}</div><small>${s.bet[i] ? 'bet ' + s.bet[i] : ''}${s.allin[i] ? ' all in' : ''}${s.fold[i] && !s.out[i] ? ' folded' : ''}</small></div>`;
    const toCall = s.cur - (s.bet[me] || 0);
    x.el.innerHTML = `<div class="ctable poker"><div class="pseats">${s.st.map((_, i) => seat(i)).join('')}</div><div class="pile">${s.board.map(c => cardHTML(c, 'disabled')).join('') || '<span class="muted">No community cards yet</span>'}</div><p class="center">Pot <b>${pot}</b> · blinds ${s.bb / 2}/${s.bb}</p>
      ${sh ? `<div class="reveal"><p><b>Showdown</b> on ${sh.board.map(c => cRank(c) + SUITG[cSuit(c)]).join(' ')}</p>${sh.hands.map(h => `<p>${esc(x.names[h.i] || '')}: ${h.cards.map(c => cRank(c) + SUITG[cSuit(c)]).join(' ')} · ${h.name}${h.won ? ` · <b>wins ${h.won}</b>` : ''}</p>`).join('')}</div>` : ''}<p class="muted small center">${esc(s.log || '')}</p>
      ${x.can ? `<div class="row-btns">${ms.includes('fold') ? '<button class="btn" data-i="fold">Fold</button>' : ''}${ms.includes('check') ? '<button class="btn" data-i="check">Check</button>' : ''}${ms.includes('call') ? `<button class="btn hot" data-i="call">Call ${Math.min(toCall, s.st[me])}</button>` : ''}${ms.some(m => m.r) ? `<button class="btn" data-i="rmin">Raise to ${s.cur + s.minR}</button><button class="btn" data-i="rpot">Pot raise</button><button class="btn" data-i="rall">All in (${s.st[me]})</button>` : ''}</div>` : ''}</div>`;
    x.on(d => x.act(d[0] === 'r' && d.length > 1 && d !== 'raise' ? { r: d.slice(1) } : d)); }
};

// ---------- Gin Rummy ----------
const rv = c => cVal(c) + 1, dw = c => Math.min(10, rv(c));
function melds(hand) { const ms = []; const byR = {}; hand.forEach(c => (byR[cRank(c)] = byR[cRank(c)] || []).push(c)); Object.values(byR).forEach(g => { if (g.length >= 3) { ms.push(g.slice(0, 3)); if (g.length === 4) { ms.push(g); for (let k = 0; k < 4; k++) ms.push(g.filter((_, i) => i !== k)); } } });
  for (const su of SUITS) { const cs = hand.filter(c => cSuit(c) === su).sort((a, b) => rv(a) - rv(b)); for (let i = 0; i < cs.length; i++) { const run = [cs[i]]; for (let j = i + 1; j < cs.length && rv(cs[j]) === rv(run[run.length - 1]) + 1; j++) { run.push(cs[j]); if (run.length >= 3) ms.push(run.slice()); } } } return ms; }
function bestMelds(hand) { const ms = melds(hand); let best = { dead: sum(hand.map(dw)), sets: [] };
  const rec = (i, used, sets) => { const dead = sum(hand.filter(c => !used.has(c)).map(dw)); if (dead < best.dead) best = { dead, sets: sets.slice() }; for (let k = i; k < ms.length; k++) { if (ms[k].some(c => used.has(c))) continue; ms[k].forEach(c => used.add(c)); sets.push(ms[k]); rec(k + 1, used, sets); sets.pop(); ms[k].forEach(c => used.delete(c)); } };
  rec(0, new Set(), []); return { ...best, deadCards: hand.filter(c => !best.sets.flat().includes(c)) }; }
function grDeal(s) { const d = deck52(); return { ...s, hands: [sortHand(d.splice(0, 10)), sortHand(d.splice(0, 10))], stock: d.slice(1), disc: [d[0]], phase: 'draw', t: s.dealer ^ 1 }; }
TB.ginrummy = {
  seats: ['South', 'North'], init: () => grDeal({ sc: [0, 0], dealer: 1, log: '', reveal: null }), turn: s => s.t,
  moves(s) { if (TB.ginrummy.result(s)) return []; const h = s.hands[s.t]; if (s.phase === 'draw') return ['stock', 'disc'];
    const out = []; h.forEach((c, i) => { out.push({ d: c }); const rest = h.filter((_, j) => j !== i); if (bestMelds(rest).dead <= 10) out.push({ k: c }); }); return out; },
  play(s, m) { const n = cl(s), t = s.t;
    if (m === 'stock') { n.hands[t] = sortHand(n.hands[t].concat(n.stock.pop())); n.phase = 'discard'; n.drewDisc = null; return n; }
    if (m === 'disc') { const c = n.disc.pop(); n.hands[t] = sortHand(n.hands[t].concat(c)); n.phase = 'discard'; n.drewDisc = c; return n; }
    const c = m.d || m.k; n.hands[t] = n.hands[t].filter(x => x !== c); n.disc.push(c); n.reveal = null;
    if (m.k) { const me = bestMelds(n.hands[t]), op = bestMelds(n.hands[1 - t]); let oppDead = op.deadCards.slice(); const gin = me.dead === 0;
      if (!gin) { let changed = true; while (changed) { changed = false; for (const c2 of oppDead) { for (const set of me.sets) { const isSet = set.every(q => cRank(q) === cRank(set[0])); if (isSet && cRank(c2) === cRank(set[0]) && set.length < 4) { set.push(c2); oppDead = oppDead.filter(q => q !== c2); changed = true; break; } if (!isSet && cSuit(c2) === cSuit(set[0])) { const rs = set.map(rv); if (rv(c2) === Math.min(...rs) - 1 || rv(c2) === Math.max(...rs) + 1) { set.push(c2); oppDead = oppDead.filter(q => q !== c2); changed = true; break; } } } if (changed) break; } } }
      const od = sum(oppDead.map(dw)); let pts, who; if (gin) { who = t; pts = 25 + od; } else if (od <= me.dead) { who = 1 - t; pts = 25 + me.dead - od; } else { who = t; pts = od - me.dead; }
      n.sc[who] += pts; n.reveal = { hands: [cl(n.hands[0]), cl(n.hands[1])], knocker: t }; n.log = `${['South', 'North'][t]} ${gin ? 'went gin' : 'knocked'}; ${['South', 'North'][who]} scores ${pts}${!gin && who !== t ? ' (undercut)' : ''}`;
      if (Math.max(...n.sc) < 100) return { ...grDeal({ ...n, dealer: n.dealer ^ 1 }), log: n.log, reveal: n.reveal }; n.phase = 'over'; return n; }
    if (n.stock.length <= 2) { n.log = 'Stock ran out: hand is a draw.'; return grDeal({ ...n, dealer: n.dealer ^ 1 }); }
    n.phase = 'draw'; n.t = 1 - t; return n; },
  result: s => s.phase === 'over' ? { winner: s.sc[0] > s.sc[1] ? 0 : 1, score: s.sc } : null,
  ai(s, level, ms) { const h = s.hands[s.t], top = s.disc[s.disc.length - 1];
    if (s.phase === 'draw') { if (noisy(level)) return 'stock'; const cur = bestMelds(h).dead, withTop = Math.min(...h.map((_, i) => bestMelds(h.concat(top).filter((_, j) => j !== i)).dead)); return withTop < cur - 2 ? 'disc' : 'stock'; }
    const opts = h.map(c => ({ c, dead: bestMelds(h.filter(x => x !== c)).dead })).filter(o => o.c !== s.drewDisc || h.length === 1).sort((a, b) => a.dead - b.dead || dw(b.c) - dw(a.c)); const best = opts[0] || { c: h[0], dead: 99 };
    if (best.dead === 0 || (best.dead <= (level >= 7 ? 6 : 10) && ms.some(m => m.k === best.c))) return { k: best.c }; return { d: noisy(level) ? h[R(h.length)] : best.c }; },
  view(s, x) { const ms = x.can ? TB.ginrummy.moves(s) : [], me = x.me >= 0 ? x.me : 0, h = s.hands[me], bm = bestMelds(h), inMeld = new Set(bm.sets.flat()); const knock = new Set(ms.filter(m => m.k).map(m => m.k));
    x.el.innerHTML = `<div class="ctable"><div class="score2"><span>${esc(x.names[0] || 'South')} ${s.sc[0]}</span><span>to 100</span><span>${esc(x.names[1] || 'North')} ${s.sc[1]}</span></div><div class="opp"><span>${esc(x.names[1 - me] || '')}</span><div class="fan">${s.hands[1 - me].map(() => '<i class="mini"></i>').join('')}</div></div>
      <div class="pile"><button class="card back" data-i="stock" ${ms.includes('stock') ? '' : 'disabled'} aria-label="Draw from stock"></button><small>${s.stock.length}</small>${s.disc.length ? cardHTML(s.disc[s.disc.length - 1], ms.includes('disc') ? 'data-i="disc"' : 'disabled', ms.includes('disc') ? 'ok' : '') : ''}</div>
      ${s.reveal ? `<div class="reveal"><p>${esc(s.log)}</p>${s.reveal.hands.map((hh, i) => `<p><small>${esc(x.names[i] || '')}</small> ${hh.map(c => cRank(c) + SUITG[cSuit(c)]).join(' ')}</p>`).join('')}</div>` : `<p class="muted small center">${esc(s.log)}</p>`}
      <p class="center">${s.phase === 'draw' && x.can ? 'Draw from the stock or take the discard.' : x.can ? 'Discard a card. Gold cards are in melds.' : ''} Deadwood: <b>${bm.dead}</b></p>
      <div class="hand">${h.map(c => cardHTML(c, x.can && s.phase === 'discard' ? `data-i="d${c}"` : 'disabled', inMeld.has(c) ? 'meld' : '')).join('')}</div>${knock.size ? `<div class="row-btns"><span class="muted small">Knock by discarding:</span>${[...knock].map(c => `<button class="btn sm hot" data-i="k${c}">${cRank(c)}${SUITG[cSuit(c)]}</button>`).join('')}</div>` : ''}</div>`;
    x.on(d => { if (d === 'stock' || d === 'disc') return x.act(d); x.act(d[0] === 'k' ? { k: d.slice(1) } : { d: d.slice(1) }); }); }
};

// ---------- Cribbage ----------
const cbv = c => Math.min(10, cVal(c) + 1), cbr = c => cVal(c) + 1;
function cbShow(hand, starter, crib) { const all = hand.concat(starter); let p = 0; const n = all.length;
  for (let mask = 1; mask < 1 << n; mask++) { let t = 0; for (let i = 0; i < n; i++) if (mask >> i & 1) t += cbv(all[i]); if (t === 15) p += 2; }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (cRank(all[i]) === cRank(all[j])) p += 2;
  const rs = all.map(cbr), cnt = {}; rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1); let runPts = 0; for (let len = 5; len >= 3 && !runPts; len--) for (let st = 1; st + len - 1 <= 13; st++) { let mult = 1, ok = true; for (let k = st; k < st + len; k++) { if (!cnt[k]) { ok = false; break; } mult *= cnt[k]; } if (ok) runPts += len * mult; } p += runPts;
  if (hand.every(c => cSuit(c) === cSuit(hand[0]))) { if (cSuit(starter) === cSuit(hand[0])) p += 5; else if (!crib) p += 4; }
  if (hand.some(c => cRank(c) === 'J' && cSuit(c) === cSuit(starter))) p += 1; return p; }
function cbPeg(seq) { const cs = seq.map(p => p.c), tot = sum(cs.map(cbv)); let p = 0; if (tot === 15 || tot === 31) p += 2;
  let k = 1; while (k < cs.length && cRank(cs[cs.length - 1 - k]) === cRank(cs[cs.length - 1])) k++; p += [0, 0, 2, 6, 12][k];
  for (let len = cs.length; len >= 3; len--) { const last = cs.slice(-len).map(cbr).sort((a, b) => a - b); if (last.every((v, i) => !i || v === last[i - 1] + 1)) { p += len; break; } } return p; }
function cbDeal(s) { const d = deck52(); return { ...s, hands: [sortHand(d.splice(0, 6)), sortHand(d.splice(0, 6))], crib: [], starter: null, deckRest: d, phase: 'discard', seq: [], played: [[], []], go: [false, false], t: s.dealer ^ 1, show: null }; }
TB.cribbage = {
  seats: ['South', 'North'], init: () => cbDeal({ sc: [0, 0], dealer: 1, log: '' }),
  turn: s => s.phase === 'discard' ? (s.hands[s.dealer ^ 1].length > 4 ? s.dealer ^ 1 : s.dealer) : s.t,
  moves(s) { if (TB.cribbage.result(s)) return []; const t = TB.cribbage.turn(s); if (s.phase === 'discard') return s.hands[t].map(c => ({ cr: c }));
    const left = s.hands[t].filter(c => !s.played[t].includes(c)), tot = sum(s.seq.map(p => cbv(p.c))), ok = left.filter(c => tot + cbv(c) <= 31); return ok.length ? ok.map(c => ({ c })) : ['go']; },
  play(s, m) { const n = cl(s), t = TB.cribbage.turn(s), add = (p, v, why) => { if (!v) return; n.sc[p] = Math.min(121, n.sc[p] + v); n.log = `${['South', 'North'][p]} +${v} ${why}`; };
    if (s.phase === 'discard') { n.hands[t] = n.hands[t].filter(c => c !== m.cr); n.crib.push(m.cr); if (n.crib.length === 4) { n.starter = n.deckRest[R(n.deckRest.length)]; n.phase = 'peg'; n.t = s.dealer ^ 1; n.log = 'Starter cut.'; if (cRank(n.starter) === 'J') add(s.dealer, 2, 'for his heels'); } return n; }
    if (m === 'go') { n.go[t] = true; const other = 1 - t, otherLeft = n.hands[other].filter(c => !n.played[other].includes(c)), tot = sum(n.seq.map(p => cbv(p.c)));
      if (n.go[other] || !otherLeft.some(c => tot + cbv(c) <= 31)) { const last = n.seq.length ? n.seq[n.seq.length - 1].p : other; if (tot < 31 && n.seq.length) add(last, 1, 'for the go'); n.seq = []; n.go = [false, false]; n.t = 1 - last; } else n.t = other; }
    else { n.played[t].push(m.c); n.seq.push({ p: t, c: m.c }); add(t, cbPeg(n.seq), 'pegging'); const tot = sum(n.seq.map(p => cbv(p.c))); if (tot === 31) { n.seq = []; n.go = [false, false]; } n.t = n.go[1 - t] ? t : 1 - t; }
    const allDone = [0, 1].every(p => n.played[p].length === 4);
    if (allDone && !TB.cribbage.result(n)) { if (n.seq.length && sum(n.seq.map(p => cbv(p.c))) < 31) add(n.seq[n.seq.length - 1].p, 1, 'for last card'); const nd = s.dealer ^ 1, a = cbShow(n.hands[nd], n.starter), b = cbShow(n.hands[s.dealer], n.starter), c = cbShow(n.crib, n.starter, true);
      n.sc[nd] = Math.min(121, n.sc[nd] + a); if (n.sc[nd] < 121) { n.sc[s.dealer] = Math.min(121, n.sc[s.dealer] + b + c); }
      const show = { hands: cl(n.hands), crib: n.crib.slice(), starter: n.starter, pts: { nd: a, d: b, crib: c } }; n.log = `Show: non-dealer ${a}, dealer ${b}, crib ${c}`; if (TB.cribbage.result(n)) return { ...n, show };
      return { ...cbDeal({ ...n, dealer: s.dealer ^ 1 }), log: n.log, show }; }
    if (n.phase === 'peg' && n.played[n.t].length === 4 && n.played[1 - n.t].length < 4) n.t = 1 - n.t;
    return n; },
  result: s => s.sc[0] >= 121 ? { winner: 0, score: s.sc } : s.sc[1] >= 121 ? { winner: 1, score: s.sc } : null,
  ai(s, level, ms) { const t = TB.cribbage.turn(s);
    if (s.phase === 'discard') { const h = s.hands[t]; if (noisy(level)) return ms[R(ms.length)]; let best = null, bv = -1e9; if (h.length === 6) { for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const keep = h.filter((_, k) => k !== i && k !== j); let v = 0; for (const st of ['5H', 'JS', '2C', 'KD', '8S']) v += cbShow(keep, st); v += (t === s.dealer ? 1 : -1) * (cbv(h[i]) + cbv(h[j]) === 15 || cRank(h[i]) === cRank(h[j]) ? 4 : 0); if (v > bv) { bv = v; best = h[i]; } } return { cr: best }; } return ms[0]; }
    if (ms[0] === 'go') return 'go'; const tot = sum(s.seq.map(p => cbv(p.c))); return pickBest(ms, m => cbPeg(s.seq.concat({ p: t, c: m.c })) * 10 - ([5, 21].includes(tot + cbv(m.c)) ? 4 : 0) + cbv(m.c) * 0.1, level); },
  view(s, x) { const ms = x.can ? TB.cribbage.moves(s) : [], me = x.me >= 0 ? x.me : 0, ok = new Set(ms.map(m => m.c || m.cr)), tot = sum(s.seq.map(p => cbv(p.c))), mineLeft = s.hands[me].filter(c => !s.played[me].includes(c));
    const peg = p => `<div class="cpeg"><span>${esc(x.names[p] || '')}${s.dealer === p ? ' (dealer)' : ''}</span><div class="bar"><i style="width:${s.sc[p] / 1.21}%"></i></div><b>${s.sc[p]}</b></div>`;
    x.el.innerHTML = `<div class="ctable">${peg(0)}${peg(1)}<div class="pile">${s.starter ? cardHTML(s.starter, 'disabled') : cardHTML(null, 'disabled')}<span>Count <b>${tot}</b></span><div class="hand">${s.seq.map(p => cardHTML(p.c, 'disabled', 'tiny')).join('')}</div></div>
      ${s.show ? `<div class="reveal"><p><b>Show</b> (starter ${cRank(s.show.starter)}${SUITG[cSuit(s.show.starter)]}): non-dealer ${s.show.pts.nd}, dealer ${s.show.pts.d}, crib ${s.show.pts.crib}</p></div>` : ''}<p class="muted small center">${esc(s.log)}</p>
      <p class="center">${s.phase === 'discard' && x.can ? 'Choose cards for the crib (2).' : ''}</p><div class="hand">${(s.phase === 'discard' ? s.hands[me] : mineLeft).map(c => cardHTML(c, ok.has(c) ? `data-i="c${c}"` : 'disabled', ok.has(c) ? 'ok' : '')).join('')}</div>${ms.includes('go') ? '<button class="btn hot" data-i="go">Go</button>' : ''}</div>`;
    x.on(d => { if (d === 'go') return x.act('go'); const c = d.slice(1); x.act(s.phase === 'discard' ? { cr: c } : { c }); }); }
};

// ---------- Old Maid ----------
const omPairs = h => { const out = [], byR = {}; h.forEach(c => (byR[cRank(c)] = byR[cRank(c)] || []).push(c)); Object.values(byR).forEach(g => { while (g.length >= 2) g.splice(0, 2); out.push(...g); }); return out; };
TB.oldmaid = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'],
  init(n) { const d = deck52().filter(c => c !== 'QC'); const hands = [...Array(n)].map(() => []); d.forEach((c, i) => hands[i % n].push(c)); return { n, hands: hands.map(h => shuf(omPairs(h))), t: 0, outOrder: [], log: 'Pairs discarded.' }; },
  turn: s => s.t, from: s => { let j = s.t; do j = (j + 1) % s.n; while (!s.hands[j].length && j !== s.t); return j; },
  moves(s) { if (TB.oldmaid.result(s)) return []; const f = TB.oldmaid.from(s); return s.hands[f].map((_, k) => ({ k })); },
  play(s, m) { const n = cl(s), f = TB.oldmaid.from(s), c = n.hands[f].splice(m.k, 1)[0]; const before = n.hands[s.t].length; n.hands[s.t] = shuf(omPairs(n.hands[s.t].concat(c))); n.log = `Seat ${s.t + 1} drew from Seat ${f + 1}${n.hands[s.t].length < before + 1 ? ' and made a pair' : ''}`;
    for (const p of [s.t, f]) if (!n.hands[p].length && !n.outOrder.includes(p)) n.outOrder.push(p);
    let j = s.t; do j = (j + 1) % s.n; while (!n.hands[j].length && j !== s.t); n.t = j; return n; },
  result(s) { const left = s.hands.map((h, i) => h.length ? i : -1).filter(i => i >= 0); if (left.length <= 1) return { winner: s.outOrder[0] ?? -1, loser: left[0] }; return null; },
  ai: (s, level, ms) => ms[R(ms.length)],
  view(s, x) { const ms = x.can ? TB.oldmaid.moves(s) : [], me = x.me, f = TB.oldmaid.from(s), r = TB.oldmaid.result(s);
    x.el.innerHTML = `<div class="ctable"><div class="opps">${s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span>${i === f && x.can ? `<div class="hand">${h.map((_, k) => `<button class="card back" data-i="${k}" aria-label="Draw card ${k + 1}"></button>`).join('')}</div><small>Pick a card</small>` : `<div class="fan">${h.map(() => '<i class="mini"></i>').join('')}</div><small>${h.length ? h.length + ' cards' : 'out'}</small>`}</div>`).join('')}</div>
      <p class="muted small center">${esc(s.log)}${r ? ` · ${esc(x.names[r.loser] || '')} is left holding the queen` : ''}</p><div class="hand">${me >= 0 ? s.hands[me].map(c => cardHTML(c, 'disabled')).join('') : ''}</div></div>`;
    x.on(d => x.act({ k: +d })); }
};

// ---------- Go Fish ----------
TB.gofish = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'],
  init(n) { const d = deck52(); return { n, hands: [...Array(n)].map(() => sortHand(d.splice(0, n <= 3 ? 7 : 5))), deck: d, books: Array(n).fill(0).map(() => []), t: 0, asks: [], log: '' }; },
  turn: s => s.t,
  moves(s) { if (TB.gofish.result(s)) return []; const h = s.hands[s.t]; if (!h.length) return [s.deck.length ? 'draw' : 'skip']; const ranks = [...new Set(h.map(cRank))], out = []; for (let p = 0; p < s.n; p++) if (p !== s.t && s.hands[p].length) ranks.forEach(r => out.push({ p, r })); return out.length ? out : ['skip']; },
  play(s, m) { const n = cl(s), t = s.t, book = p => { const byR = {}; n.hands[p].forEach(c => (byR[cRank(c)] = byR[cRank(c)] || []).push(c)); for (const [r, g] of Object.entries(byR)) if (g.length === 4) { n.books[p].push(r); n.hands[p] = n.hands[p].filter(c => cRank(c) !== r); n.log += ` Booked ${r}s!`; } };
    const nextT = () => { let j = t; for (let k = 0; k < s.n; k++) { j = (j + 1) % s.n; if (n.hands[j].length || n.deck.length) break; } n.t = j; };
    if (m === 'draw') { n.hands[t] = sortHand(n.hands[t].concat(n.deck.pop())); n.log = 'drew a card.'; book(t); return n; } if (m === 'skip') { nextT(); return n; }
    n.asks.push({ p: t, r: m.r }); const got = n.hands[m.p].filter(c => cRank(c) === m.r);
    if (got.length) { n.hands[m.p] = n.hands[m.p].filter(c => cRank(c) !== m.r); n.hands[t] = sortHand(n.hands[t].concat(got)); n.log = `Seat ${t + 1} took ${got.length} ${m.r}${got.length > 1 ? 's' : ''} from Seat ${m.p + 1}.`; book(t); if (!n.hands[t].length && n.deck.length) n.hands[t].push(n.deck.pop()); }
    else { n.log = `Seat ${t + 1} asked Seat ${m.p + 1} for ${m.r}s: go fish!`; if (n.deck.length) { const c = n.deck.pop(); n.hands[t] = sortHand(n.hands[t].concat(c)); book(t); if (cRank(c) === m.r) { n.log += ' Fished the right card.'; return n; } } nextT(); }
    return n; },
  result(s) { if (sum(s.books.map(b => b.length)) < 13) return null; const c = s.books.map(b => b.length), mx = Math.max(...c); return { winner: c.filter(v => v === mx).length > 1 ? -1 : c.indexOf(mx), score: c }; },
  ai(s, level, ms) { if (typeof ms[0] === 'string') return ms[0]; const h = s.hands[s.t], cnt = r => h.filter(c => cRank(c) === r).length;
    if (Math.random() < level / 10) { for (let k = s.asks.length - 1; k >= Math.max(0, s.asks.length - 8); k--) { const a = s.asks[k]; const m = ms.find(m => m.p === a.p && m.r === a.r); if (m) return m; } }
    return pickBest(ms, m => cnt(m.r) * 2 + s.hands[m.p].length * 0.1, level); },
  view(s, x) { const ms = x.can ? TB.gofish.moves(s) : [], me = x.me, sel = x.sel;
    x.el.innerHTML = `<div class="ctable"><div class="opps">${s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><div class="fan">${h.map(() => '<i class="mini"></i>').join('')}</div><small>${h.length} cards · books ${s.books[i].join(' ') || 'none'}</small>${sel && x.can && s.hands[i].length ? `<button class="btn sm hot" data-i="p${i}">Ask for ${sel}s</button>` : ''}</div>`).join('')}</div>
      <p class="center">Deck ${s.deck.length} · <span class="muted small">${esc(s.log)}</span></p><p class="center">Your books: ${me >= 0 ? s.books[me].join(' ') || 'none' : ''}</p>${x.can && !sel && ms.some(m => m.r) ? '<p class="center">Tap a card to choose the rank to ask for.</p>' : ''}
      <div class="hand">${me >= 0 ? s.hands[me].map(c => cardHTML(c, x.can && ms.some(m => m.r) ? `data-i="r${cRank(c)}"` : 'disabled', sel === cRank(c) ? 'sel' : '')).join('') : ''}</div>${ms.includes('draw') ? '<button class="btn hot" data-i="draw">Draw</button>' : ''}${ms.includes('skip') ? '<button class="btn" data-i="skip">Pass</button>' : ''}</div>`;
    x.on(d => { if (d === 'draw' || d === 'skip') return x.act(d); if (d[0] === 'r') { x.sel = d.slice(1); x.redraw(); return; } const p = +d.slice(1); x.act({ p, r: sel }); x.sel = null; }); }
};

// ---------- President ----------
const prR = r => ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'].indexOf(r);
const prSort = h => h.slice().sort((a, b) => prR(cRank(a)) - prR(cRank(b)) || SORD[cSuit(a)] - SORD[cSuit(b)]);
function prDeal(s) { const d = deck52(), hands = [...Array(s.n)].map(() => []); d.forEach((c, i) => hands[i % s.n].push(c)); const n = { ...s, hands: hands.map(prSort), pile: null, passes: 0, finish: [], lastPlayer: -1 };
  if (s.ranks) { const pres = s.ranks[0], scum = s.ranks[s.ranks.length - 1]; const best = n.hands[scum].slice(-2), worst = n.hands[pres].slice(0, 2); n.hands[scum] = prSort(n.hands[scum].filter(c => !best.includes(c)).concat(worst)); n.hands[pres] = prSort(n.hands[pres].filter(c => !worst.includes(c)).concat(best)); n.log = `Scum gave the President two best cards.`; n.t = scum; }
  else n.t = n.hands.findIndex(h => h.includes('3C')); return n; }
TB.president = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], init: n => prDeal({ n, pts: Array(n).fill(0), handNo: 1, ranks: null, log: '' }), turn: s => s.t,
  moves(s) { if (TB.president.result(s)) return []; const h = s.hands[s.t], byR = {}; h.forEach(c => byR[cRank(c)] = (byR[cRank(c)] || 0) + 1); const out = [];
    for (const [r, cnt] of Object.entries(byR)) for (let k = 1; k <= cnt; k++) if (!s.pile || (k === s.pile.k && prR(r) > prR(s.pile.r))) out.push({ r, k }); if (s.pile) out.push('pass'); return out; },
  play(s, m) { const n = cl(s), t = s.t, alive = i => n.hands[i].length > 0; const adv = from => { let j = from; for (let g = 0; g < s.n; g++) { j = (j + 1) % s.n; if (alive(j)) return j; } return from; };
    if (m === 'pass') { n.passes++; } else { let k = m.k; n.hands[t] = n.hands[t].filter(c => { if (cRank(c) === m.r && k > 0) { k--; return false; } return true; }); n.pile = { r: m.r, k: m.k }; n.lastPlayer = t; n.passes = 0; n.log = `Seat ${t + 1} played ${m.k} × ${m.r}`; if (!n.hands[t].length) n.finish.push(t); }
    const live = n.hands.filter(h => h.length).length;
    if (live <= 1) { const last = n.hands.findIndex(h => h.length); if (last >= 0) n.finish.push(last); n.finish.forEach((p, i) => n.pts[p] += s.n - 1 - i); n.ranks = n.finish.slice(); n.log = `Hand ${s.handNo}: President is Seat ${n.finish[0] + 1}`; if (s.handNo >= 3) { n.over = true; return n; } return prDeal({ ...n, handNo: s.handNo + 1 }); }
    const others = live - (alive(n.lastPlayer) ? 1 : 0); if (n.pile && n.passes >= others) { n.pile = null; n.passes = 0; n.t = alive(n.lastPlayer) ? n.lastPlayer : adv(n.lastPlayer); n.log += ' · pile cleared'; return n; }
    n.t = adv(t); return n; },
  result(s) { if (!s.over) return null; const mx = Math.max(...s.pts); return { winner: s.pts.filter(v => v === mx).length > 1 ? -1 : s.pts.indexOf(mx), score: s.pts }; },
  ai(s, level, ms) { const plays = ms.filter(m => m !== 'pass'); if (!plays.length) return 'pass'; if (noisy(level)) return ms[R(ms.length)]; const h = s.hands[s.t], best = plays.sort((a, b) => prR(a.r) - prR(b.r) || b.k - a.k);
    if (!s.pile) { const multi = best.filter(m => m.k === h.filter(c => cRank(c) === m.r).length); return multi[0] || best[0]; } const pick = best.find(m => h.filter(c => cRank(c) === m.r).length === m.k) || best[0]; return prR(pick.r) >= 11 && h.length > 4 && ms.includes('pass') ? 'pass' : pick; },
  view(s, x) { const ms = x.can ? TB.president.moves(s) : [], me = x.me, plays = new Map(); ms.filter(m => m.r).forEach(m => { if (!plays.has(m.r)) plays.set(m.r, []); plays.get(m.r).push(m.k); });
    x.el.innerHTML = `<div class="ctable"><p class="center">Hand ${s.handNo} of 3 · points ${s.pts.map((p, i) => esc(x.names[i] || '') + ' ' + p).join(' · ')}</p><div class="opps">${s.hands.map((h, i) => i === me ? '' : `<div class="opp ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><small>${h.length ? h.length + ' cards' : 'out'}</small></div>`).join('')}</div>
      <div class="pile">${s.pile ? `<b>${s.pile.k} × ${s.pile.r}</b>` : '<span class="muted">Lead any set</span>'}</div><p class="muted small center">${esc(s.log)} · 3 is lowest, 2 is highest</p>
      <div class="hand">${me >= 0 ? s.hands[me].map(c => cardHTML(c, plays.has(cRank(c)) ? `data-i="r${cRank(c)}"` : 'disabled', plays.has(cRank(c)) ? 'ok' : '')).join('') : ''}</div>
      ${x.sel && plays.has(x.sel) ? `<div class="row-btns">${plays.get(x.sel).map(k => `<button class="btn hot" data-i="k${k}">Play ${k} × ${x.sel}</button>`).join('')}</div>` : ''}${ms.includes('pass') ? '<button class="btn" data-i="pass">Pass</button>' : ''}</div>`;
    x.on(d => { if (d === 'pass') return x.act('pass'); if (d[0] === 'r') { const r = d.slice(1); if (plays.get(r).length === 1) x.act({ r, k: plays.get(r)[0] }); else { x.sel = r; x.redraw(); } return; } const k = +d.slice(1); const r = x.sel; x.sel = null; x.act({ r, k }); }); }
};

// ---------- Ghost (word game, needs dictionary) ----------
const GH = 'GHOST';
TB.ghost = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6'], needsWords: true, init: n => ({ n, frag: '', letters: Array(n).fill(0), t: 0, prev: -1, log: 'Start the fragment with any letter.' }), turn: s => s.t,
  moves(s) { if (TB.ghost.result(s)) return []; const out = 'abcdefghijklmnopqrstuvwxyz'.split('').map(l => ({ l })); if (s.frag) out.push('challenge'); return out; },
  play(s, m) { const n = cl(s), alive = i => n.letters[i] < 5, adv = i => { let j = i; do j = (j + 1) % s.n; while (!alive(j)); return j; }; const lose = (p, why) => { n.letters[p]++; n.log = `${why} Seat ${p + 1} gets a letter (${GH.slice(0, n.letters[p])}).`; n.frag = ''; n.prev = -1; n.t = alive(p) ? p : adv(p); };
    if (m === 'challenge') { const ok = Words.hasPrefix(s.frag) && Words.wordsWith(s.frag); if (ok) lose(s.t, `"${s.frag}" leads to "${Words.wordsWith(s.frag)}".`); else lose(s.prev, `No word starts with "${s.frag}".`); return n; }
    n.frag = s.frag + m.l; n.prev = s.t; if (n.frag.length >= 4 && Words.is(n.frag)) { lose(s.t, `"${n.frag}" is a word.`); return n; } n.t = adv(s.t); n.log = `Seat ${s.t + 1} added "${m.l}".`; return n; },
  result: s => { const a = s.letters.map((v, i) => v < 5 ? i : -1).filter(i => i >= 0); return a.length === 1 ? { winner: a[0] } : null; },
  ai(s, level, ms) { const f = s.frag; if (f && !Words.hasPrefix(f) && Math.random() < 0.5 + level / 20) return 'challenge';
    const good = [], ok = []; for (const l of 'abcdefghijklmnopqrstuvwxyz') { const g = f + l; if (!Words.hasPrefix(g)) continue; if (g.length >= 4 && Words.is(g)) continue; ok.push(l); const w = Words.wordsWith(g, true); if (w && (w.length - g.length) % s.n !== 0) good.push(l); }
    const pool = Math.random() < level / 10 && good.length ? good : ok; if (pool.length) return { l: pool[R(pool.length)] }; if (f) return 'challenge'; return { l: 'abcdefghijklmnoprstw'[R(20)] }; },
  view(s, x) { x.el.innerHTML = `<div class="ctable ghost"><div class="pigs">${s.letters.map((v, i) => `<div class="pg ${s.t === i ? 'turn' : ''}"><span>${esc(x.names[i] || '')}</span><b>${GH.slice(0, v) || '–'}</b></div>`).join('')}</div><div class="frag">${s.frag.toUpperCase() || '…'}</div><p class="muted small center">${esc(s.log)} Words of four or more letters count.</p>
      ${x.can ? `<div class="kb">${'abcdefghijklmnopqrstuvwxyz'.split('').map(l => `<button data-i="${l}">${l.toUpperCase()}</button>`).join('')}</div>${s.frag ? '<button class="btn hot" data-i="challenge">Challenge</button>' : ''}` : ''}</div>`;
    x.on(d => x.act(d === 'challenge' ? 'challenge' : { l: d })); }
};

// ---------- Word Tiles (crossword board game, needs dictionary) ----------
const WT_VAL = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 9, k: 6, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 2, v: 5, w: 4, x: 7, y: 4, z: 9 };
const WT_BAG = 'a9b2c2d4e12f2g3h2i9j1k1l4m2n6o8p2q1r6s4t6u4v2w2x1y2z1';
const WT_PREM = (() => { const p = Array(225).fill(''); for (let i = 0; i < 225; i++) { const d = Math.abs((i / 15 | 0) - 7), e = Math.abs(i % 15 - 7);
  if ((d === 7 && (e === 0 || e === 7)) || (e === 7 && d === 0)) p[i] = 'TW'; else if (d === e && (d === 3 || d === 6 || d === 5)) p[i] = 'DW'; else if ((d === 1 && e === 5) || (d === 5 && e === 1) || (d === 4 && e === 4)) p[i] = 'TL'; else if ((d === 0 && e === 4) || (d === 4 && e === 0) || (d === 2 && e === 2) || (d === 7 && e === 3) || (d === 3 && e === 7) || (d === 1 && e === 1)) p[i] = 'DL'; } p[112] = 'ST'; return p; })();
function wtBag() { const b = []; WT_BAG.replace(/([a-z])(\d+)/g, (_, l, n) => { for (let k = 0; k < +n; k++) b.push(l); }); return shuf(b); }
function wtEval(board, pl, first) { if (!pl.length) return { err: 'Place at least one tile.' }; const cells = new Map(pl.map(([i, l]) => [i, l])); if (cells.size !== pl.length || pl.some(([i]) => board[i])) return { err: 'Tiles must go on empty squares.' };
  const rows = new Set(pl.map(([i]) => i / 15 | 0)), cols = new Set(pl.map(([i]) => i % 15)); if (rows.size > 1 && cols.size > 1) return { err: 'Tiles must be in one row or column.' };
  const at = i => cells.get(i) || board[i]; const horiz = rows.size === 1 && (cols.size > 1 || pl.length === 1); const step = horiz ? 1 : 15;
  const wordAt = (i, st) => { const sameLine = j => st === 1 ? (j / 15 | 0) === (i / 15 | 0) : j >= 0 && j < 225; let a = i; while (sameLine(a - st) && a - st >= 0 && at(a - st)) a -= st; let w = '', idx = [], b = a; while (b < 225 && sameLine(b) && at(b)) { w += at(b); idx.push(b); b += st; } return { w, idx }; };
  const ids = pl.map(([i]) => i).sort((a, b) => a - b); for (let i = ids[0]; i <= ids[ids.length - 1]; i += step) if (!at(i)) return { err: 'Tiles must form one continuous line.' };
  const words = []; const main = wordAt(ids[0], step); if (main.w.length >= 2) words.push(main); for (const [i] of pl) { const c = wordAt(i, step === 1 ? 15 : 1); if (c.w.length >= 2) words.push(c); }
  if (pl.length === 1 && !words.length) return { err: 'Make a word of at least two letters.' }; if (first && !cells.has(112)) return { err: 'The first word must cover the centre star.' };
  if (!first && !words.some(w => w.idx.some(i => board[i]))) return { err: 'Words must connect to tiles already on the board.' };
  if (!words.length) return { err: 'Make a word of at least two letters.' }; const bad = words.find(w => !Words.is(w.w)); if (bad) return { err: `"${bad.w.toUpperCase()}" is not in the dictionary.` };
  let score = 0; for (const w of words) { let s = 0, mult = 1; for (const i of w.idx) { let v = WT_VAL[at(i)]; if (cells.has(i)) { const p = WT_PREM[i]; if (p === 'DL') v *= 2; if (p === 'TL') v *= 3; if (p === 'DW' || p === 'ST') mult *= 2; if (p === 'TW') mult *= 3; } s += v; } score += s * mult; } if (pl.length === 7) score += 50;
  return { score, words: words.map(w => w.w) }; }
TB.wordtiles = {
  seats: ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'], needsWords: true,
  init(n) { const bag = wtBag(); return { n, board: Array(225).fill(''), racks: [...Array(n)].map(() => bag.splice(0, 7)), bag, sc: Array(n).fill(0), t: 0, passes: 0, log: '', over: false }; }, turn: s => s.t,
  moves: s => s.over ? [] : ['pass', ...(s.bag.length >= 7 && s.racks[s.t].length ? [{ swap: s.racks[s.t].slice() }] : [])],
  check(s, m) { if (s.over) return false; if (m === 'pass') return true; if (m && m.swap) { const r = s.racks[s.t].slice(); return s.bag.length >= 7 && m.swap.length > 0 && m.swap.every(l => { const k = r.indexOf(l); if (k < 0) return false; r.splice(k, 1); return true; }); }
    if (!m || !m.pl) return false; const r = s.racks[s.t].slice(); if (!m.pl.every(([, l]) => { const k = r.indexOf(l); if (k < 0) return false; r.splice(k, 1); return true; })) return false; return !wtEval(s.board, m.pl, s.board.every(v => !v)).err; },
  play(s, m) { const n = cl(s), t = s.t; if (m === 'pass') { n.passes++; n.log = `Seat ${t + 1} passed`; }
    else if (m.swap) { m.swap.forEach(l => { n.racks[t].splice(n.racks[t].indexOf(l), 1); }); n.bag.push(...m.swap); shuf(n.bag); n.racks[t].push(...n.bag.splice(0, m.swap.length)); n.passes++; n.log = `Seat ${t + 1} swapped ${m.swap.length} tiles`; }
    else { const r = wtEval(s.board, m.pl, s.board.every(v => !v)); m.pl.forEach(([i, l]) => { n.board[i] = l; n.racks[t].splice(n.racks[t].indexOf(l), 1); }); n.sc[t] += r.score; n.racks[t].push(...n.bag.splice(0, 7 - n.racks[t].length)); n.passes = 0; n.log = `Seat ${t + 1} played ${r.words.map(w => w.toUpperCase()).join(', ')} for ${r.score}`; n.lastPl = m.pl.map(p => p[0]); }
    if ((!n.bag.length && !n.racks[t].length) || n.passes >= 2 * s.n) { n.over = true; n.racks.forEach((rk, i) => { const v = sum(rk.map(l => WT_VAL[l])); n.sc[i] -= v; if (!n.racks[t].length && i !== t) n.sc[t] += v; }); }
    n.t = (t + 1) % s.n; return n; },
  result(s) { if (!s.over) return null; const mx = Math.max(...s.sc); return { winner: s.sc.filter(v => v === mx).length > 1 ? -1 : s.sc.indexOf(mx), score: s.sc }; },
  ai(s, level) { const rack = s.racks[s.t], b = s.board, first = b.every(v => !v), dl = performance.now() + 500 + level * 120; const rc = {}; rack.forEach(l => rc[l] = (rc[l] || 0) + 1);
    const pool = {}; for (const l of rack) pool[l] = (pool[l] || 0) + 1; b.forEach(l => { if (l) pool[l] = (pool[l] || 0) + 1; });
    const cand = Words.list.filter(w => w.length >= 2 && w.length <= 9 && (() => { const c = {}; for (const ch of w) { c[ch] = (c[ch] || 0) + 1; if (c[ch] > (pool[ch] || 0)) return false; } return true; })());
    const found = []; const anchor = i => first ? i === 112 : [i - 15, i + 15, (i % 15) ? i - 1 : -1, (i % 15 < 14) ? i + 1 : -1].some(j => j >= 0 && j < 225 && b[j]);
    outer: for (const dir of [1, 15]) for (let line = 0; line < 15; line++) { for (const w of cand) { if (performance.now() > dl) break outer; for (let st = 0; st + w.length <= 15; st++) { const idx = k => dir === 1 ? line * 15 + st + k : (st + k) * 15 + line;
          const before = st > 0 ? idx(-1) : -1, after = st + w.length < 15 ? idx(w.length) : -1; if ((before >= 0 && b[before]) || (after >= 0 && b[after])) continue;
          const need = {}, pl = []; let ok = true, anc = false, uses = false; for (let k = 0; k < w.length; k++) { const i = idx(k); if (b[i]) { if (b[i] !== w[k]) { ok = false; break; } anc = true; } else { need[w[k]] = (need[w[k]] || 0) + 1; if (need[w[k]] > (rc[w[k]] || 0)) { ok = false; break; } pl.push([i, w[k]]); if (anchor(i)) anc = true; uses = true; } }
          if (!ok || !uses || !anc) continue; const r = wtEval(b, pl, first); if (!r.err) found.push({ pl, score: r.score }); } } }
    if (!found.length) return s.bag.length >= 7 ? { swap: rack.filter(l => WT_VAL[l] >= 4 || 'uvw'.includes(l)).slice(0, 4).concat(rack[0]).slice(0, 4) } : 'pass';
    found.sort((a, b2) => b2.score - a.score); const k = level >= 9 ? 0 : Math.min(found.length - 1, Math.floor(Math.random() * (11 - level) * found.length / 12)); return { pl: found[k].pl }; },
  view(s, x) { const me = x.me >= 0 ? x.me : 0, rack = s.racks[me], pend = x.sel || (x.sel = { pl: [], pick: -1, swap: false, chosen: [] }); const used = new Set(pend.pl.map(p => p.k)); const pm = new Map(pend.pl.map(p => [p.i, p.l])); const last = new Set(s.lastPl || []);
    const preview = pend.pl.length ? wtEval(s.board, pend.pl.map(p => [p.i, p.l]), s.board.every(v => !v)) : null;
    x.el.innerHTML = `<div class="wt"><div class="score2">${s.sc.map((v, i) => `<span class="${i === s.t ? 'wtturn' : ''}">${esc(x.names[i] || '')} ${v}</span>`).join('')}</div><div class="bd wtb">${s.board.map((l, i) => `<button data-i="b${i}" class="${WT_PREM[i]} ${pm.has(i) ? 'pend' : ''} ${last.has(i) ? 'last' : ''}" ${x.can && !l ? '' : 'disabled'}>${l || pm.get(i) ? `<b>${(l || pm.get(i)).toUpperCase()}</b><sub>${WT_VAL[l || pm.get(i)]}</sub>` : `<small>${WT_PREM[i] === 'ST' ? '★' : WT_PREM[i]}</small>`}</button>`).join('')}</div>
      <p class="muted small center">${esc(s.log)} · bag ${s.bag.length}${preview ? ` · ${preview.err ? esc(preview.err) : `this play scores <b>${preview.score}</b>`}` : ''}</p>
      ${x.can ? `<div class="rack">${rack.map((l, k) => `<button data-i="r${k}" class="${pend.pick === k ? 'sel' : ''} ${pend.swap && pend.chosen.includes(k) ? 'sel' : ''}" ${used.has(k) ? 'disabled' : ''}><b>${l.toUpperCase()}</b><sub>${WT_VAL[l]}</sub></button>`).join('')}</div>
        <div class="row-btns"><button class="btn hot" data-i="play" ${preview && !preview.err ? '' : 'disabled'}>Play word</button><button class="btn" data-i="recall">Recall</button><button class="btn" data-i="mix">Shuffle</button>${s.bag.length >= 7 ? `<button class="btn" data-i="swap">${pend.swap ? `Swap ${pend.chosen.length} tiles` : 'Swap tiles'}</button>` : ''}<button class="btn ghost" data-i="pass">Pass</button></div><p class="muted small">Tap a tile, then a square. Tap a placed tile to take it back.</p>` : `<div class="rack">${rack.map(l => `<button disabled><b>${x.me >= 0 ? l.toUpperCase() : '?'}</b></button>`).join('')}</div>`}</div>`;
    x.on(d => { const p = x.sel; if (d === 'pass') { x.sel = null; return x.act('pass'); } if (d === 'recall') { x.sel = null; return x.redraw(); } if (d === 'mix') { shuf(s.racks[me]); x.sel = null; return x.redraw(); }
      if (d === 'play') { const m = { pl: p.pl.map(q => [q.i, q.l]) }; x.sel = null; return x.act(m); }
      if (d === 'swap') { if (!p.swap) { p.swap = true; p.chosen = []; return x.redraw(); } const m = { swap: p.chosen.map(k => rack[k]) }; x.sel = null; return p.chosen.length ? x.act(m) : x.redraw(); }
      if (d[0] === 'r') { const k = +d.slice(1); if (p.swap) { p.chosen = p.chosen.includes(k) ? p.chosen.filter(q => q !== k) : p.chosen.concat(k); } else p.pick = p.pick === k ? -1 : k; return x.redraw(); }
      if (d[0] === 'b') { const i = +d.slice(1); const ex = p.pl.findIndex(q => q.i === i); if (ex >= 0) p.pl.splice(ex, 1); else if (p.pick >= 0) { p.pl.push({ i, l: rack[p.pick], k: p.pick }); p.pick = -1; } x.redraw(); } }); }
};
