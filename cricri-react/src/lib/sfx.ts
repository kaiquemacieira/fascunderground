/**
 * CRICRI · SFX via Web Audio (sem arquivos MP3 — leve)
 * Mute: localStorage cricri_sfx_mute_v1
 */

const MUTE_KEY = 'cricri_sfx_mute_v1';

let ctx: AudioContext | null = null;
let unlocked = false;

function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function getSfxMuted() {
  return isMuted();
}

export function setSfxMuted(on: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, on ? '1' : '0');
  } catch {
    /* */
  }
}

function ensure(): AudioContext | null {
  if (isMuted()) return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  unlocked = true;
  return ctx;
}

/** Chamar no primeiro toque do usuário */
export function unlockSfx() {
  ensure();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
  slideTo?: number
) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, gain = 0.04) {
  const c = ensure();
  if (!c) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 800;
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start();
}

export type SfxName =
  | 'click'
  | 'like'
  | 'post'
  | 'meow'
  | 'meowSend'
  | 'meowOpen'
  | 'levelUp'
  | 'feed'
  | 'play'
  | 'clean'
  | 'sleep'
  | 'evolve'
  | 'error'
  | 'success'
  | 'install';

export function playSfx(name: SfxName) {
  if (isMuted()) return;
  switch (name) {
    case 'click':
      tone(420, 0.06, 'triangle', 0.04);
      break;
    case 'like':
      tone(520, 0.08, 'sine', 0.06);
      tone(780, 0.1, 'sine', 0.04);
      break;
    case 'post':
      tone(300, 0.1, 'square', 0.04);
      tone(450, 0.12, 'sine', 0.05);
      break;
    case 'meow':
      tone(380, 0.12, 'sine', 0.07, 520);
      setTimeout(() => tone(520, 0.1, 'sine', 0.05, 340), 80);
      break;
    case 'meowSend':
      tone(440, 0.08, 'triangle', 0.06);
      tone(660, 0.14, 'sine', 0.05);
      noiseBurst(0.05, 0.02);
      break;
    case 'meowOpen':
      tone(280, 0.1, 'sine', 0.05, 400);
      break;
    case 'levelUp':
      tone(392, 0.1, 'sine', 0.07);
      setTimeout(() => tone(523, 0.1, 'sine', 0.07), 90);
      setTimeout(() => tone(659, 0.16, 'sine', 0.08), 180);
      break;
    case 'feed':
      tone(200, 0.08, 'square', 0.03);
      tone(280, 0.1, 'triangle', 0.05);
      break;
    case 'play':
      tone(500, 0.06, 'sine', 0.05);
      tone(700, 0.08, 'sine', 0.04);
      break;
    case 'clean':
      noiseBurst(0.08, 0.03);
      tone(900, 0.1, 'sine', 0.03);
      break;
    case 'sleep':
      tone(220, 0.2, 'sine', 0.04, 140);
      break;
    case 'evolve':
      tone(330, 0.12, 'sine', 0.06);
      setTimeout(() => tone(440, 0.12, 'sine', 0.06), 100);
      setTimeout(() => tone(554, 0.2, 'sine', 0.07), 220);
      break;
    case 'error':
      tone(180, 0.15, 'sawtooth', 0.04);
      break;
    case 'success':
      tone(523, 0.1, 'sine', 0.06);
      tone(659, 0.14, 'sine', 0.05);
      break;
    case 'install':
      tone(400, 0.1, 'triangle', 0.05);
      setTimeout(() => tone(600, 0.15, 'sine', 0.06), 100);
      break;
    default:
      tone(400, 0.06, 'sine', 0.04);
  }
}

/** Garante unlock em qualquer gesto global (uma vez) */
export function bindSfxUnlock() {
  if (unlocked) return;
  const once = () => {
    unlockSfx();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
  };
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('keydown', once);
}
