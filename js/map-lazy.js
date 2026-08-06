/**
 * CRICRI · mapa sob demanda
 * Leaflet (+ CSS) e mock.js só quando #mapa entra no viewport.
 * Não recarrega Leaflet se já existir (explorar.html já inclui no head).
 */
(function () {
  'use strict';
  var loaded = false;
  var loading = false;

  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('link[href*="leaflet"]') || document.querySelector('link[data-cricri-css="' + href + '"]')) {
        resolve();
        return;
      }
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.setAttribute('data-cricri-css', href);
      l.onload = function () { resolve(); };
      l.onerror = function () { reject(new Error('css ' + href)); };
      document.head.appendChild(l);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[data-cricri-src="' + src + '"]')) {
        resolve();
        return;
      }
      // Leaflet já no head → não carrega de novo
      if (/leaflet/i.test(src) && typeof window.L !== 'undefined' && window.L.map) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-cricri-src', src);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('js ' + src)); };
      document.body.appendChild(s);
    });
  }

  async function bootMap() {
    if (loaded || loading) return;
    loading = true;
    var mapEl = document.getElementById('map');
    if (mapEl) mapEl.setAttribute('aria-busy', 'true');
    try {
      await loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      // espera L se o script do head ainda estiver carregando
      if (typeof window.L === 'undefined') {
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        var wait = 0;
        while (typeof window.L === 'undefined' && wait < 40) {
          await new Promise(function (r) { setTimeout(r, 50); });
          wait++;
        }
      }
      if (document.getElementById('btn-heat-toggle')) {
        await loadScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js').catch(function () {});
        await loadScript('js/heat-map.js').catch(function () {});
      }
      if (document.getElementById('map-transit-lines') || document.getElementById('map-transit-note')) {
        await loadScript('js/gtfs-rt.js').catch(function () {});
      }
      // mock só uma vez
      if (!window.projanoMap && !window._cricriLeafletMap) {
        await loadScript('mock.js');
      }
      loaded = true;
      console.info('[CRICRI] mapa carregado sob demanda');
      try {
        window.dispatchEvent(new CustomEvent('cricri:map-ready'));
      } catch (_) {}
    } catch (e) {
      console.warn('[CRICRI] falha ao carregar mapa', e && e.message || e);
    } finally {
      loading = false;
      if (mapEl) mapEl.removeAttribute('aria-busy');
    }
  }

  function observe() {
    var sec = document.getElementById('mapa') || document.getElementById('map');
    if (!sec) return;
    if (!('IntersectionObserver' in window)) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () { bootMap(); }, { timeout: 2500 });
      } else {
        setTimeout(bootMap, 1200);
      }
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          io.disconnect();
          bootMap();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    io.observe(sec);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }

  window.__cricriLoadMap = bootMap;
})();
