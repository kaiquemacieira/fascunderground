/* CRICRI Service Worker — push + background sync + offline shell */
/* global self, clients, caches */

const SW_VERSION = 'cricri-sw-v5';
const CACHE = 'cricri-shell-v5';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './tamagotchi.html',
  './programacao.html',
  './profile.html',
  './js/config.js',
  './js/a11y-core.js',
  './js/keyboard-nav.js',
  './js/touch-gestures.js',
  './js/footer.js',
  './js/tamagotchi.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
  console.info('[CRICRI SW] install', SW_VERSION);
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      // tenta periodic background sync (Chrome)
      try {
        if (self.registration.periodicSync) {
          await self.registration.periodicSync.register('cricri-tick', { minInterval: 15 * 60 * 1000 });
          await self.registration.periodicSync.register('cricri-data', { minInterval: 30 * 60 * 1000 });
          console.info('[CRICRI SW] periodicSync tags ok');
        }
      } catch (e) {
        console.info('[CRICRI SW] periodicSync indisponível', e && e.message);
      }
    })()
  );
  console.info('[CRICRI SW] activate', SW_VERSION);
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // network-first for HTML; cache-first for static
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  if (/\.(css|js|png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'cricri-tama-sync' || event.tag === 'cricri-sync') {
    event.waitUntil(
      (async () => {
        try {
          const n = await broadcast('CRICRI_BG_SYNC', event.tag);
          console.info('[CRICRI SW] background sync', event.tag, 'clients=', n);
        } catch (e) {
          await reportSyncFailure(event.tag, 'background-sync', e && e.message || e, null);
          throw e;
        }
      })()
    );
  }
});

async function reportSyncFailure(tag, phase, message, meta) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const payload = {
    type: 'CRICRI_SYNC_FAILURE',
    tag: tag || null,
    phase: phase || 'sw',
    message: String(message || 'erro'),
    meta: meta || null,
    at: Date.now()
  };
  list.forEach((c) => {
    try { c.postMessage(payload); } catch (_) {}
  });
  console.warn('[CRICRI SW] sync fail', payload);
  return list.length;
}

async function broadcast(type, tag) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach((c) => {
    try {
      c.postMessage({ type: type, tag: tag || null, at: Date.now() });
    } catch (_) {}
  });
  return list.length;
}

async function revalidateShell() {
  try {
    const cache = await caches.open(CACHE);
    await Promise.all(
      SHELL.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch (_) {}
      })
    );
  } catch (_) {}
}

self.addEventListener('periodicsync', (event) => {
  const tag = event.tag || '';
  if (tag === 'cricri-tick' || tag === 'cricri-data') {
    event.waitUntil(
      (async () => {
        try {
          if (tag === 'cricri-data') await revalidateShell();
          const n = await broadcast('CRICRI_PERIODIC_SYNC', tag);
          console.info('[CRICRI SW] periodicsync', tag, 'clients=', n);
          if (n === 0) {
            // sem aba aberta não é falha fatal, só informativo
            console.info('[CRICRI SW] nenhum client ativo para', tag);
          }
        } catch (e) {
          await reportSyncFailure(tag, 'periodicsync', e && e.message || e, null);
          throw e;
        }
      })()
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'CRICRI',
    body: 'Algo rolou no festival.',
    url: './index.html',
    tag: 'cricri-default',
    icon: './favicon.ico',
    badge: './favicon.ico'
  };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch (_) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'CRICRI', {
      body: data.body || '',
      icon: data.icon || './favicon.ico',
      badge: data.badge || './favicon.ico',
      tag: data.tag || 'cricri-default',
      renotify: true,
      data: { url: data.url || './index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  const abs = new URL(targetUrl, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client) await client.navigate(abs);
            return;
          } catch (_) {}
        }
      }
      if (clients.openWindow) await clients.openWindow(abs);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'REGISTER_TAMA_SYNC') {
    if (self.registration && self.registration.sync) {
      self.registration.sync.register('cricri-tama-sync').catch(() => {});
    }
  }
  if (event.data.type === 'REGISTER_PERIODIC_SYNC') {
    event.waitUntil(
      (async () => {
        try {
          if (!self.registration.periodicSync) return;
          await self.registration.periodicSync.register('cricri-tick', { minInterval: 15 * 60 * 1000 });
          await self.registration.periodicSync.register('cricri-data', { minInterval: 30 * 60 * 1000 });
          if (event.source) {
            event.source.postMessage({ type: 'CRICRI_PERIODIC_REGISTERED', ok: true });
          }
        } catch (e) {
          if (event.source) {
            event.source.postMessage({ type: 'CRICRI_PERIODIC_REGISTERED', ok: false, error: String(e && e.message || e) });
          }
        }
      })()
    );
  }
});
