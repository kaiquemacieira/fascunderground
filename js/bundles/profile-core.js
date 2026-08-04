/* CRICRI profile-core */

/* --- js/config.js --- */
// FASC+ — config pública (anon/publishable key é segura no front)
// NUNCA coloque service_role aqui.
window.FASC_CONFIG = {
  supabaseUrl: 'https://bcnbwshwehofncfkdnra.supabase.co',
  supabaseAnonKey: 'sb_publishable_k0iCZgl6qweP16tW3uiGYA_HTJYO1iK',
  env: 'dev',
  // Chave pública VAPID (npx web-push generate-vapid-keys). Privada só no backend.
  vapidPublicKey: '',

  // ---- GTFS-RT / previsão ao vivo ----
  // SMTT-CTM (Aracaju/SC) não publica feed aberto. Deixe vazio = modelo local.
  // Quando tiver proxy/API própria:
  transitRtUrl: '',              // JSON { delays: { "031": 3 } }
  gtfsRtTripUpdatesUrl: '',      // GTFS-RT Trip Updates (JSON preferível)
  gtfsRtVehicleUrl: ''           // GTFS-RT Vehicle Positions (JSON)
};


/* --- js/theme.js --- */
// FASC+ · tema (modo escuro da marca = default)
(function (global) {
  'use strict';

  var KEY = 'fasc-a11y-v1';
  var META = 'theme-color';

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeState(partial) {
    var s = readState();
    Object.keys(partial).forEach(function (k) { s[k] = partial[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    return s;
  }

  /** Resolve: dark | light  (default da marca = dark) */
  function resolveTheme(raw) {
    if (raw === 'light') return 'light';
    // "default" e "dark" → dark FASC
    return 'dark';
  }

  function applyTheme(raw, opts) {
    var theme = resolveTheme(raw);
    var html = document.documentElement;
    var prev = html.getAttribute('data-theme');
    var silent = opts && opts.silent;
    html.classList.add('theme-anim');
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-a11y-theme', theme === 'light' ? 'light' : 'dark');
    html.style.colorScheme = theme;
    clearTimeout(applyTheme._t);
    applyTheme._t = setTimeout(function () { html.classList.remove('theme-anim'); }, 400);

    var meta = document.querySelector('meta[name="' + META + '"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f6efdc' : '#0c0a08');
    }

    // botões opcionais
    document.querySelectorAll('[data-theme-set]').forEach(function (btn) {
      var v = btn.getAttribute('data-theme-set');
      btn.setAttribute('aria-pressed', resolveTheme(v) === theme ? 'true' : 'false');
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro FASC');
      btn.setAttribute('data-theme-current', theme);
    });

    if (!silent && prev !== theme) {
      try {
        global.dispatchEvent(new CustomEvent('fasc:theme', { detail: { theme: theme } }));
      } catch (_) {}
    }

    return theme;
  }

  function init() {
    var s = readState();
    // Marca FASC = escuro. Só light se o usuário escolheu e salvou.
    var raw = s.theme || 'dark';
    return applyTheme(raw);
  }

  function setTheme(raw) {
    var theme = resolveTheme(raw);
    writeState({ theme: theme });
    return applyTheme(theme);
  }

  function toggle() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    return setTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var setBtn = e.target.closest('[data-theme-set]');
      if (setBtn) {
        e.preventDefault();
        setTheme(setBtn.getAttribute('data-theme-set'));
        return;
      }
      var tog = e.target.closest('[data-theme-toggle]');
      if (tog) {
        e.preventDefault();
        toggle();
      }
    });
  }

  global.fascTheme = {
    init: init,
    set: setTheme,
    toggle: toggle,
    current: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
  };

  // boot imediato (antes do paint se o script for no head; no body também ok)
  init();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})(typeof window !== 'undefined' ? window : this);

/* --- js/supabase-client.js --- */
// FASC+ — client Supabase (vanilla)
(function () {
  const cfg = window.FASC_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    console.error('[FASC+] FASC_CONFIG ausente');
    window.fascAuth = null;
    return;
  }
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[FASC+] supabase-js não carregou (CDN)');
    window.fascAuth = null;
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.fascDb = client;

  /** Pós-OAuth / e-mail: volta pro login (animação → mural). */
  function profileRedirect() {
    try {
      var u = new URL('login.html', window.location.href);
      return u.origin + u.pathname;
    } catch (e) {
      return window.location.origin.replace(/\/$/, '') + '/login.html';
    }
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error((label || 'operação') + ' demorou demais'));
        }, ms);
      })
    ]);
  }

  window.fascAuth = {
    withTimeout: withTimeout,
    async session() {
      try {
        var res = await withTimeout(client.auth.getSession(), 2500, 'sessão');
        if (res.error) console.warn('[FASC auth]', res.error.message);
        return (res.data && res.data.session) || null;
      } catch (e) {
        console.warn('[FASC auth] session:', e.message || e);
        return null;
      }
    },
    async user() {
      var s = await this.session();
      return s ? s.user : null;
    },
    async signUp(email, password, name) {
      var res = await client.auth.signUp({
        email: String(email || '').trim(),
        password: String(password || ''),
        options: {
          emailRedirectTo: profileRedirect(),
          data: { name: name || 'novo usuário' }
        }
      });
      if (res.error) throw res.error;
      return res.data;
    },
    async signIn(email, password) {
      var res = await client.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || '')
      });
      if (res.error) throw res.error;
      return res.data;
    },
    async signInWithGoogle() {
      var redirectTo = profileRedirect();
      console.info('[FASC auth] Google redirectTo =', redirectTo);
      var res = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
          skipBrowserRedirect: false
        }
      });
      if (res.error) throw res.error;
      if (res.data && res.data.url) {
        window.location.assign(res.data.url);
      }
      return res.data;
    },
    async signOut() {
      var res = await client.auth.signOut();
      if (res.error) throw res.error;
    },
    onChange: function (cb) {
      var out = client.auth.onAuthStateChange(function (event, session) {
        try { cb(event, session); } catch (e) { console.warn(e); }
      });
      return out.data && out.data.subscription;
    }
  };

  console.info('[FASC+] Supabase client pronto ·', cfg.env || 'dev');
})();

/* --- js/notif-bell.js --- */
/**
 * CRICRI · sininho de notificações + engrenagem (todas as páginas)
 * Tipos: amigos, novos seguidores/conexões, scraps, SHOW em breve
 */
(function () {
  if (window.__cricriTopToolsMounted) return;
  window.__cricriTopToolsMounted = true;

  var DEMO = [
    { ico: '👥', title: 'Novo seguidor', body: 'alguém te adicionou nas conexões', kind: 'follower' },
    { ico: '✉️', title: 'Novo scrap', body: 'recado na sua caixinha', kind: 'scrap' },
    { ico: '🔥', title: 'Amigo online', body: 'alguém da roda está por perto', kind: 'friend' },
    { ico: '🎤', title: 'SHOW em breve', body: 'aviso de atração perto de você — em breve', kind: 'show' }
  ];

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function loadNotifs() {
    try {
      var raw = localStorage.getItem('cricri-notifs-v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DEMO.slice();
  }

  function saveNotifs(list) {
    try {
      localStorage.setItem('cricri-notifs-v1', JSON.stringify(list.slice(0, 40)));
    } catch (e) {}
  }

  
  /* CRICRI_TOP_TOOLS_LAYOUT — garante coluna sob o ♿ mesmo se CSS antigo conflitar */
  function applyTopToolsLayout(wrap) {
    if (!wrap) return;
    wrap.style.cssText = [
      'position:fixed',
      'top:calc(0.65rem + 44px + 0.45rem + env(safe-area-inset-top, 0px))',
      'right:max(0.65rem, env(safe-area-inset-right, 0px))',
      'left:auto',
      'z-index:5970',
      'display:flex',
      'flex-direction:column',
      'align-items:flex-end',
      'gap:0.45rem',
      'margin:0',
      'padding:0',
      'pointer-events:auto'
    ].join(';');
  }

  function mount() {
    // Sininho/ferramentas só na área do usuário (pedido de produto)
    var onProfile = document.body.classList.contains('page-profile')
      || /profile\.html/i.test(location.pathname || '')
      || document.getElementById('login-card');
    if (!onProfile) return;
    if (document.getElementById('cricri-top-tools')) {
      applyTopToolsLayout(document.getElementById('cricri-top-tools'));
      return;
    }

    var wrap = el('div', 'cricri-top-tools');
    wrap.id = 'cricri-top-tools';
    applyTopToolsLayout(wrap);
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Ferramentas e notificações');

    // Gear
    var gearBtn = el('button', 'cricri-tool-btn');
    gearBtn.type = 'button';
    gearBtn.id = 'cricri-gear-btn';
    gearBtn.setAttribute('aria-label', 'Ferramentas e configurações');
    gearBtn.setAttribute('aria-expanded', 'false');
    gearBtn.setAttribute('aria-controls', 'cricri-gear-panel');
    gearBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>' +
      '</svg>';

    var gearPanel = el('div', 'cricri-gear-panel');
    gearPanel.id = 'cricri-gear-panel';
    gearPanel.hidden = true;
    gearPanel.setAttribute('role', 'dialog');
    gearPanel.setAttribute('aria-label', 'Ferramentas');
    gearPanel.innerHTML =
      '<h2>Ferramentas</h2>' +
      '<p class="hint">Atalhos da roda · configurações rápidas</p>' +
      '<div class="gear-links">' +
        '<a href="profile.html"><span class="gear-ico" aria-hidden="true">👤</span> Área do usuário</a>' +
        '<a href="profile.html#inbox-card"><span class="gear-ico" aria-hidden="true">✉️</span> Minha caixinha</a>' +
        '<a href="index.html#mapa"><span class="gear-ico" aria-hidden="true">🗺️</span> Mapa ao vivo</a>' +
        '<a href="programacao.html"><span class="gear-ico" aria-hidden="true">📅</span> Programação</a>' +
        '<a href="tamagotchi.html"><span class="gear-ico" aria-hidden="true">🥚</span> Tamagotchi da roda</a>' +
        '<button type="button" class="gear-link" id="cricri-gear-a11y"><span class="gear-ico" aria-hidden="true">♿</span> Acessibilidade</button>' +
        '<button type="button" class="gear-link" id="cricri-gear-theme"><span class="gear-ico" aria-hidden="true">🌓</span> Alternar tema</button>' +
      '</div>';

    // Bell
    var bellBtn = el('button', 'cricri-tool-btn');
    bellBtn.type = 'button';
    bellBtn.id = 'cricri-notif-btn';
    bellBtn.setAttribute('aria-label', 'Notificações em tempo real');
    bellBtn.setAttribute('aria-expanded', 'false');
    bellBtn.setAttribute('aria-controls', 'cricri-notif-panel');
    bellBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
      '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
      '</svg>' +
      '<span class="badge" id="cricri-notif-badge" hidden>0</span>';

    var notifPanel = el('div', 'cricri-notif-panel');
    notifPanel.id = 'cricri-notif-panel';
    notifPanel.hidden = true;
    notifPanel.setAttribute('role', 'dialog');
    notifPanel.setAttribute('aria-label', 'Notificações');
    notifPanel.innerHTML =
      '<h2>Notificações</h2>' +
      '<p class="hint">Amigos, seguidores, scraps e SHOW em breve — em tempo real quando o push estiver ativo.</p>' +
      '<ul class="cricri-notif-list" id="cricri-notif-list"></ul>' +
      '<p class="cricri-notif-empty" id="cricri-notif-empty" hidden>Nada por agora. A roda avisa quando rolar.</p>' +
      '<div style="margin-top:0.55rem;display:flex;gap:0.4rem;flex-wrap:wrap">' +
        '<button type="button" class="btn btn-ghost" id="cricri-notif-clear" style="font-size:0.72rem;padding:0.4rem 0.6rem;border:1px solid rgba(235,227,207,0.2);background:transparent;color:inherit;border-radius:8px;cursor:pointer">Limpar</button>' +
        '<a href="profile.html" style="font-size:0.72rem;padding:0.4rem 0.6rem;border:1px solid rgba(227,61,107,0.4);background:rgba(227,61,107,0.12);color:#e33d6b;border-radius:8px;text-decoration:none">Ativar push</a>' +
      '</div>';

    wrap.appendChild(gearBtn);
    wrap.appendChild(gearPanel);
    wrap.appendChild(bellBtn);
    wrap.appendChild(notifPanel);
    document.body.appendChild(wrap);

    function renderList() {
      var list = loadNotifs();
      var ul = document.getElementById('cricri-notif-list');
      var empty = document.getElementById('cricri-notif-empty');
      var badge = document.getElementById('cricri-notif-badge');
      if (!ul) return;
      ul.innerHTML = '';
      list.forEach(function (n) {
        var li = document.createElement('li');
        li.innerHTML =
          '<span class="ico" aria-hidden="true">' + (n.ico || '•') + '</span>' +
          '<span class="meta"><strong>' + escapeHtml(n.title || '') + '</strong><span>' +
          escapeHtml(n.body || '') + '</span></span>';
        ul.appendChild(li);
      });
      if (empty) empty.hidden = list.length > 0;
      if (badge) {
        if (list.length) {
          badge.hidden = false;
          badge.textContent = String(Math.min(list.length, 9));
        } else {
          badge.hidden = true;
        }
      }
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function closeAll() {
      notifPanel.hidden = true;
      gearPanel.hidden = true;
      bellBtn.setAttribute('aria-expanded', 'false');
      gearBtn.setAttribute('aria-expanded', 'false');
    }

    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = notifPanel.hidden;
      closeAll();
      if (open) {
        notifPanel.hidden = false;
        bellBtn.setAttribute('aria-expanded', 'true');
        renderList();
      }
    });

    gearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = gearPanel.hidden;
      closeAll();
      if (open) {
        gearPanel.hidden = false;
        gearBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });

    var clearBtn = document.getElementById('cricri-notif-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        saveNotifs([]);
        renderList();
      });
    }

    var a11yBtn = document.getElementById('cricri-gear-a11y');
    if (a11yBtn) {
      a11yBtn.addEventListener('click', function () {
        closeAll();
        var t = document.getElementById('a11y-toggle') || document.querySelector('.a11y-toggle');
        if (t) t.click();
      });
    }

    var themeBtn = document.getElementById('cricri-gear-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var t = document.querySelector('[data-theme-toggle]');
        if (t) t.click();
        else {
          var html = document.documentElement;
          var cur = html.getAttribute('data-theme') || 'dark';
          var next = cur === 'light' ? 'dark' : 'light';
          html.setAttribute('data-theme', next);
          html.setAttribute('data-a11y-theme', next);
        }
      });
    }

    // API pública
    window.CricriNotifs = {
      push: function (item) {
        var list = loadNotifs();
        list.unshift({
          ico: item.ico || '•',
          title: item.title || 'CRICRI',
          body: item.body || '',
          kind: item.kind || 'info',
          at: Date.now()
        });
        saveNotifs(list);
        renderList();
      },
      clear: function () {
        saveNotifs([]);
        renderList();
      },
      list: loadNotifs
    };

    renderList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

/* --- js/footer.js --- */
/**
 * CRICRI · footer compartilhado (visual + markup)
 * DDD 079 · AcidBurn2026 · selo a11y
 */
(function () {
  var OFFICIAL = 'https://mapafasc.saocristovao.se.gov.br/';

  var css = [
    '.cricri-footer{position:relative;isolation:isolate;margin:0;padding:2.5rem 1.25rem 7rem;',
    'background:linear-gradient(180deg,#0a0908 0%,#14100e 100%);border-top:1px solid rgba(230,220,196,.1);',
    'color:#c4b9a6;font-family:Inter,system-ui,sans-serif;overflow:hidden}',
    '.cricri-footer-inner{max-width:36rem;margin:0 auto;text-align:center;position:relative;z-index:1}',
    '.cricri-footer-brand{display:flex;flex-direction:column;align-items:center;gap:.35rem;margin-bottom:1rem}',
    '.cricri-footer-mark{font-family:"Saira Stencil One",Oswald,Impact,sans-serif;font-size:clamp(1.6rem,5vw,2rem);',
    'letter-spacing:.06em;color:#e33d6b;line-height:1;position:relative;display:inline-block}',
    '.cricri-footer-mark::after{content:"";position:absolute;left:-4%;right:-4%;bottom:.05em;height:.22em;',
    'background:#d49a2c;opacity:.5;z-index:-1;transform:skewX(-8deg)}',
    '.cricri-footer-tag{font-family:Oswald,system-ui,sans-serif;font-size:.68rem;font-weight:600;',
    'letter-spacing:.14em;text-transform:uppercase;color:#8c8376}',
    '.cricri-footer-text{margin:0 auto 1rem;max-width:32rem;font-size:.88rem;line-height:1.55;color:#a89f90}',
    '.cricri-footer-text strong{color:#ebe3cf;font-weight:600}',
    '.cricri-footer-pulse{margin:0 auto 1.35rem;max-width:30rem;font-family:Oswald,system-ui,sans-serif;',
    'font-size:clamp(.95rem,2.6vw,1.12rem);font-weight:600;letter-spacing:.03em;line-height:1.35;color:#f2e8d2}',
    '.cricri-footer-links{margin:0 0 1.35rem}',
    '.cricri-footer-official{display:inline-flex;flex-direction:column;align-items:center;gap:.15rem;',
    'padding:.65rem 1.1rem;border:1.5px solid rgba(227,61,107,.35);border-radius:999px;text-decoration:none;',
    'background:rgba(227,61,107,.08);transition:border-color .15s,background .15s,transform .15s}',
    '.cricri-footer-official:hover{border-color:#e33d6b;background:rgba(227,61,107,.16);transform:translateY(-1px)}',
    '.cricri-footer-official-label{font-family:Oswald,system-ui,sans-serif;font-size:.62rem;letter-spacing:.12em;',
    'text-transform:uppercase;color:#f28aa8}',
    '.cricri-footer-official-url{font-size:.78rem;color:#ebe3cf}',
    '.cricri-footer-official-arrow{display:none}',
    '.cricri-footer-dev{margin:0 0 1.15rem;display:flex;flex-direction:column;gap:.15rem}',
    '.cricri-footer-dev-label{font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;color:#8c8376;',
    'font-family:Oswald,system-ui,sans-serif}',
    '.cricri-footer-dev-name{font-family:Oswald,system-ui,sans-serif;font-size:1rem;font-weight:700;',
    'letter-spacing:.06em;color:#ebe3cf}',
    '.cricri-footer-a11y{display:flex;gap:.65rem;align-items:flex-start;text-align:left;max-width:32rem;',
    'margin:0 auto 1.35rem;padding:.85rem 1rem;border-radius:10px;border:1px solid rgba(230,220,196,.12);',
    'background:rgba(255,255,255,.03)}',
    '.cricri-footer-a11y-badge{flex-shrink:0;width:2rem;height:2rem;display:grid;place-items:center;',
    'border-radius:999px;background:rgba(227,61,107,.15);font-size:1rem}',
    '.cricri-footer-a11y-text{display:flex;flex-direction:column;gap:.25rem;font-size:.75rem;line-height:1.45;color:#a89f90}',
    '.cricri-footer-a11y-text strong{color:#ebe3cf;font-size:.78rem}',
    '.cricri-footer-meta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.35rem .55rem;',
    'font-family:"Space Mono",ui-monospace,monospace;font-size:.68rem;color:#8c8376;line-height:1.4}',
    '.cricri-footer-meta strong{color:#e33d6b;font-weight:700}',
    '.cricri-footer-dot{opacity:.45}',
    '.cricri-footer-manifesto{margin:0 auto 1.25rem;max-width:28rem;font-family:Oswald,system-ui,sans-serif;font-size:clamp(1.35rem,4.2vw,1.85rem);font-weight:600;letter-spacing:.04em;line-height:1.25;color:#f2e8d2}','.cricri-footer-manifesto span{color:#e33d6b}','.cricri-footer-about{margin:0 auto 1.25rem;max-width:32rem;text-align:left;padding:1rem 1.1rem;border-radius:12px;border:1px solid rgba(230,220,196,.12);background:rgba(255,255,255,.03)}','.cricri-footer-about-eyebrow{margin:0 0 .35rem;font-family:Oswald,system-ui,sans-serif;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:#e33d6b}','.cricri-footer-about-lead{margin:0 0 .55rem;font-family:Oswald,system-ui,sans-serif;font-size:1.05rem;font-weight:600;color:#ebe3cf}','.cricri-footer-glow{pointer-events:none;position:absolute;inset:auto 10% -40%;height:8rem;',
    'background:radial-gradient(ellipse at center,rgba(227,61,107,.12),transparent 70%);z-index:0}',
    '@media (min-width:700px){.cricri-footer{padding:3rem 2rem 7.5rem}.cricri-footer-a11y{padding:1rem 1.25rem}}'
  ].join('');

  var html =
    '<footer class="cricri-footer" role="contentinfo">' +
      '<div class="cricri-footer-inner">' +
        '<div class="cricri-footer-brand">' +
          '<span class="cricri-footer-mark">CRICRI</span>' +
          '<span class="cricri-footer-tag">projeto independente · pro povo do festival</span>' +
        '</div>' +
        '<p class="cricri-footer-manifesto" aria-label="Manifesto">' +
          'Não é mapa. <span>É a cidade viva.</span>' +
        '</p>' +
        '<div class="cricri-footer-about" id="sobre">' +
          '<p class="cricri-footer-about-eyebrow">Sobre</p>' +
          '<p class="cricri-footer-about-lead">CRICRI é o mural da cidade.</p>' +
          '<p class="cricri-footer-text">' +
            'A camada viva onde São Cristóvão cola seus próprios cartazes — quem tá tocando agora, onde a roda formou, o que rolou na esquina. ' +
            'O nome vem do som do grilo ao entardecer: o ruído constante de fundo que nunca cala.' +
          '</p>' +
          '<p class="cricri-footer-text">' +
            'Não somos o site oficial — programação e mapa institucional usam como <strong>referência</strong> o portal da prefeitura.' +
          '</p>' +
        '</div>' +
        '<p class="cricri-footer-pulse">' +
          'A performance é de quem está na rua — vivência, paixão e o que a cidade cola no mural.' +
        '</p>' +
        '<div class="cricri-footer-links">' +
          '<a class="cricri-footer-official" href="' + OFFICIAL + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="cricri-footer-official-label">Referência oficial</span>' +
            '<span class="cricri-footer-official-url">mapafasc.saocristovao.se.gov.br ↗</span>' +
          '</a>' +
        '</div>' +
        '<div class="cricri-footer-dev">' +
          '<span class="cricri-footer-dev-label">Desenvolvedora &amp; idealizadora</span>' +
          '<strong class="cricri-footer-dev-name">AcidBurn2026</strong>' +
        '</div>' +
        '<div class="cricri-footer-a11y" role="note">' +
          '<span class="cricri-footer-a11y-badge" aria-hidden="true">♿</span>' +
          '<div class="cricri-footer-a11y-text">' +
            '<strong>Certificado digital de acessibilidade</strong>' +
            '<span>Contraste, texto, movimento, teclado, gestos e Libras. WCAG 2.2 · eMAG. Selo interno CRICRI.</span>' +
          '</div>' +
        '</div>' +
        '<div class="cricri-footer-meta">' +
          '<span>São Cristóvão · SE</span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>DDD <strong>079</strong></span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>CRICRI <strong>079</strong></span>' +
          '<span class="cricri-footer-dot" aria-hidden="true">·</span>' +
          '<span>19–22/11/2026</span>' +
        '</div>' +
      '</div>' +
      '<div class="cricri-footer-glow" aria-hidden="true"></div>' +
    '</footer>';


  function injectCss() {
    if (document.getElementById('cricri-footer-css')) return;
    var s = document.createElement('style');
    s.id = 'cricri-footer-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount() {
    injectCss();
    var slot = document.getElementById('site-footer-slot');
    if (slot) {
      slot.innerHTML = html;
      return;
    }
    var nav = document.querySelector('.bottom-nav');
    var wrap = document.createElement('div');
    wrap.id = 'site-footer-slot';
    wrap.innerHTML = html;
    if (nav && nav.parentNode) nav.parentNode.insertBefore(wrap, nav);
    else document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
