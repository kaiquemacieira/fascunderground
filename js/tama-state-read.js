/**
 * CRICRI · leitura compartilhada do estado do Tamagotchi
 * Usado por profile (cartão) e alinhado a js/tamagotchi.js (mesmas chaves / merge).
 * Não roda o jogo — só lê.
 */
(function (global) {
  'use strict';

  var STORAGE = 'cricri-tama-v3';
  var STORAGE_LEGACY = ['fasc-tama-v2', 'cricri-tama-v2'];

  var SHELL_LABEL = {
    rosa: 'Rosa',
    ocre: 'Ocre',
    azul: 'Azul',
    tuxedo: 'Tuxedo'
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
    { id: 'c_ovo', name: 'Casca Rosa', rarity: 'comum', type: 'nascimento', emoji: '🥚', how: 'Nascer' },
    { id: 'c_pastel', name: 'Pastel da Feira', rarity: 'comum', type: 'comida', emoji: '🥟', how: 'Comer 3×' },
    { id: 'c_banho', name: 'Banho de Caneco', rarity: 'comum', type: 'cuidado', emoji: '🧼', how: 'Limpar 3×' },
    { id: 'c_soneca', name: 'Soneca na Praça', rarity: 'comum', type: 'cuidado', emoji: '😴', how: 'Dormir' },
    { id: 'c_mapa', name: 'Mapa do Centro', rarity: 'comum', type: 'exploracao', emoji: '🗺️', how: 'Explorar mapa' },
    { id: 'r_filhote', name: 'Filhote do Cortejo', rarity: 'raro', type: 'evolucao', emoji: '🐤', how: 'Evoluir p/ Filhote' },
    { id: 'r_convento', name: 'Luz do Convento', rarity: 'raro', type: 'evolucao', emoji: '⛪', how: 'Evoluir p/ Cria' },
    { id: 'r_after', name: 'After SE', rarity: 'raro', type: 'festa', emoji: '🌙', how: 'After 2×' },
    { id: 'r_scrap', name: 'Scrap de Rua', rarity: 'raro', type: 'social', emoji: '✉️', how: 'Scrap 3×' },
    { id: 'r_care', name: 'Cuidadora', rarity: 'raro', type: 'cuidado', emoji: '💗', how: 'Care 15' },
    { id: 'sr_lenda', name: 'Lenda CRICRI', rarity: 'super', type: 'lenda', emoji: '👑', how: 'Virar Anciã' },
    { id: 'sr_sergipe', name: 'Sergipe Inteiro', rarity: 'super', type: 'territorio', emoji: '🔶', how: 'Care 40' },
    { id: 'sr_festival', name: 'CRICRI 2026', rarity: 'super', type: 'festa', emoji: '🎉', how: 'Últimos 3 dias vivos' },
    { id: 'sr_ouro', name: 'Photocard Ouro', rarity: 'super', type: 'evolucao', emoji: '✨', how: 'Evoluir 5×' }
  ];

  var TYPE_LABEL = {
    nascimento: 'Nascimento',
    comida: 'Comida',
    cuidado: 'Cuidado',
    exploracao: 'Exploração',
    evolucao: 'Evolução',
    festa: 'Festa',
    social: 'Social',
    lenda: 'Lenda',
    territorio: 'Território'
  };

  var RARITY_LABEL = { comum: 'Comum', raro: 'Raro', super: 'Super raro' };

  var STAGE_EMOJI = {
    ovo: '🥚',
    bebe: '🐱',
    filhote: '🐱',
    cria: '🐱',
    festa: '🐱',
    adulta: '🐱',
    ancia: '🐱'
  };

  function defaultState() {
    var now = Date.now();
    return {
      started: false,
      name: 'Roda',
      bornAt: now,
      lastTick: now,
      hunger: 85,
      happy: 85,
      energy: 85,
      hygiene: 85,
      health: 100,
      shell: 'rosa',
      sleeping: false,
      sick: false,
      alive: true,
      careScore: 0,
      feedCount: 0,
      playCount: 0,
      cleanCount: 0,
      afterCount: 0,
      scrapCount: 0,
      stageId: 'ovo',
      evolutions: 0,
      cards: {},
      log: []
    };
  }

  /** Mesmo merge de js/tamagotchi.js → load() */
  function loadLocal() {
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
      var merged = Object.assign(defaultState(), parsed);
      if (parsed.started) merged.started = true;
      if (parsed.bornAt) merged.bornAt = parsed.bornAt;
      if (parsed.name) merged.name = parsed.name;
      var legacyShell = { classic: 'rosa', amarelo: 'ocre', stencil: 'tuxedo' };
      if (!SHELL_LABEL[merged.shell]) merged.shell = legacyShell[merged.shell] || 'rosa';
      return merged;
    } catch (_) {
      return defaultState();
    }
  }

  function ageHours(s) {
    if (!s || !s.bornAt) return 0;
    return Math.max(0, (Date.now() - s.bornAt) / 3600000);
  }

  function stageForAge(hours) {
    var cur = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) {
      if (hours >= STAGES[i].minAgeH) cur = STAGES[i];
    }
    return cur;
  }

  function stageOf(s) {
    if (!s) return STAGES[0];
    if (s.stageId) {
      for (var i = 0; i < STAGES.length; i++) {
        if (STAGES[i].id === s.stageId) return STAGES[i];
      }
    }
    return stageForAge(ageHours(s));
  }

  async function currentUserId() {
    try {
      if (!global.fascAuth || !global.fascAuth.user) return null;
      var u = await global.fascAuth.user();
      return u && u.id ? u.id : null;
    } catch (_) {
      return null;
    }
  }

  /** Mesmo caminho de js/tamagotchi.js → cloudLoad() */
  async function cloudLoad() {
    try {
      var uid = await currentUserId();
      if (!uid || !global.fascDb) return null;
      var res = await global.fascDb
        .from('tama_state')
        .select('state,updated_at')
        .eq('user_id', uid)
        .maybeSingle();
      if (res.error || !res.data || !res.data.state) {
        // fallback coluna em profiles (mesmo que o jogo)
        try {
          var fb = await global.fascDb
            .from('profiles')
            .select('tama_state')
            .eq('id', uid)
            .maybeSingle();
          if (fb.data && fb.data.tama_state) return fb.data.tama_state;
        } catch (_) {}
        return null;
      }
      return res.data.state;
    } catch (_) {
      return null;
    }
  }

  /**
   * Preferência: nuvem se started; senão local se started; senão null (nunca começou)
   */
  async function resolveState() {
    var local = loadLocal();
    var cloud = null;
    try {
      cloud = await cloudLoad();
    } catch (_) {}
    if (cloud && cloud.started) {
      // merge superficial: nuvem ganha, preenche defaults
      return Object.assign(defaultState(), cloud, { started: true });
    }
    if (local && local.started) return local;
    return null;
  }

  function summarize(s) {
    if (!s || !s.started) return null;
    var st = stageOf(s);
    var shellId = s.shell || 'rosa';
    return {
      name: String(s.name || 'Roda').slice(0, 24),
      stageId: st.id,
      stageLabel: st.label,
      emoji: STAGE_EMOJI[st.id] || '🐾',
      shellId: shellId,
      shellLabel: SHELL_LABEL[shellId] || shellId,
      careScore: Math.max(0, Number(s.careScore) || 0),
      alive: s.alive !== false
    };
  }

  /** Contagem de um cartão — aceita {count}, número, true (legado). */
  function cardCount(entry) {
    if (entry == null || entry === false) return 0;
    if (typeof entry === 'number') return Math.max(0, entry | 0);
    if (typeof entry === 'boolean') return entry ? 1 : 0;
    if (typeof entry === 'object') {
      var n = Number(entry.count);
      if (isFinite(n) && n >= 0) return n | 0;
      return 1;
    }
    return 1;
  }

  function ownedCardsMap(s) {
    return (s && s.cards && typeof s.cards === 'object') ? s.cards : {};
  }

  /** Cartões com count > 1 (presenteáveis). */
  function listDuplicates(s) {
    var cards = ownedCardsMap(s);
    var out = [];
    var id;
    for (id in cards) {
      if (!Object.prototype.hasOwnProperty.call(cards, id)) continue;
      var cnt = cardCount(cards[id]);
      if (cnt > 1) {
        var meta = null;
        for (var i = 0; i < CARD_CATALOG.length; i++) {
          if (CARD_CATALOG[i].id === id) { meta = CARD_CATALOG[i]; break; }
        }
        out.push({
          id: id,
          count: cnt,
          name: meta ? meta.name : id,
          emoji: meta ? meta.emoji : '🃏',
          rarity: meta ? meta.rarity : 'comum'
        });
      }
    }
    return out;
  }

  /**
   * Presenteia 1 cópia via RPC gift_tama_card (SECURITY DEFINER no Postgres).
   * Também atualiza localStorage do doador para a UI refletir na hora.
   */
  async function giftCard(toUserId, cardId) {
    if (!toUserId || !cardId) throw new Error('Destinatário ou cartão inválido.');
    if (!global.fascDb || !global.fascDb.rpc) {
      throw new Error('Backend indisponível.');
    }

    // Sincroniza cards locais → nuvem antes da RPC (a function só lê tama_state)
    try {
      var uid = await currentUserId();
      var localPre = loadLocal();
      if (uid && localPre && localPre.started && global.fascDb.from) {
        await global.fascDb.from('tama_state').upsert(
          { user_id: uid, state: localPre, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      }
    } catch (syncErr) {
      console.warn('[CricriTamaRead gift sync]', syncErr && syncErr.message || syncErr);
    }

    var res = await global.fascDb.rpc('gift_tama_card', {
      p_to_user: toUserId,
      p_card_id: cardId
    });
    if (res.error) {
      var msg = res.error.message || String(res.error);
      if (/no_duplicate/i.test(msg)) throw new Error('Você precisa de uma cópia extra desse cartão.');
      if (/cannot_gift_self/i.test(msg)) throw new Error('Não dá pra presentear a si mesmo.');
      if (/recipient_no_tama/i.test(msg)) throw new Error('Essa pessoa ainda não tem CRICRI na roda.');
      if (/donor_no_tama/i.test(msg)) throw new Error('Comece seu CRICRI antes de presentear.');
      if (/auth_required|JWT|not authenticated/i.test(msg)) throw new Error('Entre na conta pra presentear.');
      if (/invalid_card/i.test(msg)) throw new Error('Cartão inválido.');
      throw new Error(msg || 'Não foi possível presentear.');
    }
    var data = res.data || {};
    // sincroniza local do doador
    try {
      var local = loadLocal();
      if (local && local.started) {
        local.cards = local.cards || {};
        var prev = cardCount(local.cards[cardId]);
        var next = (data.from_count != null) ? Number(data.from_count) : Math.max(0, prev - 1);
        if (next <= 0) {
          // mantém pelo menos 1 se ainda “possui” — mas RPC só doa se >1, então next >= 1
          local.cards[cardId] = { count: Math.max(1, next), at: Date.now() };
        } else {
          local.cards[cardId] = Object.assign(
            {},
            typeof local.cards[cardId] === 'object' ? local.cards[cardId] : {},
            { count: next, at: (local.cards[cardId] && local.cards[cardId].at) || Date.now() }
          );
        }
        localStorage.setItem(STORAGE, JSON.stringify(local));
      }
    } catch (_) {}
    return data;
  }


  /**
   * Snapshot público (RPC) — só campos seguros.
   * Preferir sempre isto para perfil de terceiros.
   */
  async function loadPublicByUserId(userId) {
    if (!userId || !global.fascDb) return null;
    try {
      var res = await global.fascDb.rpc('get_tama_public', { p_user_id: userId });
      if (res.error) {
        console.warn('[CricriTamaRead public]', res.error.message || res.error);
        return null;
      }
      return res.data || null;
    } catch (e) {
      console.warn('[CricriTamaRead public]', e && e.message || e);
      return null;
    }
  }

  async function loadPublicByHandle(handle) {
    if (!handle || !global.fascDb) return null;
    var h = String(handle).replace(/^@/, '').trim().toLowerCase();
    if (!h) return null;
    try {
      var res = await global.fascDb.rpc('get_tama_public_by_handle', { p_handle: h });
      if (res.error) {
        console.warn('[CricriTamaRead public handle]', res.error.message || res.error);
        return null;
      }
      return res.data || null;
    } catch (e) {
      console.warn('[CricriTamaRead public handle]', e && e.message || e);
      return null;
    }
  }

  global.CricriTamaRead = {
    STORAGE: STORAGE,
    CARD_CATALOG: CARD_CATALOG,
    RARITY_LABEL: RARITY_LABEL,
    TYPE_LABEL: TYPE_LABEL,
    loadLocal: loadLocal,
    cloudLoad: cloudLoad,
    resolveState: resolveState,
    summarize: summarize,
    stageOf: stageOf,
    defaultState: defaultState,
    cardCount: cardCount,
    listDuplicates: listDuplicates,
    giftCard: giftCard,
    ownedCards: function (s) {
      return ownedCardsMap(s);
    },
    loadPublicByUserId: loadPublicByUserId,
    loadPublicByHandle: loadPublicByHandle
  };
})(typeof window !== 'undefined' ? window : globalThis);
