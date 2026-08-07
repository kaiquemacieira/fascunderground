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
    var now = Date.now();
    var end = isFinite(EVENT_END) && EVENT_END > Date.UTC(2025, 0, 1)
      ? EVENT_END
      : EVENT_END_FALLBACK_MS;
    // trava de segurança: NUNCA considera acabado antes de 23/11/2026 12:00 -03
    if (now < EVENT_END_FALLBACK_MS) return false;
    if (!isFinite(now) || now < Date.UTC(2020, 0, 1)) return false;
    return now >= end;
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

  /**
   * Evolução por estágios (FASC 4 dias ≈ 96h)
   * ovo→bebe: eclosão automática
   * demais: idade libera → Roda chama → resonância → ritual + forma
   */
  var STAGES = [
    { id: 'ovo',     minAgeH: 0,    label: 'Ovo',           emoji: '🥚', blurb: 'Casca da praça' },
    { id: 'bebe',    minAgeH: 0.03, label: 'Cabrunquinho',  emoji: '🐣', blurb: 'Acabou de eclodir' },
    { id: 'filhote', minAgeH: 3,    label: 'Filhote',       emoji: '🐤', blurb: 'Descobrindo a roda' },
    { id: 'cria',    minAgeH: 12,   label: 'Cria',          emoji: '✨', blurb: 'Luz do convento' },
    { id: 'festa',   minAgeH: 36,   label: 'Festeiro',      emoji: '🎉', blurb: 'No ritmo do FASC' },
    { id: 'adulta',  minAgeH: 72,   label: 'Cri da Praça',  emoji: '🌟', blurb: 'Dono do centro' },
    { id: 'ancia',   minAgeH: 96,   label: 'Anciã',         emoji: '👑', blurb: 'Lenda de São Cristóvão' }
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
    { id: 'sr_ouro', name: 'Photocard Ouro', rarity: 'super', emoji: '✨', how: 'Evoluir 5×' },
    { id: 'c_mutacao', name: 'Gene de Rua', rarity: 'comum', emoji: '🧬', how: 'Mutação comum' },
    { id: 'r_mutacao', name: 'Aleló Raro', rarity: 'raro', emoji: '🧬', how: 'Mutação rara' },
    { id: 'sr_mutacao', name: 'Genoma FASC', rarity: 'super', emoji: '🧬', how: 'Mutação super' },
    { id: 'c_hibrido', name: 'Mestiço do Centro', rarity: 'comum', emoji: '🔀', how: 'Hibridizar' },
    { id: 'r_hibrido', name: 'Fusão de Ecos', rarity: 'raro', emoji: '🔀', how: 'Híbrido raro' },
    { id: 'sr_hibrido', name: 'Roda Dupla', rarity: 'super', emoji: '🔀', how: 'Híbrido super' }
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


  var SPECIES = [
    { id: 'unicornio', name: 'Unicórnio', emoji: '🦄', blurb: 'Magia da praça', anim: 'sparkle-gallop' },
    { id: 'grilo', name: 'Grilo', emoji: '🦗', blurb: 'O som do CRICRI', anim: 'chirp-pulse' },
    { id: 'caramelo', name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua', anim: 'tail-wag' },
    { id: 'viralata', name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua', anim: 'tail-wag' }, // alias legado
    { id: 'preguica', name: 'Bicho-preguiça', emoji: '🦥', blurb: 'Calma sergipana', anim: 'slow-sway' },
    { id: 'gaviao', name: 'Gavião-carijó', emoji: '🦅', blurb: 'Olho na cidade', anim: 'wing-soar' },
    { id: 'jabuti', name: 'Jabuti', emoji: '🐢', blurb: 'Passo firme', anim: 'shell-bob' },
    { id: 'suindara', name: 'Suindara', emoji: '🦉', blurb: 'Noite na roda', anim: 'night-blink' },
    { id: 'prea', name: 'Preá', emoji: '🐹', blurb: 'Esperto do mato', anim: 'nibble-hop' }
  ];


  function migrateSpecies(s) {
    if (!s) return s;
    if (s.speciesId === 'viralata') s.speciesId = 'caramelo';
    return s;
  }

  function speciesById(id) {
    if (id === 'viralata') id = 'caramelo';
    for (var i = 0; i < SPECIES.length; i++) {
      if (SPECIES[i].id === id) return SPECIES[i];
    }
    return SPECIES[0];
  }

  function speciesEmoji(s, stageId) {
    var sp = speciesById(s && s.speciesId);
    if (!stageId || stageId === 'ovo') return '🥚';
    return sp.emoji || '🐾';
  }

  function defaultState() {
    var now = Date.now();
    return {
      started: false, speciesId: null, name: 'Cri', bornAt: now, started_at: now, lastTick: now,
      hunger: 85, happy: 85, energy: 85, hygiene: 85, health: 100,
      shell: 'rosa', sleeping: false, sick: false, alive: true,
      careScore: 0, feedCount: 0, playCount: 0, cleanCount: 0,
      afterCount: 0, scrapCount: 0, stageId: 'ovo', evolutions: 0,
      cards: {}, log: [],
      // Resonância da Roda — evolução por caminho (único CRICRI)
      resonance: { afeto: 0, ritual: 0, cortejo: 0, voz: 0 },
      formId: null,
      pendingStageId: null,
      evoPulse: 0,
      genome: null
    };
  }

  var FORM_META = {
    barroco: { label: 'Barroco', blurb: 'Afeto e excesso — laços da roda', hue: '#e33d6b' },
    azulejo: { label: 'Azulejo', blurb: 'Ritual e cuidado — azul de São Cristóvão', hue: '#5eb0d4' },
    cortejo: { label: 'Cortejo', blurb: 'Rua e festa — ocre do centro histórico', hue: '#d49a2c' },
    lenda: { label: 'Lenda', blurb: 'Voz e scrap — memória da praça', hue: '#b48cff' },
    total: { label: 'Cabrunco Total', blurb: 'As quatro vozes da roda em uníssono', hue: '#f2e8d2' }
  };

  function ensureResonance(s) {
    if (!s.resonance || typeof s.resonance !== 'object') {
      s.resonance = { afeto: 0, ritual: 0, cortejo: 0, voz: 0 };
    }
    ['afeto', 'ritual', 'cortejo', 'voz'].forEach(function (k) {
      s.resonance[k] = Math.max(0, Math.min(100, Number(s.resonance[k]) || 0));
    });
    return s.resonance;
  }

  function addResonance(s, key, amount) {
    var r = ensureResonance(s);
    if (!r[key] && r[key] !== 0) return;
    r[key] = Math.max(0, Math.min(100, r[key] + (amount || 0)));
    s.evoPulse = (s.evoPulse || 0) + Math.abs(amount || 0);
  }

  function dominantForm(s) {
    var r = ensureResonance(s);
    var entries = [
      ['afeto', r.afeto, 'barroco'],
      ['ritual', r.ritual, 'azulejo'],
      ['cortejo', r.cortejo, 'cortejo'],
      ['voz', r.voz, 'lenda']
    ];
    var min = Math.min(r.afeto, r.ritual, r.cortejo, r.voz);
    var max = Math.max(r.afeto, r.ritual, r.cortejo, r.voz);
    // Cabrunco Total: todas as vozes sintonizadas
    if (min >= 28 && max >= 40) return 'total';
    entries.sort(function (a, b) { return b[1] - a[1]; });
    return entries[0][2];
  }

  function resonanceTotal(s) {
    var r = ensureResonance(s);
    return r.afeto + r.ritual + r.cortejo + r.voz;
  }


  /** Quanto de resonância mínima pra responder a um estágio */
  function resonanceNeedForStage(stageId) {
    /* soma das 4 vozes (0–400 teórico; jogo ~0–120 típico) */
    var map = { bebe: 4, filhote: 16, cria: 28, festa: 42, adulta: 58, ancia: 75 };
    return map[stageId] != null ? map[stageId] : 12;
  }

  /* ============================================================
   *  GENOMA & MUTAÇÃO GENÉTICA — CRICRI
   *  Cada pet carrega um seed estável + alelos + mutações raras.
   *  Mutações surgem na evolução, sob estresse ou sinergia de forma.
   * ============================================================ */
  var MUTATION_CATALOG = [
    { id: 'mancha_dourada', name: 'Mancha Dourada', rarity: 'comum', emoji: '✦',
      blurb: 'Pelo marcado pelo sol da Praça São Francisco',
      gene: 'pattern', allele: 'dourado',
      fx: { happy: 2 }, visual: 'gold-spot' },
    { id: 'olho_roda', name: 'Olho da Roda', rarity: 'raro', emoji: '◎',
      blurb: 'Olhar que guarda o zum-zum-zum da cidade',
      gene: 'eyes', allele: 'roda',
      fx: { happy: 3, energy: -1 }, visual: 'eye-roda' },
    { id: 'eco_grilo', name: 'Eco do Grilo', rarity: 'raro', emoji: '♪',
      blurb: 'Cricri embutido no DNA — o feed nunca cala',
      gene: 'voice', allele: 'eco',
      fx: { happy: 4 }, visual: 'echo-notes', speciesBonus: 'grilo' },
    { id: 'pata_rua', name: 'Pata de Rua', rarity: 'comum', emoji: '🐾',
      blurb: 'Callos de quem correu a Rua da Feira',
      gene: 'limb', allele: 'rua',
      fx: { energy: 3, hygiene: -1 }, visual: 'paw-street', speciesBonus: 'caramelo' },
    { id: 'casco_azulejo', name: 'Casco Azulejo', rarity: 'raro', emoji: '◇',
      blurb: 'Escamas no azul de São Cristóvão',
      gene: 'pattern', allele: 'azulejo',
      fx: { hygiene: 3 }, visual: 'shell-tile', speciesBonus: 'jabuti' },
    { id: 'asa_fantasma', name: 'Asa Fantasma', rarity: 'raro', emoji: '✧',
      blurb: 'Asa que só a noite enxerga',
      gene: 'limb', allele: 'fantasma',
      fx: { energy: 2 }, visual: 'ghost-wing', speciesBonus: ['gaviao', 'suindara'] },
    { id: 'barroco_vivo', name: 'Barroco Vivo', rarity: 'raro', emoji: '❦',
      blurb: 'Ornamentos que pulsam com a Roda',
      gene: 'aura', allele: 'barroco',
      fx: { happy: 5 }, visual: 'baroque-pulse', formBonus: 'barroco' },
    { id: 'neon_fasc', name: 'Neon FASC', rarity: 'super', emoji: '◈',
      blurb: 'Luz de festival no sangue',
      gene: 'aura', allele: 'neon',
      fx: { happy: 4, energy: 2 }, visual: 'neon-glow' },
    { id: 'silencio_lento', name: 'Silêncio Lento', rarity: 'comum', emoji: '…',
      blurb: 'Tempo sergipano no metabolismo',
      gene: 'tempo', allele: 'lento',
      fx: { energy: 4, hunger: 2 }, visual: 'slow-aura', speciesBonus: 'preguica' },
    { id: 'chifre_prisma', name: 'Chifre Prisma', rarity: 'super', emoji: '▲',
      blurb: 'Horn que refrata o ocre do centro',
      gene: 'mark', allele: 'prisma',
      fx: { happy: 6 }, visual: 'prism-horn', speciesBonus: 'unicornio' },
    { id: 'mutacao_total', name: 'Mutação Total', rarity: 'super', emoji: '✹',
      blurb: 'As quatro vozes reescreveram o genoma',
      gene: 'aura', allele: 'total',
      fx: { happy: 5, health: 5, energy: 3 }, visual: 'total-chroma', formBonus: 'total' },
    { id: 'feral_noite', name: 'Feral da Noite', rarity: 'raro', emoji: '☾',
      blurb: 'Acordou no after e não voltou igual',
      gene: 'tempo', allele: 'feral',
      fx: { energy: 5, happy: 2, hygiene: -2 }, visual: 'feral-night' },
    { id: 'env_poeira_feira', name: 'Poeira da Feira', rarity: 'comum', emoji: '🌫',
      blurb: 'Partículas da Rua da Feira grudadam no genoma',
      gene: 'pattern', allele: 'feira', fx: { hygiene: -1, energy: 2 }, visual: 'env-dust' },
    { id: 'env_luz_convento', name: 'Luz do Convento', rarity: 'raro', emoji: '⛪',
      blurb: 'Claridade do São Francisco queimou um locus',
      gene: 'aura', allele: 'sagrado', fx: { happy: 4, health: 2 }, visual: 'env-convento' },
    { id: 'env_bass_after', name: 'Bass no Osso', rarity: 'raro', emoji: '🔊',
      blurb: 'Grave do after reescreveu o ritmo interno',
      gene: 'tempo', allele: 'bass', fx: { energy: 4, happy: 2 }, visual: 'env-bass' },
    { id: 'env_sereno_sc', name: 'Sereno de SC', rarity: 'comum', emoji: '🌙',
      blurb: 'Orvalho da madrugada no centro histórico',
      gene: 'coat', allele: 'sereno', fx: { hygiene: 2, energy: 1 }, visual: 'env-sereno' },
    { id: 'env_multidao', name: 'Selo da Multidão', rarity: 'super', emoji: '◉',
      blurb: 'Calor humano do festival fixou no DNA',
      gene: 'aura', allele: 'multidao', fx: { happy: 5, energy: 2 }, visual: 'env-crowd' },
    { id: 'env_pedra_largo', name: 'Pedra do Largo', rarity: 'raro', emoji: '🪨',
      blurb: 'Largo do Amparo — casco/pata mineralizado',
      gene: 'limb', allele: 'pedra', fx: { hygiene: 1, energy: 1 }, visual: 'env-stone' }
  ];

  function mutationById(id) {
    for (var i = 0; i < MUTATION_CATALOG.length; i++) {
      if (MUTATION_CATALOG[i].id === id) return MUTATION_CATALOG[i];
    }
    return null;
  }

  function ensureGenome(s) {
    if (!s.genome || typeof s.genome !== 'object') {
      s.genome = {
        seed: (Math.abs((s.bornAt || Date.now()) ^ ((s.name || 'Cri').length * 9973)) % 1e9) || 1,
        alleles: { coat: 'base', pattern: 'solid', eyes: 'base', aura: 'none', tempo: 'steady', voice: 'soft', limb: 'base' },
        mutations: [],
        hybrids: [],
        echoes: [],
        hybridPhenotype: null,
        epi: [],
        envExposure: {}
      };
    }
    if (!Array.isArray(s.genome.mutations)) s.genome.mutations = [];
    if (!Array.isArray(s.genome.hybrids)) s.genome.hybrids = [];
    if (!Array.isArray(s.genome.echoes)) s.genome.echoes = [];
    if (!Array.isArray(s.genome.epi)) s.genome.epi = [];
    if (!s.genome.envExposure || typeof s.genome.envExposure !== 'object') s.genome.envExposure = {};
    if (!s.genome.alleles) s.genome.alleles = {};
    if (!s.genome.seed) s.genome.seed = Date.now() % 1e9;
    if (s.genome.hybridPhenotype === undefined) s.genome.hybridPhenotype = null;
    return s.genome;
  }

  /** Dominância / taxa de herança por mutação */
  var MUTATION_HEREDITY = {
    mancha_dourada: { dominance: 'dominant', inheritRate: 0.55, expressRate: 0.9 },
    olho_roda:      { dominance: 'dominant', inheritRate: 0.4, expressRate: 0.85 },
    eco_grilo:      { dominance: 'codominant', inheritRate: 0.5, expressRate: 0.8 },
    pata_rua:       { dominance: 'dominant', inheritRate: 0.6, expressRate: 0.95 },
    casco_azulejo:  { dominance: 'recessive', inheritRate: 0.7, expressRate: 0.35 },
    asa_fantasma:   { dominance: 'recessive', inheritRate: 0.55, expressRate: 0.4 },
    barroco_vivo:   { dominance: 'codominant', inheritRate: 0.45, expressRate: 0.75 },
    neon_fasc:      { dominance: 'dominant', inheritRate: 0.25, expressRate: 0.7 },
    silencio_lento: { dominance: 'recessive', inheritRate: 0.65, expressRate: 0.45 },
    chifre_prisma:  { dominance: 'dominant', inheritRate: 0.3, expressRate: 0.8 },
    mutacao_total:  { dominance: 'codominant', inheritRate: 0.2, expressRate: 0.9 },
    feral_noite:    { dominance: 'recessive', inheritRate: 0.5, expressRate: 0.5 },
    env_poeira_feira: { dominance: 'dominant', inheritRate: 0.35, expressRate: 0.9 },
    env_luz_convento: { dominance: 'codominant', inheritRate: 0.25, expressRate: 0.85 },
    env_bass_after: { dominance: 'dominant', inheritRate: 0.3, expressRate: 0.8 },
    env_sereno_sc: { dominance: 'recessive', inheritRate: 0.4, expressRate: 0.5 },
    env_multidao: { dominance: 'codominant', inheritRate: 0.15, expressRate: 0.9 },
    env_pedra_largo: { dominance: 'recessive', inheritRate: 0.35, expressRate: 0.55 }
  };

  function heredityOf(id) {
    return MUTATION_HEREDITY[id] || { dominance: 'dominant', inheritRate: 0.4, expressRate: 0.75 };
  }

  /** Normaliza entrada legada (string) → objeto rico */
  function normalizeMutEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { id: entry, origin: 'de_novo', expressed: true, latent: false, from: null, at: 0 };
    }
    return {
      id: entry.id,
      origin: entry.origin || 'de_novo',
      expressed: entry.expressed !== false && !entry.latent,
      latent: !!entry.latent,
      from: entry.from || null,
      at: entry.at || 0
    };
  }

  function listMutEntries(s) {
    var g = ensureGenome(s);
    return (g.mutations || []).map(normalizeMutEntry).filter(Boolean);
  }

  function hasMutation(s, id) {
    var list = listMutEntries(s);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }

  function hasExpressedMutation(s, id) {
    var list = listMutEntries(s);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].expressed && !list[i].latent) return true;
    }
    return false;
  }

  function isCarrier(s, id) {
    var list = listMutEntries(s);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && (list[i].latent || !list[i].expressed)) return true;
    }
    return false;
  }

  function mutationCount(s) {
    return listMutEntries(s).length;
  }

  function expressedMutationCount(s) {
    var n = 0;
    listMutEntries(s).forEach(function (e) { if (e.expressed && !e.latent) n++; });
    return n;
  }

  /** Garante storage como objetos (migra strings legadas) */
  function migrateMutationEntries(s) {
    var g = ensureGenome(s);
    var next = [];
    var seen = {};
    (g.mutations || []).forEach(function (raw) {
      var e = normalizeMutEntry(raw);
      if (!e || seen[e.id]) return;
      seen[e.id] = true;
      next.push(e);
    });
    g.mutations = next;
    return g;
  }


  /** RNG estável por seed + salt (mutações determinísticas por contexto) */
  function genomeRand(seed, salt) {
    var x = (Number(seed) || 1) + (Number(salt) || 0) * 7919;
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  }

  function mutationEligible(s, mut) {
    if (!mut || hasMutation(s, mut.id)) return false;
    if (mut.speciesBonus) {
      var sp = s.speciesId === 'viralata' ? 'caramelo' : s.speciesId;
      var list = Array.isArray(mut.speciesBonus) ? mut.speciesBonus : [mut.speciesBonus];
      // bônus de espécie: não bloqueia, só aumenta chance depois
    }
    if (mut.formBonus && s.formId && mut.formBonus !== s.formId) {
      // forma errada: ainda pode, chance menor
    }
    return true;
  }

  function mutationWeight(s, mut) {
    if (!mutationEligible(s, mut)) return 0;
    var w = mut.rarity === 'super' ? 1 : (mut.rarity === 'raro' ? 3 : 6);
    var sp = s.speciesId === 'viralata' ? 'caramelo' : s.speciesId;
    if (mut.speciesBonus) {
      var list = Array.isArray(mut.speciesBonus) ? mut.speciesBonus : [mut.speciesBonus];
      if (list.indexOf(sp) !== -1) w *= 3.5;
    }
    if (mut.formBonus && s.formId === mut.formBonus) w *= 3;
    // resonância extrema favorece mutação
    var r = ensureResonance(s);
    var maxR = Math.max(r.afeto, r.ritual, r.cortejo, r.voz);
    var minR = Math.min(r.afeto, r.ritual, r.cortejo, r.voz);
    if (maxR - minR > 35) w *= 1.4; // desequilíbrio genético
    if (s.sick) w *= 1.25;
    if ((s.evolutions || 0) >= 3) w *= 1.2;
    return w;
  }

  function pickMutation(s, salt) {
    var g = ensureGenome(s);
    var pool = [];
    var total = 0;
    for (var i = 0; i < MUTATION_CATALOG.length; i++) {
      var m = MUTATION_CATALOG[i];
      var w = mutationWeight(s, m);
      if (w <= 0) continue;
      pool.push({ m: m, w: w });
      total += w;
    }
    if (!pool.length || total <= 0) return null;
    var roll = genomeRand(g.seed, salt || (s.evolutions || 0) * 17 + Date.now() % 997) * total;
    var acc = 0;
    for (var j = 0; j < pool.length; j++) {
      acc += pool[j].w;
      if (roll <= acc) return pool[j].m;
    }
    return pool[pool.length - 1].m;
  }

  /**
   * Tenta mutar. reason: 'evolve' | 'stress' | 'after' | 'total'
   * Retorna a mutação aplicada ou null.
   */
  function tryMutate(s, reason) {
    if (!s || !s.alive || !s.started) return null;
    var g = ensureGenome(s);
    // chance base por contexto
    var chance = 0.18;
    if (reason === 'evolve') chance = 0.28 + Math.min(0.25, (s.evolutions || 0) * 0.04);
    if (reason === 'stress') chance = 0.12;
    if (reason === 'after') chance = 0.15;
    if (reason === 'total') chance = 0.55;
    if (s.formId === 'total') chance += 0.12;
    if (mutationCount(s) >= 5) chance *= 0.35; // soft cap
    if (mutationCount(s) >= 8) return null;

    var roll = genomeRand(g.seed, (s.evolutions || 0) * 31 + (reason || '').length * 13 + (s.careScore || 0));
    // mistura com aleatório real pra não ser 100% previsível
    roll = (roll * 0.65 + Math.random() * 0.35);
    if (roll > chance) return null;

    var mut = pickMutation(s, (s.evolutions || 0) * 101 + mutationCount(s) * 7);
    if (!mut) return null;
    return applyMutation(s, mut.id, reason);
  }

  function applyMutation(s, mutId, reason, opts) {
    opts = opts || {};
    var mut = mutationById(mutId);
    if (!mut || hasMutation(s, mutId)) return null;
    var g = migrateMutationEntries(s);
    var origin = opts.origin || reason || 'de_novo';
    if (origin === 'hybrid') origin = 'inherited';
    var h = heredityOf(mutId);
    var latent = !!opts.latent;
    // recessivo herdado sem segundo allele → tende a ficar latente (portador)
    if (origin === 'inherited' && h.dominance === 'recessive' && opts.forceExpressed !== true) {
      if (opts.expressed !== true) latent = genomeRand(g.seed, mutId.length * 11 + g.mutations.length) > h.expressRate;
    }
    if (opts.expressed === false) latent = true;
    var expressed = !latent && opts.expressed !== false;

    g.mutations.push({
      id: mutId,
      origin: origin === 'evolve' || origin === 'stress' || origin === 'after' || origin === 'total' ? 'de_novo' : origin,
      expressed: expressed,
      latent: latent,
      from: opts.from || null,
      at: Date.now()
    });

    if (expressed && mut.gene && mut.allele) {
      g.alleles[mut.gene] = mut.allele;
    }
    // micro efeito só se expressa
    if (expressed && mut.fx) {
      if (mut.fx.happy) s.happy = clamp((s.happy || 0) + mut.fx.happy, 0, 100);
      if (mut.fx.energy) s.energy = clamp((s.energy || 0) + mut.fx.energy, 0, 100);
      if (mut.fx.hygiene) s.hygiene = clamp((s.hygiene || 0) + mut.fx.hygiene, 0, 100);
      if (mut.fx.hunger) s.hunger = clamp((s.hunger || 0) + mut.fx.hunger, 0, 100);
      if (mut.fx.health) s.health = clamp((s.health || 0) + mut.fx.health, 0, 100);
    }
    var tag = latent ? 'portador' : (origin === 'inherited' ? 'herdada' : 'nova');
    pushLog(s, 'Mutação ' + mut.emoji + ' ' + mut.name + ' · ' + tag + (opts.from ? ' ← ' + opts.from : ''));
    if (expressed) {
      if (mut.rarity === 'super') grantCard(s, 'sr_mutacao', true);
      else if (mut.rarity === 'raro') grantCard(s, 'r_mutacao', true);
      else grantCard(s, 'c_mutacao', true);
    }
    return mut;
  }

  /**
   * Tenta herdar mutações de um doador (eco / genoma).
   * Retorna lista de { mut, entry } aplicadas.
   */
  function inheritMutationsFrom(s, donor, donorLabel) {
    var g = migrateMutationEntries(s);
    var donorMuts = [];
    if (donor && Array.isArray(donor.mutations)) {
      donorMuts = donor.mutations.map(function (m) {
        return typeof m === 'string' ? m : (m && m.id);
      }).filter(Boolean);
    }
    if (!donorMuts.length) return [];

    var applied = [];
    var label = donorLabel || (donor && donor.name) || 'eco';

    donorMuts.forEach(function (mutId, idx) {
      if (hasMutation(s, mutId)) return;
      var h = heredityOf(mutId);
      var rate = h.inheritRate;
      // codominante: um pouco mais estável na herança
      if (h.dominance === 'codominant') rate = Math.min(0.85, rate + 0.08);
      // já tem mutação no mesmo gene → interferência
      var mut = mutationById(mutId);
      if (mut && mut.gene) {
        var clash = listMutEntries(s).some(function (e) {
          var m2 = mutationById(e.id);
          return m2 && m2.gene === mut.gene && e.expressed;
        });
        if (clash) rate *= 0.45;
      }
      var roll = genomeRand(g.seed, 200 + idx * 17 + g.mutations.length * 3 + (g.hybrids.length || 0));
      // mistura leve com random para não ser 100% determinístico
      roll = roll * 0.7 + Math.random() * 0.3;
      if (roll > rate) return;

      var forceExpress = h.dominance === 'dominant' && genomeRand(g.seed, 300 + idx) < h.expressRate;
      var result = applyMutation(s, mutId, 'inherited', {
        origin: 'inherited',
        from: label,
        latent: h.dominance === 'recessive' && !forceExpress,
        expressed: forceExpress || h.dominance === 'dominant' || h.dominance === 'codominant'
          ? (genomeRand(g.seed, 400 + idx) < h.expressRate)
          : false
      });
      // simplify expressed logic for recessive
      if (result && h.dominance === 'recessive') {
        // re-read last entry
        var last = g.mutations[g.mutations.length - 1];
        if (last && last.id === mutId) {
          last.latent = true;
          last.expressed = false;
          last.origin = 'inherited';
          last.from = label;
        }
      }
      if (result) applied.push({ mut: result, id: mutId });
    });

    // Recessivos: se herdou o mesmo gene latente 2x (eco diferente) → expressa
    tryExpressCarriers(s);
    return applied;
  }

  /** Portadores recessivos podem expressar se acumularem pressão (evolução / 2ª herança) */
  function tryExpressCarriers(s, reason) {
    var g = migrateMutationEntries(s);
    var expressedNow = [];
    g.mutations.forEach(function (e) {
      var entry = normalizeMutEntry(e);
      if (!entry || !entry.latent) return;
      var h = heredityOf(entry.id);
      var chance = h.expressRate * 0.5;
      if (reason === 'evolve') chance = h.expressRate * 0.85;
      if (reason === 'hybrid') chance = h.expressRate * 0.7;
      // segundo eco da mesma mutação
      if (entry.origin === 'inherited' && h.dominance === 'recessive') chance += 0.15;
      if (Math.random() > chance) return;
      e.latent = false;
      e.expressed = true;
      var mut = mutationById(entry.id);
      if (mut && mut.gene && mut.allele) g.alleles[mut.gene] = mut.allele;
      if (mut && mut.fx) {
        if (mut.fx.happy) s.happy = clamp((s.happy || 0) + Math.ceil((mut.fx.happy || 0) / 2), 0, 100);
      }
      pushLog(s, 'Expressou mutação herdada · ' + (mut ? mut.name : entry.id));
      expressedNow.push(mut || entry);
    });
    return expressedNow;
  }


  /** Modificadores passivos agregados das mutações (decay / ações) */
  function genomeModifiers(s) {
    var mod = { happyDecay: 1, energyDecay: 1, hungerDecay: 1, hygieneDecay: 1, careBonus: 0 };
    listMutEntries(s).forEach(function (e) {
      if (!e.expressed || e.latent) return;
      var mut = mutationById(e.id);
      if (!mut || !mut.fx) return;
      if (mut.fx.energy > 0) mod.energyDecay *= 0.92;
      if (mut.fx.happy > 0) mod.happyDecay *= 0.94;
      if (mut.fx.hygiene < 0) mod.hygieneDecay *= 1.06;
      if (mut.fx.hunger > 0) mod.hungerDecay *= 0.95;
      mod.careBonus += 0.15;
    });
    var g = ensureGenome(s);
    if (g.alleles.tempo === 'lento') {
      mod.energyDecay *= 0.85;
      mod.hungerDecay *= 0.9;
    }
    if (g.alleles.tempo === 'feral') {
      mod.energyDecay *= 0.8;
      mod.hygieneDecay *= 1.1;
    }
    return mod;
  }

  function genomeVisualClasses(s) {
    var g = ensureGenome(s);
    var cls = ['genome-active'];
    listMutEntries(s).forEach(function (e) {
      if (!e.expressed || e.latent) return;
      var mut = mutationById(e.id);
      if (mut && mut.visual) cls.push('mut-' + mut.visual);
    });
    if (g.alleles.aura && g.alleles.aura !== 'none') cls.push('allele-aura-' + g.alleles.aura);
    if (g.alleles.tempo) cls.push('allele-tempo-' + g.alleles.tempo);
    if (g.hybridPhenotype) {
      var ht = hybridTraitById(g.hybridPhenotype);
      if (ht && ht.visual) cls.push('mut-' + ht.visual);
      cls.push('is-hybrid');
    }
    if (g.hybrids && g.hybrids.length) cls.push('hybrid-count-' + Math.min(g.hybrids.length, 5));
    try {
      epiVisualClasses(s).forEach(function (c) { if (c) cls.push(c); });
    } catch (_) {}
    return cls.join(' ');
  }

  function renderGenomePanel(s) {
    var panel = $('genome-panel');
    if (!panel) return;
    var g = ensureGenome(s);
    var html = '';
    if (g.hybridPhenotype) {
      var ht = hybridTraitById(g.hybridPhenotype);
      if (ht) {
        html += '<p class="genome-title">Fenótipo híbrido</p>';
        html += '<span class="genome-chip rarity-' + (ht.rarity || 'raro') + ' is-hybrid-chip" title="' + ht.blurb + '">' +
          ht.emoji + ' ' + ht.name + '</span>';
      }
    }
    var entries = listMutEntries(s);
    if (entries.length) {
      html += '<p class="genome-title">Mutações · ' + entries.length + '</p><div class="genome-chips">';
      entries.forEach(function (e) {
        var mut = mutationById(e.id);
        if (!mut) return;
        var tag = e.latent ? ' · portador' : (e.origin === 'inherited' ? ' · herdada' : '');
        var extra = e.latent ? ' is-latent' : (e.origin === 'inherited' ? ' is-inherited' : '');
        html += '<span class="genome-chip rarity-' + mut.rarity + extra + '" title="' + mut.blurb + tag + (e.from ? ' ← ' + e.from : '') + '">' +
          mut.emoji + ' ' + mut.name + (e.latent ? ' (latente)' : '') + '</span>';
      });
      html += '</div>';
    }
    if (g.echoes && g.echoes.length) {
      html += '<p class="genome-title">Ecos · ' + g.echoes.length + '</p>';
      html += '<p class="genome-empty">Prontos para hibridizar na Roda</p>';
    }
    var epis = [];
    try { epis = activeEpi(s); } catch (_) {}
    if (epis.length) {
      html += '<p class="genome-title">Epigenética · ' + epis.length + '</p><div class="genome-chips">';
      epis.forEach(function (e) {
        var mark = epiMarkById(e.id);
        if (!mark) return;
        var left = Math.max(0, e.until - Date.now());
        var hrs = Math.round(left / 3600000 * 10) / 10;
        html += '<span class="genome-chip is-epi" title="' + mark.blurb + ' · ' + hrs + 'h">' +
          mark.emoji + ' ' + mark.name + '</span>';
      });
      html += '</div>';
    }
    if (!html) {
      html = '<p class="genome-empty">Genoma estável · Roda · mapa · after · ecos</p>';
    }
    html += '<button type="button" class="hx-open-btn" data-action="hybridize"><span class="hx-open-ico" aria-hidden="true">🧬</span><span class="hx-open-txt">Roda genética</span><span class="hx-open-sub">Hibridizar · Acasalar</span></button>';
    panel.innerHTML = html;
  }

  function showMutationToast(mut) {
    if (!mut) return;
    var el = $('card-toast');
    if (!el) {
      // fallback toast
      el = document.createElement('div');
      el.id = 'mutation-toast';
      el.className = 'mutation-toast';
      document.body.appendChild(el);
    }
    el.hidden = false;
    el.className = (el.id === 'card-toast' ? 'card-toast rarity-' + mut.rarity : 'mutation-toast rarity-' + mut.rarity);
    el.innerHTML = '<span class="ct-emoji">' + mut.emoji + '</span><span><strong>Mutação · ' + mut.name +
      '</strong><small>' + mut.blurb + '</small></span>';
    clearTimeout(showMutationToast._t);
    showMutationToast._t = setTimeout(function () { el.hidden = true; }, 3200);
  }


  /* ============================================================
   *  HIBRIDIZAÇÃO GENÉTICA — encontro de genomas na Roda
   *  Não troca a espécie. Cruza alelos + pode gerar traço híbrido.
   *  Ecos vêm de encontros mútuos no mapa (CRICRI Meet).
   * ============================================================ */
  var HYBRID_TRAITS = [
    { id: 'hx_grilo_cao', name: 'Cricri de Rua', emoji: '🐕♪', parents: ['grilo', 'caramelo'],
      blurb: 'Latido que vira zum-zum-zum', visual: 'hx-street-chirp', rarity: 'raro' },
    { id: 'hx_uni_coruja', name: 'Lua de Prisma', emoji: '🦄☾', parents: ['unicornio', 'suindara'],
      blurb: 'Chifre sob luar da praça', visual: 'hx-moon-prism', rarity: 'super' },
    { id: 'hx_jabuti_gaviao', name: 'Casco de Voo', emoji: '🐢✧', parents: ['jabuti', 'gaviao'],
      blurb: 'Passo firme com olho no horizonte', visual: 'hx-shell-soar', rarity: 'raro' },
    { id: 'hx_preguica_prea', name: 'Mato Paciente', emoji: '🦥🐹', parents: ['preguica', 'prea'],
      blurb: 'Espera sergipana, pulo certeiro', visual: 'hx-slow-hop', rarity: 'comum' },
    { id: 'hx_gaviao_grilo', name: 'Voo Sonoro', emoji: '🦅♪', parents: ['gaviao', 'grilo'],
      blurb: 'Asa que carrega o som do CRICRI', visual: 'hx-wing-song', rarity: 'raro' },
    { id: 'hx_caramelo_suindara', name: 'Guarda da Noite', emoji: '🐕☾', parents: ['caramelo', 'suindara'],
      blurb: 'Coração de rua sob a suindara', visual: 'hx-night-guard', rarity: 'raro' },
    { id: 'hx_uni_jabuti', name: 'Lenda Lenta', emoji: '🦄🐢', parents: ['unicornio', 'jabuti'],
      blurb: 'Magia com passo de cortejo', visual: 'hx-legend-shell', rarity: 'super' },
    { id: 'hx_any_barroco', name: 'Eco Barroco', emoji: '❦', parents: null,
      blurb: 'Ornamento de dois genomas na Roda', visual: 'hx-baroque', rarity: 'comum', needForm: 'barroco' },
    { id: 'hx_any_total', name: 'Fusão da Roda', emoji: '✹', parents: null,
      blurb: 'Quatro vozes de dois corpos', visual: 'hx-fusion', rarity: 'super', needForm: 'total' },
    { id: 'hx_generic', name: 'Mestiço do Centro', emoji: '🧬', parents: null,
      blurb: 'Mistura de São Cristóvão — sem espécie fixa', visual: 'hx-mestizo', rarity: 'comum' }
  ];

  var ALLELE_KEYS = ['coat', 'pattern', 'eyes', 'aura', 'tempo', 'voice', 'limb'];

  function hybridTraitById(id) {
    for (var i = 0; i < HYBRID_TRAITS.length; i++) {
      if (HYBRID_TRAITS[i].id === id) return HYBRID_TRAITS[i];
    }
    return null;
  }

  function normalizeSpeciesId(id) {
    if (id === 'viralata') return 'caramelo';
    return id || null;
  }

  /** Eco genético de um amigo (sem lat/lng — só identidade social) */

  /* ============================================================
   *  MUTAÇÕES AMBIENTAIS & EPIGENÉTICA
   *  Ambiente (mapa, after, noite, calor, estresse) marca o genoma.
   *  Epi = reversível (TTL). Env mut = permanente, só por contexto.
   * ============================================================ */
  var EPIGENETIC_MARKS = [
    { id: 'epi_sol_praca', name: 'Sol da Praça', emoji: '☀',
      blurb: 'Metilação leve — pelo mais claro por um tempo',
      trigger: 'spot_praca', ttlMs: 6 * 3600000,
      fx: { happy: 1 }, visual: 'epi-sun', stack: 2 },
    { id: 'epi_noite_centro', name: 'Noite no Centro', emoji: '☾',
      blurb: 'Genes de vigília ligados após a meia-noite',
      trigger: 'night', ttlMs: 8 * 3600000,
      fx: { energy: 2, hygiene: -1 }, visual: 'epi-night', stack: 2 },
    { id: 'epi_afterglow', name: 'Afterglow', emoji: '✧',
      blurb: 'Ressaca epigenética do after — dopamina alta',
      trigger: 'after', ttlMs: 4 * 3600000,
      fx: { happy: 3, energy: -2 }, visual: 'epi-after', stack: 3 },
    { id: 'epi_calor_rua', name: 'Calor de Rua', emoji: '♨',
      blurb: 'Heat map da cidade imprimiu no metabolismo',
      trigger: 'heat', ttlMs: 5 * 3600000,
      fx: { energy: -1, happy: 2 }, visual: 'epi-heat', stack: 2 },
    { id: 'epi_sono_profundo', name: 'Silêncio Metilado', emoji: '💤',
      blurb: 'Sono longo silenciou genes de estresse',
      trigger: 'sleep', ttlMs: 10 * 3600000,
      fx: { energy: 3, happy: 1 }, visual: 'epi-sleep', stack: 1 },
    { id: 'epi_estresse', name: 'Cicatriz Epigenética', emoji: '⚡',
      blurb: 'Doença grave deixou marca transitória',
      trigger: 'stress', ttlMs: 12 * 3600000,
      fx: { hygiene: -1, energy: -1 }, visual: 'epi-stress', stack: 2 },
    { id: 'epi_roda_eco', name: 'Eco da Roda', emoji: '◎',
      blurb: 'Evolução recente ainda repercute na expressão gênica',
      trigger: 'evolve', ttlMs: 3 * 3600000,
      fx: { happy: 2 }, visual: 'epi-roda', stack: 2 },
    { id: 'epi_chuva_sc', name: 'Umidade do São Francisco', emoji: '🌧',
      blurb: 'Noite úmida — genes de higiene em alerta',
      trigger: 'damp', ttlMs: 5 * 3600000,
      fx: { hygiene: 2 }, visual: 'epi-damp', stack: 2 }
  ];

  /** Mutações permanentes só desbloqueáveis por ambiente */
  var ENV_MUTATIONS = [
    { id: 'env_poeira_feira', name: 'Poeira da Feira', rarity: 'comum', emoji: '🌫',
      blurb: 'Partículas da Rua da Feira grudadam no genoma',
      visual: 'env-dust', gene: 'pattern', allele: 'feira',
      needExposure: { mapa: 3 }, chance: 0.22,
      fx: { hygiene: -1, energy: 2 } },
    { id: 'env_luz_convento', name: 'Luz do Convento', rarity: 'raro', emoji: '⛪',
      blurb: 'Claridade do São Francisco queimou um locus',
      visual: 'env-convento', gene: 'aura', allele: 'sagrado',
      needSpot: ['convento-sao-francisco', 'praca-sao-francisco'], chance: 0.18,
      fx: { happy: 4, health: 2 } },
    { id: 'env_bass_after', name: 'Bass no Osso', rarity: 'raro', emoji: '🔊',
      blurb: 'Grave do after reescreveu o ritmo interno',
      visual: 'env-bass', gene: 'tempo', allele: 'bass',
      needExposure: { after: 3 }, chance: 0.2,
      fx: { energy: 4, happy: 2 } },
    { id: 'env_sereno_sc', name: 'Sereno de SC', rarity: 'comum', emoji: '🌙',
      blurb: 'Orvalho da madrugada no centro histórico',
      visual: 'env-sereno', gene: 'coat', allele: 'sereno',
      needTrigger: 'night', needExposure: { night: 4 }, chance: 0.2,
      fx: { hygiene: 2, energy: 1 } },
    { id: 'env_multidao', name: 'Selo da Multidão', rarity: 'super', emoji: '◉',
      blurb: 'Calor humano do festival fixou no DNA',
      visual: 'env-crowd', gene: 'aura', allele: 'multidao',
      needExposure: { heat: 5 }, chance: 0.12,
      fx: { happy: 5, energy: 2 } },
    { id: 'env_pedra_largo', name: 'Pedra do Largo', rarity: 'raro', emoji: '🪨',
      blurb: 'Largo do Amparo — casco/pata mineralizado',
      visual: 'env-stone', gene: 'limb', allele: 'pedra',
      needSpot: ['largo-amparo'], chance: 0.2,
      fx: { hygiene: 1, energy: 1 } }
  ];

  function epiMarkById(id) {
    for (var i = 0; i < EPIGENETIC_MARKS.length; i++) {
      if (EPIGENETIC_MARKS[i].id === id) return EPIGENETIC_MARKS[i];
    }
    return null;
  }

  function envMutById(id) {
    for (var i = 0; i < ENV_MUTATIONS.length; i++) {
      if (ENV_MUTATIONS[i].id === id) return ENV_MUTATIONS[i];
    }
    return null;
  }

  function bumpExposure(s, key, amount) {
    var g = ensureGenome(s);
    g.envExposure[key] = (g.envExposure[key] || 0) + (amount || 1);
    return g.envExposure[key];
  }

  function activeEpi(s) {
    var g = ensureGenome(s);
    var now = Date.now();
    return (g.epi || []).filter(function (e) { return e && e.until > now; });
  }

  function pruneEpi(s) {
    var g = ensureGenome(s);
    var now = Date.now();
    var before = g.epi.length;
    g.epi = (g.epi || []).filter(function (e) { return e && e.until > now; });
    return before !== g.epi.length;
  }

  function hasEpi(s, id) {
    return activeEpi(s).some(function (e) { return e.id === id; });
  }

  function applyEpiMark(s, markId, reason) {
    var mark = epiMarkById(markId);
    if (!mark || !s || !s.alive) return null;
    var g = ensureGenome(s);
    pruneEpi(s);
    var stacks = activeEpi(s).filter(function (e) { return e.id === markId; }).length;
    if (stacks >= (mark.stack || 1)) {
      // renova TTL do mais antigo dessa marca
      for (var i = 0; i < g.epi.length; i++) {
        if (g.epi[i].id === markId) {
          g.epi[i].until = Date.now() + mark.ttlMs;
          g.epi[i].reason = reason || mark.trigger;
          break;
        }
      }
      return mark;
    }
    g.epi.push({
      id: markId,
      until: Date.now() + mark.ttlMs,
      reason: reason || mark.trigger,
      at: Date.now()
    });
    if (mark.fx) {
      if (mark.fx.happy) s.happy = clamp((s.happy || 0) + mark.fx.happy, 0, 100);
      if (mark.fx.energy) s.energy = clamp((s.energy || 0) + mark.fx.energy, 0, 100);
      if (mark.fx.hygiene) s.hygiene = clamp((s.hygiene || 0) + mark.fx.hygiene, 0, 100);
    }
    pushLog(s, 'Epi ' + mark.emoji + ' ' + mark.name);
    return mark;
  }

  function tryEnvironmentalMutation(s, context) {
    if (!s || !s.alive || !s.started) return null;
    context = context || {};
    var g = ensureGenome(s);
    var applied = null;

    ENV_MUTATIONS.forEach(function (em) {
      if (applied || hasMutation(s, em.id)) return;
      // requisitos de exposição
      if (em.needExposure) {
        var ok = true;
        Object.keys(em.needExposure).forEach(function (k) {
          if ((g.envExposure[k] || 0) < em.needExposure[k]) ok = false;
        });
        if (!ok) return;
      }
      if (em.needSpot && context.spotId) {
        if (em.needSpot.indexOf(context.spotId) === -1) return;
      } else if (em.needSpot && !context.spotId) {
        return;
      }
      if (em.needTrigger && context.trigger !== em.needTrigger) return;

      var chance = em.chance || 0.15;
      // epi ativa no mesmo “tema” aumenta chance (plasticidade)
      if (context.trigger === 'after' && hasEpi(s, 'epi_afterglow')) chance += 0.08;
      if (context.trigger === 'night' && hasEpi(s, 'epi_noite_centro')) chance += 0.08;
      if (context.trigger === 'heat' && hasEpi(s, 'epi_calor_rua')) chance += 0.1;
      if (s.sick) chance *= 1.15;

      if (Math.random() > chance) return;

      // registra como mutação ambiental permanente
      var mutFake = {
        id: em.id,
        name: em.name,
        rarity: em.rarity,
        emoji: em.emoji,
        blurb: em.blurb,
        gene: em.gene,
        allele: em.allele,
        fx: em.fx,
        visual: em.visual
      };
      // injeta no catálogo runtime se preciso
      if (!mutationById(em.id)) MUTATION_CATALOG.push(mutFake);

      var result = applyMutation(s, em.id, 'environment', {
        origin: 'environment',
        from: context.label || context.trigger || 'ambiente',
        expressed: true,
        forceExpressed: true
      });
      if (result) {
        applied = result;
        try { showMutationToast(result); } catch (_) {}
      }
    });
    return applied;
  }

  /** Avalia ambiente atual (hora, contexto de ação) e aplica epi + env */
  function tickEnvironment(s, context) {
    if (!s || !s.alive || !s.started) return;
    context = context || {};
    pruneEpi(s);

    var hour = new Date().getHours();
    var isNight = hour >= 22 || hour < 5;
    var isDamp = isNight && hour >= 3 && hour < 6;

    if (isNight) {
      bumpExposure(s, 'night', context.nightBump || 0.15);
      if (context.forceNight || Math.random() < 0.08) {
        applyEpiMark(s, 'epi_noite_centro', 'night');
        tryEnvironmentalMutation(s, { trigger: 'night', label: 'madrugada SC' });
      }
    }
    if (isDamp && Math.random() < 0.05) {
      applyEpiMark(s, 'epi_chuva_sc', 'damp');
    }

    if (context.trigger === 'after') {
      bumpExposure(s, 'after', 1);
      applyEpiMark(s, 'epi_afterglow', 'after');
      tryEnvironmentalMutation(s, { trigger: 'after', label: 'after' });
    }
    if (context.trigger === 'mapa') {
      bumpExposure(s, 'mapa', 1);
      tryEnvironmentalMutation(s, { trigger: 'mapa', label: 'mapa', spotId: context.spotId });
    }
    if (context.trigger === 'spot') {
      bumpExposure(s, 'spot', 1);
      if (context.spotId) bumpExposure(s, 'spot:' + context.spotId, 1);
      var spotName = (context.spotName || '').toLowerCase();
      if (/praça|praca|são francisco|sao francisco|convento/i.test(context.spotId || '') || /francisco/i.test(spotName)) {
        applyEpiMark(s, 'epi_sol_praca', 'spot');
      }
      tryEnvironmentalMutation(s, {
        trigger: 'spot',
        spotId: context.spotId,
        label: context.spotName || context.spotId
      });
    }
    if (context.trigger === 'heat') {
      bumpExposure(s, 'heat', 1);
      applyEpiMark(s, 'epi_calor_rua', 'heat');
      tryEnvironmentalMutation(s, { trigger: 'heat', label: 'calor de presença' });
    }
    if (context.trigger === 'sleep') {
      applyEpiMark(s, 'epi_sono_profundo', 'sleep');
    }
    if (context.trigger === 'stress') {
      applyEpiMark(s, 'epi_estresse', 'stress');
    }
    if (context.trigger === 'evolve') {
      applyEpiMark(s, 'epi_roda_eco', 'evolve');
    }
  }

  function epiModifiers(s) {
    var mod = { happyDecay: 1, energyDecay: 1, hygieneDecay: 1 };
    activeEpi(s).forEach(function (e) {
      var mark = epiMarkById(e.id);
      if (!mark) return;
      if (e.id === 'epi_afterglow') { mod.happyDecay *= 0.9; mod.energyDecay *= 1.08; }
      if (e.id === 'epi_sono_profundo') { mod.energyDecay *= 0.88; }
      if (e.id === 'epi_estresse') { mod.hygieneDecay *= 1.1; mod.energyDecay *= 1.06; }
      if (e.id === 'epi_calor_rua') { mod.energyDecay *= 1.05; mod.happyDecay *= 0.95; }
      if (e.id === 'epi_noite_centro') { mod.energyDecay *= 0.95; }
    });
    return mod;
  }

  function epiVisualClasses(s) {
    return activeEpi(s).map(function (e) {
      var mark = epiMarkById(e.id);
      return mark && mark.visual ? 'epi-' + mark.visual.replace(/^epi-/, '') : '';
    }).filter(Boolean).map(function (v) {
      return v.indexOf('epi-') === 0 ? v : 'epi-' + v;
    });
  }


  function absorbGeneEcho(s, detail) {
    if (!s || !s.alive) return null;
    var g = ensureGenome(s);
    detail = detail || {};
    var friendId = String(detail.friendId || detail.id || '');
    var friendName = String(detail.friendName || detail.name || 'amigo').slice(0, 24);
    var speciesId = normalizeSpeciesId(detail.speciesId || detail.species || null);
    // se não veio espécie, deriva pseudo-espécie estável do id do amigo
    if (!speciesId) {
      var pool = ['unicornio', 'grilo', 'caramelo', 'preguica', 'gaviao', 'jabuti', 'suindara', 'prea'];
      var n = 0;
      for (var i = 0; i < friendId.length; i++) n = (n + friendId.charCodeAt(i) * (i + 3)) % pool.length;
      speciesId = pool[n];
    }
    var echo = {
      id: friendId || ('echo_' + Date.now()),
      name: friendName,
      speciesId: speciesId,
      spotId: detail.spotId || null,
      spotName: detail.spotName || null,
      at: Date.now(),
      // alelos doados: seed do amigo → genoma sintético estável
      alleles: synthAllelesFromSeed(friendId || friendName),
      mutations: synthMutationsFromSeed(friendId || friendName)
    };
    // dedupe por friendId — mantém o mais recente
    g.echoes = g.echoes.filter(function (e) { return e.id !== echo.id; });
    g.echoes.unshift(echo);
    if (g.echoes.length > 6) g.echoes.length = 6;
    pushLog(s, 'Eco genético de ' + friendName + ' · ' + (speciesById(speciesId).name || speciesId));
    return echo;
  }

  function synthAllelesFromSeed(seedStr) {
    var seed = 0;
    var str = String(seedStr || 'x');
    for (var i = 0; i < str.length; i++) seed = (seed * 33 + str.charCodeAt(i)) % 100000;
    var options = {
      coat: ['base', 'dourado', 'noite', 'barroco'],
      pattern: ['solid', 'dourado', 'azulejo', 'rua'],
      eyes: ['base', 'roda', 'lua'],
      aura: ['none', 'neon', 'barroco', 'total'],
      tempo: ['steady', 'lento', 'feral'],
      voice: ['soft', 'eco', 'rua'],
      limb: ['base', 'rua', 'fantasma']
    };
    var out = {};
    ALLELE_KEYS.forEach(function (k, idx) {
      var list = options[k];
      out[k] = list[Math.floor(genomeRand(seed, idx * 17 + 3) * list.length) % list.length];
    });
    return out;
  }

  function synthMutationsFromSeed(seedStr) {
    var seed = 0;
    var str = String(seedStr || 'x');
    for (var i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) % 100000;
    var out = [];
    for (var j = 0; j < MUTATION_CATALOG.length; j++) {
      if (genomeRand(seed, j * 9 + 1) > 0.82) out.push(MUTATION_CATALOG[j].id);
    }
    return out.slice(0, 3);
  }

  function mendelAllele(a, b, seed, salt) {
    var roll = genomeRand(seed, salt);
    if (roll < 0.45) return a || b || 'base';
    if (roll < 0.9) return b || a || 'base';
    // 10% allele "novo" — herança incompleta / mutação de cruzamento
    var mix = String(a || 'x') + '_' + String(b || 'y');
    if (mix.indexOf('dourado') !== -1 || mix.indexOf('neon') !== -1) return 'neon';
    if (mix.indexOf('lento') !== -1 && mix.indexOf('feral') !== -1) return 'feral';
    if (mix.indexOf('eco') !== -1) return 'eco';
    return roll < 0.95 ? (a || 'base') : (b || 'base');
  }

  function pickHybridTrait(s, donorSpecies) {
    var selfSp = normalizeSpeciesId(s.speciesId);
    var other = normalizeSpeciesId(donorSpecies);
    var pair = [selfSp, other].sort();
    var candidates = [];
    for (var i = 0; i < HYBRID_TRAITS.length; i++) {
      var ht = HYBRID_TRAITS[i];
      if (ht.needForm && s.formId !== ht.needForm) continue;
      if (ht.parents && ht.parents.length === 2) {
        var p = ht.parents.slice().sort();
        if (p[0] === pair[0] && p[1] === pair[1]) candidates.push(ht);
      } else if (!ht.parents) {
        candidates.push(ht);
      }
    }
    if (!candidates.length) return hybridTraitById('hx_generic');
    // prefer specific parent pairs over generic
    candidates.sort(function (a, b) {
      return (b.parents ? 1 : 0) - (a.parents ? 1 : 0);
    });
    var g = ensureGenome(s);
    var idx = Math.floor(genomeRand(g.seed, (s.evolutions || 0) + pair.join('').length) * Math.min(3, candidates.length));
    return candidates[Math.min(idx, candidates.length - 1)];
  }

  /**
   * Cruza genoma próprio com um eco/doador.
   * Retorna { trait, alleles, transferred[] } ou null.
   */
  function tryHybridize(s, echoOrDonor) {
    if (!s || !s.alive || !s.started) return null;
    if (eventIsOver && eventIsOver()) return null;
    var g = ensureGenome(s);
    var donor = echoOrDonor;
    if (!donor || !donor.alleles) return null;

    // cooldown: 1 hibridização / 2h (anti-spam)
    if (g.lastHybridAt && Date.now() - g.lastHybridAt < 2 * 60 * 60 * 1000) {
      pushLog(s, 'Genoma ainda sedimentando a última fusão…');
      return null;
    }

    var selfA = g.alleles;
    var donA = donor.alleles;
    var child = {};
    var transferred = [];
    ALLELE_KEYS.forEach(function (k, i) {
      var before = selfA[k];
      child[k] = mendelAllele(selfA[k], donA[k], g.seed, i * 13 + (g.hybrids.length + 1) * 7);
      if (child[k] !== before) transferred.push(k + ':' + child[k]);
      selfA[k] = child[k];
    });

    // herança de mutações do doador (dominância + portadores)
    var inheritedList = inheritMutationsFrom(s, donor, donor.name || 'eco');
    var inherited = inheritedList.length ? inheritedList[0].mut : null;
    tryExpressCarriers(s, 'hybrid');


    var trait = pickHybridTrait(s, donor.speciesId);
    if (trait && g.hybrids.indexOf(trait.id) === -1) {
      g.hybrids.push(trait.id);
      g.hybridPhenotype = trait.id;
    }

    g.lastHybridAt = Date.now();
    g.lastHybridWith = {
      name: donor.name || 'eco',
      speciesId: donor.speciesId || null,
      at: g.lastHybridAt
    };

    // micro boost social
    s.happy = clamp((s.happy || 0) + 8, 0, 100);
    addResonance(s, 'cortejo', 5);
    addResonance(s, 'voz', 4);

    if (trait && trait.rarity === 'super') grantCard(s, 'sr_hibrido', true);
    else if (trait && trait.rarity === 'raro') grantCard(s, 'r_hibrido', true);
    else grantCard(s, 'c_hibrido', true);

    pushLog(s, 'Hibridização com ' + (donor.name || 'eco') + (trait ? ' → ' + trait.name : ''));
    return { trait: trait, alleles: child, transferred: transferred, inherited: inherited };
  }


  /* ============================================================
   *  CASAL & ACASALAMENTO — gera novo CRICRI (filhote) associado
   *  Ecos de amigos mútuos = parceiros potenciais
   * ============================================================ */
  var FAMILY_KEY = 'cricri-tama-family-v1';
  var CHILD_PREFIX = 'cricri-tama-child-';

  function loadFamily() {
    try {
      var raw = localStorage.getItem(FAMILY_KEY);
      if (!raw) return { activeId: 'main', children: [] };
      var f = JSON.parse(raw);
      if (!f.children) f.children = [];
      if (!f.activeId) f.activeId = 'main';
      return f;
    } catch (_) {
      return { activeId: 'main', children: [] };
    }
  }

  function saveFamily(f) {
    try { localStorage.setItem(FAMILY_KEY, JSON.stringify(f)); } catch (_) {}
  }

  function loadChildState(childId) {
    try {
      var raw = localStorage.getItem(CHILD_PREFIX + childId);
      if (!raw) return null;
      return migrateSpecies(Object.assign(defaultState(), JSON.parse(raw)));
    } catch (_) { return null; }
  }

  function saveChildState(childId, s) {
    try {
      localStorage.setItem(CHILD_PREFIX + childId, JSON.stringify(s));
    } catch (_) {}
  }

  function pickOffspringSpecies(parentSp, donorSp) {
    var a = normalizeSpeciesId(parentSp);
    var b = normalizeSpeciesId(donorSp) || a;
    var roll = Math.random();
    if (roll < 0.42) return a;
    if (roll < 0.84) return b;
    // 16% — espécie "surpresa" do catálogo
    var pool = SPECIES.filter(function (sp) { return sp.id !== 'viralata'; });
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  function buildOffspringName(sp, parentName, mateName) {
    var base = (sp && sp.name) ? sp.name : 'Cri';
    var nick = ['da Roda', 'do Centro', 'de SC', 'Cabrunco', 'da Praça', 'do After'];
    return base + ' ' + nick[Math.floor(Math.random() * nick.length)];
  }

  /**
   * Acasalamento: cria filhote jogável associado ao jogador.
   * Herda alelos (Mendel) + mutações dos dois lados.
   */
  function mateWithEcho(s, echo) {
    if (!s || !s.alive || !s.started) return null;
    if (!echo) return null;
    if ((s.stageId || 'ovo') === 'ovo') {
      pushLog(s, 'Ainda é ovo — espere eclodir para acasalar.');
      return null;
    }
    var fam = loadFamily();
    if (fam.children && fam.children.length >= 6) {
      pushLog(s, 'LAR cheio (máx. 6 filhotes neste aparelho).');
      return null;
    }
    // cooldown 1h por parceiro
    var mateKey = String(echo.id || echo.name || '');
    s.mateCooldown = s.mateCooldown || {};
    if (s.mateCooldown[mateKey] && Date.now() - s.mateCooldown[mateKey] < 3600000) {
      pushLog(s, 'Esse casal ainda descansa… tente mais tarde.');
      return null;
    }

    var parentSp = normalizeSpeciesId(s.speciesId);
    var donorSp = normalizeSpeciesId(echo.speciesId);
    var childSpId = pickOffspringSpecies(parentSp, donorSp);
    var sp = speciesById(childSpId);
    var now = Date.now();
    var childId = 'child_' + now.toString(36) + '_' + Math.floor(Math.random() * 1e4).toString(36);

    var child = defaultState();
    child.started = true;
    child.alive = true;
    child.bornAt = now;
    child.started_at = now;
    child.lastTick = now;
    child.speciesId = childSpId;
    child.name = buildOffspringName(sp, s.name, echo.name);
    child.stageId = 'ovo';
    child.shell = s.shell || 'rosa';
    child.parents = {
      a: { name: s.name, speciesId: parentSp, formId: s.formId || null },
      b: { name: echo.name || 'eco', speciesId: donorSp, formId: null }
    };
    ensureGenome(child);
    ensureGenome(s);

    // Mendel alleles parent × donor
    var parentA = ensureGenome(s).alleles;
    var parentB = echo.alleles || synthAllelesFromSeed(echo.id || echo.name || 'mate');
    ALLELE_KEYS.forEach(function (k, i) {
      child.genome.alleles[k] = mendelAllele(parentA[k], parentB[k], child.genome.seed, i * 19 + 3);
    });

    // herda mutações (como portadores / expressas)
    try {
      inheritMutationsFrom(child, {
        name: s.name,
        speciesId: parentSp,
        alleles: parentA,
        mutations: (ensureGenome(s).mutations || []).map(function (m) {
          return typeof m === 'string' ? m : m.id;
        })
      }, s.name);
      inheritMutationsFrom(child, echo, echo.name || 'parceiro');
    } catch (_) {}

    // chance de mutação de novo no nascimento
    try { tryMutate(child, 'evolve'); } catch (_) {}

    child.happy = 90;
    child.hunger = 80;
    child.energy = 85;
    pushLog(child, 'Nasceu do casal ' + (s.name || 'Cri') + ' × ' + (echo.name || 'eco'));
    try { grantCard(child, 'c_ovo'); } catch (_) {}
    try { grantCard(s, 'c_hibrido', true); } catch (_) {}

    saveChildState(childId, child);
    fam.children = fam.children || [];
    fam.children.unshift({
      id: childId,
      name: child.name,
      speciesId: childSpId,
      bornAt: now,
      parents: child.parents
    });
    if (fam.children.length > 6) {
      // remove oldest from storage
      var drop = fam.children.pop();
      try { localStorage.removeItem(CHILD_PREFIX + drop.id); } catch (_) {}
    }
    saveFamily(fam);

    s.mateCooldown[mateKey] = now;
    s.happy = clamp((s.happy || 0) + 10, 0, 100);
    addResonance(s, 'cortejo', 10);
    addResonance(s, 'afeto', 6);
    pushLog(s, 'Acasalou com ' + (echo.name || 'eco') + ' → ' + child.name);
    try { grantCard(s, 'r_hibrido', true); } catch (_) {}

    return { childId: childId, child: child, meta: fam.children[0] };
  }

  function switchToPet(slotId) {
    var fam = loadFamily();
    // salva pet atual no slot ativo
    if (state && state.started) {
      if (fam.activeId === 'main' || !fam.activeId) {
        save(state);
      } else {
        saveChildState(fam.activeId, state);
      }
    }
    if (slotId === 'main') {
      fam.activeId = 'main';
      saveFamily(fam);
      state = load();
      if (!state.started) state = defaultState();
      render();
      setTab('play');
      return state;
    }
    var child = loadChildState(slotId);
    if (!child) {
      pushLog(state || defaultState(), 'Filhote não encontrado.');
      return null;
    }
    fam.activeId = slotId;
    saveFamily(fam);
    state = child;
    // keep ticking identity
    try { ensureGenome(state); } catch (_) {}
    render();
    setTab('play');
    return state;
  }

  function isPlayingChild() {
    var fam = loadFamily();
    return fam.activeId && fam.activeId !== 'main';
  }

  function renderFamilyBar() {
    var host = $('tama-family-bar');
    if (!host) return;
    var fam = loadFamily();
    var kids = fam.children || [];
    host.hidden = false;
    if (!kids.length) {
      host.innerHTML =
        '<p class="family-bar-title">LAR</p>' +
        '<button type="button" class="family-tree-btn" data-action="genealogy">Árvore genealógica</button>';
      return;
    }
    var active = fam.activeId || 'main';
    var html = '<p class="family-bar-title">Seu LAR</p><div class="family-bar-row">';
    html += '<button type="button" class="family-pet-btn' + (active === 'main' ? ' is-active' : '') +
      '" data-action="switch-pet" data-pet-id="main">Principal</button>';
    kids.forEach(function (c) {
      var sp = speciesById(c.speciesId);
      html += '<button type="button" class="family-pet-btn' + (active === c.id ? ' is-active' : '') +
        '" data-action="switch-pet" data-pet-id="' + c.id + '">' +
        (sp.emoji || '🥚') + ' ' + (c.name || 'Filhote') + '</button>';
    });
    html += '</div>';
    html += '<button type="button" class="family-tree-btn" data-action="genealogy">Árvore genealógica</button>';
    host.innerHTML = html;
  }

  function openGenealogySheet() {
    var fam = loadFamily();
    var kids = fam.children || [];
    var main = null;
    try {
      if (fam.activeId && fam.activeId !== 'main' && state) {
        // load main from storage for tree root
        var raw = localStorage.getItem(typeof STORAGE !== 'undefined' ? STORAGE : 'cricri-tama-v3');
        main = raw ? JSON.parse(raw) : state;
      } else {
        main = state;
      }
    } catch (_) { main = state; }
    if (!main) main = defaultState();

    var mainSp = speciesById(main.speciesId);
    var mainName = main.name || 'Principal';
    var mainEmoji = mainSp.emoji || '🐾';
    var mainStage = stageById(main.stageId || 'ovo');

    try {
      var old = document.getElementById('genealogy-sheet');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    var sheet = document.createElement('div');
    sheet.id = 'genealogy-sheet';
    sheet.className = 'genealogy-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Árvore genealógica');

    var branches = '';
    if (!kids.length) {
      branches = '<p class="gen-empty">Ainda sem filhotes. Use <strong>Roda genética → Acasalar</strong> com um eco para gerar a linhagem.</p>';
    } else {
      kids.forEach(function (c) {
        var cSp = speciesById(c.speciesId);
        var childState = loadChildState(c.id);
        var cStage = childState ? stageById(childState.stageId || 'ovo') : stageById('ovo');
        var pa = (c.parents && c.parents.a) || {};
        var pb = (c.parents && c.parents.b) || {};
        var paSp = speciesById(pa.speciesId);
        var pbSp = speciesById(pb.speciesId);
        var ageTxt = '';
        if (c.bornAt) {
          var mins = Math.floor((Date.now() - c.bornAt) / 60000);
          ageTxt = mins < 60 ? (mins + ' min') : (Math.floor(mins / 60) + ' h');
        }
        branches +=
          '<div class="gen-branch">' +
            '<div class="gen-parents">' +
              '<div class="gen-node gen-parent">' +
                '<span class="gen-emoji">' + (paSp.emoji || mainEmoji) + '</span>' +
                '<strong>' + (pa.name || mainName) + '</strong>' +
                '<small>' + (paSp.name || '—') + '</small>' +
              '</div>' +
              '<span class="gen-heart" aria-hidden="true">♡</span>' +
              '<div class="gen-node gen-parent gen-mate">' +
                '<span class="gen-emoji">' + (pbSp.emoji || '🧬') + '</span>' +
                '<strong>' + (pb.name || 'Parceiro') + '</strong>' +
                '<small>' + (pbSp.name || 'eco') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="gen-line" aria-hidden="true"></div>' +
            '<button type="button" class="gen-node gen-child" data-action="switch-pet" data-pet-id="' + c.id + '">' +
              '<span class="gen-emoji">' + (cSp.emoji || '🥚') + '</span>' +
              '<strong>' + (c.name || 'Filhote') + '</strong>' +
              '<small>' + (cStage.emoji || '') + ' ' + (cStage.label || 'Ovo') +
                (ageTxt ? ' · ' + ageTxt : '') + '</small>' +
            '</button>' +
          '</div>';
      });
    }

    sheet.innerHTML =
      '<div class="gen-card">' +
        '<div class="tama-sp-handle" aria-hidden="true"></div>' +
        '<p class="hx-kicker">Linhagem CRICRI</p>' +
        '<h2 class="hx-title">Árvore genealógica</h2>' +
        '<div class="gen-root">' +
          '<div class="gen-node gen-root-node">' +
            '<span class="gen-emoji">' + mainEmoji + '</span>' +
            '<strong>' + mainName + '</strong>' +
            '<small>' + (mainSp.name || '') + ' · ' + (mainStage.label || '') + '</small>' +
            (main.formId && FORM_META[main.formId] ? '<small class="gen-form">' + FORM_META[main.formId].label + '</small>' : '') +
          '</div>' +
        '</div>' +
        (kids.length ? '<p class="gen-count">' + kids.length + ' filhote' + (kids.length > 1 ? 's' : '') + ' na linhagem</p>' : '') +
        '<div class="gen-branches">' + branches + '</div>' +
        '<button type="button" class="hx-close" id="gen-close">Fechar</button>' +
      '</div>';

    document.body.appendChild(sheet);

    function close() {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) close();
    });
    var cl = sheet.querySelector('#gen-close');
    if (cl) cl.addEventListener('click', close);
    sheet.querySelectorAll('[data-action="switch-pet"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-pet-id');
        close();
        switchToPet(id);
      });
    });
  }

  function openHybridSheet() {

    var s = state;
    if (!s || !s.alive) return;
    var g = ensureGenome(s);
    var old = document.getElementById('hybrid-sheet');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var sheet = document.createElement('div');
    sheet.id = 'hybrid-sheet';
    sheet.className = 'hybrid-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Hibridização genética');
    sheet.style.cssText = 'position:fixed;inset:0;z-index:2147483645;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,4,3,0.85);padding:0;margin:0;';

    var echoesHtml = '';
    if (!g.echoes.length) {
      echoesHtml = '<p class="hx-empty">Nenhum eco ainda. Encontre um amigo mútuo no mapa (mesmo spot) ou simule um eco para hibridizar ou acasalar.</p>' +
        '<button type="button" class="hx-demo" id="hx-demo">Simular eco de São Cristóvão</button>';
    } else {
      echoesHtml = '<div class="hx-echo-list">';
      g.echoes.forEach(function (e, idx) {
        var sp = speciesById(e.speciesId);
        echoesHtml +=
          '<div class="hx-echo-card">' +
            '<div class="hx-echo-head">' +
              '<span class="hx-echo-emoji">' + (sp.emoji || '🧬') + '</span>' +
              '<span class="hx-echo-meta"><strong>' + (e.name || 'eco') + '</strong>' +
              '<small>' + (sp.name || e.speciesId || '') + (e.spotName ? ' · ' + e.spotName : '') + '</small></span>' +
            '</div>' +
            '<div class="hx-echo-actions">' +
              '<button type="button" class="hx-act hx-act-gene" data-echo-idx="' + idx + '" data-hx-mode="hybrid">Hibridizar genes</button>' +
              '<button type="button" class="hx-act hx-act-mate" data-echo-idx="' + idx + '" data-hx-mode="mate">Acasalar · filhote</button>' +
            '</div>' +
          '</div>';
      });
      echoesHtml += '</div>';
    }

    var phenotype = g.hybridPhenotype ? hybridTraitById(g.hybridPhenotype) : null;
    var phenHtml = phenotype
      ? '<p class="hx-phen">Fenótipo ativo: <strong>' + phenotype.emoji + ' ' + phenotype.name + '</strong> — ' + phenotype.blurb + '</p>'
      : '<p class="hx-phen">Sem fenótipo híbrido ativo.</p>';

    sheet.innerHTML =
      '<div class="hx-card">' +
        '<div class="tama-sp-handle" aria-hidden="true"></div>' +
        '<p class="hx-kicker">Roda genética</p>' +
        '<h2 class="hx-title">Hibridizar ou acasalar</h2>' +
        '<p class="hx-lead"><strong>Hibridizar</strong> mistura alelos no pet atual (sem trocar espécie). <strong>Acasalar</strong> gera um novo CRICRI filhote no seu LAR.</p>' +
        phenHtml +
        '<p class="hx-label">Parceiros / ecos</p>' +
        echoesHtml +
        '<button type="button" class="hx-close" id="hx-close">Fechar</button>' +
      '</div>';

    document.body.appendChild(sheet);
    try {
      var card = sheet.querySelector('.hx-card');
      if (card) {
        card.style.animation = 'tama-sp-up 0.32s cubic-bezier(0.2,0.85,0.25,1)';
      }
    } catch (_) {}

    function close() {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    var cl = sheet.querySelector('#hx-close');
    if (cl) cl.addEventListener('click', close);

    var demo = sheet.querySelector('#hx-demo');
    if (demo) {
      demo.addEventListener('click', function () {
        var pool = SPECIES.filter(function (sp) { return sp.id !== 'viralata' && sp.id !== s.speciesId; });
        var sp = pool[Math.floor(Math.random() * pool.length)] || SPECIES[0];
        absorbGeneEcho(s, {
          friendId: 'demo_' + sp.id,
          friendName: 'Eco ' + sp.name,
          speciesId: sp.id,
          spotName: 'Praça São Francisco'
        });
        save(s);
        close();
        openHybridSheet();
        render();
      });
    }

    sheet.querySelectorAll('[data-hx-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-echo-idx'));
        var mode = btn.getAttribute('data-hx-mode');
        var echo = g.echoes[idx];
        if (!echo) return;
        if (mode === 'mate') {
          var born = mateWithEcho(s, echo);
          save(s);
          close();
          if (born && born.child) {
            showHybridFx({ emoji: '🥚', name: born.child.name, blurb: 'Novo CRICRI no LAR', rarity: 'raro' });
            try {
              showMutationToast({
                emoji: speciesById(born.child.speciesId).emoji || '🥚',
                name: 'Filhote · ' + born.child.name,
                blurb: 'Toque no LAR para cuidar do novo CRICRI',
                rarity: 'raro'
              });
            } catch (_) {}
            // oferece ir para o filhote
            try {
              openTamaConfirm({
                title: 'Novo CRICRI!',
                body: born.child.name + ' nasceu. Quer cuidar dele agora?',
                confirmLabel: 'Abrir filhote',
                cancelLabel: 'Ficar aqui',
                onConfirm: function () { switchToPet(born.childId); }
              });
            } catch (_) {}
          }
          render();
          return;
        }
        var result = tryHybridize(s, echo);
        save(s);
        close();
        if (result && result.trait) {
          showHybridFx(result.trait);
          try {
            showMutationToast({
              emoji: result.trait.emoji,
              name: result.trait.name,
              blurb: result.trait.blurb,
              rarity: result.trait.rarity || 'raro'
            });
          } catch (_) {}
        }
        render();
      });
    });
  }

  function showHybridFx(trait) {
    if (reducedMotion && reducedMotion()) return;
    var host = document.getElementById('tama-cat-stage') || document.body;
    var fx = document.createElement('div');
    fx.className = 'evo-fx hx-fx';
    fx.innerHTML =
      '<div class="evo-fx-burst" style="--evo-hue:#5eb0d4"></div>' +
      '<div class="evo-fx-ring" style="--evo-hue:#b48cff"></div>' +
      '<p class="evo-fx-label">🧬 ' + (trait ? trait.name : 'Híbrido') +
      (trait ? '<br><small>' + trait.blurb + '</small>' : '') + '</p>';
    host.appendChild(fx);
    setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 2200);
    flashEvolve();
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
      ensureGenome(merged);
      migrateMutationEntries(merged);
      return migrateSpecies(merged);
    } catch (_) { return defaultState(); }
  }
  function save(s) {
    try {
      var fam = loadFamily();
      if (fam.activeId && fam.activeId !== 'main') {
        saveChildState(fam.activeId, s);
      } else {
        localStorage.setItem(STORAGE, JSON.stringify(s));
        for (var i = 0; i < STORAGE_LEGACY.length; i++) {
          try { localStorage.removeItem(STORAGE_LEGACY[i]); } catch (_) {}
        }
      }
    } catch (_) {
      try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch (__) {}
    }
    // cloud só do principal (evita sobrescrever)
    try {
      var fam2 = loadFamily();
      if (!fam2.activeId || fam2.activeId === 'main') {
        scheduleCloudSave(s);
        registerBgSync();
      }
    } catch (_) {}
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
    // se o festival ainda não acabou, nuvem não pode impor fim da roda
    if (!eventIsOver() && cloud) {
      try {
        delete cloud.endedAt;
        delete cloud.endSnapshot;
      } catch (_) {}
    }
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
    var changed = false;
    var prematureFestival = !!(s.endedAt || s.endSnapshot);
    if (s.endedAt) {
      delete s.endedAt;
      changed = true;
    }
    if (s.endSnapshot) {
      delete s.endSnapshot;
      changed = true;
    }
    // Morte marcada como fim de festival (antes da data) → revive com stats mínimos
    if (prematureFestival && s.alive === false) {
      s.alive = true;
      s.sleeping = false;
      s.sick = false;
      if ((s.health || 0) < 20) s.health = 40;
      if ((s.hunger || 0) < 20) s.hunger = 50;
      if ((s.happy || 0) < 20) s.happy = 50;
      if ((s.energy || 0) < 20) s.energy = 50;
      if ((s.hygiene || 0) < 20) s.hygiene = 50;
      changed = true;
    }
    if (changed) {
      try { pushLog(s, 'A roda continua — CRICRI 2026 ainda está rolando.'); } catch (_) {}
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
  function stageById(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
    return STAGES[0];
  }
  /** Estágio efetivo do pet (só avança via ritual da Roda) */
  function currentStage(s) {
    if (!s) return STAGES[0];
    if (!s.alive) return stageById(s.stageId || 'ovo');
    return stageById(s.stageId || 'ovo');
  }
  function nextStage(st) {
    if (!st) return STAGES[1] || null;
    for (var i = 0; i < STAGES.length - 1; i++) if (STAGES[i].id === st.id) return STAGES[i + 1];
    return null;
  }
  function stageIndex(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return i;
    return 0;
  }
  /** Progresso até a Roda chamar o próximo estágio (por idade) */
  function evolutionProgress(s) {
    var hours = ageHours(s);
    var cur = currentStage(s);
    var unlocked = stageForAge(hours);
    // se a idade já liberou além do estágio atual, barra cheia (aguardando ritual)
    if (stageIndex(unlocked.id) > stageIndex(cur.id)) return 1;
    var nxt = nextStage(cur);
    if (!nxt) return 1;
    var span = Math.max(0.01, nxt.minAgeH - cur.minAgeH);
    return clamp((hours - cur.minAgeH) / span, 0, 1);
  }
  function resonanceProgress(s) {
    if (!s || !s.pendingStageId) {
      var nxt = nextStage(currentStage(s));
      if (!nxt) return 1;
      var need = resonanceNeedForStage(nxt.id);
      return clamp(resonanceTotal(s) / Math.max(1, need), 0, 1);
    }
    var need2 = resonanceNeedForStage(s.pendingStageId);
    return clamp(resonanceTotal(s) / Math.max(1, need2), 0, 1);
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
    if (!s || !s.alive || !s.started) return false;
    ensureResonance(s);
    var hours = ageHours(s);
    var byAge = stageForAge(hours);
    var prev = s.stageId || 'ovo';
    var prevIdx = stageIndex(prev);
    var ageIdx = stageIndex(byAge.id);

    /* Eclosão ovo → bebê: ~2 min por idade OU 1 cuidado após 30s — sem Roda */
    if (prev === 'ovo') {
      var readyByAge = hours >= stageById('bebe').minAgeH;
      var readyByCare = (s.careScore || 0) >= 1 && hours >= (30 / 3600);
      if (readyByAge || readyByCare) {
        s.stageId = 'bebe';
        s.pendingStageId = null;
        s.evolutions = (s.evolutions || 0) + 1;
        s.happy = clamp((s.happy || 0) + 12, 0, 100);
        try { grantCard(s, 'r_filhote', true); } catch (_) {}
        pushLog(s, 'Eclodiu! → Cabrunquinho · ' + (speciesById(s.speciesId).name || ''));
        try { notifyCri('evolve', 'Cabrunquinho'); } catch (_) {}
        try { flashEvolve(); } catch (_) {}
        return true;
      }
    }

    if (ageIdx <= prevIdx) {
      if (s.pendingStageId && stageIndex(s.pendingStageId) <= prevIdx) {
        s.pendingStageId = null;
      }
      return false;
    }

    var target = STAGES[prevIdx + 1];
    if (!target) return false;

    if (prev === 'ovo' && target.id === 'bebe') {
      s.stageId = 'bebe';
      s.pendingStageId = null;
      s.evolutions = (s.evolutions || 0) + 1;
      s.happy = clamp((s.happy || 0) + 12, 0, 100);
      pushLog(s, 'Eclodiu! → Cabrunquinho · ' + (speciesById(s.speciesId).name || ''));
      try { flashEvolve(); } catch (_) {}
      return true;
    }

    var wasPending = s.pendingStageId;
    s.pendingStageId = target.id;
    if (wasPending !== target.id) {
      pushLog(s, 'A Roda chama → ' + target.label);
      try { notifyCri('roda', target.label); } catch (_) {}
      try { flashEvolve(); } catch (_) {}
    }
    return true;
  }

  function canAnswerRoda(s) {
    if (!s || !s.alive || !s.pendingStageId) return false;
    if (eventIsOver()) return false;
    var need = resonanceNeedForStage(s.pendingStageId);
    return resonanceTotal(s) >= need;
  }

  function applyEvolution(s, formId) {
    if (!s || !s.pendingStageId) return false;
    var targetId = s.pendingStageId;
    var label = stageById(targetId).label;
    formId = formId || dominantForm(s);
    if (!FORM_META[formId]) formId = dominantForm(s);
    s.stageId = targetId;
    s.pendingStageId = null;
    s.formId = formId;
    s.evolutions = (s.evolutions || 0) + 1;
    // boost de vida ao evoluir
    s.health = clamp((s.health || 100) + 12, 0, 100);
    s.happy = clamp((s.happy || 0) + 10, 0, 100);
    s.sick = false;
    // evolução "gasta" um pouco de resonância (a roda ecoa e acalma)
    var r = ensureResonance(s);
    ['afeto', 'ritual', 'cortejo', 'voz'].forEach(function (k) {
      r[k] = Math.max(0, r[k] - 6);
    });
    var form = FORM_META[formId];
    var formTxt = form ? form.label : formId;
    pushLog(s, 'A Roda respondeu → ' + label + ' · ' + formTxt);
    notifyCri('evolve', label);
    if (targetId === 'filhote') grantCard(s, 'r_filhote');
    if (targetId === 'cria') grantCard(s, 'r_convento');
    if (targetId === 'ancia') grantCard(s, 'sr_lenda');
    if (formId === 'total') grantCard(s, 'sr_ouro');
    try { tickEnvironment(s, { trigger: 'evolve' }); } catch (_) {}
    // expressão de latentes herdadas + mutação de novo
    var expressed = tryExpressCarriers(s, 'evolve');
    if (expressed && expressed.length) {
      try { showMutationToast(expressed[0]); } catch (_) {}
    }
    var mut = tryMutate(s, formId === 'total' ? 'total' : 'evolve');
    if (mut) {
      s._lastMutation = mut.id;
      try { showMutationToast(mut); } catch (_) {}
    }
    // se a idade já liberou mais um estágio, re-checa
    checkEvolution(s);
    return true;
  }

  function openRodaSheet() {
    var s = state;
    if (!s || !s.pendingStageId) return;
    ensureResonance(s);
    var formId = dominantForm(s);
    var form = FORM_META[formId] || FORM_META.barroco;
    var need = resonanceNeedForStage(s.pendingStageId);
    var total = Math.round(resonanceTotal(s));
    var stageLabel = stageById(s.pendingStageId).label;
    var r = ensureResonance(s);
    var ready = total >= need;

    var old = document.getElementById('roda-evo-sheet');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    function barHtml(label, val, color) {
      var v = Math.max(0, Math.min(100, val || 0));
      return '<div class="roda-bar"><div class="roda-bar-top"><span>' + label + '</span><span>' + Math.round(v) + '</span></div>' +
        '<div class="roda-bar-track"><div class="roda-bar-fill" style="width:' + v + '%;background:' + color + '"></div></div></div>';
    }

    function formCard(id, meta, selected) {
      return '<button type="button" class="roda-form' + (selected ? ' is-on' : '') + '" data-form="' + id + '" style="--form-hue:' + meta.hue + '">' +
        '<strong>' + meta.label + '</strong><span>' + meta.blurb + '</span></button>';
    }

    var formsHtml =
      formCard('barroco', FORM_META.barroco, formId === 'barroco') +
      formCard('azulejo', FORM_META.azulejo, formId === 'azulejo') +
      formCard('cortejo', FORM_META.cortejo, formId === 'cortejo') +
      formCard('lenda', FORM_META.lenda, formId === 'lenda') +
      formCard('total', FORM_META.total, formId === 'total');

    var sheet = document.createElement('div');
    sheet.id = 'roda-evo-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Resonância da Roda');
    sheet.innerHTML =
      '<div class="roda-card">' +
        '<p class="roda-kicker">Resonância da Roda</p>' +
        '<h2 class="roda-title">Evoluir → ' + stageLabel + '</h2>' +
        '<p class="roda-lead">Cada cuidado afina uma voz. Quando a Roda chama, você responde e escolhe a forma.</p>' +
        '<div class="roda-bars">' +
          barHtml('Afeto', r.afeto, '#e33d6b') +
          barHtml('Ritual', r.ritual, '#5eb0d4') +
          barHtml('Cortejo', r.cortejo, '#d49a2c') +
          barHtml('Voz', r.voz, '#b48cff') +
        '</div>' +
        '<p class="roda-need">Resonância <strong>' + total + '</strong> / ' + need + (ready ? ' · pronta' : ' · ainda afinando') + '</p>' +
        '<p class="roda-form-label">Forma da evolução</p>' +
        '<div class="roda-forms" id="roda-forms">' + formsHtml + '</div>' +
        '<div class="roda-actions">' +
          (ready
            ? '<button type="button" id="roda-evo-go" class="roda-go">Responder à Roda</button>'
            : '<button type="button" class="roda-go is-disabled" disabled>Ainda afinando…</button>') +
          '<button type="button" id="roda-evo-close" class="roda-later">Depois</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(sheet);
    // force paint styles via class on body for CSS in page
    document.body.classList.add('roda-open');

    var chosen = formId;
    var forms = sheet.querySelector('#roda-forms');
    if (forms) {
      forms.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-form]');
        if (!btn) return;
        chosen = btn.getAttribute('data-form');
        forms.querySelectorAll('[data-form]').forEach(function (b) {
          b.classList.toggle('is-on', b.getAttribute('data-form') === chosen);
        });
      });
    }

    function close() {
      document.body.classList.remove('roda-open');
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }

    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) close();
    });
    var closeBtn = sheet.querySelector('#roda-evo-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var go = sheet.querySelector('#roda-evo-go');
    if (go) {
      go.addEventListener('click', function () {
        if (applyEvolution(state, chosen)) {
          save(state);
          playEvolveFx(stageLabel, chosen);
          render();
        }
        close();
      });
    }
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });
  }

  function playEvolveFx(stageLabel, formId) {
    flashEvolve();
    var host = document.getElementById('tama-cat-stage') || document.body;
    var fx = document.createElement('div');
    fx.className = 'evo-fx';
    fx.setAttribute('aria-live', 'polite');
    var form = FORM_META[formId] || FORM_META.barroco;
    fx.innerHTML =
      '<div class="evo-fx-burst" style="--evo-hue:' + form.hue + '"></div>' +
      '<div class="evo-fx-ring" style="--evo-hue:' + form.hue + '"></div>' +
      '<p class="evo-fx-label">✦ ' + (stageLabel || 'Evolução') + '<br><small>' + form.label + '</small></p>';
    host.appendChild(fx);
    setTimeout(function () {
      if (fx.parentNode) fx.parentNode.removeChild(fx);
    }, 2200);
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
    try { tickEnvironment(s, {}); } catch (_) {}
    var decay = s.sleeping ? 0.4 : 1;
    var gmod = genomeModifiers(s);
    var emod = epiModifiers(s);
    s.hunger = clamp(s.hunger - 1.2 * decay * gmod.hungerDecay, 0, 100);
    s.happy = clamp(s.happy - 0.9 * decay * gmod.happyDecay * emod.happyDecay, 0, 100);
    s.energy = clamp(s.energy + (s.sleeping ? 3 : -0.8 * gmod.energyDecay * emod.energyDecay), 0, 100);
    s.hygiene = clamp(s.hygiene - 0.5 * decay * gmod.hygieneDecay * emod.hygieneDecay, 0, 100);
    if (s.hunger < 12 || s.hygiene < 12) s.sick = true;
    if (s.sick) s.health = clamp(s.health - 2, 0, 100);
    if (s.health <= 0) { s.alive = false; pushLog(s, 'Saúde zerou.'); }
    s.lastTick = Date.now();
    if (checkEvolution(s)) flashEvolve();
    checkCardMilestones(s);
    maybeCareNotif(s);
  }

  var state = load();
  try { if (state) ensureSpeciesChosen(state); else { var _boot = defaultState(); ensureSpeciesChosen(_boot); } } catch (_) {}
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


  /* —— Avatares por espécie (SVG animado) —— */
  function speciesAvatarSVG(spId, expr) {
    var id = spId === 'viralata' ? 'caramelo' : (spId || 'grilo');
    var eye = expr === 'sleep' || expr === 'dead' ? 'sleep' : (expr === 'sad' ? 'sad' : (expr === 'happy' ? 'happy' : 'normal'));
    // shared face bits
    function eyes(y) {
      if (eye === 'sleep') return '<path d="M70,'+y+' q10,6 20,0" stroke="#1a120c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M110,'+y+' q10,6 20,0" stroke="#1a120c" stroke-width="3" fill="none" stroke-linecap="round"/>';
      if (eye === 'sad') return '<ellipse cx="80" cy="'+y+'" rx="7" ry="9" fill="#1a120c"/><ellipse cx="120" cy="'+y+'" rx="7" ry="9" fill="#1a120c"/><path d="M72,'+(y-12)+' q8,6 16,0" stroke="#1a120c" stroke-width="2" fill="none"/>';
      if (eye === 'happy') return '<path d="M72,'+y+' q8,-8 16,0" stroke="#1a120c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M112,'+y+' q8,-8 16,0" stroke="#1a120c" stroke-width="3" fill="none" stroke-linecap="round"/>';
      return '<circle cx="80" cy="'+y+'" r="8" fill="#1a120c"/><circle cx="83" cy="'+(y-2)+'" r="2.5" fill="#fff"/><circle cx="120" cy="'+y+'" r="8" fill="#1a120c"/><circle cx="123" cy="'+(y-2)+'" r="2.5" fill="#fff"/>';
    }
    var bodies = {
      unicornio: '<g class="sp-body sp-unicornio">' +
        '<ellipse class="sp-shadow" cx="100" cy="195" rx="42" ry="8" fill="rgba(0,0,0,.2)"/>' +
        '<path class="sp-tail" d="M148,150 q30,10 18,40" stroke="#e8b4ff" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="100" cy="155" rx="48" ry="38" fill="#f5e6ff"/>' +
        '<circle cx="100" cy="95" r="44" fill="#f5e6ff"/>' +
        '<path class="sp-horn" d="M100,28 L108,72 L92,72 Z" fill="url(#hornGrad)"/>' +
        '<path class="sp-mane" d="M70,70 q-20,20 -8,50 q20,-10 30,-30" fill="#d48cff"/>' +
        eyes(95) +
        '<ellipse cx="100" cy="112" rx="6" ry="4" fill="#e33d6b"/>' +
        '<path class="sp-spark s1" d="M40,60 l3,8 l8,3 l-8,3 l-3,8 l-3,-8 l-8,-3 l8,-3 z" fill="#E6BE49"/>' +
        '<path class="sp-spark s2" d="M160,50 l2,6 l6,2 l-6,2 l-2,6 l-2,-6 l-6,-2 l6,-2 z" fill="#fff"/>' +
        '</g>',
      grilo: '<g class="sp-body sp-grilo">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="36" ry="7" fill="rgba(0,0,0,.2)"/>' +
        '<ellipse cx="100" cy="150" rx="40" ry="32" fill="#6fb36a"/>' +
        '<ellipse cx="100" cy="150" rx="28" ry="22" fill="#8fd18a"/>' +
        '<circle cx="100" cy="100" r="36" fill="#6fb36a"/>' +
        '<circle cx="72" cy="72" r="10" fill="#5a9a55"/><circle cx="128" cy="72" r="10" fill="#5a9a55"/>' +
        '<line class="sp-antenna a1" x1="72" y1="62" x2="58" y2="30" stroke="#3d6b38" stroke-width="3" stroke-linecap="round"/>' +
        '<line class="sp-antenna a2" x1="128" y1="62" x2="142" y2="30" stroke="#3d6b38" stroke-width="3" stroke-linecap="round"/>' +
        eyes(100) +
        '<path class="sp-leg l1" d="M70,170 q-30,20 -20,40" stroke="#3d6b38" stroke-width="5" fill="none"/>' +
        '<path class="sp-leg l2" d="M130,170 q30,20 20,40" stroke="#3d6b38" stroke-width="5" fill="none"/>' +
        '<path class="sp-note n1" d="M150,80 v-20 m0,0 q8,0 8,8" stroke="#E6BE49" stroke-width="2" fill="none"/>' +
        '<path class="sp-note n2" d="M165,70 v-16 m0,0 q8,0 8,8" stroke="#E6BE49" stroke-width="2" fill="none"/>' +
        '</g>',
      caramelo: '<g class="sp-body sp-caramelo">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="44" ry="8" fill="rgba(0,0,0,.22)"/>' +
        '<path class="sp-tail" d="M150,155 q35,-5 28,-45" stroke="#c48a3a" stroke-width="12" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="100" cy="160" rx="52" ry="36" fill="#d4a04a"/>' +
        '<ellipse cx="100" cy="168" rx="28" ry="18" fill="#e8c078"/>' +
        '<circle cx="100" cy="100" r="46" fill="#d4a04a"/>' +
        '<ellipse cx="100" cy="88" rx="18" ry="12" fill="#e8c078" opacity=".5"/>' +
        '<path d="M55,70 C40,40 58,28 70,48 Z" fill="#c48a3a"/><path d="M145,70 C160,40 142,28 130,48 Z" fill="#c48a3a"/>' +
        eyes(98) +
        '<ellipse cx="100" cy="118" rx="9" ry="7" fill="#2a1810"/>' +
        '<path d="M88,128 Q100,138 112,128" stroke="#2a1810" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<circle class="sp-spot" cx="70" cy="150" r="8" fill="#b07830" opacity=".55"/>' +
        '</g>',
      preguica: '<g class="sp-body sp-preguica">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="40" ry="7" fill="rgba(0,0,0,.18)"/>' +
        '<path class="sp-arm a1" d="M55,130 q-40,40 -10,60" stroke="#a89070" stroke-width="14" fill="none" stroke-linecap="round"/>' +
        '<path class="sp-arm a2" d="M145,130 q40,40 10,60" stroke="#a89070" stroke-width="14" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="100" cy="155" rx="46" ry="40" fill="#c4a882"/>' +
        '<circle cx="100" cy="100" r="42" fill="#c4a882"/>' +
        '<ellipse cx="100" cy="108" rx="28" ry="22" fill="#8a6a48"/>' +
        eyes(100) +
        '<ellipse cx="100" cy="118" rx="5" ry="4" fill="#3a2a18"/>' +
        '<path class="sp-claw" d="M40,185 h16 M155,185 h16" stroke="#5a4030" stroke-width="3"/>' +
        '</g>',
      gaviao: '<g class="sp-body sp-gaviao">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="38" ry="7" fill="rgba(0,0,0,.2)"/>' +
        '<path class="sp-wing w1" d="M60,140 Q10,120 30,90 Q55,110 70,130" fill="#6a5a4a"/>' +
        '<path class="sp-wing w2" d="M140,140 Q190,120 170,90 Q145,110 130,130" fill="#6a5a4a"/>' +
        '<ellipse cx="100" cy="150" rx="36" ry="40" fill="#8a7a5a"/>' +
        '<circle cx="100" cy="95" r="38" fill="#c4b898"/>' +
        '<path d="M100,120 L88,138 L112,138 Z" fill="#e8a020"/>' +
        eyes(92) +
        '<path class="sp-feather" d="M100,55 q-8,-20 0,-28 q8,8 0,28" fill="#5a4a3a"/>' +
        '</g>',
      jabuti: '<g class="sp-body sp-jabuti">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="48" ry="8" fill="rgba(0,0,0,.2)"/>' +
        '<ellipse class="sp-shell" cx="100" cy="145" rx="55" ry="42" fill="#4a7a48"/>' +
        '<path d="M60,145 Q100,110 140,145 Q100,175 60,145" fill="none" stroke="#2d5a2c" stroke-width="3"/>' +
        '<path d="M100,110 v70 M70,130 L130,160 M130,130 L70,160" stroke="#2d5a2c" stroke-width="2.5" opacity=".7"/>' +
        '<circle cx="100" cy="95" r="28" fill="#c4b070"/>' +
        eyes(92) +
        '<ellipse cx="100" cy="108" rx="5" ry="4" fill="#3a2a10"/>' +
        '<ellipse class="sp-foot f1" cx="60" cy="185" rx="14" ry="9" fill="#c4b070"/>' +
        '<ellipse class="sp-foot f2" cx="140" cy="185" rx="14" ry="9" fill="#c4b070"/>' +
        '</g>',
      suindara: '<g class="sp-body sp-suindara">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="40" ry="7" fill="rgba(0,0,0,.22)"/>' +
        '<path class="sp-wing w1" d="M55,140 Q20,150 35,180 Q60,160 70,150" fill="#e8e0d0"/>' +
        '<path class="sp-wing w2" d="M145,140 Q180,150 165,180 Q140,160 130,150" fill="#e8e0d0"/>' +
        '<ellipse cx="100" cy="150" rx="40" ry="38" fill="#f0e8d8"/>' +
        '<circle cx="100" cy="95" r="42" fill="#f0e8d8"/>' +
        '<circle cx="82" cy="92" r="16" fill="#1a120c"/><circle cx="118" cy="92" r="16" fill="#1a120c"/>' +
        '<circle cx="82" cy="92" r="7" fill="#E6BE49"/><circle cx="118" cy="92" r="7" fill="#E6BE49"/>' +
        '<circle cx="84" cy="90" r="2.5" fill="#fff"/><circle cx="120" cy="90" r="2.5" fill="#fff"/>' +
        '<path d="M95,112 Q100,120 105,112" fill="#c48a2a"/>' +
        '<path class="sp-moon" d="M160,40 a12,12 0 1,0 0,0.1 a9,9 0 1,1 0,-0.1" fill="#E6BE49" opacity=".85"/>' +
        '</g>',
      prea: '<g class="sp-body sp-prea">' +
        '<ellipse class="sp-shadow" cx="100" cy="198" rx="38" ry="7" fill="rgba(0,0,0,.2)"/>' +
        '<ellipse cx="100" cy="155" rx="48" ry="36" fill="#b8956a"/>' +
        '<circle cx="100" cy="105" r="40" fill="#b8956a"/>' +
        '<ellipse cx="55" cy="95" rx="12" ry="16" fill="#a08058"/><ellipse cx="145" cy="95" rx="12" ry="16" fill="#a08058"/>' +
        eyes(105) +
        '<ellipse cx="100" cy="120" rx="7" ry="5" fill="#3a2818"/>' +
        '<ellipse class="sp-cheek c1" cx="70" cy="120" rx="8" ry="5" fill="#e8a090" opacity=".7"/>' +
        '<ellipse class="sp-cheek c2" cx="130" cy="120" rx="8" ry="5" fill="#e8a090" opacity=".7"/>' +
        '<path class="sp-whisk w1" d="M60,118 h-22 M60,124 h-20" stroke="#3a2818" stroke-width="1.5"/>' +
        '<path class="sp-whisk w2" d="M140,118 h22 M140,124 h20" stroke="#3a2818" stroke-width="1.5"/>' +
        '</g>'
    };
    var body = bodies[id] || bodies.grilo;
    return '<svg class="sp-avatar-svg" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><linearGradient id="hornGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E6BE49"/><stop offset="100%" stop-color="#fff5c8"/></linearGradient></defs>' +
      body + '</svg>';
  }

  function applySpeciesAvatar(s) {
    var host = $('tama-cat-stage');
    if (!host) return;
    var sp = speciesById(s && s.speciesId);
    var expr = catExpr(s);
    var stageId = (s && s.alive === false) ? 'dead' : currentStage(s).id;
    host.setAttribute('data-species', sp.id);
    host.setAttribute('data-anim', sp.anim || '');
    host.setAttribute('data-expr', expr);
    host.setAttribute('data-stage', stageId);

    var layer = $('tama-species-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'tama-species-layer';
      layer.className = 'tama-species-layer';
      host.insertBefore(layer, host.firstChild);
    }

    // ovo: casca tematicada pela espécie (emoji + cor) — o bichinho já “existe”
    if (stageId === 'ovo' || !(s && s.speciesId)) {
      var eggHue = {
        unicornio: '#e8d4ff', grilo: '#c8f0a8', caramelo: '#e8c090', preguica: '#d4c4a8',
        gaviao: '#c8d8e8', jabuti: '#b8d4a0', suindara: '#d0d0e8', prea: '#f0d8a8'
      };
      var hue = eggHue[sp.id] || '#e8c878';
      var em = sp.emoji || '🥚';
      layer.innerHTML =
        '<div class="sp-egg-wrap" data-species-egg="' + sp.id + '">' +
          '<div class="sp-egg" style="background:radial-gradient(ellipse at 35% 30%,#fff8f0,' + hue + ' 55%,#a08040 100%)"></div>' +
          '<div class="sp-egg-crack"></div>' +
          '<div class="sp-egg-peek" aria-hidden="true">' + em + '</div>' +
        '</div>';
      layer.setAttribute('data-mode', 'egg');
      var legacy = $('tama-cat');
      if (legacy) legacy.style.display = 'none';
      return;
    }

    layer.setAttribute('data-mode', 'pet');
    layer.innerHTML = speciesAvatarSVG(sp.id, expr);
    var legacy = $('tama-cat');
    if (legacy) legacy.style.display = 'none';
  }



  function renderStageLadder(s) {
    var el = $('tama-stage-ladder');
    if (!el) return;
    var curId = currentStage(s).id;
    var curIdx = stageIndex(curId);
    var pending = s.pendingStageId;
    var html = '';
    for (var i = 0; i < STAGES.length; i++) {
      var st = STAGES[i];
      var cls = 'tt-stage-chip ladder-chip';
      if (i < curIdx) cls += ' is-done';
      if (i === curIdx) cls += ' is-current';
      if (pending && st.id === pending) cls += ' is-pending';
      html += '<span class="' + cls + '" title="' + (st.blurb || st.label) + '">' +
        (st.emoji || '') + ' ' + st.label + '</span>';
    }
    el.innerHTML = html;
  }

  function renderEvolveCta(s) {
    var host = $('tama-evolve-cta');
    if (!host) return;
    if (!s.pendingStageId || !s.alive) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    var pend = stageById(s.pendingStageId);
    var ready = canAnswerRoda(s);
    var need = resonanceNeedForStage(s.pendingStageId);
    var total = Math.round(resonanceTotal(s));
    host.hidden = false;
    if (ready) {
      host.innerHTML =
        '<button type="button" class="evo-cta evo-cta-ready" data-action="evolve-ritual">' +
        '◎ Responder à Roda · ' + pend.label + '</button>';
    } else {
      host.innerHTML =
        '<button type="button" class="evo-cta evo-cta-wait" data-action="evolve-ritual">' +
        'Roda chama · ' + pend.label + ' · ' + total + '/' + need + ' resonância</button>';
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
    migrateSpecies(s);
    var st = currentStage(s);
    var catEl = $('tama-cat');
    if (catEl) {
      catEl.setAttribute('data-stage', st.id);
      catEl.setAttribute('data-expr', catExpr(s));
    }
    try { applySpeciesAvatar(s); } catch (eAv) { console.warn('[tama avatar]', eAv); }
    try {
      ensureGenome(s);
      renderGenomePanel(s);
      var stageHost = $('tama-cat-stage');
      if (stageHost) {
        var vis = '';
        try { vis = genomeVisualClasses(s) || ''; } catch (_) {}
        stageHost.className = ('cat-stage ' + vis).replace(/\s+/g, ' ').trim();
      }
    } catch (eGen) { console.warn('[tama genome]', eGen); }
    var name = $('tama-name');
    if (name) name.textContent = s.name || 'Cri';
    var stageEl = $('tama-stage');
    if (stageEl) {
      var formBit = (s.formId && FORM_META[s.formId]) ? (' · ' + FORM_META[s.formId].label) : '';
      stageEl.textContent = (st.emoji ? st.emoji + ' ' : '') + st.label + formBit;
    }
    var ageEl = $('tama-age');
    if (ageEl) ageEl.textContent = formatAge(s);
    var life = $('tama-life');
    if (life) {
      life.textContent = formatLife();
      var ph = lifePhase();
      life.classList.toggle('is-late', ph === 'late');
      life.classList.toggle('is-dying', ph === 'dying');
      life.classList.toggle('is-ended', eventIsOver() && (ph === 'ended' || !s.alive));
    }
    var status = $('tama-status');
    if (status) {
      var phase = lifePhase();
      if (eventIsOver() && (!s.alive || phase === 'ended')) {
        status.textContent = FAREWELL_DONE;
      } else if (!s.alive) {
        status.textContent = 'Cri precisa de um renascer — use Renascer abaixo.';
      } else if (phase === 'dying' && eventIsOver()) {
        status.textContent = FAREWELL;
      } else if (s.sleeping) {
        status.textContent = 'Descansando o cabrunco…';
      } else if (s.sick) {
        status.textContent = 'Esse cabrunco não tá legal…';
      } else if (phase === 'late') {
        status.textContent = FAREWELL_LATE;
      }
      else if (mood(s) === 'happy') status.textContent = 'Cabrunco de bem em São Cristóvão';
      else if (mood(s) === 'sad') status.textContent = 'Se oriente… precisa de você';
      else status.textContent = 'De boa no centro histórico';
    }
    // CTA Resonância da Roda
    try {
      var evoCta = document.getElementById('tama-roda-cta');
      if (s.alive && s.pendingStageId && !eventIsOver()) {
        if (!evoCta) {
          var host = $('tama-status') && $('tama-status').parentNode;
          if (host) {
            evoCta = document.createElement('button');
            evoCta.type = 'button';
            evoCta.id = 'tama-roda-cta';
            evoCta.setAttribute('data-action', 'evolve-ritual');
            evoCta.textContent = canAnswerRoda(s) ? '✨ A Roda chama — evoluir' : '✨ A Roda sussurra…';
            evoCta.style.cssText = 'display:block;margin:0.5rem auto 0;padding:0.5rem 1rem;border-radius:999px;border:1.5px solid rgba(227,61,107,0.55);background:rgba(227,61,107,0.18);color:#f5a3b8;font:700 0.75rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 0 18px rgba(227,61,107,0.25)';
            host.appendChild(evoCta);
          }
        } else {
          evoCta.textContent = canAnswerRoda(s) ? '✨ A Roda chama — evoluir' : '✨ A Roda sussurra…';
        }
      } else if (evoCta && evoCta.parentNode) {
        evoCta.parentNode.removeChild(evoCta);
      }
    } catch (_) {}
    // CTA Renascer quando morto (mobile: mais fácil de achar)
    try {
      var deadCta = document.getElementById('tama-renascer-cta');
      if (!s.alive && !eventIsOver()) {
        if (!deadCta && status && status.parentNode) {
          deadCta = document.createElement('button');
          deadCta.type = 'button';
          deadCta.id = 'tama-renascer-cta';
          deadCta.setAttribute('data-action', 'reset');
          deadCta.textContent = 'Renascer agora';
          deadCta.style.cssText = 'display:block;margin:0.55rem auto 0;padding:0.55rem 1.15rem;border-radius:999px;border:none;background:#e33d6b;color:#fff;font:700 0.8rem/1 Oswald,system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 4px 16px rgba(227,61,107,0.45);z-index:5;position:relative;';
          status.parentNode.appendChild(deadCta);
        }
      } else if (deadCta && deadCta.parentNode) {
        deadCta.parentNode.removeChild(deadCta);
      }
    } catch (_) {}
    bar($('bar-hunger'), s.hunger);
    bar($('bar-happy'), s.happy);
    bar($('bar-energy'), s.energy);
    bar($('bar-hygiene'), s.hygiene);
    var evoFill = $('bar-evolve');
    var agePct = Math.round(evolutionProgress(s) * 100);
    var resPct = Math.round(resonanceProgress(s) * 100);
    if (evoFill) {
      evoFill.style.width = agePct + '%';
      evoFill.classList.toggle('is-ready', !!s.pendingStageId && canAnswerRoda(s));
      evoFill.classList.toggle('is-pending', !!s.pendingStageId);
    }
    var evoLabel = $('tama-evolve-label');
    var nxt = nextStage(st);
    if (evoLabel) {
      if (s.pendingStageId) {
        var pend = stageById(s.pendingStageId);
        evoLabel.textContent = canAnswerRoda(s)
          ? ('Roda pronta → ' + pend.label)
          : ('Roda chama → ' + pend.label + ' · ressonância ' + Math.round(resonanceTotal(s)) + '/' + resonanceNeedForStage(s.pendingStageId));
      } else if (nxt) {
        evoLabel.textContent = 'Próxima: ' + nxt.label + ' · ' + agePct + '%';
      } else {
        evoLabel.textContent = 'Forma máxima · ' + (s.formId && FORM_META[s.formId] ? FORM_META[s.formId].label : 'Anciã');
      }
    }
    try { renderStageLadder(s); } catch (_) {}
    try { renderEvolveCta(s); } catch (_) {}
    // painel de resonância (se existir no DOM)
    try {
      var rr = ensureResonance(s);
      ['afeto', 'ritual', 'cortejo', 'voz'].forEach(function (k) {
        var el = $('res-' + k);
        if (el) el.style.width = Math.round(rr[k]) + '%';
        var lb = $('res-' + k + '-val');
        if (lb) lb.textContent = Math.round(rr[k]);
      });
    } catch (_) {}

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
      } else {
        b.disabled = false;
        b.removeAttribute('disabled');
        b.title = 'Começar de novo com um ovo';
        // destaque quando o pet morreu
        if (s && !s.alive) {
          b.style.outline = '2px solid #e33d6b';
          b.style.boxShadow = '0 0 14px rgba(227,61,107,0.35)';
        } else {
          b.style.outline = '';
          b.style.boxShadow = '';
        }
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
      showSpeciesPicker(function (id) {
        applyNewPet(id, { renascer: false });
      }, {
        title: 'Escolha seu bichinho',
        lead: 'Toque num bichinho para nascer no FASC 2026.',
        required: true
      });
      return;
    }
    render();
    setTab('play');
  }


  function openTamaConfirm(opts) {
    opts = opts || {};
    // remove overlay anterior
    try {
      var old = document.getElementById('tama-confirm');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    var overlay = document.createElement('div');
    overlay.id = 'tama-confirm';
    overlay.className = 'tama-confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tama-confirm-title');
    overlay.innerHTML =
      '<div class="tama-confirm-card">' +
        '<div class="tama-confirm-icon" aria-hidden="true">↺</div>' +
        '<h2 id="tama-confirm-title">' + String(opts.title || 'Confirmar') + '</h2>' +
        '<p class="tama-confirm-body">' + String(opts.body || '') + '</p>' +
        '<div class="tama-confirm-actions">' +
          '<button type="button" class="tama-btn-cancel" data-tama-cancel>' +
            String(opts.cancelLabel || 'Cancelar') +
          '</button>' +
          '<button type="button" class="tama-btn-danger" data-tama-ok>' +
            String(opts.confirmLabel || 'Confirmar') +
          '</button>' +
        '</div>' +
      '</div>';

    function close() {
      try {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      } catch (_) {}
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
      var cancel = e.target.closest('[data-tama-cancel]');
      if (cancel) { close(); return; }
      var ok = e.target.closest('[data-tama-ok]');
      if (ok) {
        close();
        try {
          if (typeof opts.onConfirm === 'function') opts.onConfirm();
        } catch (err) {
          console.warn('[CRICRI] confirm', err);
        }
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    try {
      var focusBtn = overlay.querySelector('[data-tama-ok]');
      if (focusBtn) focusBtn.focus();
    } catch (_) {}
  }

  function applyNewPet(speciesId, opts) {
    opts = opts || {};
    var now = Date.now();
    var sid = speciesId === 'viralata' ? 'caramelo' : speciesId;
    var sp = speciesById(sid);
    state = defaultState();
    state.started = true;
    state.alive = true;
    state.bornAt = now;
    state.started_at = now;
    state.lastTick = now;
    state.speciesId = sid || sp.id;
    state.name = (sp && sp.name) ? sp.name : 'Cri';
    state.stageId = 'ovo';
    state.pendingStageId = null;
    state.formId = null;
    state.genome = null;
    ensureGenome(state);
    try { grantCard(state, 'c_ovo'); } catch (_) {}
    try {
      pushLog(state, (opts.renascer ? 'Renascido' : 'Nasceu') + ' como ' + state.name + ' — CRICRI 2026.');
    } catch (_) {}
    try { notifyCri('born'); } catch (_) {}
    delete state.endedAt;
    delete state.endSnapshot;
    save(state);
    try {
      var panel = $('farewell-panel');
      if (panel) { panel.hidden = true; panel.style.display = 'none'; }
    } catch (_) {}
    try {
      var deadCta = document.getElementById('tama-renascer-cta');
      if (deadCta && deadCta.parentNode) deadCta.parentNode.removeChild(deadCta);
    } catch (_) {}
    render();
    setTab('play');
  }

  function doRenascer() {
    // Escolhe o bichinho no renascimento
    showSpeciesPicker(function (id) {
      applyNewPet(id, { renascer: true });
    }, {
      title: 'Escolha o bichinho',
      lead: 'Renascer apaga o pet atual. Escolha a espécie do novo CRICRI.'
    });
  }

  function act(action) {
    var s = state;
    if (action === 'start') { startGame(); return; }
    if (action === 'tutorial') {
      openTutorialSheet();
      return;
    }
    if (action === 'genealogy') {
      openGenealogySheet();
      return;
    }
    if (action === 'hybridize') {
      openHybridSheet();
      return;
    }
    if (action === 'evolve-ritual') {
      checkEvolution(state);
      openRodaSheet();
      return;
    }
    if (action === 'reset') {
      openTamaConfirm({
        title: 'Renascer?',
        body: 'Isso apaga o bicho atual e começa do zero. Tem certeza?',
        confirmLabel: 'Sim, renascer',
        cancelLabel: 'Cancelar',
        onConfirm: function () {
          doRenascer();
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
    var st = currentStage(s);
    if (st.id === 'ovo' && (action === 'after' || action === 'play' || action === 'mapa')) {
      pushLog(s, 'Ainda é ovo (~1h).');
      save(s); render(); return;
    }
    switch (action) {
      case 'feed':
        s.hunger = clamp(s.hunger + 28, 0, 100);
        s.hygiene = clamp(s.hygiene - 3, 0, 100);
        s.feedCount++; s.careScore++; addResonance(s, 'afeto', 6); break;
      case 'play':
        if (s.energy < 12) { pushLog(s, 'Sem energia.'); break; }
        s.happy = clamp(s.happy + 24, 0, 100);
        s.energy = clamp(s.energy - 14, 0, 100);
        s.hunger = clamp(s.hunger - 5, 0, 100);
        s.playCount++; s.careScore++; addResonance(s, 'afeto', 7); break;
      case 'clean':
        s.hygiene = clamp(s.hygiene + 35, 0, 100);
        s.happy = clamp(s.happy + 5, 0, 100);
        s.cleanCount++; s.careScore++; addResonance(s, 'ritual', 6); break;
      case 'sleep':
        addResonance(s, 'ritual', 4);
        s.sleeping = !s.sleeping;
        if (s.sleeping) {
          grantCard(s, 'c_soneca', true);
          try { tickEnvironment(s, { trigger: 'sleep' }); } catch (_) {}
        }
        break;
      case 'medicine':
        if (!s.sick && s.health > 70) break;
        var wasCritical = s.sick && (s.health || 0) < 35;
        s.sick = false;
        s.health = clamp(s.health + 40, 0, 100);
        s.careScore += 2;
        addResonance(s, 'ritual', 8);
        if (wasCritical) {
          try { tickEnvironment(s, { trigger: 'stress' }); } catch (_) {}
          var mStress = tryMutate(s, 'stress');
          if (mStress) { try { showMutationToast(mStress); } catch (_) {} }
        }
        break;
      case 'after':
        if (s.energy < 20) { pushLog(s, 'Cansada demais.'); break; }
        s.happy = clamp(s.happy + 28, 0, 100);
        s.energy = clamp(s.energy - 20, 0, 100);
        s.hunger = clamp(s.hunger - 8, 0, 100);
        s.hygiene = clamp(s.hygiene - 6, 0, 100);
        s.afterCount++; s.careScore += 2;
        addResonance(s, 'cortejo', 9);
        try { tickEnvironment(s, { trigger: 'after' }); } catch (_) {}
        if ((s.afterCount || 0) >= 2 && (s.afterCount % 2 === 0)) {
          var mAfter = tryMutate(s, 'after');
          if (mAfter) { try { showMutationToast(mAfter); } catch (_) {} }
        }
        break;
      case 'mapa':
        addResonance(s, 'cortejo', 7);
        s.happy = clamp(s.happy + 12, 0, 100);
        s.energy = clamp(s.energy - 5, 0, 100);
        s.careScore++;
        grantCard(s, 'c_mapa', true);
        try { tickEnvironment(s, { trigger: 'mapa' }); } catch (_) {}
        break;
      case 'scrap':
        addResonance(s, 'voz', 8);
        s.happy = clamp(s.happy + 14, 0, 100);
        s.scrapCount++; s.careScore++; break;
      case 'rename':
        addResonance(s, 'voz', 5);
        var n = prompt('Nome (máx. 12):', s.name || 'Cri');
        if (n) s.name = String(n).trim().slice(0, 12) || 'Cri';
        break;
    }
    checkCardMilestones(s);
    checkEvolution(s);
    save(s);
    render();
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) { setTab(tab.getAttribute('data-tab')); return; }
      var pet = e.target.closest('[data-action="switch-pet"]');
      if (pet) {
        e.preventDefault();
        switchToPet(pet.getAttribute('data-pet-id') || 'main');
        return;
      }
      var a = e.target.closest('[data-action]');
      if (a) { e.preventDefault(); act(a.getAttribute('data-action')); return; }
      var sh = e.target.closest('[data-shell]');
      if (sh) { state.shell = sh.getAttribute('data-shell'); save(state); render(); }
    });
    // Eco genético vindo do mapa (encontros mútuos)
    window.addEventListener('cricri:friend-meet', function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        if (!state || !state.started || !state.alive) return;
        var echo = absorbGeneEcho(state, d);
        if (echo) {
          save(state);
          render();
        }
      } catch (err) {
        console.warn('[tama hybrid echo]', err);
      }
    });
    window.addEventListener('projano:geofence', function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        if (!state || !state.started || !state.alive) return;
        if (d.type !== 'enter' || !d.id) return;
        tickEnvironment(state, {
          trigger: 'spot',
          spotId: d.id,
          spotName: d.name || d.id
        });
        save(state);
        render();
      } catch (err) {
        console.warn('[tama env spot]', err);
      }
    });
    window.addEventListener('cricri:heat-sample', function () {
      try {
        if (!state || !state.started || !state.alive) return;
        tickEnvironment(state, { trigger: 'heat' });
        save(state);
      } catch (_) {}
    });
  }

  function boot() {
    try { wireTopGear(); } catch (eGear) { console.warn('[tama gear]', eGear); }
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
  // gear garantido mesmo se boot falhar cedo
  document.addEventListener('DOMContentLoaded', function () {
    try { wireTopGear(); } catch (_) {}
  });

  // API de leitura (perfil / outros) — mesma instância de load/cloudLoad
  

  function openTutorialSheet() {
    try {
      var old = document.getElementById('tama-tutorial-sheet');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}
    var sheet = document.createElement('div');
    sheet.id = 'tama-tutorial-sheet';
    sheet.className = 'tama-tutorial-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Tutorial do CRICRI');
    sheet.innerHTML =
      '<div class="tama-tutorial-card">' +
        '<div class="tama-sp-handle" aria-hidden="true"></div>' +
        '<p class="tama-sp-kicker">CRICRI · São Cristóvão</p>' +
        '<h2>Como funciona o pet</h2>' +
        '<p class="tt-lead">Cuide do seu bichinho durante o FASC. Cuidado vira resonância, resonância abre a Roda — e a Roda evolui o pet.</p>' +
        '<div class="tt-step"><span class="tt-step-ico">🥚</span><div><strong>1 · Nascer</strong><p>Escolha a espécie. Começa como ovo (~1h). Comer, limpar e dormir mantêm vivo.</p></div></div>' +
        '<div class="tt-step"><span class="tt-step-ico">💗</span><div><strong>2 · Cuidar</strong><p>Comer, brincar, limpar, dormir, remédio, after e mapa sobem Afeto, Ritual, Cortejo e Voz.</p></div></div>' +
        '<div class="tt-step"><span class="tt-step-ico">◎</span><div><strong>3 · Resonância</strong><p>Quando a idade libera o próximo estágio e a resonância basta, a Roda chama. Toque no ritual para evoluir.</p></div></div>' +
        '<div class="tt-step"><span class="tt-step-ico">✨</span><div><strong>4 · Evoluir</strong><p>Escolha a forma (Barroco, Azulejo, Cortejo, Lenda…). Pode nascer mutação genética.</p></div></div>' +
        '<div class="tt-step"><span class="tt-step-ico">🧬</span><div><strong>5 · Hibridizar</strong><p>Encontre amigos no mapa (mesmo spot) ou simule um eco. Cruza alelos sem trocar a espécie e pode criar traço híbrido.</p></div></div>' +
        '<div class="tt-step"><span class="tt-step-ico">🃏</span><div><strong>6 · Coleção</strong><p>Photocards e figurinhas na aba Coleção. After, mapa e evoluções desbloqueiam cartas.</p></div></div>' +
        '<p class="tama-sp-kicker" style="margin-top:0.75rem">Linha do tempo</p>' +
        '<div class="tt-stages">' +
          '<span class="tt-stage-chip">🥚 Ovo</span>' +
          '<span class="tt-stage-chip">🐤 Bebê</span>' +
          '<span class="tt-stage-chip">🐾 Filhote</span>' +
          '<span class="tt-stage-chip">✨ Cria</span>' +
          '<span class="tt-stage-chip">🎉 Festa</span>' +
          '<span class="tt-stage-chip">🌟 Adulta</span>' +
          '<span class="tt-stage-chip">👑 Anciã</span>' +
        '</div>' +
        '<p class="tt-lead" style="margin-bottom:0.85rem">Mutações ambientais vêm do mapa, after e calor da cidade. Epi é temporária; ambiental é permanente.</p>' +
        '<button type="button" class="tt-close" id="tt-close">Entendi</button>' +
      '</div>';
    document.body.appendChild(sheet);
    function close() {
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    }
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    var cl = sheet.querySelector('#tt-close');
    if (cl) cl.addEventListener('click', close);
  }

  function wireTopGear() {
    var btn = document.getElementById('cricri-gear-btn');
    var panel = document.getElementById('cricri-gear-panel');
    var wrap = document.getElementById('cricri-top-tools');
    if (!btn || !panel) return;

    // painel fixo sob o botão (não depende de stacking do header)
    panel.style.cssText = [
      'position:fixed',
      'top:52px',
      'left:max(0.65rem, env(safe-area-inset-left))',
      'min-width:200px',
      'background:#1a1512',
      'border:1.5px solid rgba(230,190,73,0.4)',
      'border-radius:14px',
      'padding:0.45rem',
      'z-index:2147483647',
      'box-shadow:0 12px 32px rgba(0,0,0,0.55)',
      'display:none'
    ].join(';');

    function isOpen() {
      return panel.style.display === 'block' || panel.style.display === 'flex';
    }
    function openPanel() {
      panel.removeAttribute('hidden');
      panel.style.display = 'block';
      btn.setAttribute('aria-expanded', 'true');
    }
    function closePanel() {
      panel.style.display = 'none';
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) closePanel();
      else openPanel();
    }, true);

    if (wrap) {
      wrap.style.pointerEvents = 'auto';
      wrap.style.zIndex = '2147483646';
    }
    btn.style.pointerEvents = 'auto';
    btn.style.cursor = 'pointer';

    var a11y = document.getElementById('cricri-gear-a11y');
    if (a11y) {
      a11y.addEventListener('click', function (e) {
        e.stopPropagation();
        closePanel();
        var tog = document.querySelector('.a11y-toggle, #a11y-toggle');
        if (tog) tog.click();
        else {
          // fallback: dispara a11y-core se existir
          try {
            if (window.fascA11y && typeof window.fascA11y.open === 'function') window.fascA11y.open();
          } catch (_) {}
        }
      });
    }
    var theme = document.getElementById('cricri-gear-theme');
    if (theme) {
      theme.addEventListener('click', function (e) {
        e.stopPropagation();
        try {
          var h = document.documentElement;
          var cur = h.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
          var next = cur === 'light' ? 'dark' : 'light';
          h.setAttribute('data-theme', next);
          h.setAttribute('data-a11y-theme', next === 'light' ? 'light' : 'dark');
          h.style.colorScheme = next;
          var s = {};
          try { s = JSON.parse(localStorage.getItem('fasc-a11y-v1') || '{}') || {}; } catch (_) {}
          s.theme = next;
          localStorage.setItem('fasc-a11y-v1', JSON.stringify(s));
        } catch (_) {}
        closePanel();
      });
    }
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      closePanel();
    }, true);
  }

  function showSpeciesPicker(onPick, opts) {
    opts = opts || {};
    try {
      var old = document.getElementById('tama-species-picker');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    var overlay = document.createElement('div');
    overlay.id = 'tama-species-picker';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.title || 'Escolha seu bichinho');

    var card = document.createElement('div');
    card.className = 'tama-sp-card';
    card.innerHTML =
      '<div class="tama-sp-handle" aria-hidden="true"></div>' +
      '<p class="tama-sp-kicker">CRICRI · São Cristóvão</p>' +
      '<h2 class="tama-sp-title">' + (opts.title || 'Escolha seu bichinho') + '</h2>' +
      '<p class="tama-sp-lead">' + (opts.lead || 'Cada um tem animação e personalidade próprias. Toque para escolher.') + '</p>' +
      '<div id="tama-species-grid"></div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var grid = card.querySelector('#tama-species-grid');
    SPECIES.filter(function (sp) { return sp.id !== 'viralata'; }).forEach(function (sp) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-species', sp.id);
      btn.innerHTML =
        '<div class="tama-sp-emoji" aria-hidden="true">' + (sp.emoji || '🐾') + '</div>' +
        '<strong>' + sp.name + '</strong>' +
        '<span>' + (sp.blurb || '') + '</span>';
      btn.addEventListener('click', function () {
        try { overlay.remove(); } catch (_) {}
        if (typeof onPick === 'function') onPick(sp.id);
      });
      grid.appendChild(btn);
    });

    // backdrop: só fecha se não for obrigatório (renascer/início exige escolha)
    if (!opts.required) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          try { overlay.remove(); } catch (_) {}
        }
      });
    }
  }

  function ensureSpeciesChosen(s) {
    if (s && s.speciesId) return s;
    showSpeciesPicker(function (id) {
      applyNewPet(id, { renascer: false });
    }, {
      title: 'Escolha seu bichinho',
      lead: 'Toque num bichinho para começar a cuidar no FASC 2026.',
      required: true
    });
    return s;
  }

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
      var emoji = { ovo: '🥚' };
      var se = speciesEmoji(s, st.id);
      ['bebe','filhote','cria','festa','adulta','ancia'].forEach(function (k) { emoji[k] = se; });
      var formId = s.formId || null;
      var form = formId && FORM_META[formId] ? FORM_META[formId].label : '';
      return {
        name: String(s.name || 'Cri').slice(0, 24),
        stageId: st.id,
        stageLabel: st.label,
        emoji: emoji[st.id] || '🐾',
        shellId: shellId,
        shellLabel: labels[shellId] || shellId,
        careScore: Math.max(0, Number(s.careScore) || 0),
        alive: s.alive !== false,
        formId: formId,
        formLabel: form,
        evolutions: Math.max(0, Number(s.evolutions) || 0),
        resonance: ensureResonance(s)
      };
    },
    stageOf: function (s) { return stageForAge(ageHours(s)); },
    defaultState: defaultState
  };

})();
