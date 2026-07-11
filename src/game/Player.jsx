import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createCharacterTexture, createLabelTexture } from './sprites';
import { useGameStore } from './store';
import { INTERIORS, PLAYER_MAX_HP, WORLD } from './data';
import { getLookBasis } from './lookState';
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
  const broadcastState = useGameStore((s) => s.broadcastState);
  const roomCode = useGameStore((s) => s.roomCode);
  const interiorId = useGameStore((s) => s.interiorId);
  const netTick = useRef(0);
  const saveTick = useRef(0);
  const interiorSnap = useRef(null);

  const tex = useMemo(
    () => createCharacterTexture(player.avatar, '#6EC6FF'),
    [player.avatar]
  );
  const label = useMemo(() => {
    const hpBit = player.hp < PLAYER_MAX_HP ? ` ❤️${Math.ceil(player.hp)}` : '';
    return createLabelTexture(`${player.name} (You)${hpBit}`);
  }, [player.name, player.hp]);

  // Snap mesh when entering/exiting interiors or respawning
  useEffect(() => {
    if (!group.current) return;
    group.current.position.x = player.x || 0;
    group.current.position.z = player.z || 0;
    if (cameraTarget?.current) {
      cameraTarget.current.set(player.x || 0, 0.5, player.z || 0);
    }
  }, [interiorId, player.hp <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (interiorSnap.current !== interiorId) {
      interiorSnap.current = interiorId;
      if (group.current) {
        group.current.position.x = player.x || 0;
        group.current.position.z = player.z || 0;
      }
    }
  }, [interiorId, player.x, player.z]);

  const keys = useRef({});

  useEffect(() => {
    const isTyping = (e) => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const down = (e) => {
      if (isTyping(e)) return;
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e) => {
      if (isTyping(e)) return;
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

    // Dead — can't move
    if (player.hp <= 0) {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, -0.15, 0.1);
      group.current.scale.setScalar(0.85);
      return;
    }

    const k = keys.current;
    let ix = moveInput.x;
    let iz = moveInput.z;

    if (k.w || k.arrowup) iz -= 1;
    if (k.s || k.arrowdown) iz += 1;
    if (k.a || k.arrowleft) ix -= 1;
    if (k.d || k.arrowright) ix += 1;

    const room = interiorId ? INTERIORS[interiorId] : null;
    const halfW = room ? room.w / 2 - 0.9 : BOUND;
    const halfD = room ? room.d / 2 - 0.9 : BOUND;

    const len = Math.hypot(ix, iz);
    let moving = false;
    if (len > 0.05) {
      ix /= len;
      iz /= len;
      moving = true;
      const { forwardX, forwardZ, rightX, rightZ } = getLookBasis();
      const forwardInput = -iz;
      const rightInput = ix;
      const wx = rightInput * rightX + forwardInput * forwardX;
      const wz = rightInput * rightZ + forwardInput * forwardZ;
      const nx = THREE.MathUtils.clamp(
        group.current.position.x + wx * SPEED * dt,
        room ? -halfW : -BOUND,
        room ? halfW : BOUND
      );
      const nz = THREE.MathUtils.clamp(
        group.current.position.z + wz * SPEED * dt,
        room ? -halfD : -BOUND,
        room ? halfD : BOUND
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

      // Auto-exit when stepping on door mat
      if (room && nz > room.exitZ - 0.35 && Math.abs(nx) < 1.4) {
        useGameStore.getState().exitInterior();
      }
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.2);
      footTimer.current = 0;
    }

    if (cameraTarget?.current) {
      cameraTarget.current.set(
        group.current.position.x,
        0.5,
        group.current.position.z
      );
    }

    posSync.current += dt;
    if (posSync.current > 0.1) {
      posSync.current = 0;
      const px = group.current.position.x;
      const pz = group.current.position.z;
      setPlayerPos(px, pz);
      updateNearby(px, pz);
      // Auto-pick flowers/mushrooms when you walk over them
      const st = useGameStore.getState();
      if (st.nearby?.type === 'pickup' && st.nearby.id) {
        st.collectPickup(st.nearby.id);
      }
    }

    saveTick.current = (saveTick.current || 0) + dt;
    if (saveTick.current > 8) {
      saveTick.current = 0;
      useGameStore.getState().save();
    }

    if (roomCode && !interiorId) {
      netTick.current += dt;
      const interval = moving ? 0.12 : 0.45;
      if (netTick.current >= interval) {
        netTick.current = 0;
        const px = group.current.position.x;
        const pz = group.current.position.z;
        setPlayerPos(px, pz);
        broadcastState({ x: px, z: pz });
      }
    }

    const sc = moving ? 1 + Math.sin(bob.current) * 0.04 : 1;
    group.current.scale.setScalar(sc);
  });

  const hurt = player.hp < PLAYER_MAX_HP * 0.35;

  return (
    <group ref={group} position={[player.x || 0, 0, player.z || 0]}>
      <Billboard position={[0, 1.2, 0]} follow>
        <sprite scale={[1.9, 1.9, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            depthWrite={false}
            color={hurt ? '#ff8888' : '#ffffff'}
            opacity={player.hp <= 0 ? 0.45 : 1}
          />
        </sprite>
      </Billboard>
      <Billboard position={[0, 2.55, 0]}>
        <sprite scale={[2.8, 0.65, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.5, 20]} />
        <meshStandardMaterial
          color={player.hp <= 0 ? '#555555' : '#4fc3f7'}
          transparent
          opacity={0.5}
        />
      </mesh>
      <pointLight position={[0, 1.5, 0]} intensity={0.35} distance={5} color="#a8e6ff" />
    </group>
  );
}
