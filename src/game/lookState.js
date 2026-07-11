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
};

export function getLookBasis() {
  const yaw = lookState.yaw;
  // camera sits behind player; forward on ground is away from camera offset
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  return { forwardX, forwardZ, rightX, rightZ, yaw };
}

export function applyLookDelta(dx, dy, sensitivity = 0.005) {
  lookState.yaw -= dx * sensitivity;
  lookState.pitch = Math.min(
    1.25,
    Math.max(0.22, lookState.pitch + dy * sensitivity)
  );
}
