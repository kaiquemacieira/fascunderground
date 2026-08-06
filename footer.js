/**
 * CRICRI · footer minimal
 * Apenas certificado de acessibilidade (sem manifesto / sobre / mapa oficial)
 */
(function () {
  var css = [
    '.cricri-footer{position:relative;isolation:isolate;margin:0;padding:1.75rem 1.25rem 7rem;',
    'background:linear-gradient(180deg,transparent 0%,rgba(10,10,10,.55) 45%,#0A0A0A 100%);',
    'border-top:1.5px dashed rgba(255,255,255,.14);color:#A6A6A2;font-family:Archivo,system-ui,sans-serif;overflow:hidden}',
    'html[data-theme="light"] .cricri-footer,html[data-a11y-theme="light"] .cricri-footer{',
    'background:linear-gradient(180deg,transparent 0%,rgba(251,243,220,.85) 45%,#f5ead0 100%);',
    'border-top-color:rgba(32,21,38,.18);color:#5c4a68}',
    '.cricri-footer-inner{max-width:28rem;margin:0 auto;text-align:center;position:relative;z-index:1}',
    '.cricri-footer-a11y{display:flex;gap:.65rem;align-items:flex-start;text-align:left;',
    'margin:0 auto;padding:.85rem 1rem;border-radius:12px;border:1.5px dashed rgba(255,255,255,.18);',
    'background:rgba(255,255,255,.04)}',
    'html[data-theme="light"] .cricri-footer-a11y,html[data-a11y-theme="light"] .cricri-footer-a11y{',
    'border-color:rgba(32,21,38,.2);background:rgba(32,21,38,.04)}',
    '.cricri-footer-a11y-badge{flex-shrink:0;width:2rem;height:2rem;display:grid;place-items:center;',
    'border-radius:999px;background:rgba(255,54,224,.15);font-size:1rem}',
    '.cricri-footer-a11y-text{display:flex;flex-direction:column;gap:.2rem;font-size:.74rem;line-height:1.45;color:#7c6a95}',
    '.cricri-footer-a11y-text strong{color:#FAFAF7;font-size:.78rem;font-family:"Inter",system-ui,sans-serif;',
    'letter-spacing:.04em;text-transform:uppercase}',
    'html[data-theme="light"] .cricri-footer-a11y-text strong,html[data-a11y-theme="light"] .cricri-footer-a11y-text strong{color:#201526}',
    '.cricri-footer-glow{pointer-events:none;position:absolute;inset:auto 10% -40%;height:5rem;',
    'background:radial-gradient(ellipse at center,rgba(255,54,224,.1),transparent 70%);z-index:0}'
  ].join('');

  var html =
    '<footer class="cricri-footer" role="contentinfo">' +
      '<div class="cricri-footer-inner">' +
        '<div class="cricri-footer-a11y" role="note">' +
          '<span class="cricri-footer-a11y-badge" aria-hidden="true">♿</span>' +
          '<div class="cricri-footer-a11y-text">' +
            '<strong>Certificado digital de acessibilidade</strong>' +
            '<span>Contraste, texto, movimento, teclado, gestos e Libras. WCAG 2.2 · eMAG. Selo interno CRICRI.</span>' +
          '</div>' +
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
    if (!document.querySelector('.cricri-footer')) {
      var wrap = document.createElement('div');
      wrap.id = 'site-footer-slot';
      wrap.innerHTML = html;
      var nav = document.querySelector('.bottom-nav, #bottom-nav-slot');
      if (nav && nav.parentNode) nav.parentNode.insertBefore(wrap, nav);
      else document.body.appendChild(wrap);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  window.CricriFooter = { mount: mount };
})();
