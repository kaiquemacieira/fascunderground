/**
 * CRICRI · Baixar app (PWA) + QR Code
 * - beforeinstallprompt → instala automaticamente ao clicar
 * - Gera QR com o link do app
 * - Se já baixou/instalou uma vez → esconde o botão
 */
(function () {
  'use strict';
  if (window.__cricriInstallMounted) return;
  window.__cricriInstallMounted = true;

  var STORAGE_KEY = 'cricri-app-downloaded-v1';
  var deferredPrompt = null;

  function appUrl() {
    try {
      return (window.location.origin || '') + (window.location.pathname.replace(/[^/]+$/, '') || '/') + 'index.html';
    } catch (_) {
      return 'https://cricri-2026.vercel.app/';
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
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function markDownloaded() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (_) {}
  }

  function isIos() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  }

  function injectCss() {
    if (document.getElementById('cricri-install-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-install-css';
    s.textContent = [
      '#cricri-install-btn{',
      'position:fixed;left:max(0.75rem,env(safe-area-inset-left));',
      'bottom:calc(5.25rem + env(safe-area-inset-bottom,0px));',
      'z-index:5600;display:inline-flex;align-items:center;gap:0.4rem;',
      'padding:0.55rem 0.9rem;border-radius:999px;border:1.5px solid #e33d6b;',
      'background:#e33d6b;color:#fff;font:600 0.72rem/1 Oswald,system-ui,sans-serif;',
      'letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;',
      'box-shadow:0 6px 18px rgba(227,61,107,0.4)}',
      '#cricri-install-btn[hidden]{display:none!important}',
      '#cricri-install-btn svg{width:16px;height:16px}',
      '#cricri-install-sheet{position:fixed;inset:0;z-index:100130;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-install-sheet .sheet{width:min(100%,400px);background:#14110f;border-radius:18px 18px 0 0;',
      'border:1.5px solid rgba(230,220,196,0.14);padding:1.15rem 1.1rem 1.35rem;color:#ebe3cf}',
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p,#cricri-install-sheet ol{margin:0 0 0.65rem;font-size:0.85rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin:0.75rem 0;padding:0.85rem;',
      'border-radius:14px;background:rgba(230,220,196,0.06);border:1px solid rgba(230,220,196,0.12)}',
      '#cricri-install-sheet .qr-wrap img{width:180px;height:180px;border-radius:12px;background:#fff;padding:8px}',
      '#cricri-install-sheet .qr-caption{font-size:0.72rem;color:#8c8376;text-align:center}',
      '#cricri-install-sheet .sheet-actions{display:flex;flex-direction:column;gap:0.45rem;margin-top:0.5rem}',
      '#cricri-install-sheet button{appearance:none;border-radius:11px;padding:0.7rem 1rem;cursor:pointer;',
      'font:700 0.78rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.05em;text-transform:uppercase}',
      '#cricri-install-sheet .primary{background:#e33d6b;border:none;color:#fff}',
      '#cricri-install-sheet .ghost{background:transparent;border:1.5px solid rgba(230,220,196,0.22);color:#ebe3cf}',
      'html[data-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e}'
    ].join('');
    document.head.appendChild(s);
  }

  function qrImageUrl(data) {
    var u = encodeURIComponent(data);
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + u;
  }

  function shouldHideButton() {
    return isStandalone() || hasDownloadedOnce();
  }

  function updateVisibility() {
    var btn = document.getElementById('cricri-install-btn');
    if (!btn) return;
    if (shouldHideButton()) {
      btn.hidden = true;
      btn.style.display = 'none';
      return;
    }
    btn.hidden = false;
    btn.style.display = 'inline-flex';
  }

  function mountButton() {
    if (shouldHideButton()) return;
    if (document.getElementById('cricri-install-btn')) {
      updateVisibility();
      return;
    }
    var btn = document.createElement('button');
    btn.id = 'cricri-install-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Baixar app CRICRI');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/>' +
      '</svg><span>Baixar app</span>';
    btn.addEventListener('click', onInstallClick);
    document.body.appendChild(btn);
    updateVisibility();
  }

  function closeSheet() {
    var el = document.getElementById('cricri-install-sheet');
    if (el) el.remove();
  }

  function showSheet(opts) {
    opts = opts || {};
    closeSheet();
    var url = appUrl();
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>' + (opts.title || 'Baixar CRICRI') + '</h2>' +
        '<p>' + (opts.body || 'Instale o app na tela inicial ou escaneie o QR no celular.') + '</p>' +
        '<div class="qr-wrap">' +
          '<img src="' + qrImageUrl(url) + '" alt="QR Code do app CRICRI" width="180" height="180" />' +
          '<span class="qr-caption">QR Code · abra no celular</span>' +
        '</div>' +
        (opts.ios
          ? '<ol>' +
              '<li>Toque em <strong>Compartilhar</strong> no Safari</li>' +
              '<li><strong>Adicionar à Tela de Início</strong></li>' +
              '<li>Confirme em <strong>Adicionar</strong></li>' +
            '</ol>'
          : '') +
        '<div class="sheet-actions">' +
          (opts.showInstall
            ? '<button type="button" class="primary" id="cricri-install-now">Instalar agora</button>'
            : '') +
          '<button type="button" class="ghost" id="cricri-install-gotit">Fechar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeSheet();
    });
    var got = document.getElementById('cricri-install-gotit');
    if (got) got.addEventListener('click', closeSheet);
    var now = document.getElementById('cricri-install-now');
    if (now) {
      now.addEventListener('click', function () {
        triggerNativeInstall();
      });
    }
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) {
      showSheet({
        title: 'Quase lá',
        body: 'Use o QR no celular ou o menu do navegador → Instalar app.',
        showInstall: false,
        ios: isIos()
      });
      return;
    }
    try {
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        markDownloaded();
        updateVisibility();
        closeSheet();
      }
    } catch (e) {
      console.warn('[install]', e);
      showSheet({ title: 'Instalar CRICRI', body: 'Escaneie o QR ou use o menu do navegador.', ios: isIos() });
    }
  }

  async function onInstallClick() {
    // marca intenção de download e tenta instalar na hora
    if (deferredPrompt) {
      showSheet({
        title: 'Baixar CRICRI',
        body: 'Confirme a instalação no popup do navegador. O QR também está pronto pra outro aparelho.',
        showInstall: true
      });
      // inicia download automaticamente
      setTimeout(function () {
        triggerNativeInstall();
      }, 280);
      return;
    }
    if (isIos()) {
      markDownloaded(); // usuário viu o fluxo; esconde na próxima se quiser — só marca se completar?
      // não marca ainda no iOS até "Entendi" — marca ao fechar sheet
      showSheet({
        title: 'Instalar no iPhone',
        body: 'Siga os passos ou escaneie o QR em outro device.',
        ios: true,
        showInstall: false
      });
      var got = document.getElementById('cricri-install-gotit');
      if (got) {
        got.addEventListener('click', function () {
          markDownloaded();
          updateVisibility();
        });
      }
      return;
    }
    showSheet({
      title: 'Baixar CRICRI',
      body: 'Escaneie o QR no celular. Se o navegador oferecer, a instalação inicia em seguida.',
      showInstall: !!deferredPrompt
    });
    // tenta de novo caso o prompt chegue atrasado
    setTimeout(function () {
      if (deferredPrompt) triggerNativeInstall();
    }, 500);
  }

  function wirePrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      updateVisibility();
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
    if (shouldHideButton()) return;
    mountButton();
    wirePrompt();
    setTimeout(updateVisibility, 1200);
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
    showQr: function () {
      showSheet({ title: 'QR Code CRICRI', body: 'Escaneie para abrir/instalar o app.', showInstall: !!deferredPrompt });
    },
    resetDownloadFlag: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      updateVisibility();
      mountButton();
    }
  };
})();
