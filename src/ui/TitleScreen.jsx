import { useState } from 'react';
import { AVATARS } from '../game/data';
import { useGameStore } from '../game/store';
import { unlockAudio, startMusic, sfx } from '../audio/sounds';

export default function TitleScreen() {
  const player = useGameStore((s) => s.player);
  const startGame = useGameStore((s) => s.startGame);
  const [name, setName] = useState(player.name || 'Explorer');
  const [avatar, setAvatar] = useState(player.avatar || AVATARS[0]);

  const play = async () => {
    await unlockAudio();
    sfx.quest();
    startMusic();
    startGame(name, avatar);
  };

  return (
    <div className="title-screen">
      <div className="title-card">
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏡</div>
        <h1>Cozy Town</h1>
        <p className="tagline">A 3D town to explore, farm vibes, and share with friends</p>

        <div className="field" style={{ textAlign: 'left' }}>
          <label>Your name</label>
          <input
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="Explorer"
          />
        </div>

        <div className="field" style={{ textAlign: 'left' }}>
          <label>Avatar</label>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={`avatar-opt ${avatar === a ? 'selected' : ''}`}
                onClick={() => {
                  sfx.click();
                  setAvatar(a);
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-help">
          <div>
            <strong>Move:</strong> WASD / arrows or on-screen joystick
          </div>
          <div>
            <strong>Interact:</strong> E, Space, or the green button
          </div>
          <div>
            <strong>Share:</strong> 📤 button copies an invite link for friends
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={play}>
          Enter Town ▶
        </button>
      </div>
    </div>
  );
}
