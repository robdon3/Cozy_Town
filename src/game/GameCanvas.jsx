import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import World from './World';
import Player from './Player';
import RemotePlayers from './RemotePlayers';
import { useGameStore } from './store';

const _desired = new THREE.Vector3();

function FollowCamera({ target }) {
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3(10, 12, 10));

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 200;
    camera.fov = 45;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    if (!target.current) return;
    _desired.copy(target.current).add(offset.current);
    camera.position.lerp(_desired, 0.08);
    camera.lookAt(target.current.x, target.current.y + 0.5, target.current.z);
  });

  return null;
}

function InteractKey() {
  const interact = useGameStore((s) => s.interact);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.code === 'Space' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        interact();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interact]);
  return null;
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
        <Sky sunPosition={[80, 40, 30]} turbidity={6} rayleigh={1.2} />
        <FollowCamera target={cameraTarget} />
        <InteractKey />
        <World />
        <Player cameraTarget={cameraTarget} />
        <RemotePlayers />
      </Suspense>
    </Canvas>
  );
}
