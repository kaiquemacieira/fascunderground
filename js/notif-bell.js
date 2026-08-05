/**
 * CRICRI · Sininho global
 * - Pedidos de amizade (aceitar / recusar)
 * - Avisos locais (scrap, etc.)
 * - Ativar push (Web Push / VAPID)
 *
 * Posição: canto superior direito, abaixo do FAB de acessibilidade.
 */
(function () {
  'use strict';
  if (window.__cricriNotifBellMounted) return;
  window.__cricriNotifBellMounted = true;

  var STORAGE = 'cricri-notifs-v1';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocal(list) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify((list || []).slice(0, 40)));
    } catch (_) {}
  }

  /** API pública pra empilhar avisos */
  function pushNotif(item) {
    var list = loadLocal();
    list.unshift({
      id: item.id || ('n-' + Date.now()),
      ico: item.ico || '•',
      title: item.title || 'CRICRI',
      body: item.body || '',
      kind: item.kind || 'info',
      at: item.at || Date.now(),
      href: item.href || null
    });
    saveLocal(list);
    try {
      window.dispatchEvent(new CustomEvent('cricri:notifs-changed'));
    } catch (_) {}
    renderIfOpen();
    updateBadge();
  }

  window.CricriNotifBell = {
    push: pushNotif,
    refresh: function () {
      return refreshAll();
    },
    open: function () {
      var panel = document.getElementById('cricri-notif-panel');
      var btn = document.getElementById('cricri-notif-bell');
      if (panel) {
        panel.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
        refreshAll();
      }
    }
  };

  var pendingRequests = [];
  var lastRefresh = 0;

  function avatarBits(pr) {
    pr = pr || {};
    var photo = (pr.photo_url || '').toString();
    if (photo.indexOf('emoji:') === 0) {
      return '<span class="cnb-av is-emoji">' + esc(photo.slice(6) || '🎨') + '</span>';
    }
    if (/^https?:\/\//i.test(photo)) {
      return '<span class="cnb-av"><img src="' + esc(photo) + '" alt="" width="36" height="36"></span>';
    }
    var letter = ((pr.handle || pr.name || '?') + '').replace(/^@/, '').charAt(0).toUpperCase();
    return '<span class="cnb-av is-letter">' + esc(letter) + '</span>';
  }

  async function refreshRequests() {
    if (!window.CricriFriends || !window.CricriFriends.listIncomingRequests) {
      pendingRequests = [];
      return;
    }
    try {
      pendingRequests = await window.CricriFriends.listIncomingRequests();
    } catch (_) {
      pendingRequests = [];
    }
  }

  function renderList() {
    var ul = document.getElementById('cricri-notif-list');
    var empty = document.getElementById('cricri-notif-empty');
    if (!ul) return;
    ul.innerHTML = '';

    // pedidos primeiro
    pendingRequests.forEach(function (req) {
      var pr = req.profile || {};
      var nick = pr.handle ? '@' + pr.handle : (pr.name || 'alguém');
      var li = document.createElement('li');
      li.className = 'cnb-item cnb-request';
      li.dataset.fromId = req.from_id || '';
      li.dataset.rowId = req.id || '';
      li.innerHTML =
        avatarBits(pr) +
        '<span class="cnb-meta">' +
          '<strong>Pedido de amizade</strong>' +
          '<span>' + esc(nick) + ' quer conectar com você</span>' +
          '<span class="cnb-actions">' +
            '<button type="button" class="cnb-btn cnb-accept" data-act="accept">Aceitar</button>' +
            '<button type="button" class="cnb-btn cnb-reject" data-act="reject">Recusar</button>' +
          '</span>' +
        '</span>';
      ul.appendChild(li);
    });

    loadLocal().forEach(function (n) {
      var li = document.createElement('li');
      li.className = 'cnb-item';
      li.innerHTML =
        '<span class="cnb-ico" aria-hidden="true">' + esc(n.ico || '•') + '</span>' +
        '<span class="cnb-meta"><strong>' + esc(n.title || '') + '</strong><span>' +
        esc(n.body || '') + '</span></span>';
      if (n.href) {
        li.style.cursor = 'pointer';
        li.addEventListener('click', function () {
          window.location.href = n.href;
        });
      }
      ul.appendChild(li);
    });

    if (empty) empty.hidden = ul.children.length > 0;
  }

  function updateBadge() {
    var badge = document.getElementById('cricri-notif-badge');
    if (!badge) return;
    var n = pendingRequests.length + loadLocal().length;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = String(Math.min(n, 9));
    } else {
      badge.hidden = true;
    }
  }

  function renderIfOpen() {
    var panel = document.getElementById('cricri-notif-panel');
    if (panel && !panel.hidden) renderList();
  }

  async function refreshAll() {
    lastRefresh = Date.now();
    await refreshRequests();
    renderList();
    updateBadge();
    refreshPushStatus();
  }

  function refreshPushStatus() {
    var st = document.getElementById('cnb-push-status');
    if (!st) return;
    if (!('Notification' in window)) {
      st.textContent = 'Este navegador não suporta notificações.';
      return;
    }
    var perm = Notification.permission;
    if (perm === 'granted') st.textContent = 'Push ativo neste aparelho.';
    else if (perm === 'denied') st.textContent = 'Permissão bloqueada nas configs do navegador.';
    else st.textContent = 'Aguardando permissão — ative pra avisar com a aba fechada.';
  }

  async function enablePush() {
    var st = document.getElementById('cnb-push-status');
    try {
      if (window.CricriPush && typeof window.CricriPush.enable === 'function') {
        await window.CricriPush.enable();
        if (st) st.textContent = 'Push ativo neste aparelho.';
        return;
      }
      // fallback mínimo
      if (!('Notification' in window)) throw new Error('Sem Notification API');
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        if (st) st.textContent = 'Permissão não concedida.';
        return;
      }
      if (st) st.textContent = 'Permissão ok. Configure VAPID pra push completo (docs/PUSH.md).';
      if (window.CricriPush && typeof window.CricriPush.sync === 'function') {
        await window.CricriPush.sync();
      }
    } catch (e) {
      if (st) st.textContent = (e && e.message) || 'Falha ao ativar push';
    }
  }

  function injectStyles() {
    if (document.getElementById('cricri-notif-bell-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-notif-bell-css';
    s.textContent = [
      '#cricri-top-tools{position:fixed!important;top:max(0.65rem,env(safe-area-inset-top,0px))!important;right:calc(0.65rem + 52px + env(safe-area-inset-right,0px))!important;left:auto!important;z-index:100050!important;display:flex!important;flex-direction:column;align-items:flex-end;gap:0.45rem;pointer-events:auto!important;margin:0!important;padding:0!important;visibility:visible!important;opacity:1!important}',
      '#cricri-notif-bell{appearance:none;width:44px;height:44px;border-radius:12px;border:1.5px solid #e33d6b;background:rgba(12,10,9,0.95);color:#ebe3cf;display:flex!important;align-items:center;justify-content:center;cursor:pointer;position:relative;box-shadow:0 6px 20px rgba(0,0,0,0.45);backdrop-filter:blur(8px);visibility:visible!important;opacity:1!important}',
      '#cricri-notif-bell:hover{border-color:rgba(227,61,107,0.45);color:#e33d6b}',
      '#cricri-notif-bell svg{width:22px;height:22px}',
      '#cricri-notif-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#e33d6b;color:#fff;font:700 0.65rem/18px system-ui,sans-serif;text-align:center}',
      '#cricri-notif-panel{width:min(92vw,320px);max-height:min(70vh,420px);overflow:auto;background:#14110f;border:1.5px solid rgba(230,220,196,0.14);border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,0.5);padding:0.75rem;color:#ebe3cf}',
      '#cricri-notif-panel h2{margin:0 0 0.5rem;font:700 0.85rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-notif-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.45rem}',
      '.cnb-item{display:flex;gap:0.55rem;align-items:flex-start;padding:0.55rem;border-radius:10px;background:rgba(230,220,196,0.05);border:1px solid rgba(230,220,196,0.08)}',
      '.cnb-item.cnb-request{border-color:rgba(227,61,107,0.28);background:rgba(227,61,107,0.08)}',
      '.cnb-ico{flex:none;width:28px;text-align:center;font-size:1.1rem}',
      '.cnb-av{flex:none;width:36px;height:36px;border-radius:10px;overflow:hidden;background:rgba(227,61,107,0.25);display:flex;align-items:center;justify-content:center;font-size:1.1rem}',
      '.cnb-av img{width:100%;height:100%;object-fit:cover}',
      '.cnb-av.is-letter{font-weight:700;font-family:Oswald,system-ui,sans-serif}',
      '.cnb-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:0.15rem;font-size:0.78rem;line-height:1.35;color:#cfc5b4}',
      '.cnb-meta strong{color:#ebe3cf;font-size:0.82rem}',
      '.cnb-actions{display:flex;gap:0.35rem;margin-top:0.35rem;flex-wrap:wrap}',
      '.cnb-btn{appearance:none;border-radius:8px;border:1.5px solid transparent;padding:0.35rem 0.65rem;font:600 0.72rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.04em;text-transform:uppercase;cursor:pointer}',
      '.cnb-accept{background:#e33d6b;color:#fff;border-color:#e33d6b}',
      '.cnb-reject{background:transparent;color:#cfc5b4;border-color:rgba(230,220,196,0.22)}',
      '.cnb-push{margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid rgba(230,220,196,0.12)}',
      '.cnb-push p{margin:0 0 0.4rem;font-size:0.72rem;line-height:1.35;color:#8c8376}',
      '.cnb-push-row{display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center}',
      'html[data-theme="light"] #cricri-notif-bell,html[data-a11y-theme="light"] #cricri-notif-bell{background:rgba(243,236,220,0.95);color:#17120e}',
      'html[data-theme="light"] #cricri-notif-panel,html[data-a11y-theme="light"] #cricri-notif-panel{background:#fffef8;color:#17120e;border-color:rgba(28,21,17,0.12)}',
      'html[data-theme="light"] .cnb-meta,html[data-a11y-theme="light"] .cnb-meta{color:#5c564e}',
      'html[data-theme="light"] .cnb-meta strong,html[data-a11y-theme="light"] .cnb-meta strong{color:#17120e}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function mount() {
    injectStyles();
    // remove legado
    try {
      var legacy = document.getElementById('cricri-top-tools');
      if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    } catch (_) {}

    var wrap = el('div', '');
    wrap.id = 'cricri-top-tools';

    var bellBtn = el('button', '');
    bellBtn.id = 'cricri-notif-bell';
    bellBtn.type = 'button';
    bellBtn.setAttribute('aria-label', 'Notificações');
    bellBtn.setAttribute('aria-expanded', 'false');
    bellBtn.setAttribute('aria-controls', 'cricri-notif-panel');
    bellBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"/>' +
      '<path d="M9.5 17a2.5 2.5 0 0 0 5 0"/>' +
      '</svg>' +
      '<span id="cricri-notif-badge" hidden>0</span>';

    var panel = el('div', '');
    panel.id = 'cricri-notif-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notificações');
    panel.innerHTML =
      '<h2>Notificações</h2>' +
      '<ul id="cricri-notif-list"></ul>' +
      '<p id="cricri-notif-empty" hidden style="margin:0.5rem 0;font-size:0.78rem;color:#8c8376">Nada por agora. A roda avisa quando rolar.</p>' +
      '<div class="cnb-push">' +
        '<p id="cnb-push-status">Aguardando permissão</p>' +
        '<div class="cnb-push-row">' +
          '<button type="button" class="cnb-btn cnb-accept" id="cnb-push-enable">Ativar notificações</button>' +
          '<button type="button" class="cnb-btn cnb-reject" id="cnb-notif-clear">Limpar</button>' +
        '</div>' +
        '<p style="margin-top:0.45rem;font-size:0.68rem;color:#8c8376">HTTPS + VAPID pra push com aba fechada · docs/PUSH.md</p>' +
      '</div>';

    wrap.appendChild(bellBtn);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);
    // força visibilidade (páginas com CSS agressivo / a11y alto)
    wrap.style.cssText = [
      'position:fixed',
      'top:max(0.65rem, env(safe-area-inset-top, 0px))',
      'right:calc(0.65rem + 52px + env(safe-area-inset-right, 0px))',
      'left:auto',
      'z-index:100050',
      'display:flex',
      'flex-direction:column',
      'align-items:flex-end',
      'gap:0.45rem',
      'pointer-events:auto',
      'visibility:visible',
      'opacity:1',
      'margin:0',
      'padding:0'
    ].join(';');
    bellBtn.style.display = 'flex';
    bellBtn.style.visibility = 'visible';

    function closePanel() {
      panel.hidden = true;
      bellBtn.setAttribute('aria-expanded', 'false');
    }

    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) {
        panel.hidden = false;
        bellBtn.setAttribute('aria-expanded', 'true');
        refreshAll();
      } else {
        closePanel();
      }
    });

    document.addEventListener('click', function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) closePanel();
    });

    panel.addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var item = btn.closest('.cnb-request');
      if (!item) return;
      var fromId = item.dataset.fromId;
      var rowId = item.dataset.rowId || null;
      var act = btn.getAttribute('data-act');
      btn.disabled = true;
      try {
        if (act === 'accept') {
          await window.CricriFriends.acceptRequest(fromId, rowId);
          pushNotif({
            ico: '🤝',
            title: 'Amizade aceita',
            body: 'Vocês estão conectados na roda',
            kind: 'friend'
          });
        } else if (act === 'reject') {
          await window.CricriFriends.rejectRequest(fromId, rowId);
        }
        await refreshAll();
        if (typeof window.__cricriLoadFriendsOnline === 'function') {
          window.__cricriLoadFriendsOnline();
        }
      } catch (err) {
        console.warn('[notif-bell]', err && err.message);
        btn.disabled = false;
      }
    });

    var pushBtn = document.getElementById('cnb-push-enable');
    if (pushBtn) pushBtn.addEventListener('click', function () { enablePush(); });

    var clearBtn = document.getElementById('cnb-notif-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveLocal([]);
        renderList();
        updateBadge();
      });
    }

    // realtime + eventos
    window.addEventListener('cricri:friend-accepted', function () {
      invalidateAndRefresh();
    });
    window.addEventListener('cricri:notifs-changed', function () {
      updateBadge();
      renderIfOpen();
    });

    subscribeConnections();
    setTimeout(refreshAll, 600);
    setInterval(function () {
      if (document.visibilityState === 'visible') refreshRequests().then(updateBadge);
    }, 45000);
  }

  function invalidateAndRefresh() {
    if (window.CricriFriends && window.CricriFriends.invalidate) {
      window.CricriFriends.invalidate();
    }
    refreshAll();
    if (typeof window.__cricriLoadFriendsOnline === 'function') {
      try { window.__cricriLoadFriendsOnline(); } catch (_) {}
    }
  }

  function subscribeConnections() {
    var client = window.fascDb;
    if (!client || !client.channel) return;
    try {
      client
        .channel('cricri-conn-notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, function () {
          invalidateAndRefresh();
        })
        .subscribe();
    } catch (e) {
      console.info('[notif-bell] realtime skip', e && e.message);
    }
  }

  function boot() {
    // espera body
    if (!document.body) {
      setTimeout(boot, 50);
      return;
    }
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
