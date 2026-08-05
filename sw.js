/**
 * CRICRI · Service Worker
 * - Web Push (push + notificationclick)
 * - Cache leve opcional (não bloqueia offline map)
 */
/* eslint-disable no-restricted-globals */
var CACHE = 'cricri-shell-v1';
var PRECACHE = [
  './',
  './index.html',
  './login.html',
  './style.css',
  './js/config.js',
  './js/bottom-nav.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function () {});
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  // network-first para HTML; cache-first para estáticos leves
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.(js|css|png|jpg|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
          return res;
        }).catch(function () { return hit; });
      })
    );
  }
});

/** Payload do push-trigger / send-push: { title, body, url, tag, icon } */
self.addEventListener('push', function (event) {
  var data = {
    title: 'CRICRI',
    body: 'Nova atividade na roda',
    url: './index.html',
    tag: 'cricri',
    icon: './favicon.ico'
  };
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        data.title = parsed.title || data.title;
        data.body = parsed.body || parsed.message || data.body;
        data.url = parsed.url || parsed.href || data.url;
        data.tag = parsed.tag || data.tag;
        data.icon = parsed.icon || data.icon;
      }
    }
  } catch (e) {
    try {
      var text = event.data && event.data.text();
      if (text) data.body = String(text).slice(0, 120);
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: data.icon,
      badge: data.icon,
      data: { url: data.url },
      renotify: true,
      vibrate: [80, 40, 80]
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './index.html';
  // normaliza path relativo
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
          c.navigate && c.navigate(target);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
