/**
 * Cri Cabrunco — compatível com localStorage cricri-tama-v3 (vanilla)
 * Espécies e estágios alinhados ao tamagotchi original.
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
  | 'prea';

export interface Species {
  id: SpeciesId;
  name: string;
  emoji: string;
  blurb: string;
}

/** Mesmas espécies do vanilla (sem alias viralata na UI) */
export const SPECIES: Species[] = [
  { id: 'unicornio', name: 'Unicórnio', emoji: '🦄', blurb: 'Magia da praça' },
  { id: 'grilo', name: 'Grilo', emoji: '🦗', blurb: 'O som do CRICRI' },
  { id: 'caramelo', name: 'Caramelo', emoji: '🐕', blurb: 'Coração de rua' },
  { id: 'preguica', name: 'Bicho-preguiça', emoji: '🦥', blurb: 'Calma sergipana' },
  { id: 'gaviao', name: 'Gavião-carijó', emoji: '🦅', blurb: 'Olho na cidade' },
  { id: 'jabuti', name: 'Jabuti', emoji: '🐢', blurb: 'Passo firme' },
  { id: 'suindara', name: 'Suindara', emoji: '🦉', blurb: 'Noite na roda' },
  { id: 'prea', name: 'Preá', emoji: '🐹', blurb: 'Esperto do mato' },
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

export const STAGES: {
  id: StageId;
  label: string;
  emoji: string;
  minCare: number;
  blurb: string;
}[] = [
  { id: 'ovo', label: 'Ovo', emoji: '🥚', minCare: 0, blurb: 'A roda ainda não girou' },
  { id: 'filhote', label: 'Filhote', emoji: '🐤', minCare: 5, blurb: 'Primeiros passos no centro' },
  { id: 'cria', label: 'Cria', emoji: '🐱', minCare: 15, blurb: 'Luz do Convento' },
  { id: 'jovem', label: 'Jovem', emoji: '🐯', minCare: 28, blurb: 'After e rua' },
  { id: 'adulta', label: 'Adulta', emoji: '🐆', minCare: 45, blurb: 'Dona do mapa' },
  { id: 'ancia', label: 'Anciã', emoji: '👑', minCare: 70, blurb: 'Lenda de São Cristóvão' },
];

const SHELL_COLORS: Record<TamaState['shell'], { fur: string; light: string }> = {
  rosa: { fur: '#e33d6b', light: '#f7c9d6' },
  ocre: { fur: '#d49a2c', light: '#f7e2b4' },
  azul: { fur: '#1b6f7e', light: '#b8e6ef' },
  tuxedo: { fur: '#2a2621', light: '#f6efdc' },
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

export function eventIsOver(now = Date.now()) {
  if (now < EVENT_END_MS) return false;
  return now >= EVENT_END_MS;
}

export function speciesById(id: string | null | undefined): Species {
  const norm = id === 'viralata' ? 'caramelo' : id;
  return SPECIES.find((s) => s.id === norm) || SPECIES[2]; // caramelo default
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
    // normaliza stage
    if (!STAGES.some((s) => s.id === base.stageId)) base.stageId = 'ovo';
    return base as TamaState;
  } catch {
    return defaultState();
  }
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

/** Display emoji: ovo ou espécie */
export function displayEmoji(s: TamaState) {
  if (!s.started || s.stageId === 'ovo') return '🥚';
  if (!s.alive) return '💀';
  return speciesById(s.speciesId).emoji;
}

export function tickState(s: TamaState, now = Date.now()): TamaState {
  if (!s.started || !s.alive) {
    return { ...s, lastTick: now };
  }

  const elapsed = Math.max(0, now - (s.lastTick || now));
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 0.01) return s;

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

/**
 * Evolução em cadeia: sobe um estágio por vez quando careScore >= minCare
 * e o bicho está vivo e com saúde mínima.
 */
function maybeEvolve(s: TamaState): TamaState {
  const order: StageId[] = ['ovo', 'filhote', 'cria', 'jovem', 'adulta', 'ancia'];
  let next = { ...s };
  let changed = false;

  while (true) {
    const idx = order.indexOf(next.stageId);
    if (idx < 0 || idx >= order.length - 1) break;
    const target = STAGES[idx + 1];
    if (next.careScore < target.minCare || !next.alive || next.health < 25) break;

    next = {
      ...next,
      stageId: target.id,
      evolutions: next.evolutions + 1,
      happy: clamp(next.happy + 10),
      health: clamp(next.health + 5),
    };
    changed = true;
    // um estágio por tick de ação (não pula Anciã de uma vez na mesma ação)
    break;
  }

  return changed ? next : s;
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
  };
  saveState(s);
  return s;
}

export type CareAction = 'feed' | 'play' | 'clean' | 'sleep' | 'wake';

export function applyAction(s: TamaState, action: CareAction): { state: TamaState; message: string } {
  if (eventIsOver()) {
    return { state: s, message: 'A roda do festival já fechou. Obrigado por cuidar do Cri.' };
  }
  if (!s.started) return { state: s, message: 'Comece a jornada primeiro.' };
  if (!s.alive) return { state: s, message: 'O Cri não está mais entre nós…' };

  let next = tickState({ ...s }, Date.now());
  let message = '';
  const sp = speciesById(next.speciesId);

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
      if (next.energy < 15) return { state: next, message: 'Sem energia pra brincar.' };
      next.happy = clamp(next.happy + 20);
      next.energy = clamp(next.energy - 12);
      next.hunger = clamp(next.hunger - 5);
      next.playCount += 1;
      next.careScore += 1;
      message = `Cortejo na praça! ${sp.emoji}`;
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
      message = 'Soneca na praça 😴';
      break;
    case 'wake':
      if (!next.sleeping) return { state: next, message: 'Já está acordado.' };
      next.sleeping = false;
      next.energy = clamp(next.energy + 15);
      message = 'Acordou! Bom dia.';
      break;
  }

  const before = next.stageId;
  next = maybeEvolve(next);
  if (next.stageId !== before) {
    const st = stageMeta(next.stageId);
    message = `Evoluiu para ${st.label}! ${displayEmoji(next)}`;
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
  const next = STAGES[idx + 1];
  return {
    ...next,
    need: Math.max(0, next.minCare - s.careScore),
    progress: Math.min(100, Math.round((s.careScore / next.minCare) * 100)),
  };
}
