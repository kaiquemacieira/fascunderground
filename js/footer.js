/**
 * CRICRI · footer compartilhado
 * Projeto independente · AcidBurn2026 · selo digital de acessibilidade
 */
(function () {
  var OFFICIAL = 'https://mapafasc.saocristovao.se.gov.br/';
  var html =
    '<footer class="cricri-footer" role="contentinfo">' +
      '<div class="cricri-footer-inner">' +
        '<div class="cricri-footer-brand">' +
          '<span class="cricri-footer-mark">CRICRI</span>' +
          '<span class="cricri-footer-tag">projeto independente · pro povo do festival</span>' +
        '</div>' +
        '<p class="cricri-footer-text">' +
          'Espaço feito por quem vive São Cristóvão no chão, não pela prefeitura. ' +
          'Não somos o site oficial. Programação e mapa institucional usam como ' +
          '<strong>referência</strong> o portal da prefeitura.' +
        '</p>' +
        '<div class="cricri-footer-links">' +
          '<a class="cricri-footer-official" href="' + OFFICIAL + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="cricri-footer-official-label">Referência oficial</span>' +
            '<span class="cricri-footer-official-url">mapafasc.saocristovao.se.gov.br</span>' +
            '<span class="cricri-footer-official-arrow" aria-hidden="true">↗</span>' +
          '</a>' +
        '</div>' +
        '<div class="cricri-footer-dev">' +
          '<span class="cricri-footer-dev-label">Desenvolvedora &amp; idealizadora</span>' +
          '<strong class="cricri-footer-dev-name">AcidBurn2026</strong>' +
        '</div>' +
        '<div class="cricri-footer-a11y" role="note">' +
          '<span class="cricri-footer-a11y-badge" aria-hidden="true">♿</span>' +
          '<div class="cricri-footer-a11y-text">' +
            '<strong>Certificado digital de acessibilidade</strong>' +
            '<span>Contraste, texto, daltonismo, movimento, teclado, gestos e Libras (VLibras). Referência WCAG 2.2 · eMAG. Selo interno CRICRI — compromisso contínuo, não homologação governamental.</span>' +
          '</div>' +
        '</div>' +
        '<div class="cricri-footer-meta">' +
          '<span>São Cristóvão · Sergipe</span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>CRICRI 41 · 19–22/11/2026</span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>2026</span>' +
        '</div>' +
      '</div>' +
      '<div class="cricri-footer-glow" aria-hidden="true"></div>' +
    '</footer>';

  function mount() {
    var slot = document.getElementById('site-footer-slot');
    if (slot) {
      slot.innerHTML = html;
      return;
    }
    var nav = document.querySelector('.bottom-nav');
    var wrap = document.createElement('div');
    wrap.id = 'site-footer-slot';
    wrap.innerHTML = html;
    if (nav && nav.parentNode) nav.parentNode.insertBefore(wrap, nav);
    else document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
