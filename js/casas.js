/**
 * CRICRI · Comunidades / Casas — lista simples (drawer)
 */
(function () {
  'use strict';
  if (window.__cricriCasasMounted) return;
  window.__cricriCasasMounted = true;

  var ICONS = {
    house: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h4.2v-5.2h4.6V20H18.5v-9.5"/></svg>',
    goat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9.5c-1.2-2-1.5-4.2-.6-5.2.7 1.8-.2 3.2-.2 3.2S10 6.5 11.2 9c.6-1.8 2.5-2.2 3.4-1.2 1.4 1.4.8 4.2-1.2 5.6-2 1.4-5.2.8-6.6-1.2-.7-1-.7-2 0-2.7z"/><path d="M9 14.5v3.2M15 14.5v3.2"/><path d="M8.5 20h7"/></svg>',
    vase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-.8 3.2c1.8.6 3 2.2 3 4.3 0 2.8-2.2 5-5.2 5s-5.2-2.2-5.2-5c0-2.1 1.2-3.7 3-4.3L9 4z"/><path d="M10 16.5V20h4v-3.5"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="16" r="2.4"/></svg>'
  };

  var CASAS = [
    { id: 'maria', name: 'Casa de Maria', icon: 'house', members: 301, tag: 'São Cristóvão' },
    { id: 'lucas', name: 'Casa de Lucas', icon: 'goat', members: 132, tag: 'Rodas' },
    { id: 'liria', name: 'Casa de Liria', icon: 'vase', members: 214, tag: 'Ateliê' },
    { id: 'joao', name: 'Casa de João', icon: 'music', members: 87, tag: 'Shows' }
  ];

  function iconSvg(key) {
    return ICONS[key] || ICONS.house;
  }

  function ensureDrawer() {
    if (document.getElementById('casas-drawer')) {
      return {
        drawer: document.getElementById('casas-drawer'),
        overlay: document.getElementById('casas-overlay')
      };
    }

    var overlay = document.createElement('div');
    overlay.id = 'casas-overlay';
    overlay.className = 'casas-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    var rows = CASAS.map(function (c, i) {
      return (
        '<li class="casas-item" style="--i:' + i + '">' +
          '<div class="house-icon" aria-hidden="true">' + iconSvg(c.icon) + '</div>' +
          '<div class="casas-row-meta">' +
            '<div class="casas-row-title">' + c.name + '</div>' +
            '<div class="casas-row-sub">' + c.members + ' membros · ' + c.tag + '</div>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    var drawer = document.createElement('aside');
    drawer.id = 'casas-drawer';
    drawer.className = 'casas-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Comunidades');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="casas-drawer-head">' +
        '<div>' +
          '<p class="casas-kicker">FASC · São Cristóvão</p>' +
          '<h2>Comunidades</h2>' +
        '</div>' +
        '<button type="button" class="casas-open-btn" id="casas-close" aria-label="Fechar">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="casas-drawer-scroll">' +
        '<p class="casas-section-title">Casas da cena</p>' +
        '<ul class="casas-list" role="list">' + rows + '</ul>' +
        '<p class="casas-foot-note">Em breve você poderá entrar e cadastrar uma casa.</p>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    function openDrawer() {
      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      drawer.classList.remove('is-open');
      overlay.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.getElementById('casas-close').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    window.CricriCasas = { open: openDrawer, close: closeDrawer, list: CASAS };
    return { drawer: drawer, overlay: overlay };
  }

  function bindOpen(btn) {
    if (!btn || btn.dataset.casasBound === '1') return btn;
    btn.dataset.casasBound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      ensureDrawer();
      if (window.CricriCasas) window.CricriCasas.open();
    });
    return btn;
  }

  function ensureOpenButton() {
    var existing = document.getElementById('casas-open');
    if (existing) return bindOpen(existing);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'casas-open';
    btn.className = 'casas-open-btn';
    btn.setAttribute('aria-label', 'Abrir comunidades');
    btn.title = 'Comunidades';
    btn.innerHTML = '<span class="dots-icon" aria-hidden="true"><span></span><span></span><span></span></span>';

    var slot =
      document.querySelector('.profile-topbar') ||
      document.querySelector('.header') ||
      document.querySelector('header.home-top') ||
      document.querySelector('.topbar') ||
      document.querySelector('header');

    if (slot) slot.insertBefore(btn, slot.firstChild);
    else document.body.appendChild(btn);

    return bindOpen(btn);
  }

  function mount() {
    ensureDrawer();
    ensureOpenButton();
    var d = document.getElementById('casas-drawer');
    var o = document.getElementById('casas-overlay');
    if (d) d.classList.remove('is-open');
    if (o) o.classList.remove('is-open');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
