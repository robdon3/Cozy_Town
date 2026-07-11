import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store';
import { BUILDINGS, NPCS, PIPE_LEAKS, QUESTS, SHOP_ITEMS, WORLD } from '../game/data';
import Joystick from './Joystick';
import LookStick from './LookStick';
import { sfx, setMuted as setAudioMuted, startMusic, stopMusic } from '../audio/sounds';
import { roomInviteUrl } from '../game/multiplayer';

function MiniMap() {
  const canvasRef = useRef(null);
  const player = useGameStore((s) => s.player);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const fixedLeaks = useGameStore((s) => s.fixedLeaks);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#163f28';
    ctx.fillRect(0, 0, w, h);

    const sx = (x) => ((x + WORLD.half) / WORLD.size) * w;
    const sy = (z) => ((z + WORLD.half) / WORLD.size) * h;

    BUILDINGS.forEach((b) => {
      ctx.fillStyle = '#f6c453';
      ctx.fillRect(sx(b.x) - 2, sy(b.z) - 2, 4, 4);
    });

    NPCS.filter((n) => n.role === 'plumber').forEach((n) => {
      ctx.fillStyle = '#5B8DEF';
      ctx.fillRect(sx(n.x) - 2, sy(n.z) - 2, 4, 4);
    });

    PIPE_LEAKS.forEach((leak) => {
      ctx.fillStyle = fixedLeaks.includes(leak.id) ? '#4ade80' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx(leak.x), sy(leak.z), 2, 0, Math.PI * 2);
      ctx.fill();
    });

    Object.values(remotePlayers).forEach((p) => {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ff5c5c';
    ctx.beginPath();
    ctx.arc(sx(player.x), sy(player.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }, [player.x, player.z, remotePlayers, fixedLeaks]);

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={120} height={90} />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function HUD() {
  const player = useGameStore((s) => s.player);
  const messages = useGameStore((s) => s.messages);
  const nearby = useGameStore((s) => s.nearby);
  const panels = useGameStore((s) => s.panels);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const toast = useGameStore((s) => s.toast);
  const muted = useGameStore((s) => s.muted);
  const roomCode = useGameStore((s) => s.roomCode);
  const mpStatus = useGameStore((s) => s.mpStatus);
  const peerCount = useGameStore((s) => s.peerCount);
  const interact = useGameStore((s) => s.interact);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const closePanels = useGameStore((s) => s.closePanels);
  const buyItem = useGameStore((s) => s.buyItem);
  const setMutedStore = useGameStore((s) => s.setMuted);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const showToast = useGameStore((s) => s.showToast);
  const sendChat = useGameStore((s) => s.sendChat);
  const equippedWeapon = useGameStore((s) => s.equippedWeapon);
  const setEquippedWeapon = useGameStore((s) => s.setEquippedWeapon);
  const tryFire = useGameStore((s) => s.tryFire);
  const fixedLeaks = useGameStore((s) => s.fixedLeaks);
  const [chatText, setChatText] = useState('');
  const chatLogRef = useRef(null);

  // Keep newest messages in view when chat grows / wraps
  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const xpNeed = player.level * 100;
  const xpPct = Math.min(100, (player.xp / xpNeed) * 100);
  const leaksLeft = PIPE_LEAKS.length - fixedLeaks.length;

  const inviteUrl = roomCode
    ? roomInviteUrl(roomCode)
    : typeof window !== 'undefined'
      ? window.location.href.split('?')[0]
      : 'https://robdon3.github.io/Cozy_Town/';

  const share = async () => {
    sfx.share();
    const data = roomCode
      ? {
          title: 'Join my Cozy Town room!',
          text: `Play with me in Cozy Town room ${roomCode}! I'm ${player.name} (Lv.${player.level}) 🏡`,
          url: inviteUrl,
        }
      : {
          title: 'Cozy Town 3D',
          text: `Join me in Cozy Town! I'm ${player.name} (Lv.${player.level}).`,
          url: inviteUrl,
        };
    try {
      if (navigator.share) {
        await navigator.share(data);
        showToast('Thanks for sharing!');
      } else {
        await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
        showToast(roomCode ? 'Invite link copied!' : 'Link copied!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('Link copied!');
      } catch {
        showToast('Copy failed — select the link');
      }
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedStore(next);
    setAudioMuted(next);
    if (next) stopMusic();
    else startMusic();
    sfx.click();
  };

  const submitChat = (e) => {
    e?.preventDefault?.();
    if (!chatText.trim()) return;
    sendChat(chatText);
    setChatText('');
    sfx.click();
  };

  const mpLabel =
    !roomCode
      ? null
      : mpStatus === 'connecting'
        ? 'Connecting…'
        : mpStatus === 'live'
          ? `${peerCount} online`
          : 'Offline';

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="top-bar">
          <div className="stat-pills">
            <div className="pill">
              <span className="icon">💰</span>
              {player.coins}
            </div>
            <div className="pill">
              <span className="icon">⭐</span>
              Lv.{player.level}
              <div className="xp-track" title={`${player.xp}/${xpNeed} XP`}>
                <div className="xp-fill" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="pill">
              <span className="icon">❤️</span>
              <div className="energy-track">
                <div className="energy-fill" style={{ width: `${player.energy}%` }} />
              </div>
            </div>
            {roomCode && (
              <div className={`pill mp-pill ${mpStatus}`}>
                <span className="icon">🟢</span>
                <span className="room-code">{roomCode}</span>
                <span className="mp-meta">{mpLabel}</span>
              </div>
            )}
            <div className="pill" title="Leaking pipes left">
              <span className="icon">💧</span>
              {leaksLeft}
            </div>
            <div className="pill" title="Blaster ammo">
              <span className="icon">🔫</span>
              {player.ammo ?? 0}
            </div>
            <div className="pill" title="Grenades">
              <span className="icon">💣</span>
              {player.grenades ?? 0}
            </div>
          </div>
          <div className="top-bar-actions">
            <button className="icon-btn" onClick={share} title="Share invite">
              📤
            </button>
            <button
              className={`icon-btn ${panels.chat ? 'active' : ''}`}
              onClick={() => togglePanel('chat')}
              title="Chat"
            >
              💬
            </button>
            <button
              className={`icon-btn ${muted ? 'active' : ''}`}
              onClick={toggleMute}
              title="Sound"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              className={`icon-btn ${panels.menu ? 'active' : ''}`}
              onClick={() => togglePanel('menu')}
              title="Menu"
            >
              ☰
            </button>
          </div>
        </div>

        <div className="chat-log" ref={chatLogRef}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-line ${m.system ? 'system' : ''}`}>
              <strong>{m.sender}:</strong> {m.text}
            </div>
          ))}
        </div>
      </div>

      {panels.menu && <MiniMap />}

      {panels.menu && (
        <div className="menu-panel">
          <button
            onClick={() => {
              closePanels();
              togglePanel('quests');
            }}
          >
            📜 Quests
          </button>
          <button
            onClick={() => {
              closePanels();
              togglePanel('inventory');
            }}
          >
            🎒 Inventory
          </button>
          <button
            onClick={() => {
              closePanels();
              togglePanel('share');
            }}
          >
            🤝 Invite friends
          </button>
          <button
            onClick={() => {
              closePanels();
              togglePanel('settings');
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      )}

      {panels.chat && (
        <form className="chat-compose" onSubmit={submitChat}>
          <input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder={roomCode ? 'Say hi to the room…' : 'Local note…'}
            maxLength={120}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ flex: '0 0 auto', padding: '10px 14px' }}>
            Send
          </button>
        </form>
      )}

      <div className="hint">
        {nearby
          ? `Near ${nearby.emoji} ${nearby.name}${nearby.title ? ` · ${nearby.title}` : ''} — ${nearby.action} (Space)`
          : 'Drag to look · Q/E orbit · F fire · 1 blaster / 2 grenade · Space interact'}
      </div>

      <LookStick />

      <div className="weapon-bar">
        <button
          type="button"
          className={`weapon-slot ${equippedWeapon === 'gun' ? 'active' : ''}`}
          onClick={() => setEquippedWeapon('gun')}
        >
          <span>🔫</span>
          <small>1</small>
        </button>
        <button
          type="button"
          className={`weapon-slot ${equippedWeapon === 'grenade' ? 'active' : ''}`}
          onClick={() => setEquippedWeapon('grenade')}
        >
          <span>💣</span>
          <small>2</small>
        </button>
        <button type="button" className="fire-btn" onClick={() => tryFire()}>
          FIRE
        </button>
      </div>

      <div className="bottom-ui">
        <div style={{ minWidth: 88 }}>
          {nearby && (
            <button className="interact-btn" onClick={() => interact()}>
              <span className="emoji">{nearby.emoji}</span>
              <span className="label">{nearby.action}</span>
            </button>
          )}
        </div>
        <Joystick />
      </div>

      {toast && <div className="toast">{toast}</div>}

      {panels.quests && (
        <Modal title="Quests" onClose={closePanels}>
          <p>Complete activities around town to earn coins and XP.</p>
          {QUESTS.map((q) => {
            const done = completedQuests.includes(q.id);
            return (
              <div key={q.id} className={`quest-card ${done ? 'done' : ''}`}>
                <h3>
                  {q.title}
                  {done && <span className="done-tag">✓ Done</span>}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{q.description}</div>
                <div className="reward">
                  Reward: {q.reward.coins} coins · {q.reward.xp} XP
                </div>
              </div>
            );
          })}
        </Modal>
      )}

      {panels.inventory && (
        <Modal title="Inventory" onClose={closePanels}>
          {player.inventory.length === 0 ? (
            <p>Empty for now. Fish, chop, mine, or visit the shop!</p>
          ) : (
            player.inventory.map((item) => (
              <div key={item.id} className="inv-item">
                <span>
                  {item.emoji} {item.name}
                </span>
                <span>×{item.quantity}</span>
              </div>
            ))
          )}
        </Modal>
      )}

      {panels.shop && (
        <Modal title="General Store" onClose={closePanels}>
          <p>Spend your coins on useful goodies.</p>
          {SHOP_ITEMS.map((item) => (
            <div key={item.id} className="shop-item">
              <div className="meta">
                <div className="name">
                  {item.emoji} {item.name}
                </div>
                <div className="desc">{item.desc}</div>
              </div>
              <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={() => buyItem(item.id)}>
                {item.price}💰
              </button>
            </div>
          ))}
        </Modal>
      )}

      {panels.share && (
        <Modal title={roomCode ? `Invite to room ${roomCode}` : 'Invite friends'} onClose={closePanels}>
          {roomCode ? (
            <p>
              Send this link — friends open it, pick a name, and hit <strong>Join</strong> to appear in
              your town (live P2P multiplayer).
            </p>
          ) : (
            <p>
              You&apos;re in solo mode. Create a multiplayer room from the title screen, or share the
              game link so friends can play too.
            </p>
          )}
          <div className="share-box">{inviteUrl}</div>
          {roomCode && (
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              Room code: <strong style={{ letterSpacing: '0.15em' }}>{roomCode}</strong>
            </p>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={share}>
              Share / Copy invite
            </button>
            <button className="btn btn-secondary" onClick={closePanels}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {panels.settings && (
        <Modal title="Settings" onClose={closePanels}>
          <p>
            Playing as{' '}
            <strong>
              {player.avatar} {player.name}
            </strong>{' '}
            · Level {player.level}
            {roomCode ? (
              <>
                <br />
                Multiplayer room <strong>{roomCode}</strong> · {mpLabel}
              </>
            ) : (
              <>
                <br />
                Mode: Solo
              </>
            )}
          </p>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={toggleMute}>
              {muted ? 'Unmute sound' : 'Mute sound'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset this world? Leaks, quests, inventory, and ammo will refresh. You’ll stay in-game.'
                  )
                ) {
                  resetProgress();
                  closePanels();
                }
              }}
            >
              Reset world
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Hard reload the latest game from the server? Clears cache + saves and refreshes the page.'
                  )
                ) {
                  import('../game/resetWorld').then(({ hardResetWorldAndReload }) =>
                    hardResetWorldAndReload({ keepRoom: Boolean(roomCode) })
                  );
                }
              }}
            >
              Reload latest build
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
