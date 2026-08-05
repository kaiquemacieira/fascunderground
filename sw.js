/**
 * CRICRI · Service Worker offline-first (shell) + push + mapa
 *
 * Estratégias:
 *  - Navegação HTML: network-first → cache → offline.html
 *  - JS/CSS/ícones: stale-while-revalidate
 *  - Imagens/fonts same-origin: cache-first
 *  - Tiles de mapa (OSM etc.): cache sob demanda + PRECACHE_MAP_AREA
 *  - API Supabase / métodos não-GET: network only (não cacheia)
 */
/* eslint-disable no-restricted-globals */

var SHELL = 'cricri-shell-v6';
var RUNTIME = 'cricri-runtime-v6';
var MAP = 'cricri-map-v1';

var PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './login.html',
  './profile.html',
  './tamagotchi.html',
  './notifications.html',
  './explorar.html',
  './manifest.webmanifest',
  './style.css',
  './js/config.js',
  './js/bottom-nav.js',
  './js/install-app.js',
  './js/notif-bell.js',
  './js/friends.js',
  './js/push.js',
  './js/supabase-client.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return cache.addAll(PRECACHE.map(function (u) {
        return new Request(u, { cache: 'reload' });
      })).catch(function (err) {
        console.warn('[SW] precache partial', err);
        // tenta um a um pra não falhar o install inteiro
        return Promise.all(PRECACHE.map(function (u) {
          return cache.add(u).catch(function () {});
        }));
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  var keep = [SHELL, RUNTIME, MAP];
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (keep.indexOf(k) === -1) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isNavigation(req) {
  return req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1);
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map)$/i.test(url.pathname);
}

function isMapTile(url) {
  // OSM, Carto, Mapbox-style tile paths
  if (/tile\.openstreetmap\.org/i.test(url.hostname)) return true;
  if (/basemaps\.cartocdn\.com/i.test(url.hostname)) return true;
  if (/tile\.|tiles\./i.test(url.hostname) && /\/\d+\/\d+\/\d+(\.png|\.jpg)?$/i.test(url.pathname)) return true;
  return false;
}

function isApi(url) {
  if (url.hostname.indexOf('supabase.co') !== -1) return true;
  if (url.pathname.indexOf('/auth/') !== -1) return true;
  if (url.pathname.indexOf('/rest/') !== -1) return true;
  if (url.pathname.indexOf('/functions/') !== -1) return true;
  return false;
}

function networkFirst(req, cacheName, fallbackUrl) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var clone = res.clone();
      caches.open(cacheName).then(function (c) { c.put(req, clone); }).catch(function () {});
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      if (hit) return hit;
      if (fallbackUrl) return caches.match(fallbackUrl);
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var fetchPromise = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone()).catch(function () {});
        return res;
      }).catch(function () { return hit; });
      return hit || fetchPromise;
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(cacheName).then(function (c) { c.put(req, clone); }).catch(function () {});
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

  // nunca cacheia APIs
  if (isApi(url)) return;

  // tiles de mapa (cross-origin)
  if (isMapTile(url)) {
    event.respondWith(cacheFirst(req, MAP));
    return;
  }

  // same-origin only para o resto da app
  if (url.origin !== self.location.origin) {
    // fonts google: tenta network, fallback silencioso
    if (/fonts\.(googleapis|gstatic)\.com/i.test(url.hostname)) {
      event.respondWith(
        fetch(req).catch(function () {
          return new Response('', { status: 504 });
        })
      );
    }
    return;
  }

  if (isNavigation(req)) {
    event.respondWith(networkFirst(req, SHELL, './offline.html'));
    return;
  }

  // JS sempre network-first (evita mobile preso em build antigo)
  if (/\.js$/i.test(url.pathname)) {
    event.respondWith(networkFirst(req, RUNTIME, null));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
    return;
  }

  // default same-origin GET
  event.respondWith(staleWhileRevalidate(req, RUNTIME));
});

/* ---- Mapa offline: pré-cache de área ---- */
function latLngToTile(lat, lng, zoom) {
  var n = Math.pow(2, zoom);
  var x = Math.floor((lng + 180) / 360 * n);
  var latRad = lat * Math.PI / 180;
  var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: x, y: y };
}

function tileUrl(z, x, y) {
  // OSM standard
  return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
}

function notifyClients(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { c.postMessage(msg); });
  });
}

async function precacheMapArea(data) {
  var lat = Number(data.lat) || -11.015;
  var lng = Number(data.lng) || -37.206;
  var zooms = data.zooms || [14, 15, 16];
  var radius = Math.min(Number(data.tileRadius) || 4, 8);
  var urls = [];
  zooms.forEach(function (z) {
    var t = latLngToTile(lat, lng, z);
    for (var dx = -radius; dx <= radius; dx++) {
      for (var dy = -radius; dy <= radius; dy++) {
        urls.push(tileUrl(z, t.x + dx, t.y + dy));
      }
    }
  });
  var total = urls.length;
  var done = 0;
  var failed = 0;
  var cache = await caches.open(MAP);
  for (var i = 0; i < urls.length; i++) {
    try {
      var res = await fetch(urls[i], { mode: 'cors', credentials: 'omit' });
      if (res && res.ok) await cache.put(urls[i], res);
      else failed++;
    } catch (_) {
      failed++;
    }
    done++;
    if (done % 8 === 0 || done === total) {
      await notifyClients({ type: 'CRICRI_MAP_PRECACHE_PROGRESS', done: done, total: total, failed: failed });
    }
  }
  await notifyClients({ type: 'CRICRI_MAP_PRECACHE_DONE', done: done, total: total, failed: failed });
}

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'PRECACHE_MAP_AREA') {
    event.waitUntil(precacheMapArea(data));
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'REGISTER_TAMA_SYNC') {
    // noop — tags registradas no client
  }
});

/* ---- Web Push ---- */
self.addEventListener('push', function (event) {
  var payload = {
    title: 'CRICRI',
    body: 'Nova atividade na roda',
    url: './index.html',
    tag: 'cricri',
    icon: './icons/icon-192.png'
  };
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload.title = parsed.title || payload.title;
        payload.body = parsed.body || parsed.message || payload.body;
        payload.url = parsed.url || parsed.href || payload.url;
        payload.tag = parsed.tag || payload.tag;
        payload.icon = parsed.icon || payload.icon;
      }
    }
  } catch (e) {
    try {
      var text = event.data && event.data.text();
      if (text) payload.body = String(text).slice(0, 120);
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon,
      badge: payload.icon,
      data: { url: payload.url },
      renotify: true,
      vibrate: [80, 40, 80]
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './index.html';
  if (target.charAt(0) === '/') {
    target = self.location.origin + target;
  } else if (!/^https?:/i.test(target)) {
    target = new URL(target, self.location.origin + '/').href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url && 'focus' in c) {
          if (c.navigate) c.navigate(target);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('periodicsync', function (event) {
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function (list) {
      list.forEach(function (c) {
        c.postMessage({ type: 'CRICRI_PERIODIC_SYNC', tag: event.tag || 'cricri-tick' });
      });
    })
  );
});

self.addEventListener('sync', function (event) {
  if (event.tag === 'cricri-tama-sync' || event.tag === 'cricri-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(function (list) {
        list.forEach(function (c) {
          c.postMessage({ type: 'CRICRI_BG_SYNC', tag: event.tag });
        });
      })
    );
  }
});
