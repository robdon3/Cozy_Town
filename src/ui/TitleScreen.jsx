import { useMemo, useState } from 'react';
import { AVATARS } from '../game/data';
import { useGameStore } from '../game/store';
import { unlockAudio, startMusic, sfx } from '../audio/sounds';
import { makeRoomCode, normalizeRoomCode, parseRoomFromUrl } from '../game/multiplayer';
import { hardResetWorldAndReload } from '../game/resetWorld';
import { GAME_BUILD_LABEL, GAME_VERSION } from '../game/version';

export default function TitleScreen() {
  const player = useGameStore((s) => s.player);
  const startGame = useGameStore((s) => s.startGame);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const [name, setName] = useState(player.name || 'Explorer');
  const [avatar, setAvatar] = useState(player.avatar || AVATARS[0]);
  const inviteRoom = useMemo(() => parseRoomFromUrl(), []);
  const [joinCode, setJoinCode] = useState(inviteRoom || '');
  const [busy, setBusy] = useState(false);
  // OFF by default so progress persists in the browser when you leave
  const [freshWorld, setFreshWorld] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const hasSave = player.level > 1 || player.coins !== 150 || (player.inventory?.length || 0) > 0
    || player.xp > 0;

  const enter = async (roomCode) => {
    if (busy) return;
    setBusy(true);
    try {
      if (freshWorld) {
        resetProgress();
      }
      await unlockAudio();
      sfx.quest();
      startMusic();
      startGame(name, avatar, { roomCode: roomCode || null });
    } catch {
      setBusy(false);
      sfx.error();
    }
  };

  const playSolo = () => enter(null);

  const createRoom = () => {
    const code = makeRoomCode();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      url.searchParams.set('v', GAME_VERSION);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
    enter(code);
  };

  const joinRoom = () => {
    const code = normalizeRoomCode(joinCode || inviteRoom);
    if (code.length < 4) {
      sfx.error();
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      url.searchParams.set('v', GAME_VERSION);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
    enter(code);
  };

  const forceLatest = () => {
    sfx.click();
    hardResetWorldAndReload({ keepRoom: Boolean(inviteRoom) });
  };

  const isInvite = Boolean(inviteRoom);

  return (
    <div className={`title-screen ${isInvite ? 'is-invite' : ''}`}>
      <div className="title-scroll">
        <div className="title-card">
          <div className="title-hero">
            <span className="title-emoji" aria-hidden>
              🏡
            </span>
            <div>
              <h1>Cozy Town</h1>
              <p className="tagline">
                {isInvite ? 'Your friend invited you!' : '3D town · plumbers · multiplayer'}
              </p>
            </div>
          </div>
          <div className="version-badge">{GAME_BUILD_LABEL}</div>

          {hasSave && !isInvite && (
            <div className="save-banner">
              Saved profile: <strong>{player.avatar} {player.name}</strong>
              {' · '}Lv.{player.level} · {player.coins}💰
              <span className="save-sub">Progress is kept on this device’s browser</span>
            </div>
          )}

          {isInvite && (
            <div className="invite-banner invite-banner-strong">
              Room <strong className="room-code-lg">{inviteRoom}</strong>
              <span className="invite-sub">Pick a name & avatar, then tap Join below</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="player-name">Your name</label>
            <input
              id="player-name"
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="Explorer"
              autoComplete="nickname"
              enterKeyHint="done"
            />
          </div>

          <div className="field">
            <label>Avatar</label>
            <div className="avatar-grid" role="listbox" aria-label="Choose avatar">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`avatar-opt ${avatar === a ? 'selected' : ''}`}
                  onClick={() => {
                    sfx.click();
                    setAvatar(a);
                  }}
                  aria-label={`Avatar ${a}`}
                  aria-selected={avatar === a}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Primary actions — always near the top on invite links */}
          {isInvite ? (
            <div className="title-primary-actions">
              <button
                className="btn btn-primary btn-xl"
                disabled={busy}
                onClick={joinRoom}
              >
                {busy ? 'Joining…' : `Join room ${inviteRoom}`}
              </button>
              <p className="action-hint">Uses the invite code from your link</p>
            </div>
          ) : (
            <div className="title-primary-actions">
              <div className="btn-row">
                <button
                  className="btn btn-primary"
                  style={{ flex: 1.3 }}
                  disabled={busy}
                  onClick={createRoom}
                >
                  Create room & play
                </button>
                <button className="btn btn-secondary" disabled={busy} onClick={playSolo}>
                  Solo
                </button>
              </div>
            </div>
          )}

          {!isInvite && (
            <div className="field join-field">
              <label htmlFor="room-code">Join friend&apos;s room</label>
              <div className="join-row">
                <input
                  id="room-code"
                  value={joinCode}
                  maxLength={8}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') joinRoom();
                  }}
                />
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={joinRoom}
                >
                  Join
                </button>
              </div>
            </div>
          )}

          {isInvite && (
            <div className="field join-field compact">
              <label htmlFor="room-code-alt">Different room code?</label>
              <div className="join-row">
                <input
                  id="room-code-alt"
                  value={joinCode}
                  maxLength={8}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={inviteRoom}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button className="btn btn-secondary" disabled={busy} onClick={joinRoom}>
                  Join
                </button>
              </div>
            </div>
          )}

          <label className="fresh-toggle">
            <input
              type="checkbox"
              checked={freshWorld}
              onChange={(e) => {
                sfx.click();
                setFreshWorld(e.target.checked);
              }}
            />
            <span>
              <strong>Fresh world</strong> — only check to wipe saves (off = keep your profile)
            </span>
          </label>

          <button
            type="button"
            className="more-toggle"
            onClick={() => {
              sfx.click();
              setShowMore((v) => !v);
            }}
          >
            {showMore ? 'Hide extras ▲' : 'Controls & extras ▼'}
          </button>

          {showMore && (
            <div className="title-extras">
              {!isInvite && null}
              {isInvite && (
                <div className="btn-row" style={{ marginBottom: 10 }}>
                  <button className="btn btn-secondary" disabled={busy} onClick={createRoom}>
                    Create my own room
                  </button>
                  <button className="btn btn-secondary" disabled={busy} onClick={playSolo}>
                    Solo
                  </button>
                </div>
              )}
              <div className="controls-help">
                <div>
                  <strong>Move:</strong> WASD or joystick
                </div>
                <div>
                  <strong>Look:</strong> drag / look stick / Q·E
                </div>
                <div>
                  <strong>Interact:</strong> Space or green button
                </div>
                <div>
                  <strong>Weapons:</strong> 1 blaster · 2 grenade · F fire
                </div>
              </div>
              <button className="btn btn-secondary btn-block" type="button" onClick={forceLatest}>
                🔄 Reload latest (clear cache)
              </button>
              <p className="reset-hint">
                Official game:{' '}
                <span className="mono">robdon3.github.io/Cozy_Town/</span>
              </p>
            </div>
          )}

          {/* Spacer so sticky bar never covers last field */}
          <div className="title-scroll-pad" />
        </div>
      </div>

      {/* Sticky join bar — always visible on invite phones */}
      {isInvite && (
        <div className="title-sticky-bar">
          <button
            className="btn btn-primary btn-xl"
            disabled={busy}
            onClick={joinRoom}
          >
            {busy ? 'Joining…' : `Join ${inviteRoom} ▶`}
          </button>
        </div>
      )}
    </div>
  );
}
