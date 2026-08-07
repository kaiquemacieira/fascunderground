/**
 * CRICRI · Monitor de falhas de sincronização
 * Ring buffer em localStorage + eventos + API de consulta.
 */
(function (global) {
  'use strict';

  var KEY = 'cricri-sync-failures-v1';
  var MAX = 40;
  var listeners = [];

  function now() { return Date.now(); }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function write(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    } catch (_) {}
  }

  function record(entry) {
    var item = {
      id: 'sf_' + now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      at: now(),
      iso: new Date().toISOString(),
      source: entry.source || 'unknown',
      tag: entry.tag || null,
      phase: entry.phase || 'sync',
      message: String(entry.message || entry.error || 'falha desconhecida').slice(0, 400),
      code: entry.code || null,
      fatal: !!entry.fatal,
      meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : null
    };
    var arr = read();
    arr.push(item);
    write(arr);

    try {
      if (!/periodic-background-sync|permission|negada/i.test(String(item.message||'') + String(item.tag||''))) {
        console.warn('[CRICRI sync fail]', item.source, item.tag || '', item.message);
      }
    } catch (_) {}

    try {
      global.dispatchEvent(new CustomEvent('cricri:sync-failure', { detail: item }));
    } catch (_) {}

    listeners.forEach(function (fn) {
      try { fn(item); } catch (_) {}
    });

    return item;
  }

  function wrap(source, tag, fn) {
    return async function () {
      try {
        return await fn.apply(this, arguments);
      } catch (e) {
        record({
          source: source,
          tag: tag,
          phase: 'handler',
          message: e && (e.message || String(e)),
          code: e && e.code,
          fatal: false
        });
        throw e;
      }
    };
  }

  function summary() {
    var arr = read();
    var bySource = {};
    var last24h = 0;
    var cutoff = now() - 24 * 3600 * 1000;
    arr.forEach(function (e) {
      bySource[e.source] = (bySource[e.source] || 0) + 1;
      if (e.at >= cutoff) last24h++;
    });
    return {
      total: arr.length,
      last24h: last24h,
      bySource: bySource,
      last: arr.length ? arr[arr.length - 1] : null
    };
  }

  // hook SW messages about failures
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data) return;
      if (ev.data.type === 'CRICRI_SYNC_FAILURE') {
        record({
          source: 'service-worker',
          tag: ev.data.tag,
          phase: ev.data.phase || 'sw',
          message: ev.data.message,
          code: ev.data.code,
          fatal: !!ev.data.fatal,
          meta: ev.data.meta || null
        });
      }
    });
  }

  // network offline as soft signal
  if (typeof window !== 'undefined') {
    window.addEventListener('offline', function () {
      record({
        source: 'network',
        phase: 'connectivity',
        message: 'Dispositivo offline — sync em segundo plano pode falhar',
        fatal: false
      });
    });
  }

  global.CricriSyncMonitor = {
    record: record,
    wrap: wrap,
    list: function () { return read().slice(); },
    clear: function () { write([]); },
    summary: summary,
    onFailure: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (x) { return x !== fn; });
      };
    }
  };

  // atalho global usado por outros módulos
  global.__cricriSyncFail = function (message, extra) {
    extra = extra || {};
    return record(Object.assign({ message: message }, extra));
  };
})(typeof window !== 'undefined' ? window : globalThis);
