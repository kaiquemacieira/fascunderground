/**
 * CRICRI · Bottom nav estilo rede social
 * Home · Explorar · [+] · Avisos · Perfil
 * Centro: botão + cintilante (criar / atalhos)
 */
(function () {
  'use strict';
  if (window.__cricriBottomNavMounted) return;

  var ITEMS = [
    {
      id: 'home',
      href: 'index.html',
      label: 'Home',
      match: [/index\.html$/i, /\/$/],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3.5 10.5 12 3.5l8.5 7"/>' +
        '<path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h3.5a1 1 0 0 0 1-1V9.5"/>' +
        '</svg>'
    },
    {
      id: 'explorar',
      href: 'explorar.html',
      label: 'Explorar',
      match: [/explorar\.html/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="11" cy="11" r="6.5"/>' +
        '<path d="M16.5 16.5 21 21"/>' +
        '</svg>'
    },
    {
      id: 'create',
      href: '#create',
      label: '',
      isCreate: true,
      match: [],
      icon: ''
    },
    {
      id: 'notifs',
      href: 'notifications.html',
      label: 'Avisos',
      match: [/notifications\.html/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M15.2 17h5l-1.4-1.4A2 2 0 0 1 18.2 14V11a6.2 6.2 0 1 0-12.4 0v3c0 .5-.2 1-.6 1.4L3.8 17h5.4"/>' +
        '<path d="M9.5 17a2.5 2.5 0 0 0 5 0"/>' +
        '</svg>'
    },
    {
      id: 'perfil',
      href: 'profile.html',
      label: 'Perfil',
      match: [/profile\.html/i, /login\.html/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="8" r="3.6"/>' +
        '<path d="M4.6 19.5c1.2-3.4 4-5.3 7.4-5.3s6.2 1.9 7.4 5.3"/>' +
        '</svg>'
    }
  ];

  function currentPath() {
    return (window.location.pathname || '').split('/').pop() || 'index.html';
  }

  function isActive(item) {
    if (item.isCreate) return false;
    var p = currentPath();
    if (item.id === 'home') return /^index\.html$/i.test(p) || p === '' || p === '/';
    if (item.id === 'explorar') return /explorar\.html/i.test(p);
    if (item.id === 'notifs') return /notifications\.html/i.test(p);
    if (item.id === 'perfil') return /profile\.html|login\.html/i.test(p);
    for (var i = 0; i < (item.match || []).length; i++) {
      if (item.match[i].test(p)) return true;
    }
    return false;
  }

  function injectCss() {
    if (document.getElementById('cricri-bottom-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-bottom-nav-css';
    s.textContent = [
      'nav.bottom-nav[data-cricri-nav="1"]{',
      'position:fixed!important;left:0;right:0;bottom:0;z-index:5600!important;',
      'display:grid!important;grid-template-columns:repeat(5,1fr)!important;',
      'align-items:end;',
      'height:calc(62px + env(safe-area-inset-bottom,0px));',
      'padding:0 0.15rem env(safe-area-inset-bottom,0px);',
      'background:rgba(10,8,7,0.94)!important;',
      'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
      'border-top:1px solid rgba(230,220,196,0.1);',
      'box-shadow:0 -10px 28px rgba(0,0,0,0.4);',
      'transform:none!important;opacity:1!important;pointer-events:auto!important;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item{',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'gap:0.12rem;text-decoration:none;min-height:54px;padding:0.35rem 0.1rem 0.4rem;',
      'color:rgba(235,227,207,0.55);position:relative;',
      'font-family:Oswald,system-ui,sans-serif;font-weight:600;font-size:0.58rem;',
      'letter-spacing:0.04em;text-transform:uppercase;transition:color .15s, opacity .15s;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item:hover,',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item.active{',
      'color:#ebe3cf;opacity:1',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item.active{color:#e33d6b}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico{',
      'display:flex;width:24px;height:24px;align-items:center;justify-content:center',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico svg{width:24px;height:24px}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-label{line-height:1;opacity:0.95}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-badge{',
      'position:absolute;top:4px;right:calc(50% - 16px);min-width:16px;height:16px;padding:0 4px;',
      'border-radius:999px;background:#e33d6b;color:#fff;font:700 0.58rem/16px system-ui,sans-serif;',
      'text-align:center;z-index:2;box-shadow:0 0 0 2px #0a0807',
      '}',
      /* ===== + CINTILANTE — gradientes e sombras refinados ===== */
      'nav.bottom-nav[data-cricri-nav="1"] .bn-create-wrap{',
      'display:flex;align-items:center;justify-content:center;min-height:54px;padding-bottom:0.4rem',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create{',
      'appearance:none;border:none;cursor:pointer;position:relative;isolation:isolate;',
      'width:50px;height:36px;border-radius:12px;',
      /* borda dual: ciano esq + rosa dir */
      'background:',
      'linear-gradient(#12100e,#12100e) padding-box,',
      'linear-gradient(105deg,#5ffbf1 0%,#25f4ee 18%,#ffffff 42%,#ff7aa8 58%,#fe2c55 78%,#e33d6b 100%) border-box;',
      'border:2.5px solid transparent;',
      'box-shadow:',
      '0 0 0 3px #0a0807,',
      '0 2px 0 rgba(255,255,255,0.08) inset,',
      '0 8px 20px rgba(227,61,107,0.38),',
      '0 4px 14px rgba(37,244,238,0.22),',
      '0 0 28px rgba(254,44,85,0.18);',
      'display:flex;align-items:center;justify-content:center;',
      'transform:translateY(-11px);',
      'transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, filter .18s ease',
      '}',
      /* halo externo animado */
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create::before{',
      'content:"";position:absolute;inset:-5px;border-radius:16px;z-index:-1;',
      'background:conic-gradient(from 180deg at 50% 50%,',
      '#25f4ee 0deg,#7af5f0 60deg,#fe2c55 140deg,#e33d6b 200deg,#ff8fb3 260deg,#25f4ee 360deg);',
      'opacity:0.55;filter:blur(10px);',
      'animation:bn-orbit 4.5s linear infinite',
      '}',
      /* face interna escura com brilho suave no topo */
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create::after{',
      'content:"";position:absolute;inset:0;border-radius:9.5px;z-index:0;pointer-events:none;',
      'background:',
      'linear-gradient(180deg,rgba(255,255,255,0.14) 0%,rgba(255,255,255,0.02) 28%,rgba(0,0,0,0.15) 100%),',
      '#12100e',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create .bn-plus{',
      'position:relative;z-index:1;width:17px;height:17px;color:#fff;',
      'filter:drop-shadow(0 1px 1px rgba(0,0,0,0.45)) drop-shadow(0 0 6px rgba(255,255,255,0.28))',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create:hover{',
      'transform:translateY(-13px) scale(1.05);',
      'box-shadow:',
      '0 0 0 3px #0a0807,',
      '0 2px 0 rgba(255,255,255,0.12) inset,',
      '0 10px 26px rgba(227,61,107,0.5),',
      '0 6px 18px rgba(37,244,238,0.3),',
      '0 0 36px rgba(254,44,85,0.28);',
      'filter:brightness(1.06)',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create:hover::before{opacity:0.75;filter:blur(12px)}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create:active{',
      'transform:translateY(-9px) scale(0.97);',
      'box-shadow:',
      '0 0 0 3px #0a0807,',
      '0 1px 0 rgba(255,255,255,0.06) inset,',
      '0 4px 12px rgba(227,61,107,0.35),',
      '0 2px 8px rgba(37,244,238,0.18)',
      '}',
      '@keyframes bn-orbit{',
      'from{transform:rotate(0deg)}to{transform:rotate(360deg)}',
      '}',
      '@media (prefers-reduced-motion: reduce){',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create::before{animation:none;opacity:0.4}',
      '}',
      /* quick sheet */
      '#cricri-create-sheet{position:fixed;inset:0;z-index:100100;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding-bottom:env(safe-area-inset-bottom,0px)}',
      '#cricri-create-sheet[hidden]{display:none!important}',
      '#cricri-create-sheet .cs-card{width:min(100%,400px);background:#14110f;border-radius:18px 18px 0 0;',
      'border:1.5px solid rgba(230,220,196,0.12);padding:1rem 1rem 1.25rem;color:#ebe3cf;',
      'box-shadow:0 -16px 40px rgba(0,0,0,0.45);animation:cs-up .25s ease}',
      '@keyframes cs-up{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}',
      '#cricri-create-sheet .cs-handle{width:40px;height:4px;border-radius:99px;background:rgba(230,220,196,0.22);margin:0 auto 0.85rem}',
      '#cricri-create-sheet h2{margin:0 0 0.75rem;font:700 0.95rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;text-align:center}',
      '#cricri-create-sheet .cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.55rem}',
      '#cricri-create-sheet a.cs-btn,#cricri-create-sheet button.cs-btn{',
      'appearance:none;border:1.5px solid rgba(230,220,196,0.14);border-radius:14px;background:rgba(230,220,196,0.05);',
      'color:#ebe3cf;padding:0.9rem 0.65rem;text-decoration:none;cursor:pointer;text-align:center;',
      'font:600 0.78rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.05em;text-transform:uppercase;',
      'display:flex;flex-direction:column;align-items:center;gap:0.4rem;transition:border-color .15s, background .15s',
      '}',
      '#cricri-create-sheet a.cs-btn:hover,#cricri-create-sheet button.cs-btn:hover{border-color:rgba(227,61,107,0.45);background:rgba(227,61,107,0.1)}',
      '#cricri-create-sheet .cs-ico{font-size:1.35rem;line-height:1}',
      '#cricri-create-sheet .cs-close{margin-top:0.75rem;width:100%;appearance:none;border:none;background:transparent;',
      'color:#8c8376;font:600 0.75rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;padding:0.65rem}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"],',
      'html[data-a11y-theme="light"] nav.bottom-nav[data-cricri-nav="1"]{background:rgba(243,236,220,0.96)!important;border-top-color:rgba(28,21,17,0.1)}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] a.bn-item{color:rgba(23,18,14,0.5)}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] a.bn-item.active{color:#e33d6b}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] button.bn-create{',
      'background:linear-gradient(#f3ecdc,#f3ecdc) padding-box,linear-gradient(105deg,#5ffbf1 0%,#25f4ee 18%,#fff 42%,#ff7aa8 58%,#fe2c55 78%,#e33d6b 100%) border-box;',
      'box-shadow:0 0 0 3px #f3ecdc,0 2px 0 rgba(255,255,255,0.5) inset,0 8px 20px rgba(227,61,107,0.32),0 4px 14px rgba(37,244,238,0.18)',
      '}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] button.bn-create::after{',
      'background:linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0.15) 30%,rgba(0,0,0,0.04) 100%),#f3ecdc',
      '}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] button.bn-create:hover{',
      'box-shadow:0 0 0 3px #f3ecdc,0 2px 0 rgba(255,255,255,0.6) inset,0 10px 26px rgba(227,61,107,0.4),0 6px 18px rgba(37,244,238,0.25)',
      '}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] .bn-badge{box-shadow:0 0 0 2px #f3ecdc}',
      'html[data-theme="light"] #cricri-create-sheet .cs-card{background:#fffef8;color:#17120e}',
      'body{padding-bottom:calc(4.6rem + env(safe-area-inset-bottom,0px))!important}',
      '#cricri-top-tools,#cricri-notif-bell,.notif-bell-wrap{display:none!important;visibility:hidden!important;pointer-events:none!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function openCreateSheet() {
    var sheet = document.getElementById('cricri-create-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-create-sheet';
      sheet.hidden = true;
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) sheet.hidden = true;
      });
    }
    sheet.hidden = false;
    sheet.innerHTML =
      '<div class="cs-card" role="dialog" aria-modal="true" aria-label="Criar">' +
        '<div class="cs-handle" aria-hidden="true"></div>' +
        '<h2>Criar na roda</h2>' +
        '<div class="cs-grid">' +
          '<a class="cs-btn" href="index.html#mural-composer"><span class="cs-ico" aria-hidden="true">✍️</span>Publicar</a>' +
          '<a class="cs-btn" href="tamagotchi.html"><span class="cs-ico" aria-hidden="true">🐱</span>Cuidar do Cri</a>' +
          '<a class="cs-btn" href="explorar.html"><span class="cs-ico" aria-hidden="true">🗺️</span>Mapa</a>' +
          '<a class="cs-btn" href="profile.html#caixinha-title"><span class="cs-ico" aria-hidden="true">🐾</span>Meow</a>' +
        '</div>' +
        '<button type="button" class="cs-close" data-cs-close>Fechar</button>' +
      '</div>';
    var close = sheet.querySelector('[data-cs-close]');
    if (close) close.addEventListener('click', function () { sheet.hidden = true; });
  }

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('data-cricri-nav', '1');
    nav.setAttribute('aria-label', 'Navegação principal');

    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      if (item.isCreate) {
        var wrap = document.createElement('div');
        wrap.className = 'bn-create-wrap';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bn-create';
        btn.setAttribute('aria-label', 'Criar');
        btn.innerHTML =
          '<svg class="bn-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
          '<path d="M12 5v14M5 12h14"/>' +
          '</svg>';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          openCreateSheet();
        });
        wrap.appendChild(btn);
        nav.appendChild(wrap);
        continue;
      }

      var a = document.createElement('a');
      a.className = 'bn-item';
      a.href = item.href;
      a.dataset.nav = item.id;
      a.setAttribute('aria-label', item.label);
      if (isActive(item)) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
      a.innerHTML =
        '<span class="bn-ico" aria-hidden="true">' + item.icon + '</span>' +
        (item.id === 'notifs'
          ? '<span class="bn-badge" id="cricri-nav-notif-badge" hidden>0</span>'
          : '') +
        '<span class="bn-label">' + item.label + '</span>';
      nav.appendChild(a);
    }
    return nav;
  }

  function updateNotifBadge(n) {
    var badge = document.getElementById('cricri-nav-notif-badge');
    if (!badge) return;
    n = Number(n) || 0;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = String(Math.min(n, 9));
    } else {
      badge.hidden = true;
    }
  }

  function mount(root) {
    if (document.querySelector('nav.bottom-nav[data-cricri-nav="1"]')) {
      window.__cricriBottomNavMounted = true;
      return document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
    }
    injectCss();
    root = root || document.body;
    var slot = document.getElementById('bottom-nav-slot');
    var nav = buildNav();
    if (slot) slot.appendChild(nav);
    else root.appendChild(nav);
    window.__cricriBottomNavMounted = true;

    window.addEventListener('cricri:notifs-changed', function (ev) {
      var n = ev && ev.detail && ev.detail.count;
      if (n == null && window.CricriNotifBell && window.CricriNotifBell.count) {
        n = window.CricriNotifBell.count();
      }
      updateNotifBadge(n);
    });
    setTimeout(function () {
      if (window.CricriNotifBell && window.CricriNotifBell.count) {
        updateNotifBadge(window.CricriNotifBell.count());
      }
    }, 800);
    return nav;
  }

  function boot() {
    if (!document.body) {
      setTimeout(boot, 40);
      return;
    }
    mount(document.body);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CricriBottomNav = {
    mount: mount,
    items: ITEMS,
    openCreate: openCreateSheet,
    updateNotifBadge: updateNotifBadge
  };
})();
