/**
 * CRICRI bottom-nav — complementa o HTML estático (menu já no DOM)
 */
(function () {
  'use strict';

  function forceVisible(nav) {
    if (!nav) return;
    var s = nav.style;
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('bottom', '0', 'important');
    s.setProperty('left', '0', 'important');
    s.setProperty('right', '0', 'important');
    s.setProperty('top', 'auto', 'important');
    s.setProperty('opacity', '1', 'important');
    s.setProperty('visibility', 'visible', 'important');
    s.setProperty('display', 'grid', 'important');
    s.setProperty('transform', 'none', 'important');
    s.setProperty('z-index', '2147483000', 'important');
    s.setProperty('pointer-events', 'auto', 'important');
    // move to body end so nothing clips it
    if (nav.parentElement !== document.body) {
      document.body.appendChild(nav);
    }
  }

  function openCreateSheet() {
    var sheet = document.getElementById('cricri-create-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'cricri-create-sheet';
      sheet.setAttribute('hidden', '');
      sheet.innerHTML =
        '<div class="cs-card" role="dialog" aria-label="Criar" style="width:min(100%,400px);background:#141414;border-radius:18px 18px 0 0;border:1px solid rgba(250,250,247,.12);padding:1rem;color:#FAFAF7;margin-top:auto">' +
        '<div style="width:40px;height:4px;border-radius:99px;background:rgba(250,250,247,.2);margin:0 auto .85rem"></div>' +
        '<h2 style="margin:0 0 .75rem;font:700 .95rem Inter,system-ui;text-align:center">O que você quer fazer?</h2>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.55rem">' +
        '<a href="feed.html" style="border:1px solid rgba(250,250,247,.14);border-radius:14px;padding:.9rem;text-align:center;color:#FAFAF7;text-decoration:none;font:600 .8rem Inter,system-ui">✦ Scrap</a>' +
        '<a href="explorar.html" style="border:1px solid rgba(250,250,247,.14);border-radius:14px;padding:.9rem;text-align:center;color:#FAFAF7;text-decoration:none;font:600 .8rem Inter,system-ui">◎ Rolê</a>' +
        '<a href="profile.html" style="border:1px solid rgba(250,250,247,.14);border-radius:14px;padding:.9rem;text-align:center;color:#FAFAF7;text-decoration:none;font:600 .8rem Inter,system-ui">☺ Perfil</a>' +
        '<a href="tamagotchi.html" style="border:1px solid rgba(250,250,247,.14);border-radius:14px;padding:.9rem;text-align:center;color:#FAFAF7;text-decoration:none;font:600 .8rem Inter,system-ui">♡ Cri</a>' +
        '</div>' +
        '<button type="button" id="cs-close" style="margin-top:.75rem;width:100%;border:0;background:transparent;color:rgba(250,250,247,.5);font:600 .75rem Inter,system-ui;padding:.65rem;cursor:pointer">Fechar</button>' +
        '</div>';
      sheet.style.cssText = 'position:fixed;inset:0;z-index:2147483001;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.setAttribute('hidden', ''); });
      var cl = sheet.querySelector('#cs-close');
      if (cl) cl.addEventListener('click', function () { sheet.setAttribute('hidden', ''); });
    }
    sheet.removeAttribute('hidden');
    sheet.style.display = 'flex';
  }

  function markActive() {
    var p = (location.pathname || '').split('/').pop() || 'index.html';
    p = p.toLowerCase();
    var map = {
      home: p === 'index.html' || p === '' || p === '/',
      feed: p.indexOf('feed') !== -1 || p.indexOf('explorar') !== -1,
      notifs: p.indexOf('notification') !== -1,
      perfil: p.indexOf('profile') !== -1 || p.indexOf('login') !== -1 || p.indexOf('tamagotchi') !== -1
    };
    document.querySelectorAll('nav.bottom-nav[data-cricri-nav="1"] a.bn-item').forEach(function (a) {
      var id = a.getAttribute('data-bn');
      if (map[id]) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function wireCreate() {
    document.querySelectorAll('.bn-create, #bn-create-btn').forEach(function (btn) {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openCreateSheet();
      });
    });
  }

  function ensureNav() {
    var nav = document.querySelector('nav.bottom-nav[data-cricri-nav="1"]');
    if (!nav) {
      // fallback: create minimal nav if static missing
      var slot = document.getElementById('bottom-nav-slot') || document.body;
      var wrap = document.createElement('div');
      wrap.innerHTML = '<nav class="bottom-nav" data-cricri-nav="1" aria-label="Navegação"><a class="bn-item" href="index.html">Home</a><a class="bn-item" href="feed.html">Feed</a><div class="bn-create-wrap"><button type="button" class="bn-create" aria-label="Criar">+</button></div><a class="bn-item" href="notifications.html">Avisos</a><a class="bn-item" href="profile.html">Perfil</a></nav>';
      nav = wrap.firstChild;
      slot.appendChild(nav);
    }
    forceVisible(nav);
    markActive();
    wireCreate();
    try {
      document.body.classList.add('is-page-ready');
      document.body.classList.remove('nav-hidden');
    } catch (_) {}
    return nav;
  }

  function boot() {
    if (!document.body) { setTimeout(boot, 20); return; }
    ensureNav();
    setTimeout(ensureNav, 100);
    setTimeout(ensureNav, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.CricriBottomNav = {
    mount: ensureNav,
    openCreate: openCreateSheet,
    updateNotifBadge: function (n) {
      var b = document.querySelector('[data-bn-badge]');
      if (!b) return;
      if (n > 0) { b.hidden = false; b.textContent = String(Math.min(n, 9)); }
      else b.hidden = true;
    }
  };
})();
