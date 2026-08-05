/**
 * CRICRI · registro único do Service Worker + aviso de atualização
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (window.__cricriSwRegistered) return;
  window.__cricriSwRegistered = true;

  function register() {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
      console.info('[CRICRI] SW', reg.scope);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[CRICRI] SW update ready');
            try {
              if (window.CricriNotifBell && window.CricriNotifBell.push) {
                window.CricriNotifBell.push({
                  ico: '♻️',
                  title: 'Atualização pronta',
                  body: 'Recarregue pra pegar a versão nova do app',
                  kind: 'system'
                });
              }
            } catch (_) {}
          }
        });
      });
      if (reg.sync) {
        reg.sync.register('cricri-sync').catch(function () {});
      }
    }).catch(function (e) {
      console.warn('[CRICRI] SW fail', e);
    });
  }

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
})();
