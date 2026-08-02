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
