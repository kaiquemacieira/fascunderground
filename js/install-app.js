/**
 * CRICRI · botão "Baixar app" (PWA)
 * - Chrome/Android/Edge: beforeinstallprompt → instala
 * - iOS Safari: instruções Adicionar à Tela de Início
 * - Já instalado: esconde ou mostra estado
 */
(function () {
  'use strict';
  if (window.__cricriInstallMounted) return;
  window.__cricriInstallMounted = true;

  var deferredPrompt = null;

  function isStandalone() {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.navigator.standalone === true) return true;
    } catch (_) {}
    return false;
  }

  function isIos() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isSafari() {
    var ua = navigator.userAgent || '';
    return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/i.test(ua);
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
    var metas = [
      ['mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
      ['apple-mobile-web-app-title', 'CRICRI']
    ];
    metas.forEach(function (m) {
      if (!document.querySelector('meta[name="' + m[0] + '"]')) {
        var el = document.createElement('meta');
        el.name = m[0];
        el.content = m[1];
        document.head.appendChild(el);
      }
    });
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
      'letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;',
      'box-shadow:0 8px 24px rgba(0,0,0,0.4);backdrop-filter:blur(10px);',
      'transition:transform .15s ease,background .15s ease,border-color .15s ease',
      '}',
      '#cricri-install-btn:hover{background:#c42f58;border-color:#c42f58;color:#fff}',
      '#cricri-install-btn:active{transform:scale(0.96)}',
      '#cricri-install-btn svg{width:16px;height:16px;flex:none}',
      '#cricri-install-btn[hidden]{display:none!important}',
      '#cricri-install-sheet{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding:1rem;padding-bottom:calc(1rem + env(safe-area-inset-bottom,0px))}',
      '#cricri-install-sheet[hidden]{display:none!important}',
      '#cricri-install-sheet .sheet{width:min(100%,380px);background:#171412;border:1.5px solid rgba(230,220,196,0.14);',
      'border-radius:16px;padding:1.15rem 1.1rem 1.25rem;color:#ebe3cf;box-shadow:0 -12px 40px rgba(0,0,0,0.45)}',
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p{margin:0 0 0.65rem;font-size:0.88rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet ol{margin:0 0 1rem;padding-left:1.2rem;font-size:0.88rem;line-height:1.5;color:#cfc5b4}',
      '#cricri-install-sheet .sheet-actions{display:flex;gap:0.5rem;flex-wrap:wrap}',
      '#cricri-install-sheet button{appearance:none;border-radius:10px;padding:0.55rem 0.9rem;font:600 0.75rem/1 Oswald,system-ui,sans-serif;',
      'letter-spacing:0.06em;text-transform:uppercase;cursor:pointer}',
      '#cricri-install-sheet .primary{background:#e33d6b;border:none;color:#fff}',
      '#cricri-install-sheet .ghost{background:transparent;border:1.5px solid rgba(230,220,196,0.22);color:#ebe3cf}',
      'html[data-theme="light"] #cricri-install-btn,html[data-a11y-theme="light"] #cricri-install-btn{background:rgba(243,236,220,0.95);color:#17120e}',
      'html[data-theme="light"] #cricri-install-sheet .sheet,html[data-a11y-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e;border-color:rgba(28,21,17,0.12)}',
      'html[data-theme="light"] #cricri-install-sheet p,html[data-theme="light"] #cricri-install-sheet ol{color:#5c564e}'
    ].join('');
    document.head.appendChild(s);
  }

  function mountButton() {
    if (document.getElementById('cricri-install-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'cricri-install-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Baixar app CRICRI no celular');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/>' +
      '</svg><span>Baixar app</span>';
    btn.addEventListener('click', onInstallClick);
    document.body.appendChild(btn);
    updateVisibility();
  }

  function updateVisibility() {
    var btn = document.getElementById('cricri-install-btn');
    if (!btn) return;
    // só some quando já está rodando como app instalado
    if (isStandalone()) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    btn.style.display = 'inline-flex';
    var label = btn.querySelector('span');
    if (label) label.textContent = 'Baixar app';
  }

  function showIosSheet() {
    var existing = document.getElementById('cricri-install-sheet');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>Instalar CRICRI</h2>' +
        '<p>No iPhone/iPad, adicione o app na tela de início:</p>' +
        '<ol>' +
          '<li>Toque em <strong>Compartilhar</strong> <span aria-hidden="true">⬆️</span> no Safari</li>' +
          '<li>Role e toque em <strong>Adicionar à Tela de Início</strong></li>' +
          '<li>Confirme em <strong>Adicionar</strong></li>' +
        '</ol>' +
        '<div class="sheet-actions">' +
          '<button type="button" class="primary" id="cricri-install-gotit">Entendi</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) wrap.remove();
    });
    document.getElementById('cricri-install-gotit').addEventListener('click', function () {
      wrap.remove();
    });
  }

  function showGenericSheet() {
    var existing = document.getElementById('cricri-install-sheet');
    if (existing) existing.remove();
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML =
      '<div class="sheet">' +
        '<h2>Instalar CRICRI</h2>' +
        '<p>Abra o menu do navegador e escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</p>' +
        '<p style="font-size:0.8rem;color:#8c8376">No Chrome Android: menu ⋮ → Instalar app. Use HTTPS (ou localhost).</p>' +
        '<div class="sheet-actions">' +
          '<button type="button" class="primary" id="cricri-install-gotit">Entendi</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) wrap.remove();
    });
    document.getElementById('cricri-install-gotit').addEventListener('click', function () {
      wrap.remove();
    });
  }

  async function onInstallClick() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          deferredPrompt = null;
          updateVisibility();
        }
      } catch (e) {
        console.warn('[install]', e);
        showGenericSheet();
      }
      return;
    }
    if (isIos()) {
      showIosSheet();
      return;
    }
    showGenericSheet();
  }

  function wirePrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      updateVisibility();
      console.info('[CRICRI] install prompt ready');
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      updateVisibility();
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
    mountButton();
    wirePrompt();
    // re-check after SW settles
    setTimeout(updateVisibility, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CricriInstall = {
    prompt: onInstallClick,
    isStandalone: isStandalone
  };
})();
