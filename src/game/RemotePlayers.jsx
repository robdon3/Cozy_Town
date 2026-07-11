import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createCharacterTexture, createLabelTexture } from './sprites';
import { useGameStore } from './store';

function RemotePlayer({ peer }) {
  const group = useRef();
  const target = useRef(new THREE.Vector3(peer.x, 0, peer.z));
  const bob = useRef(Math.random() * 10);

  const tex = useMemo(
    () => createCharacterTexture(peer.avatar, peer.color || '#F8A5C2'),
    [peer.avatar, peer.color]
  );
  const label = useMemo(() => {
    const dead = peer.alive === false || (peer.hp != null && peer.hp <= 0);
    const hpBit = peer.hp != null && !dead ? ` ❤️${Math.ceil(peer.hp)}` : '';
    const tag = dead ? ' 💀' : '';
    return createLabelTexture(
      `${peer.name} · Lv.${peer.level || 1}${hpBit}${tag}`,
      dead ? 'rgba(40,20,20,0.9)' : 'rgba(90,40,70,0.88)'
    );
  }, [peer.name, peer.level, peer.hp, peer.alive]);

  // keep target in sync when peer state updates
  target.current.set(peer.x, 0, peer.z);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      target.current.x,
      1 - Math.pow(0.001, dt)
    );
    group.current.position.z = THREE.MathUtils.lerp(
      group.current.position.z,
      target.current.z,
      1 - Math.pow(0.001, dt)
    );

    const dx = target.current.x - group.current.position.x;
    const dz = target.current.z - group.current.position.z;
    const moving = Math.hypot(dx, dz) > 0.05;
    if (moving) {
      bob.current += dt * 12;
      group.current.position.y = Math.abs(Math.sin(bob.current)) * 0.12;
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.2);
    }
  });

  const dead = peer.alive === false || (peer.hp != null && peer.hp <= 0);

  return (
    <group ref={group} position={[peer.x, 0, peer.z]}>
      <Billboard position={[0, dead ? 0.7 : 1.2, 0]} follow>
        <sprite scale={[1.85, 1.85, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            depthWrite={false}
            opacity={dead ? 0.4 : 1}
            color={dead ? '#888888' : '#ffffff'}
          />
        </sprite>
      </Billboard>
      <Billboard position={[0, 2.5, 0]}>
        <sprite scale={[2.8, 0.65, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.48, 18]} />
        <meshStandardMaterial color={peer.color || '#F8A5C2'} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function RemotePlayers() {
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const interiorId = useGameStore((s) => s.interiorId);
  const list = useMemo(() => Object.values(remotePlayers), [remotePlayers]);

  if (interiorId) return null;

  return (
    <group>
      {list.map((p) => (
        <RemotePlayer key={p.id} peer={p} />
      ))}
    </group>
  );
}
