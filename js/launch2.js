// Launch pack 2: founder links and contact email, the install popup with a real file for every device, the logo
// downloads in the developer page, and resetting a player's account.
const CONTACT_EMAIL = 'davidsapplicationstore@gmail.com';
const FOUNDER = { name: 'David Li', ig: 'https://www.instagram.com/davidlcalifornia/', igName: '@davidlcalifornia', fb: 'https://www.facebook.com/profile.php?id=829503', fbName: 'David Li' };
{ const g = Config.get; Config.get = function () { const c = g.call(this); if (!c.contactEmail) c.contactEmail = CONTACT_EMAIL; return c; }; }

// Inside the Claude viewer, pages may only save files through its "downloads" capability (the viewer confirms each one);
// everywhere else (Base44, the public site) a normal browser download is used.
const SAVE_OK = /\.(gif|png|jpe?g|webp|mp4|webm|mov|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip|fig)$/i;
async function saveBlob(name, blob) {
  let dl = null; try { if (window.claude && window.claude.use && !window.B44) dl = await window.claude.use('downloads'); } catch (e) {}
  if (dl) { let fname = name, data = blob;
    if (!SAVE_OK.test(name) && typeof AppIcon !== 'undefined') { data = AppIcon.zip([[name, new Uint8Array(await blob.arrayBuffer())]]); fname = name.replace(/\.[^.]+$/, '') + '.zip'; }
    try { await dl.save({ filename: fname, data }); toast('Saved ' + fname + '.'); return true; }
    catch (e) { const c = e && e.code; if (c === 'declined') { toast('Download cancelled.'); return false; } if (c === 'rate_limited') { toast('Another save is still waiting for your answer.'); return false; } if (c === 'host_unavailable') { toast('This app can’t save files. Open the site in a browser or on a computer to download.'); return false; } if (c === 'too_large') { toast('That file is too large to save here. Try a smaller size.'); return false; } } }
  const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return true; }

// ---------- Follow the founder (About page and footer) ----------
const IC_IG = '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
const IC_FB = '<svg viewBox="0 0 24 24" aria-hidden="true" class="ic ficon"><path fill="currentColor" stroke="none" d="M12 2a10 10 0 00-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0012 2z"/></svg>';
const followHTML = (title = `Follow the Founder and CEO ${FOUNDER.name}`) => `<div class="follow"><h3>${esc(title)}</h3><div class="followbtns"><a class="flwbtn" href="${FOUNDER.ig}" target="_blank" rel="noopener">${IC_IG}<span>Follow on Instagram</span><small>· ${esc(FOUNDER.igName)}</small></a><a class="flwbtn" href="${FOUNDER.fb}" target="_blank" rel="noopener">${IC_FB}<span>Follow on Facebook</span><small>· ${esc(FOUNDER.fbName)}</small></a></div></div>`;
{ const ab = INFO.about[1]; INFO.about[1] = () => ab() + `<h2>Follow us</h2>${followHTML()}<h2>Contact</h2><p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>`; }
{ const ft = footer; footer = function () { ft(); const fc = document.querySelector('#foot .fcols'); if (fc && !document.querySelector('#foot .follow')) fc.insertAdjacentHTML('afterend', `<div class="ffollow">${followHTML()}<p class="small center">Contact us: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p></div>`); }; }

// ---------- Install: a real file for every platform ----------
const Inst = {
  url() { return Config.url().replace(/#.*$/, ''); },
  name: 'David’s Game World', file: 'Davids-Game-World',
  uuid() { return crypto.randomUUID ? crypto.randomUUID().toUpperCase() : 'A' + uid8() + '-0000-4000-8000-' + uid8() + uid8(); },
  async iconB64() { try { const r = await fetch('apple-touch-icon.png'); const b = await r.blob(); return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(b); }); } catch (e) { return ''; } },
  xml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
  async build(os) { const u = this.url(), n = this.name;
    if (os === 'windows') return [`${n}.url`, new Blob([`[InternetShortcut]\r\nURL=${u}\r\nIconIndex=0\r\nIconFile=${new URL('favicon.ico', u).href}\r\n`], { type: 'application/internet-shortcut' })];
    if (os === 'mac') return [`${n}.webloc`, new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>URL</key><string>${this.xml(u)}</string></dict></plist>\n`], { type: 'application/x-webloc' })];
    if (os === 'ios') { const icon = await this.iconB64(), a = this.uuid(), b = this.uuid();
      return [`${this.file}.mobileconfig`, new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
<key>PayloadContent</key><array><dict><key>FullScreen</key><true/><key>IsRemovable</key><true/><key>Precomposed</key><true/><key>Label</key><string>${this.xml(n)}</string><key>URL</key><string>${this.xml(u)}</string>${icon ? `<key>Icon</key><data>${icon}</data>` : ''}
<key>PayloadType</key><string>com.apple.webClip.managed</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>com.davidsgameworld.webclip.${b}</string><key>PayloadUUID</key><string>${b}</string><key>PayloadDisplayName</key><string>${this.xml(n)}</string></dict></array>
<key>PayloadDisplayName</key><string>${this.xml(n)}</string><key>PayloadDescription</key><string>Adds ${this.xml(n)} to your Home Screen.</string><key>PayloadOrganization</key><string>David’s Application Store</string><key>PayloadIdentifier</key><string>com.davidsgameworld.install</string><key>PayloadType</key><string>Configuration</string><key>PayloadUUID</key><string>${a}</string><key>PayloadVersion</key><integer>1</integer><key>PayloadRemovalDisallowed</key><false/>
</dict></plist>\n`], { type: 'application/x-apple-aspen-config' })]; }
    if (os === 'linux') { const sh = `#!/bin/sh\n# Installs ${n} as an app in your Linux applications menu.\nset -e\nAPP_DIR="$HOME/.local/share/applications"\nICON_DIR="$HOME/.local/share/icons"\nmkdir -p "$APP_DIR" "$ICON_DIR"\nICON="$ICON_DIR/davids-game-world.png"\n(curl -fsSL "${new URL('icon-512.png', u).href}" -o "$ICON" || wget -qO "$ICON" "${new URL('icon-512.png', u).href}") 2>/dev/null || ICON=applications-games\nBROWSER=""\nfor b in google-chrome chromium chromium-browser microsoft-edge brave-browser; do command -v $b >/dev/null 2>&1 && BROWSER=$b && break; done\nif [ -n "$BROWSER" ]; then EXEC="$BROWSER --app=${u}"; else EXEC="xdg-open ${u}"; fi\ncat > "$APP_DIR/davids-game-world.desktop" <<EOF\n[Desktop Entry]\nType=Application\nName=${n}\nComment=Play games, make friends\nExec=$EXEC\nIcon=$ICON\nTerminal=false\nCategories=Game;\nEOF\nchmod +x "$APP_DIR/davids-game-world.desktop"\nupdate-desktop-database "$APP_DIR" 2>/dev/null || true\necho "${n} is installed. Find it in your applications menu."\n`;
      return [`${this.file}-install.sh`, new Blob([sh], { type: 'application/x-sh' })]; }
    if (os === 'desktop') return [`${this.file}.desktop`, new Blob([`[Desktop Entry]\nType=Application\nName=${n}\nComment=Play games, make friends\nExec=xdg-open ${u}\nIcon=applications-games\nTerminal=false\nCategories=Game;\n`], { type: 'application/x-desktop' })];
    if (os === 'android' || os === 'chromeos') return [`${this.file}.html`, new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${n}</title><meta http-equiv="refresh" content="0;url=${this.xml(u)}"></head><body style="font-family:sans-serif;text-align:center;padding:40px"><p>Opening ${n}…</p><p><a href="${this.xml(u)}">Tap here if it doesn’t open</a></p></body></html>`], { type: 'text/html' })];
    return null; },
  ROWS: [['windows', 'Download for Windows', 'David’s Game World.url', 'Save it to your Desktop (or pin it to Start). Double-click to open the game.', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
    ['ios', 'Download for iPhone / iPad', 'Davids-Game-World.mobileconfig', 'Open it in Safari, then go to Settings › Profile Downloaded › Install. The game appears on your Home Screen.', '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'],
    ['android', 'Download for Android', 'Install app', 'Installs straight from your browser: tap Install when asked. Or get it on Google Play when available.', '<rect x="6" y="3" width="12" height="18" rx="2.5"/><rect x="9" y="11" width="5" height="6" rx="1"/>'],
    ['mac', 'Download for Mac', 'David’s Game World.webloc', 'Drag it to your Dock or Desktop. Double-click to open the game.', '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>'],
    ['linux', 'Download for Linux', 'Davids-Game-World-install.sh', 'Run it once (sh Davids-Game-World-install.sh). The game appears in your applications menu.', '<path d="M5 7l5 5-5 5M12 19h7"/>'],
    ['chromeos', 'Install on Chromebook', 'Install app', 'Installs from Chrome and appears in your launcher.', '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M2 20h20"/>']],
  mine() { const p = Install.platform(); return p === 'iphone' || p === 'ipad' ? 'ios' : p === 'other' ? 'windows' : p; },
  async get(os) { const c = Config.get();
    if (os === 'android' || os === 'chromeos') { if (os === 'android' && c.apkUrl) { location.href = c.apkUrl; return; } if (c.play && c.play.pkg && os === 'android' && !Install.evt) { window.open(`https://play.google.com/store/apps/details?id=${encodeURIComponent(c.play.pkg)}`, '_blank', 'noopener'); return; }
      if (Install.evt) { try { Install.evt.prompt(); const r = await Install.evt.userChoice; if (r && r.outcome === 'accepted') { closeModal(); toast('Installing David’s Game World…'); } } catch (e) {} Install.evt = null; return; }
      const f = await this.build(os); saveBlob(f[0], f[1]); toast('Saved a shortcut. For the full app, open the browser menu and choose "Install app" or "Add to Home screen".'); return; }
    if (window.B44) { location.href = '/api/gy/install?os=' + os; return; }
    const f = await this.build(os); saveBlob(f[0], f[1]); toast(`Saved ${f[0]}.`); },
  open() { const pl = this.mine(), rows = [...this.ROWS.filter(r => r[0] === pl), ...this.ROWS.filter(r => r[0] !== pl && r[0] !== 'chromeos')], c = Config.get();
    const row = (r, rec) => `<button type="button" class="dlopt ${rec ? 'rec' : ''}" data-os="${r[0]}"><svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${r[4]}</svg><span><b>${esc(r[1])}</b><small>${esc(r[0] === 'android' && c.apkUrl ? 'Davids-Game-World.apk' : r[2])}</small></span><svg viewBox="0 0 24 24" class="ic" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg></button>`;
    const box = modal(`<div class="dlhead"><img src="icon-192.png" width="36" height="36" alt=""><h2>Install the App</h2></div><p class="muted">Add David’s Game World to your device for a full-screen game experience. Free, quick, and it opens in its own window.</p>
      ${Install.installed() ? '<p class="okbox">David’s Game World is already installed on this device.</p>' : ''}
      <h4 class="dlcap">Recommended for your device</h4>${row(rows[0], true)}<p class="small dlnote">${esc(rows[0][3])}</p>
      <h4 class="dlcap">Other devices</h4><div class="dllist">${rows.slice(1).map(r => row(r)).join('')}</div>
      ${(c.play && c.play.pkg) || (c.apple && c.apple.appId) ? `<div class="row-btns">${c.play.pkg ? `<a class="btn" href="https://play.google.com/store/apps/details?id=${esc(c.play.pkg)}" target="_blank" rel="noopener">Get it on Google Play</a>` : ''}${c.apple.appId ? `<a class="btn" href="https://apps.apple.com/app/id${esc(c.apple.appId)}" target="_blank" rel="noopener">Download on the App Store</a>` : ''}</div>` : ''}
      <details><summary>Or add it manually from your browser</summary>${Object.values(Install.STEPS).map(([n, st]) => `<h4>${esc(n)}</h4><ol>${st.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`).join('')}</details>
      <button class="btn wide" data-close="1">Close</button>`, 'dlbox');
    box.addEventListener('click', async e => { const b = e.target.closest('[data-os]'); if (!b) return; const note = box.querySelector('.dlnote'); const r = this.ROWS.find(x => x[0] === b.dataset.os); if (note && r) note.textContent = r[3]; b.disabled = true; try { await this.get(b.dataset.os); } finally { b.disabled = false; } }); } };
Install.open = () => Inst.open();

// ---------- Developer: logos with downloads ----------
const Logo = {
  svg(i, size = 1024, square = false) { let body = LOGOS[i][1]; if (square) body = body.replace(/<rect class="bg"[^>]*?fill="([^"]+)"[^>]*\/>/, '<rect width="100" height="100" fill="$1"/>'); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${body}</svg>`; },
  slug(i) { return String(i + 1).padStart(2, '0') + '-' + LOGOS[i][0].toLowerCase().replace(/[^a-z0-9]+/g, '-'); },
  png(i, square, size = 2048) { return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(new Blob([this.svg(i, size, square)], { type: 'image/svg+xml' })); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size); URL.revokeObjectURL(u); c.toBlob(b => b ? res(b) : rej(new Error('Could not draw the logo.')), 'image/png'); }; img.onerror = () => rej(new Error('Could not draw the logo.')); img.src = u; }); },
  async get(i, kind) { if (kind === 'svg') return saveBlob(this.slug(i) + '.svg', new Blob([this.svg(i)], { type: 'image/svg+xml' })); const sq = kind === 'square'; const b = await this.png(i, sq, +(LS.get('logoSize', 2048))); saveBlob(`${this.slug(i)}-${sq ? 'square' : 'rounded'}-${LS.get('logoSize', 2048)}.png`, b); } };
DEV_TABS.push(['logos', 'Logos']);
{ const orig = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { orig.call(this, el, tab); if (tab !== 'logos' || !Dev.allowed()) return; const pane = el.querySelector('.apane'); if (!pane) return; const sz = LS.get('logoSize', 2048);
    pane.innerHTML = `<h2>App logos</h2><p>20 logo concepts in the site’s colours. Download any of them as a large square PNG (full-bleed, for the App Store, Google Play and favicons), a PNG with rounded corners on a transparent background (for web pages and posts), or an SVG that scales to any size.</p>
      <label class="fld inline">PNG size<select id="logosz">${[1024, 2048, 4096].map(s => `<option value="${s}" ${s === sz ? 'selected' : ''}>${s} × ${s}</option>`).join('')}</select></label>
      <div class="logogrid">${LOGOS.map((l, i) => `<div class="logocard"><div class="logoimg">${Logo.svg(i, 160).replace('<svg ', '<svg role="img" aria-label="' + esc(l[0]) + ' logo" ')}</div><b>${String(i + 1).padStart(2, '0')} · ${esc(l[0])}</b><div class="row-btns"><button class="btn sm hot" data-lg="${i}|square">Square PNG</button><button class="btn sm" data-lg="${i}|rounded">Rounded PNG</button><button class="btn sm" data-lg="${i}|svg">SVG</button></div></div>`).join('')}</div>`;
    pane.onchange = e => { if (e.target.id === 'logosz') LS.set('logoSize', +e.target.value); };
    pane.onclick = async e => { const b = e.target.closest('[data-lg]'); if (!b) return; const [i, k] = b.dataset.lg.split('|'); b.disabled = true; try { await Logo.get(+i, k); } catch (er) { toast(er.message); } b.disabled = false; }; }; }

// ---------- Developer: reset a player's account to brand new ----------
const ResetUser = {
  async run(id) { if (window.B44) { const r = await B44.call('/api/gy/reset-user', { uid: id }); toast(r.message || 'Account reset.'); }
    else { for (const c of ['members', 'profiles']) { try { await Store.del(c, id); } catch (e) {} }
      Acct.all.delete(id); if (Store.mode === 'shared' && Store.db) { for (const c of ['accounts', 'feedback']) { try { await Store.db.collection(c).doc(id).delete(); } catch (e) {} } } else LS.set('c:accounts', Object.fromEntries(Acct.all));
      if (id === Store.uid) { Acct.me = null; LS.set('signed:' + id, false); } toast('Account reset. They can sign up again from scratch.'); }
    Store.onChange('accounts'); } };
{ const du = devUser; devUser = function (id) { du(id); const box = document.querySelector('#modal .mbox'); if (!box) return; box.insertAdjacentHTML('beforeend', `<div class="dangerzone"><h3>Reset this account</h3><p class="small">Erases this person’s sign-up, membership, profile, scores and settings so the account is back to brand new and they can sign up again. Payment records with the payment provider are kept. This can’t be undone.</p><button class="btn danger" id="rstu">Reset account</button></div>`);
    box.querySelector('#rstu').onclick = async e => { const b = e.target; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Press again to erase everything'; return; } b.disabled = true; try { await ResetUser.run(id); closeModal(); render(true); } catch (er) { toast(er.message); b.disabled = false; } }; }; }

// ---------- Developer: the hiding toggle, shown at the top of every developer tab ----------
{ const orig = VIEWS.developer.render; VIEWS.developer.render = function (el, tab) { orig.call(this, el, tab); if (!Dev.allowed()) return; const nav = el.querySelector('nav.tabs'); if (!nav || el.querySelector('.hidebar')) return;
    const on = LS.get('devHide', false), hidden = typeof Hide !== 'undefined' ? Hide.list().length : 0;
    nav.insertAdjacentHTML('beforebegin', `<div class="hidebar ${on ? 'on' : ''}"><label class="switch"><input type="checkbox" name="devHide" ${on ? 'checked' : ''}><span></span></label><div><b>Developer’s hiding toggle ${on ? 'is ON' : 'is off'}</b><small>When on, every game on the main page shows a Hide button in its top right corner. Press it to hide that game from the public (press again to show it). ${hidden} game${hidden === 1 ? ' is' : 's are'} hidden now.</small></div>${on ? '<a class="btn sm hot" href="#home">Go to the main page</a>' : ''}</div>`); }; }
