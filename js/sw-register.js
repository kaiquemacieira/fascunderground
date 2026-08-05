/**
 * CRICRI · SW register + força atualização (mobile/Vercel)
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (window.__cricriSwRegistered) return;
  window.__cricriSwRegistered = true;

  var RELOAD_KEY = 'cricri-sw-reloaded-v6';

  function register() {
    navigator.serviceWorker.register('./sw.js?v=6', { scope: './' }).then(function (reg) {
      try { reg.update(); } catch (_) {}
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            try { nw.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
            if (!sessionStorage.getItem(RELOAD_KEY)) {
              sessionStorage.setItem(RELOAD_KEY, '1');
              window.location.reload();
            }
          }
        });
      });
      // controller change → reload once
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      });
    }).catch(function (e) {
      console.warn('[CRICRI] SW', e);
    });
  }

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
})();
