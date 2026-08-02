/**
 * CRICRI · geolocalização offline (PWA)
 *
 * O Service Worker NÃO tem acesso a navigator.geolocation.
 * Estratégia: persistir o último fix bom no client e reutilizar
 * quando a rede ou o GPS falharem.
 *
 * - fresh  ≤ 3 min  → trata como GPS ao vivo (filtros de proximidade)
 * - recent ≤ 6 h    → útil offline / mapa “você estava aqui”
 * - stale  ≤ 24 h   → só fallback visual, com aviso
 */
(function () {
  var KEY = 'cricri_geo_last_v1';
  var FRESH_MS = 3 * 60 * 1000;
  var RECENT_MS = 6 * 60 * 60 * 1000;
  var STALE_MS = 24 * 60 * 60 * 1000;
  var CENTER_SC = { lat: -11.015, lng: -37.206, accuracy: 120, source: 0, source: 'centro' };

  function now() { return Date.now(); }

  function save(pos) {
    if (!pos || pos.lat == null || pos.lng == null) return;
    var payload = {
      lat: Number(pos.lat),
      lng: Number(pos.lng),
      accuracy: pos.accuracy != null ? Number(pos.accuracy) : null,
      time: pos.time || now(),
      heading: pos.heading != null ? Number(pos.heading) : null
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch (_) {}
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
      }
    } catch (_) {}
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (p == null || p.lat == null || p.lng == null) return null;
      p.lat = Number(p.lat);
      p.lng = Number(p.lng);
      p.time = Number(p.time) || 0;
      return p;
    } catch (_) {
      return null;
    }
  }

  function ageMs(pos) {
    if (!pos || !pos.time) return Infinity;
    return Math.max(0, now() - pos.time);
  }

  function classify(pos) {
    var a = ageMs(pos);
    if (a <= FRESH_MS) return 'fresh';
    if (a <= RECENT_MS) return 'recent';
    if (a <= STALE_MS) return 'stale';
    return 'expired';
  }

  /**
   * Melhor ponto disponível para o app:
   * 1) live (passado pelo caller)
   * 2) cache local
   * 3) centro histórico SC
   */
  function resolve(live) {
    var online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

    if (live && live.lat != null && live.lng != null) {
      var liveAge = live.time ? now() - live.time : 0;
      if (liveAge <= FRESH_MS) {
        return {
          lat: live.lat,
          lng: live.lng,
          accuracy: live.accuracy,
          time: live.time || now(),
          source: 'gps',
          quality: 'fresh',
          online: online
        };
      }
    }

    var cached = load();
    if (cached) {
      var q = classify(cached);
      if (q !== 'expired') {
        return {
          lat: cached.lat,
          lng: cached.lng,
          accuracy: cached.accuracy,
          time: cached.time,
          source: online ? 'cache' : 'offline',
          quality: q,
          online: online
        };
      }
    }

    return {
      lat: CENTER_SC.lat,
      lng: CENTER_SC.lng,
      accuracy: CENTER_SC.accuracy,
      time: 0,
      source: 'centro',
      quality: 'fallback',
      online: online
    };
  }

  function formatAge(pos) {
    var a = ageMs(pos);
    if (!isFinite(a) || a <= 0) return 'agora';
    if (a < 60000) return Math.round(a / 1000) + 's';
    if (a < 3600000) return Math.round(a / 60000) + ' min';
    if (a < 86400000) return Math.round(a / 3600000) + ' h';
    return Math.round(a / 86400000) + ' d';
  }

  function statusLabel(resolved) {
    if (!resolved) return 'sem posição';
    if (resolved.source === 'gps' && resolved.quality === 'fresh') return 'ao vivo';
    if (resolved.source === 'offline') return 'offline · ' + formatAge(resolved);
    if (resolved.source === 'cache') return 'cache · ' + formatAge(resolved);
    if (resolved.source === 'centro') return 'centro SC';
    return resolved.source || '—';
  }

  // Auto: salva quando o mapa emite posição
  window.addEventListener('projano:position', function (e) {
    var d = e && e.detail;
    if (d) save(d);
  });

  // Aviso de conectividade
  function emitNet() {
    try {
      window.dispatchEvent(new CustomEvent('cricri:connectivity', {
        detail: { online: navigator.onLine !== false }
      }));
    } catch (_) {}
  }
  window.addEventListener('online', emitNet);
  window.addEventListener('offline', emitNet);

  window.fascGeoOffline = {
    KEY: KEY,
    FRESH_MS: FRESH_MS,
    RECENT_MS: RECENT_MS,
    STALE_MS: STALE_MS,
    CENTER_SC: CENTER_SC,
    save: save,
    load: load,
    ageMs: ageMs,
    classify: classify,
    resolve: resolve,
    formatAge: formatAge,
    statusLabel: statusLabel
  };
})();
