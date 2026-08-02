/**
 * CRICRI · footer compartilhado (visual + markup)
 * DDD 079 · AcidBurn2026 · selo a11y
 */
(function () {
  var OFFICIAL = 'https://mapafasc.saocristovao.se.gov.br/';

  var css = [
    '.cricri-footer{position:relative;isolation:isolate;margin:0;padding:2.5rem 1.25rem 7rem;',
    'background:linear-gradient(180deg,#0a0908 0%,#14100e 100%);border-top:1px solid rgba(230,220,196,.1);',
    'color:#c4b9a6;font-family:Inter,system-ui,sans-serif;overflow:hidden}',
    '.cricri-footer-inner{max-width:36rem;margin:0 auto;text-align:center;position:relative;z-index:1}',
    '.cricri-footer-brand{display:flex;flex-direction:column;align-items:center;gap:.35rem;margin-bottom:1rem}',
    '.cricri-footer-mark{font-family:"Saira Stencil One",Oswald,Impact,sans-serif;font-size:clamp(1.6rem,5vw,2rem);',
    'letter-spacing:.06em;color:#e33d6b;line-height:1;position:relative;display:inline-block}',
    '.cricri-footer-mark::after{content:"";position:absolute;left:-4%;right:-4%;bottom:.05em;height:.22em;',
    'background:#d49a2c;opacity:.5;z-index:-1;transform:skewX(-8deg)}',
    '.cricri-footer-tag{font-family:Oswald,system-ui,sans-serif;font-size:.68rem;font-weight:600;',
    'letter-spacing:.14em;text-transform:uppercase;color:#8c8376}',
    '.cricri-footer-text{margin:0 auto 1rem;max-width:32rem;font-size:.88rem;line-height:1.55;color:#a89f90}',
    '.cricri-footer-text strong{color:#ebe3cf;font-weight:600}',
    '.cricri-footer-pulse{margin:0 auto 1.35rem;max-width:30rem;font-family:Oswald,system-ui,sans-serif;',
    'font-size:clamp(.95rem,2.6vw,1.12rem);font-weight:600;letter-spacing:.03em;line-height:1.35;color:#f2e8d2}',
    '.cricri-footer-links{margin:0 0 1.35rem}',
    '.cricri-footer-official{display:inline-flex;flex-direction:column;align-items:center;gap:.15rem;',
    'padding:.65rem 1.1rem;border:1.5px solid rgba(227,61,107,.35);border-radius:999px;text-decoration:none;',
    'background:rgba(227,61,107,.08);transition:border-color .15s,background .15s,transform .15s}',
    '.cricri-footer-official:hover{border-color:#e33d6b;background:rgba(227,61,107,.16);transform:translateY(-1px)}',
    '.cricri-footer-official-label{font-family:Oswald,system-ui,sans-serif;font-size:.62rem;letter-spacing:.12em;',
    'text-transform:uppercase;color:#f28aa8}',
    '.cricri-footer-official-url{font-size:.78rem;color:#ebe3cf}',
    '.cricri-footer-official-arrow{display:none}',
    '.cricri-footer-dev{margin:0 0 1.15rem;display:flex;flex-direction:column;gap:.15rem}',
    '.cricri-footer-dev-label{font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;color:#8c8376;',
    'font-family:Oswald,system-ui,sans-serif}',
    '.cricri-footer-dev-name{font-family:Oswald,system-ui,sans-serif;font-size:1rem;font-weight:700;',
    'letter-spacing:.06em;color:#ebe3cf}',
    '.cricri-footer-a11y{display:flex;gap:.65rem;align-items:flex-start;text-align:left;max-width:32rem;',
    'margin:0 auto 1.35rem;padding:.85rem 1rem;border-radius:10px;border:1px solid rgba(230,220,196,.12);',
    'background:rgba(255,255,255,.03)}',
    '.cricri-footer-a11y-badge{flex-shrink:0;width:2rem;height:2rem;display:grid;place-items:center;',
    'border-radius:999px;background:rgba(227,61,107,.15);font-size:1rem}',
    '.cricri-footer-a11y-text{display:flex;flex-direction:column;gap:.25rem;font-size:.75rem;line-height:1.45;color:#a89f90}',
    '.cricri-footer-a11y-text strong{color:#ebe3cf;font-size:.78rem}',
    '.cricri-footer-meta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.35rem .55rem;',
    'font-family:"Space Mono",ui-monospace,monospace;font-size:.68rem;color:#8c8376;line-height:1.4}',
    '.cricri-footer-meta strong{color:#e33d6b;font-weight:700}',
    '.cricri-footer-dot{opacity:.45}',
    '.cricri-footer-glow{pointer-events:none;position:absolute;inset:auto 10% -40%;height:8rem;',
    'background:radial-gradient(ellipse at center,rgba(227,61,107,.12),transparent 70%);z-index:0}',
    '@media (min-width:700px){.cricri-footer{padding:3rem 2rem 7.5rem}.cricri-footer-a11y{padding:1rem 1.25rem}}'
  ].join('');

  var html =
    '<footer class="cricri-footer" role="contentinfo">' +
      '<div class="cricri-footer-inner">' +
        '<div class="cricri-footer-brand">' +
          '<span class="cricri-footer-mark">CRICRI</span>' +
          '<span class="cricri-footer-tag">projeto independente · pro povo do festival</span>' +
        '</div>' +
        '<p class="cricri-footer-text">' +
          'Feito por quem vive São Cristóvão no chão. Não somos o site oficial — ' +
          'programação e mapa institucional usam como <strong>referência</strong> o portal da prefeitura.' +
        '</p>' +
        '<p class="cricri-footer-pulse">' +
          'A performance é de quem está na rua — vivência, paixão e o que a cidade cola no mural.' +
        '</p>' +
        '<div class="cricri-footer-links">' +
          '<a class="cricri-footer-official" href="' + OFFICIAL + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="cricri-footer-official-label">Referência oficial</span>' +
            '<span class="cricri-footer-official-url">mapafasc.saocristovao.se.gov.br ↗</span>' +
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
            '<span>Contraste, texto, movimento, teclado, gestos e Libras. WCAG 2.2 · eMAG. Selo interno CRICRI.</span>' +
          '</div>' +
        '</div>' +
        '<div class="cricri-footer-meta">' +
          '<span>São Cristóvão · SE</span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>DDD <strong>079</strong></span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>CRICRI <strong>079</strong></span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>19–22/11/2026</span>' +
        '</div>' +
      '</div>' +
      '<div class="cricri-footer-glow" aria-hidden="true"></div>' +
    '</footer>';

  function injectCss() {
    if (document.getElementById('cricri-footer-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-footer-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount() {
    injectCss();
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
