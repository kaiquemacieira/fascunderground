/**
 * CRICRI · Gestos touch
 * - Swipe horizontal em tabs (feed / market / programação)
 * - Swipe para fechar painéis (a11y, busca, menu)
 * - Edge swipe (borda esquerda) → menu
 * - Pull-to-refresh suave no mural
 * Respeita data-a11y-motion="reduce" e prefers-reduced-motion
 */
(function (global) {
  'use strict';

  var THRESH_X = 56;
  var THRESH_Y = 64;
  var EDGE = 28;
  var MAX_PULL = 96;

  function reducedMotion() {
    return (
      document.documentElement.getAttribute('data-a11y-motion') === 'reduce' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function isInteractive(el) {
    if (!el || el === document.body) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a' || tag === 'label') {
      return true;
    }
    if (el.isContentEditable) return true;
    if (el.closest('input, textarea, select, button, a, [role="slider"], .leaflet-container')) return true;
    return false;
  }

  function track(el, handlers) {
    if (!el || el.dataset.touchBound === '1') return;
    el.dataset.touchBound = '1';

    var startX = 0, startY = 0, startT = 0;
    var lastX = 0, lastY = 0;
    var active = false;
    var pid = null;

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // só touch / pen para gestos de swipe (evita atrapalhar desktop)
      if (e.pointerType === 'mouse' && !handlers.allowMouse) return;
      if (handlers.ignoreInteractive && isInteractive(e.target)) return;
      active = true;
      pid = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      startT = Date.now();
      if (handlers.onStart) handlers.onStart({ x: startX, y: startY, event: e });
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onMove(e) {
      if (!active || (pid != null && e.pointerId !== pid)) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (handlers.onMove) {
        handlers.onMove({
          x: lastX,
          y: lastY,
          dx: lastX - startX,
          dy: lastY - startY,
          event: e
        });
      }
    }

    function onUp(e) {
      if (!active || (pid != null && e.pointerId !== pid)) return;
      active = false;
      var dx = (e.clientX || lastX) - startX;
      var dy = (e.clientY || lastY) - startY;
      var dt = Date.now() - startT;
      var absX = Math.abs(dx);
      var absY = Math.abs(dy);
      var dir = null;
      if (absX > THRESH_X && absX > absY * 1.15) dir = dx > 0 ? 'right' : 'left';
      else if (absY > THRESH_Y && absY > absX * 1.15) dir = dy > 0 ? 'down' : 'up';
      if (handlers.onEnd) {
        handlers.onEnd({
          dx: dx,
          dy: dy,
          dt: dt,
          dir: dir,
          edgeLeft: startX <= EDGE,
          edgeRight: startX >= window.innerWidth - EDGE,
          event: e
        });
      }
      pid = null;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onUp, { passive: true });
  }

  /* ---- tabs: swipe left/right ---- */
  function wireTabSwipe(containerSel, tabSel) {
    var root = document.querySelector(containerSel);
    if (!root) return;
    var tablist = root.querySelector('[role="tablist"], .feed-tabs, .market-tabs, .prog-tabs') || root;
    track(root, {
      ignoreInteractive: false,
      onEnd: function (g) {
        if (!g.dir || (g.dir !== 'left' && g.dir !== 'right')) return;
        if (Math.abs(g.dy) > 80) return;
        var tabs = Array.prototype.slice.call(
          (tablist || root).querySelectorAll(tabSel)
        ).filter(function (t) {
          return !t.disabled && t.offsetParent !== null;
        });
        if (tabs.length < 2) return;
        var i = tabs.findIndex(function (t) {
          return (
            t.getAttribute('aria-selected') === 'true' ||
            t.classList.contains('active') ||
            t.classList.contains('is-on')
          );
        });
        if (i < 0) i = 0;
        var next = g.dir === 'left' ? i + 1 : i - 1;
        if (next < 0 || next >= tabs.length) return;
        tabs[next].click();
        if (window.CricriKeyboard && window.CricriKeyboard.refresh) {
          try { window.CricriKeyboard.refresh(); } catch (_) {}
        }
      }
    });
  }

  /* ---- fechar painéis com swipe ---- */
  function closeA11y() {
    var toggle = document.getElementById('a11y-toggle');
    var panel = document.getElementById('a11y-panel');
    if (!panel || !toggle) return;
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    panel.hidden = true;
    panel.setAttribute('hidden', '');
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    var btn = document.getElementById('search-cancel') || document.getElementById('search-close');
    if (btn) btn.click();
    else {
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function closeMenu() {
    var toggle = document.getElementById('menu-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') toggle.click();
  }

  function openMenu() {
    var toggle = document.getElementById('menu-toggle');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
  }

  function wirePanelSwipes() {
    var a11y = document.getElementById('a11y-panel');
    if (a11y) {
      track(a11y, {
        onEnd: function (g) {
          if (g.dir === 'down' || g.dir === 'right') closeA11y();
        }
      });
    }
    var search = document.getElementById('search-overlay');
    if (search) {
      track(search, {
        onEnd: function (g) {
          if (g.dir === 'down') closeSearch();
        }
      });
    }
    var menu = document.getElementById('mobile-menu');
    if (menu) {
      track(menu, {
        onEnd: function (g) {
          if (g.dir === 'left') closeMenu();
        }
      });
    }
  }

  /* ---- edge swipe global ---- */
  function wireEdgeSwipe() {
    track(document.body, {
      ignoreInteractive: true,
      onEnd: function (g) {
        if (!g.dir) return;
        if (g.edgeLeft && g.dir === 'right') {
          openMenu();
          return;
        }
        // swipe right anywhere when menu open closes? handled in menu
        if (g.dir === 'down' && g.dy > 120 && window.scrollY < 40) {
          // possible pull — handled by pull module
        }
      }
    });
  }

  /* ---- pull to refresh no feed ---- */
  function wirePullToRefresh() {
    var feed = document.getElementById('feed') || document.querySelector('.feed-section');
    if (!feed) return;

    var indicator = document.getElementById('cricri-pull-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'cricri-pull-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.innerHTML = '<span>solte para atualizar</span>';
      document.body.appendChild(indicator);
    }

    var pulling = false;
    var startY = 0;

    track(feed, {
      ignoreInteractive: true,
      onStart: function (s) {
        pulling = window.scrollY <= 2;
        startY = s.y;
      },
      onMove: function (m) {
        if (!pulling || reducedMotion()) return;
        if (window.scrollY > 2) {
          pulling = false;
          indicator.classList.remove('is-visible', 'is-ready');
          return;
        }
        if (m.dy > 12 && m.dy > Math.abs(m.dx)) {
          var p = Math.min(1, m.dy / MAX_PULL);
          indicator.classList.add('is-visible');
          indicator.classList.toggle('is-ready', p >= 1);
          indicator.style.transform = 'translate(-50%, ' + Math.min(m.dy * 0.35, 48) + 'px)';
          indicator.querySelector('span').textContent = p >= 1 ? 'solte para atualizar' : 'puxe para atualizar';
        }
      },
      onEnd: function (g) {
        if (!pulling) {
          indicator.classList.remove('is-visible', 'is-ready');
          return;
        }
        pulling = false;
        var should = g.dy >= MAX_PULL && g.dir === 'down' && window.scrollY <= 4;
        indicator.classList.remove('is-visible', 'is-ready');
        indicator.style.transform = '';
        if (!should) return;
        indicator.classList.add('is-refreshing');
        indicator.querySelector('span').textContent = 'atualizando…';
        indicator.classList.add('is-visible');
        // dispara refresh custom / reload suave do mural
        try {
          document.dispatchEvent(new CustomEvent('cricri:pull-refresh'));
        } catch (_) {}
        // se existir função global de feed
        if (typeof global.cricriRefreshFeed === 'function') {
          Promise.resolve(global.cricriRefreshFeed()).finally(done);
        } else {
          setTimeout(done, 700);
        }
        function done() {
          indicator.classList.remove('is-visible', 'is-refreshing');
          indicator.querySelector('span').textContent = 'puxe para atualizar';
        }
      }
    });
  }

  function injectCSS() {
    if (document.getElementById('cricri-touch-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-touch-css';
    s.textContent = [
      '#cricri-pull-indicator{position:fixed;top:0;left:50%;transform:translate(-50%,-120%);z-index:99970;padding:0.45rem 0.9rem;border-radius:999px;background:rgba(28,21,17,0.92);border:1.5px solid rgba(227,61,107,0.45);color:#ebe3cf;font-family:Oswald,system-ui,sans-serif;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;box-shadow:0 8px 24px rgba(0,0,0,.35)}',
      '#cricri-pull-indicator.is-visible{opacity:1}',
      '#cricri-pull-indicator.is-ready{border-color:#e33d6b;box-shadow:0 0 16px rgba(227,61,107,.35)}',
      '#cricri-pull-indicator.is-refreshing{opacity:1;transform:translate(-50%,12px)!important}',
      'html[data-a11y-motion="reduce"] #cricri-pull-indicator{transition:none}',
      /* feedback leve em chips ao swipe de tabs */
      '.feed-tabs,.market-tabs,.prog-tabs{-webkit-user-select:none;user-select:none;touch-action:pan-y}',
      '.feed-section,.market-section,.prog-wrap{touch-action:pan-y}'
    ].join('');
    document.head.appendChild(s);
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    // só relevante em ponteiro fino/grosso touch
    if (!window.matchMedia('(pointer: coarse), (hover: none)').matches && !('ontouchstart' in window)) {
      // ainda registra edge mínimo? skip heavy — mas pull pode ser útil em trackpad; keep edge off
    }

    injectCSS();
    wireTabSwipe('.feed-section', '.feed-tab, [role="tab"]');
    wireTabSwipe('.market-section', '.market-tab, [role="tab"]');
    wireTabSwipe('.prog-wrap', '.prog-tab');
    wirePanelSwipes();
    wireEdgeSwipe();
    wirePullToRefresh();

    // rebind se a11y panel for recriado
    setTimeout(wirePanelSwipes, 1200);

    global.CricriTouch = {
      closeA11y: closeA11y,
      closeSearch: closeSearch,
      closeMenu: closeMenu
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
