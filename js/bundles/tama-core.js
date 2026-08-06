/* CRICRI tama-core */

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

/* --- js/tamagotchi.js --- */
// CRICRI · Tamagotchi da Roda — São Cristóvão / SE
(function () {
  'use strict';

  var STORAGE = 'cricri-tama-v3';
  var STORAGE_LEGACY = ['fasc-tama-v2', 'cricri-tama-v2'];
  var EVENT_END = new Date('2026-11-23T12:00:00-03:00').getTime();
  var TICK_MS = 30 * 1000;
  var AWAY_DECAY_PER_H = 4;

  var SHELLS = {
    rosa: { fur: '#e33d6b', furLight: '#f7c9d6', furEar: '#ffe1ea' },
    ocre: { fur: '#d49a2c', furLight: '#f7e2b4', furEar: '#ffe9b8' },
    azul: { fur: '#1b6f7e', furLight: '#b8e6ef', furEar: '#d6f4fa' },
    tuxedo: { fur: '#2a2621', furLight: '#f6efdc', furEar: '#d9d0bd' }
  };

  var STAGES = [
    { id: 'ovo', minAgeH: 0, label: 'Ovo' },
    { id: 'bebe', minAgeH: 1, label: 'Bebê' },
    { id: 'filhote', minAgeH: 8, label: 'Filhote' },
    { id: 'cria', minAgeH: 36, label: 'Cria' },
    { id: 'festa', minAgeH: 96, label: 'Festeira' },
    { id: 'adulta', minAgeH: 168, label: 'Roda' },
    { id: 'ancia', minAgeH: 288, label: 'Anciã' }
  ];

  var CARD_CATALOG = [
    { id: 'c_ovo', name: 'Casca Rosa', rarity: 'comum', emoji: '🥚', how: 'Nascer' },
    { id: 'c_pastel', name: 'Pastel da Feira', rarity: 'comum', emoji: '🥟', how: 'Comer 3×' },
    { id: 'c_banho', name: 'Banho de Caneco', rarity: 'comum', emoji: '🧼', how: 'Limpar 3×' },
    { id: 'c_soneca', name: 'Soneca na Praça', rarity: 'comum', emoji: '😴', how: 'Dormir' },
    { id: 'c_mapa', name: 'Mapa do Centro', rarity: 'comum', emoji: '🗺️', how: 'Explorar mapa' },
    { id: 'r_filhote', name: 'Filhote do Cortejo', rarity: 'raro', emoji: '🐤', how: 'Evoluir p/ Filhote' },
    { id: 'r_convento', name: 'Luz do Convento', rarity: 'raro', emoji: '⛪', how: 'Evoluir p/ Cria' },
    { id: 'r_after', name: 'After SE', rarity: 'raro', emoji: '🌙', how: 'After 2×' },
    { id: 'r_scrap', name: 'Scrap de Rua', rarity: 'raro', emoji: '✉️', how: 'Scrap 3×' },
    { id: 'r_care', name: 'Cuidadora', rarity: 'raro', emoji: '💗', how: 'Care 15' },
    { id: 'sr_lenda', name: 'Lenda CRICRI', rarity: 'super', emoji: '👑', how: 'Virar Anciã' },
    { id: 'sr_sergipe', name: 'Sergipe Inteiro', rarity: 'super', emoji: '🔶', how: 'Care 40' },
    { id: 'sr_festival', name: 'CRICRI 2026', rarity: 'super', emoji: '🎉', how: 'Últimos 3 dias vivos' },
    { id: 'sr_ouro', name: 'Photocard Ouro', rarity: 'super', emoji: '✨', how: 'Evoluir 5×' }
  ];

  var RARITY_LABEL = { comum: 'Comum', raro: 'Raro', super: 'Super raro' };
  var FAREWELL = 'A roda está acabando… obrigado por ficar comigo até aqui. Foi lindo.';
  var FAREWELL_DONE = 'O FASC fechou o portão. Você cuidou de mim até o fim — gratidão de São Cristóvão.';
  var FAREWELL_LATE = 'Últimos dias juntos. Cada carinho vira memória.';

  function $(id) { return document.getElementById(id); }
  function reducedMotion() {
    try {
      if (window.fascA11yMotion) return window.fascA11yMotion.prefersReduced();
      return document.documentElement.getAttribute('data-a11y-motion') === 'reduce'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) { return false; }
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function lifeRemainingMs() { return Math.max(0, EVENT_END - Date.now()); }
  function ageHours(s) { return Math.max(0, (Date.now() - s.bornAt) / 3600000); }

  function defaultState() {
    var now = Date.now();
    return {
      started: false, name: 'Roda', bornAt: now, lastTick: now,
      hunger: 85, happy: 85, energy: 85, hygiene: 85, health: 100,
      shell: 'rosa', sleeping: false, sick: false, alive: true,
      careScore: 0, feedCount: 0, playCount: 0, cleanCount: 0,
      afterCount: 0, scrapCount: 0, stageId: 'ovo', evolutions: 0,
      cards: {}, log: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) {
        for (var i = 0; i < STORAGE_LEGACY.length; i++) {
          raw = localStorage.getItem(STORAGE_LEGACY[i]);
          if (raw) break;
        }
      }
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      // nunca descarta progresso salvo
      var merged = Object.assign(defaultState(), parsed);
      if (parsed.started) merged.started = true;
      if (parsed.bornAt) merged.bornAt = parsed.bornAt;
      if (parsed.name) merged.name = parsed.name;
      var legacyShell = { classic: 'rosa', amarelo: 'ocre', stencil: 'tuxedo' };
      if (!SHELLS[merged.shell]) merged.shell = legacyShell[merged.shell] || 'rosa';
      return merged;
    } catch (_) { return defaultState(); }
  }
  function save(s) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(s));
      // limpa legacy só depois de gravar
      for (var i = 0; i < STORAGE_LEGACY.length; i++) {
        try { localStorage.removeItem(STORAGE_LEGACY[i]); } catch (_) {}
      }
    } catch (_) {}
    scheduleCloudSave(s);
    registerBgSync();
  }

  var cloudTimer = null;
  function scheduleCloudSave(s) {
    if (cloudTimer) clearTimeout(cloudTimer);
    cloudTimer = setTimeout(function () { cloudSave(s); }, 1200);
  }

  async function currentUserId() {
    try {
      if (!window.fascAuth || !window.fascAuth.user) return null;
      var u = await window.fascAuth.user();
      return u && u.id ? u.id : null;
    } catch (_) { return null; }
  }

  async function cloudSave(s) {
    try {
      var uid = await currentUserId();
      if (!uid || !window.fascDb) return;
      // tabela opcional tama_state (user_id PK, state jsonb, updated_at)
      var payload = {
        user_id: uid,
        state: s,
        updated_at: new Date().toISOString()
      };
      var res = await window.fascDb.from('tama_state').upsert(payload, { onConflict: 'user_id' });
      if (res.error) {
        if (/relation|schema cache|tama_state/i.test(res.error.message || '')) {
          var fb = await window.fascDb.from('profiles').update({ tama_state: s }).eq('id', uid);
          if (fb.error && typeof window.__cricriSyncFail === 'function') {
            window.__cricriSyncFail(fb.error.message || 'tama profile fallback', {
              source: 'tamagotchi', phase: 'cloudSave-fallback', tag: 'cricri-tama-sync'
            });
          }
        } else if (typeof window.__cricriSyncFail === 'function') {
          window.__cricriSyncFail(res.error.message || 'tama_state upsert', {
            source: 'tamagotchi', phase: 'cloudSave', tag: 'cricri-tama-sync'
          });
        }
      }
    } catch (e) {
      console.info('[tama] cloud save skip', e && e.message);
      if (typeof window.__cricriSyncFail === 'function') {
        window.__cricriSyncFail(e && e.message || 'tama cloud save', {
          source: 'tamagotchi', phase: 'cloudSave', tag: 'cricri-tama-sync'
        });
      }
    }
  }

  async function cloudLoad() {
    try {
      var uid = await currentUserId();
      if (!uid || !window.fascDb) return null;
      var res = await window.fascDb.from('tama_state').select('state,updated_at').eq('user_id', uid).maybeSingle();
      if (res.error || !res.data || !res.data.state) return null;
      return res.data.state;
    } catch (_) { return null; }
  }

  function registerBgSync() {
    try {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.sync) reg.sync.register('cricri-tama-sync').catch(function () {});
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_TAMA_SYNC' });
        }
      });
    } catch (_) {}
  }

  function wireBgMessages() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (!ev.data) return;
      if (ev.data.type === 'CRICRI_TAMA_TICK' || ev.data.type === 'CRICRI_BG_SYNC') {
        try {
          if (typeof window.__tamaForceTick === 'function') window.__tamaForceTick();
        } catch (_) {}
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && typeof window.__tamaForceTick === 'function') {
        window.__tamaForceTick();
      }
    });
  }

  function formatAge(s) {
    var h = ageHours(s);
    var d = Math.floor(h / 24), hr = Math.floor(h % 24), m = Math.floor((h * 60) % 60);
    if (d > 0) return d + 'd ' + hr + 'h';
    if (hr > 0) return hr + 'h ' + m + 'm';
    return m + ' min';
  }
  function formatLife() {
    var ms = lifeRemainingMs();
    if (ms <= 0) return 'Fim da roda';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60);
    if (d > 0) return d + 'd ' + h + 'h restantes';
    return h + 'h ' + m + 'm restantes';
  }
  function lifePhase() {
    var ms = lifeRemainingMs();
    if (ms <= 0) return 'ended';
    if (ms <= 86400000) return 'dying';
    if (ms <= 3 * 86400000) return 'late';
    return 'ok';
  }
  function stageForAge(hours) {
    var cur = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (hours >= STAGES[i].minAgeH) cur = STAGES[i];
    return cur;
  }
  function nextStage(st) {
    for (var i = 0; i < STAGES.length - 1; i++) if (STAGES[i].id === st.id) return STAGES[i + 1];
    return null;
  }
  function evolutionProgress(s) {
    var hours = ageHours(s);
    var cur = stageForAge(hours);
    var nxt = nextStage(cur);
    if (!nxt) return 1;
    return clamp((hours - cur.minAgeH) / (nxt.minAgeH - cur.minAgeH), 0, 1);
  }
  function pushLog(s, msg) {
    s.log = s.log || [];
    s.log.unshift({ t: Date.now(), msg: msg });
    if (s.log.length > 10) s.log.length = 10;
  }

  function showCardToast(card) {
    var el = $('card-toast');
    if (!el) return;
    el.hidden = false;
    el.className = 'card-toast rarity-' + card.rarity;
    el.innerHTML = '<span class="ct-emoji">' + card.emoji + '</span><span><strong>' + card.name +
      '</strong><small>' + RARITY_LABEL[card.rarity] + '</small></span>';
    clearTimeout(showCardToast._t);
    showCardToast._t = setTimeout(function () { el.hidden = true; }, 2800);
  }

  function grantCard(s, cardId, silent) {
    var card = null;
    for (var i = 0; i < CARD_CATALOG.length; i++) if (CARD_CATALOG[i].id === cardId) card = CARD_CATALOG[i];
    if (!card) return false;
    s.cards = s.cards || {};
    if (s.cards[cardId]) { s.cards[cardId].count += 1; return false; }
    s.cards[cardId] = { count: 1, at: Date.now() };
    if (!silent) { pushLog(s, 'Photocard: ' + card.name); showCardToast(card); }
    return true;
  }

  function checkCardMilestones(s) {
    if (s.feedCount >= 3) grantCard(s, 'c_pastel', true);
    if (s.cleanCount >= 3) grantCard(s, 'c_banho', true);
    if (s.afterCount >= 2) grantCard(s, 'r_after');
    if (s.scrapCount >= 3) grantCard(s, 'r_scrap');
    if (s.careScore >= 15) grantCard(s, 'r_care');
    if (s.careScore >= 40) grantCard(s, 'sr_sergipe');
    if (s.evolutions >= 5) grantCard(s, 'sr_ouro');
    if (lifePhase() === 'late' && s.alive) grantCard(s, 'sr_festival');
  }

  function checkEvolution(s) {
    if (!s.alive || !s.started) return false;
    var byAge = stageForAge(ageHours(s));
    var prev = s.stageId || 'ovo';
    if (byAge.id === prev) return false;
    var prevIdx = 0, nextIdx = 0;
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === prev) prevIdx = i;
      if (STAGES[i].id === byAge.id) nextIdx = i;
    }
    if (nextIdx <= prevIdx) { s.stageId = byAge.id; return false; }
    s.stageId = byAge.id;
    s.evolutions = (s.evolutions || 0) + 1;
    pushLog(s, 'Evoluiu → ' + byAge.label);
    if (byAge.id === 'filhote') grantCard(s, 'r_filhote');
    if (byAge.id === 'cria') grantCard(s, 'r_convento');
    if (byAge.id === 'ancia') grantCard(s, 'sr_lenda');
    return true;
  }

  function applyAwayDecay(s) {
    if (!s.started || !s.alive) return;
    var now = Date.now();
    var elapsed = Math.max(0, now - (s.lastTick || now));
    if (elapsed < 60000) { s.lastTick = now; checkEvolution(s); return; }
    var hours = elapsed / 3600000;
    var factor = hours * AWAY_DECAY_PER_H;
    if (s.sleeping) factor *= 0.35;
    s.hunger = clamp(s.hunger - factor * 1.1, 0, 100);
    s.happy = clamp(s.happy - factor * 0.9, 0, 100);
    s.energy = clamp(s.energy + (s.sleeping ? factor * 2 : -factor * 0.7), 0, 100);
    s.hygiene = clamp(s.hygiene - factor * 0.6, 0, 100);
    if (s.hunger < 15 || s.hygiene < 15) s.sick = true;
    if (s.sick) s.health = clamp(s.health - factor * 1.5, 0, 100);
    if (s.health <= 0 || (s.hunger <= 0 && s.happy <= 0)) {
      s.alive = false;
      pushLog(s, 'Foi embora… renasça quando quiser.');
    }
    s.lastTick = now;
    checkEvolution(s);
    checkCardMilestones(s);
  }

  function tickOpen(s) {
    if (!s.started || !s.alive) return;
    if (Date.now() >= EVENT_END) {
      s.alive = false;
      pushLog(s, FAREWELL_DONE);
      return;
    }
    var decay = s.sleeping ? 0.4 : 1;
    s.hunger = clamp(s.hunger - 1.2 * decay, 0, 100);
    s.happy = clamp(s.happy - 0.9 * decay, 0, 100);
    s.energy = clamp(s.energy + (s.sleeping ? 3 : -0.8), 0, 100);
    s.hygiene = clamp(s.hygiene - 0.5 * decay, 0, 100);
    if (s.hunger < 12 || s.hygiene < 12) s.sick = true;
    if (s.sick) s.health = clamp(s.health - 2, 0, 100);
    if (s.health <= 0) { s.alive = false; pushLog(s, 'Saúde zerou.'); }
    s.lastTick = Date.now();
    if (checkEvolution(s)) flashEvolve();
    checkCardMilestones(s);
  }

  var state = load();
  applyAwayDecay(state);
  save(state);

  function catExpr(s) {
    if (!s.alive) return 'dead';
    if (s.sick) return 'sick';
    if (s.sleeping) return 'sleep';
    var m = mood(s);
    if (m === 'happy') return 'happy';
    if (m === 'sad') return 'sad';
    return 'normal';
  }
  function mood(s) {
    if (!s.alive) return 'gone';
    if (s.sleeping) return 'sleep';
    if (s.sick) return 'sick';
    var avg = (s.hunger + s.happy + s.energy + s.hygiene) / 4;
    if (avg > 75) return 'happy';
    if (avg > 45) return 'ok';
    return 'sad';
  }
  function bar(el, val) {
    if (!el) return;
    var v = clamp(val, 0, 100);
    el.style.width = v + '%';
    el.classList.toggle('is-low', v < 25);
    el.classList.toggle('is-ok', v >= 25 && v < 70);
    el.classList.toggle('is-high', v >= 70);
  }
  function flashEvolve() {
    if (reducedMotion()) return;
    var stage = $('tama-cat-stage');
    if (!stage) return;
    stage.classList.remove('is-pop');
    void stage.offsetWidth;
    stage.classList.add('is-pop');
  }
  var blinkTimer = null;
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    var delay = 2400 + Math.random() * 2600;
    blinkTimer = setTimeout(function () {
      var stage = $('tama-cat-stage');
      if (stage && !reducedMotion()) {
        stage.classList.add('is-blink');
        setTimeout(function () { stage.classList.remove('is-blink'); }, 140);
      }
      scheduleBlink();
    }, delay);
  }

  function setTab(name) {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-tab') === name ? 'true' : 'false');
    });
    document.querySelectorAll('[data-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== name;
    });
  }

  function renderCollection() {
    var grid = $('collection-grid');
    if (!grid) return;
    var owned = state.cards || {};
    grid.innerHTML = CARD_CATALOG.map(function (c) {
      var has = !!owned[c.id];
      var count = has ? owned[c.id].count : 0;
      return '<article class="photo-card rarity-' + c.rarity + (has ? ' is-owned' : ' is-locked') + '">' +
        '<div class="pc-art">' + (has ? c.emoji : '❔') + '</div>' +
        '<div class="pc-meta"><span class="pc-rarity">' + RARITY_LABEL[c.rarity] + '</span>' +
        '<strong class="pc-name">' + (has ? c.name : '???') + '</strong>' +
        '<span class="pc-how">' + (has ? (count > 1 ? '×' + count : c.how) : 'Bloqueado') + '</span></div></article>';
    }).join('');
    var stats = $('collection-stats');
    if (stats) {
      var got = CARD_CATALOG.filter(function (c) { return owned[c.id]; }).length;
      var sup = CARD_CATALOG.filter(function (c) { return c.rarity === 'super' && owned[c.id]; }).length;
      stats.textContent = got + '/' + CARD_CATALOG.length + ' · ' + sup + ' super';
    }
  }

  function render() {
    var s = state;
    var startGate = $('start-gate');
    var appMain = $('tama-app');
    if (startGate) startGate.hidden = !!s.started;
    if (appMain) appMain.hidden = !s.started;
    if (!s.started) return;

    if (Date.now() >= EVENT_END && s.alive) {
      s.alive = false;
      pushLog(s, FAREWELL_DONE);
      save(s);
    }
    checkEvolution(s);

    var shell = SHELLS[s.shell] || SHELLS.rosa;
    var device = $('tama-device');
    if (device) {
      device.style.setProperty('--fur', shell.fur);
      device.style.setProperty('--fur-light', shell.furLight);
      device.style.setProperty('--fur-ear', shell.furEar);
    }
    var catEl = $('tama-cat');
    if (catEl) {
      catEl.setAttribute('data-stage', (stageForAge(ageHours(s))).id);
      catEl.setAttribute('data-expr', catExpr(s));
    }
    var name = $('tama-name');
    if (name) name.textContent = s.name || 'Roda';
    var st = stageForAge(ageHours(s));
    var stageEl = $('tama-stage');
    if (stageEl) stageEl.textContent = st.label;
    var ageEl = $('tama-age');
    if (ageEl) ageEl.textContent = formatAge(s);
    var life = $('tama-life');
    if (life) {
      life.textContent = formatLife();
      var ph = lifePhase();
      life.classList.toggle('is-late', ph === 'late');
      life.classList.toggle('is-dying', ph === 'dying');
      life.classList.toggle('is-ended', ph === 'ended' || !s.alive);
    }
    var status = $('tama-status');
    if (status) {
      var phase = lifePhase();
      if (!s.alive || phase === 'ended') status.textContent = FAREWELL_DONE;
      else if (phase === 'dying') status.textContent = FAREWELL;
      else if (s.sleeping) status.textContent = 'Dormindo…';
      else if (s.sick) status.textContent = 'Passando mal';
      else if (phase === 'late') status.textContent = FAREWELL_LATE;
      else if (mood(s) === 'happy') status.textContent = 'Curtindo São Cristóvão';
      else if (mood(s) === 'sad') status.textContent = 'Precisa de você';
      else status.textContent = 'De boa no centro histórico';
    }
    bar($('bar-hunger'), s.hunger);
    bar($('bar-happy'), s.happy);
    bar($('bar-energy'), s.energy);
    bar($('bar-hygiene'), s.hygiene);
    var evoFill = $('bar-evolve');
    if (evoFill) evoFill.style.width = Math.round(evolutionProgress(s) * 100) + '%';
    var evoLabel = $('tama-evolve-label');
    var nxt = nextStage(st);
    if (evoLabel) evoLabel.textContent = nxt ? 'Próxima: ' + nxt.label : 'Forma máxima';

    document.querySelectorAll('[data-shell]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-shell') === s.shell ? 'true' : 'false');
    });
    document.querySelectorAll('[data-action]').forEach(function (b) {
      var act = b.getAttribute('data-action');
      b.disabled = !s.alive && act !== 'reset' && act !== 'start';
    });
    var sleepBtn = document.querySelector('[data-action="sleep"]');
    if (sleepBtn && s.alive) sleepBtn.textContent = s.sleeping ? 'Acordar' : 'Dormir';
    renderCollection();
  }

  function startGame() {
    if (!state.started) {
      state = defaultState();
      state.started = true;
      grantCard(state, 'c_ovo');
      pushLog(state, 'Nasceu em São Cristóvão — CRICRI 2026.');
      save(state);
    }
    render();
    setTab('play');
  }

  function act(action) {
    var s = state;
    if (action === 'start') { startGame(); return; }
    if (action === 'reset') {
      openTamaConfirm({
        title: 'Renascer?',
        body: 'Isso apaga o bicho atual e começa do zero. Tem certeza?',
        confirmLabel: 'Sim, renascer',
        cancelLabel: 'Cancelar',
        onConfirm: function () {
          state = defaultState();
          save(state);
          render();
        }
      });
      return;
    }
    if (!s.started || !s.alive) return;
    if (Date.now() >= EVENT_END) {
      s.alive = false;
      pushLog(s, FAREWELL_DONE);
      save(s);
      render();
      return;
    }
    if (s.sleeping && action !== 'sleep') {
      pushLog(s, 'Dormindo — acorde primeiro.');
      render();
      return;
    }
    var st = stageForAge(ageHours(s));
    if (st.id === 'ovo' && (action === 'after' || action === 'play' || action === 'mapa')) {
      pushLog(s, 'Ainda é ovo (~1h).');
      save(s); render(); return;
    }
    switch (action) {
      case 'feed':
        s.hunger = clamp(s.hunger + 28, 0, 100);
        s.hygiene = clamp(s.hygiene - 3, 0, 100);
        s.feedCount++; s.careScore++; break;
      case 'play':
        if (s.energy < 12) { pushLog(s, 'Sem energia.'); break; }
        s.happy = clamp(s.happy + 24, 0, 100);
        s.energy = clamp(s.energy - 14, 0, 100);
        s.hunger = clamp(s.hunger - 5, 0, 100);
        s.playCount++; s.careScore++; break;
      case 'clean':
        s.hygiene = clamp(s.hygiene + 35, 0, 100);
        s.happy = clamp(s.happy + 5, 0, 100);
        s.cleanCount++; s.careScore++; break;
      case 'sleep':
        s.sleeping = !s.sleeping;
        if (s.sleeping) grantCard(s, 'c_soneca', true);
        break;
      case 'medicine':
        if (!s.sick && s.health > 70) break;
        s.sick = false;
        s.health = clamp(s.health + 40, 0, 100);
        s.careScore += 2; break;
      case 'after':
        if (s.energy < 20) { pushLog(s, 'Cansada demais.'); break; }
        s.happy = clamp(s.happy + 28, 0, 100);
        s.energy = clamp(s.energy - 20, 0, 100);
        s.hunger = clamp(s.hunger - 8, 0, 100);
        s.hygiene = clamp(s.hygiene - 6, 0, 100);
        s.afterCount++; s.careScore += 2; break;
      case 'mapa':
        s.happy = clamp(s.happy + 12, 0, 100);
        s.energy = clamp(s.energy - 5, 0, 100);
        s.careScore++;
        grantCard(s, 'c_mapa', true); break;
      case 'scrap':
        s.happy = clamp(s.happy + 14, 0, 100);
        s.scrapCount++; s.careScore++; break;
      case 'rename': {
        var n = prompt('Nome (máx. 12):', s.name || 'Roda');
        if (n) s.name = String(n).trim().slice(0, 12) || 'Roda';
        break;
      }
    }
    checkCardMilestones(s);
    var evo = checkEvolution(s);
    save(s);
    render();
    if (evo) flashEvolve();
    else flashEvolve();
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { setTab(tab.getAttribute('data-tab')); return; }
      var a = e.target.closest('[data-action]');
      if (a) { e.preventDefault(); act(a.getAttribute('data-action')); return; }
      var sh = e.target.closest('[data-shell]');
      if (sh) { state.shell = sh.getAttribute('data-shell'); save(state); render(); }
    });
  }

  function boot() {
    try {
      var saved = JSON.parse(localStorage.getItem('fasc-a11y-v1') || 'null');
      if (saved && saved.motion) document.documentElement.setAttribute('data-a11y-motion', saved.motion);
      else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        document.documentElement.setAttribute('data-a11y-motion', 'reduce');
    } catch (_) {}
    wire();
    render();
    scheduleBlink();
    if (state.started) setTab('play');
    setInterval(function () {
      if (!state.started) return;
      tickOpen(state); save(state); render();
    }, TICK_MS);
    setInterval(function () {
      if (!state.started) return;
      var life = $('tama-life'); if (life) life.textContent = formatLife();
      var ageEl = $('tama-age'); if (ageEl) ageEl.textContent = formatAge(state);
      var evoFill = $('bar-evolve');
      if (evoFill) evoFill.style.width = Math.round(evolutionProgress(state) * 100) + '%';
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
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
    '.cricri-footer-mark{font-family:"Inter",Oswald,Impact,sans-serif;font-size:clamp(1.6rem,5vw,2rem);',
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
