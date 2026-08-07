/**
 * CRICRI · Baixar app
 * O botão #cricri-install-btn fica no HTML (estático).
 * Este script NÃO altera display/visibility (evita piscar).
 * Só: clique + sheet de instalação + beforeinstallprompt.
 */
(function () {
  'use strict';
  if (window.__CRICRI_INSTALL_CLICK__) return;
  window.__CRICRI_INSTALL_CLICK__ = true;

  var deferredPrompt = null;
  var BTN_ID = 'cricri-install-btn';

  function appUrl() {
    try {
      var origin = window.location.origin || '';
      var path = window.location.pathname || '/';
      if (path.indexOf('/explorar') !== -1 || /\.html$/i.test(path)) {
        path = path.replace(/[^/]+$/, '');
      }
      if (!path.endsWith('/')) path += '/';
      return origin + path + 'index.html';
    } catch (_) {
      return window.location.href;
    }
  }

  function isStandalone() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.navigator.standalone === true) return true;
    } catch (_) {}
    return false;
  }

  function isIos() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function injectSheetCss() {
    if (document.getElementById('cricri-install-sheet-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-install-sheet-css';
    s.textContent = [
      '#cricri-install-sheet{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-install-sheet .sheet{width:min(100%,400px);max-height:min(92vh,720px);overflow:auto;background:#14110f;border-radius:18px 18px 0 0;',
      'border:1px solid rgba(230,220,196,0.14);padding:1.1rem 1.1rem 1.25rem;color:#ebe3cf}',
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p{margin:0 0 0.65rem;font-size:0.85rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin:0.75rem 0;padding:0.85rem;',
      'background:rgba(0,0,0,0.25);border-radius:14px;border:1px solid rgba(230,220,196,0.1)}',
      '#cricri-install-sheet .qr-wrap img{width:180px;height:180px;border-radius:12px;background:#fff;padding:8px}',
      '#cricri-install-sheet .qr-caption{font-size:0.72rem;color:#8c8376;text-align:center}',
      '#cricri-install-sheet .link-row{display:flex;gap:.4rem;margin:.4rem 0 .7rem}',
      '#cricri-install-sheet .link-row input{flex:1;min-width:0;border-radius:10px;border:1.5px solid rgba(230,220,196,.16);',
      'background:#0c0a08;color:#ebe3cf;padding:0.55rem 0.65rem;font-size:0.78rem}',
      '#cricri-install-sheet .sheet-actions{display:flex;flex-direction:column;gap:0.45rem;margin-top:0.5rem}',
      '#cricri-install-sheet button{appearance:none;border-radius:11px;padding:0.7rem 1rem;cursor:pointer;',
      'font:600 0.82rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.04em;text-transform:uppercase}',
      '#cricri-install-sheet .primary{background:#E6BE49;border:none;color:#1a1400}',
      '#cricri-install-sheet .ghost{background:transparent;border:1.5px solid rgba(230,220,196,0.22);color:#ebe3cf}',
      '#cricri-install-sheet .status{font-size:.75rem;color:#8c8376;min-height:1.1em;margin:.35rem 0 0}',
      '#cricri-install-sheet .status.ok{color:#7ecf9a}',
      'html[data-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e}',
      /* botão: CSS global em fixed-chrome — aqui só standalone */
      'html.cricri-standalone #' + BTN_ID + '{display:none!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function closeSheet() {
    var el = document.getElementById('cricri-install-sheet');
    if (el) el.remove();
  }

  function setStatus(text, ok) {
    var el = document.getElementById('cricri-install-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'status' + (ok ? ' ok' : '');
  }

  function qrImageUrl(data) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(data);
  }

  function showSheet() {
    closeSheet();
    var url = appUrl();
    var canNative = !!deferredPrompt;
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    wrap.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="Baixar app">' +
        '<h2>Baixar o CRICRI</h2>' +
        (isIos()
          ? '<p>No iPhone/iPad: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>'
          : '<p>Instale o app na tela inicial para abrir mais rápido e usar offline.</p>') +
        '<div class="qr-wrap">' +
          '<img src="' + qrImageUrl(url) + '" width="180" height="180" alt="QR Code do CRICRI" />' +
          '<span class="qr-caption">Escaneie com outro celular</span>' +
        '</div>' +
        '<div class="link-row">' +
          '<input id="cricri-install-url" type="text" readonly value="' + url.replace(/"/g, '&quot;') + '" />' +
          '<button type="button" class="ghost" id="cricri-install-copy">Copiar</button>' +
        '</div>' +
        '<div class="sheet-actions">' +
          (canNative
            ? '<button type="button" class="primary" id="cricri-install-now">Instalar agora</button>'
            : (isIos()
                ? '<button type="button" class="primary" id="cricri-install-ios">Como instalar no iOS</button>'
                : '<button type="button" class="primary" id="cricri-install-open">Instruções</button>')) +
          '<button type="button" class="ghost" id="cricri-install-gotit">Fechar</button>' +
        '</div>' +
        '<p class="status" id="cricri-install-status" role="status"></p>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeSheet(); });
    document.getElementById('cricri-install-gotit').addEventListener('click', closeSheet);
    var copyBtn = document.getElementById('cricri-install-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var input = document.getElementById('cricri-install-url');
        var val = (input && input.value) || url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).then(function () { setStatus('Link copiado ✓', true); })
            .catch(function () { setStatus('Selecione e copie o link', false); });
        } else setStatus('Selecione e copie o link', false);
      });
    }
    var now = document.getElementById('cricri-install-now');
    if (now) now.addEventListener('click', triggerNativeInstall);
    var ios = document.getElementById('cricri-install-ios');
    if (ios) ios.addEventListener('click', function () {
      setStatus('Safari → Compartilhar → Adicionar à Tela de Início', true);
    });
    var openBtn = document.getElementById('cricri-install-open');
    if (openBtn) openBtn.addEventListener('click', function () {
      if (deferredPrompt) return triggerNativeInstall();
      setStatus('No menu do navegador, use “Instalar app” ou “Adicionar à tela inicial”.', false);
    });
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) {
      setStatus('Use o menu do navegador para instalar.', false);
      return;
    }
    try {
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') setStatus('Instalando…', true);
      else setStatus('Instalação cancelada', false);
    } catch (_) {
      setStatus('Não foi possível abrir o instalador.', false);
    }
  }

  function onInstallClick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    showSheet();
  }

  function bindButton() {
    var btn = document.getElementById(BTN_ID);
    if (!btn || btn.__cricriBound) return;
    btn.__cricriBound = true;
    btn.addEventListener('click', onInstallClick);
  }

  function boot() {
    if (!document.body) { setTimeout(boot, 30); return; }
    injectSheetCss();
    try {
      if (isStandalone()) document.documentElement.classList.add('cricri-standalone');
    } catch (_) {}
    bindButton();
    // um reforço se o botão HTML chegar tarde
    setTimeout(bindButton, 500);
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      try { document.documentElement.classList.add('cricri-standalone'); } catch (_) {}
      closeSheet();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.CricriInstall = { prompt: onInstallClick, isStandalone: isStandalone };
})();
