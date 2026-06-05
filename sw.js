/* ================================================================
   sw.js — PJ Tecnologia Service Worker  (v4 — robusto)
   ================================================================
   Melhorias aplicadas:
   • notificationclick: abre o app ao tocar na notificação
   • notificationclose: log para debug
   • push: recebe push vindo do servidor FCM/Pipedream diretamente
   • fetch: cache-first para assets estáticos (offline resiliente)
   • SW_PING: responde keep-alive do app
   • SKIP_WAITING: ativação imediata sem esperar fechar abas
   ================================================================ */

const CACHE_NAME   = 'pjtech-v4';
const STATIC_CACHE = [
  './',
  './index.html',
  './icon-192.png',
  './manifest.json'
];

/* ── Instalação: pré-cache dos assets essenciais ── */
self.addEventListener('install', event => {
  self.skipWaiting(); // ativa imediatamente sem esperar
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE).catch(() => {}))
  );
});

/* ── Ativação: limpa caches antigos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // assume controle imediato de todas as abas
  );
});

/* ── Fetch: cache-first para assets, network-first para dados ── */
self.addEventListener('fetch', event => {
  // Ignora requests não-GET e cross-origin
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Network-first para o index.html (sempre fresco)
  if (event.request.url.endsWith('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first para ícones, fontes e manifest
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

/* ── Push: recebe notificação do servidor (app fechado/background) ── */
self.addEventListener('push', event => {
  let title = '🚨 PJ Tecnologia';
  let body  = 'Novo alerta de serviço';
  let data  = { url: self.location.origin };
  let tag   = 'pjtech-push-' + Date.now();

  try {
    if (event.data) {
      const payload = event.data.json();
      title = payload.title || title;
      body  = payload.body  || body;
      data  = payload.data  || data;
      tag   = payload.tag   || tag;
    }
  } catch(e) {
    // payload não é JSON — usa como texto
    if (event.data) body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:               '/icon-192.png',
      badge:              '/icon-192.png',
      tag,
      renotify:           true,
      requireInteraction: true,          // não some no Android
      vibrate:            [300, 100, 300, 100, 500],
      silent:             false,
      actions: [
        { action: 'open',    title: '📋 Abrir App' },
        { action: 'dismiss', title: '✖ Fechar'    }
      ],
      data
    })
  );
});

/* ── Notificationclick: abre/foca o app ao tocar na notificação ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se já tem uma aba do app aberta, foca nela
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abre uma nova aba
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );

  // Avisa o app (se aberto) para tocar o som de alerta
  clients.matchAll({ type: 'window' }).then(clientList => {
    clientList.forEach(client => client.postMessage({ type: 'PLAY_ALERT_SOUND' }));
  });
});

/* ── Notificationclose: log para debug ── */
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

/* ── Mensagens do app principal ── */
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SW_PING':
      // Responde o keep-alive para confirmar que o SW está vivo
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'SW_PONG', ts: Date.now() });
      }
      break;

    case 'SHOW_NOTIFICATION':
      // App pede pro SW mostrar uma notificação (garante que aparece mesmo em background)
      const { title, body, tag, data } = event.data;
      self.registration.showNotification(title || '🚨 PJ Tecnologia', {
        body:               body || '',
        icon:               '/icon-192.png',
        badge:              '/icon-192.png',
        tag:                tag || 'pjtech-sw-msg',
        renotify:           true,
        requireInteraction: true,
        vibrate:            [300, 100, 300, 100, 500],
        silent:             false,
        actions: [
          { action: 'open',    title: '📋 Abrir App' },
          { action: 'dismiss', title: '✖ Fechar'    }
        ],
        data: data || { url: self.location.origin }
      });
      break;
  }
});
