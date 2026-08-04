/* CRICRI home-core */

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

/* --- js/auth-ui.js --- */
// FASC+ — chip Entrar/Perfil → profile.html
(function () {
  async function refreshChip() {
    const chip = document.getElementById('auth-chip');
    if (!chip) return;
    try {
      const user = window.fascAuth ? await window.fascAuth.user() : null;
      if (user) {
        const label = (user.email || 'perfil').split('@')[0];
        chip.textContent = label;
        chip.dataset.logged = '1';
        chip.setAttribute('href', 'profile.html');
        chip.setAttribute('aria-label', 'Abrir meu perfil');
      } else {
        chip.textContent = 'Entrar';
        chip.dataset.logged = '0';
        chip.setAttribute('href', 'profile.html');
        chip.setAttribute('aria-label', 'Entrar e abrir perfil');
      }
    } catch (_) {
      chip.textContent = 'Entrar';
    }
  }

  function boot() {
    refreshChip();
    if (window.fascAuth && window.fascAuth.onChange) {
      window.fascAuth.onChange(() => refreshChip());
    }
    console.info('[FASC auth] chip → profile.html');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* --- js/geo-offline.js --- */
/**
 * CRICRI · geolocalização offline (PWA)
 *
 * O Service Worker NÃO tem acesso a navigator.geolocation.
 * Estratégia: persistir o último fix bom no client e reutilizar
 * quando a rede ou o GPS falharem.
 *
 * - fresh  ≤ 3 min  → trata como GPS ao vivo (filtros de proximidade)
 * - recent ≤ 6 h    → útil offline / mapa “você estava aqui”
 * - stale  ≤ 24 h   → só fallback visual, com aviso
 */
(function () {
  var KEY = 'cricri_geo_last_v1';
  var FRESH_MS = 3 * 60 * 1000;
  var RECENT_MS = 6 * 60 * 60 * 1000;
  var STALE_MS = 24 * 60 * 60 * 1000;
  var CENTER_SC = { lat: -11.015, lng: -37.206, accuracy: 120, source: 0, source: 'centro' };

  function now() { return Date.now(); }

  function save(pos) {
    if (!pos || pos.lat == null || pos.lng == null) return;
    var payload = {
      lat: Number(pos.lat),
      lng: Number(pos.lng),
      accuracy: pos.accuracy != null ? Number(pos.accuracy) : null,
      time: pos.time || now(),
      heading: pos.heading != null ? Number(pos.heading) : null
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch (_) {}
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
      }
    } catch (_) {}
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (p == null || p.lat == null || p.lng == null) return null;
      p.lat = Number(p.lat);
      p.lng = Number(p.lng);
      p.time = Number(p.time) || 0;
      return p;
    } catch (_) {
      return null;
    }
  }

  function ageMs(pos) {
    if (!pos || !pos.time) return Infinity;
    return Math.max(0, now() - pos.time);
  }

  function classify(pos) {
    var a = ageMs(pos);
    if (a <= FRESH_MS) return 'fresh';
    if (a <= RECENT_MS) return 'recent';
    if (a <= STALE_MS) return 'stale';
    return 'expired';
  }

  /**
   * Melhor ponto disponível para o app:
   * 1) live (passado pelo caller)
   * 2) cache local
   * 3) centro histórico SC
   */
  function resolve(live) {
    var online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

    if (live && live.lat != null && live.lng != null) {
      var liveAge = live.time ? now() - live.time : 0;
      if (liveAge <= FRESH_MS) {
        return {
          lat: live.lat,
          lng: live.lng,
          accuracy: live.accuracy,
          time: live.time || now(),
          source: 'gps',
          quality: 'fresh',
          online: online
        };
      }
    }

    var cached = load();
    if (cached) {
      var q = classify(cached);
      if (q !== 'expired') {
        return {
          lat: cached.lat,
          lng: cached.lng,
          accuracy: cached.accuracy,
          time: cached.time,
          source: online ? 'cache' : 'offline',
          quality: q,
          online: online
        };
      }
    }

    return {
      lat: CENTER_SC.lat,
      lng: CENTER_SC.lng,
      accuracy: CENTER_SC.accuracy,
      time: 0,
      source: 'centro',
      quality: 'fallback',
      online: online
    };
  }

  function formatAge(pos) {
    var a = ageMs(pos);
    if (!isFinite(a) || a <= 0) return 'agora';
    if (a < 60000) return Math.round(a / 1000) + 's';
    if (a < 3600000) return Math.round(a / 60000) + ' min';
    if (a < 86400000) return Math.round(a / 3600000) + ' h';
    return Math.round(a / 86400000) + ' d';
  }

  function statusLabel(resolved) {
    if (!resolved) return 'sem posição';
    if (resolved.source === 'gps' && resolved.quality === 'fresh') return 'ao vivo';
    if (resolved.source === 'offline') return 'offline · ' + formatAge(resolved);
    if (resolved.source === 'cache') return 'cache · ' + formatAge(resolved);
    if (resolved.source === 'centro') return 'centro SC';
    return resolved.source || '—';
  }

  // Auto: salva quando o mapa emite posição
  window.addEventListener('projano:position', function (e) {
    var d = e && e.detail;
    if (d) save(d);
  });

  // Aviso de conectividade
  function emitNet() {
    try {
      window.dispatchEvent(new CustomEvent('cricri:connectivity', {
        detail: { online: navigator.onLine !== false }
      }));
    } catch (_) {}
  }
  window.addEventListener('online', emitNet);
  window.addEventListener('offline', emitNet);

  window.fascGeoOffline = {
    KEY: KEY,
    FRESH_MS: FRESH_MS,
    RECENT_MS: RECENT_MS,
    STALE_MS: STALE_MS,
    CENTER_SC: CENTER_SC,
    save: save,
    load: load,
    ageMs: ageMs,
    classify: classify,
    resolve: resolve,
    formatAge: formatAge,
    statusLabel: statusLabel
  };
})();

/* --- js/spots-api.js --- */
// FASC+ — spots: Supabase com fallback pro mock local
(function () {
  const FALLBACK = [
    { id: 'convento-sao-francisco', name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047, status: 'rolando agora', radius: 100 },
    { id: 'praca-sao-francisco', name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052, status: '62% pronto', radius: 120 },
    { id: 'igreja-matriz', name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068, status: 'vai rolar às 23h', radius: 90 },
    { id: 'largo-amparo', name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075, status: 'terminou', radius: 85 },
    { id: 'casa-do-sabao', name: 'Rua da Feira', lat: -11.014, lng: -37.208, status: 'rolando agora', radius: 95 }
  ];

  function normalize(row) {
    return {
      id: row.slug || row.id,
      name: row.name,
      lat: Number(row.lat),
      lng: Number(row.lng),
      radius: Number(row.radius_m != null ? row.radius_m : row.radius) || 90,
      status: row.status || 'sem info'
    };
  }

  async function fetchSpots() {
    const db = window.fascDb;
    if (!db) {
      console.warn('[FASC spots] sem client — usando fallback');
      return FALLBACK.map((s) => ({ ...s }));
    }
    try {
      const { data, error } = await db.from('spots').select('id,slug,name,lat,lng,radius_m,status').order('name');
      if (error) throw error;
      if (!data || !data.length) {
        console.warn('[FASC spots] tabela vazia — fallback');
        return FALLBACK.map((s) => ({ ...s }));
      }
      console.info('[FASC spots] carregados do Supabase:', data.length);
      return data.map(normalize);
    } catch (err) {
      console.warn('[FASC spots] falha API, fallback local:', err.message || err);
      return FALLBACK.map((s) => ({ ...s }));
    }
  }

  function subscribeSpots(onChange) {
    const db = window.fascDb;
    if (!db || typeof onChange !== 'function') return { unsubscribe() {} };
    const channel = db
      .channel('spots-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        (payload) => {
          console.info('[FASC spots] realtime', payload.eventType, payload.new || payload.old);
          onChange(payload);
        }
      )
      .subscribe();
    return {
      unsubscribe() {
        try { db.removeChannel(channel); } catch (_) {}
      }
    };
  }

  window.fascSpots = { fetchSpots, subscribeSpots, FALLBACK };
})();

/* --- js/events-api.js --- */
/**
 * CRICRI · eventos no mapa
 * Fonte 1: public.afters (+ spots) no Supabase
 * Fonte 2: fallback local (São Cristóvão · coords dos spots)
 */
(function () {
  // Coordenadas alinhadas aos spots do festival
  var VENUES = {
    'convento-sao-francisco': { name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047 },
    'praca-sao-francisco': { name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052 },
    'igreja-matriz': { name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068 },
    'largo-amparo': { name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075 },
    'casa-do-sabao': { name: 'Rua da Feira', lat: -11.014, lng: -37.208 },
    'largo-matriz': { name: 'Largo da Matriz', lat: -11.0138, lng: -37.2068 },
    'centro-sc': { name: 'Centro Histórico', lat: -11.015, lng: -37.206 }
  };

  var FALLBACK = [
    {
      id: 'ev-abertura',
      title: 'Abertura · CRICRI 079',
      category: 'música',
      starts_at: '2026-11-19T18:00:00-03:00',
      place: 'Praça São Francisco',
      lat: -11.0152,
      lng: -37.2052,
      status: 'programado'
    },
    {
      id: 'ev-cortejo',
      title: 'Cortejo pelo centro',
      category: 'cultura popular',
      starts_at: '2026-11-20T17:00:00-03:00',
      place: 'Largo da Matriz',
      lat: -11.0138,
      lng: -37.2068,
      status: 'programado'
    },
    {
      id: 'ev-projecao',
      title: 'Projeção no Largo',
      category: 'arte',
      starts_at: '2026-11-21T20:00:00-03:00',
      place: 'Largo do Amparo',
      lat: -11.0165,
      lng: -37.2075,
      status: 'programado'
    },
    {
      id: 'ev-fechamento',
      title: 'Noite de fechamento',
      category: 'música',
      starts_at: '2026-11-22T21:00:00-03:00',
      place: 'Convento São Francisco',
      lat: -11.0149,
      lng: -37.2047,
      status: 'programado'
    }
  ];

  function formatWhen(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return String(iso);
    }
  }

  function normalizeAfter(row) {
    var spot = row.spots || row.spot || null;
    var lat = spot && spot.lat != null ? Number(spot.lat) : null;
    var lng = spot && spot.lng != null ? Number(spot.lng) : null;
    var place = (spot && spot.name) || row.place_name || row.place || '';
    // se after sem join, tenta venue pelo título/categoria
    if ((lat == null || lng == null) && row.venue_slug && VENUES[row.venue_slug]) {
      lat = VENUES[row.venue_slug].lat;
      lng = VENUES[row.venue_slug].lng;
      place = place || VENUES[row.venue_slug].name;
    }
    if (lat == null || lng == null) {
      lat = VENUES['centro-sc'].lat;
      lng = VENUES['centro-sc'].lng;
      place = place || VENUES['centro-sc'].name;
    }
    return {
      id: row.id || row.slug || ('after-' + Math.random().toString(36).slice(2, 8)),
      title: row.title || row.name || 'Evento',
      category: row.category || 'evento',
      starts_at: row.starts_at || row.startsAt || null,
      when_label: formatWhen(row.starts_at || row.startsAt),
      place: place,
      lat: lat,
      lng: lng,
      status: row.status || 'programado',
      source: row._source || 'supabase'
    };
  }

  async function fetchEvents() {
    var db = window.fascDb;
    if (!db) {
      console.warn('[CRICRI events] sem client — fallback local');
      return FALLBACK.map(function (e) {
        return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
      });
    }
    try {
      var res = await db
        .from('afters')
        .select('id, title, category, starts_at, spot_id, spots:spot_id(name, lat, lng, slug)')
        .order('starts_at', { ascending: true })
        .limit(80);
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        console.warn('[CRICRI events] afters vazio — fallback local');
        return FALLBACK.map(function (e) {
          return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
        });
      }
      console.info('[CRICRI events] afters do Supabase:', rows.length);
      return rows.map(function (r) {
        r._source = 'supabase';
        return normalizeAfter(r);
      });
    } catch (err) {
      console.warn('[CRICRI events] falha API:', err.message || err);
      return FALLBACK.map(function (e) {
        return Object.assign({}, e, { when_label: formatWhen(e.starts_at), source: 'fallback' });
      });
    }
  }

  window.fascEvents = {
    fetchEvents: fetchEvents,
    FALLBACK: FALLBACK,
    VENUES: VENUES,
    formatWhen: formatWhen
  };
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
