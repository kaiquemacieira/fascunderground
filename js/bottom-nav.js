/**
 * CRICRI · Bottom nav
 * Home · Explorar · Notificações · Tamagotchi · Perfil
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
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3.5 10.5 12 3.5l8.5 7"/>' +
        '<path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h3.5a1 1 0 0 0 1-1V9.5"/>' +
        '</svg>'
    },
    {
      id: 'explorar',
      href: 'explorar.html',
      label: 'Explorar',
      match: [/explorar\.html/i, /explorar/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/>' +
        '<circle cx="12" cy="10" r="2.4"/>' +
        '</svg>'
    },
    {
      id: 'notifs',
      href: 'notifications.html',
      label: 'Avisos',
      match: [/notifications\.html/i],
      isAction: false,
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M15.5 17h5.2l-1.5-1.5a2.1 2.1 0 0 1-.6-1.5V11a6.1 6.1 0 1 0-12.2 0v3a2.1 2.1 0 0 1-.6 1.5L4.3 17H9.5"/>' +
        '<path d="M9.6 17a2.5 2.5 0 0 0 4.8 0"/>' +
        '<circle cx="18.2" cy="6.2" r="2.2" fill="currentColor" stroke="none"/>' +
        '</svg>'
    },
    {
      id: 'tamagotchi',
      href: 'tamagotchi.html',
      label: 'Pet',
      match: [/tamagotchi\.html/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M8 10.5c0-2.3 1.7-4.2 4-4.2s4 1.9 4 4.2c0 3.2-4 7.3-4 7.3S8 13.7 8 10.5z"/>' +
        '<circle cx="10.2" cy="10.2" r="0.9" fill="currentColor" stroke="none"/>' +
        '<circle cx="13.8" cy="10.2" r="0.9" fill="currentColor" stroke="none"/>' +
        '<path d="M7 5.5c-1.2-.8-2.4-.6-3 .3M17 5.5c1.2-.8 2.4-.6 3 .3"/>' +
        '</svg>'
    },
    {
      id: 'perfil',
      href: 'profile.html',
      label: 'Perfil',
      match: [/profile\.html/i, /login\.html/i],
      icon:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="8.2" r="3.7"/>' +
        '<path d="M4.5 20c1.1-3.6 4.1-5.6 7.5-5.6s6.4 2 7.5 5.6"/>' +
        '</svg>'
    }
  ];

  function currentPath() {
    var path = (window.location.pathname || '').split('/').pop() || 'index.html';
    return path + (window.location.hash || '');
  }

  function isActive(item) {
    var loc = currentPath();
    if (item.id === 'notifs') {
      return /notifications\.html/i.test((window.location.pathname || ''));
    }
    if (item.id === 'explorar') {
      var pe = (window.location.pathname || '').split('/').pop() || '';
      return /explorar\.html/i.test(pe);
    }
    if (item.id === 'home') {
      var p = (window.location.pathname || '').split('/').pop() || 'index.html';
      return /^index\.html$/i.test(p) || p === '' || p === '/';
    }
    for (var i = 0; i < item.match.length; i++) {
      if (item.match[i].test(loc) || item.match[i].test(window.location.pathname || '')) {
        return true;
      }
    }
    return false;
  }

  function buildNav() {
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('data-cricri-nav', '1');
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.style.gridTemplateColumns = 'repeat(5, 1fr)';

    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      var a = document.createElement(item.isAction ? 'button' : 'a');
      if (item.isAction) {
        a.type = 'button';
        a.className = 'bottom-nav-action';
      } else {
        a.href = item.href;
      }
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
      if (item.isAction) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          openNotifs();
        });
      }
      nav.appendChild(a);
    }
    return nav;
  }

  function openNotifs() {
    if (window.CricriNotifBell && typeof window.CricriNotifBell.open === 'function') {
      window.CricriNotifBell.open();
      return;
    }
    // fallback: dispara evento pra notif-bell ouvir
    try {
      window.dispatchEvent(new CustomEvent('cricri:open-notifs'));
    } catch (_) {}
  }

  function injectCss() {
    if (document.getElementById('cricri-bottom-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-bottom-nav-css';
    s.textContent = [
      'nav.bottom-nav[data-cricri-nav="1"]{',
      'position:fixed!important;left:0;right:0;bottom:0;z-index:5600!important;',
      'display:grid!important;grid-template-columns:repeat(5,1fr)!important;',
      'height:calc(64px + env(safe-area-inset-bottom,0px));',
      'padding-bottom:env(safe-area-inset-bottom,0px);',
      'background:#0c0a09!important;border-top:2px solid rgba(230,220,196,0.12);',
      'box-shadow:0 -8px 24px rgba(0,0,0,0.35);',
      'transform:none!important;opacity:1!important;pointer-events:auto!important;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a,',
      'nav.bottom-nav[data-cricri-nav="1"] button.bottom-nav-action{',
      'appearance:none;background:transparent;border:0;cursor:pointer;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'gap:0.15rem;text-decoration:none;font-size:0.58rem;text-transform:uppercase;',
      'letter-spacing:0.04em;font-weight:600;color:#ebe3cf;opacity:0.55;',
      'padding:0.35rem 0.1rem;position:relative;font-family:Oswald,system-ui,sans-serif;',
      '}',
      'nav.bottom-nav[data-cricri-nav="1"] a.active,',
      'nav.bottom-nav[data-cricri-nav="1"] a:hover,',
      'nav.bottom-nav[data-cricri-nav="1"] button:hover{opacity:1;color:#e33d6b}',
      'nav.bottom-nav[data-cricri-nav="1"] a.active{opacity:1;color:#e33d6b}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico{display:flex;width:22px;height:22px;position:relative}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-ico svg{width:22px;height:22px}',
      'nav.bottom-nav[data-cricri-nav="1"] .bn-badge{',
      'position:absolute;top:2px;right:calc(50% - 18px);min-width:16px;height:16px;padding:0 4px;',
      'border-radius:999px;background:#e33d6b;color:#fff;font:700 0.6rem/16px system-ui,sans-serif;',
      'text-align:center;z-index:1',
      '}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"],',
      'html[data-a11y-theme="light"] nav.bottom-nav[data-cricri-nav="1"]{background:#f3ecdc!important;border-top-color:rgba(28,21,17,0.12)}',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] a,',
      'html[data-theme="light"] nav.bottom-nav[data-cricri-nav="1"] button{color:#17120e}',
      'body{padding-bottom:calc(4.5rem + env(safe-area-inset-bottom,0px))!important}'
    ].join('');
    document.head.appendChild(s);
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

    // puxa contagem inicial
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
    openNotifs: openNotifs,
    updateNotifBadge: updateNotifBadge
  };
})();
