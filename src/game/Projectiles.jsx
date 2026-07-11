import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NPCS, WEAPONS, WORLD } from './data';
import { getLookBasis } from './lookState';
import { getNpcPos } from './npcRuntime';
import { useGameStore } from './store';
import { sfx } from '../audio/sounds';

function emitBoom(x, y, z) {
  window.dispatchEvent(new CustomEvent('cozy-boom', { detail: { x, y, z } }));
}

/**
 * Bullets + grenades simulation (local refs for performance).
 */
export default function Projectiles() {
  const group = useRef();
  const list = useRef([]);
  const fireRequest = useGameStore((s) => s.fireRequest);
  const clearFireRequest = useGameStore((s) => s.clearFireRequest);
  const onNpcHit = useGameStore((s) => s.onNpcHit);
  const showToast = useGameStore((s) => s.showToast);
  const hitCooldown = useRef(new Map());

  useEffect(() => {
    if (!fireRequest) return;
    const player = useGameStore.getState().player;
    const { forwardX, forwardZ } = getLookBasis();
    const id = fireRequest.id;
    const origin = {
      x: player.x + forwardX * 0.8,
      y: 1.2,
      z: player.z + forwardZ * 0.8,
    };

    if (fireRequest.kind === 'gun') {
      const speed = WEAPONS.gun.speed;
      list.current.push({
        id,
        kind: 'gun',
        x: origin.x,
        y: origin.y,
        z: origin.z,
        vx: forwardX * speed,
        vy: 0.4,
        vz: forwardZ * speed,
        life: WEAPONS.gun.lifetime,
      });
    } else if (fireRequest.kind === 'grenade') {
      const speed = WEAPONS.grenade.throwSpeed;
      list.current.push({
        id,
        kind: 'grenade',
        x: origin.x,
        y: origin.y + 0.3,
        z: origin.z,
        vx: forwardX * speed,
        vy: 8.5,
        vz: forwardZ * speed,
        life: WEAPONS.grenade.fuse + 0.6,
        fuse: WEAPONS.grenade.fuse,
      });
    }
    clearFireRequest();
  }, [fireRequest, clearFireRequest]);

  useFrame((_, dt) => {
    if (!group.current) return;
    while (group.current.children.length) {
      group.current.remove(group.current.children[0]);
    }

    const next = [];
    const bound = WORLD.half - 1;

    for (const p of list.current) {
      if (p.kind === 'gun') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.life -= dt;

        for (const npc of NPCS) {
          const pos = getNpcPos(npc.id);
          const d = Math.hypot(p.x - pos.x, p.z - pos.z);
          if (d < 1.35 && p.y < 2.6) {
            const last = hitCooldown.current.get(npc.id) || 0;
            if (Date.now() - last > 750) {
              hitCooldown.current.set(npc.id, Date.now());
              onNpcHit(npc.id);
              sfx.hit();
            }
            p.life = 0;
            break;
          }
        }

        if (p.life > 0 && Math.abs(p.x) < bound && Math.abs(p.z) < bound && p.y > 0) {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            new THREE.MeshStandardMaterial({
              color: '#ffe566',
              emissive: '#ffaa00',
              emissiveIntensity: 0.9,
            })
          );
          mesh.position.set(p.x, p.y, p.z);
          group.current.add(mesh);
          next.push(p);
        }
      } else if (p.kind === 'grenade') {
        p.vy -= 18 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.fuse -= dt;
        p.life -= dt;

        if (p.y < 0.25) {
          p.y = 0.25;
          p.vy *= -0.35;
          p.vx *= 0.85;
          p.vz *= 0.85;
        }
        p.x = THREE.MathUtils.clamp(p.x, -bound, bound);
        p.z = THREE.MathUtils.clamp(p.z, -bound, bound);

        if (p.fuse <= 0) {
          sfx.explosion();
          showToast('💥 Boom!');
          emitBoom(p.x, p.y, p.z);
          for (const npc of NPCS) {
            const pos = getNpcPos(npc.id);
            if (Math.hypot(p.x - pos.x, p.z - pos.z) < WEAPONS.grenade.radius) {
              onNpcHit(npc.id);
            }
          }
        } else if (p.life > 0) {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 10, 10),
            new THREE.MeshStandardMaterial({ color: '#2d5a27', roughness: 0.55 })
          );
          mesh.position.set(p.x, p.y, p.z);
          const pin = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.08),
            new THREE.MeshStandardMaterial({ color: '#c0c0c0' })
          );
          pin.position.set(0, 0.2, 0);
          mesh.add(pin);
          group.current.add(mesh);
          next.push(p);
        }
      }
    }
    list.current = next;
  });

  return <group ref={group} />;
}

export function ExplosionFX() {
  const items = useRef([]);
  const group = useRef();

  useEffect(() => {
    const handler = (e) => {
      const { x, y, z } = e.detail || {};
      items.current.push({ x, y: y ?? 0.3, z, life: 0.5, scale: 0.35 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        items.current.push({
          x: x + Math.cos(a) * 0.2,
          y: (y ?? 0.3) + 0.2,
          z: z + Math.sin(a) * 0.2,
          life: 0.35 + Math.random() * 0.2,
          scale: 0.15,
          spark: true,
          vx: Math.cos(a) * 4,
          vz: Math.sin(a) * 4,
          vy: 3 + Math.random() * 2,
        });
      }
    };
    window.addEventListener('cozy-boom', handler);
    return () => window.removeEventListener('cozy-boom', handler);
  }, []);

  useFrame((_, dt) => {
    if (!group.current) return;
    while (group.current.children.length) {
      group.current.remove(group.current.children[0]);
    }
    const next = [];
    for (const e of items.current) {
      e.life -= dt;
      if (e.spark) {
        e.x += (e.vx || 0) * dt;
        e.y += (e.vy || 0) * dt;
        e.z += (e.vz || 0) * dt;
        e.vy -= 12 * dt;
        e.scale = Math.max(0.05, e.scale - dt * 0.2);
      } else {
        e.scale += dt * 7;
      }
      if (e.life <= 0) continue;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(e.scale, 10, 10),
        new THREE.MeshBasicMaterial({
          color: e.spark ? '#ffcc44' : e.life > 0.25 ? '#ff8833' : '#555555',
          transparent: true,
          opacity: Math.max(0, e.life * 2.2),
        })
      );
      mesh.position.set(e.x, Math.max(0.1, e.y), e.z);
      group.current.add(mesh);
      next.push(e);
    }
    items.current = next;
  });

  return <group ref={group} />;
}
