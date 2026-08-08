/**
 * MEOW — camada íntima + progressão de game
 * Tabela: inbox_anon (mesmo backend do vanilla)
 */

import { supabase } from './supabase';
import { eventIsOver } from './tamagotchi';
import { loadState, saveState, tickState } from './tamagotchi';
import { playSfx } from './sfx';

const MEOW_GAME_KEY = 'cricri-meow-game-v1';
const EVENT_END_ISO = '2026-11-23T12:00:00-03:00';

export interface MeowMessage {
  id: string;
  body: string;
  is_anonymous: boolean;
  answer: string | null;
  answered_at: string | null;
  is_hidden: boolean;
  created_at: string;
  from_profile_id: string | null;
  reaction: string | null;
  is_public: boolean;
}

export interface MeowGameProgress {
  xp: number;
  level: number;
  sent: number;
  received: number;
  answered: number;
  streak: number;
  lastActionDay: string | null;
  badges: string[];
}

const LEVELS = [
  { level: 1, xp: 0, title: 'Orelha Curiosa', emoji: '👂' },
  { level: 2, xp: 30, title: 'Sussurro da Praça', emoji: '🌙' },
  { level: 3, xp: 80, title: 'Caixinha Aberta', emoji: '📦' },
  { level: 4, xp: 160, title: 'Mensageiro Cabrunco', emoji: '🐾' },
  { level: 5, xp: 280, title: 'Ouvido da Roda', emoji: '🔮' },
  { level: 6, xp: 450, title: 'Guardião Meow', emoji: '👑' },
];

export function meowLevelMeta(level: number) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

export function xpToNext(progress: MeowGameProgress) {
  const cur = LEVELS.find((l) => l.level === progress.level) || LEVELS[0];
  const next = LEVELS.find((l) => l.level === progress.level + 1);
  if (!next) return { current: progress.xp, need: cur.xp, pct: 100 };
  const span = next.xp - cur.xp;
  const into = progress.xp - cur.xp;
  return {
    current: progress.xp,
    need: next.xp,
    pct: Math.min(100, Math.round((into / span) * 100)),
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultMeowProgress(): MeowGameProgress {
  return {
    xp: 0,
    level: 1,
    sent: 0,
    received: 0,
    answered: 0,
    streak: 0,
    lastActionDay: null,
    badges: [],
  };
}

export function loadMeowProgress(): MeowGameProgress {
  try {
    const raw = localStorage.getItem(MEOW_GAME_KEY);
    if (!raw) return defaultMeowProgress();
    return { ...defaultMeowProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultMeowProgress();
  }
}

export function saveMeowProgress(p: MeowGameProgress) {
  try {
    localStorage.setItem(MEOW_GAME_KEY, JSON.stringify(p));
  } catch {
    /* */
  }
}

function recomputeLevel(xp: number) {
  let level = 1;
  for (const L of LEVELS) {
    if (xp >= L.xp) level = L.level;
  }
  return level;
}

function addBadge(p: MeowGameProgress, id: string) {
  if (!p.badges.includes(id)) p.badges = [...p.badges, id];
}

/** Ganha XP e pode level-up; retorna se subiu de nível */
export function grantMeowXp(
  amount: number,
  kind: 'send' | 'receive' | 'answer'
): { progress: MeowGameProgress; leveledUp: boolean } {
  const p = loadMeowProgress();
  const prevLevel = p.level;
  p.xp += amount;

  if (kind === 'send') p.sent += 1;
  if (kind === 'receive') p.received += 1;
  if (kind === 'answer') p.answered += 1;

  const day = todayKey();
  if (p.lastActionDay !== day) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    p.streak = p.lastActionDay === yKey ? p.streak + 1 : 1;
    p.lastActionDay = day;
  }

  if (p.sent >= 1) addBadge(p, 'first_send');
  if (p.answered >= 1) addBadge(p, 'first_answer');
  if (p.sent >= 10) addBadge(p, 'messenger_10');
  if (p.streak >= 3) addBadge(p, 'streak_3');
  if (p.streak >= 7) addBadge(p, 'streak_7');

  p.level = recomputeLevel(p.xp);
  saveMeowProgress(p);

  const leveledUp = p.level > prevLevel;
  if (leveledUp) playSfx('levelUp');

  // Bônus no Cri: Meow alimenta o cabrunco
  try {
    let tama = tickState(loadState());
    if (tama.started && tama.alive) {
      tama = {
        ...tama,
        happy: Math.min(100, tama.happy + (kind === 'answer' ? 6 : 3)),
        careScore: tama.careScore + (kind === 'answer' ? 2 : 1),
      };
      saveState(tama);
    }
  } catch {
    /* */
  }

  return { progress: p, leveledUp };
}

export async function sendMeow(
  toProfileId: string,
  body: string,
  isAnonymous: boolean,
  fromUserId: string
) {
  if (eventIsOver()) throw new Error('O festival acabou — a caixinha Meow fechou.');
  if (!toProfileId) throw new Error('Perfil inválido.');
  if (fromUserId === toProfileId) throw new Error('Não dá pra mandar Meow pra si mesmo.');
  const text = body.trim().slice(0, 280);
  if (!text) throw new Error('Escreva alguma coisa.');

  const payload = {
    to_profile_id: toProfileId,
    body: text,
    is_anonymous: isAnonymous !== false,
    from_profile_id: isAnonymous === false ? fromUserId : null,
  };

  const { data, error } = await supabase.from('inbox_anon').insert(payload).select('id').single();
  if (error) throw new Error(error.message);

  playSfx('meowSend');
  grantMeowXp(12, 'send');
  try {
    const { notifyMeowSent } = await import('./notifications');
    notifyMeowSent();
  } catch {
    /* */
  }
  return data;
}

export async function loadMyMeowInbox(userId: string): Promise<MeowMessage[]> {

  if (eventIsOver()) return [];

  const { data, error } = await supabase
    .from('inbox_anon')
    .select(
      'id,body,is_anonymous,answer,answered_at,is_hidden,created_at,from_profile_id,reaction,is_public'
    )
    .eq('to_profile_id', userId)
    .eq('is_hidden', false)
    .lt('created_at', EVENT_END_ISO)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[meow]', error.message);
    return [];
  }
  return (data || []) as MeowMessage[];
}

export async function answerMeow(id: string, answer: string) {
  const text = answer.trim().slice(0, 500);
  if (!text) throw new Error('Escreva uma resposta.');
  const { error } = await supabase
    .from('inbox_anon')
    .update({ answer: text, answered_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  playSfx('success');
  grantMeowXp(18, 'answer');
}

export async function reactMeow(id: string, emoji: string) {
  const allowed = ['🔥', '💛', '🥹'];
  if (!allowed.includes(emoji)) throw new Error('Reação inválida');
  const { error } = await supabase.from('inbox_anon').update({ reaction: emoji }).eq('id', id);
  if (error) throw error;
  playSfx('click');
}

export async function hideMeow(id: string) {
  const { error } = await supabase.from('inbox_anon').update({ is_hidden: true }).eq('id', id);
  if (error) throw error;
}

export async function makeMeowPublic(id: string) {
  const { error } = await supabase.from('inbox_anon').update({ is_public: true }).eq('id', id);
  if (error) throw error;
  playSfx('success');
}

export const MEOW_BADGES: Record<string, { label: string; emoji: string }> = {
  first_send: { label: 'Primeiro sussurro', emoji: '✨' },
  first_answer: { label: 'Respondeu na roda', emoji: '💬' },
  messenger_10: { label: '10 Meows enviados', emoji: '📬' },
  streak_3: { label: 'Streak 3 dias', emoji: '🔥' },
  streak_7: { label: 'Streak 7 dias', emoji: '⚡' },
};
