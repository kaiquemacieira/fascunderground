/**
 * CRICRI — garante chrome fixo na viewport
 * Move nav / a11y / install para document.body e força position:fixed
 */
(function () {
  'use strict';

  var SELECTORS = [
    'nav.bottom-nav[data-cricri-nav="1"]',
    'nav.bottom-nav',
    '#a11y-wrap',
    '.a11y-wrap',
    '#cricri-install-btn',
    '[vw]',
    '.vw-plugin-wrapper',
    '.vlibras-wrapper'
  ];

  function forceFixed(el, extra) {
    if (!el || !el.style) return;
    var s = el.style;
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('transform', 'none', 'important');
    s.setProperty('opacity', '1', 'important');
    s.setProperty('visibility', 'visible', 'important');
    s.setProperty('pointer-events', el.id === 'bottom-nav-slot' ? 'none' : 'auto', 'important');
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        s.setProperty(k, extra[k], 'important');
      });
    }
  }

  function pin() {
    // Nunca deixar filter/transform no html/body (quebra fixed)
    try {
      document.documentElement.style.setProperty('filter', 'none', 'important');
      document.documentElement.style.removeProperty('filter');
      document.documentElement.style.setProperty('transform', 'none', 'important');
      if (document.body) {
        document.body.style.setProperty('filter', 'none', 'important');
        document.body.style.removeProperty('filter');
        document.body.style.setProperty('transform', 'none', 'important');
      }
    } catch (_) {}
    // nav
    var navs = document.querySelectorAll('nav.bottom-nav');
    navs.forEach(function (nav) {
      if (nav.parentElement !== document.body) {
        document.body.appendChild(nav);
      }
      forceFixed(nav, {
        left: '0',
        right: '0',
        bottom: '0',
        top: 'auto',
        width: '100%',
        'z-index': '2147483000',
        display: 'grid'
      });
    });

    // a11y
    var a11y = document.getElementById('a11y-wrap') || document.querySelector('.a11y-wrap');
    if (a11y) {
      if (a11y.parentElement !== document.body) document.body.appendChild(a11y);
      forceFixed(a11y, {
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        left: 'auto',
        top: 'auto',
        'z-index': '2147483002'
      });
      a11y.style.setProperty('pointer-events', 'none', 'important');
      var tog = a11y.querySelector('.a11y-toggle, #a11y-toggle');
      if (tog) tog.style.setProperty('pointer-events', 'auto', 'important');
    }

    var panel = document.getElementById('a11y-panel');
    if (panel) {
      if (panel.parentElement !== document.body && panel.parentElement !== a11y) {
        (a11y || document.body).appendChild(panel);
      }
      forceFixed(panel, {
        right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))',
        'z-index': '2147483004'
      });
    }

    // install
    var inst = document.getElementById('cricri-install-btn');
    if (inst) {
      if (inst.parentElement !== document.body) document.body.appendChild(inst);
      forceFixed(inst, {
        left: 'max(0.65rem, env(safe-area-inset-left, 0px))',
        right: 'auto',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        top: 'auto',
        'z-index': '2147483001',
        display: 'inline-flex',
        visibility: 'visible',
        opacity: '1'
      });
      if (!inst.hidden) {
        inst.style.setProperty('display', 'inline-flex', 'important');
      }
    }

    // VLibras
    document.querySelectorAll('[vw], .vw-plugin-wrapper, .vlibras-wrapper').forEach(function (el) {
      forceFixed(el, { 'z-index': '2147483005' });
    });

    try {
      document.body.classList.add('is-page-ready');
      document.body.classList.remove('nav-hidden');
      document.documentElement.classList.remove('nav-hidden');
    } catch (_) {}
  }

  function boot() {
    pin();
    setTimeout(pin, 50);
    setTimeout(pin, 300);
    setTimeout(pin, 1000);
    // VLibras carrega tarde
    setTimeout(pin, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', function () { setTimeout(pin, 100); });
  window.CricriFixedChrome = { pin: pin };
})();
