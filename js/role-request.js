/**
 * CRICRI · Marcar Rolê/After
 * Fluxo: botão → modo seleção → clique/toque no mapa → formulário
 *
 * v4: overlay FIXED cobrindo o retângulo do mapa (ignora markers/z-index),
 * desliga pointer-events dos markers, botão "usar centro" de fallback.
 */
(function () {
  'use strict';
  if (window.CricriRoleRequest && window.CricriRoleRequest.__v4) return;
var pickMode = false;
  var pickMarker = null;
  var pickOverlay = null;
  var pickBanner = null;
  var attachWaitTimer = null;
  var overlayRaf = null;
  var savedMarkerPE = [];

  function injectCss() {
    if (document.getElementById('cricri-role-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-role-css';
    s.textContent = [
      '.map-role-cta{margin:1rem 0 .5rem;display:flex;flex-direction:column;gap:.5rem}',
      '.map-role-cta .btn-role{width:100%;appearance:none;border:none;border-radius:12px;padding:.85rem 1rem;',
      'font:700 .88rem/1 Oswald,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;',
      'background:linear-gradient(135deg,#e33d6b,#c4472a);color:#fff;cursor:pointer;',
      'box-shadow:0 6px 18px rgba(227,61,107,.35)}',
      '.map-role-cta .btn-role.is-pick{background:linear-gradient(135deg,#d49a2c,#e33d6b);',
      'box-shadow:0 0 0 2px rgba(212,154,44,.5),0 6px 18px rgba(227,61,107,.4)}',
      '.map-role-desc{margin:0;font-size:.8rem;line-height:1.45;color:#c4b9a6;text-align:left}',
      '.map-role-desc strong{color:#ebe3cf}',
      '#cricri-role-sheet{position:fixed;inset:0;z-index:100120;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,.58);padding-bottom:env(safe-area-inset-bottom,0);pointer-events:auto}',
      '#cricri-role-sheet[hidden]{display:none!important;pointer-events:none!important}',
      '#cricri-role-sheet .rs-card{width:min(100%,420px);max-height:min(88vh,640px);overflow:auto;',
      'background:#14110f;border-radius:18px 18px 0 0;border:1.5px solid rgba(230,220,196,.14);',
      'padding:1.1rem 1.05rem 1.3rem;color:#ebe3cf;box-shadow:0 -16px 40px rgba(0,0,0,.5)}',
      '#cricri-role-sheet .rs-handle{width:40px;height:4px;border-radius:99px;background:rgba(230,220,196,.22);margin:0 auto .75rem}',
      '#cricri-role-sheet h2{margin:0 0 .35rem;font:700 1.05rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase}',
      '#cricri-role-sheet .rs-sub{margin:0 0 .85rem;font-size:.8rem;line-height:1.4;color:#a89f90}',
      '#cricri-role-sheet label{display:block;font:600 .68rem/1 Oswald,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e33d6b;margin:.55rem 0 .3rem}',
      '#cricri-role-sheet input,#cricri-role-sheet textarea{',
      'width:100%;box-sizing:border-box;border-radius:10px;border:1.5px solid rgba(230,220,196,.16);',
      'background:rgba(0,0,0,.28);color:#ebe3cf;padding:.6rem .7rem;font:500 .88rem/1.35 Inter,system-ui,sans-serif}',
      '#cricri-role-sheet .rs-type{display:flex;gap:.4rem;margin:.35rem 0 .5rem}',
      '#cricri-role-sheet .rs-type button{flex:1;appearance:none;border:1.5px solid rgba(230,220,196,.2);border-radius:999px;',
      'background:transparent;color:#cfc5b4;padding:.45rem;font:600 .72rem/1 Oswald,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;cursor:pointer}',
      '#cricri-role-sheet .rs-type button.is-on{border-color:#e33d6b;background:rgba(227,61,107,.15);color:#fff}',
      '#cricri-role-sheet .rs-coords{font-size:.72rem;color:#8c8376;margin:.35rem 0 .5rem}',
      '#cricri-role-sheet .rs-actions{display:flex;gap:.45rem;margin-top:.9rem}',
      '#cricri-role-sheet .rs-actions button{flex:1;appearance:none;border-radius:11px;padding:.7rem;cursor:pointer;',
      'font:700 .78rem/1 Oswald,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase}',
      '#cricri-role-sheet .rs-send{border:none;background:#e33d6b;color:#fff}',
      '#cricri-role-sheet .rs-cancel{border:1.5px solid rgba(230,220,196,.22);background:transparent;color:#ebe3cf}',
      '#cricri-role-sheet .rs-msg{margin:.55rem 0 0;font-size:.78rem;min-height:1.2em;color:#8c8376}',
      '#cricri-role-sheet .rs-msg.ok{color:#7ecf9a}',
      '#cricri-role-sheet .rs-msg.err{color:#f5a3b8}',
      'body.role-pick-mode #cricri-role-sheet{display:none!important;pointer-events:none!important}',
      'body.role-pick-mode nav.bottom-nav,body.role-pick-mode nav.bottom-nav[data-cricri-nav="1"],',
      'body.role-pick-mode #cricri-bottom-nav-fixed{pointer-events:none!important;opacity:.3!important}',
      'body.role-pick-mode #cricri-install-btn,body.role-pick-mode .a11y-panel{pointer-events:none!important;opacity:.25!important}',
      '#role-pick-hit{position:fixed;z-index:100080;cursor:crosshair;touch-action:none;',
      'background:rgba(227,61,107,.08);box-shadow:inset 0 0 0 3px rgba(227,61,107,.85);',
      '-webkit-tap-highlight-color:transparent;border-radius:4px}',
      '#role-pick-hit .rph-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);',
      'pointer-events:none;background:rgba(20,16,12,.88);color:#fff;padding:.55rem .9rem;border-radius:999px;',
      'font:700 .72rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;',
      'white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.45)}',
      '.role-pick-banner{position:fixed;top:max(.75rem,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:100110;',
      'background:rgba(227,61,107,.97);color:#fff;padding:.55rem .9rem;border-radius:999px;font:700 .72rem/1.25 Oswald,system-ui,sans-serif;',
      'letter-spacing:.05em;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:94vw;text-align:center;',
      'display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;justify-content:center}',
      '.role-pick-banner button{appearance:none;border:1.5px solid rgba(255,255,255,.55);background:transparent;color:#fff;',
      'border-radius:999px;padding:.3rem .55rem;font:700 .68rem/1 Oswald,system-ui,sans-serif;cursor:pointer}',
      '.role-pick-banner .rpb-center{border-color:rgba(255,255,255,.9);background:rgba(255,255,255,.15)}'
    ].join('');
    document.head.appendChild(s);
  }

  function getMap() {
    if (window.projanoMap && window.projanoMap.map) return window.projanoMap.map;
    if (window._cricriLeafletMap) return window._cricriLeafletMap;
    if (window.projanoMapLayers && window.projanoMapLayers.map) return window.projanoMapLayers.map;
    return null;
  }

  function getMapEl() {
    return document.getElementById('map') || document.querySelector('.leaflet-container');
  }

  function closeAnyForm() {
    var sheet = document.getElementById('cricri-role-sheet');
    if (sheet) {
      sheet.hidden = true;
      sheet.setAttribute('hidden', '');
    }
  }

  function updateCtaCopy() {
    var btn = document.getElementById('btn-marcar');
    if (btn) {
      btn.textContent = 'Marcar Rolê/After';
      btn.classList.add('btn-role');
    }
  }

  function disableMarkersPE(on) {
    var map = getMap();
    if (!map) return;
    if (on) {
      savedMarkerPE = [];
      try {
        map.eachLayer(function (layer) {
          var el = null;
          try {
            if (layer._icon) el = layer._icon;
            else if (typeof layer.getElement === 'function') el = layer.getElement();
          } catch (_) {}
          if (el && el.style) {
            savedMarkerPE.push({ el: el, pe: el.style.pointerEvents });
            el.style.pointerEvents = 'none';
          }
        });
      } catch (_) {}
      try {
        ['markerPane', 'shadowPane', 'popupPane', 'tooltipPane'].forEach(function (name) {
          var pane = map.getPane && map.getPane(name);
          if (pane) {
            savedMarkerPE.push({ el: pane, pe: pane.style.pointerEvents });
            pane.style.pointerEvents = 'none';
          }
        });
      } catch (_) {}
    } else {
      savedMarkerPE.forEach(function (item) {
        try { item.el.style.pointerEvents = item.pe || ''; } catch (_) {}
      });
      savedMarkerPE = [];
    }
  }

  function positionOverlay() {
    if (!pickOverlay) return;
    var el = getMapEl();
    if (!el) {
      pickOverlay.style.display = 'none';
      return;
    }
    var r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) {
      pickOverlay.style.display = 'none';
      return;
    }
    pickOverlay.style.display = 'block';
    pickOverlay.style.left = r.left + 'px';
    pickOverlay.style.top = r.top + 'px';
    pickOverlay.style.width = r.width + 'px';
    pickOverlay.style.height = r.height + 'px';
  }

  function startOverlayLoop() {
    stopOverlayLoop();
    function tick() {
      positionOverlay();
      overlayRaf = requestAnimationFrame(tick);
    }
    overlayRaf = requestAnimationFrame(tick);
    window.addEventListener('scroll', positionOverlay, true);
    window.addEventListener('resize', positionOverlay);
  }

  function stopOverlayLoop() {
    if (overlayRaf) {
      cancelAnimationFrame(overlayRaf);
      overlayRaf = null;
    }
    window.removeEventListener('scroll', positionOverlay, true);
    window.removeEventListener('resize', positionOverlay);
  }

  function latLngFromClient(clientX, clientY) {
    var map = getMap();
    if (!map || typeof map.containerPointToLatLng !== 'function') return null;
    try {
      var el = map.getContainer();
      var r = el.getBoundingClientRect();
      var x = clientX - r.left;
      var y = clientY - r.top;
      if (window.L && L.point) {
        return map.containerPointToLatLng(L.point(x, y));
      }
      return map.containerPointToLatLng({ x: x, y: y });
    } catch (_) {
      return null;
    }
  }

  function onPicked(lat, lng) {
    if (!pickMode) return;
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return;
    placePickMarker(lat, lng);
    stopPickMode(false);
    setTimeout(function () { openForm(lat, lng); }, 50);
  }

  function useMapCenter() {
    var map = getMap();
    if (map && map.getCenter) {
      var c = map.getCenter();
      onPicked(c.lat, c.lng);
      return;
    }
    onPicked(-11.0152, -37.2052);
  }

  function removePickOverlay() {
    stopOverlayLoop();
    if (pickOverlay && pickOverlay.parentNode) {
      try { pickOverlay.parentNode.removeChild(pickOverlay); } catch (_) {}
    }
    pickOverlay = null;
  }

  function ensurePickOverlay() {
    removePickOverlay();
    pickOverlay = document.createElement('div');
    pickOverlay.id = 'role-pick-hit';
    pickOverlay.setAttribute('role', 'button');
    pickOverlay.setAttribute('aria-label', 'Toque no mapa para marcar o ponto do rolê');
    pickOverlay.innerHTML = '<span class="rph-hint">Toque aqui no ponto</span>';

    var lastTouch = 0;

    function handle(ev) {
      if (!pickMode) return;
      var cx, cy;
      if (ev.changedTouches && ev.changedTouches[0]) {
        cx = ev.changedTouches[0].clientX;
        cy = ev.changedTouches[0].clientY;
        lastTouch = Date.now();
      } else if (ev.clientX != null) {
        if (Date.now() - lastTouch < 450) return;
        cx = ev.clientX;
        cy = ev.clientY;
      } else {
        return;
      }
      try {
        ev.preventDefault();
        ev.stopPropagation();
      } catch (_) {}
      var ll = latLngFromClient(cx, cy);
      if (ll) onPicked(ll.lat, ll.lng);
    }

    pickOverlay.addEventListener('click', handle, true);
    pickOverlay.addEventListener('touchend', handle, { capture: true, passive: false });
    pickOverlay.addEventListener('pointerup', handle, true);

    document.body.appendChild(pickOverlay);
    positionOverlay();
    startOverlayLoop();
  }

  function setPickBanner(on) {
    if (!on) {
      if (pickBanner && pickBanner.parentNode) pickBanner.parentNode.removeChild(pickBanner);
      pickBanner = null;
      document.body.classList.remove('role-pick-mode');
      return;
    }
    document.body.classList.add('role-pick-mode');
    if (!pickBanner) {
      pickBanner = document.createElement('div');
      pickBanner.className = 'role-pick-banner';
      pickBanner.id = 'role-pick-banner';
      pickBanner.innerHTML =
        '<span>Toque no mapa</span>' +
        '<button type="button" class="rpb-center" id="role-pick-center">Usar centro</button>' +
        '<button type="button" id="role-pick-cancel">Cancelar</button>';
      document.body.appendChild(pickBanner);
      document.getElementById('role-pick-cancel').addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        stopPickMode(true);
      });
      document.getElementById('role-pick-center').addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        useMapCenter();
      });
    }
  }

  function startPickMode() {
    injectCss();
    closeAnyForm();

    if (typeof window.__cricriLoadMap === 'function') {
      try { window.__cricriLoadMap(); } catch (_) {}
    }

    var mapEl = getMapEl() || document.getElementById('mapa');
    if (mapEl) {
      try { mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      catch (_) { try { mapEl.scrollIntoView(true); } catch (__) {} }
    }

    pickMode = true;
    setPickBanner(true);

    var btn = document.getElementById('btn-marcar');
    if (btn) {
      btn.classList.add('is-pick');
      btn.textContent = 'Toque no mapa…';
    }

    function wireMap(map) {
      if (!map) return false;
      try { map.invalidateSize(true); } catch (_) {}
      disableMarkersPE(true);
      ensurePickOverlay();
      try {
        if (map.off && map._cricriRoleClick) map.off('click', map._cricriRoleClick);
        map._cricriRoleClick = function (e) {
          if (!pickMode || !e || !e.latlng) return;
          onPicked(e.latlng.lat, e.latlng.lng);
        };
        map.on('click', map._cricriRoleClick);
      } catch (_) {}
      return true;
    }

    if (attachWaitTimer) {
      clearInterval(attachWaitTimer);
      attachWaitTimer = null;
    }

    if (!wireMap(getMap())) {
      var tries = 0;
      attachWaitTimer = setInterval(function () {
        tries++;
        if (wireMap(getMap()) || tries > 50) {
          clearInterval(attachWaitTimer);
          attachWaitTimer = null;
          if (pickMode) ensurePickOverlay();
        }
      }, 120);
    }

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') stopPickMode(true);
    }, { once: true });
  }

  function stopPickMode(resetBtn) {
    pickMode = false;
    setPickBanner(false);
    removePickOverlay();
    disableMarkersPE(false);
    if (attachWaitTimer) {
      clearInterval(attachWaitTimer);
      attachWaitTimer = null;
    }
    var map = getMap();
    if (map && map.off && map._cricriRoleClick) {
      try { map.off('click', map._cricriRoleClick); } catch (_) {}
      map._cricriRoleClick = null;
    }
    var btn = document.getElementById('btn-marcar');
    if (btn && resetBtn !== false) {
      btn.classList.remove('is-pick');
      btn.textContent = 'Marcar Rolê/After';
    }
  }

  function placePickMarker(lat, lng) {
    var map = getMap();
    if (!map || typeof L === 'undefined') return;
    if (pickMarker) {
      try { map.removeLayer(pickMarker); } catch (_) {}
    }
    pickMarker = L.circleMarker([lat, lng], {
      radius: 11,
      color: '#fff',
      fillColor: '#e33d6b',
      fillOpacity: 0.95,
      weight: 3
    }).addTo(map);
    try { map.setView([lat, lng], Math.max(map.getZoom(), 16)); } catch (_) {}
  }

  function openForm(lat, lng) {
    injectCss();
    document.body.classList.remove('role-pick-mode');
    removePickOverlay();
    disableMarkersPE(false);

    var sheet = document.getElementById('cricri-role-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-role-sheet';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) {
          sheet.hidden = true;
          sheet.setAttribute('hidden', '');
        }
      });
    }
    sheet.hidden = false;
    sheet.removeAttribute('hidden');
    var kind = 'role';
    sheet.innerHTML =
      '<div class="rs-card" role="dialog" aria-modal="true" aria-label="Solicitar Rolê/After">' +
        '<div class="rs-handle"></div>' +
        '<h2>Solicitar Rolê/After</h2>' +
        '<p class="rs-sub">Ponto marcado. O admin recebe o pedido e decide se publica no mapa.</p>' +
        '<label>Tipo</label>' +
        '<div class="rs-type">' +
          '<button type="button" class="is-on" data-kind="role">Rolê</button>' +
          '<button type="button" data-kind="after">After</button>' +
        '</div>' +
        '<label for="rs-title">Nome do rolê</label>' +
        '<input id="rs-title" maxlength="80" placeholder="Ex.: After no Largo" autocomplete="off" />' +
        '<label for="rs-when">Quando (opcional)</label>' +
        '<input id="rs-when" maxlength="60" placeholder="Ex.: Sex 21/11 · 23h" autocomplete="off" />' +
        '<label for="rs-notes">Detalhes</label>' +
        '<textarea id="rs-notes" rows="3" maxlength="400" placeholder="Ponto de referência, vibe, se é aberto…"></textarea>' +
        '<label for="rs-contact">Seu contato (e-mail ou @nick)</label>' +
        '<input id="rs-contact" maxlength="120" placeholder="pra o admin te responder" autocomplete="email" />' +
        '<p class="rs-coords">Ponto: ' + Number(lat).toFixed(5) + ', ' + Number(lng).toFixed(5) + '</p>' +
        '<div class="rs-actions">' +
          '<button type="button" class="rs-cancel" data-rs="cancel">Cancelar</button>' +
          '<button type="button" class="rs-send" data-rs="send">Solicitar</button>' +
        '</div>' +
        '<p class="rs-msg" id="rs-msg" role="status"></p>' +
      '</div>';

    sheet.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        sheet.querySelectorAll('[data-kind]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        kind = b.getAttribute('data-kind') || 'role';
      });
    });
    sheet.querySelector('[data-rs="cancel"]').addEventListener('click', function () {
      sheet.hidden = true;
      sheet.setAttribute('hidden', '');
      var btn = document.getElementById('btn-marcar');
      if (btn) {
        btn.classList.remove('is-pick');
        btn.textContent = 'Marcar Rolê/After';
      }
    });
    sheet.querySelector('[data-rs="send"]').addEventListener('click', async function () {
      var title = (document.getElementById('rs-title').value || '').trim();
      var when = (document.getElementById('rs-when').value || '').trim();
      var notes = (document.getElementById('rs-notes').value || '').trim();
      var contact = (document.getElementById('rs-contact').value || '').trim();
      var msg = document.getElementById('rs-msg');
      if (!title) {
        if (msg) { msg.className = 'rs-msg err'; msg.textContent = 'Dê um nome pro rolê.'; }
        return;
      }
      var payload = {
        title: title, kind: kind, when_text: when || null, notes: notes || null,
        contact: contact || null, lat: Number(lat), lng: Number(lng),
        status: 'pending', created_at: new Date().toISOString()
      };
      if (msg) { msg.className = 'rs-msg'; msg.textContent = 'Enviando…'; }
      try {
        await submitRequest(payload);
        if (msg) {
          msg.className = 'rs-msg ok';
          msg.textContent = 'Solicitação enviada! O admin recebe o pedido pra aceitar ou recusar.';
        }
        setTimeout(function () {
          sheet.hidden = true;
          sheet.setAttribute('hidden', '');
          var btn = document.getElementById('btn-marcar');
          if (btn) {
            btn.classList.remove('is-pick');
            btn.textContent = 'Marcar Rolê/After';
          }
        }, 1800);
      } catch (e) {
        if (msg) {
          msg.className = 'rs-msg err';
          msg.textContent = (e && e.message) || 'Falha ao enviar. Tente de novo.';
        }
      }
    });

    setTimeout(function () {
      var input = document.getElementById('rs-title');
      if (input) { try { input.focus(); } catch (_) {} }
    }, 150);
  }

  async function submitRequest(payload) {
    var userId = null;
    var handle = null;
    try {
      if (window.fascAuth && window.fascAuth.user) {
        var u = await window.fascAuth.user();
        if (u) userId = u.id;
      }
    } catch (_) {}
    try {
      if (userId && window.fascDb) {
        var pr = await window.fascDb.from('profiles').select('handle').eq('id', userId).maybeSingle();
        if (pr.data && pr.data.handle) handle = pr.data.handle;
      }
    } catch (_) {}

    payload.user_id = userId;
    payload.handle = handle;

    var saved = false;
    if (window.fascDb) {
      try {
        var res = await window.fascDb.from('role_requests').insert({
          user_id: userId, handle: handle, title: payload.title, kind: payload.kind,
          when_text: payload.when_text, notes: payload.notes, contact: payload.contact,
          lat: payload.lat, lng: payload.lng, status: 'pending'
        }).select('id').maybeSingle();
        if (!res.error) {
          saved = true;
          payload.id = res.data && res.data.id;
        }
      } catch (e) {
        console.warn('[role-request]', e);
      }
    }

    try {
      var key = 'cricri-role-requests-v1';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(list)) list = [];
      list.unshift(Object.assign({ id: payload.id || ('local-' + Date.now()) }, payload));
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch (_) {}

    // Notifica admin via Edge Function (e-mail NUNCA no front)
    var base = (window.FASC_CONFIG && window.FASC_CONFIG.supabaseUrl) || '';
    var anon = (window.FASC_CONFIG && window.FASC_CONFIG.supabaseAnonKey) || '';
    if (!base) {
      console.warn('[role-request] supabaseUrl ausente — pedido salvo localmente, sem e-mail');
      return;
    }
    var endpoint = base.replace(/\/$/, '') + '/functions/v1/role-request';
    var headers = { 'Content-Type': 'application/json' };
    if (anon) {
      headers['Authorization'] = 'Bearer ' + anon;
      headers['apikey'] = anon;
    }
    var notifyBody = {
      title: payload.title,
      kind: payload.kind,
      when_text: payload.when_text || null,
      notes: payload.notes || null,
      contact: payload.contact || null,
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      handle: handle || null,
      user_id: userId || null,
      id: payload.id || null,
      saved: !!saved,
      website: '', // honeypot vazio
      path: (location.pathname || '').slice(0, 120),
      ua: (navigator.userAgent || '').slice(0, 200),
      recaptchaToken: ''
    };
    try {
      if (window.CricriRecaptcha && window.CricriRecaptcha.getToken) {
        try {
          notifyBody.recaptchaToken = await window.CricriRecaptcha.getToken('role_request');
        } catch (_) {}
      }
      var resp = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(notifyBody)
      });
      if (!resp.ok) {
        var errTxt = '';
        try { errTxt = await resp.text(); } catch (_) {}
        console.warn('[role-request] edge', resp.status, errTxt);
        // pedido já pode estar no Supabase — não falha o fluxo do usuário
      }
    } catch (err) {
      console.warn('[role-request] edge network', err);
    }
  }

  function bind() {
    injectCss();
    updateCtaCopy();
    var btn = document.getElementById('btn-marcar');
    if (!btn) return;
    if (btn.dataset.roleBound === 'v4') return;
    btn.dataset.roleBound = 'v4';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      startPickMode();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  setTimeout(bind, 600);
  setTimeout(bind, 1800);
  window.addEventListener('cricri:map-ready', function () {
    if (pickMode) {
      var map = getMap();
      if (map) {
        disableMarkersPE(true);
        ensurePickOverlay();
      }
    }
  });

  window.CricriRoleRequest = {
    __v4: true,
    start: startPickMode,
    openForm: openForm
  };
})();
