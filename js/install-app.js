/**
 * CRICRI · Baixar app (PWA) + QR Code
 * - beforeinstallprompt → botão Instalar agora
 * - QR Code sempre visível no sheet
 * - Copiar link / abrir na tela de início (iOS)
 * - Manifest + SW necessários (manifest.webmanifest + sw.js)
 */
(function () {
  'use strict';
  if (window.__cricriInstallMountedV2) return;
  window.__cricriInstallMountedV2 = true;

  var STORAGE_KEY = 'cricri-app-downloaded-v1';
  var deferredPrompt = null;

  function appUrl() {
    try {
      var origin = window.location.origin || '';
      var path = window.location.pathname || '/';
      // raiz do app
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
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.navigator.standalone === true) return true;
    } catch (_) {}
    return false;
  }

  function hasDownloadedOnce() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { return false; }
  }

  function markDownloaded() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  function isIos() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function injectHead() {
    if (!document.querySelector('link[rel="manifest"]')) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.webmanifest';
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      var apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = 'icons/apple-touch-icon.png';
      document.head.appendChild(apple);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      var m = document.createElement('meta');
      m.name = 'apple-mobile-web-app-capable';
      m.content = 'yes';
      document.head.appendChild(m);
    }
    if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
      var m2 = document.createElement('meta');
      m2.name = 'mobile-web-app-capable';
      m2.content = 'yes';
      document.head.appendChild(m2);
    }
  }

  function injectCss() {
    if (document.getElementById('cricri-install-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-install-css';
    s.textContent = [
      '#cricri-install-btn{',
      'position:fixed!important;',
      'left:max(0.65rem,env(safe-area-inset-left,0px))!important;',
      'right:auto!important;',
      'bottom:calc(72px + env(safe-area-inset-bottom,0px))!important;',
      'top:auto!important;',
      'z-index:2147483001!important;',
      'display:inline-flex!important;',
      'visibility:visible!important;',
      'opacity:1!important;',
      'align-items:center;gap:0.4rem;',
      'padding:0.6rem 0.95rem!important;',
      'min-height:44px!important;',
      'border-radius:999px!important;',
      'border:2px solid #1a1400!important;',
      'background:#E6BE49!important;',
      'color:#1a1400!important;',
      'font:700 0.75rem/1 Oswald,system-ui,sans-serif!important;',
      'letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;',
      'box-shadow:0 4px 20px rgba(0,0,0,0.45),0 0 0 1px rgba(230,190,73,0.35)!important;',
      'pointer-events:auto!important;',
      'transform:none!important;filter:none!important;',
      '-webkit-tap-highlight-color:transparent}',
      '#cricri-install-btn[hidden]{display:none!important}',
      '#cricri-install-btn svg{width:16px;height:16px;flex-shrink:0}',
      '@media (max-width:480px){#cricri-install-btn span{display:inline!important}}',
      '#cricri-install-sheet{position:fixed;inset:0;z-index:100130;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-install-sheet .sheet{width:min(100%,400px);max-height:min(92vh,720px);overflow:auto;background:#14110f;border-radius:18px 18px 0 0;',
      'border:1.5px solid rgba(230,220,196,0.14);padding:1.15rem 1.1rem 1.35rem;color:#ebe3cf}',
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p,#cricri-install-sheet ol{margin:0 0 0.65rem;font-size:0.85rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet ol{padding-left:1.2rem}',
      '#cricri-install-sheet .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin:0.75rem 0;padding:0.85rem;',
      'border-radius:14px;background:rgba(230,220,196,0.06);border:1px solid rgba(230,220,196,0.12)}',
      '#cricri-install-sheet .qr-wrap img{width:180px;height:180px;border-radius:12px;background:#fff;padding:8px}',
      '#cricri-install-sheet .qr-caption{font-size:0.72rem;color:#8c8376;text-align:center}',
      '#cricri-install-sheet .link-row{display:flex;gap:.4rem;margin:.4rem 0 .7rem}',
      '#cricri-install-sheet .link-row input{flex:1;min-width:0;border-radius:10px;border:1.5px solid rgba(230,220,196,.16);',
      'background:rgba(0,0,0,.28);color:#ebe3cf;padding:.55rem .65rem;font-size:.78rem}',
      '#cricri-install-sheet .sheet-actions{display:flex;flex-direction:column;gap:0.45rem;margin-top:0.5rem}',
      '#cricri-install-sheet button{appearance:none;border-radius:11px;padding:0.7rem 1rem;cursor:pointer;',
      'font:700 0.78rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.05em;text-transform:uppercase}',
      '#cricri-install-sheet .primary{background:#E6BE49;border:none;color:#fff}',
      '#cricri-install-sheet .ghost{background:transparent;border:1.5px solid rgba(230,220,196,0.22);color:#ebe3cf}',
      '#cricri-install-sheet .status{font-size:.75rem;color:#8c8376;min-height:1.1em;margin:.35rem 0 0}',
      '#cricri-install-sheet .status.ok{color:#7ecf9a}',
      'html[data-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e}'
    ].join('');
    document.head.appendChild(s);
  }

  function qrImageUrl(data) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(data);
  }

  function shouldHideButton() {
    // só esconde se já estiver rodando como app instalado
    return isStandalone();
  }

  function forceShowStyles(btn) {
    if (!btn) return;
    var s = btn.style;
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('left', 'max(0.65rem, env(safe-area-inset-left, 0px))', 'important');
    s.setProperty('right', 'auto', 'important');
    s.setProperty('bottom', 'calc(72px + env(safe-area-inset-bottom, 0px))', 'important');
    s.setProperty('top', 'auto', 'important');
    s.setProperty('z-index', '2147483001', 'important');
    s.setProperty('display', 'inline-flex', 'important');
    s.setProperty('visibility', 'visible', 'important');
    s.setProperty('opacity', '1', 'important');
    s.setProperty('pointer-events', 'auto', 'important');
    s.setProperty('transform', 'none', 'important');
    s.setProperty('filter', 'none', 'important');
  }

  function updateVisibility() {
    var btn = document.getElementById('cricri-install-btn');
    if (!btn) return;
    if (shouldHideButton()) {
      btn.hidden = true;
      btn.style.setProperty('display', 'none', 'important');
      return;
    }
    btn.hidden = false;
    btn.removeAttribute('hidden');
    forceShowStyles(btn);
  }

  function mountButton() {
    if (shouldHideButton()) return;
    var btn = document.getElementById('cricri-install-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'cricri-install-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Baixar app CRICRI');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/>' +
        '</svg><span>Baixar app</span>';
      btn.addEventListener('click', onInstallClick);
      document.body.appendChild(btn);
    } else if (btn.parentElement !== document.body) {
      document.body.appendChild(btn);
    }
    updateVisibility();
    // re-pin após fixed-chrome
    setTimeout(updateVisibility, 100);
    setTimeout(updateVisibility, 500);
    setTimeout(updateVisibility, 1500);
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

  function showSheet() {
    closeSheet();
    var url = appUrl();
    var canNative = !!deferredPrompt;
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');

    var iosSteps = isIos()
      ? '<ol>' +
          '<li>Toque em <strong>Compartilhar</strong> (quadrado com seta) no Safari</li>' +
          '<li>Role e toque em <strong>Adicionar à Tela de Início</strong></li>' +
          '<li>Confirme em <strong>Adicionar</strong></li>' +
        '</ol>'
      : '';

    var androidHint = (!canNative && isAndroid())
      ? '<p>No Chrome: menu <strong>⋮</strong> → <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</p>'
      : '';

    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>Baixar CRICRI</h2>' +
        '<p>Instale na tela inicial do celular — funciona offline e abre como app.</p>' +
        iosSteps +
        androidHint +
        '<div class="qr-wrap">' +
          '<img src="' + qrImageUrl(url) + '" alt="QR Code do app CRICRI" width="180" height="180" loading="lazy" />' +
          '<span class="qr-caption">Escaneie com a câmera do celular</span>' +
        '</div>' +
        '<div class="link-row">' +
          '<input id="cricri-install-url" type="text" readonly value="' + url.replace(/"/g, '&quot;') + '" />' +
          '<button type="button" class="ghost" id="cricri-install-copy">Copiar</button>' +
        '</div>' +
        '<div class="sheet-actions">' +
          (canNative
            ? '<button type="button" class="primary" id="cricri-install-now">Instalar agora</button>'
            : '<button type="button" class="primary" id="cricri-install-open">Abrir no celular</button>') +
          '<button type="button" class="ghost" id="cricri-install-gotit">Fechar</button>' +
        '</div>' +
        '<p class="status" id="cricri-install-status" role="status"></p>' +
      '</div>';

    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeSheet();
    });

    document.getElementById('cricri-install-gotit').addEventListener('click', closeSheet);

    var copyBtn = document.getElementById('cricri-install-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var input = document.getElementById('cricri-install-url');
        var text = (input && input.value) || url;
        function ok() { setStatus('Link copiado!', true); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(ok).catch(function () {
            if (input) { input.select(); try { document.execCommand('copy'); ok(); } catch (_) {} }
          });
        } else if (input) {
          input.select();
          try { document.execCommand('copy'); ok(); } catch (_) {}
        }
      });
    }

    var now = document.getElementById('cricri-install-now');
    if (now) {
      now.addEventListener('click', function () {
        triggerNativeInstall();
      });
    }

    var openBtn = document.getElementById('cricri-install-open');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        // tenta de novo o prompt se chegou atrasado
        if (deferredPrompt) {
          triggerNativeInstall();
          return;
        }
        // abre o próprio app (útil se estiver no desktop e quiser testar)
        try {
          window.open(url, '_blank');
        } catch (_) {
          window.location.href = url;
        }
        setStatus('Abra no celular e use Instalar / Adicionar à tela inicial.', false);
      });
    }
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) {
      setStatus('Prompt nativo indisponível neste navegador. Use o QR ou o menu do browser.', false);
      return;
    }
    try {
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        markDownloaded();
        updateVisibility();
        setStatus('Instalado! Procure o ícone CRICRI na tela inicial.', true);
        setTimeout(closeSheet, 1200);
      } else {
        setStatus('Instalação cancelada. Você pode tentar de novo.', false);
      }
    } catch (e) {
      console.warn('[install]', e);
      setStatus('Não deu pra instalar agora. Use o QR ou o menu do navegador.', false);
    }
  }

  function onInstallClick() {
    showSheet();
    // se o prompt nativo já estiver pronto, destaca
    if (deferredPrompt) {
      setStatus('Toque em Instalar agora para baixar o app.', false);
    }
  }

  function wirePrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      updateVisibility();
      // se o sheet já estiver aberto, atualiza botão
      if (document.getElementById('cricri-install-sheet') && !document.getElementById('cricri-install-now')) {
        showSheet();
      }
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      markDownloaded();
      updateVisibility();
      closeSheet();
      try {
        if (window.CricriNotifBell && window.CricriNotifBell.push) {
          window.CricriNotifBell.push({
            ico: '📲',
            title: 'App instalado',
            body: 'CRICRI na sua tela de início',
            kind: 'system'
          });
        }
      } catch (_) {}
    });
  }

  function boot() {
    if (!document.body) {
      setTimeout(boot, 40);
      return;
    }
    injectHead();
    injectCss();
    wirePrompt();
    if (!shouldHideButton()) {
      mountButton();
      setTimeout(mountButton, 300);
      setTimeout(updateVisibility, 800);
      setTimeout(updateVisibility, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CricriInstall = {
    prompt: onInstallClick,
    isStandalone: isStandalone,
    hasDownloaded: hasDownloadedOnce,
    showQr: function () { showSheet(); },
    resetDownloadFlag: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      updateVisibility();
      mountButton();
    }
  };
})();
