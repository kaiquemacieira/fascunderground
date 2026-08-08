/** Service worker + install prompt */

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener('load', async () => {
    try {
      // limpa SW antigos problemáticos (v1/v2) uma vez
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        // atualiza para o novo script
        await reg.update();
      }

      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('SKIP_WAITING');
          }
        });
      });
    } catch (err) {
      console.warn('[CRICRI PWA] SW register failed', err);
    }
  });
}

/** Apaga caches e desregistra SW — recuperação de tela preta */
export async function repairPwa(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* */
  }
  window.location.href = '/?pwa_repair=1';
}

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
