/**
 * CRICRI · Service Worker offline
 * Shell network-first · static SWR · images cache-first · API network-only
 */
/* eslint-disable no-restricted-globals */

var VERSION = 'v7';
var SHELL = 'cricri-shell-' + VERSION;
var RUNTIME = 'cricri-runtime-' + VERSION;
var MAP = 'cricri-map-' + VERSION;

var PRECACHE = [
  './',
  './index.html',
  './feed.html',
  './offline.html',
  './login.html',
  './profile.html',
  './tamagotchi.html',
  './notifications.html',
  './explorar.html',
  './manifest.webmanifest',
  './css/estetica-v2.css',
  './css/fixed-chrome.css',
  './css/device-adapt.css',
  './js/theme.js',
  './js/bottom-nav.js',
  './js/fixed-chrome.js',
  './js/a11y-core.js',
  './js/footer.js',
  './js/casas.js',
  './js/install-app.js',
  './js/sw-register.js',
  './js/supabase-client.js',
  './js/notif-bell.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return Promise.all(
        PRECACHE.map(function (u) {
          return cache.add(new Request(u, { cache: 'reload' })).catch(function (err) {
            console.warn('[SW] precache skip', u, err && err.message);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  var keep = [SHELL, RUNTIME, MAP];
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (keep.indexOf(k) === -1) return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigation(req) {
  return (
    req.mode === 'navigate' ||
    (req.method === 'GET' &&
      req.headers.get('accept') &&
      req.headers.get('accept').indexOf('text/html') !== -1)
  );
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|webmanifest)$/i.test(
    url.pathname
  );
}

function isImage(url) {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);
}

function isMapTile(url) {
  if (/tile\.openstreetmap\.org/i.test(url.hostname)) return true;
  if (/basemaps\.cartocdn\.com/i.test(url.hostname)) return true;
  if (
    /tile\.|tiles\./i.test(url.hostname) &&
    /\/\d+\/\d+\/\d+(\.png|\.jpg)?$/i.test(url.pathname)
  )
    return true;
  return false;
}

function isApi(url) {
  if (url.hostname.indexOf('supabase.co') !== -1) return true;
  if (url.pathname.indexOf('/auth/') !== -1) return true;
  if (url.pathname.indexOf('/rest/') !== -1) return true;
  if (url.pathname.indexOf('/functions/') !== -1) return true;
  if (url.pathname.indexOf('/realtime/') !== -1) return true;
  return false;
}

function networkFirst(req, cacheName, fallbackUrl) {
  return fetch(req)
    .then(function (res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(cacheName).then(function (c) {
          c.put(req, clone);
        }).catch(function () {});
      }
      return res;
    })
    .catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (fallbackUrl) return caches.match(fallbackUrl);
        return caches.match('./offline.html');
      });
    });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var fetched = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            cache.put(req, res.clone()).catch(function () {});
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || fetched;
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(cacheName).then(function (c) {
          c.put(req, clone);
        }).catch(function () {});
      }
      return res;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // APIs — network only
  if (isApi(url)) return;

  // Cross-origin que não é tile — deixa o browser
  if (url.origin !== self.location.origin && !isMapTile(url)) return;

  if (isNavigation(req)) {
    event.respondWith(networkFirst(req, SHELL, './offline.html'));
    return;
  }

  if (isMapTile(url)) {
    event.respondWith(cacheFirst(req, MAP));
    return;
  }

  if (isImage(url)) {
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }

  if (isStaticAsset(url) || url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
  }
});

/* Push opcional — repassa ao client */
self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'CRICRI', body: event.data && event.data.text() };
  }
  var title = data.title || 'CRICRI';
  var options = {
    body: data.body || 'Nova atividade na cidade',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: data.url ? { url: data.url } : { url: './feed.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './feed.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
