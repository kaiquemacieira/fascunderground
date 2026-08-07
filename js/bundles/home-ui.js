/* CRICRI home-ui */

/* --- js/a11y-motion.js --- */
// FASC+ · utilitário de motion acessível (WCAG 2.3.3 / 2.2.2)
(function (global) {
  'use strict';

  var MQ = '(prefers-reduced-motion: reduce)';

  function prefersReduced() {
    try {
      if (document.documentElement.getAttribute('data-a11y-motion') === 'reduce') {
        return true;
      }
      return global.matchMedia && global.matchMedia(MQ).matches;
    } catch (_) {
      return false;
    }
  }

  /**
   * Roda animação via classe só se motion estiver permitido.
   * @param {Element} el
   * @param {string} className
   * @param {number} [durationMs]
   */
  function animateClass(el, className, durationMs) {
    if (!el || prefersReduced()) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    if (durationMs) {
      clearTimeout(el._fascMotionT);
      el._fascMotionT = setTimeout(function () {
        el.classList.remove(className);
      }, durationMs);
    }
  }

  /**
   * setInterval que não dispara callbacks visuais se reduce estiver on
   * (o tick de dados pode continuar; use runVisual=false para lógica).
   */
  function safeInterval(fn, ms) {
    return setInterval(function () {
      fn(prefersReduced());
    }, ms);
  }

  function onMotionChange(cb) {
    if (!global.matchMedia) return function () {};
    var mq = global.matchMedia(MQ);
    var handler = function () { cb(prefersReduced()); };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
    // painel a11y do FASC
    var obs = new MutationObserver(handler);
    try {
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-a11y-motion']
      });
    } catch (_) {}
    return function off() {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else if (mq.removeListener) mq.removeListener(handler);
      obs.disconnect();
    };
  }

  global.fascA11yMotion = {
    prefersReduced: prefersReduced,
    animateClass: animateClass,
    safeInterval: safeInterval,
    onMotionChange: onMotionChange
  };
})(typeof window !== 'undefined' ? window : this);

/* --- js/fasc-motion.js --- */
/**
 * FASC+ Motion — utilidades de animação inspiradas no Framer Motion
 * Vanilla JS · sem React · sem dependências
 *
 * API resumida:
 *   fascMotion.animate(el, keyframes, options)
 *   fascMotion.spring(el, to, springOpts)
 *   fascMotion.stagger(els, keyframes, options)
 *   fascMotion.inView(el, callback, options)
 *   fascMotion.sequence([...])
 *   fascMotion.variants(el, variants, state)
 *   fascMotion.reducedMotion()
 */
(function (global) {
  'use strict';

  var DEFAULT_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var SPRING_EASE = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

  function reducedMotion() {
    try {
      if (document.documentElement.getAttribute('data-a11y-motion') === 'reduce') return true;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function toArray(x) {
    if (!x) return [];
    if (typeof x === 'string') return Array.prototype.slice.call(document.querySelectorAll(x));
    if (x.length != null && !x.tagName) return Array.prototype.slice.call(x);
    return [x];
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  /** Converte objeto de estilos em string CSS de transition */
  function buildTransition(keys, duration, ease, delay) {
    duration = duration == null ? 0.32 : duration;
    ease = ease || DEFAULT_EASE;
    delay = delay || 0;
    return keys
      .map(function (k) {
        return k + ' ' + duration + 's ' + ease + (delay ? ' ' + delay + 's' : '');
      })
      .join(', ');
  }

  /**
   * animate(element|selector, keyframes, options)
   * keyframes: { opacity: 1, transform: 'translateY(0)', ... }
   * options: { duration, ease, delay, from, fill }
   */
  function animate(target, keyframes, options) {
    options = options || {};
    var els = toArray(target);
    var duration = options.duration != null ? options.duration : 0.32;
    var ease = options.ease || DEFAULT_EASE;
    var delay = options.delay || 0;
    var fill = options.fill !== false;

    if (reducedMotion()) {
      els.forEach(function (el) {
        Object.keys(keyframes).forEach(function (k) {
          el.style[k] = keyframes[k];
        });
      });
      return Promise.resolve();
    }

    var props = Object.keys(keyframes);
    var jobs = els.map(function (el, i) {
      return new Promise(function (resolve) {
        var d = delay + (options.stagger ? options.stagger * i : 0);
        if (options.from) {
          Object.keys(options.from).forEach(function (k) {
            el.style[k] = options.from[k];
          });
          // force reflow
          void el.offsetWidth;
        }
        el.style.transition = buildTransition(props, duration, ease, d);
        // double rAF to ensure from-state paints
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            props.forEach(function (k) {
              el.style[k] = keyframes[k];
            });
          });
        });
        var ms = (duration + d) * 1000 + 30;
        var done = function () {
          el.removeEventListener('transitionend', onEnd);
          if (!fill) {
            el.style.transition = '';
          }
          resolve(el);
        };
        var onEnd = function (e) {
          if (e.target !== el) return;
          if (props.indexOf(e.propertyName) === -1 && props.indexOf(camelToKebab(e.propertyName)) === -1) return;
          done();
        };
        el.addEventListener('transitionend', onEnd);
        setTimeout(done, ms);
      });
    });

    return Promise.all(jobs);
  }

  function camelToKebab(s) {
    return String(s).replace(/[A-Z]/g, function (m) {
      return '-' + m.toLowerCase();
    });
  }

  /**
   * spring(el, to, { stiffness-like via duration/bounce })
   */
  function spring(target, keyframes, options) {
    options = options || {};
    return animate(target, keyframes, {
      duration: options.duration != null ? options.duration : 0.55,
      ease: options.ease || SPRING_EASE,
      delay: options.delay || 0,
      from: options.from,
      stagger: options.stagger,
      fill: options.fill
    });
  }

  /**
   * stagger(elements, keyframes, { stagger: 0.05, ...animateOpts })
   */
  function stagger(targets, keyframes, options) {
    options = options || {};
    return animate(targets, keyframes, Object.assign({}, options, {
      stagger: options.stagger != null ? options.stagger : 0.05
    }));
  }

  /**
   * inView(el, onEnter, { rootMargin, once, onLeave })
   */
  function inView(target, onEnter, options) {
    options = options || {};
    var els = toArray(target);
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        if (onEnter) onEnter(el);
      });
      return function () {};
    }
    var once = options.once !== false;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (onEnter) onEnter(entry.target, entry);
            if (once) observer.unobserve(entry.target);
          } else if (options.onLeave) {
            options.onLeave(entry.target, entry);
          }
        });
      },
      {
        root: options.root || null,
        rootMargin: options.rootMargin || '0px 0px -8% 0px',
        threshold: options.threshold != null ? options.threshold : 0.12
      }
    );
    els.forEach(function (el) {
      observer.observe(el);
    });
    return function stop() {
      observer.disconnect();
    };
  }

  /**
   * sequence([ () => animate(...), () => animate(...) ])
   */
  function sequence(steps) {
    return steps.reduce(function (chain, step) {
      return chain.then(function () {
        return typeof step === 'function' ? step() : step;
      });
    }, Promise.resolve());
  }

  /**
   * variants(el, { hidden: {...}, visible: {...} }, stateName, options)
   */
  function variants(target, map, state, options) {
    options = options || {};
    var kf = map[state];
    if (!kf) return Promise.resolve();
    var fromState = options.from;
    var from = fromState && map[fromState] ? map[fromState] : options.fromStyles;
    return animate(target, kf, {
      duration: options.duration,
      ease: options.ease,
      delay: options.delay,
      stagger: options.stagger,
      from: from,
      fill: options.fill
    });
  }

  /** Presets alinhados à identidade FASC+ */
  var presets = {
    fadeUp: {
      from: { opacity: '0', transform: 'translateY(16px)' },
      to: { opacity: '1', transform: 'translateY(0)' }
    },
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' }
    },
    scaleIn: {
      from: { opacity: '0', transform: 'scale(0.94)' },
      to: { opacity: '1', transform: 'scale(1)' }
    },
    press: {
      from: { transform: 'scale(1)' },
      to: { transform: 'scale(0.97)' }
    },
    cardEnter: {
      from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
      to: { opacity: '1', transform: 'translateY(0) scale(1)' }
    }
  };

  function preset(name, target, options) {
    var p = presets[name];
    if (!p) return Promise.resolve();
    return animate(target, p.to, Object.assign({ from: p.from }, options || {}));
  }

  /** Anima entrada de página em seções marcadas [data-motion="enter"] */
  function autoEnter(selector) {
    selector = selector || '[data-motion="enter"]';
    var els = toArray(selector);
    if (!els.length) return function () {};
    return inView(
      els,
      function (el) {
        var type = el.getAttribute('data-motion-type') || 'fadeUp';
        var delay = parseFloat(el.getAttribute('data-motion-delay') || '0') || 0;
        preset(type, el, { duration: 0.42, delay: delay, ease: DEFAULT_EASE });
      },
      { once: true, rootMargin: '0px 0px -6% 0px' }
    );
  }

  var api = {
    animate: animate,
    spring: spring,
    stagger: stagger,
    inView: inView,
    sequence: sequence,
    variants: variants,
    preset: preset,
    presets: presets,
    autoEnter: autoEnter,
    reducedMotion: reducedMotion,
    ease: {
      outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      outQuart: DEFAULT_EASE,
      spring: SPRING_EASE,
      press: 'cubic-bezier(0.2, 0, 0, 1)',
      soft: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  };

  global.fascMotion = api;

  // auto-boot opcional
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.body && document.body.hasAttribute('data-motion-auto')) {
        api.autoEnter();
      }
    });
  } else if (document.body && document.body.hasAttribute('data-motion-auto')) {
    api.autoEnter();
  }
})(typeof window !== 'undefined' ? window : this);

/* --- js/a11y-core.js --- */
/**
 * CRICRI · Acessibilidade global (LEGADO no bundle)
 * Se a11y-core.js v2 já carregou, este bloco NÃO roda
 * (evita filter no body e painel incompleto).
 */
(function (global) {
  'use strict';
  if (global.__CRICRI_A11Y_V2) {
    console.info('[CRICRI a11y] home-ui: legado ignorado (v2 ativo)');
    return;
  }

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
      var raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY);
      if (!raw) return Object.assign({}, defaults);
      var o = JSON.parse(raw);
      return Object.assign({}, defaults, o);
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
      '.a11y-wrap{position:fixed;top:calc(3.6rem + env(safe-area-inset-top,0px));right:max(0.65rem,env(safe-area-inset-right));z-index:99990;display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;pointer-events:none}',
      '.a11y-toggle{pointer-events:auto;width:52px!important;height:52px!important;min-width:52px!important;min-height:52px!important;border-radius:50%;border:2px solid rgba(227,61,107,0.55);background:#1a1512;color:#ebe3cf;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;box-shadow:0 4px 18px rgba(0,0,0,0.45),0 0 16px rgba(227,61,107,0.25)}',
      '.a11y-toggle:hover,.a11y-toggle[aria-expanded="true"]{border-color:#e33d6b;background:#2a221c}',
      '.a11y-toggle:focus-visible{outline:3px solid #e33d6b;outline-offset:3px}',
      '.a11y-toggle svg{width:22px;height:22px}',
      '.a11y-panel{pointer-events:auto;position:absolute;top:0;right:0;width:min(320px,calc(100vw - 1.25rem));max-height:min(65vh,calc(100dvh - 5.5rem - env(safe-area-inset-bottom,0px)));overflow:auto;-webkit-overflow-scrolling:touch;background:#1c1511;color:#ebe3cf;border:2px solid rgba(227,61,107,0.4);border-radius:12px;padding:0.9rem 0.85rem 1rem;box-shadow:0 16px 40px rgba(0,0,0,0.5);z-index:99991}',
      '.a11y-panel[hidden]{display:none!important}',
      '.a11y-panel h2{margin:0 0 0.75rem;font-family:Oswald,system-ui,sans-serif;font-size:0.95rem;letter-spacing:0.1em;text-transform:uppercase}',
      '.a11y-group{margin-bottom:0.75rem;padding-bottom:0.65rem;border-bottom:1px solid rgba(230,220,196,0.1)}',
      '.a11y-group-label{display:block;font-family:Oswald,system-ui,sans-serif;font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:#c4b9a6;margin-bottom:0.4rem}',
      '.a11y-row{display:flex;flex-wrap:wrap;gap:0.35rem}',
      '.a11y-chip{appearance:none;border:1.5px solid rgba(230,220,196,0.22);background:rgba(42,37,32,0.6);color:#ebe3cf;font-family:Oswald,system-ui,sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:0.5rem 0.65rem;min-height:40px;border-radius:999px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
      '.a11y-chip[aria-pressed="true"]{border-color:#e33d6b;background:rgba(227,61,107,0.2);color:#fff}',
      '.a11y-reset{width:100%;margin-top:0.35rem;appearance:none;border:1.5px solid rgba(230,220,196,0.25);background:transparent;color:#ebe3cf;font-family:Oswald,system-ui,sans-serif;font-weight:600;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;padding:0.55rem;border-radius:8px;cursor:pointer}',
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
      'html[data-a11y-reading="focus"] :focus-visible{outline:3px solid #e33d6b!important;outline-offset:3px!important}',
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
      '<p class="a11y-note">Libras: use o ícone azul do VLibras. Preferências salvas neste aparelho.</p>'
    );
  }

  function ensureUI() {
    var wrap = document.querySelector('.a11y-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'a11y-wrap';
      document.body.appendChild(wrap);
    }
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
      toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><path d="M12 8.5v3.5"/><path d="M8 22l4-10 4 10"/><path d="M6.5 13.5h11"/></svg>';
      wrap.appendChild(toggle);
    }
    var panel = document.getElementById('a11y-panel');
    var drawer = document.getElementById('a11y-drawer');
    // perfil usa #a11y-drawer — unifica como painel controlado
    if (!panel && drawer) {
      panel = drawer;
      panel.classList.add('a11y-panel');
      if (!panel.id) panel.id = 'a11y-panel';
      toggle.setAttribute('aria-controls', panel.id);
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
    // toggle pode ficar no header — não mover
    toggle.style.pointerEvents = 'auto';
    toggle.style.cursor = 'pointer';
    if (!toggle.getAttribute('type')) toggle.setAttribute('type', 'button');
    wrap.style.zIndex = '99990';
    wrap.style.pointerEvents = 'none';
    panel.style.pointerEvents = 'auto';
    return { wrap: wrap, toggle: toggle, panel: panel };
  }

  function apply(state) {
    var root = document.documentElement;
    Object.keys(defaults).forEach(function (k) {
      var v = state[k] || defaults[k];
      if (k === 'theme') {
        if (v === 'light') {
          root.setAttribute('data-theme', 'light');
          root.setAttribute('data-a11y-theme', 'light');
        } else {
          root.setAttribute('data-theme', 'dark');
          root.setAttribute('data-a11y-theme', 'dark');
        }
        return;
      }
      if (v === 'default' || v === 'md') root.removeAttribute('data-a11y-' + k);
      else root.setAttribute('data-a11y-' + k, v);
    });
    var panel = document.getElementById('a11y-panel');
    if (panel) {
      panel.querySelectorAll('[data-a11y-set]').forEach(function (btn) {
        var raw = btn.getAttribute('data-a11y-set') || '';
        var parts = raw.split(':');
        var key = parts[0], val = parts[1];
        var current = state[key] || defaults[key];
        btn.setAttribute('aria-pressed', current === val ? 'true' : 'false');
      });
    }
    try {
      global.dispatchEvent(new CustomEvent('cricri:a11y', { detail: state }));
    } catch (_) {}
  }

  function openPanel(toggle, panel) {
    panel.hidden = false;
    panel.removeAttribute('hidden');
    panel.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
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
    // Core v2 já no index.html — não rewire (quebra toque no mobile)
    if (typeof global !== 'undefined' && global.__CRICRI_A11Y_V2) return;
    if (typeof window !== 'undefined' && window.__CRICRI_A11Y_V2) return;
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

    if (ui.panel.dataset.cricriA11y === '1') return;
    ui.panel.dataset.cricriA11y = '1';

    var ignoreUntil = 0;
    function onToggle(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!ui.panel.hidden && ui.panel.classList.contains('is-open')) {
        closePanel(ui.toggle, ui.panel);
      } else if (!ui.panel.hidden && !ui.panel.hasAttribute('hidden')) {
        // some browsers
        if (ui.toggle.getAttribute('aria-expanded') === 'true') closePanel(ui.toggle, ui.panel);
        else {
          openPanel(ui.toggle, ui.panel);
          ignoreUntil = Date.now() + 450;
        }
      } else {
        openPanel(ui.toggle, ui.panel);
        ignoreUntil = Date.now() + 450;
      }
    }

    // só click (evita open+close no mobile por touchend+click)
    var lastToggleAt = 0;
    if (ui.toggle.dataset.a11yHomeWired === '1') {
      // Home já ligou o toggle — core só aplica estado/chips
      global.CricriA11y = global.CricriA11y || {
        get: load, set: function (partial) {
          state = Object.assign({}, load(), partial || {});
          apply(state); save(state);
        },
        reset: function () {
          state = Object.assign({}, defaults);
          apply(state); save(state);
        }
      };
      wireVLibras();
      return;
    }

    ui.toggle.addEventListener('click', function (e) {
      if (Date.now() - lastToggleAt < 280) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lastToggleAt = Date.now();
      onToggle(e);
    }, true);

    ui.panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var reset = e.target.closest('[data-a11y-reset]');
      if (reset) {
        state = Object.assign({}, defaults);
        apply(state);
        save(state);
        return;
      }
      var chip = e.target.closest('[data-a11y-set], .chip[data-k]');
      if (!chip) return;
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
      state[key] = val;
      apply(state);
      save(state);
      // sync profile-style chips
      ui.panel.querySelectorAll('.chip[data-k="' + key + '"]').forEach(function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-v') === val ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (Date.now() < ignoreUntil) return;
      if (ui.toggle.getAttribute('aria-expanded') !== 'true') return;
      if (ui.panel.contains(e.target) || ui.toggle.contains(e.target)) return;
      closePanel(ui.toggle, ui.panel);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.toggle.getAttribute('aria-expanded') === 'true') {
        closePanel(ui.toggle, ui.panel);
        ui.toggle.focus();
      }
    });

    wireVLibras();

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
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* --- js/keyboard-nav.js --- */
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

/* --- js/touch-gestures.js --- */
/**
 * CRICRI · Gestos touch
 * - Swipe horizontal em tabs (feed / market / programação)
 * - Swipe para fechar painéis (a11y, busca, menu)
 * - Edge swipe (borda esquerda) → menu
 * - Pull-to-refresh suave no mural
 * Respeita data-a11y-motion="reduce" e prefers-reduced-motion
 */
(function (global) {
  'use strict';

  var THRESH_X = 56;
  var THRESH_Y = 64;
  var EDGE = 28;
  var MAX_PULL = 96;

  function reducedMotion() {
    return (
      document.documentElement.getAttribute('data-a11y-motion') === 'reduce' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function isInteractive(el) {
    if (!el || el === document.body) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a' || tag === 'label') {
      return true;
    }
    if (el.isContentEditable) return true;
    if (el.closest('input, textarea, select, button, a, [role="slider"], .leaflet-container')) return true;
    return false;
  }

  function track(el, handlers) {
    if (!el || el.dataset.touchBound === '1') return;
    el.dataset.touchBound = '1';

    var startX = 0, startY = 0, startT = 0;
    var lastX = 0, lastY = 0;
    var active = false;
    var pid = null;

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // só touch / pen para gestos de swipe (evita atrapalhar desktop)
      if (e.pointerType === 'mouse' && !handlers.allowMouse) return;
      if (handlers.ignoreInteractive && isInteractive(e.target)) return;
      active = true;
      pid = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      startT = Date.now();
      if (handlers.onStart) handlers.onStart({ x: startX, y: startY, event: e });
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onMove(e) {
      if (!active || (pid != null && e.pointerId !== pid)) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (handlers.onMove) {
        handlers.onMove({
          x: lastX,
          y: lastY,
          dx: lastX - startX,
          dy: lastY - startY,
          event: e
        });
      }
    }

    function onUp(e) {
      if (!active || (pid != null && e.pointerId !== pid)) return;
      active = false;
      var dx = (e.clientX || lastX) - startX;
      var dy = (e.clientY || lastY) - startY;
      var dt = Date.now() - startT;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);
      var dir = null;
      if (absX > THRESH_X && absX > absY * 1.15) dir = dx > 0 ? 'right' : 'left';
      else if (absY > THRESH_Y && absY > absX * 1.15) dir = dy > 0 ? 'down' : 'up';
      if (handlers.onEnd) {
        handlers.onEnd({
          dx: dx,
          dy: dy,
          dt: dt,
          dir: dir,
          edgeLeft: startX <= EDGE,
          edgeRight: startX >= window.innerWidth - EDGE,
          event: e
        });
      }
      pid = null;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onUp, { passive: true });
  }

  /* ---- tabs: swipe left/right ---- */
  function wireTabSwipe(containerSel, tabSel) {
    var root = document.querySelector(containerSel);
    if (!root) return;
    var tablist = root.querySelector('[role="tablist"], .feed-tabs, .market-tabs, .prog-tabs') || root;
    track(root, {
      ignoreInteractive: false,
      onEnd: function (g) {
        if (!g.dir || (g.dir !== 'left' && g.dir !== 'right')) return;
        if (Math.abs(g.dy) > 80) return;
        var tabs = Array.prototype.slice.call(
          (tablist || root).querySelectorAll(tabSel)
        ).filter(function (t) {
          return !t.disabled && t.offsetParent !== null;
        });
        if (tabs.length < 2) return;
        var i = tabs.findIndex(function (t) {
          return (
            t.getAttribute('aria-selected') === 'true' ||
            t.classList.contains('active') ||
            t.classList.contains('is-on')
          );
        });
        if (i < 0) i = 0;
        var next = g.dir === 'left' ? i + 1 : i - 1;
        if (next < 0 || next >= tabs.length) return;
        tabs[next].click();
        if (window.CricriKeyboard && window.CricriKeyboard.refresh) {
          try { window.CricriKeyboard.refresh(); } catch (_) {}
        }
      }
    });
  }

  /* ---- fechar painéis com swipe ---- */
  function closeA11y() {
    var toggle = document.getElementById('a11y-toggle');
    var panel = document.getElementById('a11y-panel');
    if (!panel || !toggle) return;
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    panel.hidden = true;
    panel.setAttribute('hidden', '');
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    var btn = document.getElementById('search-cancel') || document.getElementById('search-close');
    if (btn) btn.click();
    else {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function closeMenu() {
    var toggle = document.getElementById('menu-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') toggle.click();
  }

  function openMenu() {
    var toggle = document.getElementById('menu-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
  }

  function wirePanelSwipes() {
    var a11y = document.getElementById('a11y-panel');
    if (a11y) {
      track(a11y, {
        onEnd: function (g) {
          if (g.dir === 'down' || g.dir === 'right') closeA11y();
        }
      });
    }
    var search = document.getElementById('search-overlay');
    if (search) {
      track(search, {
        onEnd: function (g) {
          if (g.dir === 'down') closeSearch();
        }
      });
    }
    var menu = document.getElementById('mobile-menu');
    if (menu) {
      track(menu, {
        onEnd: function (g) {
          if (g.dir === 'left') closeMenu();
        }
      });
    }
  }

  /* ---- edge swipe global ---- */
  function wireEdgeSwipe() {
    track(document.body, {
      ignoreInteractive: true,
      onEnd: function (g) {
        if (!g.dir) return;
        if (g.edgeLeft && g.dir === 'right') {
          openMenu();
          return;
        }
        // swipe right anywhere when menu open closes? handled in menu
        if (g.dir === 'down' && g.dy > 120 && window.scrollY < 40) {
          // possible pull — handled by pull module
        }
      }
    });
  }

  /* ---- pull to refresh no feed ---- */
  function wirePullToRefresh() {
    var feed = document.getElementById('feed') || document.querySelector('.feed-section');
    if (!feed) return;

    var indicator = document.getElementById('cricri-pull-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'cricri-pull-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.innerHTML = '<span>solte para atualizar</span>';
      document.body.appendChild(indicator);
    }

    var pulling = false;
    var startY = 0;

    track(feed, {
      ignoreInteractive: true,
      onStart: function (s) {
        pulling = window.scrollY <= 2;
        startY = s.y;
      },
      onMove: function (m) {
        if (!pulling || reducedMotion()) return;
        if (window.scrollY > 2) {
          pulling = false;
          indicator.classList.remove('is-visible', 'is-ready');
          return;
        }
        if (m.dy > 12 && m.dy > Math.abs(m.dx)) {
          var p = Math.min(1, m.dy / MAX_PULL);
          indicator.classList.add('is-visible');
          indicator.classList.toggle('is-ready', p >= 1);
          indicator.style.transform = 'translate(-50%, ' + Math.min(m.dy * 0.35, 48) + 'px)';
          indicator.querySelector('span').textContent = p >= 1 ? 'solte para atualizar' : 'puxe para atualizar';
        }
      },
      onEnd: function (g) {
        if (!pulling) {
          indicator.classList.remove('is-visible', 'is-ready');
          return;
        }
        pulling = false;
        var should = g.dy >= MAX_PULL && g.dir === 'down' && window.scrollY <= 4;
        indicator.classList.remove('is-visible', 'is-ready');
        indicator.style.transform = '';
        if (!should) return;
        indicator.classList.add('is-refreshing');
        indicator.querySelector('span').textContent = 'atualizando…';
        indicator.classList.add('is-visible');
        // dispara refresh custom / reload suave do mural
        try {
          document.dispatchEvent(new CustomEvent('cricri:pull-refresh'));
        } catch (_) {}
        // se existir função global de feed
        if (typeof global.cricriRefreshFeed === 'function') {
          Promise.resolve(global.cricriRefreshFeed()).finally(done);
        } else {
          setTimeout(done, 700);
        }
        function done() {
          indicator.classList.remove('is-visible', 'is-refreshing');
          indicator.querySelector('span').textContent = 'puxe para atualizar';
        }
      }
    });
  }

  function injectCSS() {
    if (document.getElementById('cricri-touch-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-touch-css';
    s.textContent = [
      '#cricri-pull-indicator{position:fixed;top:0;left:50%;transform:translate(-50%,-120%);z-index:99970;padding:0.45rem 0.9rem;border-radius:999px;background:rgba(28,21,17,0.92);border:1.5px solid rgba(227,61,107,0.45);color:#ebe3cf;font-family:Oswald,system-ui,sans-serif;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
      '#cricri-pull-indicator.is-visible{opacity:1}',
      '#cricri-pull-indicator.is-ready{border-color:#e33d6b;box-shadow:0 0 16px rgba(227,61,107,.35)}',
      '#cricri-pull-indicator.is-refreshing{opacity:1;transform:translate(-50%,12px)!important}',
      'html[data-a11y-motion="reduce"] #cricri-pull-indicator{transition:none}',
      /* feedback leve em chips ao swipe de tabs */
      '.feed-tabs,.market-tabs,.prog-tabs{-webkit-user-select:none;user-select:none;touch-action:pan-y}',
      '.feed-section,.market-section,.prog-wrap{touch-action:pan-y}'
    ].join('');
    document.head.appendChild(s);
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    // só relevante em ponteiro fino/grosso touch
    if (!window.matchMedia('(pointer: coarse), (hover: none)').matches && !('ontouchstart' in window)) {
      // ainda registra edge mínimo? skip heavy — mas pull pode ser útil em trackpad; keep edge off
    }

    injectCSS();
    wireTabSwipe('.feed-section', '.feed-tab, [role="tab"]');
    wireTabSwipe('.market-section', '.market-tab, [role="tab"]');
    wireTabSwipe('.prog-wrap', '.prog-tab');
    wirePanelSwipes();
    wireEdgeSwipe();
    wirePullToRefresh();

    // rebind se a11y panel for recriado
    setTimeout(wirePanelSwipes, 1200);

    global.CricriTouch = {
      closeA11y: closeA11y,
      closeSearch: closeSearch,
      closeMenu: closeMenu
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* --- js/push.js --- */
// FASC+ — Web Push (permissão, subscribe, salva no Supabase)
(function () {
  'use strict';

  var SW_PATH = './sw.js';
  var TABLE = 'push_subscriptions';

  function $(id) {
    return document.getElementById(id);
  }

  function setMsg(text, ok) {
    var el = $('push-msg');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
    el.classList.toggle('err', !!(text && !ok));
  }

  function supported() {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  function vapidPublicKey() {
    if (window.FASC_VAPID_PUBLIC_KEY) return String(window.FASC_VAPID_PUBLIC_KEY).trim();
    if (window.FASC_CONFIG && window.FASC_CONFIG.vapidPublicKey) {
      return String(window.FASC_CONFIG.vapidPublicKey).trim();
    }
    return '';
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function ensureSW() {
    var reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    reg = await navigator.serviceWorker.register(SW_PATH, { scope: './' });
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function currentSubscription() {
    if (!supported()) return null;
    try {
      var reg = await ensureSW();
      return await reg.pushManager.getSubscription();
    } catch (e) {
      console.warn('[FASC push] getSubscription', e.message || e);
      return null;
    }
  }

  async function saveSubscription(sub) {
    if (!window.fascDb || !window.fascAuth) {
      throw new Error('Supabase não está pronto.');
    }
    var user = await window.fascAuth.user();
    if (!user) throw new Error('Entre na conta para ativar notificações.');

    var json = sub.toJSON();
    var keys = json.keys || {};
    if (!json.endpoint || !keys.p256dh || !keys.auth) {
      throw new Error('Subscription incompleta do browser.');
    }

    var payload = {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: (navigator.userAgent || '').slice(0, 300)
    };

    var res = await window.fascDb
      .from(TABLE)
      .upsert(payload, { onConflict: 'endpoint' })
      .select('id')
      .single();

    if (res.error) throw res.error;
    return res.data;
  }

  async function removeSubscriptionLocalAndRemote() {
    var sub = await currentSubscription();
    if (sub) {
      try {
        if (window.fascDb && window.fascAuth) {
          var user = await window.fascAuth.user();
          if (user) {
            await window.fascDb
              .from(TABLE)
              .delete()
              .eq('user_id', user.id)
              .eq('endpoint', sub.endpoint);
          }
        }
      } catch (e) {
        console.warn('[FASC push] delete remote', e.message || e);
      }
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn('[FASC push] unsubscribe', e.message || e);
      }
    }
  }

  async function enable() {
    if (!supported()) {
      throw new Error('Este navegador não suporta Web Push.');
    }
    if (!window.isSecureContext) {
      throw new Error('Push exige HTTPS (ou localhost). Não use file://.');
    }
    var key = vapidPublicKey();
    if (!key) {
      throw new Error('Falta a chave pública VAPID (window.FASC_VAPID_PUBLIC_KEY).');
    }

    var permission = Notification.permission;
    if (permission === 'denied') {
      throw new Error('Notificações bloqueadas no navegador. Libere nas configurações do site.');
    }
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada.');
      }
    }

    var reg = await ensureSW();
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }

    await saveSubscription(sub);
    return sub;
  }

  async function disable() {
    await removeSubscriptionLocalAndRemote();
  }

  async function refreshUI() {
    var card = $('push-card');
    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');
    var status = $('push-status');

    if (!card) return;

    var user = window.fascAuth ? await window.fascAuth.user() : null;
    if (!user) {
      card.hidden = true;
      return;
    }
    card.hidden = false;

    if (!supported()) {
      if (status) status.textContent = 'Navegador sem suporte a push.';
      if (btnOn) btnOn.disabled = true;
      if (btnOff) btnOff.disabled = true;
      return;
    }

    var sub = await currentSubscription();
    var on = !!sub;
    if (status) {
      status.textContent = on
        ? 'Notificações ativas neste aparelho.'
        : (Notification.permission === 'denied'
          ? 'Bloqueadas pelo navegador.'
          : 'Desativadas neste aparelho.');
    }
    if (btnOn) {
      btnOn.hidden = on;
      btnOn.disabled = false;
    }
    if (btnOff) {
      btnOff.hidden = !on;
      btnOff.disabled = false;
    }
  }

  function wireButtons() {
    var btnOn = $('btn-push-enable');
    var btnOff = $('btn-push-disable');
    if (btnOn && btnOn.dataset.bound !== '1') {
      btnOn.dataset.bound = '1';
      btnOn.addEventListener('click', async function () {
        btnOn.disabled = true;
        setMsg('Ativando…', true);
        try {
          await enable();
          setMsg('Notificações ativadas.', true);
          await refreshUI();
        } catch (err) {
          setMsg(err.message || 'Falha ao ativar', false);
          btnOn.disabled = false;
        }
      });
    }
    if (btnOff && btnOff.dataset.bound !== '1') {
      btnOff.dataset.bound = '1';
      btnOff.addEventListener('click', async function () {
        btnOff.disabled = true;
        setMsg('Desativando…', true);
        try {
          await disable();
          setMsg('Notificações desativadas.', true);
          await refreshUI();
        } catch (err) {
          setMsg(err.message || 'Falha ao desativar', false);
          btnOff.disabled = false;
        }
      });
    }
  }

  async function boot() {
    if (!supported()) {
      console.info('[FASC push] sem suporte neste browser');
      return;
    }
    wireButtons();
    try {
      // Registra SW cedo (mesmo sem ativar push)
      await ensureSW();
    } catch (e) {
      console.warn('[FASC push] SW', e.message || e);
    }
    try {
      await refreshUI();
    } catch (e) {
      console.warn('[FASC push] UI', e.message || e);
    }

    if (window.fascAuth && window.fascAuth.onChange) {
      window.fascAuth.onChange(function () {
        refreshUI().catch(function () {});
      });
    }
    console.info('[FASC push] pronto');
  }

  window.fascPush = {
    enable: enable,
    disable: disable,
    currentSubscription: currentSubscription,
    refreshUI: refreshUI,
    supported: supported,
    boot: boot
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot().catch(function (e) { console.warn('[FASC push]', e); });
    });
  } else {
    boot().catch(function (e) { console.warn('[FASC push]', e); });
  }
})();

/* --- js/periodic-sync.js --- */
/**
 * CRICRI · Periodic Background Sync
 * Registra tags no SW e reage a ticks em segundo plano.
 * Fallback: interval enquanto a página está aberta.
 *
 * Tags:
 *  - cricri-tick     (15 min)  tamagotchi + presença
 *  - cricri-data     (30 min)  feed / programação cache
 */
(function (global) {
  'use strict';

  var TAGS = {
    tick: { tag: 'cricri-tick', minInterval: 15 * 60 * 1000 },
    data: { tag: 'cricri-data', minInterval: 30 * 60 * 1000 }
  };

  var fallbackTimers = {};
  var status = {
    supported: false,
    permission: 'unknown',
    registered: {},
    lastTick: null,
    lastData: null
  };

  function log() {
    if (global.CRICRI_DEBUG) console.info.apply(console, ['[periodicSync]'].concat([].slice.call(arguments)));
  }

  function fail(message, extra) {
    extra = extra || {};
    if (typeof global.__cricriSyncFail === 'function') {
      return global.__cricriSyncFail(message, Object.assign({ source: 'periodic-sync' }, extra));
    }
    console.warn('[periodicSync fail]', message, extra);
    return null;
  }

  async function getReg() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      if (reg) return reg;
      return await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch (e) {
      console.warn('[periodicSync] SW', e);
      fail(e && e.message || 'Falha ao obter Service Worker', { phase: 'getReg', tag: null });
      return null;
    }
  }

  async function ensurePermission() {
    // Periodic Sync não tem PermissionName padrão em todos browsers;
    // Chrome usa registration + engajamento. Tentamos permissions.query quando existir.
    try {
      if (navigator.permissions && navigator.permissions.query) {
        var r = await navigator.permissions.query({ name: 'periodic-background-sync' });
        status.permission = r.state || 'unknown';
        return r.state === 'granted' || r.state === 'prompt';
      }
    } catch (_) {
      /* Firefox/Safari: API ausente */
    }
    status.permission = 'unsupported-query';
    return true; // tenta registrar mesmo assim
  }

  async function registerTag(key) {
    var conf = TAGS[key];
    if (!conf) return false;
    var reg = await getReg();
    if (!reg) return false;

    status.supported = !!(reg.periodicSync);
    if (!reg.periodicSync) {
      fail('periodicSync API ausente — usando fallback', {
        phase: 'register', tag: conf.tag, code: 'NO_PERIODIC_SYNC'
      });
      startFallback(key, conf.minInterval);
      return false;
    }

    try {
      var okPerm = await ensurePermission();
      if (!okPerm && status.permission === 'denied') {
        fail('Permissão periodic-background-sync negada', {
          phase: 'permission', tag: conf.tag, code: 'DENIED'
        });
        startFallback(key, conf.minInterval);
        return false;
      }
      // evita re-registro desnecessário
      var tags = [];
      try { tags = await reg.periodicSync.getTags(); } catch (_) {}
      if (tags.indexOf(conf.tag) === -1) {
        await reg.periodicSync.register(conf.tag, { minInterval: conf.minInterval });
      }
      status.registered[conf.tag] = true;
      log('registered', conf.tag);
      return true;
    } catch (e) {
      console.info('[periodicSync] register fail', conf.tag, e && e.message);
      fail(e && e.message || 'Falha ao registrar tag', {
        phase: 'register', tag: conf.tag, code: 'REGISTER_FAIL'
      });
      startFallback(key, conf.minInterval);
      return false;
    }
  }

  function startFallback(key, ms) {
    if (fallbackTimers[key]) return;
    log('fallback interval', key, ms);
    fallbackTimers[key] = global.setInterval(function () {
      if (document.visibilityState === 'hidden') return;
      runHandlers(key === 'tick' ? 'cricri-tick' : 'cricri-data', 'fallback');
    }, ms);
  }

  function runHandlers(tag, source) {
    var detail = { tag: tag, source: source || 'sw', at: Date.now() };
    if (tag === 'cricri-tick') status.lastTick = detail.at;
    if (tag === 'cricri-data') status.lastData = detail.at;
    status.lastOk = detail.at;
    status.lastSource = source || 'sw';

    try {
      global.dispatchEvent(new CustomEvent('cricri:periodic-sync', { detail: detail }));
    } catch (e) {
      fail(e && e.message || 'evento periodic-sync', { phase: 'emit', tag: tag });
    }

    function safe(name, fn) {
      try { fn(); }
      catch (e) {
        fail(e && e.message || ('falha em ' + name), {
          phase: 'handler', tag: tag, meta: { handler: name }
        });
      }
    }

    safe('tama', function () {
      if (typeof global.__tamaForceTick === 'function') global.__tamaForceTick();
    });
    safe('presence', function () {
      if (typeof global.__cricriPresenceBeat === 'function') global.__cricriPresenceBeat();
    });
    safe('feed', function () {
      if (tag === 'cricri-data' && typeof global.cricriRefreshFeed === 'function') {
        global.cricriRefreshFeed();
      }
    });
    safe('programacao', function () {
      if (tag === 'cricri-data' && typeof global.cricriRefreshProgramacao === 'function') {
        global.cricriRefreshProgramacao();
      }
    });
  }

  function wireMessages() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data) return;
      if (ev.data.type === 'CRICRI_PERIODIC_SYNC') {
        runHandlers(ev.data.tag || 'cricri-tick', 'sw-message');
      }
      if (ev.data.type === 'CRICRI_TAMA_TICK' || ev.data.type === 'CRICRI_BG_SYNC') {
        runHandlers('cricri-tick', 'sw-message');
      }
    });
  }

  async function init() {
    wireMessages();
    await registerTag('tick');
    await registerTag('data');

    // também one-off Background Sync (quando volta a rede)
    try {
      var reg = await getReg();
      if (reg && reg.sync) {
        await reg.sync.register('cricri-sync').catch(function () {});
      }
    } catch (_) {}

    global.CricriPeriodicSync = {
      status: function () {
        var mon = global.CricriSyncMonitor ? global.CricriSyncMonitor.summary() : null;
        return Object.assign({}, status, {
          registered: Object.assign({}, status.registered),
          failures: mon
        });
      },
      register: registerTag,
      runNow: function (tag) { runHandlers(tag || 'cricri-tick', 'manual'); },
      failures: function () {
        return global.CricriSyncMonitor ? global.CricriSyncMonitor.list() : [];
      }
    };

    log('ready', status);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
