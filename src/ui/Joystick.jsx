import { useRef } from 'react';
import { useGameStore } from '../game/store';

const MAX = 42;

export default function Joystick() {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const active = useRef(false);
  const setMoveInput = useGameStore((s) => s.setMoveInput);

  const setKnob = (dx, dy) => {
    if (!knobRef.current) return;
    knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  const onStart = (clientX, clientY) => {
    active.current = true;
    onMove(clientX, clientY);
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
    // screen up = world -z
    setMoveInput(dx / MAX, dy / MAX);
  };

  const onEnd = () => {
    active.current = false;
    setKnob(0, 0);
    setMoveInput(0, 0);
  };

  return (
    <div
      className="joystick-zone"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onStart(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => onMove(e.clientX, e.clientY)}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      <div className="joystick-base" ref={baseRef}>
        <div className="joystick-knob" ref={knobRef} />
      </div>
    </div>
  );
}
