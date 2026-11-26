// Voice and video: calls between friends, voice/video rooms at game tables (up to 8), and live streams with chat.
// Media goes directly between players (WebRTC). Connection set-up messages go through the shared database ('rtc').
COLLS.rtc = { o: 'ts', l: 400 };
{ const css = document.createElement('style'); css.textContent = `#rtcbox{position:fixed;right:12px;bottom:12px;z-index:95;width:min(360px,calc(100vw - 24px));background:#0d1a15;color:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column}
#rtcbox .rtchead{display:flex;align-items:center;gap:8px;padding:8px 10px}#rtcbox .rtchead b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#rtcbox .rtchead small{opacity:.75;white-space:nowrap}#rtcbox .rtchead .btn{color:#fff;border-color:#ffffff40}
#rtcbox .rtcgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px;padding:0 4px;max-height:60vh;overflow:auto}
.rtctile{position:relative;aspect-ratio:4/3;background:#1d2b25;border-radius:10px;overflow:hidden}.rtctile video{width:100%;height:100%;object-fit:cover;display:block}.rtctile.novid video{opacity:0}
.rtctile.novid::before{content:'';position:absolute;inset:30% 38%;border-radius:50%;background:#2f7cf6;opacity:.6}.rtctile span{position:absolute;left:6px;bottom:6px;font-size:12px;background:#0009;padding:2px 6px;border-radius:6px}
#rtcbox .rtcctl{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px}#rtcbox .rtcctl .btn{color:#fff;background:#ffffff1a;border-color:#ffffff30}#rtcbox .rtcctl .btn.hot{background:#e8613c}#rtcbox .rtcctl .btn.danger{background:#c0304a;border-color:#c0304a}
#rtcbox.min .rtcgrid,#rtcbox.min .rtcctl{display:none}@media (max-width:760px){#rtcbox{bottom:72px}}
.rtcring{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:120;display:flex;align-items:center;gap:12px;background:var(--panel,#fff);color:var(--ink,#111);padding:12px 14px;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);max-width:calc(100vw - 24px)}.rtcring small{display:block;opacity:.7}`; document.head.appendChild(css); }
const RTC = {
  room: null, seen: new Set(), rang: new Set(), hb: null, pumpT: null,
  supported() { return !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
  ready() { if (typeof Family !== 'undefined' && Family.on()) { toast('Calls and live streams are turned off in family mode.'); return false; }
    if (!this.supported()) { toast('Voice and video need a browser with camera and microphone support.'); return false; }
    if (Store.mode !== 'shared' || !Auth.signedIn()) { toast('Sign in on the full website to use voice and video.'); if (window.B44) B44.login(); return false; } return true; },
  ice() { const c = (Config.get().turn) || {}; const s = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]; if (c.url) s.push({ urls: String(c.url).split(',').map(x => x.trim()).filter(Boolean), username: c.user || '', credential: c.pass || '' }); return s; },
  key: s => String(s).replace(/[^\w-]/g, '_').slice(0, 180),
  send(to, t, d) { const r = this.room; return Store.put('rtc', 's' + uid8(), { room: r.id, from: Store.uid, to, t, d: d || null, ts: now() }); },
  members() { const r = this.room; if (!r) return []; return Store.all('rtc').filter(x => x.t === 'member' && x.room === r.id && now() - x.ts < 50e3); },
  async join(id, o = {}) { if (!this.ready()) return; if (this.room) { if (this.room.id === id) return; await this.leave(); }
    const role = o.role || 'peer'; let local = null;
    if (role !== 'viewer') { try { local = o.screen ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: o.video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false }); }
      catch (e) { toast(o.screen ? 'Screen sharing was cancelled.' : 'Allow microphone' + (o.video ? ' and camera' : '') + ' access to join.'); return; }
      if (o.screen && o.withMic) { try { const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); mic.getAudioTracks().forEach(t => local.addTrack(t)); } catch (e) {} } }
    this.room = { id, role, title: o.title || 'Voice chat', local, peers: new Map(), video: !!o.video || !!o.screen, max: o.max || 8, chat: o.chat || null, started: now() };
    const n = this.members().filter(m => m.from !== Store.uid && m.role !== 'viewer').length + (role !== 'viewer' ? 1 : 0); if (role !== 'viewer' && n > this.room.max) { toast(`This room is full (${this.room.max} people).`); this.stopLocal(); this.room = null; return; }
    if (role === 'viewer' && this.members().filter(m => m.role === 'viewer').length >= 25) { toast('This stream is full right now. Try again soon.'); this.room = null; return; }
    await this.beat(); clearInterval(this.hb); this.hb = setInterval(() => this.beat(), 20e3); this.ui(); this.pump();
    if (local) local.getVideoTracks().forEach(t => t.onended = () => { if (o.screen) this.leave(); }); },
  beat() { const r = this.room; if (!r) return; return Store.put('rtc', 'm' + this.key(r.id + '_' + Store.uid), { room: r.id, t: 'member', from: Store.uid, role: r.role, title: r.title, video: r.video, ts: now(), started: r.started }); },
  async leave() { const r = this.room; if (!r) return; this.room = null; clearInterval(this.hb); r.peers.forEach(p => { try { p.pc.close(); } catch (e) {} }); this.stopLocal(r);
    try { await Store.del('rtc', 'm' + this.key(r.id + '_' + Store.uid)); } catch (e) {}
    for (const s of Store.all('rtc')) if (s.from === Store.uid && s.room === r.id) Store.del('rtc', s.id).catch(() => {});
    const box = document.getElementById('rtcbox'); if (box) box.remove(); },
  stopLocal(r = this.room) { if (r && r.local) r.local.getTracks().forEach(t => t.stop()); },
  // Who connects to whom: everyone in a room connects to everyone, except stream viewers, who only connect to the host.
  wants(a, b) { if (a.role === 'viewer' && b.role === 'viewer') return false; return true; },
  offerer(a, b) { if (a.role === 'host') return a.from; if (b.role === 'host') return b.from; return a.from < b.from ? a.from : b.from; },
  peer(uid) { const r = this.room; let p = r.peers.get(uid); if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: this.ice() }); p = { pc, uid, stream: new MediaStream(), n: 0, born: now() }; r.peers.set(uid, p);
    if (r.local) r.local.getTracks().forEach(t => pc.addTrack(t, r.local));
    pc.ontrack = e => { e.streams[0] ? e.streams[0].getTracks().forEach(t => { if (!p.stream.getTracks().includes(t)) p.stream.addTrack(t); }) : p.stream.addTrack(e.track); this.ui(); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) { r.peers.delete(uid); try { pc.close(); } catch (e) {} this.ui(); } else this.ui(); };
    return p; },
  gathered(pc) { return new Promise(res => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 2500); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); }); },
  async offer(uid) { const r = this.room, p = this.peer(uid); if (p.offered) return; p.offered = true;
    if (r.role === 'viewer') { p.pc.addTransceiver('audio', { direction: 'recvonly' }); p.pc.addTransceiver('video', { direction: 'recvonly' }); }
    await p.pc.setLocalDescription(await p.pc.createOffer()); await this.gathered(p.pc); await this.send(uid, 'offer', p.pc.localDescription.toJSON ? p.pc.localDescription.toJSON() : { type: 'offer', sdp: p.pc.localDescription.sdp }); },
  async pump() { const r = this.room;
    // incoming calls
    for (const s of Store.all('rtc')) { if (s.t === 'ring' && s.to === Store.uid && now() - s.ts < 40e3 && !this.rang.has(s.id)) { this.rang.add(s.id); this.incoming(s); } }
    if (!r) return; const mine = { from: Store.uid, role: r.role };
    for (const m of this.members()) { if (m.from === Store.uid || r.peers.has(m.from) || !this.wants(mine, m)) continue; if (this.offerer(mine, m) === Store.uid) this.offer(m.from).catch(e => console.warn('offer', e)); }
    for (const s of Store.all('rtc').filter(x => x.room === r.id && x.to === Store.uid && !this.seen.has(x.id)).sort((a, b) => a.ts - b.ts)) { this.seen.add(s.id);
      try { if (s.t === 'offer') { const p = this.peer(s.from); await p.pc.setRemoteDescription(s.d); await p.pc.setLocalDescription(await p.pc.createAnswer()); await this.gathered(p.pc); await this.send(s.from, 'answer', { type: 'answer', sdp: p.pc.localDescription.sdp }); }
        if (s.t === 'answer') { const p = r.peers.get(s.from); if (p && p.pc.signalingState === 'have-local-offer') await p.pc.setRemoteDescription(s.d); }
        if (s.t === 'decline') { toast(`${Names.of(s.from)} can't take your call right now.`); if (r.id.startsWith('call:') && this.members().length <= 1) this.leave(); }
      } catch (e) { console.warn('signal', e); } }
    // drop people who left
    const here = new Set(this.members().map(m => m.from)); for (const [uid, p] of r.peers) if (!here.has(uid) && now() - (p.born || 0) > 10e3) { try { p.pc.close(); } catch (e) {} r.peers.delete(uid); }
    this.ui(); },
  // ---- calls between friends ----
  async call(uid, video) { if (!this.ready()) return; if (!isFriend(uid)) return toast('You can call people who are your friends.'); if (blockedSet().has(uid)) return;
    const id = 'call:' + [Store.uid, uid].sort().join(':') + ':' + Date.now().toString(36); await this.join(id, { video, title: (video ? 'Video call with ' : 'Call with ') + Names.of(uid), max: 2 });
    if (this.room) { await this.send(uid, 'ring', { video, room: id }); toast('Calling ' + Names.of(uid) + '…');
      setTimeout(() => { if (this.room && this.room.id === id && this.room.peers.size === 0) { toast('No answer.'); this.leave(); } }, 40e3); } },
  incoming(s) { if (blockedSet().has(s.from) || (typeof Family !== 'undefined' && Family.on())) return; const video = s.d && s.d.video;
    const bar = document.createElement('div'); bar.className = 'rtcring'; bar.setAttribute('role', 'alertdialog'); bar.innerHTML = `${avatar(s.from, 40)}<div><b>${esc(Names.of(s.from))}</b><small>${video ? 'Video call' : 'Voice call'}</small></div><button class="btn hot" data-a="yes">Answer</button><button class="btn" data-a="no">Decline</button>`;
    document.body.appendChild(bar); let tone = setInterval(() => { try { beep(660, 0.15, 'sine', 0.05); setTimeout(() => beep(880, 0.15, 'sine', 0.05), 200); } catch (e) {} }, 1500);
    const end = () => { clearInterval(tone); bar.remove(); }; setTimeout(end, 40e3);
    bar.onclick = async e => { const a = e.target.closest('[data-a]'); if (!a) return; end(); if (a.dataset.a === 'yes') await this.join(s.room, { video, title: (video ? 'Video call with ' : 'Call with ') + Names.of(s.from), max: 2 }); else Store.put('rtc', 's' + uid8(), { room: s.room, from: Store.uid, to: s.from, t: 'decline', ts: now() }); }; },
  // ---- live streams ----
  streams() { const hosts = Store.all('rtc').filter(x => x.t === 'member' && x.role === 'host' && x.room.startsWith('live:') && now() - x.ts < 50e3); return hosts.map(h => ({ ...h, viewers: Store.all('rtc').filter(x => x.t === 'member' && x.room === h.room && x.role === 'viewer' && now() - x.ts < 50e3).length })); },
  goLive(screen) { const box = modal(`<h2>Go live</h2><p>Stream your ${screen ? 'screen' : 'camera'} to up to 25 viewers. Everyone can see your stream in Live games.</p><label class="fld">Title<input id="ltitle" maxlength="70" value="${esc(Names.of(Store.uid))} is playing"></label>${screen ? '<label class="chk"><input type="checkbox" id="lmic" checked> Include my microphone</label>' : ''}<p class="muted small">Please follow the community guidelines. Streams can be reported.</p><div class="row-btns"><button class="btn hot" id="lgo">Start streaming</button></div>`);
    box.querySelector('#lgo').onclick = () => { const t = box.querySelector('#ltitle').value.trim().slice(0, 70) || 'Live on David’s Game World', mic = box.querySelector('#lmic'); closeModal(); this.join('live:' + Store.uid, { role: 'host', screen, video: !screen, withMic: mic && mic.checked, title: t, max: 1, chat: 'live:' + Store.uid }); }; },
  watch(hostUid) { const h = this.streams().find(s => s.from === hostUid); if (!h) return toast('That stream has ended.'); this.join(h.room, { role: 'viewer', title: h.title, video: true, chat: h.room }); },
  // ---- the floating call window ----
  ui() { const r = this.room; let box = document.getElementById('rtcbox'); if (!r) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'rtcbox'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Call'); document.body.appendChild(box);
      box.onclick = e => { const b = e.target.closest('[data-rc]'); if (!b) return; const a = b.dataset.rc, L = this.room && this.room.local;
        if (a === 'leave') this.leave(); if (a === 'min') box.classList.toggle('min');
        if (a === 'mic' && L) { L.getAudioTracks().forEach(t => t.enabled = !t.enabled); this.ui(); } if (a === 'cam' && L) { L.getVideoTracks().forEach(t => t.enabled = !t.enabled); this.ui(); }
        if (a === 'report') { const h = this.members().find(m => m.role === 'host'); report('user', h ? h.from : '', 'Live stream: ' + (this.room.title || '')); } };
      box.innerHTML = '<div class="rtchead"></div><div class="rtcgrid"></div><div class="rtcchat"></div><div class="rtcctl"></div>'; }
    const people = [...r.peers.values()], L = r.local, micOn = L && L.getAudioTracks().some(t => t.enabled), camOn = L && L.getVideoTracks().some(t => t.enabled);
    box.querySelector('.rtchead').innerHTML = `<b>${esc(r.title)}</b><small>${r.role === 'host' ? `${this.members().filter(m => m.role === 'viewer').length} watching` : r.role === 'viewer' ? 'Live' : `${people.filter(p => p.pc.connectionState === 'connected').length + 1} in the call`}</small><button class="btn sm ghost" data-rc="min" aria-label="Minimise">–</button>`;
    const grid = box.querySelector('.rtcgrid'), want = new Set();
    const tile = (k, stream, label, muted) => { want.add(k); let t = grid.querySelector(`[data-k="${CSS.escape(k)}"]`); if (!t) { t = document.createElement('div'); t.className = 'rtctile'; t.dataset.k = k; t.innerHTML = `<video autoplay playsinline ${muted ? 'muted' : ''}></video><span></span>`; grid.appendChild(t); }
      const v = t.querySelector('video'); if (v.srcObject !== stream) { v.srcObject = stream; v.play && v.play().catch(() => {}); } t.querySelector('span').textContent = label; t.classList.toggle('novid', !stream || !stream.getVideoTracks().some(x => x.enabled && x.readyState === 'live')); };
    if (L && r.role !== 'viewer') tile('me', L, 'You', true);
    people.forEach(p => tile(p.uid, p.stream, Names.of(p.uid) + (p.pc.connectionState === 'connected' ? '' : ' · connecting…'), false));
    grid.querySelectorAll('.rtctile').forEach(t => { if (!want.has(t.dataset.k)) t.remove(); });
    if (r.chat && !box.querySelector('.rtcchat').dataset.on) { box.querySelector('.rtcchat').dataset.on = 1; }
    box.querySelector('.rtcctl').innerHTML = `${L && L.getAudioTracks().length ? `<button class="btn sm ${micOn ? '' : 'hot'}" data-rc="mic">${micOn ? 'Mute' : 'Unmute'}</button>` : ''}${L && L.getVideoTracks().length && !r.id.startsWith('live:') ? `<button class="btn sm ${camOn ? '' : 'hot'}" data-rc="cam">${camOn ? 'Camera off' : 'Camera on'}</button>` : ''}${r.role === 'viewer' ? '<button class="btn sm ghost" data-rc="report">Report</button>' : ''}${r.chat ? `<a class="btn sm" href="#live-${esc(r.chat.slice(5))}">Chat</a>` : ''}<button class="btn sm danger" data-rc="leave">${r.role === 'host' ? 'End stream' : 'Leave'}</button>`; } };

// Route database changes for 'rtc' to the call engine instead of re-drawing the page
{ const prev = Store.onChange; Store.onChange = k => { if (k === 'rtc') { clearTimeout(RTC.pumpT); RTC.pumpT = setTimeout(() => RTC.pump(), 60); if (App.view === 'tv' || App.view === 'live') prev(k); return; } if (k === '*') setTimeout(() => RTC.pump(), 60); prev(k); }; }
setInterval(() => { if (Store.mode === 'shared') RTC.pump(); }, 4000);
window.addEventListener('beforeunload', () => { if (RTC.room) RTC.leave(); });

// ---- entry points: tables, profiles, live games ----
if (typeof Tbl !== 'undefined') { const h = Tbl.extrasHTML.bind(Tbl), c = Tbl.extrasClick.bind(Tbl);
  Tbl.extrasHTML = t => { let s = h(t); const mine = arr(t.seats).includes(Store.uid); if (!mine && !(RTC.room && RTC.room.id === 'table:' + t.id)) return s;
    const inRoom = RTC.room && RTC.room.id === 'table:' + t.id, talking = Store.all('rtc').filter(x => x.t === 'member' && x.room === 'table:' + t.id && now() - x.ts < 50e3).length;
    const btns = inRoom ? '<button class="btn sm danger" data-x="rtcleave">Leave voice</button>' : `<button class="btn sm" data-x="rtcvoice">Join voice chat</button><button class="btn sm" data-x="rtcvideo">Join video chat</button>${talking ? `<span class="pill on">${talking} talking</span>` : ''}`;
    return s ? s.replace('<div class="textras">', `<div class="textras">${btns}`) : `<div class="textras">${btns}</div>`; };
  Tbl.extrasClick = async (t, e) => { const b = e.target.closest('[data-x]'); if (b && /^rtc/.test(b.dataset.x)) { const x = b.dataset.x; if (x === 'rtcleave') await RTC.leave(); else await RTC.join('table:' + t.id, { video: x === 'rtcvideo', title: (GAME[t.game] || { name: 'Table' }).name + ' table', max: 8 }); render(false); return; } return c(t, e); }; }
if (VIEWS.u) { const orig = VIEWS.u.render.bind(VIEWS.u);
  VIEWS.u.render = function (el, id) { orig(el, id); id = id || Store.uid; if (id === Store.uid || !isFriend(id)) return; const dm = el.querySelector('#dm'); if (!dm) return;
    dm.insertAdjacentHTML('afterend', '<button class="btn" id="vcall">Call</button><button class="btn" id="vvid">Video call</button>'); el.querySelector('#vcall').onclick = () => RTC.call(id, false); el.querySelector('#vvid').onclick = () => RTC.call(id, true); }; }
if (VIEWS.tv) { const orig = VIEWS.tv.render.bind(VIEWS.tv);
  VIEWS.tv.render = function (el) { orig(el); const band = el.querySelector('.band'); if (!band) return; const ss = RTC.streams();
    band.querySelector('.lead').insertAdjacentHTML('afterend', `<h2>Live streams <small>${ss.length}</small></h2><div class="row-btns"><button class="btn hot" data-live="cam">Go live with camera</button><button class="btn" data-live="screen">Stream my screen</button></div><div class="tables">${ss.map(s => `<a class="tcard" href="#live-${esc(s.from)}"><span class="art">${avatar(s.from, 40)}</span><span><b>${esc(s.title || 'Live')}</b><small>${esc(Names.of(s.from))} · ${s.viewers} watching · started ${ago(s.started || s.ts)}</small></span><span class="pill hot">LIVE</span></a>`).join('') || '<p class="muted">Nobody is streaming right now. Start the first stream!</p>'}</div>`);
    band.querySelectorAll('[data-live]').forEach(b => b.onclick = () => { if (RTC.ready()) RTC.goLive(b.dataset.live === 'screen'); }); }; }
VIEWS.live = { render(el, host) { const s = RTC.streams().find(x => x.from === host);
  el.innerHTML = `<section class="band"><a class="back" href="#tv">← Live games</a><h1>${s ? esc(s.title || 'Live') : 'Stream ended'}</h1><p class="lead">${s ? `${avatar(host, 28)} ${nameLink(host)} · <span class="pill hot">LIVE</span> · ${s.viewers} watching` : `${nameLink(host)} isn't live right now.`}</p>
    ${s && !(RTC.room && RTC.room.id === s.room) && host !== Store.uid ? '<button class="btn hot" id="lwatch">Watch stream</button>' : ''}<h2>Live chat</h2><div id="lchat"></div></section>`;
  const w = el.querySelector('#lwatch'); if (w) w.onclick = () => RTC.watch(host); chatPane(el.querySelector('#lchat'), 'live:' + host, { compact: true }); } };
VIEWS.live.update = () => { chatPane.refresh && chatPane.refresh(); };
