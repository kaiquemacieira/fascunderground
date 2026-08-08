/**
 * Cri Cabrunco — localStorage cricri-tama-v3
 */

export const TAMA_STORAGE = 'cricri-tama-v3';
const EVENT_END_MS = Date.UTC(2026, 10, 23, 15, 0, 0);

export type StageId = 'ovo' | 'filhote' | 'cria' | 'jovem' | 'adulta' | 'ancia';
export type SpeciesId =
  | 'unicornio'
  | 'grilo'
  | 'caramelo'
  | 'preguica'
  | 'gaviao'
  | 'jabuti'
  | 'suindara'
  | 'prea'
  | 'gato';

export interface Species {
  id: SpeciesId;
  name: string;
  emoji: string;
  blurb: string;
  /** classe CSS de animação */
  anim: string;
}

export const SPECIES: Species[] = [
  { id: 'gato', name: 'Gato', emoji: '🐱', blurb: 'Miau da roda', anim: 'anim-gato' },
  { id: 'unicornio', name: 'Unicórnio', emoji: '🦄', blurb: 'Magia da praça', anim: 'anim-unicornio' },
  { id: 'grilo', name: 'Grilo', emoji: '🦗', blurb: 'O som do CRICRI', anim: 'anim-grilo' },
  { id: 'caramelo', name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua', anim: 'anim-caramelo' },
  { id: 'preguica', name: 'Bicho-preguiça', emoji: '🦥', blurb: 'Calma sergipana', anim: 'anim-preguica' },
  { id: 'gaviao', name: 'Gavião-carijó', emoji: '🦅', blurb: 'Olho na cidade', anim: 'anim-gaviao' },
  { id: 'jabuti', name: 'Jabuti', emoji: '🐢', blurb: 'Passo firme', anim: 'anim-jabuti' },
  { id: 'suindara', name: 'Suindara', emoji: '🦉', blurb: 'Noite na roda', anim: 'anim-suindara' },
  { id: 'prea', name: 'Preá', emoji: '🐹', blurb: 'Esperto do mato', anim: 'anim-prea' },
];

export interface TamaState {
  started: boolean;
  name: string;
  bornAt: number;
  lastTick: number;
  hunger: number;
  happy: number;
  energy: number;
  hygiene: number;
  health: number;
  shell: 'rosa' | 'ocre' | 'azul' | 'tuxedo';
  sleeping: boolean;
  sick: boolean;
  alive: boolean;
  careScore: number;
  feedCount: number;
  playCount: number;
  cleanCount: number;
  stageId: StageId;
  evolutions: number;
  speciesId: SpeciesId | null;
}

/** Care mínimo para cada estágio (mais acessível que antes) */
export const STAGES: {
  id: StageId;
  label: string;
  emoji: string;
  minCare: number;
  blurb: string;
}[] = [
  { id: 'ovo', label: 'Ovo', emoji: '🥚', minCare: 0, blurb: 'A roda ainda não girou' },
  { id: 'filhote', label: 'Filhote', emoji: '✨', minCare: 3, blurb: 'Saiu do ovo!' },
  { id: 'cria', label: 'Cria', emoji: '🌟', minCare: 10, blurb: 'Luz do Convento' },
  { id: 'jovem', label: 'Jovem', emoji: '🔥', minCare: 20, blurb: 'After e rua' },
  { id: 'adulta', label: 'Adulta', emoji: '💪', minCare: 35, blurb: 'Dona do mapa' },
  { id: 'ancia', label: 'Anciã', emoji: '👑', minCare: 55, blurb: 'Lenda de São Cristóvão' },
];

const SHELL_COLORS: Record<TamaState['shell'], { fur: string; light: string }> = {
  rosa: { fur: '#e33d6b', light: '#f7c9d6' },
  ocre: { fur: '#d49a2c', light: '#f7e2b4' },
  azul: { fur: '#1b6f7e', light: '#b8e6ef' },
  tuxedo: { fur: '#2a2621', light: '#f6efdc' },
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
}

export function eventIsOver(now = Date.now()) {
  if (now < EVENT_END_MS) return false;
  return now >= EVENT_END_MS;
}

export function speciesById(id: string | null | undefined): Species {
  const norm = id === 'viralata' ? 'caramelo' : id;
  return SPECIES.find((s) => s.id === norm) || SPECIES[0];
}

export function defaultState(): TamaState {
  const now = Date.now();
  return {
    started: false,
    name: 'Cri',
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
    stageId: 'ovo',
    evolutions: 0,
    speciesId: null,
  };
}

export function loadState(): TamaState {
  try {
    const raw = localStorage.getItem(TAMA_STORAGE);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<TamaState> & { speciesId?: string };
    const base = { ...defaultState(), ...parsed };
    if (parsed.speciesId === 'viralata') base.speciesId = 'caramelo';
    if (!STAGES.some((s) => s.id === base.stageId)) base.stageId = 'ovo';
    // migra care antigo alto sem estágio → recalcula estágio pelo care
    return syncStageFromCare(base as TamaState);
  } catch {
    return defaultState();
  }
}

/** Garante que o estágio corresponde ao care (corrige saves presos no ovo) */
function syncStageFromCare(s: TamaState): TamaState {
  if (!s.started || !s.alive) return s;
  let stageId: StageId = 'ovo';
  for (const st of STAGES) {
    if (s.careScore >= st.minCare) stageId = st.id;
  }
  if (stageId !== s.stageId) {
    return { ...s, stageId, evolutions: Math.max(s.evolutions, STAGES.findIndex((x) => x.id === stageId)) };
  }
  return s;
}

export function saveState(s: TamaState) {
  try {
    localStorage.setItem(TAMA_STORAGE, JSON.stringify(s));
  } catch {
    /* */
  }
}

export function stageMeta(id: StageId) {
  return STAGES.find((x) => x.id === id) || STAGES[0];
}

export function shellColors(shell: TamaState['shell']) {
  return SHELL_COLORS[shell] || SHELL_COLORS.rosa;
}

/** Emoji grande: ovo ou animal da espécie */
export function displayEmoji(s: TamaState) {
  if (!s.started) return '🥚';
  if (!s.alive) return '💀';
  if (s.stageId === 'ovo') return '🥚';
  return speciesById(s.speciesId).emoji;
}

export function tickState(s: TamaState, now = Date.now()): TamaState {
  if (!s.started || !s.alive) {
    return { ...s, lastTick: now };
  }

  const elapsed = Math.max(0, now - (s.lastTick || now));
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 0.01) return syncStageFromCare(s);

  const next = { ...s };
  const sleepFactor = next.sleeping ? 0.35 : 1;
  const away = Math.min(hours, 48);

  next.hunger = clamp(next.hunger - away * 4 * sleepFactor);
  next.energy = clamp(next.energy - away * (next.sleeping ? -2 : 3));
  next.hygiene = clamp(next.hygiene - away * 2.5 * sleepFactor);
  next.happy = clamp(next.happy - away * 3 * sleepFactor);

  const avg = (next.hunger + next.happy + next.energy + next.hygiene) / 4;
  if (avg < 25) next.health = clamp(next.health - away * 2);
  else if (avg > 70) next.health = clamp(next.health + away * 0.5);

  next.sick = next.health < 40 || avg < 20;
  if (next.health <= 0) {
    next.alive = false;
    next.health = 0;
  }

  next.lastTick = now;
  return maybeEvolve(next);
}

function maybeEvolve(s: TamaState): TamaState {
  const order: StageId[] = ['ovo', 'filhote', 'cria', 'jovem', 'adulta', 'ancia'];
  let next = { ...s };

  // sobe todos os estágios que o care permitir (não fica preso no ovo)
  for (let i = 0; i < order.length - 1; i++) {
    if (next.stageId !== order[i]) continue;
    const target = STAGES[i + 1];
    if (next.careScore >= target.minCare && next.alive && next.health >= 15) {
      next = {
        ...next,
        stageId: target.id,
        evolutions: next.evolutions + 1,
        happy: clamp(next.happy + 12),
        health: clamp(next.health + 5),
      };
    }
  }
  return next;
}

export function startPet(
  name: string,
  shell: TamaState['shell'],
  speciesId: SpeciesId
): TamaState {
  const now = Date.now();
  const s: TamaState = {
    ...defaultState(),
    started: true,
    name: name.trim() || 'Cri',
    shell,
    speciesId,
    bornAt: now,
    lastTick: now,
    stageId: 'ovo',
    careScore: 0,
  };
  saveState(s);
  return s;
}

export type CareAction = 'feed' | 'play' | 'clean' | 'sleep' | 'wake';

export function applyAction(s: TamaState, action: CareAction): { state: TamaState; message: string } {
  if (eventIsOver()) {
    return { state: s, message: 'A roda do festival já fechou.' };
  }
  if (!s.started) return { state: s, message: 'Comece a jornada primeiro.' };
  if (!s.alive) return { state: s, message: 'O Cri não está mais entre nós…' };

  let next = tickState({ ...s }, Date.now());
  let message = '';
  const sp = speciesById(next.speciesId);
  const before = next.stageId;

  switch (action) {
    case 'feed':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      next.hunger = clamp(next.hunger + 22);
      next.happy = clamp(next.happy + 4);
      next.feedCount += 1;
      next.careScore += 1;
      message = `Pastel da feira! ${sp.emoji}`;
      break;
    case 'play':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      if (next.energy < 12) return { state: next, message: 'Sem energia pra brincar.' };
      next.happy = clamp(next.happy + 20);
      next.energy = clamp(next.energy - 10);
      next.hunger = clamp(next.hunger - 4);
      next.playCount += 1;
      next.careScore += 1;
      message = `Brincou! ${sp.emoji}`;
      break;
    case 'clean':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      next.hygiene = clamp(next.hygiene + 25);
      next.happy = clamp(next.happy + 3);
      next.cleanCount += 1;
      next.careScore += 1;
      message = `Banho de caneco ${sp.emoji}`;
      break;
    case 'sleep':
      if (next.sleeping) return { state: next, message: 'Já está dormindo.' };
      next.sleeping = true;
      message = 'Soneca 😴';
      break;
    case 'wake':
      if (!next.sleeping) return { state: next, message: 'Já está acordado.' };
      next.sleeping = false;
      next.energy = clamp(next.energy + 18);
      next.careScore += 0; // acordar não dá care
      message = 'Acordou!';
      break;
  }

  next = maybeEvolve(next);
  if (next.stageId !== before) {
    if (before === 'ovo') {
      message = `Quebrou o ovo! É um ${sp.name} ${sp.emoji}`;
    } else {
      message = `Evoluiu para ${stageMeta(next.stageId).label}! ${sp.emoji}`;
    }
  }

  next.lastTick = Date.now();
  saveState(next);
  return { state: next, message };
}

export function ageLabel(bornAt: number, now = Date.now()) {
  const days = Math.floor((now - bornAt) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

export function nextStageInfo(s: TamaState) {
  const order: StageId[] = ['ovo', 'filhote', 'cria', 'jovem', 'adulta', 'ancia'];
  const idx = order.indexOf(s.stageId);
  if (idx < 0 || idx >= order.length - 1) return null;
  const cur = STAGES[idx];
  const next = STAGES[idx + 1];
  const span = Math.max(1, next.minCare - cur.minCare);
  const into = Math.max(0, s.careScore - cur.minCare);
  return {
    ...next,
    need: Math.max(0, next.minCare - s.careScore),
    progress: Math.min(100, Math.round((into / span) * 100)),
    fromLabel: cur.label,
    fromEmoji: cur.id === 'ovo' ? '🥚' : speciesById(s.speciesId).emoji,
    toEmoji: next.id === 'filhote' || cur.id === 'ovo' ? speciesById(s.speciesId).emoji : next.emoji,
  };
}
