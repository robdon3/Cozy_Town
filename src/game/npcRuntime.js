import { NPCS, WORLD } from './data';

/**
 * Live NPC positions (plumbers roam; others stay near home).
 * Module-level so the simulation can run at 60fps without React re-renders.
 */

const BOUND = WORLD.half - 3;

/** @type {Map<number, { x: number, z: number, homeX: number, homeZ: number, tx: number, tz: number, speed: number, wait: number, bob: number }>} */
const state = new Map();

function seed() {
  if (state.size) return;
  for (const n of NPCS) {
    const roam = n.role === 'plumber' ? (n.roamRadius ?? 10) : 0;
    state.set(n.id, {
      x: n.x,
      z: n.z,
      homeX: n.x,
      homeZ: n.z,
      tx: n.x,
      tz: n.z,
      speed: n.role === 'plumber' ? 1.6 + Math.random() * 0.9 : 0,
      wait: Math.random() * 2,
      bob: Math.random() * Math.PI * 2,
      roam,
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
    out.push({ id, x: s.x, z: s.z });
  }
  return out;
}

function pickTarget(s) {
  if (s.roam <= 0) {
    s.tx = s.homeX;
    s.tz = s.homeZ;
    return;
  }
  // Prefer wandering within radius of home; occasional longer patrol
  const longPatrol = Math.random() < 0.18;
  const r = longPatrol ? s.roam * (0.7 + Math.random() * 0.8) : s.roam * (0.25 + Math.random() * 0.75);
  const a = Math.random() * Math.PI * 2;
  let tx = s.homeX + Math.cos(a) * r;
  let tz = s.homeZ + Math.sin(a) * r;
  // Soft avoid deep water area near dock
  if (tx < -22 && tz > 24) {
    tx = -18;
    tz = 20;
  }
  s.tx = Math.max(-BOUND, Math.min(BOUND, tx));
  s.tz = Math.max(-BOUND, Math.min(BOUND, tz));
}

/**
 * Advance all roaming NPCs. Call once per frame from R3F.
 */
export function tickNpcs(dt) {
  seed();
  const step = Math.min(dt, 0.05);

  for (const s of state.values()) {
    if (s.roam <= 0 || s.speed <= 0) {
      s.bob += step * 2;
      continue;
    }

    if (s.wait > 0) {
      s.wait -= step;
      s.bob += step * 2.2;
      continue;
    }

    const dx = s.tx - s.x;
    const dz = s.tz - s.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.35) {
      // Pause at waypoint, then pick a new one
      s.wait = 1.2 + Math.random() * 3.5;
      s.x = s.tx;
      s.z = s.tz;
      pickTarget(s);
      continue;
    }

    const move = s.speed * step;
    s.x += (dx / dist) * move;
    s.z += (dz / dist) * move;
    s.bob += step * 10; // walk bob
  }
}

export function getNpcBob(id) {
  seed();
  return state.get(id)?.bob ?? 0;
}

export function isNpcWalking(id) {
  seed();
  const s = state.get(id);
  if (!s || s.roam <= 0) return false;
  if (s.wait > 0) return false;
  return Math.hypot(s.tx - s.x, s.tz - s.z) > 0.4;
}

/** Optional: give each plumber a custom roam radius from data */
export function initFromData() {
  state.clear();
  seed();
  for (const n of NPCS) {
    const s = state.get(n.id);
    if (!s) continue;
    if (n.role === 'plumber') {
      s.roam = n.roamRadius ?? 11;
      s.speed = n.walkSpeed ?? 1.5 + (n.id % 5) * 0.15;
      pickTarget(s);
    }
  }
}
