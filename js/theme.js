/**
 * CRICRI / FASC+ · Tema nativo
 * Default da marca = escuro. color-scheme + theme-color + data-theme.
 */
(function (global) {
  'use strict';

  var KEY = 'fasc-a11y-v1';
  var KEY2 = 'cricri-a11y-v2';
  var META = 'theme-color';
  var META_SCHEME = 'color-scheme';

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeState(partial) {
    var s = readState();
    Object.keys(partial).forEach(function (k) { s[k] = partial[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    try {
      var s2 = {};
      try { s2 = JSON.parse(localStorage.getItem(KEY2) || '{}') || {}; } catch (_) {}
      Object.keys(partial).forEach(function (k) { s2[k] = partial[k]; });
      localStorage.setItem(KEY2, JSON.stringify(s2));
    } catch (_) {}
    return s;
  }

  /** dark | light — default FASC = dark */
  function resolveTheme(raw) {
    if (raw === 'light') return 'light';
    return 'dark';
  }

  function ensureMeta(name, content) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      if (document.head) document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
    return meta;
  }

  function applyTheme(raw, opts) {
    var theme = resolveTheme(raw);
    var html = document.documentElement;
    var prev = html.getAttribute('data-theme');
    var silent = opts && opts.silent;

    if (!silent && prev && prev !== theme) {
      html.classList.add('theme-anim');
      clearTimeout(applyTheme._t);
      applyTheme._t = setTimeout(function () {
        html.classList.remove('theme-anim');
      }, 400);
    }

    html.setAttribute('data-theme', theme);
    html.setAttribute('data-a11y-theme', theme === 'light' ? 'light' : 'dark');
    html.style.colorScheme = theme;
    try {
      html.style.setProperty('color-scheme', theme);
    } catch (_) {}

    // Nativo: barra de status / PWA / form controls
    ensureMeta(META, theme === 'light' ? '#FFFFFF' : '#0A0A0A');
    ensureMeta(META_SCHEME, theme === 'light' ? 'light' : 'dark');

    document.querySelectorAll('[data-theme-set]').forEach(function (btn) {
      var v = btn.getAttribute('data-theme-set');
      btn.setAttribute('aria-pressed', resolveTheme(v) === theme ? 'true' : 'false');
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro CRICRI'
      );
      btn.setAttribute('data-theme-current', theme);
    });

    if (!silent && prev !== theme) {
      try {
        global.dispatchEvent(new CustomEvent('fasc:theme', { detail: { theme: theme } }));
      } catch (_) {}
    }
    return theme;
  }

  function init() {
    var s = readState();
    // Preferência salva > default dark da marca
    // (não segue o SO automaticamente — marca FASC é escura)
    var raw = s.theme;
    if (raw !== 'light' && raw !== 'dark') {
      raw = 'dark';
    }
    applyTheme(raw, { silent: true });
  }

  function setTheme(raw) {
    var theme = resolveTheme(raw);
    writeState({ theme: theme });
    return applyTheme(theme);
  }

  function toggle() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    return setTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function boot() {
    init();
    document.addEventListener('click', function (e) {
      var setBtn = e.target.closest('[data-theme-set]');
      if (setBtn) {
        e.preventDefault();
        setTheme(setBtn.getAttribute('data-theme-set'));
        return;
      }
      var tog = e.target.closest('[data-theme-toggle]');
      if (tog) {
        e.preventDefault();
        toggle();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // aplica o mais cedo possível se o script rodar no head
  try { init(); } catch (_) {}

  global.fascTheme = {
    init: init,
    set: setTheme,
    toggle: toggle,
    get: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
    apply: applyTheme
  };
})(typeof window !== 'undefined' ? window : this);
