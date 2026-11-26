// Player-made games: anyone can build a quiz or a word search, share it, and everyone can play, like and report it.
COLLS.ugc = { o: 'ts', l: 500 };
{ const css = document.createElement('style'); css.textContent = `.ugrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.ucard{display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:14px;border:1px solid var(--line,#dde);background:var(--panel,#fff);color:inherit;text-decoration:none}.ucard b{font-size:16px}.ucard small{opacity:.75}
.uq{padding:12px;border:1px solid var(--line,#dde);border-radius:12px;margin-bottom:10px}.uq .uopts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}@media (max-width:560px){.uq .uopts{grid-template-columns:1fr}}.uq .uopts label{display:flex;gap:8px;align-items:center}.uq .uopts input[type=radio]{flex:none;width:20px;height:20px;margin:0;padding:0;box-shadow:none}.uq .uopts input[type=text]{flex:1;min-width:0;width:auto}
.uplay{max-width:640px}.uans{display:grid;gap:8px;margin:12px 0}.uans button{text-align:left;padding:12px 14px;font-size:16px}.uans button.right{background:#1f9d63;color:#fff;border-color:#1f9d63}.uans button.wrong{background:#c0304a;color:#fff;border-color:#c0304a}
.wsgrid{display:grid;gap:2px;user-select:none;touch-action:none;max-width:min(560px,100%)}.wsgrid button{aspect-ratio:1;border:0;border-radius:6px;background:var(--panel2,#eef2ec);color:inherit;font:700 clamp(12px,3.4vw,20px)/1 inherit;text-transform:uppercase;padding:0;cursor:pointer}.wsgrid button.sel{background:#f2b01e;color:#111}.wsgrid button.got{background:#1f9d63;color:#fff}
.wslist{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.wslist span{padding:3px 10px;border-radius:999px;border:1px solid var(--line,#dde)}.wslist span.got{text-decoration:line-through;opacity:.55}`; document.head.appendChild(css); }

const UGC = {
  clean(s, n) { s = String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); return typeof scrubText === 'function' ? scrubText(s) : s; },
  list() { return Store.all('ugc').filter(u => !blockedSet().has(u.by)); },
  likes: u => Object.values(u.likes || {}).filter(Boolean).length,
  async save(id, doc) { await Store.put('ugc', id, doc); return id; },
  async bump(u, score, label) { const cur = Store.get('ugc', u.id); if (!cur) return; const top = arr(cur.top).filter(t => t.uid !== Store.uid); const mine = arr(cur.top).find(t => t.uid === Store.uid);
    const better = !mine || (cur.kind === 'quiz' ? score > mine.s : score < mine.s); const entry = better ? { uid: Store.uid, s: score, l: label, ts: now() } : mine;
    top.push(entry); top.sort((a, b) => cur.kind === 'quiz' ? b.s - a.s || a.ts - b.ts : a.s - b.s); const base = { ...cur }; delete base.id; await Store.put('ugc', u.id, { ...base, plays: (cur.plays || 0) + 1, top: top.slice(0, 20) }); }
};

VIEWS.create = { render(el, tab) { tab = tab || 'all'; const sort = App.ugcs || 'popular';
  let items = UGC.list().filter(u => tab === 'all' || (tab === 'mine' ? u.by === Store.uid : u.kind === tab));
  items = items.sort((a, b) => sort === 'new' ? b.ts - a.ts : sort === 'liked' ? UGC.likes(b) - UGC.likes(a) : (b.plays || 0) - (a.plays || 0));
  el.innerHTML = `<section class="band"><h1>Create</h1><p class="lead">Make your own quiz or word search and challenge everyone. Players can like, play and report creations.</p>
    <div class="row-btns"><a class="btn hot" href="#make-quiz">Make a quiz</a><a class="btn hot" href="#make-words">Make a word search</a></div>
    <nav class="tabs">${[['all', 'Everything'], ['quiz', 'Quizzes'], ['words', 'Word searches'], ['mine', 'My creations']].map(([k, l]) => `<a href="#create-${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <label class="fld inline">Sort <select id="ugs">${[['popular', 'Most played'], ['liked', 'Most liked'], ['new', 'Newest']].map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="ugrid">${items.map(u => `<a class="ucard" href="#ugc-${esc(u.id)}"><span class="pill">${u.kind === 'quiz' ? `Quiz · ${arr(u.qs).length} questions` : `Word search · ${arr(u.words).length} words`}</span><b>${esc(u.title)}</b><small>by ${esc(Names.of(u.by))} · ${u.plays || 0} plays · ♥ ${UGC.likes(u)}</small>${u.desc ? `<small>${esc(u.desc)}</small>` : ''}</a>`).join('') || '<p class="empty">Nothing here yet. Be the first to make something!</p>'}</div></section>`;
  el.querySelector('#ugs').onchange = e => { App.ugcs = e.target.value; render(true); }; } };

VIEWS.make = { render(el, kind) { kind = kind === 'words' ? 'words' : 'quiz'; const edit = App.ugcEdit && Store.get('ugc', App.ugcEdit); const d = edit && edit.kind === kind && edit.by === Store.uid ? edit : null;
  if (kind === 'quiz') { const qs = d ? arr(d.qs) : [{ q: '', a: ['', '', '', ''], c: 0 }];
    const qHTML = (q, i) => `<div class="uq" data-q="${i}"><label class="fld">Question ${i + 1}<input type="text" name="q" maxlength="200" value="${esc(q.q)}" required></label><div class="uopts">${[0, 1, 2, 3].map(j => `<label><input type="radio" name="c${i}" value="${j}" ${q.c === j ? 'checked' : ''} aria-label="Correct answer ${j + 1}"><input type="text" name="a" maxlength="100" value="${esc(q.a[j] || '')}" placeholder="Answer ${j + 1}${j < 2 ? '' : ' (optional)'}" ${j < 2 ? 'required' : ''}></label>`).join('')}</div>${i ? '<button type="button" class="btn sm ghost" data-del="1">Remove question</button>' : ''}</div>`;
    el.innerHTML = `<section class="band uplay"><a class="back" href="#create">← Create</a><h1>${d ? 'Edit quiz' : 'Make a quiz'}</h1><form id="uf" class="aform"><label class="fld">Title<input name="title" maxlength="80" required value="${esc(d ? d.title : '')}"></label><label class="fld">Description (optional)<input name="desc" maxlength="200" value="${esc(d ? d.desc || '' : '')}"></label>
      <p class="muted small">Pick the correct answer with the round button next to it. Up to 30 questions.</p><div id="uqs">${qs.map(qHTML).join('')}</div><div class="row-btns"><button type="button" class="btn" id="uadd">Add question</button><button class="btn hot">${d ? 'Save changes' : 'Publish quiz'}</button></div></form></section>`;
    const box = el.querySelector('#uqs');
    el.querySelector('#uadd').onclick = () => { const n = box.children.length; if (n >= 30) return toast('30 questions at most.'); box.insertAdjacentHTML('beforeend', qHTML({ q: '', a: ['', '', '', ''], c: 0 }, n)); };
    box.onclick = e => { if (e.target.dataset.del) e.target.closest('.uq').remove(); };
    el.querySelector('#uf').onsubmit = async e => { e.preventDefault(); const f = e.target; const out = [...box.querySelectorAll('.uq')].map(q => { const a = [...q.querySelectorAll('input[name=a]')].map(i => UGC.clean(i.value, 100)); const c = +((q.querySelector('input[type=radio]:checked') || {}).value || 0); return { q: UGC.clean(q.querySelector('input[name=q]').value, 200), a, c }; })
        .map(q => { const keep = q.a.map((t, i) => [t, i]).filter(([t]) => t); const ci = keep.findIndex(([, i]) => i === q.c); return { q: q.q, a: keep.map(([t]) => t), c: ci }; });
      const bad = out.findIndex(q => !q.q || q.a.length < 2 || q.c < 0); if (bad >= 0) return toast(`Question ${bad + 1} needs a question, at least two answers, and a correct answer that isn't blank.`);
      const id = d ? d.id : uid8(); await UGC.save(id, { kind: 'quiz', title: UGC.clean(f.title.value, 80), desc: UGC.clean(f.desc.value, 200), qs: out, by: Store.uid, ts: d ? d.ts : now(), edited: now(), plays: d ? d.plays || 0 : 0, likes: d ? d.likes || {} : {}, top: d ? d.top || [] : [] }); App.ugcEdit = null; toast(d ? 'Saved.' : 'Your quiz is live!'); location.hash = 'ugc-' + id; }; }
  else { el.innerHTML = `<section class="band uplay"><a class="back" href="#create">← Create</a><h1>${d ? 'Edit word search' : 'Make a word search'}</h1><form id="uf" class="aform"><label class="fld">Title<input name="title" maxlength="80" required value="${esc(d ? d.title : '')}"></label><label class="fld">Description (optional)<input name="desc" maxlength="200" value="${esc(d ? d.desc || '' : '')}"></label>
      <label class="fld">Words to hide (5 to 15 words, letters only, 3 to 12 letters each). One per line or separated by commas.<textarea name="words" rows="6" required>${esc(d ? arr(d.words).join('\n') : '')}</textarea></label><button class="btn hot">${d ? 'Save changes' : 'Publish word search'}</button></form></section>`;
    el.querySelector('#uf').onsubmit = async e => { e.preventDefault(); const f = e.target; const words = [...new Set(f.words.value.split(/[\s,;]+/).map(w => w.toUpperCase().replace(/[^A-Z]/g, '')).filter(w => w.length >= 3 && w.length <= 12))].slice(0, 15).filter(w => UGC.clean(w, 12) === w);
      if (words.length < 5) return toast('Add at least 5 words of 3 to 12 letters (A to Z only).');
      const id = d ? d.id : uid8(); await UGC.save(id, { kind: 'words', title: UGC.clean(f.title.value, 80), desc: UGC.clean(f.desc.value, 200), words, by: Store.uid, ts: d ? d.ts : now(), edited: now(), plays: d ? d.plays || 0 : 0, likes: d ? d.likes || {} : {}, top: d ? d.top || [] : [] }); App.ugcEdit = null; toast(d ? 'Saved.' : 'Your word search is live!'); location.hash = 'ugc-' + id; }; } } };

function wsBuild(words, seed) { let x = seed >>> 0 || 1; const rnd = n => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x % n; };
  const N = Math.max(10, Math.min(15, Math.max(...words.map(w => w.length)) + 3)), g = Array.from({ length: N }, () => Array(N).fill('')), dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], placed = [];
  for (const w of [...words].sort((a, b) => b.length - a.length)) { let ok = false; for (let t = 0; t < 400 && !ok; t++) { const [dr, dc] = dirs[rnd(t < 200 ? 4 : 8)], r = rnd(N), c = rnd(N); const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1); if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      if ([...w].every((ch, i) => !g[r + dr * i][c + dc * i] || g[r + dr * i][c + dc * i] === ch)) { [...w].forEach((ch, i) => g[r + dr * i][c + dc * i] = ch); placed.push(w); ok = true; } } }
  const A = 'EEEEAAAIIOOUTTNNSSRRLLDDHCMPBGFYWKVXZJQ'; for (const row of g) for (let i = 0; i < N; i++) if (!row[i]) row[i] = A[rnd(A.length)]; return { N, g, words: placed }; }

VIEWS.ugc = { render(el, id) { const u = Store.get('ugc', id); if (!u) { el.innerHTML = '<section class="band"><h1>Not found</h1><p>This creation was removed or never existed.</p><a class="btn" href="#create">Browse creations</a></section>'; return; }
  const liked = !!(u.likes || {})[Store.uid], mine = u.by === Store.uid || Store.owner;
  const head = `<a class="back" href="#create">← Create</a><h1>${esc(u.title)}</h1><p class="lead">${u.kind === 'quiz' ? 'Quiz' : 'Word search'} by ${nameLink(u.by)} · ${u.plays || 0} plays · ♥ ${UGC.likes(u)}</p>${u.desc ? `<p>${esc(u.desc)}</p>` : ''}
    <div class="row-btns"><button class="btn hot" id="ugo">Play</button><button class="btn ${liked ? 'on' : ''}" id="ulike">${liked ? '♥ Liked' : '♡ Like'}</button><button class="btn" id="ushare">Share</button>${mine ? '<button class="btn" id="uedit">Edit</button><button class="btn danger" id="udel">Delete</button>' : '<button class="btn ghost" id="urep">Report</button>'}</div>`;
  const board = `<h2>Top players</h2>${arr(u.top).length ? `<table class="lb"><tbody>${arr(u.top).map((t, i) => `<tr class="${t.uid === Store.uid ? 'me' : ''}"><td>${i + 1}</td><td>${avatar(t.uid, 22)} ${nameLink(t.uid)}</td><td class="num">${esc(t.l)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No scores yet.</p>'}`;
  el.innerHTML = `<section class="band uplay">${head}<div id="ustage"></div>${board}</section>`;
  el.querySelector('#ulike').onclick = async () => { const cur = Store.get('ugc', id), base = { ...cur }; delete base.id; await Store.put('ugc', id, { ...base, likes: { ...(cur.likes || {}), [Store.uid]: !liked } }); render(true); };
  el.querySelector('#ushare').onclick = async () => { try { await navigator.clipboard.writeText(`${Config.url()}#ugc-${id}`); toast('Link copied.'); } catch (e) { toast('Copy blocked.'); } };
  const ed = el.querySelector('#uedit'); if (ed) ed.onclick = () => { App.ugcEdit = id; location.hash = 'make-' + u.kind; };
  const dl = el.querySelector('#udel'); if (dl) dl.onclick = async () => { if (!confirm('Delete this creation for everyone?')) return; await Store.del('ugc', id); location.hash = 'create'; };
  const rp = el.querySelector('#urep'); if (rp) rp.onclick = () => report('creation', id, u.title);
  el.querySelector('#ugo').onclick = async () => { if (!await gate()) return; el.querySelector('#ugo').hidden = true; (u.kind === 'quiz' ? ugcQuiz : ugcWords)(el.querySelector('#ustage'), u); }; } };

function ugcQuiz(st, u) { const qs = arr(u.qs); let i = 0, score = 0; const t0 = now();
  const show = () => { if (i >= qs.length) { const pct = Math.round(score / qs.length * 100); st.innerHTML = `<div class="okbox"><h2>You scored ${score} of ${qs.length} (${pct}%)</h2><p>${pct === 100 ? 'Perfect!' : pct >= 70 ? 'Great job!' : 'Nice try. Play again to beat your score.'}</p><button class="btn hot" id="uagain">Play again</button></div>`; st.querySelector('#uagain').onclick = () => { i = 0; score = 0; show(); };
      UGC.bump(u, score * 1000 - Math.min(999, Math.round((now() - t0) / 1000)), `${score}/${qs.length}`); return; }
    const q = qs[i]; st.innerHTML = `<p class="muted">Question ${i + 1} of ${qs.length} · score ${score}</p><h2>${esc(q.q)}</h2><div class="uans">${q.a.map((a, j) => `<button class="btn" data-j="${j}">${esc(a)}</button>`).join('')}</div>`;
    st.querySelector('.uans').onclick = e => { const b = e.target.closest('[data-j]'); if (!b || st.dataset.lock) return; st.dataset.lock = 1; const j = +b.dataset.j; if (j === q.c) { score++; b.classList.add('right'); beep(720, .08, 'sine'); } else { b.classList.add('wrong'); st.querySelector(`[data-j="${q.c}"]`).classList.add('right'); beep(200, .12, 'square'); }
      setTimeout(() => { delete st.dataset.lock; i++; show(); }, 900); }; };
  show(); }

function ugcWords(st, u) { const W = wsBuild(arr(u.words), typeof hashStr === 'function' ? hashStr(u.id) : 7), found = new Set(), t0 = now(); let start = null;
  st.innerHTML = `<p class="muted" id="wsinfo">Find ${W.words.length} words. Tap the first letter, then the last.</p><div class="wslist">${W.words.map(w => `<span data-w="${w}">${w}</span>`).join('')}</div><div class="wsgrid" style="grid-template-columns:repeat(${W.N},1fr)">${W.g.map((row, r) => row.map((ch, c) => `<button data-r="${r}" data-c="${c}" aria-label="Row ${r + 1} column ${c + 1}: ${ch}">${ch}</button>`).join('')).join('')}</div>`;
  const cell = (r, c) => st.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  st.querySelector('.wsgrid').onclick = e => { const b = e.target.closest('button'); if (!b) return; const r = +b.dataset.r, c = +b.dataset.c;
    if (!start) { start = [r, c]; b.classList.add('sel'); return; } const [r0, c0] = start; start = null; st.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0), len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1; if (!((r - r0) === 0 || (c - c0) === 0 || Math.abs(r - r0) === Math.abs(c - c0))) return;
    const cells = Array.from({ length: len }, (_, k) => [r0 + dr * k, c0 + dc * k]), word = cells.map(([a, b2]) => W.g[a][b2]).join(''), hit = W.words.find(w => !found.has(w) && (w === word || w === [...word].reverse().join('')));
    if (!hit) { beep(200, .06, 'square'); return; } found.add(hit); cells.forEach(([a, b2]) => cell(a, b2).classList.add('got')); st.querySelector(`[data-w="${hit}"]`).classList.add('got'); beep(720, .08, 'sine');
    if (found.size === W.words.length) { const secs = Math.round((now() - t0) / 1000); st.querySelector('#wsinfo').innerHTML = `<b>All found in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}!</b>`; UGC.bump(u, secs, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`); if (typeof celebrate === 'function') celebrate('win'); } }; }

// Navigation entry and moderation of creations
{ const i = NAV.findIndex(n => n[0] === 'rewards'); NAV.splice(i < 0 ? NAV.length : i, 0, ['create', 'Create']); NAVI.create = 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'; }
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-rm^="creation:"]'); if (!b) return; e.stopPropagation(); e.preventDefault(); const [, target, rid] = b.dataset.rm.split(':'); await Store.del('ugc', target); await Store.del('reports', rid); toast('Creation removed.'); render(true); }, true);
// Keep a game in progress (and a half-written form) on screen when other players' updates arrive
VIEWS.ugc.live = false; VIEWS.make.live = false;
