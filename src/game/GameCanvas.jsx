import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import World from './World';
import Player from './Player';
import RemotePlayers from './RemotePlayers';
import Projectiles, { ExplosionFX } from './Projectiles';
import { useGameStore } from './store';
import { applyLookDelta, lookState } from './lookState';

const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

function FollowCamera({ target }) {
  const { camera, gl } = useThree();
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const lookInput = useGameStore((s) => s.lookInput);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 200;
    camera.fov = 45;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Pointer look on canvas: right-button or two-finger / primary drag when holding Alt / middle
  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e) => {
      // right mouse, middle mouse, or secondary touch — look
      if (e.button === 2 || e.button === 1 || e.pointerType === 'pen') {
        dragging.current = true;
        lookState.dragging = true;
        last.current = { x: e.clientX, y: e.clientY };
        el.setPointerCapture?.(e.pointerId);
      }
    };
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      applyLookDelta(dx, dy, 0.0055);
    };
    const onUp = () => {
      dragging.current = false;
      lookState.dragging = false;
    };
    // Left-drag on upper half for look on mobile/desktop without right button
    const onLeftDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest?.('.hud')) return;
      const rect = el.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / rect.height;
      // top 55% of game view starts look (bottom reserved for joystick feel)
      if (relY < 0.55) {
        dragging.current = true;
        lookState.dragging = true;
        last.current = { x: e.clientX, y: e.clientY };
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerdown', onLeftDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerdown', onLeftDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [gl]);

  // Keyboard look Q/E + pitch with =/-
  useEffect(() => {
    const keys = {};
    let raf = 0;
    let alive = true;
    const isTyping = (e) => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const down = (e) => {
      if (isTyping(e)) return;
      keys[e.key.toLowerCase()] = true;
    };
    const up = (e) => {
      keys[e.key.toLowerCase()] = false;
    };
    const tick = () => {
      if (!alive) return;
      const speed = 0.035;
      if (keys.q) lookState.yaw += speed;
      if (keys.e) lookState.yaw -= speed;
      if (keys['='] || keys['+']) lookState.pitch = Math.min(1.25, lookState.pitch + speed * 0.7);
      if (keys['-'] || keys['_']) lookState.pitch = Math.max(0.22, lookState.pitch - speed * 0.7);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!target.current) return;

    // look stick / virtual look
    if (lookInput.x || lookInput.y) {
      applyLookDelta(lookInput.x * 420 * dt, lookInput.y * 420 * dt, 0.01);
    }

    // Indoors uses an open stage + low half-walls; camera stays high so you can see
    const indoor = lookState.indoor;
    const { yaw, pitch, distance } = lookState;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    _desired.set(
      target.current.x + Math.sin(yaw) * distance * cp,
      target.current.y + distance * sp,
      target.current.z + Math.cos(yaw) * distance * cp
    );
    camera.position.lerp(_desired, 1 - Math.pow(0.0008, dt));
    _lookAt.set(target.current.x, target.current.y + 0.8, target.current.z);
    camera.lookAt(_lookAt);
    camera.near = 0.1;
    camera.far = indoor ? 80 : 200;
  });

  return null;
}

function InteractKey() {
  const interact = useGameStore((s) => s.interact);
  const tryFire = useGameStore((s) => s.tryFire);
  const setEquippedWeapon = useGameStore((s) => s.setEquippedWeapon);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.code === 'Space' || e.key === 'e' || e.key === 'E') {
        // E is also look-right — Space/interact preferred; E only if not used... 
        // Keep Space + Enter for interact; F fire; G grenade equip; 1/2 weapons
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          interact();
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        tryFire();
      }
      if (e.key === '1') setEquippedWeapon('gun');
      if (e.key === '2') setEquippedWeapon('grenade');
      if (e.key === 'g' || e.key === 'G') setEquippedWeapon('grenade');
      if (e.key === 'b' || e.key === 'B') setEquippedWeapon('gun');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interact, tryFire, setEquippedWeapon]);
  return null;
}

function OutdoorSky() {
  const interiorId = useGameStore((s) => s.interiorId);
  if (interiorId) return null;
  return <Sky sunPosition={[80, 40, 30]} turbidity={6} rayleigh={1.2} />;
}

export default function GameCanvas() {
  const cameraTarget = useRef(new THREE.Vector3(0, 0.5, 0));

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [12, 14, 12], fov: 45, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <OutdoorSky />
        <FollowCamera target={cameraTarget} />
        <InteractKey />
        <World />
        <Player cameraTarget={cameraTarget} />
        <RemotePlayers />
        <Projectiles />
        <ExplosionFX />
      </Suspense>
    </Canvas>
  );
}
