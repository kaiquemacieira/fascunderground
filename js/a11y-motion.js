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
