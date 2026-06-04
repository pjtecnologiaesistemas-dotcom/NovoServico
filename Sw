/* ============================================================
   sw.js — Service Worker PJ Tecnologia
   Versão: 2.0
   • Exibe notificações push mesmo com o app em background
   • Ao clicar na notificação, abre/foca o app
   • Cache básico para funcionar offline (shell do app)
   ============================================================ */

const CACHE_NAME = 'pjtech-v2';

/* ── INSTALL: pré-cacheia os arquivos essenciais ── */
self.addEventListener('install', event => {
  console.log('[SW] Install');
  // Força ativação imediata sem esperar guias antigas fecharem
  self.skipWaiting();
});

/* ── ACTIVATE: assume o controle de todas as guias ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    Promise.all([
      // Remove caches antigos
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      // Assume controle imediato de todas as guias abertas
      self.clients.claim()
    ])
  );
});

/* ── FETCH: serve do cache quando offline (network-first) ── */
self.addEventListener('fetch', event => {
  // Só intercepta requisições do mesmo origem
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Não intercepta chamadas ao Firestore/Firebase
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cacheia a resposta bem-sucedida
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))   // fallback: cache
  );
});

/* ── PUSH: recebe push do servidor (Web Push Protocol) ── */
self.addEventListener('push', event => {
  let data = { title: '🔔 PJ Tecnologia', body: 'Nova notificação', tag: 'pjtech' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch(e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    'icon-192.png',
      badge:   'icon-192.png',
      tag:     data.tag || 'pjtech',
      renotify: true,
      vibrate: [200, 100, 200],
      data:    data.data || { url: self.location.origin }
    })
  );
});

/* ── NOTIFICATIONCLICK: abre/foca o app ao clicar ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Se já tem uma guia do app aberta, foca nela
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abre uma nova guia
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});

/* ── MESSAGE: recebe comandos do app principal ──
   Mantido para compatibilidade, mas agora usamos
   registration.showNotification() diretamente do app.            */
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon, data } = event.data;
    self.registration.showNotification(title || '🔔 PJ Tecnologia', {
      body:    body || '',
      icon:    icon || 'icon-192.png',
      badge:   'icon-192.png',
      tag:     tag  || 'pjtech-alert',
      renotify: true,
      vibrate: [200, 100, 200],
      data:    data || { url: self.location.origin }
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
