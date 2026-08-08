/**
 * CRICRI · Cri Cabrunco SVG partial
 *
 * Variantes:
 *  - avatar  (120×120)  → login, perfil, chips
 *  - birth   (120×120)  → animação de nascimento
 *
 * Uso:
 *   <div data-cri="avatar"></div>
 *   <script src="js/cri-svg.js"></script>
 *
 * Ou: window.CricriSvg.mount(el, 'avatar', { ariaHidden: true })
 */
(function () {
  'use strict';

  var COLORS = {
    ochre: '#d49a2c',
    rosa: '#e33d6b',
    rosaSoft: '#f28aa8',
    rosaDeep: '#b01f4c',
    ink: '#17120e',
    cream: '#f6efdc'
  };

  function avatarMarkup(opts) {
    opts = opts || {};
    var label = opts.label || 'Cri Cabrunco';
    var hidden = opts.ariaHidden ? ' aria-hidden="true"' : '';
    var role = opts.ariaHidden ? '' : ' role="img" aria-label="' + label + '"';
    return (
      '<svg viewBox="0 0 120 120" width="100%" height="100%"' + role + hidden + ' xmlns="http://www.w3.org/2000/svg">' +
        // orelhas-voluta
        '<path d="M28 48 C18 28 32 18 42 32 C38 40 34 46 28 48Z" fill="' + COLORS.ochre + '"/>' +
        '<path d="M92 48 C102 28 88 18 78 32 C82 40 86 46 92 48Z" fill="' + COLORS.ochre + '"/>' +
        // corpo cartaz
        '<ellipse cx="60" cy="72" rx="34" ry="30" fill="' + COLORS.rosa + '"/>' +
        '<ellipse cx="60" cy="68" rx="26" ry="22" fill="' + COLORS.rosaSoft + '"/>' +
        // olhos
        '<circle cx="48" cy="64" r="4.5" fill="' + COLORS.ink + '"/>' +
        '<circle cx="72" cy="64" r="4.5" fill="' + COLORS.ink + '"/>' +
        '<circle cx="49.5" cy="62.5" r="1.4" fill="' + COLORS.cream + '"/>' +
        '<circle cx="73.5" cy="62.5" r="1.4" fill="' + COLORS.cream + '"/>' +
        // nariz rocaille
        '<path d="M56 72 Q60 76 64 72" fill="none" stroke="' + COLORS.rosaDeep + '" stroke-width="2" stroke-linecap="round"/>' +
        // boca
        '<path d="M50 80 Q60 88 70 80" fill="none" stroke="' + COLORS.ink + '" stroke-width="2.2" stroke-linecap="round"/>' +
        // detalhe peito
        '<path d="M52 92 Q60 86 68 92" fill="none" stroke="' + COLORS.ochre + '" stroke-width="1.5" opacity="0.7"/>' +
      '</svg>'
    );
  }

  function birthMarkup() {
    return avatarMarkup({ ariaHidden: true, label: 'Cri nascendo' });
  }

  function posterMarkup() {
    return (
      '<svg viewBox="0 0 120 160" width="70%" height="70%" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="8" width="104" height="144" fill="#f6efdc" stroke="#7A2E1F" stroke-width="2"/>' +
        '<text x="60" y="40" text-anchor="middle" font-family="Inter, Impact, sans-serif" font-size="18" fill="#e33d6b">CRICRI</text>' +
        '<text x="60" y="58" text-anchor="middle" font-family="Oswald, sans-serif" font-size="8" fill="#17120e" letter-spacing="1">SÃO CRISTÓVÃO</text>' +
        '<circle cx="60" cy="100" r="28" fill="#d49a2c" opacity="0.25"/>' +
        '<path d="M45 95 Q60 75 75 95 Q60 110 45 95" fill="#e33d6b" opacity="0.5"/>' +
      '</svg>'
    );
  }

  function markup(variant, opts) {
    variant = variant || 'avatar';
    if (variant === 'birth') return birthMarkup(opts);
    if (variant === 'poster') return posterMarkup(opts);
    return avatarMarkup(opts);
  }

  function mount(el, variant, opts) {
    if (!el) return null;
    var v = variant || el.getAttribute('data-cri') || 'avatar';
    el.innerHTML = markup(v, opts);
    return el;
  }

  function mountAll(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-cri]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-cri-mounted') === '1') continue;
      mount(el, el.getAttribute('data-cri'), {
        ariaHidden: el.getAttribute('aria-hidden') === 'true'
      });
      el.setAttribute('data-cri-mounted', '1');
    }
  }

  window.CricriSvg = {
    markup: markup,
    mount: mount,
    mountAll: mountAll,
    colors: COLORS
  };

  function boot() {
    mountAll(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
