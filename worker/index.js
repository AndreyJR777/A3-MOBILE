const CACHE_NAME = 'naufrago-cache-v1';

// Listen to messages from the main thread (React App)
let clientPort;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_PORT') {
    clientPort = event.ports[0];
    clientPort.postMessage({ type: 'WORKER_READY', payload: 'Service Worker Connected!' });
  }

  if (event.data && event.data.type === 'START_COOLDOWN') {
    const { missionType, durationSeconds } = event.data.payload;
    
    // Simulate cooldown in background
    setTimeout(() => {
      // 1. Send message back via Channel Messaging
      if (clientPort) {
        clientPort.postMessage({ type: 'COOLDOWN_FINISHED', payload: missionType });
      }

      // 2. Trigger a System Notification
      const titles = {
        water: '💧 Cooldown de Água Finalizado!',
        stretch: '🧘 Hora de Alongar!',
        break: '🚶 Pausa Ativa Disponível!'
      };
      
      const bodies = {
        water: 'Seu núcleo de refrigeração precisa de manutenção. Beba água!',
        stretch: 'O suporte de vida aguarda sua calibragem. Faça um alongamento.',
        break: 'O motor esfriou. Levante-se e caminhe um pouco!'
      };

      self.registration.showNotification(titles[missionType], {
        body: bodies[missionType],
        icon: 'https://www.google.com/s2/favicons?domain=nasa.gov&sz=192',
        vibrate: [200, 100, 200],
        tag: `mission-${missionType}`
      });
    }, durationSeconds * 1000);
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
