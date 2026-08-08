/**
 * CRICRI · Baixar app
 * Botão HTML estático. JS só no clique + sheet.
 * Mobile: sempre CTA de INSTALAR/BAIXAR (nunca "Abrir no celular").
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

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function isMobile() {
    try {
      if (window.matchMedia && window.matchMedia('(max-width: 820px) and (pointer: coarse)').matches) return true;
    } catch (_) {}
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
    if (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900) return true;
    return false;
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
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1.05rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p{margin:0 0 0.65rem;font-size:0.88rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet .steps{margin:0.4rem 0 0.85rem;padding:0.75rem 0.85rem;border-radius:12px;background:rgba(193,82,62,0.08);border:1px solid rgba(193,82,62,0.22)}',
      '#cricri-install-sheet .steps ol{margin:0;padding-left:1.2rem;font-size:0.84rem;line-height:1.55;color:#ebe3cf}',
      '#cricri-install-sheet .steps li{margin:0.25rem 0}',
      '#cricri-install-sheet .steps strong{color:#C1523E}',
      '#cricri-install-sheet .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin:0.75rem 0;padding:0.85rem;',
      'background:rgba(0,0,0,0.25);border-radius:14px;border:1px solid rgba(230,220,196,0.1)}',
      '#cricri-install-sheet .qr-wrap img{width:180px;height:180px;border-radius:12px;background:#fff;padding:8px}',
      '#cricri-install-sheet .qr-caption{font-size:0.72rem;color:#8c8376;text-align:center}',
      '#cricri-install-sheet.is-mobile .qr-wrap{display:none}',
      '#cricri-install-sheet .link-row{display:flex;gap:.4rem;margin:.4rem 0 .7rem}',
      '#cricri-install-sheet .link-row input{flex:1;min-width:0;border-radius:10px;border:1.5px solid rgba(230,220,196,.16);',
      'background:#0c0a08;color:#ebe3cf;padding:0.55rem 0.65rem;font-size:0.78rem}',
      '#cricri-install-sheet .sheet-actions{display:flex;flex-direction:column;gap:0.45rem;margin-top:0.5rem}',
      '#cricri-install-sheet button{appearance:none;border-radius:11px;padding:0.85rem 1rem;cursor:pointer;',
      'font:700 0.88rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.04em;text-transform:uppercase}',
      '#cricri-install-sheet .primary{background:#C1523E;border:none;color:#1a1400}',
      '#cricri-install-sheet .ghost{background:transparent;border:1.5px solid rgba(230,220,196,0.22);color:#ebe3cf}',
      '#cricri-install-sheet .status{font-size:.78rem;color:#8c8376;min-height:1.1em;margin:.35rem 0 0}',
      '#cricri-install-sheet .status.ok{color:#7ecf9a}',
      'html[data-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e}',
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

  /** CTA principal: no celular SEMPRE instalar/baixar — nunca "abrir no celular" */
  function buildPrimaryActions() {
    if (deferredPrompt) {
      return {
        html: '<button type="button" class="primary" id="cricri-install-now">⬇ Instalar app agora</button>',
        steps: '<div class="steps"><ol><li>Toque em <strong>Instalar app agora</strong></li><li>Confirme na janela do navegador</li></ol></div>'
      };
    }
    if (isIos()) {
      return {
        html: '<button type="button" class="primary" id="cricri-install-ios">⬇ Adicionar à tela inicial</button>',
        steps:
          '<div class="steps"><ol>' +
          '<li>Toque no botão <strong>Compartilhar</strong> <span aria-hidden="true">⎋</span> do Safari</li>' +
          '<li>Role e toque em <strong>Adicionar à Tela de Início</strong></li>' +
          '<li>Confirme em <strong>Adicionar</strong></li>' +
          '</ol></div>'
      };
    }
    if (isMobile() || isAndroid()) {
      return {
        html: '<button type="button" class="primary" id="cricri-install-android">⬇ Instalar / Baixar app</button>',
        steps:
          '<div class="steps"><ol>' +
          '<li>No Chrome, toque no menu <strong>⋮</strong> (canto superior)</li>' +
          '<li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></li>' +
          '<li>Confirme a instalação</li>' +
          '</ol></div>'
      };
    }
    // Desktop: QR + instruções (sem "abrir no celular" como ação principal)
    return {
      html: '<button type="button" class="primary" id="cricri-install-desktop">Ver como instalar</button>',
      steps:
        '<div class="steps"><ol>' +
        '<li>Escaneie o QR com o celular <strong>ou</strong></li>' +
        '<li>No Chrome do PC: menu <strong>⋮</strong> → <strong>Instalar CRICRI</strong></li>' +
        '</ol></div>'
    };
  }

  function showSheet() {
    closeSheet();
    var url = appUrl();
    var mobile = isMobile() || isAndroid() || isIos();
    var actions = buildPrimaryActions();
    var wrap = document.createElement('div');
    wrap.id = 'cricri-install-sheet';
    if (mobile) wrap.className = 'is-mobile';
    wrap.innerHTML =
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="Baixar app">' +
        '<h2>Baixar o CRICRI</h2>' +
        '<p>Instale na tela inicial — funciona offline e abre como app.</p>' +
        actions.steps +
        (mobile
          ? ''
          : ('<div class="qr-wrap">' +
              '<img src="' + qrImageUrl(url) + '" width="180" height="180" alt="QR Code do CRICRI" />' +
              '<span class="qr-caption">Escaneie com a câmera do celular</span>' +
            '</div>')) +
        '<div class="link-row">' +
          '<input id="cricri-install-url" type="text" readonly value="' + url.replace(/"/g, '&quot;') + '" />' +
          '<button type="button" class="ghost" id="cricri-install-copy">Copiar</button>' +
        '</div>' +
        '<div class="sheet-actions">' +
          actions.html +
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
    if (ios) {
      ios.addEventListener('click', function () {
        setStatus('Safari → Compartilhar → Adicionar à Tela de Início', true);
        // destaca os passos já visíveis
        var steps = wrap.querySelector('.steps');
        if (steps) steps.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    var andBtn = document.getElementById('cricri-install-android');
    if (andBtn) {
      andBtn.addEventListener('click', function () {
        // tenta de novo o prompt se chegou atrasado
        if (deferredPrompt) {
          triggerNativeInstall();
          return;
        }
        setStatus('Chrome → menu ⋮ → Instalar app / Adicionar à tela inicial', true);
        var steps = wrap.querySelector('.steps');
        if (steps) steps.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    var desk = document.getElementById('cricri-install-desktop');
    if (desk) {
      desk.addEventListener('click', function () {
        if (deferredPrompt) {
          triggerNativeInstall();
          return;
        }
        setStatus('Use o QR no celular ou o menu ⋮ do Chrome no PC.', true);
      });
    }
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) {
      setStatus('Abra o menu ⋮ do Chrome e toque em Instalar app.', false);
      return;
    }
    try {
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') setStatus('Instalando…', true);
      else setStatus('Instalação cancelada — use o menu ⋮ se quiser tentar de novo.', false);
    } catch (_) {
      setStatus('Use o menu ⋮ do navegador → Instalar app.', false);
    }
  }

  function onInstallClick(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (isStandalone()) {
      setStatus && setStatus('App já instalado.', true);
      return;
    }
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
