/* ================================================================
   firebase-messaging-sw.js — PJ Tecnologia  (v4)
   ================================================================
   OBRIGATÓRIO para o FCM entregar notificações com o app fechado.
   Este arquivo DEVE estar na raiz do site (mesma pasta do index.html).

   Melhorias aplicadas:
   • Usa firebase-app-compat + firebase-messaging-compat (estáveis)
   • onBackgroundMessage: exibe notificação com requireInteraction
   • notificationclick: abre/foca o app
   • Substitua os valores de firebaseConfig pelos do seu projeto
   ================================================================ */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

/* ──────────────────────────────────────────────
   SUBSTITUA pelos dados do seu projeto Firebase
   (Console Firebase → Configurações do Projeto → Seus apps → CDN)
   ────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyDojh97p_R6lkggmO95KcNpCSWhx2po1uw",
  authDomain:        "novo-servico.firebaseapp.com",
  projectId:         "novo-servico",
  storageBucket:     "novo-servico.firebasestorage.app",
  messagingSenderId: "845478678895",
  appId:             "1:845478678895:web:7b5ec57ea5bbce8d78d89a"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

/* ── Notificações em background (app fechado / tela bloqueada) ── */
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Mensagem em background recebida:', payload);

  const title = (payload.notification && payload.notification.title)
    ? payload.notification.title
    : (payload.data && payload.data.title) || '🚨 PJ Tecnologia';

  const body  = (payload.notification && payload.notification.body)
    ? payload.notification.body
    : (payload.data && payload.data.body)  || 'Novo alerta de serviço';

  const url   = (payload.data && payload.data.url) || self.location.origin;

  return self.registration.showNotification(title, {
    body,
    icon:               '/icon-192.png',
    badge:              '/badge-96.png',
    tag:                'fcm-bg-' + Date.now(),
    renotify:           true,
    requireInteraction: true,          // não some automaticamente no Android
    vibrate:            [300, 100, 300, 100, 500],
    silent:             false,
    actions: [
      { action: 'open',    title: '📋 Abrir App' },
      { action: 'dismiss', title: '✖ Fechar'    }
    ],
    data: { url, svcId: payload.data && payload.data.svcId }
  });
});

/* ── Toque na notificação: abre/foca o app ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
