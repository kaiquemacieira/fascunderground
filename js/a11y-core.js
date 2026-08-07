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
    // CSS externo de filtros (daltonismo + contraste) — uma vez
    if (!document.getElementById('cricri-a11y-filters-link')) {
      var link = document.createElement('link');
      link.id = 'cricri-a11y-filters-link';
      link.rel = 'stylesheet';
      link.href = 'css/a11y-filters.css?v=20260807dalt';
      (document.head || document.documentElement).appendChild(link);
    }
    if (document.getElementById('cricri-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-a11y-css';
    /* Filtros de cor/contraste no conteúdo (#cricri-a11y-target), não em body —
       filter em body quebra position:fixed do menu e do FAB. */
    s.textContent = [
      '.a11y-wrap{position:fixed!important;top:auto!important;bottom:calc(72px + env(safe-area-inset-bottom,0px))!important;right:max(0.75rem,env(safe-area-inset-right,0px))!important;left:auto!important;z-index:2147483002!important;display:flex!important;flex-direction:column-reverse!important;align-items:flex-end!important;gap:0.45rem!important;pointer-events:none!important;margin:0!important;filter:none!important}',
      '.a11y-toggle{pointer-events:auto!important;width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;border-radius:50%!important;border:2.5px solid #f2e8d2!important;background:#E6BE49!important;color:#fff!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 16px rgba(227,61,107,0.4)!important;transition:transform .15s ease,background .15s ease!important;z-index:2147483003!important;position:relative!important;padding:0!important;margin:0!important;appearance:none!important;-webkit-appearance:none!important;filter:none!important}',
      '.a11y-toggle:hover,.a11y-toggle[aria-expanded="true"]{background:#b03a22!important;border-color:#f2e8d2!important;transform:scale(1.05)}',
      '.a11y-toggle:focus-visible{outline:3px solid #d49a2c!important;outline-offset:3px}',
      '.a11y-toggle svg{width:24px;height:24px;pointer-events:none;display:block}',
      '.a11y-panel{pointer-events:auto!important;position:fixed!important;bottom:calc(72px + 56px + env(safe-area-inset-bottom,0px))!important;top:auto!important;right:max(0.75rem,env(safe-area-inset-right,0px))!important;left:auto!important;width:min(340px,calc(100vw - 1.25rem))!important;max-height:min(60vh,calc(100dvh - 9rem - env(safe-area-inset-bottom,0px)))!important;overflow:auto;-webkit-overflow-scrolling:touch;background:#141414!important;color:#FAFAF7!important;border:2px solid rgba(230,190,73,0.45)!important;border-radius:12px!important;padding:0.9rem 0.85rem 1rem;box-shadow:0 -8px 40px rgba(0,0,0,0.55);z-index:2147483004!important;filter:none!important}',
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
      /* ALTO CONTRASTE — tokens do design system em todas as telas */
      'html[data-a11y-contrast="high"]{',
      '  --bg:#000000!important;--bg-raised:#000000!important;--bg-sunken:#000000!important;',
      '  --text:#FFFFFF!important;--text-2:#FFFFFF!important;--text-3:#EEEEEE!important;',
      '  --border:#FFFFFF!important;--border-strong:#FFFFFF!important;--border-subtle:#CCCCCC!important;',
      '  --gold:#FFFF00!important;--gold-deep:#FFFF00!important;--gold-soft:rgba(255,255,0,0.25)!important;',
      '  --void:#000!important;--ink:#000!important;--paper:#fff!important;--cream:#fff!important;',
      '  --rosa:#FFFF00!important;--stone:#DDDDDD!important;--icon:#FFFFFF!important;--danger:#FF5555!important;',
      '  --overlay:rgba(0,0,0,0.9)!important;',
      '}',
      'html[data-a11y-contrast="high"] body{background:#000!important;color:#fff!important}',
      'html[data-a11y-contrast="high"] a{color:#FFFF00!important;text-decoration:underline!important}',
      'html[data-a11y-contrast="high"] .card,.mural-composer,.post-card,nav.bottom-nav{border-color:#fff!important;background:#000!important}',
      'html[data-a11y-contrast="high"] button,.btn,.mural-aud-btn,.feed-tab,.a11y-chip{border-color:#fff!important}',
      'html[data-a11y-contrast="high"] input,html[data-a11y-contrast="high"] textarea{background:#000!important;color:#fff!important;border:2px solid #fff!important}',
      /* Filtros de cor/contraste: JS aplica combinado com !important no alvo.
         CSS abaixo é fallback quando JS ainda não rodou (só um modo por vez). */
      'html[data-a11y-color="gray"] #conteudo-principal,html[data-a11y-color="gray"] main{filter:grayscale(1)}',
      'html[data-a11y-color="protanopia"] #conteudo-principal,html[data-a11y-color="protanopia"] main{filter:url(#cricri-protanopia)}',
      'html[data-a11y-color="deuteranopia"] #conteudo-principal,html[data-a11y-color="deuteranopia"] main{filter:url(#cricri-deuteranopia)}',
      'html[data-a11y-color="tritanopia"] #conteudo-principal,html[data-a11y-color="tritanopia"] main{filter:url(#cricri-tritanopia)}',
      'html[data-a11y-contrast="soft"] #conteudo-principal,html[data-a11y-contrast="soft"] main{filter:contrast(0.88)}',
      'html[data-a11y-contrast="invert"] #conteudo-principal,html[data-a11y-contrast="invert"] main{filter:invert(1) hue-rotate(180deg)}',
      /* reforço de tokens para daltonismo (ouro legível sem depender de vermelho/verde) */
      'html[data-a11y-color="protanopia"],html[data-a11y-color="deuteranopia"]{--gold:#F0C830!important;--gold-deep:#E0B020!important;--danger:#5B9BD5!important;--rosa:#F0C830!important}',
      'html[data-a11y-color="tritanopia"]{--gold:#FF8C42!important;--gold-deep:#E07020!important;--danger:#FF6B8A!important;--rosa:#FF8C42!important}',
      'html[data-a11y-color="gray"]{--gold:#E0E0E0!important;--gold-deep:#B0B0B0!important;--rosa:#CCC!important}',
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
      '.vlibras-wrapper{z-index:2147483005!important;filter:none!important}',
      /* chrome fixo nunca recebe filtro de daltonismo */
      'nav.bottom-nav,.a11y-wrap,#cricri-install-btn,.cricri-guest-banner{filter:none!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureFilters() {
    var existing = document.getElementById('cricri-a11y-svg');
    if (existing) {
      // garante que os 3 filtros existem
      if (existing.querySelector('#cricri-protanopia') &&
          existing.querySelector('#cricri-deuteranopia') &&
          existing.querySelector('#cricri-tritanopia')) return;
      try { existing.parentNode.removeChild(existing); } catch (_) {}
    }
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'cricri-a11y-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;left:0;top:0;pointer-events:none;z-index:-1';
    // Matrizes Brettel/Viénot (simulação de daltonismo) — mais precisas
    svg.innerHTML =
      '<defs>' +
      '<filter id="cricri-protanopia" color-interpolation-filters="sRGB">' +
        '<feColorMatrix type="matrix" values="' +
          '0.152286 1.052583 -0.204868 0 0 ' +
          '0.114503 0.786281 0.099216 0 0 ' +
          '-0.003882 -0.048116 1.051998 0 0 ' +
          '0 0 0 1 0"/></filter>' +
      '<filter id="cricri-deuteranopia" color-interpolation-filters="sRGB">' +
        '<feColorMatrix type="matrix" values="' +
          '0.367322 0.860646 -0.227968 0 0 ' +
          '0.280085 0.672501 0.047413 0 0 ' +
          '-0.011820 0.042940 0.968881 0 0 ' +
          '0 0 0 1 0"/></filter>' +
      '<filter id="cricri-tritanopia" color-interpolation-filters="sRGB">' +
        '<feColorMatrix type="matrix" values="' +
          '1.255528 -0.076749 -0.178779 0 0 ' +
          '-0.078411 0.930809 0.147602 0 0 ' +
          '0.004733 0.691367 0.303900 0 0 ' +
          '0 0 0 1 0"/></filter>' +
      '</defs>';
    var host = document.body || document.documentElement;
    host.insertBefore(svg, host.firstChild);
  }

  function getFilterTargets() {
    // Nunca body/html — filter neles quebra position:fixed do bottom-nav e FAB.
    // Preferir a seção de conteúdo mais interna possível.
    var list = [];
    var seen = {};
    function add(el) {
      if (!el || el === document.body || el === document.documentElement) return;
      if (seen[el]) return;
      // não filtrar se contém a bottom-nav
      try {
        if (el.querySelector && el.querySelector('nav.bottom-nav, #bottom-nav-slot')) return;
      } catch (_) {}
      seen[el] = true;
      list.push(el);
    }
    add(document.querySelector('.feed-section'));
    add(document.querySelector('.feed-container'));
    add(document.getElementById('cricri-a11y-target'));
    add(document.getElementById('conteudo-principal'));
    add(document.querySelector('main'));
    return list;
  }

  function buildContentFilter(state) {
    var parts = [];
    var color = (state && state.color) || 'default';
    var contrast = (state && state.contrast) || 'default';
    function svgFilter(id) {
      return 'url(#' + id + ')';
    }
    if (color === 'protanopia') parts.push(svgFilter('cricri-protanopia'));
    else if (color === 'deuteranopia') parts.push(svgFilter('cricri-deuteranopia'));
    else if (color === 'tritanopia') parts.push(svgFilter('cricri-tritanopia'));
    else if (color === 'gray') parts.push('grayscale(1)');
    else if (color === 'lowsat') parts.push('saturate(0.45)');
    /* soft só no conteúdo — nunca em body (quebra fixed + tela inteira) */
    if (contrast === 'soft') parts.push('contrast(0.92) saturate(0.92)');
    else if (contrast === 'invert') {
      parts.push('invert(1)');
      parts.push('hue-rotate(180deg)');
    }
    return parts.join(' ');
  }

  function cssFallbackFilter(state) {
    var c = (state && state.color) || 'default';
    var fb = {
      protanopia: 'saturate(0.75) hue-rotate(-20deg) contrast(1.05)',
      deuteranopia: 'saturate(0.7) hue-rotate(25deg) contrast(1.05)',
      tritanopia: 'saturate(0.8) hue-rotate(-50deg) contrast(1.05)',
      gray: 'grayscale(1)',
      lowsat: 'saturate(0.45)'
    };
    var f = fb[c] || '';
    if ((state && state.contrast) === 'soft') f += ' contrast(0.92) saturate(0.92)';
    if ((state && state.contrast) === 'invert') f += ' invert(1) hue-rotate(180deg)';
    return f.trim();
  }

  function applyBodyFilter(state) {
    try {
      ensureFilters();
      var f = buildContentFilter(state);
      var targets = getFilterTargets();
      // limpa filter de body (legado)
      if (document.body) {
        document.body.style.setProperty('filter', 'none', 'important');
        document.body.style.removeProperty('filter');
      }
      if (document.documentElement) {
        document.documentElement.style.setProperty('filter', 'none', 'important');
        document.documentElement.style.removeProperty('filter');
      }
      // remove classes legadas
      try {
        document.body && document.body.classList.remove('cricri-a11y-filtered');
      } catch (_) {}

      if (targets.length) {
        targets.forEach(function (target) {
          if (f) {
            target.style.setProperty('filter', f, 'important');
            target.classList.add('cricri-a11y-filtered');
            if (state && state.color && state.color !== 'default') {
              target.setAttribute('data-color', state.color);
            } else {
              target.removeAttribute('data-color');
            }
          } else {
            target.style.removeProperty('filter');
            target.classList.remove('cricri-a11y-filtered');
            target.removeAttribute('data-color');
          }
        });
      } else {
        // página sem main: usa fallback CSS (não ideal, mas funcional)
        var f2 = cssFallbackFilter(state);
        // não aplica no body para não quebrar chrome — só data-attr no html
        if (!f2) return;
        console.info('[a11y] sem main; filtros só via CSS data-a11y-color');
      }
    } catch (e) {
      console.warn('[a11y filter]', e);
      try {
        var f3 = cssFallbackFilter(state);
        var t = document.getElementById('conteudo-principal') || document.querySelector('main');
        if (t && f3) t.style.setProperty('filter', f3, 'important');
      } catch (_) {}
    }
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
        chip('color:default', 'Normal') + chip('color:protanopia', 'Protanopia') + chip('color:deuteranopia', 'Deuteranopia') + chip('color:tritanopia', 'Tritanopia') + chip('color:lowsat', 'Baixa sat.') + chip('color:gray', 'Escala de cinza')) +
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
    } else if (!panel.querySelector('[data-a11y-set="color:protanopia"]')) {
      /* painel incompleto (feed legado sem daltonismo) — troca pelo completo */
      panel.innerHTML = panelHTML();
      panel.classList.add('a11y-panel');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-labelledby', 'a11y-panel-title');
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
    try { applyBodyFilter(state); } catch (_) {}
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
    // Reaplica filtros após layout (main pode montar tarde; SVG precisa estar no DOM)
    setTimeout(function () {
      try {
        ensureFilters();
        applyBodyFilter(load());
      } catch (_) {}
    }, 50);
    setTimeout(function () {
      try { applyBodyFilter(load()); } catch (_) {}
    }, 400);

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
