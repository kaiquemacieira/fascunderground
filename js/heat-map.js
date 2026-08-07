// FASC+ — mapa de calor de público (Leaflet.heat + Supabase agregado)
(function () {
  'use strict';

  var OPTIN_KEY = 'fasc-heat-optin-v1';
  var CELL = 0.0005; // ~55 m
  var SUBMIT_MS = 90 * 1000;
  var REFRESH_MS = 45 * 1000;
  var WINDOW_MIN = 25;

  var heatLayer = null;
  var enabled = false;
  var optIn = false;
  var lastSubmit = 0;
  var refreshTimer = null;
  var mapRef = null;

  // fallback visual (dev) — pesos baixos em torno dos spots de São Cristóvão
  var FALLBACK = [
    [-11.0149, -37.2047, 0.6],
    [-11.0152, -37.2052, 0.85],
    [-11.0150, -37.2050, 0.5],
    [-11.0138, -37.2068, 0.35],
    [-11.0140, -37.2080, 0.7],
    [-11.0142, -37.2078, 0.45],
    [-11.0165, -37.2075, 0.25],
    [-11.0155, -37.2060, 0.4]
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function loadOptIn() {
    try {
      return localStorage.getItem(OPTIN_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function saveOptIn(v) {
    optIn = !!v;
    try {
      localStorage.setItem(OPTIN_KEY, optIn ? '1' : '0');
    } catch (_) {}
    syncOptUi();
  }

  function quantize(n) {
    return Math.round(Number(n) / CELL) * CELL;
  }

  function toHeatPoints(rows) {
    if (!rows || !rows.length) return FALLBACK.map(function (r) {
      return [r[0], r[1], r[2]];
    });
    var max = 1;
    rows.forEach(function (r) {
      var w = Number(r.weight) || 1;
      if (w > max) max = w;
    });
    return rows.map(function (r) {
      return [Number(r.lat), Number(r.lng), Math.min(1, (Number(r.weight) || 1) / max)];
    });
  }

  async function fetchHeat() {
    var db = window.fascDb;
    if (!db) return FALLBACK.slice();
    try {
      var res = await db.rpc('get_presence_heat', { p_minutes: WINDOW_MIN });
      if (res.error) {
        console.warn('[FASC heat] rpc', res.error.message);
        return FALLBACK.slice();
      }
      if (!res.data || !res.data.length) return FALLBACK.slice();
      return toHeatPoints(res.data);
    } catch (e) {
      console.warn('[FASC heat]', e.message || e);
      return FALLBACK.slice();
    }
  }

  async function submitSample(lat, lng) {
    if (!optIn || !window.fascDb) return;
    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user) return; // precisa login (anti-spam + RLS)

    var now = Date.now();
    if (now - lastSubmit < SUBMIT_MS) return;
    lastSubmit = now;

    var payload = {
      cell_lat: quantize(lat),
      cell_lng: quantize(lng)
    };
    try {
      var res = await window.fascDb.from('presence_samples').insert(payload);
      if (res.error) console.warn('[FASC heat] insert', res.error.message);
      else {
        try { window.dispatchEvent(new CustomEvent('cricri:heat-sample')); } catch (_) {}
      }
    } catch (e) {
      console.warn('[FASC heat] insert', e.message || e);
    }
  }

  function ensureLayer(map) {
    if (typeof L === 'undefined' || !L.heatLayer) {
      console.warn('[FASC heat] leaflet.heat não carregou');
      return null;
    }
    if (heatLayer) return heatLayer;
    heatLayer = L.heatLayer([], {
      radius: 32,
      blur: 22,
      maxZoom: 18,
      minOpacity: 0.25,
      gradient: {
        0.0: '#1a4556',
        0.35: '#c48a2a',
        0.55: '#d42f62',
        0.8: '#f06a95',
        1.0: '#fff5e6'
      }
    });
    return heatLayer;
  }

  async function redraw() {
    if (!enabled || !mapRef) return;
    var layer = ensureLayer(mapRef);
    if (!layer) return;
    var pts = await fetchHeat();
    layer.setLatLngs(pts);
    if (!mapRef.hasLayer(layer)) layer.addTo(mapRef);
  }

  function setEnabled(on) {
    enabled = !!on;
    var btn = $('btn-heat-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      btn.classList.toggle('is-on', enabled);
      btn.textContent = enabled ? 'Calor: on' : 'Calor';
    }
    if (!mapRef) return;
    if (enabled) {
      redraw();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(function () {
        redraw().catch(function () {});
      }, REFRESH_MS);
    } else {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (heatLayer && mapRef.hasLayer(heatLayer)) {
        mapRef.removeLayer(heatLayer);
      }
    }
  }

  function syncOptUi() {
    var chk = $('heat-optin');
    if (chk) chk.checked = optIn;
    var hint = $('heat-optin-hint');
    if (hint) {
      hint.textContent = optIn
        ? 'Você contribui de forma anônima (célula ~50 m, sem nome).'
        : 'Ative para somar sua posição ao calor (login + GPS).';
    }
  }

  function wireUi() {
    var btn = $('btn-heat-toggle');
    if (btn && btn.dataset.bound !== '1') {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        setEnabled(!enabled);
      });
    }
    var chk = $('heat-optin');
    if (chk && chk.dataset.bound !== '1') {
      chk.dataset.bound = '1';
      chk.addEventListener('change', function () {
        saveOptIn(!!chk.checked);
      });
    }
    syncOptUi();
  }

  function onPosition(ev) {
    var d = (ev && ev.detail) || {};
    if (d.lat == null || d.lng == null) return;
    if (optIn) submitSample(d.lat, d.lng);
  }

  function bindMap() {
    if (mapRef) return true;
    if (window.projanoMap && window.projanoMap.map) {
      mapRef = window.projanoMap.map;
      return true;
    }
    return false;
  }

  function boot() {
    optIn = loadOptIn();
    wireUi();

    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (bindMap() || tries > 40) {
        clearInterval(t);
        if (mapRef) console.info('[FASC heat] mapa ligado');
      }
    }, 250);

    window.addEventListener('projano:position', onPosition);

    // se já tinha posição
    if (window.projanoMap && typeof window.projanoMap.getPosition === 'function') {
      var p = window.projanoMap.getPosition();
      if (p && optIn) submitSample(p.lat, p.lng);
    }

    window.fascHeat = {
      enable: function () {
        setEnabled(true);
      },
      disable: function () {
        setEnabled(false);
      },
      setOptIn: saveOptIn,
      refresh: redraw,
      isEnabled: function () {
        return enabled;
      }
    };
    console.info('[FASC heat] pronto');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
