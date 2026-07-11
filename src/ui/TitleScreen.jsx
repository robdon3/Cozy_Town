import { useMemo, useState } from 'react';
import { AVATARS } from '../game/data';
import { useGameStore } from '../game/store';
import { unlockAudio, startMusic, sfx } from '../audio/sounds';
import { makeRoomCode, normalizeRoomCode, parseRoomFromUrl } from '../game/multiplayer';

export default function TitleScreen() {
  const player = useGameStore((s) => s.player);
  const startGame = useGameStore((s) => s.startGame);
  const [name, setName] = useState(player.name || 'Explorer');
  const [avatar, setAvatar] = useState(player.avatar || AVATARS[0]);
  const inviteRoom = useMemo(() => parseRoomFromUrl(), []);
  const [joinCode, setJoinCode] = useState(inviteRoom || '');
  const [busy, setBusy] = useState(false);

  const enter = async (roomCode) => {
    if (busy) return;
    setBusy(true);
    await unlockAudio();
    sfx.quest();
    startMusic();
    startGame(name, avatar, { roomCode: roomCode || null });
  };

  const playSolo = () => enter(null);

  const createRoom = () => {
    const code = makeRoomCode();
    // put room in URL so refresh / share stays in-room
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
    enter(code);
  };

  const joinRoom = () => {
    const code = normalizeRoomCode(joinCode);
    if (code.length < 4) {
      sfx.error();
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
    enter(code);
  };

  return (
    <div className="title-screen">
      <div className="title-card">
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏡</div>
        <h1>Cozy Town</h1>
        <p className="tagline">3D town · live multiplayer · share with friends</p>

        {inviteRoom ? (
          <div className="invite-banner">
            Invite room detected: <strong>{inviteRoom}</strong>
          </div>
        ) : null}

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
            <strong>Move:</strong> WASD / arrows or right joystick
          </div>
          <div>
            <strong>Look:</strong> drag screen / look stick / Q·E
          </div>
          <div>
            <strong>Plumbers:</strong> talk to Nico&apos;s crew · Fix Pipe at 💧 leaks
          </div>
          <div>
            <strong>Fun:</strong> 🔫 blaster (F / Fire) · 💣 grenades · shop for ammo
          </div>
          <div>
            <strong>Multiplayer:</strong> create/join a room and share the invite link
          </div>
        </div>

        <div className="btn-row" style={{ marginBottom: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1.2 }}
            disabled={busy}
            onClick={createRoom}
          >
            Create room & play
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={playSolo}>
            Solo
          </button>
        </div>

        <div className="field" style={{ textAlign: 'left', marginBottom: 8 }}>
          <label>Join friend&apos;s room</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              maxLength={8}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7M2P"
              style={{ flex: 1, letterSpacing: '0.12em', fontWeight: 700 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') joinRoom();
              }}
            />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} disabled={busy} onClick={joinRoom}>
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
