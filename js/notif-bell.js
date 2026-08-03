/**
 * CRICRI · sininho de notificações + engrenagem (todas as páginas)
 * Tipos: amigos, novos seguidores/conexões, scraps, SHOW em breve
 */
(function () {
  if (window.__cricriTopToolsMounted) return;
  window.__cricriTopToolsMounted = true;

  var DEMO = [
    { ico: '👥', title: 'Novo seguidor', body: 'alguém te adicionou nas conexões', kind: 'follower' },
    { ico: '✉️', title: 'Novo scrap', body: 'recado na sua caixinha', kind: 'scrap' },
    { ico: '🔥', title: 'Amigo online', body: 'alguém da roda está por perto', kind: 'friend' },
    { ico: '🎤', title: 'SHOW em breve', body: 'aviso de atração perto de você — em breve', kind: 'show' }
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function loadNotifs() {
    try {
      var raw = localStorage.getItem('cricri-notifs-v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DEMO.slice();
  }

  function saveNotifs(list) {
    try {
      localStorage.setItem('cricri-notifs-v1', JSON.stringify(list.slice(0, 40)));
    } catch (e) {}
  }

  
  /* CRICRI_TOP_TOOLS_LAYOUT — garante coluna sob o ♿ mesmo se CSS antigo conflitar */
  function applyTopToolsLayout(wrap) {
    if (!wrap) return;
    wrap.style.cssText = [
      'position:fixed',
      'top:calc(0.65rem + 44px + 0.45rem + env(safe-area-inset-top, 0px))',
      'right:max(0.65rem, env(safe-area-inset-right, 0px))',
      'left:auto',
      'z-index:5970',
      'display:flex',
      'flex-direction:column',
      'align-items:flex-end',
      'gap:0.45rem',
      'margin:0',
      'padding:0',
      'pointer-events:auto'
    ].join(';');
  }

  function mount() {
    // desativado: perfil só com acessibilidade (sem sininho/ferramentas)
    if (true) { /* CRICRI_TOP_TOOLS_DISABLED */
      return;
    }

    // Sininho/ferramentas só na área do usuário (pedido de produto)
    var onProfile = document.body.classList.contains('page-profile')
      || /profile\.html/i.test(location.pathname || '')
      || document.getElementById('login-card');
    if (!onProfile) return;
    if (document.getElementById('cricri-top-tools')) {
      applyTopToolsLayout(document.getElementById('cricri-top-tools'));
      return;
    }

    var wrap = el('div', 'cricri-top-tools');
    wrap.id = 'cricri-top-tools';
    applyTopToolsLayout(wrap);
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Ferramentas e notificações');

    // Gear
    var gearBtn = el('button', 'cricri-tool-btn');
    gearBtn.type = 'button';
    gearBtn.id = 'cricri-gear-btn';
    gearBtn.setAttribute('aria-label', 'Ferramentas e configurações');
    gearBtn.setAttribute('aria-expanded', 'false');
    gearBtn.setAttribute('aria-controls', 'cricri-gear-panel');
    gearBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>' +
      '</svg>';

    var gearPanel = el('div', 'cricri-gear-panel');
    gearPanel.id = 'cricri-gear-panel';
    gearPanel.hidden = true;
    gearPanel.setAttribute('role', 'dialog');
    gearPanel.setAttribute('aria-label', 'Ferramentas');
    gearPanel.innerHTML =
      '<h2>Ferramentas</h2>' +
      '<p class="hint">Atalhos da roda · configurações rápidas</p>' +
      '<div class="gear-links">' +
        '<a href="profile.html"><span class="gear-ico" aria-hidden="true">👤</span> Área do usuário</a>' +
        '<a href="profile.html#inbox-card"><span class="gear-ico" aria-hidden="true">✉️</span> Minha caixinha</a>' +
        '<a href="index.html#mapa"><span class="gear-ico" aria-hidden="true">🗺️</span> Mapa ao vivo</a>' +
        '<a href="programacao.html"><span class="gear-ico" aria-hidden="true">📅</span> Programação</a>' +
        '<a href="tamagotchi.html"><span class="gear-ico" aria-hidden="true">🥚</span> Tamagotchi da roda</a>' +
        '<button type="button" class="gear-link" id="cricri-gear-a11y"><span class="gear-ico" aria-hidden="true">♿</span> Acessibilidade</button>' +
        '<button type="button" class="gear-link" id="cricri-gear-theme"><span class="gear-ico" aria-hidden="true">🌓</span> Alternar tema</button>' +
      '</div>';

    // Bell
    var bellBtn = el('button', 'cricri-tool-btn');
    bellBtn.type = 'button';
    bellBtn.id = 'cricri-notif-btn';
    bellBtn.setAttribute('aria-label', 'Notificações em tempo real');
    bellBtn.setAttribute('aria-expanded', 'false');
    bellBtn.setAttribute('aria-controls', 'cricri-notif-panel');
    bellBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
      '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
      '</svg>' +
      '<span class="badge" id="cricri-notif-badge" hidden>0</span>';

    var notifPanel = el('div', 'cricri-notif-panel');
    notifPanel.id = 'cricri-notif-panel';
    notifPanel.hidden = true;
    notifPanel.setAttribute('role', 'dialog');
    notifPanel.setAttribute('aria-label', 'Notificações');
    notifPanel.innerHTML =
      '<h2>Notificações</h2>' +
      '<p class="hint">Amigos, seguidores, scraps e SHOW em breve — em tempo real quando o push estiver ativo.</p>' +
      '<ul class="cricri-notif-list" id="cricri-notif-list"></ul>' +
      '<p class="cricri-notif-empty" id="cricri-notif-empty" hidden>Nada por agora. A roda avisa quando rolar.</p>' +
      '<div style="margin-top:0.55rem;display:flex;gap:0.4rem;flex-wrap:wrap">' +
        '<button type="button" class="btn btn-ghost" id="cricri-notif-clear" style="font-size:0.72rem;padding:0.4rem 0.6rem;border:1px solid rgba(235,227,207,0.2);background:transparent;color:inherit;border-radius:8px;cursor:pointer">Limpar</button>' +
        '<a href="profile.html" style="font-size:0.72rem;padding:0.4rem 0.6rem;border:1px solid rgba(227,61,107,0.4);background:rgba(227,61,107,0.12);color:#e33d6b;border-radius:8px;text-decoration:none">Ativar push</a>' +
      '</div>';

    wrap.appendChild(gearBtn);
    wrap.appendChild(gearPanel);
    wrap.appendChild(bellBtn);
    wrap.appendChild(notifPanel);
    document.body.appendChild(wrap);

    function renderList() {
      var list = loadNotifs();
      var ul = document.getElementById('cricri-notif-list');
      var empty = document.getElementById('cricri-notif-empty');
      var badge = document.getElementById('cricri-notif-badge');
      if (!ul) return;
      ul.innerHTML = '';
      list.forEach(function (n) {
        var li = document.createElement('li');
        li.innerHTML =
          '<span class="ico" aria-hidden="true">' + (n.ico || '•') + '</span>' +
          '<span class="meta"><strong>' + escapeHtml(n.title || '') + '</strong><span>' +
          escapeHtml(n.body || '') + '</span></span>';
        ul.appendChild(li);
      });
      if (empty) empty.hidden = list.length > 0;
      if (badge) {
        if (list.length) {
          badge.hidden = false;
          badge.textContent = String(Math.min(list.length, 9));
        } else {
          badge.hidden = true;
        }
      }
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function closeAll() {
      notifPanel.hidden = true;
      gearPanel.hidden = true;
      bellBtn.setAttribute('aria-expanded', 'false');
      gearBtn.setAttribute('aria-expanded', 'false');
    }

    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = notifPanel.hidden;
      closeAll();
      if (open) {
        notifPanel.hidden = false;
        bellBtn.setAttribute('aria-expanded', 'true');
        renderList();
      }
    });

    gearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = gearPanel.hidden;
      closeAll();
      if (open) {
        gearPanel.hidden = false;
        gearBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });

    var clearBtn = document.getElementById('cricri-notif-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveNotifs([]);
        renderList();
      });
    }

    var a11yBtn = document.getElementById('cricri-gear-a11y');
    if (a11yBtn) {
      a11yBtn.addEventListener('click', function () {
        closeAll();
        var t = document.getElementById('a11y-toggle') || document.querySelector('.a11y-toggle');
        if (t) t.click();
      });
    }

    var themeBtn = document.getElementById('cricri-gear-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var t = document.querySelector('[data-theme-toggle]');
        if (t) t.click();
        else {
          var html = document.documentElement;
          var cur = html.getAttribute('data-theme') || 'dark';
          var next = cur === 'light' ? 'dark' : 'light';
          html.setAttribute('data-theme', next);
          html.setAttribute('data-a11y-theme', next);
        }
      });
    }

    // API pública
    window.CricriNotifs = {
      push: function (item) {
        var list = loadNotifs();
        list.unshift({
          ico: item.ico || '•',
          title: item.title || 'CRICRI',
          body: item.body || '',
          kind: item.kind || 'info',
          at: Date.now()
        });
        saveNotifs(list);
        renderList();
      },
      clear: function () {
        saveNotifs([]);
        renderList();
      },
      list: loadNotifs
    };

    renderList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
