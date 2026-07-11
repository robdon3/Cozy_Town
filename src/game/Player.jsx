import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createCharacterTexture, createLabelTexture } from './sprites';
import { useGameStore } from './store';
import { WORLD } from './data';
import { sfx } from '../audio/sounds';

const SPEED = 8;
const BOUND = WORLD.half - 2;

export default function Player({ cameraTarget }) {
  const group = useRef();
  const bob = useRef(0);
  const footTimer = useRef(0);
  const posSync = useRef(0);

  const player = useGameStore((s) => s.player);
  const moveInput = useGameStore((s) => s.moveInput);
  const setPlayerPos = useGameStore((s) => s.setPlayerPos);
  const updateNearby = useGameStore((s) => s.updateNearby);

  const tex = useMemo(
    () => createCharacterTexture(player.avatar, '#6EC6FF'),
    [player.avatar]
  );
  const label = useMemo(
    () => createLabelTexture(`${player.name} (You)`),
    [player.name]
  );

  // keys
  const keys = useRef({});

  useEffect(() => {
    const down = (e) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!group.current) return;
    const k = keys.current;
    let ix = moveInput.x;
    let iz = moveInput.z;

    if (k.w || k.arrowup) iz -= 1;
    if (k.s || k.arrowdown) iz += 1;
    if (k.a || k.arrowleft) ix -= 1;
    if (k.d || k.arrowright) ix += 1;

    const len = Math.hypot(ix, iz);
    let moving = false;
    if (len > 0.05) {
      ix /= len;
      iz /= len;
      moving = true;
      const nx = THREE.MathUtils.clamp(
        group.current.position.x + ix * SPEED * dt,
        -BOUND,
        BOUND
      );
      const nz = THREE.MathUtils.clamp(
        group.current.position.z + iz * SPEED * dt,
        -BOUND,
        BOUND
      );
      group.current.position.x = nx;
      group.current.position.z = nz;

      bob.current += dt * 12;
      group.current.position.y = Math.abs(Math.sin(bob.current)) * 0.12;

      footTimer.current += dt;
      if (footTimer.current > 0.28) {
        footTimer.current = 0;
        sfx.footstep();
      }
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.2);
      footTimer.current = 0;
    }

    // camera target follows player
    if (cameraTarget?.current) {
      cameraTarget.current.set(
        group.current.position.x,
        0.5,
        group.current.position.z
      );
    }

    // update store ~10x/sec to avoid React thrash
    posSync.current += dt;
    if (posSync.current > 0.1) {
      posSync.current = 0;
      setPlayerPos(group.current.position.x, group.current.position.z);
      updateNearby(group.current.position.x, group.current.position.z);
    }

    // face-ish scale pulse when moving
    const sc = moving ? 1 + Math.sin(bob.current) * 0.04 : 1;
    group.current.scale.setScalar(sc);
  });

  return (
    <group ref={group} position={[player.x || 0, 0, player.z || 0]}>
      <Billboard position={[0, 1.2, 0]} follow>
        <sprite scale={[1.9, 1.9, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <Billboard position={[0, 2.55, 0]}>
        <sprite scale={[2.6, 0.65, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.5, 20]} />
        <meshStandardMaterial color="#4fc3f7" transparent opacity={0.5} />
      </mesh>
      {/* interact ring when nearby handled in HUD; soft glow under player */}
      <pointLight position={[0, 1.5, 0]} intensity={0.35} distance={5} color="#a8e6ff" />
    </group>
  );
}
