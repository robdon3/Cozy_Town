import { useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import { INTERIORS } from './data';
import { createEmojiTexture, createLabelTexture } from './sprites';

function Prop({ p }) {
  if (p.type === 'counter') {
    return (
      <mesh position={[p.x, (p.h || 1.1) / 2, p.z]} castShadow receiveShadow>
        <boxGeometry args={[p.w || 5, p.h || 1.1, p.d || 1.2]} />
        <meshStandardMaterial color={p.color || '#5c3a22'} roughness={0.8} />
      </mesh>
    );
  }
  if (p.type === 'table') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.6, 0.12, 1.6]} />
          <meshStandardMaterial color={p.color || '#8B5A2B'} />
        </mesh>
        {[
          [-0.6, 0.25, -0.6],
          [0.6, 0.25, -0.6],
          [-0.6, 0.25, 0.6],
          [0.6, 0.25, 0.6],
        ].map((pos, i) => (
          <mesh key={i} position={pos}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 6]} />
            <meshStandardMaterial color="#4a3020" />
          </mesh>
        ))}
      </group>
    );
  }
  if (p.type === 'shelf') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh position={[0, (p.h || 2.2) / 2, 0]} castShadow>
          <boxGeometry args={[0.5, p.h || 2.2, 2.4]} />
          <meshStandardMaterial color="#6b4a32" />
        </mesh>
        {[0.5, 1.1, 1.7].map((y) => (
          <mesh key={y} position={[0.2, y, 0]}>
            <boxGeometry args={[0.15, 0.08, 2.1]} />
            <meshStandardMaterial color="#c4a882" />
          </mesh>
        ))}
      </group>
    );
  }
  if (p.type === 'crate') {
    return (
      <mesh position={[p.x, 0.4, p.z]} castShadow>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#a67c52" />
      </mesh>
    );
  }
  if (p.type === 'plant') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 0.5, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.45, 10, 10]} />
          <meshStandardMaterial color="#2d8a4e" />
        </mesh>
      </group>
    );
  }
  if (p.type === 'rug') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.03, p.z]} receiveShadow>
        <planeGeometry args={[p.w || 3, p.d || 2]} />
        <meshStandardMaterial color={p.color || '#c45c5c'} roughness={1} />
      </mesh>
    );
  }
  if (p.type === 'pillar') {
    return (
      <mesh position={[p.x, 1.6, p.z]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
        <meshStandardMaterial color="#d8cfc0" />
      </mesh>
    );
  }
  if (p.type === 'crystal') {
    return (
      <mesh position={[p.x, 0.7, p.z]} castShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color="#7ec8e3"
          emissive="#3a90c4"
          emissiveIntensity={0.55}
          metalness={0.3}
          roughness={0.25}
        />
      </mesh>
    );
  }
  if (p.type === 'rock') {
    return (
      <mesh position={[p.x, 0.35, p.z]} castShadow>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#6a6a74" roughness={0.95} />
      </mesh>
    );
  }
  if (p.type === 'pipe') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 2.2, 8]} />
          <meshStandardMaterial color="#8a8a96" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 1, 8]} />
          <meshStandardMaterial color="#6a6a74" metalness={0.4} roughness={0.45} />
        </mesh>
      </group>
    );
  }
  return null;
}

function InteractMarker({ obj }) {
  const emoji = useMemo(() => createEmojiTexture(obj.emoji), [obj.emoji]);
  const label = useMemo(
    () => createLabelTexture(`${obj.emoji} ${obj.name}`),
    [obj.emoji, obj.name]
  );
  return (
    <group position={[obj.x, 0, obj.z]}>
      <Billboard position={[0, 1.6, 0]}>
        <sprite scale={[1.2, 1.2, 1]}>
          <spriteMaterial map={emoji} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <Billboard position={[0, 2.3, 0]}>
        <sprite scale={[2.4, 0.55, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshStandardMaterial color="#f6c453" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/**
 * Pokémon-style indoor room: open and readable.
 * No tall sealed walls / ceiling / black shell — those blocked the camera.
 * Low half-walls mark the border; camera looks over them easily.
 */
export default function Interior({ buildingId }) {
  const room = INTERIORS[buildingId];
  const title = useMemo(
    () => (room ? createLabelTexture(`${room.emoji} ${room.name}`) : null),
    [room]
  );
  const exitLabel = useMemo(() => createLabelTexture('🚪 Exit'), []);

  if (!room) return null;

  // Spacious playable floor (data sizes are minimums)
  const w = Math.max(room.w, 22);
  const d = Math.max(room.d, 18);
  const hw = w / 2;
  const hd = d / 2;
  // Short borders so the camera always sees over them
  const borderH = 1.15;
  const borderT = 0.4;
  const bg = room.sky || '#e8d5b8';

  return (
    <group>
      {/* Bright open “stage” — not a sealed box */}
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 28, 55]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#fff6e8', room.floor || '#c4a882', 0.55]} />
      <directionalLight position={[8, 18, 6]} intensity={0.85} castShadow />
      <pointLight position={[0, 6, 0]} intensity={0.55} distance={30} color="#ffe8c8" />

      {/* Large floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 2, d + 2]} />
        <meshStandardMaterial color={room.floor} roughness={0.92} />
      </mesh>
      {/* Outer grass ring so edges feel open, not black */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[w + 24, d + 24]} />
        <meshStandardMaterial color="#6aab7a" roughness={1} />
      </mesh>

      {/* Low half-walls (borders only) */}
      <mesh position={[0, borderH / 2, -hd]} castShadow receiveShadow>
        <boxGeometry args={[w + borderT * 2, borderH, borderT]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} />
      </mesh>
      <mesh position={[0, borderH / 2, hd]} castShadow receiveShadow>
        <boxGeometry args={[w + borderT * 2, borderH, borderT]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} />
      </mesh>
      <mesh position={[-hw, borderH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[borderT, borderH, d]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} />
      </mesh>
      <mesh position={[hw, borderH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[borderT, borderH, d]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} />
      </mesh>

      {/* Soft tall backdrop on north only (far, decorative — not a full enclosure) */}
      <mesh position={[0, 2.4, -hd - 0.8]}>
        <boxGeometry args={[w * 0.85, 4.2, 0.25]} />
        <meshStandardMaterial color={room.wall} roughness={0.9} />
      </mesh>
      {/* Windows on backdrop */}
      <mesh position={[-w * 0.18, 2.6, -hd - 0.7]}>
        <boxGeometry args={[2.2, 1.4, 0.12]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[w * 0.18, 2.6, -hd - 0.7]}>
        <boxGeometry args={[2.2, 1.4, 0.12]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.6} />
      </mesh>

      {/* Door gap mark on south border */}
      <mesh position={[0, borderH / 2 + 0.05, hd + 0.05]}>
        <boxGeometry args={[2.4, borderH + 0.1, 0.2]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>

      {/* Exit mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, room.exitZ]} receiveShadow>
        <planeGeometry args={[2.8, 1.6]} />
        <meshStandardMaterial color="#4a3020" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, room.exitZ]}>
        <planeGeometry args={[2.3, 1.15]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </mesh>
      <Billboard position={[0, 1.0, room.exitZ]}>
        <sprite scale={[2.4, 0.55, 1]}>
          <spriteMaterial map={exitLabel} transparent depthWrite={false} />
        </sprite>
      </Billboard>

      {room.props?.map((p, i) => (
        <Prop key={i} p={p} />
      ))}
      {room.interactables?.map((obj) => (
        <InteractMarker key={obj.id} obj={obj} />
      ))}

      {title && (
        <Billboard position={[0, 4.2, -hd - 0.5]}>
          <sprite scale={[5, 1.0, 1]}>
            <spriteMaterial map={title} transparent depthWrite={false} />
          </sprite>
        </Billboard>
      )}
    </group>
  );
}
