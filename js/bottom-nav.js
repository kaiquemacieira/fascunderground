/**
 * CRICRI · Bottom nav partial (4 itens canônicos)
 * Home · Explorar · Tamagotchi · Perfil
 *
 * Uso: inclua <div id="bottom-nav-slot"></div> antes de </body>
 *      e <script src="js/bottom-nav.js"></script>
 * Ou chame window.CricriBottomNav.mount(document.body)
 */
(function () {
  'use strict';

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
      id: 'tamagotchi',
      href: 'tamagotchi.html',
      label: 'Tamagotchi',
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
    var hash = window.location.hash || '';
    return path + hash;
  }

  function isActive(item) {
    var loc = currentPath();
    // Explorar: página própria explorar.html
    if (item.id === 'explorar') {
      var pe = (window.location.pathname || '').split('/').pop() || '';
      return /explorar\.html/i.test(pe) || /explorar/i.test(pe);
    }
    // Home ativo em index (raiz reescrita serve login; mural é index.html)
    if (item.id === 'home') {
      var p = (window.location.pathname || '').split('/').pop() || 'index.html';
      return /^index\.html$/i.test(p);
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
    nav.setAttribute('aria-label', 'Navegação principal');
    nav.setAttribute('data-cricri-nav', '1');

    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      var a = document.createElement('a');
      a.href = item.href;
      a.dataset.nav = item.id;
      if (isActive(item)) {
        a.className = 'active';
        a.setAttribute('aria-current', 'page');
      }
      a.innerHTML = item.icon + item.label;
      nav.appendChild(a);
    }
    return nav;
  }

  function mount(root) {
    root = root || document.body;
    // Remove navs antigos (hardcoded ou anteriores)
    var olds = root.querySelectorAll('nav.bottom-nav');
    for (var i = 0; i < olds.length; i++) {
      olds[i].parentNode.removeChild(olds[i]);
    }
    var slot = document.getElementById('bottom-nav-slot');
    var nav = buildNav();
    if (slot) {
      slot.appendChild(nav);
    } else {
      root.appendChild(nav);
    }
    // garante fixo em todas as páginas (fallback se CSS da página faltar)
    nav.style.position = 'fixed';
    nav.style.left = '0';
    nav.style.right = '0';
    nav.style.bottom = '0';
    nav.style.zIndex = '5600';
    nav.style.display = 'grid';
    nav.style.gridTemplateColumns = 'repeat(4, 1fr)';
    nav.style.height = 'calc(64px + env(safe-area-inset-bottom, 0px))';
    nav.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    nav.style.background = nav.style.background || '#0c0a09';
    nav.style.borderTop = nav.style.borderTop || '2px solid rgba(230,220,196,0.12)';
    nav.style.boxShadow = '0 -8px 24px rgba(0,0,0,0.35)';
    var links = nav.querySelectorAll('a');
    for (var li = 0; li < links.length; li++) {
      var a = links[li];
      a.style.display = 'flex';
      a.style.flexDirection = 'column';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'center';
      a.style.gap = '0.2rem';
      a.style.textDecoration = 'none';
      a.style.fontSize = '0.62rem';
      a.style.textTransform = 'uppercase';
      a.style.letterSpacing = '0.05em';
      a.style.fontWeight = '600';
      a.style.opacity = a.classList.contains('active') ? '1' : '0.55';
      a.style.color = a.classList.contains('active') ? '#e33d6b' : '#ebe3cf';
      a.style.padding = '0.45rem 0.15rem';
    }
    // padding no body para não cobrir conteúdo
    try {
      var pb = window.getComputedStyle(document.body).paddingBottom;
      if (!pb || pb === '0px') {
        document.body.style.paddingBottom = 'calc(4.5rem + env(safe-area-inset-bottom, 0px))';
      }
    } catch (_) {}
    return nav;
  }

  // Atualiza active em mudança de hash (Explorar)
  function onHash() {
    var nav = document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
    if (!nav) return;
    var links = nav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].dataset.nav;
      var item = null;
      for (var j = 0; j < ITEMS.length; j++) {
        if (ITEMS[j].id === id) { item = ITEMS[j]; break; }
      }
      if (!item) continue;
      if (isActive(item)) {
        links[i].classList.add('active');
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].classList.remove('active');
        links[i].removeAttribute('aria-current');
      }
    }
  }

  window.CricriBottomNav = { mount: mount, items: ITEMS };

  function boot() {
    mount(document.body);
    window.addEventListener('hashchange', onHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
