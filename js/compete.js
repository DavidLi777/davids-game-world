// Compete mode for single-player games: up to 8 players race on the same game (same seed) with a live scoreboard.
const seededRng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const Rng = { orig: Math.random, use(seed) { Math.random = seededRng(seed); }, restore() { Math.random = this.orig; } };
const RACE_LIMITS = [[120, '2 minutes'], [300, '5 minutes'], [600, '10 minutes'], [900, '15 minutes']];

// Computer rivals in a score race: each follows a run whose strength depends on its level. Deterministic from the seed, so every viewer sees the same rival scores.
function rivalRun(gid, level, k, seed) { const r = seededRng((seed ^ (k + 1) * 2654435761) >>> 0); const top = (leaderRows(gid)[0] || { s: { best: 0 } }).s.best || 0;
  const base = Math.max(400, top * 0.55), final = Math.round(base * (0.25 + 0.08 * level) * (0.75 + r() * 0.5)), dur = (50 + r() * 130) * 1000;
  return { final, dur, at: ms => ms >= dur ? final : Math.round(final * Math.pow(ms / dur, 0.85) * (0.97 + 0.03 * Math.sin(ms / 1700 + k))) }; }
const raceName = (s, i) => s && s.startsWith('ai:') ? `Computer ${i + 1} · L${s.slice(3)}` : Names.of(s);
const rboard = rows => `<div class="rboard">${rows.map((r, i) => `<div class="rrow ${r.me ? 'me' : ''} ${r.done ? 'done' : ''}" style="--c:${SEATCOL[r.seat % 8]}"><span class="rpos">${i + 1}</span><i></i><span class="rname">${esc(r.name)}</span><b>${Math.round(r.score)}</b><small>${r.done ? 'finished' : 'playing'}</small></div>`).join('')}</div>`;

// ---------- Compete against computer rivals on this device ----------
function startCompete(id, level, rivals) { const seed = (Math.random() * 2 ** 31) | 0, t0 = performance.now(), runs = [...Array(rivals)].map((_, k) => rivalRun(id, Math.max(1, Math.min(10, level + (k % 3) - 1)), k, seed));
  const lv = k => Math.max(1, Math.min(10, level + (k % 3) - 1));
  const st = $('#stage'); let score = 0, ended = false, endAt = 0, iv = null;
  st.innerHTML = `<div class="match"><div class="mbar"><span>Your score <b id="sc">0</b></span><span class="muted">Compete · ${rivals + 1} players · level ${level}</span></div><div id="rb"></div><div class="board solo" id="board"></div><div class="row-btns"><button class="btn" id="giveup">Finish now</button><button class="btn" id="again">New race</button><button class="btn ghost" id="setup">Back to setup</button></div></div>`;
  const rows = () => { const ms = (ended ? endAt : performance.now()) - t0; return [{ name: 'You', score, done: ended, me: true, seat: 0 }].concat(runs.map((r, k) => ({ name: `Computer ${k + 1} · L${lv(k)}`, score: ended ? r.final : r.at(ms), done: ended || ms >= r.dur, seat: k + 1 }))).sort((a, b) => b.score - a.score); };
  const draw = () => { const e = $('#rb'); if (e) e.innerHTML = rboard(rows()); };
  const host = document.createElement('div'); host.className = 'sohost'; $('#board').appendChild(host); Rng.use(seed);
  const finish = (v, won) => { if (ended) return; ended = true; endAt = performance.now(); score = v ?? score; clearInterval(iv); const rs = rows(), pos = rs.findIndex(r => r.me) + 1; draw();
    recordResult(id, { score, outcome: pos === 1 ? 'win' : 'loss', level }); const b = document.createElement('div'); b.className = 'endcard'; b.innerHTML = `<b>${pos === 1 ? 'You win the race!' : `You finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} of ${rs.length}`}</b><span>Score ${Math.round(score)}</span>`; $('#board') && $('#board').appendChild(b); if (pos === 1) celebrate('win'); };
  let stop = null; try { stop = SO[id].start(host, { level, score: v => { score = v; const e = $('#sc'); if (e) e.textContent = Math.round(v); }, end: ({ score: v, won }) => finish(v, won) }); } catch (e) { console.error(e); }
  iv = setInterval(draw, 500); draw();
  App.cleanup = () => { clearInterval(iv); try { stop && stop(); } catch (e) {} Rng.restore(); VIEWS.game.live = true; }; VIEWS.game.live = false;
  $('#giveup').onclick = () => { try { stop && stop(); } catch (e) {} finish(score); };
  $('#again').onclick = async () => { if (!await gate()) return; App.cleanup(); startCompete(id, level, rivals); };
  $('#setup').onclick = () => { App.cleanup(); App.cleanup = null; render(true); }; }

// ---------- Online race tables ----------
const Race = { run: null, iv: null,
  docId: (t, uid) => `${t.id}_${t.round || 0}_${String(uid).replace(/[^\w-]/g, '_')}`,
  mine(t, uid = Store.uid) { return Store.get('races', this.docId(t, uid)); },
  rows(t) { const st = t.state || {}, ms = Math.max(0, (t.status === 'done' && t.endedAt ? t.endedAt : now()) - (st.start || now()));
    return arr(t.seats).map((s, i) => { if (!s) return null; if (s.startsWith('ai:')) { const r = rivalRun(t.game, +s.slice(3), i, st.seed || 1); return { seat: i, uid: s, name: raceName(s, i), score: t.status === 'done' ? r.final : r.at(ms), done: t.status === 'done' || ms >= r.dur }; }
      const d = this.mine(t, s) || {}; return { seat: i, uid: s, name: Names.of(s), score: d.score || 0, done: !!d.done, me: s === Store.uid }; }).filter(Boolean).sort((a, b) => b.score - a.score); },
  left(t) { const st = t.state || {}; return Math.max(0, Math.ceil(((st.start || now()) + (st.limit || 300) * 1000 - now()) / 1000)); },
  async write(t, patch) { const id = this.docId(t, Store.uid), cur = Store.get('races', id) || {}; await Store.put('races', id, { ...cur, id: undefined, t: t.id, round: t.round || 0, uid: Store.uid, ...patch, ts: now() }); },
  stopRun() { if (this.run) { try { this.run.stop && this.run.stop(); } catch (e) {} Rng.restore(); this.run = null; } },
  cleanup() { this.stopRun(); clearInterval(this.iv); this.iv = null; },
  draw(t, x) { const mine = arr(t.seats).indexOf(Store.uid), g = GAME[t.game], key = t.id + ':' + (t.round || 0);
    if (this.run && this.run.key !== key) this.stopRun();
    if (!t.state) { $('#mbar').innerHTML = `<span class="muted">${t.status === 'open' ? `Score race for up to ${g.maxP} players. Everyone plays the same ${esc(g.name)} game at the same time; the highest score when everyone finishes (or time runs out) wins.` : ''}</span>`; if (!x.el.querySelector('.waiting')) x.el.innerHTML = `<div class="waiting">${art(g, 120)}</div>`; return; }
    const playing = t.status === 'playing', left = this.left(t), d = this.mine(t);
    $('#mbar').innerHTML = playing ? `<span class="turn">Race on · <b class="rleft">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b> left</span>${mine < 0 ? '<span class="pill">Watching</span>' : d && d.done ? '<span class="muted">You finished. Waiting for the others…</span>' : '<span class="muted">Score as much as you can</span>'}` : `<b>${esc((this.rows(t)[0] || {}).name || '')} wins the race!</b>`;
    if (!x.el.querySelector('#rb')) { x.el.innerHTML = '<div id="rb"></div><div class="board solo" id="rhost"></div>'; }
    $('#rb').innerHTML = rboard(this.rows(t));
    if (playing && mine >= 0 && !(d && d.done) && !this.run) { const host = document.createElement('div'); host.className = 'sohost'; $('#rhost').innerHTML = ''; $('#rhost').appendChild(host); Rng.use(t.state.seed); let last = 0, sc = 0;
      const run = { key, score: 0, stop: null }; this.run = run;
      const end = v => { if (run.ended) return; run.ended = true; run.score = v ?? run.score; this.write(t, { score: run.score, done: true }); const b = document.createElement('div'); b.className = 'endcard'; b.innerHTML = `<b>Finished</b><span>Score ${Math.round(run.score)}</span>`; host.appendChild(b); };
      run.end = end; try { run.stop = SO[t.game].start(host, { level: 5, score: v => { run.score = v; if (now() - last > 2000) { last = now(); this.write(t, { score: v }); } }, end: ({ score: v }) => end(v) }); } catch (e) { console.error(e); }
      this.write(t, { score: 0, done: false }); }
    if (!playing && this.run) this.stopRun();
    if (mine < 0 && playing && !$('#rhost').querySelector('.waiting')) $('#rhost').innerHTML = `<div class="waiting">${art(g, 100)}<p class="muted">Watching the scoreboard live.</p></div>`;
    clearInterval(this.iv); if (playing) this.iv = setInterval(() => { const cur = Store.get('tables', t.id); if (!cur || cur.status !== 'playing') return clearInterval(this.iv); const l = this.left(cur), e = $('.rleft'); if (e) e.textContent = `${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`; const rb = $('#rb'); if (rb) rb.innerHTML = rboard(this.rows(cur)); if (l <= 0 && this.run && !this.run.ended) { try { this.run.stop && this.run.stop(); } catch (er) {} this.run.end(this.run.score); } this.hostCheck(cur); }, 1000);
    this.hostCheck(t); if (t.status === 'done' && mine >= 0) this.finish(t); },
  async hostCheck(t) { if (t.host !== Store.uid || t.status !== 'playing') return; const humans = arr(t.seats).filter(s => s && !s.startsWith('ai:')), allDone = humans.every(u => (this.mine(t, u) || {}).done);
    if (allDone || this.left(t) <= 0) { const rank = this.rows(t).map(r => ({ uid: r.uid, score: Math.round(r.score) })); const base = { ...t }; delete base.id; await Store.put('tables', t.id, { ...base, status: 'done', endedAt: now(), result: { rank, winner: arr(t.seats).indexOf(rank[0].uid) }, ts: now() }); } },
  finish(t) { const k = 'rec:' + t.id + ':' + (t.round || 0); if (LS.get(k)) return; LS.set(k, 1); const rank = (t.result && t.result.rank) || this.rows(t), pos = rank.findIndex(r => r.uid === Store.uid) + 1, my = (rank[pos - 1] || {}).score || 0;
    recordResult(t.game, { score: my, outcome: pos === 1 ? 'win' : 'loss', level: 5 }); if (pos === 1) celebrate('win'); },
  start(t) { return { seed: (Math.random() * 2 ** 31) | 0, start: now(), limit: t.limit || 300 }; } };
