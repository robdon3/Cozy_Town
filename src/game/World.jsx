import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BUILDINGS, NPCS, PIPE_LEAKS, WORLD } from './data';
import {
  getNpcBob,
  getNpcPos,
  initFromData,
  isNpcFixing,
  isNpcWalking,
  setOpenLeaksSnapshot,
  tickNpcs,
} from './npcRuntime';
import { createCharacterTexture, createEmojiTexture, createLabelTexture } from './sprites';
import { useGameStore } from './store';
import Interior from './Interior';

function Ground() {
  const grass = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a9c6d';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = Math.random() > 0.5 ? '#3d8a5c' : '#5aad7a';
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[WORLD.size, WORLD.size]} />
      <meshStandardMaterial map={grass} roughness={0.95} />
    </mesh>
  );
}

function Path() {
  return (
    <group>
      {/* main cross roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[4, WORLD.size * 0.7]} />
        <meshStandardMaterial color="#c4a882" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[WORLD.size * 0.7, 4]} />
        <meshStandardMaterial color="#c4a882" roughness={1} />
      </mesh>
    </group>
  );
}

function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-28, 0.01, 28]} receiveShadow>
      <planeGeometry args={[18, 14]} />
      <meshStandardMaterial color="#3a8fc4" transparent opacity={0.85} roughness={0.2} metalness={0.1} />
    </mesh>
  );
}

function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 1.2, 6]} />
        <meshStandardMaterial color="#6B4226" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[1.1, 2.2, 7]} />
        <meshStandardMaterial color="#2d7a45" />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[0.75, 1.4, 7]} />
        <meshStandardMaterial color="#3a9b55" />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1 }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#8a8a96" roughness={0.9} />
    </mesh>
  );
}

function Building({ data }) {
  const labelTex = useMemo(
    () => createLabelTexture(`${data.emoji} ${data.name}`),
    [data.emoji, data.name]
  );
  const emojiTex = useMemo(() => createEmojiTexture(data.emoji), [data.emoji]);

  if (data.flat) {
    return (
      <group position={[data.x, 0, data.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
          <planeGeometry args={[data.w, data.d]} />
          <meshStandardMaterial color={data.color} roughness={0.9} />
        </mesh>
        <Billboard position={[0, 2.2, 0]}>
          <sprite scale={[3.2, 0.8, 1]}>
            <spriteMaterial map={labelTex} transparent depthWrite={false} />
          </sprite>
        </Billboard>
        <Billboard position={[0, 1.2, 0]}>
          <sprite scale={[1.4, 1.4, 1]}>
            <spriteMaterial map={emojiTex} transparent depthWrite={false} />
          </sprite>
        </Billboard>
        {data.id === 'forest' &&
          [
            [-3, 0, -2],
            [2, 0, 1],
            [-1, 0, 3],
            [3, 0, -3],
            [0, 0, 0],
          ].map((p, i) => <Tree key={i} position={p} />)}
        {data.id === 'park' &&
          [
            [-4, 0, -2],
            [4, 0, 2],
            [-2, 0, 3],
            [3, 0, -3],
          ].map((p, i) => <Tree key={i} position={p} />)}
      </group>
    );
  }

  return (
    <group position={[data.x, 0, data.z]}>
      <mesh position={[0, data.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[data.w, data.h, data.d]} />
        <meshStandardMaterial color={data.color} roughness={0.75} />
      </mesh>
      {/* roof */}
      <mesh position={[0, data.h + 0.6, 0]} castShadow>
        <coneGeometry args={[Math.max(data.w, data.d) * 0.72, 1.4, 4]} />
        <meshStandardMaterial color={data.roof} roughness={0.8} />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.9, data.d / 2 + 0.02]}>
        <boxGeometry args={[1.1, 1.8, 0.1]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* windows */}
      <mesh position={[-data.w * 0.28, data.h * 0.55, data.d / 2 + 0.02]}>
        <boxGeometry args={[0.9, 0.9, 0.08]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[data.w * 0.28, data.h * 0.55, data.d / 2 + 0.02]}>
        <boxGeometry args={[0.9, 0.9, 0.08]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.35} />
      </mesh>
      <Billboard position={[0, data.h + 2.2, 0]}>
        <sprite scale={[3.6, 0.9, 1]}>
          <spriteMaterial map={labelTex} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <Billboard position={[0, data.h * 0.55, data.d / 2 + 0.6]}>
        <sprite scale={[1.6, 1.6, 1]}>
          <spriteMaterial map={emojiTex} transparent depthWrite={false} />
        </sprite>
      </Billboard>
    </group>
  );
}

function NpcSprite({ npc }) {
  const group = useRef();
  const tex = useMemo(
    () => createCharacterTexture(npc.emoji, npc.color),
    [npc.emoji, npc.color]
  );
  const labelText = npc.wheelchair
    ? `♿ ${npc.name}`
    : npc.role === 'plumber'
      ? `🔧 ${npc.name}`
      : npc.name;
  const label = useMemo(() => createLabelTexture(labelText), [labelText]);
  const titleTex = useMemo(
    () => (npc.title ? createLabelTexture(npc.title, 'rgba(40,70,120,0.88)') : null),
    [npc.title]
  );
  const canRoam = npc.role === 'plumber' || npc.role === 'billy' || npc.wheelchair;
  const chairTex = useMemo(
    () => (npc.wheelchair ? createEmojiTexture('♿', 96) : null),
    [npc.wheelchair]
  );

  useFrame(() => {
    if (!group.current) return;
    const { x, z } = getNpcPos(npc.id);
    const bob = getNpcBob(npc.id);
    const walking = isNpcWalking(npc.id);
    const fixing = isNpcFixing(npc.id);
    // wheelchair: low smooth roll; standing: walk bob
    let y = 0;
    if (npc.wheelchair) {
      y = walking ? Math.abs(Math.sin(bob)) * 0.04 : 0;
    } else {
      y = walking ? Math.abs(Math.sin(bob)) * 0.14 : Math.sin(bob) * 0.03;
      if (fixing) y = Math.abs(Math.sin(bob * 1.5)) * 0.1;
    }
    group.current.position.set(x, y, z);
    const sc = walking ? 1 + Math.sin(bob) * 0.04 : 1;
    group.current.scale.setScalar(sc);
  });

  return (
    <group ref={group} position={[npc.x, 0, npc.z]}>
      {npc.wheelchair && (
        <>
          {/* chair frame */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.85, 0.12, 0.95]} />
            <meshStandardMaterial color="#3a6ea5" metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.7, -0.15]} castShadow>
            <boxGeometry args={[0.75, 0.7, 0.12]} />
            <meshStandardMaterial color="#2c5282" />
          </mesh>
          {/* wheels */}
          <mesh position={[-0.45, 0.28, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.1, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.45, 0.28, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.1, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {chairTex && (
            <Billboard position={[0.55, 0.9, 0]}>
              <sprite scale={[0.55, 0.55, 1]}>
                <spriteMaterial map={chairTex} transparent depthWrite={false} />
              </sprite>
            </Billboard>
          )}
        </>
      )}
      <Billboard position={[0, npc.wheelchair ? 1.35 : 1.15, 0]} follow lockX={false} lockZ={false}>
        <sprite scale={[1.8, 1.8, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <Billboard position={[0, npc.wheelchair ? 2.55 : 2.4, 0]}>
        <sprite scale={[canRoam ? 3.0 : 2.4, 0.6, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      {titleTex && (
        <Billboard position={[0, npc.wheelchair ? 3.1 : 2.95, 0]}>
          <sprite scale={[2.2, 0.5, 1]}>
            <spriteMaterial map={titleTex} transparent depthWrite={false} />
          </sprite>
        </Billboard>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshStandardMaterial color={npc.color} transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

/** Single frame tick for roaming NPCs + leak AI + respawns */
function NpcDirector() {
  useEffect(() => {
    initFromData();
  }, []);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    if (st.interiorId) return;
    setOpenLeaksSnapshot(st.openLeaks);
    st.tickLeaks();
    tickNpcs(dt, {
      onNpcFixLeak: (leakId) => {
        useGameStore.getState().sealLeak(leakId, { by: 'npc' });
      },
    });
  });

  return null;
}

function Decorations() {
  const trees = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 26;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // keep paths clear-ish
      if (Math.abs(x) < 3 || Math.abs(z) < 3) continue;
      // avoid water
      if (x < -20 && z > 18) continue;
      pts.push([x, 0, z]);
    }
    return pts;
  }, []);

  const rocks = useMemo(() => {
    return Array.from({ length: 18 }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 28;
      return {
        p: [Math.cos(a) * r, 0.25, Math.sin(a) * r],
        s: 0.5 + Math.random() * 0.8,
      };
    });
  }, []);

  const flowers = useMemo(() => {
    return Array.from({ length: 30 }, () => ({
      p: [(Math.random() - 0.5) * 50, 0.4, (Math.random() - 0.5) * 50],
      e: ['🌸', '🌺', '🌼', '🌻', '🍄'][Math.floor(Math.random() * 5)],
    }));
  }, []);

  return (
    <group>
      {trees.map((p, i) => (
        <Tree key={`t${i}`} position={p} />
      ))}
      {rocks.map((r, i) => (
        <Rock key={`r${i}`} position={r.p} scale={r.s} />
      ))}
      {flowers.map((f, i) => (
        <Flower key={`f${i}`} position={f.p} emoji={f.e} />
      ))}
    </group>
  );
}

function FenceRing() {
  const half = WORLD.half - 1;
  const posts = [];
  for (let i = -half; i <= half; i += 4) {
    posts.push([-half, 0.5, i], [half, 0.5, i], [i, 0.5, -half], [i, 0.5, half]);
  }
  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.25, 1, 0.25]} />
          <meshStandardMaterial color="#8B6914" />
        </mesh>
      ))}
    </group>
  );
}

function Fountain() {
  const sign = useMemo(() => createLabelTexture('🏡 Cozy Town'), []);
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.5, 0.5, 16]} />
        <meshStandardMaterial color="#b0b8c0" />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.25, 16]} />
        <meshStandardMaterial color="#4aa3d4" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 1.2, 8]} />
        <meshStandardMaterial color="#9aa3ad" />
      </mesh>
      <Billboard position={[0, 2.4, 0]}>
        <sprite scale={[3.2, 0.8, 1]}>
          <spriteMaterial map={sign} transparent depthWrite={false} />
        </sprite>
      </Billboard>
    </group>
  );
}

function PipeLeak({ leak }) {
  const openLeaks = useGameStore((s) => s.openLeaks);
  const open = openLeaks.includes(leak.id);
  const bob = useRef(0);
  const group = useRef();
  const dripTex = useMemo(
    () => createEmojiTexture(open ? leak.emoji : '✅'),
    [open, leak.emoji]
  );
  const label = useMemo(
    () =>
      createLabelTexture(open ? `${leak.emoji} ${leak.name}` : `${leak.name} (sealed)`),
    [open, leak.emoji, leak.name]
  );

  useFrame((_, dt) => {
    if (!group.current || !open) return;
    bob.current += dt * 4;
    group.current.position.y = 0.9 + Math.sin(bob.current) * 0.12;
  });

  return (
    <group position={[leak.x, 0, leak.z]}>
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 1.2, 8]} />
        <meshStandardMaterial
          color={open ? '#8a8a96' : '#6a8f6a'}
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>
      {open && (
        <mesh position={[0.5, 0.15, 0]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial
            color="#4aa3d4"
            transparent
            opacity={0.7}
            emissive="#3a90c4"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
      <group ref={group} position={[0, 0.9, 0]}>
        <Billboard>
          <sprite scale={[1.1, 1.1, 1]}>
            <spriteMaterial map={dripTex} transparent depthWrite={false} />
          </sprite>
        </Billboard>
      </group>
      <Billboard position={[0, 2.1, 0]}>
        <sprite scale={[2.8, 0.65, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
    </group>
  );
}

function Flower({ position, emoji }) {
  const tex = useMemo(() => createEmojiTexture(emoji, 64), [emoji]);
  return (
    <Billboard position={position}>
      <sprite scale={[0.7, 0.7, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </Billboard>
  );
}

export default function World() {
  const interiorId = useGameStore((s) => s.interiorId);

  if (interiorId) {
    return (
      <group>
        <Interior buildingId={interiorId} />
        <NpcDirector />
      </group>
    );
  }

  return (
    <group>
      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#a8d8f0', 35, 85]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#b1e1ff', '#4a7c59', 0.55]} />
      <directionalLight
        castShadow
        position={[30, 40, 20]}
        intensity={1.15}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={90}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />

      <Ground />
      <Path />
      <Water />
      <FenceRing />
      <Decorations />

      {BUILDINGS.map((b) => (
        <Building key={b.id} data={b} />
      ))}
      <NpcDirector />
      {NPCS.map((n) => (
        <NpcSprite key={n.id} npc={n} />
      ))}
      {PIPE_LEAKS.map((leak) => (
        <PipeLeak key={leak.id} leak={leak} />
      ))}

      <Fountain />
    </group>
  );
}
