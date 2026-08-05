// js/script.js — PROJANO / FASC+
console.log('PROJANO carregado com sucesso!');

// --- animação de entrada da página ---
(function bootPageMotion() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-a11y-motion') === 'reduce';
  function ready() {
    if (reduce) {
      document.body.classList.add('is-page-ready');
      return;
    }
    requestAnimationFrame(() => {
      document.body.classList.add('is-page-ready');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();


// --- FASC Motion (utilidades estilo Framer Motion) ---
(function bootFascMotion() {
  if (!window.fascMotion) return;
  // entrada em seções ao entrar na viewport
  try {
    window.fascMotion.inView(
      document.querySelectorAll('.feed-section, .manifesto, .map-section, .market-section'),
      function (el) {
        window.fascMotion.preset('fadeUp', el, { duration: 0.45, ease: window.fascMotion.ease.outQuart });
      },
      { once: true, rootMargin: '0px 0px -8% 0px' }
    );
    // cards do feed em stagger quando a seção aparece
    var feed = document.querySelector('.feed-wall, .feed-section .feed-wall, #feed');
    if (feed) {
      window.fascMotion.inView(feed, function () {
        var cards = feed.querySelectorAll('.post-card');
        if (cards.length) {
          window.fascMotion.stagger(
            cards,
            { opacity: '1', transform: 'translateY(0)' },
            {
              from: { opacity: '0', transform: 'translateY(14px)' },
              stagger: 0.06,
              duration: 0.4,
              ease: window.fascMotion.ease.outExpo
            }
          );
        }
      }, { once: true });
    }
  } catch (e) {
    console.warn('[fascMotion]', e);
  }
})();

// --- performance: pausa animações com aba oculta ---
(function bootAnimPerf() {
  function sync() {
    document.documentElement.classList.toggle('is-page-hidden', document.hidden);
  }
  document.addEventListener('visibilitychange', sync, { passive: true });
  sync();
})();

// --- microinterações: ripple + press nos botões ---
(function bootButtonMicro() {
  const reduce = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-a11y-motion') === 'reduce';

  function ripple(el, e) {
    if (reduce() || !el.classList.contains('btn')) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX != null ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e.clientY != null ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;
    const wave = document.createElement('span');
    wave.className = 'fasc-ripple';
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = x + 'px';
    wave.style.top = y + 'px';
    el.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
  }

  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .nav-item, .scrap-btn, .feed-tab, .auth-chip, .header-search-btn, .menu-toggle');
    if (!btn || btn.disabled) return;
    btn.classList.add('is-pressed');
    ripple(btn, e);
  }, { passive: true });

  const clear = () => {
    document.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
  };
  document.addEventListener('pointerup', clear, { passive: true });
  document.addEventListener('pointercancel', clear, { passive: true });
})();


// --- microinterações em inputs ---
(function bootInputMicro() {
  document.addEventListener('blur', (e) => {
    const el = e.target;
    if (!el || !(el.matches && el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'))) return;
    el.classList.remove('is-invalid', 'is-valid');
    if (!el.value) return;
    if (el.checkValidity && !el.checkValidity()) el.classList.add('is-invalid');
    else el.classList.add('is-valid');
  }, true);
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !el.classList) return;
    if (el.classList.contains('is-invalid') && el.checkValidity && el.checkValidity()) {
      el.classList.remove('is-invalid');
      el.classList.add('is-valid');
    }
  }, true);
})();

// --- toast global (usado por scrap e geoloc) ---
function showScrapToast(message) {
  let toast = document.querySelector('.scrap-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'scrap-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add('visible'));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

// --- menu hamburguer (mobile) ---
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function closeMobileMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  mobileMenu.classList.remove('visible');
  setTimeout(() => { mobileMenu.hidden = true; }, 220);
}

function openMobileMenu() {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.hidden = false;
  requestAnimationFrame(() => mobileMenu.classList.add('visible'));
  menuToggle.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Fechar menu');
}

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  mobileMenu.querySelectorAll('[data-mobile-link]').forEach(link => {
    link.addEventListener('click', () => closeMobileMenu());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

// --- transições de rota (seções + páginas) ---
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-a11y-motion') === 'reduce';
}

function ensureRouteVeil() {
  let veil = document.querySelector('.fasc-route-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.className = 'fasc-route-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
  }
  return veil;
}

function animateSectionEnter(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('is-route-enter', 'route-section');
  // reflow para reiniciar animação
  void el.offsetWidth;
  el.classList.add('route-section', 'is-route-enter');
  const done = () => el.classList.remove('is-route-enter');
  el.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 500);
}

async function navigateWithTransition(url) {
  if (prefersReducedMotion()) {
    window.location.href = url;
    return;
  }
  // View Transitions API (mesmo documento / cross-document onde suportado)
  if (document.startViewTransition) {
    try {
      const vt = document.startViewTransition(() => {
        window.location.href = url;
      });
      await vt.finished.catch(() => {});
      return;
    } catch (_) { /* fallback */ }
  }
  // Fallback: véu rosa/escuro
  const veil = ensureRouteVeil();
  veil.classList.remove('is-revealing');
  veil.classList.add('is-covering');
  window.setTimeout(() => {
    window.location.href = url;
  }, 200);
}

// intercepta links internos (profile.html ↔ index.html)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
  // só páginas locais do app
  if (!/(^|\/)(index\.html|profile\.html)(\?|#|$)/.test(href) && href !== './' && href !== '/') return;
  e.preventDefault();
  navigateWithTransition(a.href);
});

// --- bottom nav: troca active + scroll suave + animação de seção ---
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // rota externa: perfil
    if (item.dataset.route) {
      navigateWithTransition(item.dataset.route);
      return;
    }

    document.querySelectorAll('.nav-item').forEach(i => {
      i.classList.remove('active');
      i.removeAttribute('aria-current');
    });
    item.classList.add('active');
    item.setAttribute('aria-current', 'page');

    const targetId = item.dataset.target;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        animateSectionEnter(el);
        // se for o mapa, invalida tamanho e tenta recentralizar
        if (targetId === 'mapa' && window.projanoMap) {
          setTimeout(() => {
            window.projanoMap.map.invalidateSize();
            if (window.projanoMap.getPosition()) window.projanoMap.centerOnUser();
          }, 350);
        }
      }
    }
  });
});

// --- botão "Marcar meu rolê" (usa posição atual se disponível) ---
const btnMarcar = document.getElementById('btn-marcar');
if (btnMarcar && !window.CricriRoleRequest) {
  btnMarcar.addEventListener('click', () => {
    if (window.CricriRoleRequest && window.CricriRoleRequest.start) {
      window.CricriRoleRequest.start();
      return;
    }
    const api = window.projanoMap;
    const pos = api && api.getPosition ? api.getPosition() : null;
    if (pos) {
      const acc = pos.accuracy ? ` ±${Math.round(pos.accuracy)}m` : '';
      showScrapToast(`Rolê marcado na sua posição${acc}`);
      if (api.centerOnUser) {
        document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => api.centerOnUser(), 400);
      }
    } else {
      showScrapToast('Ative a localização para marcar o rolê no mapa');
      if (api && api.startWatching) api.startWatching();
      document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// --- envio de scrap (caixa postal em memória, sem persistência) ---
const SCRAP_LIMIT = 140;
const mailbox = {}; // { "bea.rocha": [ { message, time }, ... ], ... }
let openScrapBtn = null;

function closeScrapComposer() {
  document.querySelectorAll('.scrap-composer').forEach(el => el.remove());
  document.querySelectorAll('.scrap-btn.active').forEach(b => b.classList.remove('active'));
  openScrapBtn = null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function openScrapComposer(btn) {
  const user = btn.dataset.user || '';
  const actions = btn.closest('.post-actions');
  if (!actions) return;

  const composer = document.createElement('div');
  composer.className = 'scrap-composer';
  composer.innerHTML = `
    <div class="scrap-composer-label">scrap pra <b>${escapeHtml(user)}</b> · vai direto na caixa postal dela(e)</div>
    <textarea class="scrap-textarea" maxlength="${SCRAP_LIMIT}" placeholder="escreve seu recado..."></textarea>
    <div class="scrap-composer-footer">
      <span class="scrap-count">${SCRAP_LIMIT} restantes</span>
      <div class="scrap-composer-buttons">
        <button type="button" class="scrap-cancel-btn">cancelar</button>
        <button type="button" class="scrap-send-btn" disabled>enviar</button>
      </div>
    </div>
  `;
  actions.insertAdjacentElement('afterend', composer);

  const textarea = composer.querySelector('.scrap-textarea');
  const count = composer.querySelector('.scrap-count');
  const sendBtn = composer.querySelector('.scrap-send-btn');
  const cancelBtn = composer.querySelector('.scrap-cancel-btn');

  textarea.focus();

  textarea.addEventListener('input', () => {
    const remaining = SCRAP_LIMIT - textarea.value.length;
    count.textContent = `${remaining} restantes`;
    count.classList.toggle('limit', remaining <= 15);
    sendBtn.disabled = textarea.value.trim().length === 0;
  });

  cancelBtn.addEventListener('click', closeScrapComposer);

  sendBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;

    if (!mailbox[user]) mailbox[user] = [];
    mailbox[user].push({ message: text, time: new Date().toISOString() });

    closeScrapComposer();
    showScrapToast(`scrap enviado pra ${user}`);
  });

  btn.classList.add('active');
  openScrapBtn = btn;
}

// Delegação: funciona com cards renderizados depois (Supabase)
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.scrap-btn');
  if (!btn) return;
  e.preventDefault();
  if (openScrapBtn === btn) {
    closeScrapComposer();
    return;
  }
  closeScrapComposer();
  openScrapComposer(btn);
});

// --- marketplace: filtro por categoria ---
document.querySelectorAll('.market-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const cat = tab.dataset.marketCat;

    document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    let visibleCount = 0;
    document.querySelectorAll('.market-card').forEach(card => {
      const show = cat === 'todos' || card.dataset.category === cat;
      card.hidden = !show;
      if (show) visibleCount++;
    });

    const empty = document.getElementById('market-empty');
    if (empty) empty.hidden = visibleCount > 0;
  });
});

// --- alterna entre mural público e "só amigos" ---
document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.feed;

    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.feed-wall').forEach(wall => {
      const isTarget = wall.dataset.feedPanel === target;
      wall.classList.toggle('active', isTarget);
      wall.hidden = !isTarget;
    });
  });
});

// --- media: AVIF → WebP → fallback (posts / marketplace / avatar) ---
function createResponsivePicture({
  avif,
  webp,
  fallback,
  alt = '',
  className = '',
  width,
  height,
  sizes = '100vw',
  srcsetAvif,
  srcsetWebp,
  srcsetFallback
}) {
  const picture = document.createElement('picture');
  if (className) picture.className = className;

  // ordem importa: AVIF → WebP → img fallback
  if (avif || srcsetAvif) {
    const source = document.createElement('source');
    source.type = 'image/avif';
    source.srcset = srcsetAvif || avif;
    if (sizes) source.sizes = sizes;
    picture.appendChild(source);
  }

  if (webp || srcsetWebp) {
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = srcsetWebp || webp;
    if (sizes) source.sizes = sizes;
    picture.appendChild(source);
  }

  const img = document.createElement('img');
  img.src = fallback || webp || avif;
  if (srcsetFallback) img.srcset = srcsetFallback;
  if (sizes && srcsetFallback) img.sizes = sizes;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (width) img.width = width;
  if (height) img.height = height;
  if (avif) img.setAttribute('data-avif', '');
  if (webp) img.setAttribute('data-webp', '');
  picture.appendChild(img);
  return picture;
}

window.createResponsivePicture = createResponsivePicture;

// --- acessibilidade: delegado ao bootstrap inline no index.html ---
// Mantém apply se bootstrap ainda não rodou
(function initA11y() {
  function boot() {
    var panel = document.getElementById('a11y-panel');
    if (panel && panel.dataset.a11yReady === '1') return; // bootstrap já cuida
    // fallback mínimo
    if (typeof window.fascA11yApply !== 'function') {
      console.warn('[FASC+ a11y] bootstrap não detectado');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();




// --- navegação por teclado ---
(function initKeyboardNav() {
  document.documentElement.classList.add('js-kb');

  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function visible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)
      && getComputedStyle(el).visibility !== 'hidden');
  }

  function focusables(root) {
    return [...root.querySelectorAll(FOCUSABLE)].filter(visible);
  }

  // ---- Skip link já usa href; reforça foco no main ----
  const skip = document.querySelector('.skip-link');
  const main = document.getElementById('conteudo-principal');
  if (skip && main) {
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      main.focus({ preventScroll: false });
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---- Roving tabindex para tablists (setas) ----
  function setupRovingTabs(tablist) {
    if (!tablist) return;
    const getTabs = () => [...tablist.querySelectorAll('[role="tab"]')].filter(visible);

    function selectTab(tab, { focus = true } = {}) {
      const tabs = getTabs();
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('active', on);
      });
      if (focus) tab.focus();

      // feed panels
      const feed = tab.dataset.feed;
      if (feed) {
        document.querySelectorAll('.feed-wall').forEach((wall) => {
          const match = wall.dataset.feedPanel === feed;
          wall.classList.toggle('active', match);
          wall.hidden = !match;
        });
      }

      // market filter
      const cat = tab.dataset.marketCat;
      if (cat) {
        let visibleCount = 0;
        document.querySelectorAll('.market-card').forEach((card) => {
          const show = cat === 'todos' || card.dataset.category === cat;
          card.hidden = !show;
          if (show) visibleCount++;
        });
        const empty = document.getElementById('market-empty');
        if (empty) empty.hidden = visibleCount > 0;
      }
    }

    tablist.addEventListener('keydown', (e) => {
      const tabs = getTabs();
      if (!tabs.length) return;
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;

      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = tabs[(i + 1) % tabs.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = tabs[(i - 1 + tabs.length) % tabs.length];
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = tabs[0];
      } else if (e.key === 'End') {
        e.preventDefault();
        next = tabs[tabs.length - 1];
      }

      if (next) selectTab(next);
    });

    // click already handled elsewhere; keep aria in sync
    tablist.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab && tablist.contains(tab)) selectTab(tab, { focus: false });
    });
  }

  document.querySelectorAll('[role="tablist"]').forEach(setupRovingTabs);

  // ---- Bottom nav: setas esquerda/direita ----
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const items = () => [...bottomNav.querySelectorAll('.nav-item')].filter(visible);

    bottomNav.addEventListener('keydown', (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = list[(i + 1) % list.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = list[(i - 1 + list.length) % list.length];
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = list[0];
      } else if (e.key === 'End') {
        e.preventDefault();
        next = list[list.length - 1];
      }
      if (next) {
        next.focus();
        next.click();
      }
    });
  }

  // ---- Focus trap helper ----
  function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const list = focusables(container);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // A11y panel trap
  const a11yPanel = document.getElementById('a11y-panel');
  if (a11yPanel) {
    a11yPanel.addEventListener('keydown', (e) => trapFocus(a11yPanel, e));
  }

  // Mobile menu trap + setas
  const mobileMenu = document.getElementById('mobile-menu');
  const menuToggle = document.getElementById('menu-toggle');
  if (mobileMenu) {
    mobileMenu.addEventListener('keydown', (e) => {
      if (!mobileMenu.classList.contains('visible') && mobileMenu.hidden) return;
      trapFocus(mobileMenu, e);
    });
  }

  // When mobile menu opens, focus first link
  if (menuToggle && mobileMenu) {
    const obs = new MutationObserver(() => {
      if (menuToggle.classList.contains('open')) {
        const first = mobileMenu.querySelector('a, button');
        if (first) setTimeout(() => first.focus(), 50);
      }
    });
    obs.observe(menuToggle, { attributes: true, attributeFilter: ['class'] });
  }

  // ---- Atalhos globais ----
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target?.isContentEditable;
    if (typing) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    // 1-4 seções principais (quando não está em input)
    const map = {
      '1': 'hero',
      '2': 'feed',
      '3': 'marketplace',
      '4': 'mapa'
    };
    if (map[e.key]) {
      const el = document.getElementById(map[e.key]);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const focusTarget = el.querySelector('h1, h2, button, a, [tabindex]') || el;
        if (!focusTarget.hasAttribute('tabindex') && focusTarget === el) {
          el.setAttribute('tabindex', '-1');
        }
        focusTarget.focus({ preventScroll: true });
      }
    }
  });
})();


// --- validação automática de a11y (runtime, no console) ---
window.fascA11yAudit = function fascA11yAudit({ log = true } = {}) {
  const issues = [];
  const push = (level, rule, message, el) => issues.push({ level, rule, message, el });

  if (!document.documentElement.lang) push('error', 'html-lang', '<html> sem lang');
  if (!document.querySelector('main, [role="main"]')) push('error', 'landmark-main', 'Sem <main>');
  if (!document.querySelector('.skip-link, a[href="#conteudo-principal"]')) {
    push('error', 'skip-link', 'Skip link ausente');
  }

  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) push('error', 'img-alt', 'img sem alt', img);
  });

  document.querySelectorAll('button, a[href]').forEach((el) => {
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (!name && el.getAttribute('aria-hidden') !== 'true') {
      push('error', 'control-name', `<${el.tagName.toLowerCase()}> sem nome acessível`, el);
    }
  });

  document.querySelectorAll('button').forEach((btn) => {
    const text = (btn.textContent || '').trim();
    if (!text && !btn.getAttribute('aria-label') && !btn.getAttribute('aria-labelledby')) {
      if (btn.querySelector('svg')) push('error', 'icon-button-label', 'Botão ícone sem aria-label', btn);
    }
  });

  const ids = {};
  document.querySelectorAll('[id]').forEach((el) => {
    ids[el.id] = (ids[el.id] || 0) + 1;
  });
  Object.entries(ids).forEach(([id, n]) => {
    if (n > 1) push('error', 'duplicate-id', `id duplicado #${id} (${n}x)`);
  });

  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = list.querySelectorAll('[role="tab"]');
    if (![...tabs].some((t) => t.getAttribute('aria-selected') === 'true')) {
      push('warn', 'tabs-selected', 'tablist sem aria-selected=true', list);
    }
  });

  const map = document.getElementById('map');
  if (map && !map.getAttribute('aria-label') && !map.getAttribute('aria-labelledby')) {
    push('warn', 'map-label', 'Mapa sem nome acessível', map);
  }

  // foco: elementos com outline none sem alternativa
  let focusIssues = 0;
  document.querySelectorAll('a, button, input, textarea, select').forEach((el) => {
    const st = getComputedStyle(el);
    if (st.outlineStyle === 'none' && st.boxShadow === 'none') {
      // only count if no focus-visible rule likely — soft warn once
      focusIssues++;
    }
  });
  if (focusIssues > 40) {
    push('info', 'focus-check', 'Muitos controles sem outline computado — validar :focus-visible no teclado');
  }

  const summary = {
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warn').length,
    info: issues.filter((i) => i.level === 'info').length,
    issues
  };

  if (log) {
    console.group('FASC+ a11y audit');
    console.table(issues.map(({ level, rule, message }) => ({ level, rule, message })));
    console.log('Resumo', summary.errors, 'errors ·', summary.warnings, 'warnings');
    console.groupEnd();
  }
  return summary;
};

// auto-run em ?a11y=1
if (/[?&]a11y=1(?:&|$)/.test(location.search)) {
  window.addEventListener('load', () => window.fascA11yAudit());
}

// --- debug z-index / pointer-events ---
window.fascDebugStack = function fascDebugStack(on = true) {
  document.documentElement.setAttribute('data-debug-stack', on ? '1' : '0');
  const els = [
    ['body::before (grain)', null],
    ['.header', document.querySelector('.header')],
    ['.a11y-wrap', document.querySelector('.a11y-wrap')],
    ['.a11y-toggle', document.getElementById('a11y-toggle')],
    ['.a11y-panel', document.getElementById('a11y-panel')],
    ['.mobile-menu', document.getElementById('mobile-menu')],
    ['.bottom-nav', document.querySelector('.bottom-nav')]
  ];
  const rows = els.map(([name, el]) => {
    if (!el) return { name, note: 'n/a or pseudo' };
    const st = getComputedStyle(el);
    return {
      name,
      zIndex: st.zIndex,
      pointerEvents: st.pointerEvents,
      position: st.position,
      visibility: st.visibility,
      opacity: st.opacity,
      display: st.display
    };
  });
  console.table(rows);
  // hit-test center of a11y button
  const btn = document.getElementById('a11y-toggle');
  if (btn) {
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const topEl = document.elementFromPoint(x, y);
    console.log('elementFromPoint(a11y center):', topEl, topEl && topEl.outerHTML.slice(0, 120));
    console.log('button receives clicks?', topEl === btn || (btn.contains(topEl)));
  }
  return rows;
};

// --- busca FASC+ (overlay + índice + filtros) ---
(function initHeaderSearch() {
  const btn = document.getElementById('header-search-btn');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('header-search-input');
  const clearBtn = document.getElementById('search-clear');
  const cancelBtn = document.getElementById('search-cancel');
  const resultsEl = document.getElementById('search-results');
  const emptyEl = document.getElementById('search-empty');
  const hintEl = document.getElementById('search-hint');
  if (!btn || !overlay || !input || !resultsEl) return;

  let filter = 'todos';
  let activeIndex = -1;
  let lastItems = [];
  const SEARCH_HISTORY_KEY = 'fasc-search-history-v1';
  const HISTORY_MAX = 8;
  const historyWrap = document.getElementById('search-history');
  const historyList = document.getElementById('search-history-list');
  const historyEmpty = document.getElementById('search-history-empty');
  const historyClear = document.getElementById('search-history-clear');


  /** score 0..1 — subsequência + proximidade (typo leve) */
  function fuzzyScore(query, candidate) {
    const q = (query || '').trim().toLowerCase();
    const c = (candidate || '').trim().toLowerCase();
    if (!q) return 1;
    if (!c) return 0;
    if (c === q) return 1;
    if (c.startsWith(q)) return 0.95;
    if (c.includes(q)) return 0.85;

    // subsequência ordenada
    let qi = 0;
    let gaps = 0;
    let last = -1;
    for (let i = 0; i < c.length && qi < q.length; i++) {
      if (c[i] === q[qi]) {
        if (last >= 0) gaps += i - last - 1;
        last = i;
        qi++;
      }
    }
    if (qi === q.length) {
      const density = q.length / (q.length + gaps);
      return 0.55 + 0.3 * density;
    }

    // distância de Levenshtein limitada (typos)
    if (Math.abs(c.length - q.length) > 3) return 0;
    const rows = q.length + 1;
    const cols = c.length + 1;
    const d = new Array(rows);
    for (let i = 0; i < rows; i++) {
      d[i] = new Array(cols);
      d[i][0] = i;
    }
    for (let j = 0; j < cols; j++) d[0][j] = j;
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = q[i - 1] === c[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );
      }
    }
    const dist = d[q.length][c.length];
    const maxLen = Math.max(q.length, c.length) || 1;
    const sim = 1 - dist / maxLen;
    return sim >= 0.55 ? sim * 0.7 : 0;
  }

  function fuzzyFilterHistory(query, list) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list.map((term) => ({ term, score: 1 }));
    return list
      .map((term) => ({ term, score: fuzzyScore(q, term) }))
      .filter((x) => x.score >= 0.55)
      .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));
  }

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string' && x.trim()).slice(0, HISTORY_MAX) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    } catch (_) {}
  }

  function pushHistory(term) {
    const t = (term || '').trim().toLowerCase();
    if (!t || t.length < 2) return;
    const next = [t, ...loadHistory().filter((x) => x !== t)].slice(0, HISTORY_MAX);
    saveHistory(next);
    renderHistory();
  }

  function removeHistoryTerm(term) {
    saveHistory(loadHistory().filter((x) => x !== term));
    renderHistory();
  }

  function clearHistory() {
    saveHistory([]);
    renderHistory();
  }

  function renderHistory(filterQuery) {
    if (!historyList) return;
    const all = loadHistory();
    const ranked = fuzzyFilterHistory(filterQuery, all);
    historyList.innerHTML = '';
    if (historyClear) historyClear.hidden = all.length === 0;
    if (historyEmpty) {
      historyEmpty.hidden = ranked.length > 0;
      historyEmpty.textContent = all.length === 0
        ? 'Suas buscas aparecem aqui.'
        : (filterQuery ? 'Nenhuma busca recente parece com isso.' : 'Suas buscas aparecem aqui.');
    }

    ranked.forEach(({ term, score }) => {
      const li = document.createElement('li');
      li.className = 'search-history-item';
      const run = document.createElement('button');
      run.type = 'button';
      run.className = 'search-history-term';
      run.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span></span>';
      run.querySelector('span').textContent = term;
      if (score < 1 && filterQuery) {
        run.title = 'relevância ' + Math.round(score * 100) + '%';
      }
      run.addEventListener('click', () => {
        input.value = term;
        runSearch(term);
        input.focus();
      });
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'search-history-remove';
      rm.setAttribute('aria-label', 'Remover “' + term + '” do histórico');
      rm.textContent = '×';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        removeHistoryTerm(term);
      });
      li.appendChild(run);
      li.appendChild(rm);
      historyList.appendChild(li);
    });
  }

  function setHistoryVisible(show) {
    if (historyWrap) historyWrap.hidden = !show;
  }

  function buildIndex() {
    const items = [];

    document.querySelectorAll('.post-card').forEach((card, i) => {
      const name = card.querySelector('.post-name')?.textContent?.trim() || '';
      const text = card.querySelector('.post-text')?.textContent?.trim() || '';
      const place = card.querySelector('.post-place')?.textContent?.trim() || '';
      const status = card.querySelector('.post-status')?.textContent?.trim() || '';
      items.push({
        id: 'post-' + i,
        type: 'mural',
        title: name || 'Post',
        sub: [text, place, status].filter(Boolean).join(' · '),
        hay: (name + ' ' + text + ' ' + place + ' ' + status).toLowerCase(),
        el: card,
        section: 'feed'
      });
    });

    document.querySelectorAll('.market-card').forEach((card, i) => {
      const title = card.querySelector('.market-title')?.textContent?.trim()
        || card.querySelector('h3')?.textContent?.trim()
        || 'Item';
      const desc = card.querySelector('.market-desc')?.textContent?.trim() || '';
      const cat = card.dataset.category || 'market';
      const loc = card.querySelector('.market-location')?.textContent?.trim() || '';
      items.push({
        id: 'market-' + i,
        type: 'market',
        title,
        sub: [desc, cat, loc].filter(Boolean).join(' · '),
        hay: (title + ' ' + desc + ' ' + cat + ' ' + loc).toLowerCase(),
        el: card,
        section: 'marketplace'
      });
    });

    // spots do mapa (mock)
    const spots = (window.projanoMap && typeof window.projanoMap.getSpots === 'function'
      ? window.projanoMap.getSpots()
      : null) || [
      { name: 'Bar do Zé', status: 'rolando agora' },
      { name: 'Largo da Matriz', status: '62% pronto' },
      { name: 'Largo do Rosário', status: 'vai rolar às 23h' },
      { name: 'Quintal da Ana', status: 'terminou' },
      { name: 'Roda da Bica', status: 'rolando agora' }
    ];
    spots.forEach((s, i) => {
      const name = s.name || s.title || 'Ponto';
      const status = s.status || '';
      items.push({
        id: 'map-' + i,
        type: 'mapa',
        title: name,
        sub: status || 'Ponto no mapa FASC',
        hay: (name + ' ' + status).toLowerCase(),
        el: document.getElementById('mapa'),
        section: 'mapa',
        spot: s
      });
    });

    return items;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const safe = escapeHtml(text);
    let escaped = '';
    for (let i = 0; i < q.length; i++) {
      const ch = q[i];
      if ('.*+?^${}()|[]\\'.includes(ch)) escaped += '\\' + ch;
      else escaped += ch;
    }
    try {
      const re = new RegExp('(' + escaped + ')', 'ig');
      return safe.replace(re, '<mark>$1</mark>');
    } catch (err) {
      return safe;
    }
  }

  function render(items, q) {
    lastItems = items;
    activeIndex = items.length ? 0 : -1;
    resultsEl.innerHTML = '';
    if (hintEl) hintEl.hidden = !!q;
    if (emptyEl) emptyEl.hidden = !(q && !items.length);

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-result';
      btn.dataset.index = String(idx);
      if (idx === 0) btn.setAttribute('aria-selected', 'true');
      btn.innerHTML =
        '<span class="search-result-badge ' + item.type + '">' + item.type + '</span>' +
        '<span class="search-result-body">' +
          '<p class="search-result-title">' + highlight(item.title, q) + '</p>' +
          '<p class="search-result-sub">' + highlight(item.sub, q) + '</p>' +
        '</span>';
      btn.addEventListener('click', () => goTo(item));
      li.appendChild(btn);
      resultsEl.appendChild(li);
    });
  }

  function runSearch(q) {
    const term = (q || '').trim().toLowerCase();
    if (clearBtn) clearBtn.hidden = !term;
    if (!term) {
      render([], '');
      setHistoryVisible(true);
      renderHistory('');
      if (hintEl) hintEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      return;
    }
    const histHits = fuzzyFilterHistory(term, loadHistory());
    setHistoryVisible(histHits.length > 0);
    if (histHits.length) renderHistory(term);
    const index = buildIndex();
    const items = index.filter((it) => {
      if (filter !== 'todos' && it.type !== filter) return false;
      return it.hay.includes(term);
    }).slice(0, 20);
    render(items, term);
  }

  function goTo(item) {
    const q = (input.value || '').trim();
    if (q) pushHistory(q);
    close();
    const section = document.getElementById(item.section);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (item.el && item.el.classList && item.el.classList.contains('post-card')) {
      item.el.style.outline = '2px solid var(--rosa, #d42f62)';
      setTimeout(() => { item.el.style.outline = ''; }, 2200);
    }
    if (item.el && item.el.classList && item.el.classList.contains('market-card')) {
      item.el.style.outline = '2px solid var(--ochre, #c48a2a)';
      setTimeout(() => { item.el.style.outline = ''; }, 2200);
    }
    if (item.section === 'mapa' && window.projanoMap && item.spot) {
      setTimeout(() => {
        try {
          if (item.spot.lat && item.spot.lng) {
            window.projanoMap.map.setView([item.spot.lat, item.spot.lng], 17);
          }
          window.projanoMap.map.invalidateSize();
        } catch (_) {}
      }, 350);
    }
    if (typeof showScrapToast === 'function') {
      showScrapToast(item.type.toUpperCase() + ' · ' + item.title);
    }
  }

  function open() {
    overlay.hidden = false;
    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { try { input.focus(); } catch (_) {} }, 40);
    renderHistory();
    runSearch(input.value);
  }

  function close() {
    overlay.hidden = true;
    overlay.setAttribute('hidden', '');
    overlay.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // Bootstrap (fasc-search-boot) já bindou o botão.
  // Aqui só enriquecemos open/close com índice/histórico e reexportamos API.
  const bootOpen = window.fascOpenSearch;
  const bootClose = window.fascCloseSearch;

  function toggleSearch(e) {
    if (e) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    }
    const closed = overlay.hasAttribute('hidden') || overlay.hidden === true
      || getComputedStyle(overlay).display === 'none';
    if (closed) open();
    else close();
  }

  // sobrescreve open/close do boot com versão completa (histórico + busca)
  window.fascOpenSearch = open;
  window.fascCloseSearch = close;
  window.fascToggleSearch = toggleSearch;
  // NÃO adiciona outro listener no botão — evita open→close no mesmo gesto


  if (cancelBtn) cancelBtn.addEventListener('click', close);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      runSearch('');
      input.focus();
    });
  }

  let _openedAt = 0;
  const _openRef = open;
  open = function () {
    _openedAt = Date.now();
    _openRef();
  };
  // re-bind API after wrap
  window.fascOpenSearch = open;
  window.fascToggleSearch = toggleSearch;

  overlay.addEventListener('click', (e) => {
    // evita o mesmo toque que abriu fechar o overlay
    if (Date.now() - _openedAt < 400) return;
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) {
      close();
      btn.focus();
      return;
    }
    if (overlay.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!lastItems.length) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % lastItems.length;
      else activeIndex = (activeIndex - 1 + lastItems.length) % lastItems.length;
      const buttons = resultsEl.querySelectorAll('.search-result');
      buttons.forEach((b, i) => b.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false'));
      buttons[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && lastItems[activeIndex]) {
        e.preventDefault();
        goTo(lastItems[activeIndex]);
      } else if ((input.value || '').trim().length >= 2) {
        pushHistory(input.value);
      }
    }
  });

  input.addEventListener('input', () => {
    renderHistory(input.value);
    runSearch(input.value);
  });

  if (historyClear) {
    historyClear.addEventListener('click', (e) => {
      e.preventDefault();
      clearHistory();
    });
  }

  renderHistory();

  overlay.querySelectorAll('[data-search-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      filter = tab.getAttribute('data-search-filter') || 'todos';
      overlay.querySelectorAll('[data-search-filter]').forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      runSearch(input.value);
    });
  });

  // atalho / para abrir busca
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable) return;
      e.preventDefault();
      open();
    }
  });
})();


// --- debug de cliques no header ---
window.fascDebugHeaderClicks = function fascDebugHeaderClicks({ seconds = 8, log = true } = {}) {
  const names = {
    header: document.querySelector('.header'),
    menu: document.getElementById('menu-toggle'),
    search: document.getElementById('header-search-btn'),
    a11y: document.getElementById('a11y-toggle'),
    a11yWrap: document.querySelector('.a11y-wrap'),
    overlay: document.getElementById('search-overlay'),
    mobileMenu: document.getElementById('mobile-menu'),
  };

  function snap(el, name) {
    if (!el) return { name, exists: false };
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      name,
      exists: true,
      pointerEvents: st.pointerEvents,
      position: st.position,
      zIndex: st.zIndex,
      display: st.display,
      visibility: st.visibility,
      opacity: st.opacity,
      rect: {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        right: Math.round(r.right)
      },
      hidden: el.hasAttribute('hidden') || el.hidden === true
    };
  }

  function hit(el, label) {
    if (!el) return { label, exists: false };
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    const chain = [];
    let n = top;
    for (let i = 0; i < 6 && n; i++) {
      const cls = (n.className && typeof n.className === 'string')
        ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      chain.push((n.tagName || '?') + (n.id ? '#' + n.id : '') + cls);
      n = n.parentElement;
    }
    return {
      label,
      x: Math.round(x), y: Math.round(y),
      receives: !!(top && (top === el || el.contains(top))),
      top: chain[0] || null,
      chain
    };
  }

  const stack = Object.entries(names).map(([k, el]) => snap(el, k));
  const hits = ['menu', 'search', 'a11y'].map((k) => hit(names[k], k));

  const before = getComputedStyle(document.body, '::before');
  const bodyBefore = {
    pointerEvents: before.pointerEvents,
    zIndex: before.zIndex,
    position: before.position
  };

  const apis = {
    fascToggleSearch: typeof window.fascToggleSearch,
    fascOpenSearch: typeof window.fascOpenSearch,
    searchOnclick: !!(names.search && names.search.getAttribute('onclick'))
  };

  // overlap search x a11y
  const sr = names.search && names.search.getBoundingClientRect();
  const ar = names.a11y && names.a11y.getBoundingClientRect();
  let overlap = null;
  if (sr && ar) {
    overlap = !(sr.right <= ar.left || sr.left >= ar.right || sr.bottom <= ar.top || sr.top >= ar.bottom);
  }

  const summary = { stack, hits, bodyBefore, apis, overlapSearchA11y: overlap };

  if (log) {
    console.group('FASC+ header click debug');
    console.table(stack.map(({ name, pointerEvents, position, zIndex, display, rect }) => ({
      name, pointerEvents, position, zIndex, display,
      x: rect && rect.x, w: rect && rect.w, right: rect && rect.right
    })));
    console.table(hits.map(({ label, receives, top, x, y }) => ({ label, receives, top, x, y })));
    console.log('body::before', bodyBefore);
    console.log('APIs', apis, '| overlap search∩a11y =', overlap);
    console.log(`Capturando pointerdown/up/click por ${seconds}s — clique no header…`);
    console.groupEnd();
  }

  const events = [];
  const handler = (phase) => (e) => {
    const path = (e.composedPath ? e.composedPath() : []).slice(0, 6).map((n) => {
      if (!n || !n.tagName) return String(n);
      const cls = (n.className && typeof n.className === 'string')
        ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + cls;
    });
    const row = {
      phase,
      type: e.type,
      target: path[0] || null,
      path: path.join(' > '),
      prevented: e.defaultPrevented,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY)
    };
    events.push(row);
    console.log(`[header-click ${phase}]`, e.type, row.target, '@', row.x, row.y, e.defaultPrevented ? '(prevented)' : '');
  };

  const caps = [];
  ['pointerdown', 'pointerup', 'click'].forEach((t) => {
    const c = handler('capture');
    const b = handler('bubble');
    document.addEventListener(t, c, true);
    document.addEventListener(t, b, false);
    caps.push([t, c, b]);
  });

  setTimeout(() => {
    caps.forEach(([t, c, b]) => {
      document.removeEventListener(t, c, true);
      document.removeEventListener(t, b, false);
    });
    summary.events = events;
    console.group('FASC+ header click log');
    console.table(events.map(({ phase, type, target, x, y, prevented }) => ({ phase, type, target, x, y, prevented })));
    console.log('path completo no array summary.events');
    console.groupEnd();
  }, Math.max(1, seconds) * 1000);

  return summary;
};

console.info('[FASC+] debug: fascDebugHeaderClicks() · fascDebugStack(true)');

