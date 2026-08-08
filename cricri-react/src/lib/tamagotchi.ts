/**
 * Cri Cabrunco — núcleo do tamagotchi (compatível com localStorage do vanilla: cricri-tama-v3)
 * Versão enxuta para o app React; não porta genoma/híbridos/cards completos.
 */

export const TAMA_STORAGE = 'cricri-tama-v3';
const EVENT_END_MS = Date.UTC(2026, 10, 23, 15, 0, 0); // 23/11/2026 12:00 -03

export type StageId = 'ovo' | 'filhote' | 'cria' | 'jovem' | 'adulta' | 'ancia';

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
  speciesId: string | null;
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
    const parsed = JSON.parse(raw) as Partial<TamaState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveState(s: TamaState) {
  try {
    localStorage.setItem(TAMA_STORAGE, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

export function stageMeta(id: StageId) {
  return STAGES.find((x) => x.id === id) || STAGES[0];
}

export function shellColors(shell: TamaState['shell']) {
  return SHELL_COLORS[shell] || SHELL_COLORS.rosa;
}

/** Decaimento por tempo ausente */
export function tickState(s: TamaState, now = Date.now()): TamaState {
  if (!s.started || !s.alive) {
    return { ...s, lastTick: now };
  }

  const elapsed = Math.max(0, now - (s.lastTick || now));
  const hours = elapsed / (1000 * 60 * 60);
  if (hours < 0.01) return s;

  const next = { ...s };
  const sleepFactor = next.sleeping ? 0.35 : 1;
  const away = Math.min(hours, 48); // cap

  next.hunger = clamp(next.hunger - away * 4 * sleepFactor);
  next.energy = clamp(next.energy - away * (next.sleeping ? -2 : 3)); // dormindo recupera
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
  const idx = order.indexOf(s.stageId);
  if (idx < 0 || idx >= order.length - 1) return s;

  const nextStage = STAGES[idx + 1];
  if (s.careScore >= nextStage.minCare && s.alive) {
    return {
      ...s,
      stageId: nextStage.id,
      evolutions: s.evolutions + 1,
      happy: clamp(s.happy + 10),
    };
  }
  return s;
}

export function startPet(name: string, shell: TamaState['shell']): TamaState {
  const now = Date.now();
  const s: TamaState = {
    ...defaultState(),
    started: true,
    name: name.trim() || 'Cri',
    shell,
    bornAt: now,
    lastTick: now,
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

  switch (action) {
    case 'feed':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      next.hunger = clamp(next.hunger + 22);
      next.happy = clamp(next.happy + 4);
      next.feedCount += 1;
      next.careScore += 1;
      message = 'Pastel da feira! 🥟';
      break;
    case 'play':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      if (next.energy < 15) return { state: next, message: 'Sem energia pra brincar.' };
      next.happy = clamp(next.happy + 20);
      next.energy = clamp(next.energy - 12);
      next.hunger = clamp(next.hunger - 5);
      next.playCount += 1;
      next.careScore += 1;
      message = 'Cortejo na praça! 🎉';
      break;
    case 'clean':
      if (next.sleeping) return { state: next, message: 'Está dormindo. Acorde primeiro.' };
      next.hygiene = clamp(next.hygiene + 25);
      next.happy = clamp(next.happy + 3);
      next.cleanCount += 1;
      next.careScore += 1;
      message = 'Banho de caneco 🧼';
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
      message = 'Acordou! Bom dia, Cabrunco.';
      break;
  }

  next = maybeEvolve(next);
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
