/* CRICRI PWA · v3 — não quebra o app com cache de HTML/JS velho */
const VERSION = 'cricri-react-v3';
const SHELL = `shell-${VERSION}`;

// Só assets estáticos seguros (não cacheia JS hasheado do Vite)
const PRECACHE = [
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // APIs externas: deixa o browser
  if (url.origin !== self.location.origin) return;

  // Navegação e HTML: SEMPRE rede (evita tela preta por index antigo)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          '<!doctype html><meta charset=utf-8><body style="background:#0c0a08;color:#faf4ea;font-family:sans-serif;padding:24px"><h1>CRICRI offline</h1><p>Sem conexão. Abra com internet uma vez para atualizar.</p></body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
    return;
  }

  // JS/CSS do Vite: sempre rede (hash muda a cada deploy)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // ícones e manifest: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
