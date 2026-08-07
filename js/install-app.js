/**
 * CRICRI · Baixar app (PWA)
 * Botão sempre visível no mobile (exceto se já estiver instalado).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cricri-app-downloaded-v1';
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

  function injectCss() {
    var old = document.getElementById('cricri-install-css');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'cricri-install-css';
    s.textContent = [
      '#' + BTN_ID + '{',
      'position:fixed!important;',
      'left:max(0.7rem,env(safe-area-inset-left,0px))!important;',
      'right:auto!important;',
      'bottom:calc(76px + env(safe-area-inset-bottom,0px))!important;',
      'top:auto!important;',
      'z-index:2147483645!important;',
      'display:inline-flex!important;',
      'visibility:visible!important;',
      'opacity:1!important;',
      'align-items:center!important;',
      'justify-content:center!important;',
      'gap:0.4rem!important;',
      'min-height:48px!important;',
      'min-width:48px!important;',
      'padding:0.65rem 1rem!important;',
      'border-radius:999px!important;',
      'border:2px solid #0a0a0a!important;',
      'background:#E6BE49!important;',
      'color:#1a1400!important;',
      'font:700 0.78rem/1 Oswald,system-ui,sans-serif!important;',
      'letter-spacing:0.06em!important;',
      'text-transform:uppercase!important;',
      'cursor:pointer!important;',
      'box-shadow:0 6px 24px rgba(0,0,0,0.5)!important;',
      'pointer-events:auto!important;',
      'transform:none!important;',
      'filter:none!important;',
      '-webkit-tap-highlight-color:transparent!important;',
      'touch-action:manipulation!important;',
      '}',
      '#' + BTN_ID + '.is-standalone-hidden{display:none!important}',
      '#' + BTN_ID + ' svg{width:18px;height:18px;flex-shrink:0;pointer-events:none}',
      '#' + BTN_ID + ' span{pointer-events:none}',
      /* sheet */
      '#cricri-install-sheet{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:flex-end;justify-content:center;',
      'background:rgba(0,0,0,0.55);padding-bottom:env(safe-area-inset-bottom,0)}',
      '#cricri-install-sheet .sheet{width:min(100%,400px);max-height:min(92vh,720px);overflow:auto;background:#14110f;border-radius:18px 18px 0 0;',
      'border:1px solid rgba(230,220,196,0.14);padding:1.1rem 1.1rem 1.25rem;color:#ebe3cf}',
      '#cricri-install-sheet h2{margin:0 0 0.5rem;font:700 1rem/1.2 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase}',
      '#cricri-install-sheet p,#cricri-install-sheet ol{margin:0 0 0.65rem;font-size:0.85rem;line-height:1.45;color:#cfc5b4}',
      '#cricri-install-sheet ol{padding-left:1.2rem}',
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
      'html[data-theme="light"] #cricri-install-sheet .sheet{background:#fffef8;color:#17120e}'
    ].join('');
    document.head.appendChild(s);
  }

  function forceShow(btn) {
    if (!btn) return;
    btn.classList.remove('is-standalone-hidden');
    btn.removeAttribute('hidden');
    btn.hidden = false;
    var st = btn.style;
    st.setProperty('position', 'fixed', 'important');
    st.setProperty('left', 'max(0.7rem, env(safe-area-inset-left, 0px))', 'important');
    st.setProperty('right', 'auto', 'important');
    st.setProperty('bottom', 'calc(76px + env(safe-area-inset-bottom, 0px))', 'important');
    st.setProperty('top', 'auto', 'important');
    st.setProperty('z-index', '2147483645', 'important');
    st.setProperty('display', 'inline-flex', 'important');
    st.setProperty('visibility', 'visible', 'important');
    st.setProperty('opacity', '1', 'important');
    st.setProperty('pointer-events', 'auto', 'important');
    st.setProperty('transform', 'none', 'important');
    st.setProperty('filter', 'none', 'important');
  }

  function forceHide(btn) {
    if (!btn) return;
    btn.classList.add('is-standalone-hidden');
    btn.hidden = true;
    btn.style.setProperty('display', 'none', 'important');
  }

  function updateVisibility() {
    var btn = document.getElementById(BTN_ID);
    if (!btn) return;
    if (isStandalone()) forceHide(btn);
    else forceShow(btn);
  }

  function ensureButton() {
    var btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Baixar app CRICRI');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/>' +
        '</svg><span>Baixar app</span>';
      document.body.appendChild(btn);
    }
    if (btn.parentElement !== document.body) {
      document.body.appendChild(btn);
    }
    if (!btn.__cricriShareBound) {
      btn.__cricriShareBound = true;
      btn.addEventListener('click', onInstallClick);
    }
    updateVisibility();
    return btn;
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
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) closeSheet();
    });
    document.getElementById('cricri-install-gotit').addEventListener('click', closeSheet);
    var copyBtn = document.getElementById('cricri-install-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var input = document.getElementById('cricri-install-url');
        var val = (input && input.value) || url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).then(function () {
            setStatus('Link copiado ✓', true);
          }).catch(function () {
            setStatus('Selecione e copie o link', false);
          });
        } else {
          setStatus('Selecione e copie o link', false);
        }
      });
    }
    var now = document.getElementById('cricri-install-now');
    if (now) {
      now.addEventListener('click', function () { triggerNativeInstall(); });
    }
    var ios = document.getElementById('cricri-install-ios');
    if (ios) {
      ios.addEventListener('click', function () {
        setStatus('Safari → Compartilhar → Adicionar à Tela de Início', true);
      });
    }
    var openBtn = document.getElementById('cricri-install-open');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (deferredPrompt) {
          triggerNativeInstall();
          return;
        }
        setStatus('No menu do navegador, use “Instalar app” ou “Adicionar à tela inicial”.', false);
      });
    }
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
      if (choice && choice.outcome === 'accepted') {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
        setStatus('Instalando…', true);
        updateVisibility();
      } else {
        setStatus('Instalação cancelada', false);
      }
    } catch (e) {
      setStatus('Não foi possível abrir o instalador.', false);
    }
  }

  function onInstallClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (deferredPrompt) {
      showSheet();
      return;
    }
    showSheet();
  }

  function wirePrompt() {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      ensureButton();
      updateVisibility();
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      updateVisibility();
      closeSheet();
    });
  }

  function boot() {
    if (!document.body) {
      setTimeout(boot, 30);
      return;
    }
    injectCss();
    wirePrompt();
    ensureButton();
    // reafirma várias vezes (chrome / a11y / SW podem interferir)
    [100, 400, 1000, 2500, 5000].forEach(function (ms) {
      setTimeout(function () {
        ensureButton();
        updateVisibility();
      }, ms);
    });
    // se o body for reescrito tarde
    try {
      var mo = new MutationObserver(function () {
        if (!document.getElementById(BTN_ID) && !isStandalone()) ensureButton();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CricriInstall = {
    prompt: onInstallClick,
    isStandalone: isStandalone,
    show: function () { ensureButton(); updateVisibility(); },
    refresh: function () { ensureButton(); updateVisibility(); }
  };
})();
