/* ================================================================
   FIREBASE MESSAGING SERVICE WORKER — PJ Tecnologia
   Responsável por receber notificações FCM com o app fechado
   ================================================================ */

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDojh97p_R6lkggmO95KcNpCSWhx2po1uw",
  authDomain:        "novo-servico.firebaseapp.com",
  projectId:         "novo-servico",
  storageBucket:     "novo-servico.firebasestorage.app",
  messagingSenderId: "845478678895",
  appId:             "1:845478678895:web:7b5ec57ea5bbce8d78d89a"
});

const messaging = firebase.messaging();

/* ─── Recebe mensagens em BACKGROUND (app fechado/minimizado) ─── */
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};

  const notificationTitle = title || '🔔 PJ Tecnologia';
  const notificationOptions = {
    body:    body || 'Novo alerta de serviço.',
    icon:    './icon-192.png',
    badge:   './icon-192.png',
    tag:     'pjtech-fcm-bg',
    vibrate: [200, 100, 200],
    data:    payload.data || { url: self.location.origin }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ─── Clique na notificação: abre o app ─── */
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
