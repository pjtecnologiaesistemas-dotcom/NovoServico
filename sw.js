/* ============================================================
   sw.js — Service Worker PJ Tecnologia
   Versão: 3.0 — com suporte a som via postMessage ao app
   ============================================================ */

const CACHE_NAME = 'pjtech-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('gstatic.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ── Função central: mostra notificação E pede ao app para tocar som ── */
async function showAndSound(title, body, tag, data) {
  // 1. Mostra a notificação (vibra, silent:false deixa o Android usar o som padrão do canal)
  await self.registration.showNotification(title, {
    body,
    icon:     'icon-192.png',
    badge:    'icon-192.png',
    tag:      tag || 'pjtech-alert',
    renotify: true,
    silent:   false,          // Android usa o som de notificação do sistema
    vibrate:  [200, 100, 200, 100, 200],
    data:     data || { url: self.location.origin }
  });

  // 2. Avisa todos os clientes abertos para tocar o som customizado via Web Audio
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({ type: 'PLAY_ALERT_SOUND' });
  });
}

/* ── PUSH (Web Push Protocol) ── */
self.addEventListener('push', event => {
  let d = { title: '🔔 PJ Tecnologia', body: 'Nova notificação', tag: 'pjtech' };
  if (event.data) {
    try { d = { ...d, ...event.data.json() }; }
    catch(e) { d.body = event.data.text(); }
  }
  event.waitUntil(showAndSound(d.title, d.body, d.tag, d.data));
});

/* ── MESSAGE: comandos vindos do app ── */
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data;
    event.waitUntil(
      showAndSound(
        title || '🔔 PJ Tecnologia',
        body  || '',
        tag   || 'pjtech-alert',
        data  || { url: self.location.origin }
      )
    );
  }

  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── NOTIFICATIONCLICK ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if (c.url.startsWith(self.location.origin) && 'focus' in c) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
