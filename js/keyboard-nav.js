/**
 * CRICRI · Navegação por teclado (WCAG 2.1.1 / 2.4.3 / 2.4.7)
 * - Detecção teclado vs ponteiro (classe js-kb)
 * - Skip link → foco no main
 * - Roving tabindex em tablists / toolbars
 * - Setas na bottom-nav e chips
 * - Escape fecha painéis
 * - Atalhos: Alt+1..6 seções principais
 */
(function (global) {
  'use strict';

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function visible(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.hidden || el.closest('[hidden]')) return false;
    var s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    return true;
  }

  function focusables(root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(FOCUSABLE)).filter(visible);
  }

  function markKeyboard(on) {
    document.documentElement.classList.toggle('js-kb', !!on);
    document.body.classList.toggle('js-kb', !!on);
  }

  /* ---- skip link ---- */
  function wireSkip() {
    document.querySelectorAll('a.skip-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = (link.getAttribute('href') || '').replace(/^#/, '');
        var target = id ? document.getElementById(id) : null;
        if (!target) return;
        e.preventDefault();
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: false });
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {
          target.scrollIntoView(true);
        }
      });
    });
  }

  /* ---- roving tabindex for role=tablist / toolbars ---- */
  function setupRoving(container, itemSelector) {
    if (!container || container.dataset.kbRoving === '1') return;
    var items = function () {
      return Array.prototype.slice.call(container.querySelectorAll(itemSelector)).filter(visible);
    };
    function syncTabIndex(active) {
      items().forEach(function (el) {
        var on = el === active;
        el.tabIndex = on ? 0 : -1;
        if (el.getAttribute('role') === 'tab') {
          el.setAttribute('aria-selected', on ? 'true' : 'false');
        }
      });
    }
    var list = items();
    if (!list.length) return;
    var current =
      list.find(function (el) {
        return el.getAttribute('aria-selected') === 'true' || el.classList.contains('active') || el.classList.contains('is-on');
      }) || list[0];
    syncTabIndex(current);
    container.dataset.kbRoving = '1';

    container.addEventListener('keydown', function (e) {
      var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (keys.indexOf(e.key) === -1) return;
      var list2 = items();
      if (!list2.length) return;
      var i = list2.indexOf(document.activeElement);
      if (i < 0) i = list2.indexOf(current);
      if (i < 0) i = 0;
      var next = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % list2.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + list2.length) % list2.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = list2.length - 1;
      e.preventDefault();
      current = list2[next];
      syncTabIndex(current);
      current.focus();
      // ativa tab se for role=tab
      if (current.getAttribute('role') === 'tab') {
        current.click();
        syncTabIndex(current);
      }
    });

    container.addEventListener('click', function (e) {
      var item = e.target.closest(itemSelector);
      if (!item || !container.contains(item)) return;
      current = item;
      syncTabIndex(current);
    });
  }

  function wireRovingAll() {
    document.querySelectorAll('[role="tablist"]').forEach(function (tl) {
      setupRoving(tl, '[role="tab"]');
    });
    // feed/market tabs even without role
    document.querySelectorAll('.feed-tabs, .market-tabs').forEach(function (tl) {
      if (!tl.getAttribute('role')) tl.setAttribute('role', 'tablist');
      tl.querySelectorAll('.feed-tab, .market-tab').forEach(function (t) {
        if (!t.getAttribute('role')) t.setAttribute('role', 'tab');
      });
      setupRoving(tl, '.feed-tab, .market-tab, [role="tab"]');
    });
    // map layer chips / proximity
    document.querySelectorAll('#map-layers, #map-proximity, .a11y-row').forEach(function (row) {
      setupRoving(row, 'button, .map-layer-chip, .map-prox-chip, .a11y-chip');
    });
    // bottom nav
    var bottom = document.querySelector('.bottom-nav');
    if (bottom) setupRoving(bottom, '.nav-item');
  }

  /* ---- Escape fecha overlays ---- */
  function wireEscape() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      // a11y panel
      var a11yToggle = document.getElementById('a11y-toggle');
      var a11yPanel = document.getElementById('a11y-panel');
      if (a11yPanel && a11yToggle && a11yToggle.getAttribute('aria-expanded') === 'true') {
        a11yPanel.hidden = true;
        a11yPanel.setAttribute('hidden', '');
        a11yPanel.classList.remove('is-open');
        a11yToggle.setAttribute('aria-expanded', 'false');
        a11yToggle.focus();
        e.preventDefault();
        return;
      }
      // search overlay
      var search = document.getElementById('search-overlay');
      if (search && !search.hidden && search.getAttribute('aria-hidden') !== 'true') {
        var closeBtn = document.getElementById('search-cancel') || document.getElementById('search-close');
        if (closeBtn) closeBtn.click();
        else {
          search.hidden = true;
          search.setAttribute('aria-hidden', 'true');
        }
        var searchBtn = document.getElementById('header-search-btn');
        if (searchBtn) searchBtn.focus();
        e.preventDefault();
        return;
      }
      // mobile menu
      var menu = document.getElementById('mobile-menu');
      var menuToggle = document.getElementById('menu-toggle');
      if (menu && menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') {
        menuToggle.click();
        menuToggle.focus();
        e.preventDefault();
        return;
      }
      // tama confirm
      var tama = document.getElementById('tama-confirm');
      if (tama) {
        var cancel = tama.querySelector('[data-tama-cancel]');
        if (cancel) cancel.click();
        else tama.remove();
        e.preventDefault();
      }
    });
  }

  /* ---- Alt+número para seções ---- */
  function wireLandmarks() {
    var map = {
      '1': 'hero',
      '2': 'feed',
      '3': 'mapa',
      '4': 'marketplace',
      '5': 'suporte',
      '6': 'quem-somos'
    };
    document.addEventListener('keydown', function (e) {
      if (!(e.altKey && !e.ctrlKey && !e.metaKey)) return;
      var id = map[e.key];
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: false });
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {
        el.scrollIntoView(true);
      }
    });
  }

  /* ---- Enter em elementos role=button sem button ---- */
  function wireRoleButtons() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target;
      if (!el || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'INPUT') return;
      if (el.getAttribute('role') === 'button' || el.classList.contains('map-place-item')) {
        e.preventDefault();
        el.click();
      }
    });
  }

  /* ---- focus trap simples para dialog aberto ---- */
  function trapFocus(panel) {
    if (!panel || panel.dataset.kbTrap === '1') return;
    panel.dataset.kbTrap = '1';
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var list = focusables(panel);
      if (list.length < 2) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function observePanels() {
    ['a11y-panel', 'search-overlay', 'tama-confirm'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) trapFocus(el);
    });
    // mutation for dynamic tama confirm
    var mo = new MutationObserver(function () {
      var t = document.getElementById('tama-confirm');
      if (t) trapFocus(t);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---- teclado vs mouse ---- */
  function wireModality() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ') {
        markKeyboard(true);
      }
    });
    document.addEventListener('mousedown', function () {
      markKeyboard(false);
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || e.pointerType === 'touch') markKeyboard(false);
    });
  }

  function ensureSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#conteudo-principal';
    a.textContent = 'Ir para o conteúdo';
    document.body.insertBefore(a, document.body.firstChild);
    var main = document.getElementById('conteudo-principal') || document.querySelector('main');
    if (main && !main.id) main.id = 'conteudo-principal';
    if (main && !main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  }

  function injectFocusCSS() {
    if (document.getElementById('cricri-kb-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-kb-css';
    s.textContent = [
      'html.js-kb *:focus{outline:none}',
      'html.js-kb *:focus-visible{outline:3px solid #e33d6b;outline-offset:3px}',
      'html.js-kb .nav-item:focus-visible,html.js-kb .a11y-chip:focus-visible,html.js-kb .map-layer-chip:focus-visible,html.js-kb .map-prox-chip:focus-visible,html.js-kb .feed-tab:focus-visible,html.js-kb .market-tab:focus-visible,html.js-kb .btn:focus-visible,html.js-kb .a11y-toggle:focus-visible{outline:3px solid #e33d6b;outline-offset:3px;box-shadow:0 0 0 4px rgba(227,61,107,0.25)}',
      '.skip-link{position:absolute;left:-9999px;top:0;z-index:100000;background:#e33d6b;color:#fff;padding:0.65rem 1rem;font-family:Oswald,system-ui,sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none}',
      '.skip-link:focus,.skip-link:focus-visible{left:0.75rem;top:0.75rem;outline:3px solid #fff;outline-offset:2px}',
      '[data-kb-hint]{position:relative}'
    ].join('');
    document.head.appendChild(s);
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    injectFocusCSS();
    ensureSkipLink();
    wireSkip();
    wireModality();
    wireRovingAll();
    wireEscape();
    wireLandmarks();
    wireRoleButtons();
    observePanels();

    // re-scan after dynamic content
    setTimeout(wireRovingAll, 800);
    setTimeout(wireRovingAll, 2500);

    global.CricriKeyboard = {
      focusables: focusables,
      refresh: wireRovingAll
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
