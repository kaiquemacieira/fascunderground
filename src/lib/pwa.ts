/** Registra service worker (PWA) */
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // evita SW bagunçando HMR no dev

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[CRICRI PWA] SW register failed', err);
    });
  });
}

/** Captura beforeinstallprompt para botão “Instalar app” */
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(can: boolean) => void>();

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => fn(false));
  });
}

export function canInstall() {
  return !!deferred;
}

export function onInstallAvailable(fn: (can: boolean) => void) {
  listeners.add(fn);
  fn(!!deferred);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}
