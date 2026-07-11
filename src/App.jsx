import { useEffect, useState } from 'react';
import GameCanvas from './game/GameCanvas';
import MultiplayerBridge from './game/MultiplayerBridge';
import HUD from './ui/HUD';
import TitleScreen from './ui/TitleScreen';
import { useGameStore } from './game/store';
import { setMuted, unlockAudio } from './audio/sounds';

export default function App() {
  const started = useGameStore((s) => s.started);
  const muted = useGameStore((s) => s.muted);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMuted(muted);
    const warm = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', warm);
    };
    window.addEventListener('pointerdown', warm);
    setReady(true);
    return () => window.removeEventListener('pointerdown', warm);
  }, [muted]);

  if (!ready) {
    return (
      <div className="loading-overlay">
        <div>
          <div className="spin" />
          <div>Loading Cozy Town…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {started ? (
        <>
          <MultiplayerBridge />
          <GameCanvas />
          <HUD />
        </>
      ) : (
        <TitleScreen />
      )}
    </div>
  );
}
