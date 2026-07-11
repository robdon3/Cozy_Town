import { useRef } from 'react';
import { useGameStore } from '../game/store';

const MAX = 36;

/** Virtual look pad — right side (normal dual-stick layout) */
export default function LookStick() {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(false);
  const setLookInput = useGameStore((s) => s.setLookInput);

  const setKnob = (dx, dy) => {
    if (!knobRef.current) return;
    knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const onMove = (clientX, clientY) => {
    if (!active.current || !baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX) {
      dx = (dx / dist) * MAX;
      dy = (dy / dist) * MAX;
    }
    setKnob(dx, dy);
    setLookInput(dx / MAX, dy / MAX);
  };

  const onEnd = () => {
    active.current = false;
    setKnob(0, 0);
    setLookInput(0, 0);
  };

  return (
    <div
      className="look-stick"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        active.current = true;
        onMove(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => onMove(e.clientX, e.clientY)}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      <div className="look-stick-label">LOOK</div>
      <div className="look-stick-base" ref={baseRef}>
        <div className="look-stick-knob" ref={knobRef} />
      </div>
    </div>
  );
}
