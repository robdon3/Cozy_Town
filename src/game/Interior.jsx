import { useMemo } from 'react';
import * as THREE from 'three';
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
 * Pokémon-style indoor room: fully sealed box so outdoor world never bleeds in.
 * Camera is pulled tight indoors so it stays inside the volume.
 */
export default function Interior({ buildingId }) {
  const room = INTERIORS[buildingId];
  const title = useMemo(
    () => (room ? createLabelTexture(`${room.emoji} ${room.name}`) : null),
    [room]
  );
  const exitLabel = useMemo(() => createLabelTexture('🚪 Walk here to leave'), []);

  if (!room) return null;

  const hw = room.w / 2;
  const hd = room.d / 2;
  const wallH = 4.2;
  const wallT = 0.55;
  // slightly larger than room so camera never peeks past edges
  const shell = Math.max(room.w, room.d) + 14;

  return (
    <group>
      <color attach="background" args={['#120e16']} />
      <fog attach="fog" args={['#120e16', 8, 18]} />
      <ambientLight intensity={0.62} />
      <pointLight position={[0, 3.0, 0]} intensity={1.25} distance={18} color="#ffe8c8" />
      <pointLight position={[-3.5, 2.2, -2]} intensity={0.45} distance={9} color={room.accent} />
      <pointLight position={[3.5, 2.2, 2]} intensity={0.3} distance={8} color="#ffd4a8" />

      {/* Outer void shell — inverted cube so only black is outside */}
      <mesh>
        <boxGeometry args={[shell, shell * 0.7, shell]} />
        <meshBasicMaterial color="#0a0810" side={THREE.BackSide} depthWrite />
      </mesh>

      {/* Thick floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w + 0.2, room.d + 0.2]} />
        <meshStandardMaterial color={room.floor} roughness={0.92} />
      </mesh>
      {/* subfloor pad under door mat */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[room.w + wallT * 2, 0.3, room.d + wallT * 2]} />
        <meshStandardMaterial color="#2a1e18" />
      </mesh>

      {/* Ceiling (solid, faces down into room) */}
      <mesh position={[0, wallH, 0]}>
        <boxGeometry args={[room.w + wallT * 2, 0.4, room.d + wallT * 2]} />
        <meshStandardMaterial color="#2a2430" roughness={1} />
      </mesh>

      {/* Four solid walls — fully closed (exit is floor mat, not a hole) */}
      {/* North */}
      <mesh position={[0, wallH / 2, -hd - wallT / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.w + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* South — solid; door frame painted on, not open */}
      <mesh position={[0, wallH / 2, hd + wallT / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.w + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* West */}
      <mesh position={[-hw - wallT / 2, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallT, wallH, room.d]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* East */}
      <mesh position={[hw + wallT / 2, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallT, wallH, room.d]} />
        <meshStandardMaterial color={room.wall} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Decorative door frame on south wall (still solid) */}
      <mesh position={[0, 1.1, hd + wallT / 2 + 0.02]}>
        <boxGeometry args={[1.6, 2.2, 0.08]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[0, 1.1, hd + wallT / 2 + 0.05]}>
        <boxGeometry args={[1.25, 1.9, 0.06]} />
        <meshStandardMaterial color="#5c4030" emissive="#2a1810" emissiveIntensity={0.15} />
      </mesh>

      {/* Windows glow (fake, on north wall) */}
      <mesh position={[-hw * 0.35, wallH * 0.55, -hd - wallT / 2 - 0.02]}>
        <boxGeometry args={[1.2, 1.0, 0.08]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[hw * 0.35, wallH * 0.55, -hd - wallT / 2 - 0.02]}>
        <boxGeometry args={[1.2, 1.0, 0.08]} />
        <meshStandardMaterial color="#ffe9a8" emissive="#ffd56a" emissiveIntensity={0.55} />
      </mesh>

      {/* Door mat near south wall — walk here to leave */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, room.exitZ - 0.35]} receiveShadow>
        <planeGeometry args={[2.6, 1.4]} />
        <meshStandardMaterial color="#4a3020" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, room.exitZ - 0.35]}>
        <planeGeometry args={[2.2, 1.0]} />
        <meshStandardMaterial color="#6b4423" roughness={1} />
      </mesh>
      <Billboard position={[0, 0.9, room.exitZ - 0.35]}>
        <sprite scale={[3.0, 0.55, 1]}>
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
        <Billboard position={[0, wallH - 0.55, -hd + 0.55]}>
          <sprite scale={[4, 0.9, 1]}>
            <spriteMaterial map={title} transparent depthWrite={false} />
          </sprite>
        </Billboard>
      )}
    </group>
  );
}
