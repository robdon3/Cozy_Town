import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';
import { BUILDINGS, QUESTS, SHOP_ITEMS, WORLD } from '../game/data';
import Joystick from './Joystick';
import { sfx, setMuted as setAudioMuted, startMusic, stopMusic } from '../audio/sounds';

function MiniMap() {
  const canvasRef = useRef(null);
  const player = useGameStore((s) => s.player);

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

    ctx.fillStyle = '#ff5c5c';
    ctx.beginPath();
    ctx.arc(sx(player.x), sy(player.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }, [player.x, player.z]);

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
  const interact = useGameStore((s) => s.interact);
  const togglePanel = useGameStore((s) => s.togglePanel);
  const closePanels = useGameStore((s) => s.closePanels);
  const buyItem = useGameStore((s) => s.buyItem);
  const setMutedStore = useGameStore((s) => s.setMuted);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const showToast = useGameStore((s) => s.showToast);

  const xpNeed = player.level * 100;
  const xpPct = Math.min(100, (player.xp / xpNeed) * 100);
  const gameUrl =
    typeof window !== 'undefined'
      ? window.location.href.split('?')[0]
      : 'https://robdon3.github.io/Cozy_Town/';

  const share = async () => {
    sfx.share();
    const data = {
      title: 'Cozy Town 3D',
      text: `Join me in Cozy Town! I'm ${player.name} (Lv.${player.level}). Explore, fish, mine, and hang out 🏡`,
      url: gameUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        showToast('Thanks for sharing!');
      } else {
        await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
        showToast('Link copied!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(gameUrl);
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

  return (
    <div className="hud">
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
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" onClick={share} title="Share with friends">
            📤
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

      <div className="chat-log">
        {messages.map((m) => (
          <div key={m.id} className={`chat-line ${m.system ? 'system' : ''}`}>
            <strong>{m.sender}:</strong> {m.text}
          </div>
        ))}
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

      <div className="hint">
        {nearby
          ? `Near ${nearby.emoji} ${nearby.name} — tap Interact or press E / Space`
          : 'WASD / joystick to move · E or Space to interact'}
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
        <Modal title="Invite friends" onClose={closePanels}>
          <p>
            Share this link so friends can play Cozy Town in their browser — no install needed.
          </p>
          <div className="share-box">{gameUrl}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={share}>
              Share / Copy link
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
            Playing as <strong>{player.avatar} {player.name}</strong> · Level {player.level}
          </p>
          <div className="btn-row">
            <button className="btn btn-secondary" onClick={toggleMute}>
              {muted ? 'Unmute sound' : 'Mute sound'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Reset all progress?')) {
                  resetProgress();
                  closePanels();
                }
              }}
            >
              Reset progress
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
