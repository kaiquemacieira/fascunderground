/**
 * CRICRI · Marcar Rolê/After
 * 1) Entra em modo de clique no mapa (sem abrir form)
 * 2) Só abre o formulário depois do clique no ponto
 *
 * v3: overlay de captura garante clique/toque mesmo sobre markers/controles
 */
(function () {
  'use strict';
  if (window.CricriRoleRequest && window.CricriRoleRequest.__v3) return;

  var ADMIN_EMAIL = null; // removido — Edge Function role-request

  var pickMode = false;
  var pickMarker = null;
  var pickLatLng = null;
  var mapClickHandler = null;
  var mapDomClickHandler = null;
  var pickOverlay = null;
  var attachWaitTimer = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
      '#cricri-role-sheet input,#cricri-role-sheet textarea,#cricri-role-sheet select{',
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
      /* pick mode: form NÃO aparece; mapa livre pra clicar */
      'body.role-pick-mode #cricri-role-sheet{display:none!important;pointer-events:none!important}',
      'body.role-pick-mode #map,body.role-pick-mode .leaflet-container{',
      'cursor:crosshair!important;z-index:5600!important;position:relative!important}',
      'body.role-pick-mode .leaflet-container,body.role-pick-mode .leaflet-pane,',
      'body.role-pick-mode .leaflet-map-pane,body.role-pick-mode .leaflet-overlay-pane,',
      'body.role-pick-mode .leaflet-marker-pane,body.role-pick-mode .leaflet-shadow-pane,',
      'body.role-pick-mode .leaflet-tooltip-pane,body.role-pick-mode .leaflet-popup-pane{',
      'pointer-events:auto!important}',
      'body.role-pick-mode #cricri-install-btn,body.role-pick-mode #cricri-create-sheet,',
      'body.role-pick-mode .a11y-panel{pointer-events:none!important}',
      'body.role-pick-mode nav.bottom-nav,body.role-pick-mode nav.bottom-nav[data-cricri-nav="1"]{',
      'pointer-events:none!important;opacity:.35!important}',
      /* overlay transparente por cima de markers — captura clique/toque */
      '.role-pick-overlay{position:absolute;inset:0;z-index:650;cursor:crosshair;',
      'background:transparent;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.role-pick-banner{position:fixed;top:max(.75rem,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:100110;',
      'background:rgba(227,61,107,.96);color:#fff;padding:.6rem 1.1rem;border-radius:999px;font:700 .75rem/1.25 Oswald,system-ui,sans-serif;',
      'letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.45);max-width:92vw;text-align:center;',
      'pointer-events:auto}',
      '.role-pick-banner button{appearance:none;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:#fff;',
      'border-radius:999px;padding:.25rem .55rem;margin-left:.45rem;font:700 .68rem/1 Oswald,system-ui,sans-serif;cursor:pointer}'
    ].join('');
    document.head.appendChild(s);
  }

  function getMap() {
    if (window.projanoMap && window.projanoMap.map) return window.projanoMap.map;
    if (window._cricriLeafletMap) return window._cricriLeafletMap;
    var el = document.getElementById('map');
    if (el && el._leaflet_id && window.L && L.Map) {
      try {
        if (el._leaflet) return el._leaflet;
      } catch (_) {}
    }
    if (window.projanoMapLayers && window.projanoMapLayers.map) return window.projanoMapLayers.map;
    return null;
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
    var hint = document.querySelector('.map-role-hint');
    var cta = document.getElementById('map-role-cta');
    if (btn) {
      btn.textContent = 'Marcar Rolê/After';
      btn.classList.add('btn-role');
    }
    if (cta && !document.getElementById('map-role-desc')) {
      var desc = document.createElement('p');
      desc.id = 'map-role-desc';
      desc.className = 'map-role-desc';
      desc.innerHTML =
        'Aqui você deixa o público ciente de que seu <strong>rolê está garantido no mapa</strong>. ' +
        'Toque no botão, <strong>clique no mapa</strong> no ponto do rolê e envie a solicitação. ' +
        'Peça o quanto antes — o admin precisa <strong>aceitar</strong> antes de aparecer pra geral.';
      if (hint && hint.parentNode) hint.parentNode.insertBefore(desc, hint);
      else if (cta) cta.appendChild(desc);
    }
    if (hint) {
      hint.textContent = 'Solicitação vai pro admin por e-mail. Só entra no mapa depois do aceite.';
    }
  }

  function setPickBanner(on) {
    var el = document.getElementById('role-pick-banner');
    if (!on) {
      if (el) el.remove();
      document.body.classList.remove('role-pick-mode');
      return;
    }
    document.body.classList.add('role-pick-mode');
    if (!el) {
      el = document.createElement('div');
      el.id = 'role-pick-banner';
      el.className = 'role-pick-banner';
      el.innerHTML =
        'Toque no mapa onde é o rolê' +
        ' <button type="button" id="role-pick-cancel">Cancelar</button>';
      document.body.appendChild(el);
      document.getElementById('role-pick-cancel').addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        stopPickMode(true);
      });
    }
  }

  function latLngFromEvent(e) {
    if (!e) return null;
    if (e.latlng && e.latlng.lat != null) return e.latlng;
    if (e.lat != null && e.lng != null) return { lat: e.lat, lng: e.lng };
    var map = getMap();
    if (map && e.clientX != null && typeof map.mouseEventToLatLng === 'function') {
      try {
        return map.mouseEventToLatLng(e);
      } catch (_) {}
    }
    if (map && e.originalEvent && typeof map.mouseEventToLatLng === 'function') {
      try {
        return map.mouseEventToLatLng(e.originalEvent);
      } catch (_) {}
    }
    // touch
    if (map && e.changedTouches && e.changedTouches[0] && typeof map.mouseEventToLatLng === 'function') {
      try {
        var t = e.changedTouches[0];
        var fake = { clientX: t.clientX, clientY: t.clientY };
        return map.mouseEventToLatLng(fake);
      } catch (_) {}
    }
    return null;
  }

  function onPicked(lat, lng) {
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return;
    if (!pickMode) return;
    pickLatLng = { lat: lat, lng: lng };
    placePickMarker(lat, lng);
    stopPickMode(false);
    // abre form só AGORA, depois do clique
    setTimeout(function () {
      openForm(lat, lng);
    }, 60);
  }

  function removePickOverlay() {
    if (pickOverlay && pickOverlay.parentNode) {
      try {
        pickOverlay.parentNode.removeChild(pickOverlay);
      } catch (_) {}
    }
    pickOverlay = null;
  }

  function ensurePickOverlay() {
    removePickOverlay();
    var container =
      document.querySelector('#map.leaflet-container, .leaflet-container') ||
      document.getElementById('map');
    if (!container) return;

    // container precisa ser relative pra o overlay absolute cobrir
    var pos = window.getComputedStyle(container).position;
    if (pos === 'static') {
      container.style.position = 'relative';
    }

    pickOverlay = document.createElement('div');
    pickOverlay.className = 'role-pick-overlay';
    pickOverlay.setAttribute('aria-hidden', 'true');
    pickOverlay.title = 'Toque para marcar o ponto do rolê';

    function handlePointer(ev) {
      if (!pickMode) return;
      if (ev.type === 'touchend' || ev.type === 'pointerup' || ev.type === 'click') {
        // evita double-fire (touch + click)
        if (ev.type === 'touchend' || ev.type === 'pointerup') {
          try {
            ev.preventDefault();
          } catch (_) {}
        }
        var ll = latLngFromEvent(ev);
        if (ll) {
          try {
            ev.stopPropagation();
          } catch (_) {}
          onPicked(ll.lat, ll.lng);
        }
      }
    }

    pickOverlay.addEventListener('click', handlePointer, true);
    pickOverlay.addEventListener('touchend', handlePointer, { capture: true, passive: false });
    pickOverlay.addEventListener('pointerup', handlePointer, true);

    container.appendChild(pickOverlay);
  }

  function startPickMode() {
    injectCss();
    closeAnyForm();

    // garante mapa carregado (lazy)
    if (typeof window.__cricriLoadMap === 'function' && !getMap()) {
      try {
        window.__cricriLoadMap();
      } catch (_) {}
    }

    var mapEl = document.getElementById('map') || document.getElementById('mapa');
    if (mapEl) {
      try {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {
        try {
          mapEl.scrollIntoView(true);
        } catch (__) {}
      }
    }

    pickMode = true;
    setPickBanner(true);
    var btn = document.getElementById('btn-marcar');
    if (btn) {
      btn.classList.add('is-pick');
      btn.textContent = 'Clique no mapa…';
    }

    function handleMapClick(e) {
      if (!pickMode) return;
      var ll = latLngFromEvent(e);
      if (!ll) return;
      if (e && e.originalEvent) {
        try {
          e.originalEvent.preventDefault();
          e.originalEvent.stopPropagation();
        } catch (_) {}
      }
      onPicked(ll.lat, ll.lng);
    }

    mapClickHandler = handleMapClick;

    function attach(map) {
      if (!map) return false;
      try {
        if (map.off && map._cricriRoleClick) map.off('click', map._cricriRoleClick);
        map._cricriRoleClick = handleMapClick;
        map.on('click', handleMapClick);
        try {
          map.invalidateSize(true);
        } catch (_) {}
        ensurePickOverlay();
        return true;
      } catch (_) {
        return false;
      }
    }

    if (attachWaitTimer) {
      clearInterval(attachWaitTimer);
      attachWaitTimer = null;
    }

    var map = getMap();
    if (!attach(map)) {
      // tenta de novo quando o mapa carregar
      var tries = 0;
      attachWaitTimer = setInterval(function () {
        tries++;
        map = getMap();
        if (attach(map) || tries > 40) {
          clearInterval(attachWaitTimer);
          attachWaitTimer = null;
          // mesmo sem API Leaflet, coloca overlay no #map
          if (pickMode && !pickOverlay) ensurePickOverlay();
        }
      }, 150);
    }

    // fallback DOM no container (além do overlay)
    var container =
      document.querySelector('#map.leaflet-container, #map .leaflet-container, .leaflet-container') ||
      document.getElementById('map');
    if (container && !mapDomClickHandler) {
      mapDomClickHandler = function (ev) {
        if (!pickMode) return;
        if (ev.target && ev.target.closest && ev.target.closest('.leaflet-control, a, button, .role-pick-banner')) {
          return;
        }
        var m = getMap();
        if (m && typeof m.mouseEventToLatLng === 'function') {
          try {
            var ll = m.mouseEventToLatLng(ev);
            if (ll) onPicked(ll.lat, ll.lng);
          } catch (_) {}
        }
      };
      container.addEventListener('click', mapDomClickHandler, true);
      container.addEventListener('touchend', mapDomClickHandler, { capture: true, passive: true });
    }

    function onKey(e) {
      if (e.key === 'Escape') stopPickMode(true);
    }
    document.addEventListener('keydown', onKey, { once: true });
  }

  function stopPickMode(resetBtn) {
    pickMode = false;
    setPickBanner(false);
    removePickOverlay();
    if (attachWaitTimer) {
      clearInterval(attachWaitTimer);
      attachWaitTimer = null;
    }
    var map = getMap();
    if (map && map.off && map._cricriRoleClick) {
      try {
        map.off('click', map._cricriRoleClick);
      } catch (_) {}
      map._cricriRoleClick = null;
    }
    mapClickHandler = null;
    if (mapDomClickHandler) {
      var container =
        document.querySelector('#map.leaflet-container, #map .leaflet-container, .leaflet-container') ||
        document.getElementById('map');
      if (container) {
        try {
          container.removeEventListener('click', mapDomClickHandler, true);
        } catch (_) {}
        try {
          container.removeEventListener('touchend', mapDomClickHandler, true);
        } catch (_) {}
      }
      mapDomClickHandler = null;
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
      try {
        map.removeLayer(pickMarker);
      } catch (_) {}
    }
    pickMarker = L.circleMarker([lat, lng], {
      radius: 10,
      color: '#e33d6b',
      fillColor: '#e33d6b',
      fillOpacity: 0.85,
      weight: 2
    }).addTo(map);
    try {
      pickMarker.bindPopup('Seu rolê (pendente de aceite)').openPopup();
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    } catch (_) {}
  }

  function openForm(lat, lng) {
    injectCss();
    document.body.classList.remove('role-pick-mode');
    removePickOverlay();

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
        '<p class="rs-sub">Ponto marcado no mapa. O admin recebe no e-mail e decide se publica.</p>' +
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
        '<p class="rs-coords">Ponto: ' +
        Number(lat).toFixed(5) +
        ', ' +
        Number(lng).toFixed(5) +
        '</p>' +
        '<div class="rs-actions">' +
          '<button type="button" class="rs-cancel" data-rs="cancel">Cancelar</button>' +
          '<button type="button" class="rs-send" data-rs="send">Solicitar</button>' +
        '</div>' +
        '<p class="rs-msg" id="rs-msg" role="status"></p>' +
      '</div>';

    sheet.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        sheet.querySelectorAll('[data-kind]').forEach(function (x) {
          x.classList.remove('is-on');
        });
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
        if (msg) {
          msg.className = 'rs-msg err';
          msg.textContent = 'Dê um nome pro rolê.';
        }
        return;
      }
      var payload = {
        title: title,
        kind: kind,
        when_text: when || null,
        notes: notes || null,
        contact: contact || null,
        lat: Number(lat),
        lng: Number(lng),
        status: 'pending',
        created_at: new Date().toISOString()
      };
      if (msg) {
        msg.className = 'rs-msg';
        msg.textContent = 'Enviando…';
      }
      try {
        await submitRequest(payload);
        if (msg) {
          msg.className = 'rs-msg ok';
          msg.textContent = 'Solicitação enviada! O admin recebe no e-mail pra aceitar ou recusar.';
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

    // foca o título pra facilitar no mobile
    setTimeout(function () {
      var input = document.getElementById('rs-title');
      if (input) {
        try {
          input.focus();
        } catch (_) {}
      }
    }, 120);
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
        var res = await window.fascDb
          .from('role_requests')
          .insert({
            user_id: userId,
            handle: handle,
            title: payload.title,
            kind: payload.kind,
            when_text: payload.when_text,
            notes: payload.notes,
            contact: payload.contact,
            lat: payload.lat,
            lng: payload.lng,
            status: 'pending'
          })
          .select('id')
          .maybeSingle();
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
      list.unshift(Object.assign({ id: payload.id || 'local-' + Date.now() }, payload));
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch (_) {}

    var subject = encodeURIComponent(
      '[CRICRI] Solicitar ' + (payload.kind === 'after' ? 'After' : 'Rolê') + ': ' + payload.title
    );
    var body = encodeURIComponent(
      [
        'Nova solicitação de ' + (payload.kind === 'after' ? 'After' : 'Rolê') + ' no mapa CRICRI',
        '',
        'Título: ' + payload.title,
        'Tipo: ' + payload.kind,
        'Quando: ' + (payload.when_text || '—'),
        'Contato: ' + (payload.contact || '—'),
        'Nick: ' + (handle ? '@' + handle : '—'),
        'Coords: ' + payload.lat + ', ' + payload.lng,
        'Mapa: https://www.openstreetmap.org/?mlat=' +
          payload.lat +
          '&mlon=' +
          payload.lng +
          '#map=17/' +
          payload.lat +
          '/' +
          payload.lng,
        '',
        'Detalhes:',
        payload.notes || '—',
        '',
        'Admin: ' + (location.origin || '') + '/admin-roles.html',
        saved ? '(salvo no Supabase)' : '(rode STEP_V_role_requests.sql)'
      ].join('\n')
    );
    var a = document.createElement('a');
    a.href = '#'; // legado: use js/role-request.js + Edge Function
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try {
        a.remove();
      } catch (_) {}
    }, 500);
    return payload;
  }

  function bind() {
    injectCss();
    updateCtaCopy();
    var btn = document.getElementById('btn-marcar');
    if (!btn) return;
    if (btn.dataset.roleBound === '1') return;
    btn.dataset.roleBound = '1';
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
  setTimeout(bind, 800);
  setTimeout(bind, 2000);

  window.CricriRoleRequest = {
    __v3: true,
    start: startPickMode,
    openForm: openForm
  };
})();
