/**
 * CRICRI · Menu hambúrguer mobile
 * Independente de script.js — abre/fecha, a11y, scroll lock
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function init() {
    var toggle = $('menu-toggle');
    var menu = $('mobile-menu');
    if (!toggle || !menu) return;

    var lastFocus = null;

    function isOpen() {
      return toggle.classList.contains('open') || menu.classList.contains('visible');
    }

    function openMenu() {
      lastFocus = document.activeElement;
      menu.hidden = false;
      // force reflow
      void menu.offsetWidth;
      menu.classList.add('visible');
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fechar menu');
      document.body.classList.add('has-mobile-menu-open');
      document.documentElement.classList.add('has-mobile-menu-open');
      // focus first link
      var first = menu.querySelector('a, button');
      if (first) setTimeout(function () { try { first.focus(); } catch (_) {} }, 80);
      if (window.CricriSfx) try { window.CricriSfx.play('click'); } catch (_) {}
    }

    function closeMenu() {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      menu.classList.remove('visible');
      document.body.classList.remove('has-mobile-menu-open');
      document.documentElement.classList.remove('has-mobile-menu-open');
      setTimeout(function () {
        if (!menu.classList.contains('visible')) menu.hidden = true;
      }, 240);
      if (lastFocus && typeof lastFocus.focus === 'function') {
        try { lastFocus.focus(); } catch (_) {}
      }
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) closeMenu();
      else openMenu();
    });

    menu.querySelectorAll('[data-mobile-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    // clique no fundo (área do menu fora dos links)
    menu.addEventListener('click', function (e) {
      if (e.target === menu) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        e.preventDefault();
        closeMenu();
        toggle.focus();
      }
    });

    // fecha em resize para desktop
    var mq = window.matchMedia('(min-width: 640px)');
    function onMq(ev) {
      if (ev.matches && isOpen()) closeMenu();
    }
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);

    // API pública
    window.CricriMobileMenu = { open: openMenu, close: closeMenu, isOpen: isOpen };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
