import { GAME_VERSION } from './version';

const SAVE_PREFIXES = ['cozy-town', 'Cozy_Town', 'cozyTown'];

/**
 * Wipe local saves (all known keys), kill stale service workers / caches
 * from older builds, then hard-reload the latest HTML/JS.
 */
export async function hardResetWorldAndReload({ keepRoom = false } = {}) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      if (SAVE_PREFIXES.some((p) => k.startsWith(p) || k.includes(p))) {
        localStorage.removeItem(k);
      }
    }
    // explicit known keys
    localStorage.removeItem('cozy-town-v2');
    localStorage.removeItem('cozy-town-v3');
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  if (!keepRoom) {
    url.searchParams.delete('room');
    url.searchParams.delete('r');
  }
  // cache-bust so GitHub Pages / browsers fetch fresh index.html
  url.searchParams.set('v', GAME_VERSION);
  url.searchParams.set('_', String(Date.now()));
  window.location.replace(url.toString());
}

/** Soft in-memory reset without reload (used from settings mid-game). */
export function clearAllCozySaves() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      if (SAVE_PREFIXES.some((p) => k.startsWith(p) || k.includes(p))) {
        localStorage.removeItem(k);
      }
    }
    localStorage.removeItem('cozy-town-v2');
    localStorage.removeItem('cozy-town-v3');
  } catch {
    /* ignore */
  }
}
