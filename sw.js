/* ================================================================
   SERVICE WORKER — PJ Tecnologia · Novo Serviço
   Versão: 1.0.0
   ================================================================ */

const CACHE_NAME = 'pj-servicos-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ─── INSTALL ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

/* ─── ACTIVATE ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ─── FETCH: Network first, fallback cache ─── */
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ─── PUSH: recebe notificação ─── */
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch(e) {
    data = { title: '🔔 PJ Serviços', body: event.data ? event.data.text() : 'Nova notificação' };
  }

  const title   = data.title  || '🔔 PJ Tecnologia';
  const options = {
    body:     data.body    || 'Você tem um novo alerta.',
    icon:     './icon-192.png',
    badge:    './icon-192.png',
    tag:      data.tag     || 'pjtech-push',
    renotify: false,
    vibrate:  [200, 100, 200],
    data:     data.data    || { url: self.location.origin }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PLAY_ALERT_SOUND' }));
      });
    })
  );
});

/* ─── NOTIFICATIONCLICK: abre o app ao clicar ─── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

/* ─── MESSAGE: comandos do app principal ─── */
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data;
    self.registration.showNotification(title || '🔔 PJ Serviços', {
      body:    body || '',
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      tag:     tag  || 'pjtech-msg',
      vibrate: [200, 100, 200],
      data:    data || { url: self.location.origin }
    });
  }
});
