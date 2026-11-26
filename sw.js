// Offline support for the installed app: keeps the game files so the games work without a connection.
// Never caches sign-in, the database or payments: those always go to the network.
const CACHE = 'gameyard-v16';
const SHELL = ['./', './index.html', './manifest.webmanifest', './qr.png', './icon-192.png', './icon-512.png', './words.txt', './common.txt',
  './js/data.js', './js/games-board.js', './js/games-solo.js', './js/games-board2.js', './js/games-cards2.js', './js/games-solo2.js', './js/games3-board.js', './js/games3-cards.js', './js/games3-solo.js',
  './js/core.js', './js/app.js', './js/compete.js', './js/v2.js', './js/platform.js', './js/social.js', './js/account.js', './js/site.js', './js/rtc.js', './js/ugc.js', './js/compete2.js', './js/gamex.js', './js/party.js', './js/i18n.js', './js/chat2.js', './js/social2.js', './js/ops.js', './js/b44sdk.js', './js/b44.js', './js/launch.js'];
const LIVE = /^\/(api|login|logout|register|forgot-password|reset-password|mfa|oauth|ws-user-apps|_)/;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || LIVE.test(u.pathname) || u.search.includes('access_token')) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))); });
// Push notifications from the server, and opening Gameyard when one is tapped
self.addEventListener('push', e => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = { body: e.data && e.data.text() }; } e.waitUntil(self.registration.showNotification(d.title || 'Gameyard', { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || '/' } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/'; e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs.find(x => 'focus' in x); if (c) { c.navigate ? c.navigate(url) : null; return c.focus(); } return self.clients.openWindow(url); })); });
