import { create } from 'zustand';
import {
  ACTIVITIES,
  AVATARS,
  BUILDINGS,
  INTERACT_RANGE,
  NPCS,
  QUESTS,
  SHOP_ITEMS,
} from './data';
import { sfx } from '../audio/sounds';

const SAVE_KEY = 'cozy-town-v2';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function defaultPlayer() {
  return {
    name: 'Explorer',
    avatar: AVATARS[0],
    x: 0,
    z: 0,
    coins: 150,
    level: 1,
    xp: 0,
    energy: 100,
    inventory: [],
  };
}

const saved = loadSave();

function addInventoryItem(inventory, item) {
  if (!item) return inventory;
  const existing = inventory.find((i) => i.id === item.id);
  if (existing) {
    return inventory.map((i) =>
      i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  }
  return [...inventory, { ...item, quantity: 1 }];
}

export const useGameStore = create((set, get) => ({
  started: false,
  player: saved?.player ?? defaultPlayer(),
  completedQuests: saved?.completedQuests ?? [],
  messages: [
    { id: 1, sender: 'System', text: 'Welcome to Cozy Town 3D! 🌟', system: true },
  ],
  panels: {
    menu: false,
    quests: false,
    inventory: false,
    shop: false,
    share: false,
    settings: false,
    chat: false,
  },
  nearby: null,
  muted: saved?.muted ?? false,
  toast: null,
  moveInput: { x: 0, z: 0 },

  // multiplayer
  roomCode: null,
  mpStatus: 'offline', // offline | connecting | live
  peerCount: 0,
  remotePlayers: {}, // peerId -> { name, avatar, x, z, level, color }
  selfPeerId: null,
  netSendState: null, // fn set by MultiplayerBridge
  netSendChat: null,

  setMoveInput(x, z) {
    set({ moveInput: { x, z } });
  },

  startGame(name, avatar, options = {}) {
    const player = {
      ...get().player,
      name: (name || 'Explorer').slice(0, 16),
      avatar: avatar || AVATARS[0],
    };
    const roomCode = options.roomCode || null;
    set({
      started: true,
      player,
      roomCode,
      mpStatus: roomCode ? 'connecting' : 'offline',
      peerCount: 0,
      remotePlayers: {},
    });
    if (roomCode) {
      get().pushMessage(
        'System',
        `Joining multiplayer room ${roomCode}… share the invite link with friends!`,
        true
      );
    } else {
      get().pushMessage('System', `Welcome, ${player.name}! Explore the town (solo).`, true);
    }
    get().save();
  },

  setNetHandlers({ sendState, sendChat }) {
    set({ netSendState: sendState || null, netSendChat: sendChat || null });
  },

  setMpMeta({ status, peerCount, selfPeerId }) {
    set((s) => ({
      mpStatus: status ?? s.mpStatus,
      peerCount: peerCount ?? s.peerCount,
      selfPeerId: selfPeerId ?? s.selfPeerId,
    }));
  },

  upsertRemotePlayer(peerId, data) {
    set((s) => ({
      remotePlayers: {
        ...s.remotePlayers,
        [peerId]: {
          name: 'Friend',
          avatar: '😊',
          x: 0,
          z: 0,
          level: 1,
          color: '#F8A5C2',
          ...s.remotePlayers[peerId],
          ...data,
          id: peerId,
        },
      },
    }));
  },

  removeRemotePlayer(peerId) {
    set((s) => {
      const next = { ...s.remotePlayers };
      delete next[peerId];
      return { remotePlayers: next };
    });
  },

  clearRemotePlayers() {
    set({ remotePlayers: {}, peerCount: 0 });
  },

  setPlayerPos(x, z) {
    set((s) => ({ player: { ...s.player, x, z } }));
  },

  broadcastState(override = null) {
    const { player, netSendState, roomCode } = get();
    if (!roomCode || !netSendState) return;
    netSendState({
      name: player.name,
      avatar: player.avatar,
      x: override?.x ?? player.x,
      z: override?.z ?? player.z,
      level: player.level,
      color: '#6EC6FF',
    });
  },

  sendChat(text) {
    const cleaned = String(text || '').trim().slice(0, 120);
    if (!cleaned) return;
    const { player, netSendChat, roomCode } = get();
    get().pushMessage(player.name, cleaned, false);
    if (roomCode && netSendChat) {
      netSendChat({ name: player.name, text: cleaned, avatar: player.avatar });
    }
  },

  pushMessage(sender, text, system = false) {
    set((s) => ({
      messages: [
        ...s.messages.slice(-8),
        { id: Date.now() + Math.random(), sender, text, system },
      ],
    }));
  },

  showToast(text) {
    set({ toast: text });
    setTimeout(() => {
      if (get().toast === text) set({ toast: null });
    }, 2200);
  },

  togglePanel(key) {
    sfx.click();
    set((s) => {
      const panels = Object.fromEntries(
        Object.keys(s.panels).map((k) => [k, false])
      );
      panels[key] = !s.panels[key];
      return { panels };
    });
  },

  closePanels() {
    set({
      panels: {
        menu: false,
        quests: false,
        inventory: false,
        shop: false,
        share: false,
        settings: false,
        chat: false,
      },
    });
  },

  setMuted(muted) {
    set({ muted });
    get().save();
  },

  updateNearby(px, pz) {
    let best = null;
    let bestDist = INTERACT_RANGE;

    for (const b of BUILDINGS) {
      const dx = px - b.x;
      const dz = pz - b.z;
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'building',
          id: b.id,
          name: b.name,
          emoji: b.emoji,
          action: b.action,
          activity: b.activity,
        };
      }
    }

    for (const n of NPCS) {
      const dist = Math.hypot(px - n.x, pz - n.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'npc',
          id: n.id,
          name: n.name,
          emoji: n.emoji,
          action: 'Talk',
          dialogue: n.dialogue,
        };
      }
    }

    const prev = get().nearby;
    if (
      (prev?.type !== best?.type || prev?.id !== best?.id) &&
      best
    ) {
      /* no sfx spam on enter */
    }
    set({ nearby: best });
  },

  grantXp(amount) {
    const player = get().player;
    let xp = player.xp + amount;
    let level = player.level;
    let leveled = false;
    while (xp >= level * 100) {
      xp -= level * 100;
      level += 1;
      leveled = true;
    }
    set({ player: { ...player, xp, level } });
    if (leveled) {
      sfx.levelUp();
      get().pushMessage('System', `Level up! You are now level ${level}! 🎉`, true);
      get().showToast(`Level ${level}!`);
    }
  },

  completeQuestIfNeeded(activityKey) {
    const { completedQuests } = get();
    const quest = QUESTS.find(
      (q) => q.completeOn === activityKey && !completedQuests.includes(q.id)
    );
    if (!quest) return;
    set({ completedQuests: [...completedQuests, quest.id] });
    const player = get().player;
    set({
      player: {
        ...player,
        coins: player.coins + quest.reward.coins,
      },
    });
    get().grantXp(quest.reward.xp);
    sfx.quest();
    get().pushMessage(
      'System',
      `Quest complete: ${quest.title}! +${quest.reward.coins}💰 +${quest.reward.xp}XP`,
      true
    );
    get().showToast(`Quest: ${quest.title}`);
    get().save();
  },

  interact() {
    const { nearby, player } = get();
    if (!nearby) return;

    if (nearby.type === 'npc') {
      sfx.talk();
      get().pushMessage(nearby.name, nearby.dialogue);
      return;
    }

    const activityKey = nearby.activity;
    if (activityKey === 'shop') {
      sfx.interact();
      set((s) => ({ panels: { ...s.panels, shop: true, menu: false } }));
      return;
    }
    if (activityKey === 'townhall') {
      sfx.interact();
      set((s) => ({ panels: { ...s.panels, quests: true, menu: false } }));
      get().completeQuestIfNeeded('townhall');
      get().save();
      return;
    }

    const act = ACTIVITIES[activityKey];
    if (!act) return;

    const energyCost = act.energy < 0 ? Math.abs(act.energy) : 0;
    if (player.energy < energyCost) {
      sfx.error();
      get().pushMessage('System', "You're too tired! Rest at the cafe. ☕", true);
      return;
    }
    if (act.coins < 0 && player.coins < Math.abs(act.coins)) {
      sfx.error();
      get().pushMessage('System', 'Not enough coins!', true);
      return;
    }

    if (activityKey === 'fish') sfx.fish();
    else if (activityKey === 'chop') sfx.chop();
    else if (activityKey === 'mine') sfx.mine();
    else if (activityKey === 'cafe') sfx.cafe();
    else sfx.interact();

    if (act.coins > 0) sfx.coin();

    const inventory = addInventoryItem(player.inventory, act.item);
    set({
      player: {
        ...player,
        coins: player.coins + act.coins,
        energy: Math.max(0, Math.min(100, player.energy + act.energy)),
        inventory,
      },
    });
    get().grantXp(act.xp);
    get().pushMessage('System', act.message, true);
    get().completeQuestIfNeeded(activityKey);
    get().save();
  },

  buyItem(itemId) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    const player = get().player;
    if (player.coins < item.price) {
      sfx.error();
      get().showToast('Not enough coins');
      return;
    }

    let energy = player.energy;
    let inventory = player.inventory;
    if (item.id === 'snack') {
      energy = Math.min(100, energy + 15);
    } else {
      inventory = addInventoryItem(inventory, {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
      });
    }

    sfx.coin();
    set({
      player: {
        ...player,
        coins: player.coins - item.price,
        energy,
        inventory,
      },
    });
    get().pushMessage('System', `Bought ${item.emoji} ${item.name}!`, true);
    get().save();
  },

  save() {
    const { player, completedQuests, muted } = get();
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          player: {
            name: player.name,
            avatar: player.avatar,
            coins: player.coins,
            level: player.level,
            xp: player.xp,
            energy: player.energy,
            inventory: player.inventory,
            x: player.x,
            z: player.z,
          },
          completedQuests,
          muted,
        })
      );
    } catch {
      /* ignore quota */
    }
  },

  resetProgress() {
    const name = get().player.name;
    const avatar = get().player.avatar;
    localStorage.removeItem(SAVE_KEY);
    set({
      player: { ...defaultPlayer(), name, avatar },
      completedQuests: [],
      messages: [
        { id: Date.now(), sender: 'System', text: 'Progress reset. Fresh start!', system: true },
      ],
    });
    get().save();
  },
}));
