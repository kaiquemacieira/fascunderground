/**
 * CRICRI · Mapa offline
 * Pede pro Service Worker pré-cachear os tiles em volta do centro
 * atual do mapa (ou do centro histórico de SC como fallback),
 * pra funcionar sem internet depois. Tiles em si: sw.js.
 */
(function () {
  'use strict';

  var DEFAULT_CENTER = { lat: -11.015, lng: -37.206 };
  var ZOOMS = [14, 15, 16, 17];
  var TILE_RADIUS = 6;

  function getMapCenter() {
    try {
      if (window.projanoMap && window.projanoMap.map && typeof window.projanoMap.map.getCenter === 'function') {
        var c = window.projanoMap.map.getCenter();
        return { lat: c.lat, lng: c.lng };
      }
    } catch (_) {}
    return DEFAULT_CENTER;
  }

  function setLabel(text) {
    var el = document.getElementById('map-offline-btn-label');
    if (el) el.textContent = text;
  }

  function setHint(text) {
    var el = document.getElementById('map-offline-hint');
    if (el) el.textContent = text;
  }

  async function downloadArea() {
    if (!('serviceWorker' in navigator)) {
      setHint('Seu navegador não suporta salvar mapa offline.');
      return;
    }
    var btn = document.getElementById('map-offline-btn');
    if (btn) btn.disabled = true;
    setLabel('Baixando…');
    setHint('Baixando tiles da região — não feche o app.');

    try {
      var reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('sw inativo');
      var center = getMapCenter();
      reg.active.postMessage({
        type: 'PRECACHE_MAP_AREA',
        lat: center.lat,
        lng: center.lng,
        zooms: ZOOMS,
        tileRadius: TILE_RADIUS
      });
    } catch (e) {
      setLabel('Baixar mapa offline');
      setHint('Não deu pra baixar agora. Tenta de novo com internet.');
      if (btn) btn.disabled = false;
    }
  }

  function onSWMessage(event) {
    var data = event.data;
    if (!data) return;
    if (data.type === 'CRICRI_MAP_PRECACHE_PROGRESS') {
      var pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
      setLabel('Baixando… ' + pct + '%');
    }
    if (data.type === 'CRICRI_MAP_PRECACHE_DONE') {
      var btn = document.getElementById('map-offline-btn');
      if (btn) btn.disabled = false;
      setLabel('Mapa salvo ✓');
      var ok = data.total - (data.failed || 0);
      setHint('Guardado ' + ok + ' de ' + data.total + ' tiles. Já funciona offline nessa região.');
      setTimeout(function () { setLabel('Baixar mapa offline'); }, 4000);
    }
  }

  function mount() {
    var btn = document.getElementById('map-offline-btn');
    if (!btn || btn.__cricriBound) return;
    btn.__cricriBound = true;
    btn.addEventListener('click', downloadArea);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }
    if (!('serviceWorker' in navigator)) {
      setHint('Seu navegador não suporta salvar mapa offline.');
      btn.disabled = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.fascMapOffline = { downloadArea: downloadArea };
})();
