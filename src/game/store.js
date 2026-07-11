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
  },
  nearby: null,
  muted: saved?.muted ?? false,
  toast: null,
  moveInput: { x: 0, z: 0 },

  setMoveInput(x, z) {
    set({ moveInput: { x, z } });
  },

  startGame(name, avatar) {
    const player = {
      ...get().player,
      name: (name || 'Explorer').slice(0, 16),
      avatar: avatar || AVATARS[0],
    };
    set({ started: true, player });
    get().pushMessage('System', `Welcome, ${player.name}! Explore the town.`, true);
    get().save();
  },

  setPlayerPos(x, z) {
    set((s) => ({ player: { ...s.player, x, z } }));
  },

  pushMessage(sender, text, system = false) {
    set((s) => ({
      messages: [
        ...s.messages.slice(-5),
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
