// CRICRI · Cri Cabrunco — São Cristóvão / SE
(function () {
  'use strict';

  var STORAGE = 'cricri-tama-v3';
  var STORAGE_LEGACY = ['fasc-tama-v2', 'cricri-tama-v2'];
  var HALL_STORAGE = 'cricri-hall-v1';
  // Fim oficial do FASC 2026 — a roda só encerra DEPOIS desta data (UTC ms)
  // Fallback numérico evita parse ISO quebrado em alguns WebViews mobile
  var EVENT_END_FALLBACK_MS = Date.UTC(2026, 10, 23, 15, 0, 0); // 23/11/2026 12:00 -03
  var EVENT_END = (function () {
    var candidates = [];
    try {
      if (typeof window !== 'undefined' && window.FASC_EVENT_END_MS != null) {
        candidates.push(Number(window.FASC_EVENT_END_MS));
      }
    } catch (_) {}
    try {
      var iso = (typeof window !== 'undefined' && window.FASC_CONFIG && window.FASC_CONFIG.eventEndIso)
        || '2026-11-23T12:00:00-03:00';
      candidates.push(new Date(iso).getTime());
      // Safari antigo: sem offset
      candidates.push(new Date('2026-11-23T15:00:00Z').getTime());
    } catch (_) {}
    candidates.push(EVENT_END_FALLBACK_MS);
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      // só aceita datas no futuro razoável do festival (após 2025 e antes de 2030)
      if (isFinite(v) && v > Date.UTC(2025, 0, 1) && v < Date.UTC(2030, 0, 1)) return v;
    }
    return EVENT_END_FALLBACK_MS;
  })();
  function eventIsOver() {
    // Defesa: se o relógio do aparelho estiver absurdo, não encerra a roda
    var now = Date.now();
    if (!isFinite(EVENT_END) || EVENT_END <= 0) return false;
    if (!isFinite(now) || now < Date.UTC(2020, 0, 1)) return false;
    return now >= EVENT_END;
  }
  // expõe pra debug no mobile
  try {
    window.__CRICRI_EVENT_END = EVENT_END;
    window.__CRICRI_EVENT_IS_OVER = eventIsOver;
  } catch (_) {}
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
    { id: 'bebe', minAgeH: 1, label: 'Cabrunquinho' },
    { id: 'filhote', minAgeH: 8, label: 'Filhote' },
    { id: 'cria', minAgeH: 36, label: 'Cria' },
    { id: 'festa', minAgeH: 96, label: 'Festeiro' },
    { id: 'adulta', minAgeH: 168, label: 'Cri da Praça' },
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
    { id: 'r_care', name: 'Cuidador Cabrunco', rarity: 'raro', emoji: '💗', how: 'Care 15' },
    { id: 'sr_lenda', name: 'Lenda CRICRI', rarity: 'super', emoji: '👑', how: 'Virar Anciã' },
    { id: 'sr_sergipe', name: 'Sergipe Inteiro', rarity: 'super', emoji: '🔶', how: 'Care 40' },
    { id: 'sr_festival', name: 'CRICRI 2026', rarity: 'super', emoji: '🎉', how: 'Últimos 3 dias vivos' },
    { id: 'sr_ouro', name: 'Photocard Ouro', rarity: 'super', emoji: '✨', how: 'Evoluir 5×' }
  ];

  var RARITY_LABEL = { comum: 'Comum', raro: 'Raro', super: 'Super raro' };
  // Farewell strings: easter egg de fim de festival — não revelar em UI de onboarding
  var FAREWELL = 'Eita cabrunco… a roda está acabando. Obrigado por ficar comigo. Foi lindo.';
  var FAREWELL_DONE = 'O FASC fechou o portão. Você cuidou do Cri até o fim — gratidão de São Cristóvão.';
  var FAREWELL_LATE = 'Últimos dias juntos. Cada carinho vira memória do cabrunco.';

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
      started: false, name: 'Cri', bornAt: now, started_at: now, lastTick: now,
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
      if (parsed.started_at) merged.started_at = parsed.started_at;
      else if (parsed.bornAt) merged.started_at = parsed.bornAt;
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

  // evita eco do próprio upsert via Realtime
  var _lastLocalSyncAt = 0;
  var _applyingRemote = false;

  async function cloudSave(s) {
    try {
      var uid = await currentUserId();
      if (!uid || !window.fascDb) return;
      if (_applyingRemote) return;
      var nowIso = new Date().toISOString();
      s.syncedAt = nowIso;
      _lastLocalSyncAt = Date.now();
      // tabela opcional tama_state (user_id PK, state jsonb, updated_at)
      var payload = {
        user_id: uid,
        state: s,
        updated_at: nowIso
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
      var st = res.data.state;
      if (st && typeof st === 'object' && res.data.updated_at) {
        st._cloudUpdatedAt = res.data.updated_at;
      }
      return st;
    } catch (_) { return null; }
  }

  /** Score simples pra decidir quem ganha no merge local vs nuvem */
  function stateScore(s) {
    if (!s || !s.started) return -1;
    var care = Number(s.careScore) || 0;
    var evo = Number(s.evolutions) || 0;
    var cards = s.cards ? Object.keys(s.cards).length : 0;
    var tick = Number(s.lastTick) || 0;
    return care * 1000 + evo * 100 + cards * 10 + (tick / 1e12);
  }

  function mergeCloudIntoLocal(local, cloud) {
    if (!cloud || !cloud.started) return local;
    if (!local || !local.started) {
      return Object.assign(defaultState(), cloud, { started: true });
    }
    // se nuvem é claramente mais avançada, adota
    if (stateScore(cloud) > stateScore(local) + 0.5) {
      return Object.assign(defaultState(), cloud, { started: true });
    }
    // se nuvem tem lastTick mais recente e care parecido, prefere nuvem (outro device)
    var localTick = Number(local.lastTick) || 0;
    var cloudTick = Number(cloud.lastTick) || 0;
    if (cloudTick > localTick + 5000 && stateScore(cloud) >= stateScore(local) - 1) {
      return Object.assign(defaultState(), cloud, { started: true });
    }
    return local;
  }

  /**
   * Aplica estado remoto (Realtime postgres_changes).
   * payload: { eventType, new: { state, updated_at, user_id } }
   */
  function applyRemoteTama(payload) {
    if (!payload) return;
    var row = payload.new || payload.record || null;
    if (!row || !row.state) return;
    // ignora eco do próprio save (~2.5s)
    if (Date.now() - _lastLocalSyncAt < 2500) return;
    var remote = row.state;
    if (typeof remote === 'string') {
      try { remote = JSON.parse(remote); } catch (_) { return; }
    }
    if (!remote || typeof remote !== 'object') return;
    _applyingRemote = true;
    try {
      var next = mergeCloudIntoLocal(state, remote);
      if (next !== state && stateScore(next) !== stateScore(state)) {
        state = next;
        recoverPrematureEnd(state);
        applyAwayDecay(state);
        // grava local SEM re-disparar cloud logo (schedule ainda roda, mas _applyingRemote bloqueia)
        try {
          localStorage.setItem(STORAGE, JSON.stringify(state));
        } catch (_) {}
        if (typeof render === 'function') render();
        console.info('[tama] sync remoto aplicado · care=', state.careScore);
      }
    } finally {
      setTimeout(function () { _applyingRemote = false; }, 800);
    }
  }
  window.__cricriApplyRemoteTama = applyRemoteTama;

  async function syncFromCloudOnBoot() {
    try {
      var cloud = await cloudLoad();
      if (!cloud) return false;
      var merged = mergeCloudIntoLocal(state, cloud);
      if (merged !== state) {
        state = merged;
        recoverPrematureEnd(state);
        applyAwayDecay(state);
        try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (_) {}
        if (typeof render === 'function') render();
        console.info('[tama] boot: estado da nuvem aplicado');
        return true;
      }
      // se local ganhou, empurra pra nuvem
      if (state.started && stateScore(state) > stateScore(cloud)) {
        scheduleCloudSave(state);
      }
    } catch (e) {
      console.info('[tama] boot cloud skip', e && e.message);
    }
    return false;
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

  /** Hall da Fama local (este aparelho) — sem schema novo */
  function loadHall() {
    try {
      var raw = localStorage.getItem(HALL_STORAGE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  function saveHall(entries) {
    try {
      localStorage.setItem(HALL_STORAGE, JSON.stringify(entries.slice(0, 12)));
    } catch (_) {}
  }
  function pushHallEntry(s) {
    var entry = {
      name: String(s.name || 'Cri').slice(0, 24),
      careScore: s.careScore || 0,
      evolutions: s.evolutions || 0,
      cards: s.cards ? Object.keys(s.cards).length : 0,
      stageId: s.stageId || 'ovo',
      at: Date.now()
    };
    var hall = loadHall();
    hall.unshift(entry);
    hall.sort(function (a, b) { return (b.careScore || 0) - (a.careScore || 0); });
    saveHall(hall);
    return entry;
  }

  /**
   * Encerramento oculto do festival.
   * Só roda quando o EVENT_END realmente passou.
   * Não encerra a roda por pet morto antes da data — use Renascer.
   */
  function finalizeEnd(s) {
    if (!s || s.endedAt) return false;
    // Só fecha a roda depois do fim oficial do festival
    if (!eventIsOver()) return false;
    s.alive = false;
    s.endedAt = Date.now();
    s.sleeping = false;
    if (!s.endSnapshot) {
      s.endSnapshot = {
        careScore: s.careScore || 0,
        evolutions: s.evolutions || 0,
        cards: s.cards ? Object.keys(s.cards).length : 0,
        stageId: s.stageId || 'ovo',
        name: s.name || 'Cri'
      };
      pushHallEntry(s);
      pushLog(s, FAREWELL_DONE);
      notifyCri('farewell');
    }
    return true;
  }

  /**
   * Se o estado ficou marcado como "fim da roda" antes da data real
   * (teste, fuso, localStorage antigo), reabre o jogo.
   */
  function recoverPrematureEnd(s) {
    if (!s) return false;
    if (eventIsOver()) return false;
    if (!s.endedAt && s.alive !== false) return false;
    // Evento ainda em curso: limpa marca de encerramento prematuro
    var changed = false;
    if (s.endedAt) {
      delete s.endedAt;
      delete s.endSnapshot;
      changed = true;
    }
    // Pet que "morreu" só por finalizeEnd prematuro volta vivo;
    // morte real por fome/saúde continua com alive=false e Renascer.
    if (s.alive === false && (s.health > 0 || s.hunger > 0 || s.happy > 0)) {
      // se acabou via festival falso, revive; se zerar saúde de verdade, deixa
      if ((s.health || 0) > 0) {
        s.alive = true;
        changed = true;
      }
    }
    if (changed) {
      pushLog(s, 'A roda continua — CRICRI 2026 ainda está rolando.');
    }
    return changed;
  }

  function renderFarewell(s) {
    var panel = $('farewell-panel');
    if (!panel) return;
    var phase = lifePhase();
    // Despedida só depois do fim real do festival
    // Nunca mostrar despedida antes da data real do FASC
    if (!eventIsOver()) {
      panel.hidden = true;
      return;
    }
    var show = !!(s.started && (phase === 'ended' || s.endedAt));
    panel.hidden = !show;
    if (!show) return;

    var body = $('farewell-body');
    if (body) body.textContent = FAREWELL_DONE;

    var snap = s.endSnapshot || {
      careScore: s.careScore || 0,
      evolutions: s.evolutions || 0,
      cards: s.cards ? Object.keys(s.cards).length : 0,
      name: s.name || 'Cri'
    };
    var stats = $('farewell-stats');
    if (stats) {
      stats.innerHTML =
        '<div><dt>Cuidados</dt><dd>' + (snap.careScore || 0) + '</dd></div>' +
        '<div><dt>Evoluções</dt><dd>' + (snap.evolutions || 0) + '</dd></div>' +
        '<div><dt>Photocards</dt><dd>' + (snap.cards || 0) + '</dd></div>' +
        '<div><dt>Nome</dt><dd>' + String(snap.name || 'Cri').replace(/</g, '&lt;') + '</dd></div>';
    }

    var hall = loadHall();
    var list = $('hall-list');
    var empty = $('hall-empty');
    if (list) {
      if (!hall.length) {
        list.innerHTML = '';
        if (empty) empty.hidden = false;
      } else {
        if (empty) empty.hidden = true;
        list.innerHTML = hall.slice(0, 8).map(function (e, i) {
          return '<li><span>' + (i + 1) + '. ' + String(e.name || 'Cri').replace(/</g, '&lt;') +
            '</span><strong>' + (e.careScore || 0) + ' pts</strong></li>';
        }).join('');
      }
    }
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

  function notifyCri(kind, arg) {
    try {
      if (!window.CricriNotifs || !window.CricriNotifs.Cri) return;
      var Cri = window.CricriNotifs.Cri;
      if (kind === 'born' && Cri.born) Cri.born();
      else if (kind === 'evolve' && Cri.evolve) Cri.evolve(arg);
      else if (kind === 'card' && Cri.card) Cri.card(arg);
      else if (kind === 'hungry' && Cri.hungry) Cri.hungry();
      else if (kind === 'sick' && Cri.sick) Cri.sick();
      else if (kind === 'farewell' && Cri.farewell) Cri.farewell();
    } catch (_) {}
  }

  function grantCard(s, cardId, silent) {
    var card = null;
    for (var i = 0; i < CARD_CATALOG.length; i++) if (CARD_CATALOG[i].id === cardId) card = CARD_CATALOG[i];
    if (!card) return false;
    s.cards = s.cards || {};
    if (s.cards[cardId]) { s.cards[cardId].count += 1; return false; }
    s.cards[cardId] = { count: 1, at: Date.now() };
    if (!silent) {
      pushLog(s, 'Photocard: ' + card.name);
      showCardToast(card);
      notifyCri('card', card.name);
    }
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
    notifyCri('evolve', byAge.label);
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

  var _lastCareNotif = 0;
  function maybeCareNotif(s) {
    var now = Date.now();
    if (now - _lastCareNotif < 30 * 60 * 1000) return; // máx. 1 alerta de cuidado / 30 min
    if (s.sick) {
      _lastCareNotif = now;
      notifyCri('sick');
    } else if (s.hunger < 18) {
      _lastCareNotif = now;
      notifyCri('hungry');
    }
  }

  function tickOpen(s) {
    if (!s.started || !s.alive) return;
    if (eventIsOver()) {
      finalizeEnd(s);
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
    maybeCareNotif(s);
  }

  var state = load();
  if (recoverPrematureEnd(state)) {
    // reabre se localStorage ficou com fim prematuro (comum no mobile)
    try { console.info('[CRICRI] recoverPrematureEnd', new Date(window.__CRICRI_EVENT_END || 0).toISOString()); } catch (_) {}
  }
  applyAwayDecay(state);
  // sempre limpa marca de fim se o evento ainda não acabou
  if (state && !eventIsOver()) {
    if (state.endedAt) { delete state.endedAt; delete state.endSnapshot; }
  }
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
    if (state) recoverPrematureEnd(state);

    var s = state;
    var startGate = $('start-gate');
    var appMain = $('tama-app');
    if (startGate) startGate.hidden = !!s.started;
    if (appMain) appMain.hidden = !s.started;
    if (!s.started) return;

    if (finalizeEnd(s)) save(s);
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
    if (name) name.textContent = s.name || 'Cri';
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
      else if (s.sleeping) status.textContent = 'Descansando o cabrunco…';
      else if (s.sick) status.textContent = 'Esse cabrunco não tá legal…';
      else if (phase === 'late') status.textContent = FAREWELL_LATE;
      else if (mood(s) === 'happy') status.textContent = 'Cabrunco de bem em São Cristóvão';
      else if (mood(s) === 'sad') status.textContent = 'Se oriente… precisa de você';
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
    // Após o festival: só coleção / renascer bloqueado
    document.querySelectorAll('[data-action="reset"]').forEach(function (b) {
      if (eventIsOver()) {
        b.disabled = true;
        b.title = 'A roda fechou — sem renascer até o próximo FASC';
      }
    });
    renderCollection();
    renderFarewell(s);
  }

  function startGame() {
    // Mecânica oculta: depois do EVENT_END não nasce criatura nova
    if (eventIsOver()) {
      var gate = $('start-gate');
      if (gate) {
        var sub = gate.querySelector('.start-sub');
        if (sub) {
          sub.innerHTML = 'O FASC 2026 fechou o portão.<br>O Cri virou memória — até a próxima roda em São Cristóvão.';
        }
        var btn = gate.querySelector('[data-action="start"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Roda encerrada'; }
      }
      // Se já tinha pet, mostra despedida
      if (state.started) {
        finalizeEnd(state);
        save(state);
        render();
      }
      return;
    }
    if (!state.started) {
      // Vida conta a partir do primeiro acesso (agora), não de data fixa do festival
      state = defaultState();
      var birth = Date.now();
      state.bornAt = birth;
      state.started_at = birth;
      state.lastTick = birth;
      state.started = true;
      grantCard(state, 'c_ovo');
      pushLog(state, 'Nasceu em São Cristóvão — CRICRI 2026.');
      notifyCri('born');
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
    if (eventIsOver()) {
      finalizeEnd(s);
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
        var n = prompt('Nome (máx. 12):', s.name || 'Cri');
        if (n) s.name = String(n).trim().slice(0, 12) || 'Cri';
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
    wireBgMessages();
    render();
    scheduleBlink();
    if (state.started) setTab('play');
    // sync nuvem + realtime
    syncFromCloudOnBoot().then(function () {
      if (window.CricriRealtime && typeof window.CricriRealtime.start === 'function') {
        window.CricriRealtime.start();
      }
    });
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

  // API de leitura (perfil / outros) — mesma instância de load/cloudLoad
  window.CricriTamaRead = window.CricriTamaRead || {
    loadLocal: load,
    cloudLoad: cloudLoad,
    CARD_CATALOG: CARD_CATALOG,
    RARITY_LABEL: RARITY_LABEL,
    ownedCards: function (s) { return (s && s.cards) || {}; },
    resolveState: async function () {
      var local = load();
      var cloud = null;
      try { cloud = await cloudLoad(); } catch (_) {}
      if (cloud && cloud.started) return Object.assign(defaultState(), cloud, { started: true });
      if (local && local.started) return local;
      return null;
    },
    summarize: function (s) {
      if (!s || !s.started) return null;
      var st = stageForAge(ageHours(s));
      var shellId = s.shell || 'rosa';
      var labels = { rosa: 'Rosa', ocre: 'Ocre', azul: 'Azul', tuxedo: 'Tuxedo' };
      var emoji = { ovo: '🥚', bebe: '🐱', filhote: '🐱', cria: '🐱', festa: '🐱', adulta: '🐱', ancia: '🐱' };
      return {
        name: String(s.name || 'Cri').slice(0, 24),
        stageId: st.id,
        stageLabel: st.label,
        emoji: emoji[st.id] || '🐾',
        shellId: shellId,
        shellLabel: labels[shellId] || shellId,
        careScore: Math.max(0, Number(s.careScore) || 0),
        alive: s.alive !== false
      };
    },
    stageOf: function (s) { return stageForAge(ageHours(s)); },
    defaultState: defaultState
  };

})();
