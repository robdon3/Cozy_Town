import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NPCS, WEAPONS, WORLD } from './data';
import { getLookBasis } from './lookState';
import { getNpcPos, isNpcAlive } from './npcRuntime';
import { useGameStore } from './store';
import { sfx } from '../audio/sounds';

function emitBoom(x, y, z) {
  window.dispatchEvent(new CustomEvent('cozy-boom', { detail: { x, y, z } }));
}

function pushProjectile(list, p) {
  list.current.push(p);
}

/**
 * Bullets + grenades (local + remote multiplayer) with arcade player damage.
 */
export default function Projectiles() {
  const group = useRef();
  const list = useRef([]);
  const fireRequest = useGameStore((s) => s.fireRequest);
  const clearFireRequest = useGameStore((s) => s.clearFireRequest);
  const showToast = useGameStore((s) => s.showToast);
  const hitCooldown = useRef(new Map());
  const fireCd = useRef(0);

  // Hold-to-fire (works while moving — separate touch points)
  useFrame((_, dt) => {
    fireCd.current = Math.max(0, fireCd.current - dt);
    const st = useGameStore.getState();
    if (!st.fireHeld || st.interiorId || st.player.hp <= 0) return;
    if (fireCd.current > 0) return;
    const w = st.equippedWeapon === 'grenade' ? WEAPONS.grenade : WEAPONS.gun;
    fireCd.current = w.cooldown;
    st.tryFire();
  });

  // Local fire
  useEffect(() => {
    if (!fireRequest) return;
    const player = useGameStore.getState().player;
    const { forwardX, forwardZ } = getLookBasis();
    const id = fireRequest.id;
    const origin = {
      x: player.x + forwardX * 0.9,
      y: 1.35,
      z: player.z + forwardZ * 0.9,
    };

    if (fireRequest.kind === 'gun') {
      const speed = WEAPONS.gun.speed;
      pushProjectile(list, {
        id,
        kind: 'gun',
        x: origin.x,
        y: origin.y,
        z: origin.z,
        vx: forwardX * speed,
        vy: 0.15,
        vz: forwardZ * speed,
        life: WEAPONS.gun.lifetime,
        trail: [],
        color: '#ffe566',
        remote: false,
        fromName: player.name,
      });
      const send = useGameStore.getState().netSendFire;
      if (send) {
        send({
          kind: 'gun',
          x: origin.x,
          y: origin.y,
          z: origin.z,
          vx: forwardX * speed,
          vy: 0.15,
          vz: forwardZ * speed,
          fromName: player.name,
        });
      }
    } else if (fireRequest.kind === 'grenade') {
      const speed = WEAPONS.grenade.throwSpeed;
      pushProjectile(list, {
        id,
        kind: 'grenade',
        x: origin.x,
        y: origin.y + 0.2,
        z: origin.z,
        vx: forwardX * speed,
        vy: 9,
        vz: forwardZ * speed,
        life: WEAPONS.grenade.fuse + 0.6,
        fuse: WEAPONS.grenade.fuse,
        trail: [],
        remote: false,
        fromName: player.name,
      });
      const send = useGameStore.getState().netSendFire;
      if (send) {
        send({
          kind: 'grenade',
          x: origin.x,
          y: origin.y + 0.2,
          z: origin.z,
          vx: forwardX * speed,
          vy: 9,
          vz: forwardZ * speed,
          fromName: player.name,
        });
      }
    }
    clearFireRequest();
  }, [fireRequest, clearFireRequest]);

  // Remote fire events
  useEffect(() => {
    const onRemote = (e) => {
      const d = e.detail || {};
      if (!d.kind) return;
      if (d.kind === 'gun') {
        pushProjectile(list, {
          id: `r-${Date.now()}-${Math.random()}`,
          kind: 'gun',
          x: Number(d.x) || 0,
          y: Number(d.y) || 1.2,
          z: Number(d.z) || 0,
          vx: Number(d.vx) || 0,
          vy: Number(d.vy) || 0,
          vz: Number(d.vz) || 0,
          life: WEAPONS.gun.lifetime,
          trail: [],
          color: '#ff7ad9',
          remote: true,
          fromName: d.fromName || 'Friend',
        });
        sfx.gunshot();
      } else if (d.kind === 'grenade') {
        pushProjectile(list, {
          id: `r-${Date.now()}-${Math.random()}`,
          kind: 'grenade',
          x: Number(d.x) || 0,
          y: Number(d.y) || 1.2,
          z: Number(d.z) || 0,
          vx: Number(d.vx) || 0,
          vy: Number(d.vy) || 8,
          vz: Number(d.vz) || 0,
          life: WEAPONS.grenade.fuse + 0.6,
          fuse: WEAPONS.grenade.fuse,
          trail: [],
          remote: true,
          fromName: d.fromName || 'Friend',
        });
        sfx.grenadeThrow();
      }
    };
    window.addEventListener('cozy-remote-fire', onRemote);
    return () => window.removeEventListener('cozy-remote-fire', onRemote);
  }, []);

  useFrame((_, dt) => {
    if (!group.current) return;
    while (group.current.children.length) {
      const ch = group.current.children[0];
      group.current.remove(ch);
      ch.geometry?.dispose?.();
      if (ch.material) {
        if (Array.isArray(ch.material)) ch.material.forEach((m) => m.dispose?.());
        else ch.material.dispose?.();
      }
    }

    const next = [];
    const bound = WORLD.half - 1;
    const st = useGameStore.getState();
    // no projectiles processed indoors
    if (st.interiorId) {
      list.current = [];
      return;
    }

    for (const p of list.current) {
      if (p.kind === 'gun') {
        p.trail = p.trail || [];
        p.trail.push({ x: p.x, y: p.y, z: p.z });
        if (p.trail.length > 8) p.trail.shift();

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.life -= dt;

        let hitSomething = false;

        if (!p.remote) {
          // Hit NPCs — arcade damage + respawn
          for (const npc of NPCS) {
            if (!isNpcAlive(npc.id)) continue;
            const pos = getNpcPos(npc.id);
            const d = Math.hypot(p.x - pos.x, p.z - pos.z);
            if (d < WEAPONS.gun.hitRadius && p.y < 2.8) {
              const last = hitCooldown.current.get(`npc-${npc.id}`) || 0;
              if (Date.now() - last > 180) {
                hitCooldown.current.set(`npc-${npc.id}`, Date.now());
                st.damageNpc(npc.id, WEAPONS.gun.damage);
                sfx.hit();
              }
              hitSomething = true;
              break;
            }
          }
          // Hit remote players → arcade damage
          if (!hitSomething) {
            for (const [peerId, remote] of Object.entries(st.remotePlayers)) {
              if (remote.alive === false || (remote.hp ?? 1) <= 0) continue;
              const d = Math.hypot(p.x - remote.x, p.z - remote.z);
              if (d < WEAPONS.gun.hitRadius && p.y < 2.8) {
                const key = `peer-${peerId}`;
                const last = hitCooldown.current.get(key) || 0;
                if (Date.now() - last > 200) {
                  hitCooldown.current.set(key, Date.now());
                  st.reportHitOnPeer(peerId, WEAPONS.gun.damage, 'gun');
                  sfx.hit();
                }
                hitSomething = true;
                break;
              }
            }
          }
        } else {
          // Remote bullets are visual; damage arrives via hit packet (avoids double-damage)
        }

        if (hitSomething) {
          p.life = 0;
        }

        if (p.life > 0 && Math.abs(p.x) < bound && Math.abs(p.z) < bound && p.y > 0) {
          if (p.trail.length > 1) {
            const pts = p.trail.map((t) => new THREE.Vector3(t.x, t.y, t.z));
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: p.color || '#ffe566',
                transparent: true,
                opacity: 0.85,
              })
            );
            group.current.add(line);
          }
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 10, 10),
            new THREE.MeshBasicMaterial({ color: p.color || '#ffe566' })
          );
          mesh.position.set(p.x, p.y, p.z);
          group.current.add(mesh);
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 10, 10),
            new THREE.MeshBasicMaterial({
              color: p.remote ? '#ff66cc' : '#ffaa33',
              transparent: true,
              opacity: 0.35,
            })
          );
          glow.position.set(p.x, p.y, p.z);
          group.current.add(glow);
          next.push(p);
        }
      } else if (p.kind === 'grenade') {
        p.vy -= 18 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.fuse -= dt;
        p.life -= dt;
        p.spin = (p.spin || 0) + dt * 10;

        if (p.y < 0.28) {
          p.y = 0.28;
          p.vy *= -0.38;
          p.vx *= 0.82;
          p.vz *= 0.82;
        }
        p.x = THREE.MathUtils.clamp(p.x, -bound, bound);
        p.z = THREE.MathUtils.clamp(p.z, -bound, bound);

        if (p.fuse <= 0) {
          sfx.explosion();
          if (!p.remote) showToast('💥 Boom!');
          emitBoom(p.x, p.y, p.z);
          const radius = WEAPONS.grenade.radius;
          const dmg = WEAPONS.grenade.damage;

          if (!p.remote) {
            for (const npc of NPCS) {
              if (!isNpcAlive(npc.id)) continue;
              const pos = getNpcPos(npc.id);
              if (Math.hypot(p.x - pos.x, p.z - pos.z) < radius) {
                st.damageNpc(npc.id, dmg);
              }
            }
            for (const [peerId, remote] of Object.entries(st.remotePlayers)) {
              if (remote.alive === false) continue;
              if (Math.hypot(p.x - remote.x, p.z - remote.z) < radius) {
                st.reportHitOnPeer(peerId, dmg, 'grenade');
              }
            }
          }
          // Remote grenade damage arrives via hit packet from the thrower
        } else if (p.life > 0) {
          const blink = Math.sin(p.fuse * 20) > 0;
          const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 12, 12),
            new THREE.MeshStandardMaterial({
              color: blink ? '#4cff4c' : '#1f4a1c',
              emissive: blink ? '#33ff33' : '#0a200a',
              emissiveIntensity: blink ? 1.2 : 0.3,
              roughness: 0.4,
            })
          );
          body.position.set(p.x, p.y, p.z);
          body.rotation.y = p.spin;
          group.current.add(body);
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 0.7, 24),
            new THREE.MeshBasicMaterial({
              color: '#ff4444',
              transparent: true,
              opacity: 0.45,
              side: THREE.DoubleSide,
            })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(p.x, 0.05, p.z);
          group.current.add(ring);
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
      items.current.push({ x, y: y ?? 0.3, z, life: 0.55, scale: 0.5 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        items.current.push({
          x: x + Math.cos(a) * 0.25,
          y: (y ?? 0.3) + 0.25,
          z: z + Math.sin(a) * 0.25,
          life: 0.4 + Math.random() * 0.25,
          scale: 0.2,
          spark: true,
          vx: Math.cos(a) * 6,
          vz: Math.sin(a) * 6,
          vy: 4 + Math.random() * 3,
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
        e.vy -= 14 * dt;
        e.scale = Math.max(0.06, e.scale - dt * 0.25);
      } else {
        e.scale += dt * 9;
      }
      if (e.life <= 0) continue;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(e.scale, 12, 12),
        new THREE.MeshBasicMaterial({
          color: e.spark ? '#ffee55' : e.life > 0.28 ? '#ff7722' : '#666666',
          transparent: true,
          opacity: Math.max(0, e.life * 2.4),
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
