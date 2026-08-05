/**
 * CRICRI · Marcar Rolê/After
 * - Clica no mapa pra escolher o ponto
 * - Envia solicitação (Supabase + e-mail pro admin)
 * - Só aparece no mapa público depois do admin aceitar
 */
(function () {
  'use strict';
  if (window.CricriRoleRequest) return;

  var ADMIN_EMAIL =
    (window.FASC_CONFIG && window.FASC_CONFIG.adminEmail) || 'kaaiqq@gmail.com';

  var pickMode = false;
  var pickMarker = null;
  var pickLatLng = null;

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
      'background:rgba(0,0,0,.58);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-role-sheet[hidden]{display:none!important}',
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
      'body.role-pick-mode #map,.role-pick-mode .leaflet-container{cursor:crosshair!important}',
      '.role-pick-banner{position:fixed;top:max(.75rem,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:100110;',
      'background:rgba(227,61,107,.95);color:#fff;padding:.55rem 1rem;border-radius:999px;font:700 .75rem/1.2 Oswald,system-ui,sans-serif;',
      'letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:92vw;text-align:center}'
    ].join('');
    document.head.appendChild(s);
  }

  function getMap() {
    if (window.projanoMap && window.projanoMap.map) return window.projanoMap.map;
    if (window.L && document.getElementById('map') && window._cricriLeafletMap) {
      return window._cricriLeafletMap;
    }
    return null;
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
      el.textContent = 'Toque no mapa onde é o rolê · Esc cancela';
      document.body.appendChild(el);
    }
  }

  function startPickMode() {
    injectCss();
    var map = getMap();
    if (!map && typeof L === 'undefined') {
      alert('Mapa ainda carregando. Espere um instante e tente de novo.');
      return;
    }
    pickMode = true;
    setPickBanner(true);
    var btn = document.getElementById('btn-marcar');
    if (btn) {
      btn.classList.add('is-pick');
      btn.textContent = 'Clique no mapa…';
    }

    function onMapClick(e) {
      if (!pickMode) return;
      pickLatLng = e.latlng || (e.latlng === undefined && e.lat != null ? { lat: e.lat, lng: e.lng } : null);
      if (!pickLatLng && e.latlng) pickLatLng = e.latlng;
      if (!pickLatLng) return;
      placePickMarker(pickLatLng.lat, pickLatLng.lng);
      stopPickMode(false);
      openForm(pickLatLng.lat, pickLatLng.lng);
    }

    if (map && map.on) {
      map._cricriRoleClick = onMapClick;
      map.on('click', onMapClick);
    } else {
      // fallback: geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            stopPickMode(false);
            openForm(pos.coords.latitude, pos.coords.longitude);
          },
          function () {
            stopPickMode(true);
            openForm(-11.0152, -37.2052);
          },
          { enableHighAccuracy: true, timeout: 12000 }
        );
      } else {
        stopPickMode(true);
        openForm(-11.0152, -37.2052);
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') stopPickMode(true);
    }
    document.addEventListener('keydown', onKey, { once: true });
  }

  function stopPickMode(resetBtn) {
    pickMode = false;
    setPickBanner(false);
    var map = getMap();
    if (map && map.off && map._cricriRoleClick) {
      map.off('click', map._cricriRoleClick);
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
      radius: 10,
      color: '#e33d6b',
      fillColor: '#e33d6b',
      fillOpacity: 0.85,
      weight: 2
    }).addTo(map);
    pickMarker.bindPopup('Seu rolê (pendente de aceite)').openPopup();
    try { map.setView([lat, lng], Math.max(map.getZoom(), 16)); } catch (_) {}
  }

  function openForm(lat, lng) {
    injectCss();
    var sheet = document.getElementById('cricri-role-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-role-sheet';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) sheet.hidden = true;
      });
    }
    sheet.hidden = false;
    var kind = 'role';
    sheet.innerHTML =
      '<div class="rs-card" role="dialog" aria-modal="true" aria-label="Solicitar Rolê/After">' +
        '<div class="rs-handle"></div>' +
        '<h2>Solicitar Rolê/After</h2>' +
        '<p class="rs-sub">O admin recebe no e-mail e decide se publica no mapa. Seu ponto só fica visível pra geral depois do aceite.</p>' +
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
      if (msg) { msg.className = 'rs-msg'; msg.textContent = 'Enviando…'; }
      try {
        await submitRequest(payload);
        if (msg) {
          msg.className = 'rs-msg ok';
          msg.textContent = 'Solicitação enviada! O admin recebe no e-mail pra aceitar ou recusar.';
        }
        setTimeout(function () {
          sheet.hidden = true;
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

    // 1) Supabase (se tabela existir)
    var saved = false;
    if (window.fascDb) {
      try {
        var res = await window.fascDb.from('role_requests').insert({
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
        }).select('id').maybeSingle();
        if (!res.error) {
          saved = true;
          payload.id = res.data && res.data.id;
        } else {
          console.warn('[role-request] insert', res.error);
        }
      } catch (e) {
        console.warn('[role-request]', e);
      }
    }

    // 2) localStorage backup
    try {
      var key = 'cricri-role-requests-v1';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(list)) list = [];
      list.unshift(Object.assign({ id: payload.id || ('local-' + Date.now()) }, payload));
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch (_) {}

    // 3) E-mail pro admin (mailto — chega na caixa)
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
        'User ID: ' + (userId || '—'),
        'Coords: ' + payload.lat + ', ' + payload.lng,
        'Mapa: https://www.openstreetmap.org/?mlat=' + payload.lat + '&mlon=' + payload.lng + '#map=17/' + payload.lat + '/' + payload.lng,
        '',
        'Detalhes:',
        payload.notes || '—',
        '',
        'Para ACEITAR ou RECUSAR, abra o painel admin:',
        (location.origin || 'https://cricri-2026.vercel.app') + '/admin-roles.html',
        '',
        saved ? '(também salvo no Supabase · role_requests)' : '(salve no Supabase rodando STEP_V_role_requests.sql)'
      ].join('\n')
    );
    // abre cliente de e-mail do usuário (admin recebe a solicitação)
    // usa link oculto pra não perder o fluxo se popup bloquear
    var a = document.createElement('a');
    a.href = 'mailto:' + ADMIN_EMAIL + '?subject=' + subject + '&body=' + body;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { try { a.remove(); } catch (_) {} }, 500);

    return payload;
  }

  function bind() {
    injectCss();
    updateCtaCopy();
    var btn = document.getElementById('btn-marcar');
    if (!btn || btn.dataset.roleBound === '1') return;
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

  window.CricriRoleRequest = {
    start: startPickMode,
    openForm: openForm
  };
})();
