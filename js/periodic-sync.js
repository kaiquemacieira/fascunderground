/**
 * CRICRI · Periodic Background Sync
 * Registra tags no SW e reage a ticks em segundo plano.
 * Fallback: interval enquanto a página está aberta.
 *
 * Tags:
 *  - cricri-tick     (15 min)  tamagotchi + presença
 *  - cricri-data     (30 min)  feed / programação cache
 */
(function (global) {
  'use strict';

  var TAGS = {
    tick: { tag: 'cricri-tick', minInterval: 15 * 60 * 1000 },
    data: { tag: 'cricri-data', minInterval: 30 * 60 * 1000 }
  };

  var fallbackTimers = {};
  var status = {
    supported: false,
    permission: 'unknown',
    registered: {},
    lastTick: null,
    lastData: null
  };

  function log() {
    if (global.CRICRI_DEBUG) console.info.apply(console, ['[periodicSync]'].concat([].slice.call(arguments)));
  }

  function fail(message, extra) {
    extra = extra || {};
    if (typeof global.__cricriSyncFail === 'function') {
      return global.__cricriSyncFail(message, Object.assign({ source: 'periodic-sync' }, extra));
    }
    console.warn('[periodicSync fail]', message, extra);
    return null;
  }

  async function getReg() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg) return reg;
      return await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch (e) {
      console.warn('[periodicSync] SW', e);
      fail(e && e.message || 'Falha ao obter Service Worker', { phase: 'getReg', tag: null });
      return null;
    }
  }

  async function ensurePermission() {
    // Periodic Sync não tem PermissionName padrão em todos browsers;
    // Chrome usa registration + engajamento. Tentamos permissions.query quando existir.
    try {
      if (navigator.permissions && navigator.permissions.query) {
        var r = await navigator.permissions.query({ name: 'periodic-background-sync' });
        status.permission = r.state || 'unknown';
        return r.state === 'granted' || r.state === 'prompt';
      }
    } catch (_) {
      /* Firefox/Safari: API ausente */
    }
    status.permission = 'unsupported-query';
    return true; // tenta registrar mesmo assim
  }

  async function registerTag(key) {
    var conf = TAGS[key];
    if (!conf) return false;
    var reg = await getReg();
    if (!reg) return false;

    status.supported = !!(reg.periodicSync);
    if (!reg.periodicSync) {
      fail('periodicSync API ausente — usando fallback', {
        phase: 'register', tag: conf.tag, code: 'NO_PERIODIC_SYNC'
      });
      startFallback(key, conf.minInterval);
      return false;
    }

    try {
      var okPerm = await ensurePermission();
      if (!okPerm && status.permission === 'denied') {
        fail('Permissão periodic-background-sync negada', {
          phase: 'permission', tag: conf.tag, code: 'DENIED'
        });
        startFallback(key, conf.minInterval);
        return false;
      }
      // evita re-registro desnecessário
      var tags = [];
      try { tags = await reg.periodicSync.getTags(); } catch (_) {}
      if (tags.indexOf(conf.tag) === -1) {
        await reg.periodicSync.register(conf.tag, { minInterval: conf.minInterval });
      }
      status.registered[conf.tag] = true;
      log('registered', conf.tag);
      return true;
    } catch (e) {
      console.info('[periodicSync] register fail', conf.tag, e && e.message);
      fail(e && e.message || 'Falha ao registrar tag', {
        phase: 'register', tag: conf.tag, code: 'REGISTER_FAIL'
      });
      startFallback(key, conf.minInterval);
      return false;
    }
  }

  function startFallback(key, ms) {
    if (fallbackTimers[key]) return;
    log('fallback interval', key, ms);
    fallbackTimers[key] = global.setInterval(function () {
      if (document.visibilityState === 'hidden') return;
      runHandlers(key === 'tick' ? 'cricri-tick' : 'cricri-data', 'fallback');
    }, ms);
  }

  function runHandlers(tag, source) {
    var detail = { tag: tag, source: source || 'sw', at: Date.now() };
    if (tag === 'cricri-tick') status.lastTick = detail.at;
    if (tag === 'cricri-data') status.lastData = detail.at;
    status.lastOk = detail.at;
    status.lastSource = source || 'sw';

    try {
      global.dispatchEvent(new CustomEvent('cricri:periodic-sync', { detail: detail }));
    } catch (e) {
      fail(e && e.message || 'evento periodic-sync', { phase: 'emit', tag: tag });
    }

    function safe(name, fn) {
      try { fn(); }
      catch (e) {
        fail(e && e.message || ('falha em ' + name), {
          phase: 'handler', tag: tag, meta: { handler: name }
        });
      }
    }

    safe('tama', function () {
      if (typeof global.__tamaForceTick === 'function') global.__tamaForceTick();
    });
    safe('presence', function () {
      if (typeof global.__cricriPresenceBeat === 'function') global.__cricriPresenceBeat();
    });
    safe('feed', function () {
      if (tag === 'cricri-data' && typeof global.cricriRefreshFeed === 'function') {
        global.cricriRefreshFeed();
      }
    });
    safe('programacao', function () {
      if (tag === 'cricri-data' && typeof global.cricriRefreshProgramacao === 'function') {
        global.cricriRefreshProgramacao();
      }
    });
  }

  function wireMessages() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data) return;
      if (ev.data.type === 'CRICRI_PERIODIC_SYNC') {
        runHandlers(ev.data.tag || 'cricri-tick', 'sw-message');
      }
      if (ev.data.type === 'CRICRI_TAMA_TICK' || ev.data.type === 'CRICRI_BG_SYNC') {
        runHandlers('cricri-tick', 'sw-message');
      }
    });
  }

  async function init() {
    wireMessages();
    await registerTag('tick');
    await registerTag('data');

    // também one-off Background Sync (quando volta a rede)
    try {
      var reg = await getReg();
      if (reg && reg.sync) {
        await reg.sync.register('cricri-sync').catch(function () {});
      }
    } catch (_) {}

    global.CricriPeriodicSync = {
      status: function () {
        var mon = global.CricriSyncMonitor ? global.CricriSyncMonitor.summary() : null;
        return Object.assign({}, status, {
          registered: Object.assign({}, status.registered),
          failures: mon
        });
      },
      register: registerTag,
      runNow: function (tag) { runHandlers(tag || 'cricri-tick', 'manual'); },
      failures: function () {
        return global.CricriSyncMonitor ? global.CricriSyncMonitor.list() : [];
      }
    };

    log('ready', status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
