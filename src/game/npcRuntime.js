import { NPCS, PIPE_LEAKS, WORLD } from './data';

/**
 * Live NPC positions (plumbers + Billy roam; others stay near home).
 * Module-level so the simulation can run at 60fps without React re-renders.
 */

const BOUND = WORLD.half - 3;

/**
 * @typedef {{
 *   x: number, z: number, homeX: number, homeZ: number,
 *   tx: number, tz: number, speed: number, wait: number, bob: number,
 *   roam: number, wheelchair?: boolean,
 *   job?: null | { type: 'leak', leakId: string, fixTimer: number }
 * }} NpcState
 */

/** @type {Map<number, NpcState>} */
const state = new Map();

/** Open leak IDs snapshot — set each frame from store */
let openLeaksSnap = [];

export function setOpenLeaksSnapshot(ids) {
  openLeaksSnap = ids || [];
}

function seed() {
  if (state.size) return;
  for (const n of NPCS) {
    const canRoam = n.role === 'plumber' || n.role === 'billy' || n.wheelchair;
    const roam = canRoam ? (n.roamRadius ?? 10) : 0;
    state.set(n.id, {
      x: n.x,
      z: n.z,
      homeX: n.x,
      homeZ: n.z,
      tx: n.x,
      tz: n.z,
      speed: canRoam ? n.walkSpeed ?? 1.6 + Math.random() * 0.9 : 0,
      wait: Math.random() * 2,
      bob: Math.random() * Math.PI * 2,
      roam,
      wheelchair: Boolean(n.wheelchair),
      job: null,
    });
  }
}

export function getNpcPos(id) {
  seed();
  const s = state.get(id);
  if (!s) {
    const n = NPCS.find((x) => x.id === id);
    return n ? { x: n.x, z: n.z } : { x: 0, z: 0 };
  }
  return { x: s.x, z: s.z };
}

export function getAllNpcPositions() {
  seed();
  const out = [];
  for (const [id, s] of state) {
    out.push({ id, x: s.x, z: s.z, wheelchair: s.wheelchair });
  }
  return out;
}

function pickTarget(s) {
  if (s.roam <= 0) {
    s.tx = s.homeX;
    s.tz = s.homeZ;
    return;
  }
  const longPatrol = Math.random() < 0.18;
  const r = longPatrol
    ? s.roam * (0.7 + Math.random() * 0.8)
    : s.roam * (0.25 + Math.random() * 0.75);
  const a = Math.random() * Math.PI * 2;
  let tx = s.homeX + Math.cos(a) * r;
  let tz = s.homeZ + Math.sin(a) * r;
  if (tx < -22 && tz > 24) {
    tx = -18;
    tz = 20;
  }
  s.tx = Math.max(-BOUND, Math.min(BOUND, tx));
  s.tz = Math.max(-BOUND, Math.min(BOUND, tz));
}

function nearestOpenLeak(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const id of openLeaksSnap) {
    const leak = PIPE_LEAKS.find((l) => l.id === id);
    if (!leak) continue;
    const d = Math.hypot(x - leak.x, z - leak.z);
    if (d < bestD) {
      bestD = d;
      best = leak;
    }
  }
  return best;
}

/** Leaks already claimed by an NPC job */
function claimedLeaks() {
  const set = new Set();
  for (const s of state.values()) {
    if (s.job?.type === 'leak') set.add(s.job.leakId);
  }
  return set;
}

/**
 * Advance all roaming NPCs. Call once per frame from R3F.
 * @param {number} dt
 * @param {{ onNpcFixLeak?: (leakId: string, npcId: number) => void }} [hooks]
 */
export function tickNpcs(dt, hooks = {}) {
  seed();
  const step = Math.min(dt, 0.05);
  const claimed = claimedLeaks();

  for (const [id, s] of state) {
    const npc = NPCS.find((n) => n.id === id);
    const isPlumber = npc?.role === 'plumber';

    // Plumbers: occasionally pick up a leak job
    if (isPlumber && !s.job && s.wait <= 0 && openLeaksSnap.length) {
      if (Math.random() < 0.012) {
        const free = openLeaksSnap.filter((lid) => !claimed.has(lid));
        if (free.length) {
          // prefer nearer leaks
          let best = null;
          let bestD = Infinity;
          for (const lid of free) {
            const leak = PIPE_LEAKS.find((l) => l.id === lid);
            if (!leak) continue;
            const d = Math.hypot(s.x - leak.x, s.z - leak.z);
            if (d < bestD) {
              bestD = d;
              best = leak;
            }
          }
          if (best) {
            s.job = { type: 'leak', leakId: best.id, fixTimer: 0 };
            s.tx = best.x;
            s.tz = best.z;
            s.wait = 0;
            claimed.add(best.id);
          }
        }
      }
    }

    // Job pathing: go to leak and fix
    if (s.job?.type === 'leak') {
      const leakStillOpen = openLeaksSnap.includes(s.job.leakId);
      if (!leakStillOpen) {
        s.job = null;
        s.wait = 0.8 + Math.random() * 1.5;
        pickTarget(s);
      } else {
        const leak = PIPE_LEAKS.find((l) => l.id === s.job.leakId);
        if (leak) {
          s.tx = leak.x;
          s.tz = leak.z;
          const dist = Math.hypot(leak.x - s.x, leak.z - s.z);
          if (dist < 1.2) {
            s.fixTimer = (s.job.fixTimer || 0) + step;
            s.job.fixTimer = s.fixTimer;
            s.bob += step * 8;
            if (s.job.fixTimer >= 2.4) {
              hooks.onNpcFixLeak?.(s.job.leakId, id);
              s.job = null;
              s.wait = 2 + Math.random() * 3;
              pickTarget(s);
            }
            continue;
          }
        }
      }
    }

    if (s.roam <= 0 || s.speed <= 0) {
      s.bob += step * 2;
      continue;
    }

    if (s.wait > 0 && !s.job) {
      s.wait -= step;
      s.bob += step * (s.wheelchair ? 1.4 : 2.2);
      continue;
    }

    const dx = s.tx - s.x;
    const dz = s.tz - s.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.35) {
      if (!s.job) {
        s.wait = s.wheelchair ? 1.8 + Math.random() * 3 : 1.2 + Math.random() * 3.5;
        s.x = s.tx;
        s.z = s.tz;
        pickTarget(s);
      }
      continue;
    }

    const move = s.speed * step;
    s.x += (dx / dist) * move;
    s.z += (dz / dist) * move;
    // wheelchair rolls smoother, less bob
    s.bob += step * (s.wheelchair ? 6 : 10);
  }

  void nearestOpenLeak;
}

export function getNpcBob(id) {
  seed();
  return state.get(id)?.bob ?? 0;
}

export function isNpcWalking(id) {
  seed();
  const s = state.get(id);
  if (!s || s.roam <= 0) return false;
  if (s.wait > 0 && !s.job) return false;
  if (s.job && Math.hypot(s.tx - s.x, s.tz - s.z) < 1.2) return false;
  return Math.hypot(s.tx - s.x, s.tz - s.z) > 0.4;
}

export function isNpcFixing(id) {
  seed();
  const s = state.get(id);
  if (!s?.job) return false;
  return Math.hypot(s.tx - s.x, s.tz - s.z) < 1.2;
}

export function initFromData() {
  state.clear();
  seed();
  for (const n of NPCS) {
    const s = state.get(n.id);
    if (!s) continue;
    const canRoam = n.role === 'plumber' || n.role === 'billy' || n.wheelchair;
    if (canRoam) {
      s.roam = n.roamRadius ?? 11;
      s.speed = n.walkSpeed ?? 1.5 + (n.id % 5) * 0.15;
      s.wheelchair = Boolean(n.wheelchair);
      pickTarget(s);
    }
  }
}
