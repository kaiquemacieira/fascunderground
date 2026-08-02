// CRICRI · Tamagotchi da Roda — São Cristóvão / SE
(function () {
  'use strict';

  var STORAGE = 'cricri-tama-v3';
  var STORAGE_LEGACY = ['fasc-tama-v2', 'cricri-tama-v2'];
  var EVENT_END = new Date('2026-11-23T00:00:00-03:00').getTime();
  var TICK_MS = 30 * 1000;
  var AWAY_DECAY_PER_H = 4;

  var SHELLS = {
    classic: { bezel: '#6b3fa0', accent: '#c9a0ff', bg: '#4a2a78' },
    rosa: { bezel: '#e33d6b', accent: '#f28aa8', bg: '#7a1f3a' },
    azul: { bezel: '#1b6f7e', accent: '#5ec4d6', bg: '#0c3a45' },
    amarelo: { bezel: '#d49a2c', accent: '#ffe066', bg: '#6a4a10' }
  };

  var STAGES = [
    { id: 'ovo', minAgeH: 0, label: 'Ovo', sprite: 'ovo' },
    { id: 'bebe', minAgeH: 1, label: 'Gatinho', sprite: 'bebe' },
    { id: 'filhote', minAgeH: 8, label: 'Filhote', sprite: 'filhote' },
    { id: 'cria', minAgeH: 36, label: 'Cria', sprite: 'cria' },
    { id: 'festa', minAgeH: 96, label: 'Festeira', sprite: 'festa' },
    { id: 'adulta', minAgeH: 168, label: 'Meow', sprite: 'adulta' },
    { id: 'ancia', minAgeH: 288, label: 'Anciã', sprite: 'ancia' }
  ];

  var CAT_SVG = {
    ovo: '<svg class="cat-sprite stage-ovo" viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="44" rx="22" ry="28" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M40 16v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="14" r="2.2" fill="currentColor"/></svg>',
    bebe: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M28 28c0-10 24-10 24 0v8c0 14-6 24-12 24s-12-10-12-24z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M30 24 24 14M50 24l6-10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="34" r="2.2" fill="currentColor"/><circle cx="46" cy="34" r="2.2" fill="currentColor"/><path d="M36 42c2 2 6 2 8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    filhote: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M26 30c0-12 28-12 28 0v10c0 16-7 26-14 26S26 56 26 40z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M30 22 22 10M50 22l8-12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="34" cy="36" r="2.4" fill="currentColor"/><circle cx="46" cy="36" r="2.4" fill="currentColor"/><path d="M36 44c2.5 2.5 7.5 2.5 10 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18 38c-3-.5-5.5-2-7-4M62 38c3-.5 5.5-2 7-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    cria: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M24 32c0-14 32-14 32 0v12c0 18-8 28-16 28S24 62 24 44z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 20 18 6M52 20l10-14" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><circle cx="33" cy="36" r="2.6" fill="currentColor"/><circle cx="47" cy="36" r="2.6" fill="currentColor"/><path d="M35 46c3 3 9 3 12 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 40c-4-.6-7-2.5-9-5M66 40c4-.6 7-2.5 9-5M15 48c-3.5.4-7 0-10-1M65 48c3.5.4 7 0 10-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    festa: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M22 34c0-15 36-15 36 0v12c0 18-9 28-18 28S22 64 22 46z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M28 18 16 4M52 18l12-14" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><circle cx="33" cy="36" r="2.6" fill="currentColor"/><circle cx="47" cy="36" r="2.6" fill="currentColor"/><path d="M34 48c4 3.5 10 3.5 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M40 8l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="currentColor" opacity=".85"/><path d="M12 40c-4-.5-8-2-10-5M68 40c4-.5 8-2 10-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    adulta: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M20 34c0-16 40-16 40 0v14c0 20-10 30-20 30S20 68 20 48z" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M28 16 14 2M52 16l14-14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="36" r="2.8" fill="currentColor"/><circle cx="48" cy="36" r="2.8" fill="currentColor"/><path d="M34 50c4 3.2 10 3.2 14 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><path d="M10 42c-4-.6-8-2.5-11-5.5M70 42c4-.6 8-2.5 11-5.5M11 50c-4 .5-8 0-12-1.2M69 50c4 .5 8 0 12-1.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    ancia: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M20 36c0-16 40-16 40 0v12c0 20-10 30-20 30S20 68 20 48z" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M28 18 16 4M52 18l12-14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M32 34c1.5 2 4 2 5.5 0M43 34c1.5 2 4 2 5.5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M34 50c4 2.5 10 2.5 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M28 12h24l-3 6H31z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="40" cy="9" r="2.5" fill="currentColor"/><path d="M10 44c-4-.5-8-2-11-5M70 44c4-.5 8-2 11-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    sleep: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M24 34c0-14 32-14 32 0v10c0 16-8 26-16 26S24 60 24 44z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M30 22 22 12M50 22l8-10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M31 36c2 1.5 5 1.5 7 0M42 36c2 1.5 5 1.5 7 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M36 46c2.5 2 7.5 2 10 0" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="58" y="22" fill="currentColor" font-size="10" font-family="sans-serif">z</text></svg>',
    sick: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M24 34c0-14 32-14 32 0v10c0 16-8 26-16 26S24 60 24 44z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M30 22 22 12M50 22l8-10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M31 34l5 5M36 34l-5 5M44 34l5 5M49 34l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M36 48c2  -1.5 8-1.5 10 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    gone: '<svg class="cat-sprite" viewBox="0 0 80 80" aria-hidden="true"><path d="M24 34c0-14 32-14 32 0v10c0 16-8 26-16 26S24 60 24 44z" fill="none" stroke="currentColor" stroke-width="2.2" opacity=".45"/><path d="M30 22 22 12M50 22l8-10" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M32 36h6M42 36h6M36 48h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>'
  };


  var CARD_CATALOG = [
    { id: 'c_ovo', name: 'Casca Rosa', rarity: 'comum', emoji: '🥚', how: 'Nascer' },
    { id: 'c_pastel', name: 'Pastel da Feira', rarity: 'comum', emoji: '🥟', how: 'Comer 3×' },
    { id: 'c_banho', name: 'Banho de Caneco', rarity: 'comum', emoji: '🧼', how: 'Limpar 3×' },
    { id: 'c_soneca', name: 'Soneca na Praça', rarity: 'comum', emoji: '😴', how: 'Dormir' },
    { id: 'c_mapa', name: 'Mapa do Centro', rarity: 'comum', emoji: '🗺️', how: 'Explorar mapa' },
    { id: 'r_filhote', name: 'Filhote do Cortejo', rarity: 'raro', emoji: '🐱', how: 'Evoluir p/ Filhote' },
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
      started: false, name: 'Meow', bornAt: now, lastTick: now,
      hunger: 85, happy: 85, energy: 85, hygiene: 85, health: 100,
      shell: 'classic', sleeping: false, sick: false, alive: true,
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

  function spriteFace(s) {
    if (!s.alive) return CAT_SVG.gone;
    if (s.sleeping) return CAT_SVG.sleep;
    if (s.sick) return CAT_SVG.sick;
    var key = stageForAge(ageHours(s)).sprite;
    return CAT_SVG[key] || CAT_SVG.bebe;
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
    var face = $('tama-face');
    if (!face) return;
    face.classList.remove('is-pop');
    void face.offsetWidth;
    face.classList.add('is-pop');
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

    var shell = SHELLS[s.shell] || SHELLS.classic;
    var device = $('tama-device');
    if (device) {
      device.style.setProperty('--bezel', shell.bezel);
      device.style.setProperty('--accent', shell.accent);
      device.style.setProperty('--shell-bg', shell.bg);
    }
    var face = $('tama-face');
    if (face) {
      face.innerHTML = spriteFace(s);
      var m = mood(s);
      var st = (!s.alive) ? 'gone' : (s.sleeping ? 'sleep' : stageForAge(ageHours(s)).id);
      face.setAttribute('data-mood', m);
      face.setAttribute('data-stage', st);
      face.classList.toggle('is-sleep', m === 'sleep');
      face.classList.toggle('is-sick', m === 'sick');
      face.classList.toggle('is-happy', m === 'happy');
      face.classList.toggle('is-sad', m === 'sad');
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
        var n = prompt('Nome (máx. 12):', s.name || 'Meow');
        if (n) s.name = String(n).trim().slice(0, 12) || 'Meow';
        break;
      }
    }
    checkCardMilestones(s);
    var evo = checkEvolution(s);
    save(s);
    render();
    if (evo) {
      flashEvolve();
      sfx('evolve');
    } else {
      if (kind === 'feed') sfx('feed');
      else if (kind === 'play' || kind === 'after' || kind === 'mapa' || kind === 'scrap') sfx('play');
      else if (kind === 'sleep') sfx('sleep');
      else if (kind === 'medicine' || kind === 'clean') sfx('pop');
      else sfx('click');
      if (!reducedMotion()) {
        var face = $('tama-face');
        if (face) { face.classList.remove('is-pop'); void face.offsetWidth; face.classList.add('is-pop'); }
      }
    }
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
