/**
 * CRICRI — Bottom navigation (fixed)
 * Menu inferior sempre montado no body, z-index alto, sem dependência de is-page-ready.
 */
(function () {
  'use strict';
  if (window.__cricriBottomNavMounted) return;

  var ITEMS = [
    {
      id: 'home',
      href: 'index.html',
      label: 'Home',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h3.5a1 1 0 0 0 1-1V9.5"/>' +
        '</svg>'
    },
    {
      id: 'feed',
      href: 'feed.html',
      label: 'Feed',
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 6h16M4 12h16M4 18h10"/>' +
        '</svg>'
    },
    {
      id: 'create',
      href: '#create',
      label: '',
      isCreate: true,
      icon: ''
    },
    {
      id: 'notifs',
      href: 'notifications.html',
      label: 'Avisos',
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
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="8" r="3.6"/><path d="M4.6 19.5c1.2-3.4 4-5.3 7.4-5.3s6.2 1.9 7.4 5.3"/>' +
        '</svg>'
    }
  ];

  function pathFile() {
    var p = (window.location.pathname || '').split('/').pop() || 'index.html';
    return p || 'index.html';
  }

  function isActive(item) {
    if (item.isCreate) return false;
    var p = pathFile().toLowerCase();
    if (item.id === 'home') return p === 'index.html' || p === '' || p === '/';
    if (item.id === 'feed') return p.indexOf('feed') !== -1;
    if (item.id === 'notifs') return p.indexOf('notification') !== -1;
    if (item.id === 'perfil') return p.indexOf('profile') !== -1 || p.indexOf('login') !== -1;
    return false;
  }

  function injectCss() {
    if (document.getElementById('cricri-bottom-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-bottom-nav-css';
    s.textContent = [
      'nav.bottom-nav[data-cricri-nav="1"]{',
      'position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;',
      'z-index:10050!important;display:grid!important;grid-template-columns:repeat(5,1fr)!important;',
      'align-items:end!important;width:100%!important;max-width:100vw!important;margin:0!important;',
      'height:calc(62px + env(safe-area-inset-bottom,0px))!important;',
      'padding:0 0.1rem env(safe-area-inset-bottom,0px)!important;',
      'background:rgba(10,10,10,0.96)!important;',
      'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);',
      'border-top:1px solid rgba(250,250,247,0.12)!important;',
      'box-shadow:0 -8px 24px rgba(0,0,0,0.4)!important;',
      'opacity:1!important;visibility:visible!important;pointer-events:auto!important;',
      'transform:none!important;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item{',
      'display:flex!important;flex-direction:column;align-items:center;justify-content:center;',
      'gap:0.15rem;text-decoration:none;min-height:54px;padding:0.3rem 0.05rem 0.35rem;',
      'color:rgba(250,250,247,0.5)!important;position:relative;',
      'font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:0.58rem;',
      'letter-spacing:0.03em;text-transform:uppercase;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.bn-item.active{color:var(--gold,#E6BE49)!important}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico{display:flex;width:24px;height:24px;align-items:center;justify-content:center}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico svg{width:22px;height:22px}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-label{line-height:1}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-badge{',
      'position:absolute;top:4px;right:calc(50% - 14px);min-width:16px;height:16px;padding:0 4px;',
      'border-radius:999px;background:var(--gold,#E6BE49);color:#1a1400;',
      'font:700 0.55rem/16px system-ui,sans-serif;text-align:center;z-index:2',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-create-wrap{',
      'display:flex;align-items:center;justify-content:center;padding:0',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create{',
      'width:48px;height:48px;margin-top:-12px;border-radius:14px;',
      'border:1.5px solid rgba(250,250,247,0.2);',
      'background:#141414;color:var(--gold,#E6BE49);',
      'display:flex;align-items:center;justify-content:center;cursor:pointer;',
      'box-shadow:0 2px 10px rgba(0,0,0,0.35)',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create:hover{',
      'border-color:var(--gold,#E6BE49);background:rgba(230,190,73,0.14)',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] button.bn-create .bn-plus{width:18px;height:18px;color:var(--gold,#E6BE49)}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"]{',
      'background:rgba(255,255,255,0.96)!important;border-top-color:rgba(17,17,17,0.1)!important',
      '}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] a.bn-item{color:rgba(17,17,17,0.45)!important}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] a.bn-item.active{color:var(--gold,#D4A72C)!important}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] button.bn-create{background:#fff;border-color:rgba(17,17,17,0.15)}',
      'body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}',
      '#cricri-create-sheet{position:fixed;inset:0;z-index:100100;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55)}',
      '#cricri-create-sheet[hidden]{display:none!important}',
      '#cricri-create-sheet .cs-card{width:min(100%,400px);background:#141414;border-radius:18px 18px 0 0;border:1px solid rgba(250,250,247,0.12);padding:1rem 1rem 1.25rem;color:#FAFAF7}',
      '#cricri-create-sheet .cs-handle{width:40px;height:4px;border-radius:99px;background:rgba(250,250,247,0.2);margin:0 auto 0.85rem}',
      '#cricri-create-sheet h2{margin:0 0 0.75rem;font:700 0.95rem/1.2 Inter,system-ui,sans-serif;text-align:center}',
      '#cricri-create-sheet .cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.55rem}',
      '#cricri-create-sheet a.cs-btn{appearance:none;border:1px solid rgba(250,250,247,0.14);border-radius:14px;background:rgba(250,250,247,0.05);color:#FAFAF7;padding:0.9rem 0.65rem;text-decoration:none;text-align:center;font:600 0.8rem/1.2 Inter,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:0.35rem}',
      '#cricri-create-sheet a.cs-btn:hover{border-color:rgba(230,190,73,0.5);background:rgba(230,190,73,0.1)}',
      '#cricri-create-sheet .cs-close{margin-top:0.75rem;width:100%;border:none;background:transparent;color:rgba(250,250,247,0.5);font:600 0.75rem Inter,system-ui,sans-serif;cursor:pointer;padding:0.65rem}'
    ].join('');
    document.head.appendChild(s);
  }

  function openCreateSheet() {
    var sheet = document.getElementById('cricri-create-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-create-sheet';
      sheet.hidden = true;
      sheet.innerHTML =
        '<div class="cs-card" role="dialog" aria-label="Criar">' +
        '<div class="cs-handle"></div>' +
        '<h2>O que você quer fazer?</h2>' +
        '<div class="cs-grid">' +
        '<a class="cs-btn" href="feed.html"><span class="cs-ico">✦</span>Scrap no feed</a>' +
        '<a class="cs-btn" href="explorar.html"><span class="cs-ico">◎</span>Marcar rolê</a>' +
        '<a class="cs-btn" href="profile.html"><span class="cs-ico">☺</span>Perfil</a>' +
        '<a class="cs-btn" href="tamagotchi.html"><span class="cs-ico">♡</span>Tamagotchi</a>' +
        '</div>' +
        '<button type="button" class="cs-close" id="cs-close">Fechar</button>' +
        '</div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) sheet.hidden = true;
      });
      var cl = sheet.querySelector('#cs-close');
      if (cl) cl.addEventListener('click', function () { sheet.hidden = true; });
    }
    sheet.hidden = false;
  }

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('data-cricri-nav', '1');
    nav.setAttribute('aria-label', 'Navegação principal');

    ITEMS.forEach(function (item) {
      if (item.isCreate) {
        var wrap = document.createElement('div');
        wrap.className = 'bn-create-wrap';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bn-create';
        btn.setAttribute('aria-label', 'Criar');
        btn.innerHTML =
          '<svg class="bn-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
          '<path d="M12 5v14M5 12h14"/></svg>';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          openCreateSheet();
        });
        wrap.appendChild(btn);
        nav.appendChild(wrap);
        return;
      }

      var a = document.createElement('a');
      a.className = 'bn-item' + (isActive(item) ? ' active' : '');
      a.href = item.href;
      a.setAttribute('data-bn', item.id);
      a.innerHTML =
        '<span class="bn-ico">' + item.icon + '</span>' +
        '<span class="bn-label">' + item.label + '</span>' +
        (item.id === 'notifs' ? '<span class="bn-badge" hidden data-bn-badge>0</span>' : '');
      nav.appendChild(a);
    });

    return nav;
  }

  function forceVisible(nav) {
    if (!nav) return;
    var props = {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      top: 'auto',
      opacity: '1',
      visibility: 'visible',
      display: 'grid',
      transform: 'none',
      'z-index': '10050',
      'pointer-events': 'auto'
    };
    Object.keys(props).forEach(function (k) {
      nav.style.setProperty(k, props[k], 'important');
    });
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }
  }

  function mount() {
    injectCss();

    var existing = document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
    if (existing) {
      forceVisible(existing);
      window.__cricriBottomNavMounted = true;
      return existing;
    }

    // remove leftovers without our flag
    document.querySelectorAll('nav.bottom-nav:not([data-cricri-nav])').forEach(function (n) {
      try { n.remove(); } catch (_) {}
    });

    var nav = buildNav();
    document.body.appendChild(nav);
    forceVisible(nav);
    window.__cricriBottomNavMounted = true;

    try {
      document.body.classList.add('is-page-ready');
      document.body.classList.remove('nav-hidden');
    } catch (_) {}

    return nav;
  }

  function boot() {
    if (!document.body) {
      setTimeout(boot, 30);
      return;
    }
    try {
      mount();
    } catch (err) {
      console.error('[CRICRI bottom-nav]', err);
    }
    // reafirma após outros scripts/CSS
    setTimeout(function () {
      var n = document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
      if (!n) {
        try { mount(); } catch (_) {}
        n = document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
      }
      forceVisible(n);
    }, 120);
    setTimeout(function () {
      forceVisible(document.querySelector('nav.bottom-nav[data-cricri-nav="1"]'));
    }, 600);
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
    updateNotifBadge: function (n) {
      var badge = document.querySelector('[data-bn-badge]');
      if (!badge) return;
      if (n && n > 0) {
        badge.hidden = false;
        badge.textContent = String(Math.min(n, 9));
      } else {
        badge.hidden = true;
      }
    }
  };
})();
