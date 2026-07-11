import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/store';
import { PERSONAL_FIXES_FOR_MASTER, PLAYER_MAX_HP, PIPE_LEAKS, QUESTS, SHOP_ITEMS } from '../game/data';
import Joystick from './Joystick';
import LookStick from './LookStick';
import MiniMap from './MiniMap';
import QuestCompass from './QuestCompass';
import { sfx, setMuted as setAudioMuted, startMusic, stopMusic } from '../audio/sounds';
import { roomInviteUrl } from '../game/multiplayer';

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
  const leaveToTitle = useGameStore((s) => s.leaveToTitle);
  const showToast = useGameStore((s) => s.showToast);
  const mpError = useGameStore((s) => s.mpError);
  const sendChat = useGameStore((s) => s.sendChat);
  const equippedWeapon = useGameStore((s) => s.equippedWeapon);
  const setEquippedWeapon = useGameStore((s) => s.setEquippedWeapon);
  const setFireHeld = useGameStore((s) => s.setFireHeld);
  const openLeaks = useGameStore((s) => s.openLeaks);
  const personalFixes = useGameStore((s) => s.personalFixes);
  const interiorId = useGameStore((s) => s.interiorId);
  const [chatText, setChatText] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashHiding, setFlashHiding] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(true);
  const chatLogRef = useRef(null);
  const lastMsgId = useRef(null);
  const flashTimer = useRef(null);

  // Hide generic controls tip after a few seconds
  useEffect(() => {
    const t = setTimeout(() => setShowControlsHint(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const latestMsg = messages.length ? messages[messages.length - 1] : null;
  const visibleLog = messages.slice(-8);

  // Flash only the newest line briefly; full history stays behind 💬
  useEffect(() => {
    if (!latestMsg) return;
    if (latestMsg.id === lastMsgId.current) return;
    lastMsgId.current = latestMsg.id;

    if (chatExpanded || panels.chat) return;

    setFlashHiding(false);
    setFlashVisible(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashHiding(true);
      flashTimer.current = setTimeout(() => {
        setFlashVisible(false);
        setFlashHiding(false);
      }, 380);
    }, 3200);

    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [latestMsg, chatExpanded, panels.chat]);

  useEffect(() => {
    const el = chatLogRef.current;
    if (!el || !chatExpanded) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, chatExpanded, panels.chat]);

  const openChat = () => {
    setChatExpanded(true);
    setFlashVisible(false);
    if (!panels.chat) togglePanel('chat');
  };

  const closeChat = () => {
    setChatExpanded(false);
    setFlashVisible(false);
    if (panels.chat) closePanels();
  };

  const xpNeed = player.level * 100;
  const xpPct = Math.min(100, (player.xp / xpNeed) * 100);
  const leaksOpen = openLeaks.length;
  const hpPct = Math.max(0, Math.min(100, ((player.hp ?? PLAYER_MAX_HP) / PLAYER_MAX_HP) * 100));

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
      : mpError
        ? 'Error'
        : mpStatus === 'connecting'
          ? 'Connecting…'
          : mpStatus === 'live'
            ? `${peerCount} friend${peerCount === 1 ? '' : 's'}`
            : 'Offline';

  return (
    <div className="hud">
      {/* Top chrome: slim stats left · actions + map right */}
      <div className="hud-chrome">
        <div className="hud-top-row">
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
            <div className="pill" title="Health">
              <span className="icon">❤️</span>
              <div className="energy-track">
                <div
                  className="energy-fill hp-fill"
                  style={{
                    width: `${hpPct}%`,
                    background:
                      hpPct < 35
                        ? 'linear-gradient(90deg,#ff5c5c,#c23b22)'
                        : 'linear-gradient(90deg,#ff8a8a,#e85d5d)',
                  }}
                />
              </div>
            </div>
            <div className="pill" title="Energy">
              <span className="icon">⚡</span>
              <div className="energy-track">
                <div className="energy-fill" style={{ width: `${player.energy}%` }} />
              </div>
            </div>
          </div>

          <div className="hud-top-right">
            <div className="top-bar-actions">
              <button className="icon-btn" onClick={share} title="Share invite">
                📤
              </button>
              <button
                className={`icon-btn ${chatExpanded || panels.chat ? 'active' : ''}`}
                onClick={() => {
                  if (chatExpanded || panels.chat) closeChat();
                  else openChat();
                }}
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
            <MiniMap />
          </div>
        </div>

        {(roomCode || leaksOpen > 0 || personalFixes > 0 || interiorId) && (
          <div className="hud-chips">
            {roomCode && (
              <div className={`chip mp-chip ${mpStatus}`}>
                <span>🟢</span>
                <span className="room-code">{roomCode}</span>
                {mpLabel && <span className="mp-meta">{mpLabel}</span>}
              </div>
            )}
            {interiorId && (
              <div className="chip" title="Indoors">
                🏠 Inside
              </div>
            )}
            {leaksOpen > 0 && (
              <div className="chip" title="Active leaks in town">
                💧 {leaksOpen}/{PIPE_LEAKS.length}
              </div>
            )}
            <div className="chip" title="Your personal pipe fixes (quests)">
              🔧 You: {personalFixes}/{PERSONAL_FIXES_FOR_MASTER}
            </div>
          </div>
        )}

        <QuestCompass />
      </div>

      <div className="chat-dock">
        {chatExpanded || panels.chat ? (
          <div className="chat-panel">
            <div className="chat-panel-head">
              <span>Chat {roomCode ? `· ${roomCode}` : ''}</span>
              <button type="button" onClick={closeChat} aria-label="Close chat">
                ✕
              </button>
            </div>
            <div className="chat-log" ref={chatLogRef}>
              {visibleLog.map((m) => (
                <div key={m.id} className={`chat-line ${m.system ? 'system' : ''}`}>
                  <strong>{m.sender}:</strong> {m.text}
                </div>
              ))}
            </div>
            <form className="chat-compose" onSubmit={submitChat}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={roomCode ? 'Message friends…' : 'Note…'}
                maxLength={120}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: '0 0 auto', padding: '10px 14px' }}
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          flashVisible &&
          latestMsg && (
            <button
              type="button"
              className={`chat-flash ${latestMsg.system ? 'system' : ''} ${flashHiding ? 'hiding' : ''}`}
              onClick={openChat}
              title="Open chat"
            >
              <span className="chat-flash-body">
                <strong>{latestMsg.sender}:</strong>
                {latestMsg.text}
              </span>
              <span
                className="chat-flash-x"
                onClick={(e) => {
                  e.stopPropagation();
                  setFlashVisible(false);
                }}
                role="presentation"
              >
                ✕
              </span>
            </button>
          )
        )}
      </div>

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
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Leave to the title screen so you can join a new room with friends? Progress stays on this device.'
                )
              ) {
                closePanels();
                leaveToTitle({ clearRoom: true });
              }
            }}
          >
            🏠 Leave / new room
          </button>
        </div>
      )}

      {/* Nearby-only tip (generic controls auto-hide) */}
      {(nearby || showControlsHint) && (
        <div className={`hint ${nearby ? 'nearby' : 'controls'}`}>
          {nearby
            ? `${nearby.emoji} ${nearby.name} — ${nearby.action}`
            : 'MOVE left · LOOK right · hold FIRE · Space interact'}
        </div>
      )}

      {player.hp <= 0 && (
        <div className="death-banner">💀 Eliminated — respawning…</div>
      )}

      <div className="bottom-zone">
        <div className="weapon-bar">
          <button
            type="button"
            className={`weapon-slot ${equippedWeapon === 'gun' ? 'active' : ''}`}
            onClick={() => setEquippedWeapon('gun')}
            title="Blaster"
          >
            <span>🔫</span>
            <small>{player.ammo ?? 0}</small>
          </button>
          <button
            type="button"
            className={`weapon-slot ${equippedWeapon === 'grenade' ? 'active' : ''}`}
            onClick={() => setEquippedWeapon('grenade')}
            title="Grenade"
          >
            <span>💣</span>
            <small>{player.grenades ?? 0}</small>
          </button>
          <button
            type="button"
            className="fire-btn"
            disabled={Boolean(interiorId) || player.hp <= 0}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture?.(e.pointerId);
              setFireHeld(true);
            }}
            onPointerUp={() => setFireHeld(false)}
            onPointerCancel={() => setFireHeld(false)}
            onLostPointerCapture={() => setFireHeld(false)}
            title="Hold FIRE while using MOVE stick"
          >
            FIRE
          </button>
        </div>

        {/* Normal controller layout: MOVE left, LOOK right */}
        <div className="bottom-ui">
          <div className="bottom-left">
            <div className="stick-label">MOVE</div>
            <Joystick />
            {nearby && (
              <button className="interact-btn" onClick={() => interact()}>
                <span className="emoji">{nearby.emoji}</span>
                <span className="label">{nearby.action}</span>
              </button>
            )}
          </div>
          <div className="bottom-right">
            <LookStick />
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {panels.quests && (
        <Modal title="Quests" onClose={closePanels}>
          <p>Complete activities around town to earn coins and XP.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Personal pipe fixes: <strong>{personalFixes}</strong> (NPC seals don’t count)
          </p>
          {QUESTS.map((q) => {
            const done = completedQuests.includes(q.id);
            let progress = '';
            if (q.completeOn === 'fixpipe-all' && !done) {
              progress = ` · ${personalFixes}/${PERSONAL_FIXES_FOR_MASTER}`;
            }
            return (
              <div key={q.id} className={`quest-card ${done ? 'done' : ''}`}>
                <h3>
                  {q.title}
                  {done && <span className="done-tag">✓ Done</span>}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {q.description}
                  {progress}
                </div>
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
                {mpError && (
                  <>
                    <br />
                    <span style={{ color: '#ff8a8a', fontSize: 13 }}>{mpError}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <br />
                Mode: Solo — open Invite or Leave to title to join friends
              </>
            )}
          </p>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                if (
                  window.confirm(
                    'Leave to the title screen? Your profile stays saved on this device so you can create or join a new room with friends.'
                  )
                ) {
                  closePanels();
                  leaveToTitle({ clearRoom: true });
                }
              }}
            >
              🏠 Leave to title / new room
            </button>
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
