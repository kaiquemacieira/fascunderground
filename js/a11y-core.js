/**
 * CRICRI · Acessibilidade global (WCAG-oriented)
 * FAB + painel em qualquer página; estado em localStorage.
 */
(function (global) {
  'use strict';

  // Marca cedo: bundles legados (home-ui) devem ceder ao core v2
  global.__CRICRI_A11Y_V2 = true;

  var KEY = 'cricri-a11y-v2';
  var LEGACY = 'fasc-a11y-v1';

  var defaults = {
    text: 'md',
    contrast: 'default',
    theme: 'dark',
    motion: 'default',
    font: 'default',
    spacing: 'default',
    links: 'default',
    color: 'default', // daltonismo: protanopia | deuteranopia | tritanopia | gray
    cursor: 'default',
    reading: 'default' // linha guia / foco ampliado
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var leg = localStorage.getItem(LEGACY);
      var o = {};
      if (raw) try { o = JSON.parse(raw) || {}; } catch (_) {}
      var legO = {};
      if (leg) try { legO = JSON.parse(leg) || {}; } catch (_) {}
      // mescla: preferir cricri-a11y-v2, mas herdar theme do legado se faltar
      var merged = Object.assign({}, defaults, legO, o);
      if ((!o.theme || o.theme === 'default') && legO.theme) merged.theme = legO.theme;
      return merged;
    } catch (_) {
      return Object.assign({}, defaults);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function ensureStyles() {
    if (document.getElementById('cricri-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-a11y-css';
    s.textContent = [
      '.a11y-wrap{position:fixed!important;top:auto!important;bottom:calc(72px + env(safe-area-inset-bottom,0px))!important;right:max(0.75rem,env(safe-area-inset-right,0px))!important;left:auto!important;z-index:99990!important;display:flex!important;flex-direction:column-reverse!important;align-items:flex-end!important;gap:0.45rem!important;pointer-events:none!important;margin:0!important}',
      '/* profile uses same bottom FAB */',
      '.a11y-toggle{pointer-events:auto!important;width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;border-radius:50%!important;border:2.5px solid #f2e8d2!important;background:#E6BE49!important;color:#fff!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 16px rgba(227,61,107,0.4)!important;transition:transform .15s ease,background .15s ease!important;z-index:99991!important;position:relative!important;padding:0!important;margin:0!important;appearance:none!important;-webkit-appearance:none!important}',
      '.a11y-toggle:hover,.a11y-toggle[aria-expanded="true"]{background:#b03a22!important;border-color:#f2e8d2!important;transform:scale(1.05)}',
      '.a11y-toggle:focus-visible{outline:3px solid #d49a2c!important;outline-offset:3px}',
      '.a11y-toggle svg{width:24px;height:24px;pointer-events:none;display:block}',
      '.a11y-panel{pointer-events:auto!important;position:fixed!important;bottom:calc(72px + 56px + env(safe-area-inset-bottom,0px))!important;top:auto!important;right:max(0.75rem,env(safe-area-inset-right,0px))!important;left:auto!important;width:min(340px,calc(100vw - 1.25rem))!important;max-height:min(60vh,calc(100dvh - 9rem - env(safe-area-inset-bottom,0px)))!important;overflow:auto;-webkit-overflow-scrolling:touch;background:#141414!important;color:#FAFAF7!important;border:2px solid rgba(230,190,73,0.45)!important;border-radius:12px!important;padding:0.9rem 0.85rem 1rem;box-shadow:0 -8px 40px rgba(0,0,0,0.55);z-index:99992!important}',
      '.a11y-panel[hidden]{display:none!important}',
      '.a11y-panel h2{margin:0 0 0.75rem;font-family:Oswald,system-ui,sans-serif;font-size:0.95rem;letter-spacing:0.1em;text-transform:uppercase}',
      '.a11y-group{margin-bottom:0.75rem;padding-bottom:0.65rem;border-bottom:1px solid rgba(230,220,196,0.1)}',
      '.a11y-group-label{display:block;font-family:Oswald,system-ui,sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:#c4b9a6;margin-bottom:0.4rem}',
      '.a11y-row{display:flex;flex-wrap:wrap;gap:0.35rem}',
      '.a11y-chip{appearance:none;border:1.5px solid rgba(230,220,196,0.22);background:rgba(42,37,32,0.6);color:#FAFAF7;font-family:Oswald,system-ui,sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:0.5rem 0.65rem;min-height:40px;border-radius:999px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.a11y-chip[aria-pressed="true"]{border-color:#E6BE49;background:rgba(227,61,107,0.2);color:#fff}',
      '.a11y-reset{width:100%;margin-top:0.35rem;appearance:none;border:1.5px solid rgba(230,220,196,0.25);background:transparent;color:#FAFAF7;font-family:Oswald,system-ui,sans-serif;font-weight:600;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;padding:0.55rem;border-radius:8px;cursor:pointer}',
      '.a11y-note{margin:0.5rem 0 0;font-size:0.72rem;color:#9a9184;line-height:1.4}',
      /* texto */
      'html[data-a11y-text="lg"]{font-size:112.5%}',
      'html[data-a11y-text="xl"]{font-size:125%}',
      'html[data-a11y-text="xxl"]{font-size:137.5%}',
      /* contraste */
      'html[data-a11y-contrast="high"]{--void:#000;--ink:#000;--paper:#fff;--cream:#fff;--rosa:#ff0;--stone:#ddd}',
      'html[data-a11y-contrast="high"] body{background:#000;color:#fff}',
      'html[data-a11y-contrast="soft"] body{filter:contrast(0.92)}',
      'html[data-a11y-contrast="invert"] body{filter:invert(1) hue-rotate(180deg)}',
      /* daltonismo / visão de cores (SVG filters injetados) */
      'html[data-a11y-color="protanopia"] body{filter:url(#cricri-protanopia)}',
      'html[data-a11y-color="deuteranopia"] body{filter:url(#cricri-deuteranopia)}',
      'html[data-a11y-color="tritanopia"] body{filter:url(#cricri-tritanopia)}',
      'html[data-a11y-color="gray"] body{filter:grayscale(1)}',
      /* movimento */
      'html[data-a11y-motion="reduce"] *,html[data-a11y-motion="reduce"] *::before,html[data-a11y-motion="reduce"] *::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}',
      /* fonte */
      'html[data-a11y-font="sans"] body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
      'html[data-a11y-font="mono"] body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
      'html[data-a11y-font="dyslexia"] body{font-family:OpenDyslexic,Comic Sans MS,Arial,sans-serif;letter-spacing:0.04em;word-spacing:0.12em}',
      /* espaçamento */
      'html[data-a11y-spacing="comfy"] body{line-height:1.65;letter-spacing:0.02em}',
      'html[data-a11y-spacing="loose"] body{line-height:1.85;letter-spacing:0.04em}',
      'html[data-a11y-spacing="comfy"] p,html[data-a11y-spacing="loose"] p{margin-bottom:1em}',
      /* links */
      'html[data-a11y-links="underline"] a{text-decoration:underline!important;text-underline-offset:0.2em}',
      'html[data-a11y-links="bold"] a{font-weight:700!important;text-decoration:underline!important}',
      /* cursor ampliado */
      'html[data-a11y-cursor="large"] body,*{cursor:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27%3E%3Cpath fill=%27%23fff%27 stroke=%27%23000%27 stroke-width=%272%27 d=%27M4 4 L4 24 L10 18 L14 28 L18 26 L14 16 L22 16 Z%27/%3E%3C/svg%3E") 4 4, auto!important}',
      /* leitura: destaque de foco */
      'html[data-a11y-reading="focus"] :focus-visible{outline:3px solid #E6BE49!important;outline-offset:3px!important}',
      'html[data-a11y-reading="guide"] body{background-image:linear-gradient(to bottom,transparent 0,transparent calc(50% - 1.2em),rgba(227,61,107,0.12) calc(50% - 1.2em),rgba(227,61,107,0.12) calc(50% + 1.2em),transparent calc(50% + 1.2em));background-attachment:fixed}',
      /* tema claro via a11y */
      'html[data-a11y-theme="light"],html[data-theme="light"]{color-scheme:light}',
      '.vlibras-wrapper{z-index:99980!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureFilters() {
    if (document.getElementById('cricri-a11y-svg')) return;
    var div = document.createElement('div');
    div.id = 'cricri-a11y-svg';
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    div.setAttribute('aria-hidden', 'true');
    // Matrizes aproximadas de simulação/correção assistiva de daltonismo
    div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<filter id="cricri-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/></filter>' +
      '<filter id="cricri-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter>' +
      '<filter id="cricri-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/></filter>' +
      '</svg>';
    document.body.appendChild(div);
  }

  function panelHTML() {
    function group(label, id, chips) {
      return '<div class="a11y-group"><span class="a11y-group-label" id="' + id + '">' + label + '</span>' +
        '<div class="a11y-row" role="group" aria-labelledby="' + id + '">' + chips + '</div></div>';
    }
    function chip(set, label) {
      return '<button type="button" class="a11y-chip" data-a11y-set="' + set + '" aria-pressed="false">' + label + '</button>';
    }
    return (
      '<h2 id="a11y-panel-title">Acessibilidade</h2>' +
      group('Tamanho do texto', 'a11y-text-label',
        chip('text:md', 'A') + chip('text:lg', 'A+') + chip('text:xl', 'A++') + chip('text:xxl', 'A+++')) +
      group('Contraste', 'a11y-contrast-label',
        chip('contrast:default', 'Padrão') + chip('contrast:soft', 'Suave') + chip('contrast:high', 'Alto') + chip('contrast:invert', 'Inverter')) +
      group('Daltonismo / cores', 'a11y-color-label',
        chip('color:default', 'Normal') + chip('color:protanopia', 'Protanopia') + chip('color:deuteranopia', 'Deuteranopia') + chip('color:tritanopia', 'Tritanopia') + chip('color:gray', 'Escala de cinza')) +
      group('Tema', 'a11y-theme-label',
        chip('theme:dark', 'Escuro') + chip('theme:light', 'Claro')) +
      group('Movimento', 'a11y-motion-label',
        chip('motion:default', 'Normal') + chip('motion:reduce', 'Reduzir')) +
      group('Fonte', 'a11y-font-label',
        chip('font:default', 'Padrão') + chip('font:sans', 'Sans') + chip('font:mono', 'Mono') + chip('font:dyslexia', 'Dislexia')) +
      group('Espaçamento', 'a11y-spacing-label',
        chip('spacing:default', 'Padrão') + chip('spacing:comfy', 'Conforto') + chip('spacing:loose', 'Amplo')) +
      group('Links', 'a11y-links-label',
        chip('links:default', 'Padrão') + chip('links:underline', 'Sublinhado') + chip('links:bold', 'Negrito')) +
      group('Cursor', 'a11y-cursor-label',
        chip('cursor:default', 'Padrão') + chip('cursor:large', 'Ampliado')) +
      group('Leitura', 'a11y-reading-label',
        chip('reading:default', 'Padrão') + chip('reading:focus', 'Foco forte') + chip('reading:guide', 'Guia')) +
      '<button type="button" class="a11y-reset" data-a11y-reset>Restaurar padrão</button>' +
      '<button type="button" class="a11y-reset" id="a11y-libras-btn" style="margin-top:0.5rem">Abrir Libras (VLibras)</button>' +
      '<p class="a11y-note">Libras via VLibras (governo). Tema claro/escuro só neste painel. Preferências salvas neste aparelho.</p>'
    );
  }

  function ensureUI() {
    var wrap = document.querySelector('.a11y-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'a11y-wrap';
      document.body.appendChild(wrap);
    }
    var A11Y_ICON =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="5" r="2.2"/>' +
      '<path d="M12 8.5v3.5"/>' +
      '<path d="M8 22l4-10 4 10"/>' +
      '<path d="M6.5 13.5h11"/>' +
      '</svg>';
    var toggle = document.getElementById('a11y-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'a11y-toggle';
      toggle.id = 'a11y-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'a11y-panel');
      toggle.setAttribute('aria-label', 'Abrir opções de acessibilidade');
      toggle.title = 'Acessibilidade';
      toggle.innerHTML = A11Y_ICON;
      wrap.appendChild(toggle);
    } else {
      // unifica ícone (HOME SVG · evita ♿ só no perfil)
      if (!toggle.querySelector('svg')) toggle.innerHTML = A11Y_ICON;
      toggle.setAttribute('aria-label', 'Abrir opções de acessibilidade');
      toggle.title = 'Acessibilidade';
      if (!toggle.getAttribute('type')) toggle.setAttribute('type', 'button');
    }
    var panel = document.getElementById('a11y-panel');
    var drawer = document.getElementById('a11y-drawer');
    // perfil usa #a11y-drawer — unifica como painel controlado pelo core
    if (!panel && drawer) {
      panel = drawer;
      panel.classList.add('a11y-panel');
      panel.id = 'a11y-panel';
      // drawer legado do perfil (poucos chips) → painel completo do core
      if (!panel.querySelector('[data-a11y-set="color:protanopia"]')) {
        panel.innerHTML = panelHTML();
      }
      toggle.setAttribute('aria-controls', 'a11y-panel');
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'a11y-panel';
      panel.id = 'a11y-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'false');
      panel.setAttribute('aria-labelledby', 'a11y-panel-title');
      panel.hidden = true;
      panel.innerHTML = panelHTML();
      wrap.appendChild(panel);
    } else if (panel.id === 'a11y-panel' && !panel.querySelector('[data-a11y-set], [data-k]')) {
      // painel vazio legado
      if (!panel.querySelector('[data-a11y-set="color:protanopia"]')) {
        panel.innerHTML = panelHTML();
      }
    } else if (panel.id === 'a11y-panel' && !panel.querySelector('[data-a11y-set="color:protanopia"]') && panel.querySelector('[data-a11y-set]')) {
      /* ok — chips já existem */
    } else if (panel.id === 'a11y-panel' && !panel.querySelector('[data-a11y-set="color:protanopia"]') && !panel.querySelector('[data-k]')) {
      panel.innerHTML = panelHTML();
    }
    // painel sempre dentro do wrap (posicionamento fixo)
    if (panel.parentNode !== wrap) wrap.appendChild(panel);
    // FAB padrão: canto inferior direito (igual Meow) — tira do header se precisar
    if (toggle.parentNode !== wrap) {
      wrap.appendChild(toggle);
    }
    if (panel.parentNode !== wrap) {
      wrap.appendChild(panel);
    }
    toggle.style.cssText = [
      'pointer-events:auto', 'cursor:pointer', 'z-index:99991',
      'width:56px', 'height:56px', 'min-width:56px', 'min-height:56px',
      'border-radius:50%', 'border:2.5px solid #f2e8d2', 'background:#E6BE49',
      'color:#fff', 'display:inline-flex', 'align-items:center', 'justify-content:center',
      'touch-action:manipulation', '-webkit-tap-highlight-color:transparent',
      'box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 16px rgba(227,61,107,0.4)',
      'padding:0', 'margin:0', 'position:relative', 'appearance:none'
    ].join(';');
    if (!toggle.getAttribute('type')) toggle.setAttribute('type', 'button');
    if (!toggle.querySelector('svg')) {
      toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><path d="M12 8.5v3.5"/><path d="M8 22l4-10 4 10"/><path d="M6.5 13.5h11"/></svg>';
    }
    wrap.style.cssText = [
      'position:fixed', 'top:auto',
      'bottom:calc(72px + env(safe-area-inset-bottom, 0px))',
      'right:max(0.75rem, env(safe-area-inset-right, 0px))',
      'left:auto', 'z-index:99990', 'display:flex',
      'flex-direction:column-reverse', 'align-items:flex-end',
      'gap:0.45rem', 'pointer-events:none', 'margin:0'
    ].join(';');
    panel.style.pointerEvents = 'auto';
    panel.style.position = 'fixed';
    panel.style.bottom = 'calc(72px + 60px + env(safe-area-inset-bottom, 0px))';
    panel.style.top = 'auto';
    panel.style.right = 'max(0.75rem, env(safe-area-inset-right, 0px))';
    panel.style.zIndex = '99992';
    return { wrap: wrap, toggle: toggle, panel: panel };
  }

  function apply(state) {
    var root = document.documentElement;
    Object.keys(defaults).forEach(function (k) {
      var v = state[k] || defaults[k];
      if (k === 'theme') {
        var theme = v === 'light' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-a11y-theme', theme);
        // sync legado (theme.js / boot HOME)
        try {
          var leg = {};
          try { leg = JSON.parse(localStorage.getItem(LEGACY) || '{}') || {}; } catch (_) {}
          leg.theme = theme;
          localStorage.setItem(LEGACY, JSON.stringify(leg));
        } catch (_) {}
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F6F3' : '#0A0A0A');
        if (global.fascTheme && typeof global.fascTheme.set === 'function') {
          try { global.fascTheme.set(theme); } catch (_) {}
        }
        return;
      }
      if (v === 'default' || v === 'md') root.removeAttribute('data-a11y-' + k);
      else root.setAttribute('data-a11y-' + k, v);
    });
    var panel = document.getElementById('a11y-panel') || document.getElementById('a11y-drawer');
    if (panel) {
      panel.querySelectorAll('[data-a11y-set]').forEach(function (btn) {
        var raw = btn.getAttribute('data-a11y-set') || '';
        var parts = raw.split(':');
        var key = parts[0], val = parts[1];
        var current = state[key] || defaults[key];
        btn.setAttribute('aria-pressed', current === val ? 'true' : 'false');
      });
      // chips legados data-k / data-v
      panel.querySelectorAll('.chip[data-k]').forEach(function (btn) {
        var key = btn.getAttribute('data-k');
        var val = btn.getAttribute('data-v');
        var current = state[key] || defaults[key];
        var match = (val === current) || ((val === 'default' || val === 'md') && (current === 'default' || current === 'md' || current === 'dark' && key === 'theme' && val === 'default'));
        if (key === 'theme') {
          match = (val === 'light' && current === 'light') ||
            ((val === 'dark' || val === 'default') && current !== 'light');
        }
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
    }
    try {
      global.dispatchEvent(new CustomEvent('cricri:a11y', { detail: state }));
    } catch (_) {}
  }

  function placePanelAboveFab(panel) {
    if (!panel) return;
    // Sempre acima do FAB / bottom-nav — nunca “abre pra baixo”
    panel.style.setProperty('position', 'fixed', 'important');
    panel.style.setProperty('top', 'auto', 'important');
    panel.style.setProperty('bottom', 'calc(72px + 64px + env(safe-area-inset-bottom, 0px))', 'important');
    panel.style.setProperty('right', 'max(0.75rem, env(safe-area-inset-right, 0px))', 'important');
    panel.style.setProperty('left', 'auto', 'important');
    panel.style.setProperty('max-height', 'min(58vh, calc(100dvh - 9.5rem - env(safe-area-inset-bottom, 0px)))', 'important');
    panel.style.setProperty('width', 'min(92vw, 340px)', 'important');
    panel.style.setProperty('z-index', '99992', 'important');
    panel.style.setProperty('overflow-y', 'auto', 'important');
    panel.style.setProperty('transform', 'none', 'important');
  }
  function openPanel(toggle, panel) {
    placePanelAboveFab(panel);
    panel.hidden = false;
    panel.removeAttribute('hidden');
    panel.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    // scroll interno se conteúdo for longo
    try { panel.scrollTop = 0; } catch (_) {}
  }
  function closePanel(toggle, panel) {
    panel.hidden = true;
    panel.setAttribute('hidden', '');
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function wireVLibras() {
    if (document.getElementById('vlibras-script')) return;
    // widget oficial VLibras (governo)
    var host = document.createElement('div');
    host.setAttribute('vw', '');
    host.className = 'enabled';
    host.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(host);
    var sc = document.createElement('script');
    sc.id = 'vlibras-script';
    sc.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    sc.defer = true;
    sc.onload = function () {
      try {
        // eslint-disable-next-line no-undef
        new window.VLibras.Widget('https://vlibras.gov.br/app');
      } catch (e) {
        console.warn('[CRICRI a11y] VLibras', e);
      }
    };
    document.body.appendChild(sc);
  }

  function init() {
    ensureStyles();
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    ensureFilters();
    var ui = ensureUI();
    var state = load();
    if (!localStorage.getItem(KEY) && !localStorage.getItem(LEGACY) &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.motion = 'reduce';
    }
    apply(state);
    save(state);

    // v2: sempre assume o controle (home-ui legado marca cricriA11y=1 e quebra no mobile)
    if (ui.panel.dataset.cricriA11yCoreV2 === '1') {
      global.CricriA11y = global.CricriA11y || {
        get: load,
        set: function (partial) {
          state = Object.assign({}, load(), partial || {});
          apply(state); save(state);
        },
        reset: function () {
          state = Object.assign({}, defaults);
          apply(state); save(state);
        }
      };
      return;
    }
    ui.panel.dataset.cricriA11y = '1';
    ui.panel.dataset.cricriA11yCoreV2 = '1';

    // Remove listeners legados (bundle home-ui / wire HOME) clonando o botão
    try {
      if (ui.toggle && ui.toggle.parentNode) {
        var clean = ui.toggle.cloneNode(true);
        ui.toggle.parentNode.replaceChild(clean, ui.toggle);
        ui.toggle = clean;
        // re-resolve after clone
        ui = { wrap: ui.wrap, toggle: clean, panel: ui.panel };
      }
    } catch (_) {}

    // força painel fixo no viewport (mobile HOME)
    try {
      ui.panel.style.position = 'fixed';
      ui.panel.style.top = 'calc(0.65rem + 56px + env(safe-area-inset-top, 0px))';
      ui.panel.style.right = 'max(0.65rem, env(safe-area-inset-right, 0px))';
      ui.panel.style.left = 'auto';
      ui.panel.style.zIndex = '99992';
      ui.panel.style.pointerEvents = 'auto';
    } catch (_) {}

    ui.toggle.style.pointerEvents = 'auto';
    ui.toggle.style.zIndex = '99991';
    ui.toggle.style.touchAction = 'manipulation';
    ui.toggle.style.cursor = 'pointer';
    ui.toggle.style.webkitTapHighlightColor = 'transparent';

    var ignoreUntil = 0;
    function onToggle(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      var open = ui.toggle.getAttribute('aria-expanded') === 'true' && !ui.panel.hidden;
      if (open) {
        closePanel(ui.toggle, ui.panel);
      } else {
        openPanel(ui.toggle, ui.panel);
        // mobile: gesto gera click extra no document — janela maior
        ignoreUntil = Date.now() + 700;
      }
    }

    var lastToggleAt = 0;
    function handleToggleEvent(e) {
      if (Date.now() - lastToggleAt < 320) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
        return;
      }
      lastToggleAt = Date.now();
      onToggle(e);
    }
    // click + pointerup (melhor no mobile que só click)
    ui.toggle.addEventListener('click', handleToggleEvent, true);
    // Mobile real: touchend é mais confiável que click em alguns WebViews
    ui.toggle.addEventListener('touchend', function (e) {
      e.preventDefault();
      handleToggleEvent(e);
    }, { capture: true, passive: false });

    // Chips de tema/texto/etc. — uma única fonte de verdade (inclui HOME)
    ui.panel.addEventListener('click', function (e) {
      var reset = e.target.closest('[data-a11y-reset]');
      if (reset) {
        e.preventDefault();
        e.stopPropagation();
        state = Object.assign({}, defaults);
        apply(state);
        save(state);
        return;
      }
      var chip = e.target.closest('[data-a11y-set], .chip[data-k]');
      if (!chip) return;
      e.preventDefault();
      e.stopPropagation();
      var raw = chip.getAttribute('data-a11y-set') || '';
      var key, val;
      if (raw && raw.indexOf(':') > 0) {
        var parts = raw.split(':');
        key = parts[0]; val = parts[1];
      } else {
        key = chip.getAttribute('data-k');
        val = chip.getAttribute('data-v');
      }
      if (!key) return;
      // normaliza tema
      if (key === 'theme') {
        if (val === 'default') val = 'dark';
        val = val === 'light' ? 'light' : 'dark';
      }
      state = Object.assign({}, load(), state);
      state[key] = val;
      apply(state);
      save(state);
      ui.panel.querySelectorAll('.chip[data-k="' + key + '"]').forEach(function (c) {
        var cv = c.getAttribute('data-v');
        var on = cv === val || (key === 'theme' && val === 'dark' && (cv === 'dark' || cv === 'default'));
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }, true);

    // fechar ao clicar fora / Escape
    document.addEventListener('click', function (e) {
      if (Date.now() < ignoreUntil) return;
      if (ui.toggle.getAttribute('aria-expanded') !== 'true') return;
      if (ui.panel.contains(e.target) || ui.toggle.contains(e.target)) return;
      closePanel(ui.toggle, ui.panel);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.toggle.getAttribute('aria-expanded') === 'true') {
        closePanel(ui.toggle, ui.panel);
        try { ui.toggle.focus(); } catch (_) {}
      }
    });

    global.CricriA11y = {
      get: load,
      set: function (partial) {
        state = Object.assign({}, load(), partial || {});
        apply(state);
        save(state);
      },
      reset: function () {
        state = Object.assign({}, defaults);
        apply(state);
        save(state);
      },
      open: function () { openPanel(ui.toggle, ui.panel); },
      close: function () { closePanel(ui.toggle, ui.panel); }
    };
    wireVLibras();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
