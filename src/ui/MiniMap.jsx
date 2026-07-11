import { useEffect, useRef } from 'react';
import { BUILDINGS, NPCS, PIPE_LEAKS, WORLD } from '../game/data';
import { getNpcPos } from '../game/npcRuntime';
import { useGameStore } from '../game/store';

/** Always-on minimap with emoji location icons (no text labels). */
export default function MiniMap() {
  const canvasRef = useRef(null);
  const player = useGameStore((s) => s.player);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const fixedLeaks = useGameStore((s) => s.fixedLeaks);

  useEffect(() => {
    let raf = 0;
    let alive = true;
    const c = canvasRef.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = 120;
    const cssH = 96;
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const drawIcon = (emoji, x, y, size = 11) => {
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, x, y);
    };

    const tick = () => {
      if (!alive) return;
      const w = cssW;
      const h = cssH;
      ctx.clearRect(0, 0, w, h);

      // ground
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a4a32');
      g.addColorStop(1, '#0f2e1f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // soft roads
      ctx.fillStyle = 'rgba(196, 168, 130, 0.35)';
      ctx.fillRect(w * 0.46, 8, w * 0.08, h - 16);
      ctx.fillRect(8, h * 0.46, w - 16, h * 0.08);

      const sx = (x) => ((x + WORLD.half) / WORLD.size) * w;
      const sy = (z) => ((z + WORLD.half) / WORLD.size) * h;

      // buildings as icons
      BUILDINGS.forEach((b) => {
        drawIcon(b.emoji, sx(b.x), sy(b.z), 12);
      });

      // leaks
      PIPE_LEAKS.forEach((leak) => {
        if (fixedLeaks.includes(leak.id)) {
          drawIcon('✅', sx(leak.x), sy(leak.z), 9);
        } else {
          drawIcon(leak.emoji, sx(leak.x), sy(leak.z), 10);
        }
      });

      // plumbers
      NPCS.filter((n) => n.role === 'plumber').forEach((n) => {
        const pos = getNpcPos(n.id);
        drawIcon('🔧', sx(pos.x), sy(pos.z), 9);
      });

      // friends
      Object.values(useGameStore.getState().remotePlayers).forEach((p) => {
        ctx.beginPath();
        ctx.fillStyle = '#d8a0ff';
        ctx.arc(sx(p.x), sy(p.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
        drawIcon(p.avatar || '🙂', sx(p.x), sy(p.z) - 7, 10);
      });

      // you
      const pl = useGameStore.getState().player;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 80, 80, 0.35)';
      ctx.arc(sx(pl.x), sy(pl.z), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#ff5c5c';
      ctx.arc(sx(pl.x), sy(pl.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(pl.avatar || '😊', sx(pl.x), sy(pl.z) - 8, 11);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [fixedLeaks]);

  return (
    <div className="minimap" title="Map · 🔴 you · icons = places">
      <canvas ref={canvasRef} />
      <div className="minimap-legend" aria-hidden>
        <span>🔴</span>
        <span>🔧</span>
        <span>💧</span>
      </div>
    </div>
  );
}
