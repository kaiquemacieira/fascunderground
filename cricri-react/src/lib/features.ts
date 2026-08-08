/**
 * Feature flags do CRICRI React
 * Meow OFF no app online (código permanece, não apagado)
 */
export const FEATURES = {
  /** MEOW — desligado no deploy; UI escondida */
  meow: false,
  /** Cri Cabrunco (tamagotchi) */
  tamagotchi: true,
  /** SFX Web Audio */
  sfx: true,
} as const;
