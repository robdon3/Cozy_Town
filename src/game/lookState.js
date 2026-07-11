/**
 * Shared camera-look state (module-level to avoid React re-render thrash).
 * yaw: radians around Y (0 = camera south of player looking north-ish)
 * pitch: elevation angle
 */
export const lookState = {
  yaw: Math.PI * 0.25,
  pitch: 0.62,
  distance: 16,
  /** set true while user is dragging look so UI can ignore */
  dragging: false,
  indoor: false,
};

const OUTDOOR = { pitch: 0.62, distance: 16, pitchMin: 0.22, pitchMax: 1.25 };
// Open indoor stage: high angle, roomy distance — look over low half-walls
const INDOOR = { pitch: 0.78, distance: 12, pitchMin: 0.4, pitchMax: 1.2 };

export function getLookBasis() {
  const yaw = lookState.yaw;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  return { forwardX, forwardZ, rightX, rightZ, yaw };
}

export function applyLookDelta(dx, dy, sensitivity = 0.005) {
  lookState.yaw -= dx * sensitivity;
  const cfg = lookState.indoor ? INDOOR : OUTDOOR;
  lookState.pitch = Math.min(
    cfg.pitchMax,
    Math.max(cfg.pitchMin, lookState.pitch + dy * sensitivity)
  );
}

/** Pokémon-style indoor cam: tighter, higher angle, stays in the box */
export function setIndoorCamera(enabled) {
  lookState.indoor = Boolean(enabled);
  const cfg = lookState.indoor ? INDOOR : OUTDOOR;
  lookState.distance = cfg.distance;
  lookState.pitch = cfg.pitch;
}
