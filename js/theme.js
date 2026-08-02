// FASC+ · tema (modo escuro da marca = default)
(function (global) {
  'use strict';

  var KEY = 'fasc-a11y-v1';
  var META = 'theme-color';

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
    return s;
  }

  /** Resolve: dark | light  (default da marca = dark) */
  function resolveTheme(raw) {
    if (raw === 'light') return 'light';
    // "default" e "dark" → dark FASC
    return 'dark';
  }

  function applyTheme(raw, opts) {
    var theme = resolveTheme(raw);
    var html = document.documentElement;
    var prev = html.getAttribute('data-theme');
    var silent = opts && opts.silent;
    html.classList.add('theme-anim');
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-a11y-theme', theme === 'light' ? 'light' : 'dark');
    html.style.colorScheme = theme;
    clearTimeout(applyTheme._t);
    applyTheme._t = setTimeout(function () { html.classList.remove('theme-anim'); }, 400);

    var meta = document.querySelector('meta[name="' + META + '"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f6efdc' : '#0c0a08');
    }

    // botões opcionais
    document.querySelectorAll('[data-theme-set]').forEach(function (btn) {
      var v = btn.getAttribute('data-theme-set');
      btn.setAttribute('aria-pressed', resolveTheme(v) === theme ? 'true' : 'false');
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro FASC');
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
    // Marca FASC = escuro. Só light se o usuário escolheu e salvou.
    var raw = s.theme || 'dark';
    return applyTheme(raw);
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

  function wire() {
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

  global.fascTheme = {
    init: init,
    set: setTheme,
    toggle: toggle,
    current: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
  };

  // boot imediato (antes do paint se o script for no head; no body também ok)
  init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})(typeof window !== 'undefined' ? window : this);
