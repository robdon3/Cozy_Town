import { create } from 'zustand';
import {
  ACTIVITIES,
  AVATARS,
  BUILDINGS,
  GROUND_PICKUPS,
  INTERACT_RANGE,
  INTERIOR_INTERACT_RANGE,
  INTERIORS,
  LEAK_RESPAWN_MAX,
  LEAK_RESPAWN_MIN,
  NPCS,
  PERSONAL_FIXES_FOR_MASTER,
  PICKUP_RESPAWN_MAX,
  PICKUP_RESPAWN_MIN,
  PIPE_LEAKS,
  PLAYER_MAX_HP,
  QUESTS,
  SHOP_ITEMS,
  WEAPONS,
} from './data';
import { sfx } from '../audio/sounds';
import { getLookBasis, setIndoorCamera } from './lookState';
import { clearRoomFromUrl, disconnectMultiplayer } from './multiplayer';
import { damageNpcRuntime, getNpcPos, isNpcAlive } from './npcRuntime';

const SAVE_KEY = 'cozy-town-v3';
const PROFILE_KEY = 'cozy-town-profile-v1';

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasSavedProfile() {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
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
    hp: PLAYER_MAX_HP,
    inventory: [],
    ammo: 40,
    grenades: 6,
  };
}

/** All leaks start active (open). */
function defaultOpenLeaks() {
  return PIPE_LEAKS.map((l) => l.id);
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

function randomRespawnMs() {
  const sec =
    LEAK_RESPAWN_MIN + Math.random() * (LEAK_RESPAWN_MAX - LEAK_RESPAWN_MIN);
  return sec * 1000;
}

function randomPickupRespawnMs() {
  const sec =
    PICKUP_RESPAWN_MIN +
    Math.random() * (PICKUP_RESPAWN_MAX - PICKUP_RESPAWN_MIN);
  return sec * 1000;
}

export const useGameStore = create((set, get) => ({
  started: false,
  player: {
    ...defaultPlayer(),
    ...(saved?.player || {}),
    ammo: saved?.player?.ammo ?? defaultPlayer().ammo,
    grenades: saved?.player?.grenades ?? defaultPlayer().grenades,
    hp: saved?.player?.hp ?? PLAYER_MAX_HP,
  },
  completedQuests: saved?.completedQuests ?? [],
  /** Personal pipe fixes only (quests use this) */
  personalFixes: saved?.personalFixes ?? 0,
  /** Flowers / mushrooms picked (quest progress) */
  personalPickups: saved?.personalPickups ?? 0,
  /**
   * World leak state: which leaks are currently open.
   * When fixed (player or NPC), removed; scheduled to reappear.
   */
  openLeaks: saved?.openLeaks ?? defaultOpenLeaks(),
  /** @type {Record<string, number>} leakId -> respawn timestamp */
  leakRespawnAt: {},
  /** Pickup ids currently missing from world */
  collectedPickups: [],
  /** @type {Record<string, number>} pickupId -> respawn timestamp */
  pickupRespawnAt: {},
  /** Pokemon-style interior id or null (outside) */
  interiorId: null,
  outdoorPos: { x: 0, z: 0 },
  npcDialogueIndex: {},
  /** version bump for UI chips */
  mpError: null,
  messages: [
    {
      id: 1,
      sender: 'System',
      text: 'Welcome to Cozy Town! Meet the plumber crew + Billy ♿ at the square 🔧',
      system: true,
    },
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
  lookInput: { x: 0, y: 0 },
  fireHeld: false,

  // weapons & FX
  equippedWeapon: 'gun',
  projectiles: [],
  explosions: [],
  fireRequest: null,

  // multiplayer
  roomCode: null,
  mpStatus: 'offline',
  peerCount: 0,
  remotePlayers: {},
  selfPeerId: null,
  netSendState: null,
  netSendChat: null,
  netSendFire: null,
  netSendHit: null,

  /** invuln after respawn / hit flash */
  invulnUntil: 0,
  lastKiller: null,

  setMoveInput(x, z) {
    set({ moveInput: { x, z } });
  },

  setLookInput(x, y) {
    set({ lookInput: { x, y } });
  },

  setFireHeld(held) {
    set({ fireHeld: Boolean(held) });
  },

  setEquippedWeapon(weapon) {
    sfx.click();
    set({ equippedWeapon: weapon });
  },

  startGame(name, avatar, options = {}) {
    const player = {
      ...get().player,
      name: (name || 'Explorer').slice(0, 16),
      avatar: avatar || AVATARS[0],
      hp: get().player.hp > 0 ? get().player.hp : PLAYER_MAX_HP,
    };
    const roomCode = options.roomCode || null;
    setIndoorCamera(false);
    set({
      started: true,
      player,
      roomCode,
      mpStatus: roomCode ? 'connecting' : 'offline',
      mpError: null,
      peerCount: 0,
      remotePlayers: {},
      interiorId: null,
    });
    if (roomCode) {
      get().pushMessage(
        'System',
        `Joining multiplayer room ${roomCode}… friends need the same code/link. Keep this tab open while connecting!`,
        true
      );
    } else {
      get().pushMessage(
        'System',
        `Welcome, ${player.name}! Explore, pick flowers, or open Menu → Leave to join friends.`,
        true
      );
    }
    get().save();
  },

  /**
   * Return to title screen so you can create/join a different room.
   * Keeps local profile progress.
   */
  leaveToTitle({ clearRoom = true } = {}) {
    get().save();
    disconnectMultiplayer();
    if (clearRoom) clearRoomFromUrl();
    setIndoorCamera(false);
    set({
      started: false,
      roomCode: null,
      mpStatus: 'offline',
      mpError: null,
      peerCount: 0,
      remotePlayers: {},
      interiorId: null,
      netSendState: null,
      netSendChat: null,
      netSendFire: null,
      netSendHit: null,
      fireHeld: false,
      fireRequest: null,
      projectiles: [],
      explosions: [],
      nearby: null,
      moveInput: { x: 0, z: 0 },
      lookInput: { x: 0, y: 0 },
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
    get().showToast('Back at title — join friends anytime');
  },

  setNetHandlers({ sendState, sendChat, sendFire, sendHit }) {
    set({
      netSendState: sendState || null,
      netSendChat: sendChat || null,
      netSendFire: sendFire || null,
      netSendHit: sendHit || null,
    });
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
          hp: PLAYER_MAX_HP,
          alive: true,
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
      hp: player.hp,
      alive: player.hp > 0,
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
        ...s.messages.slice(-10),
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

  isLeakOpen(id) {
    return get().openLeaks.includes(id);
  },

  /** Tick leak respawns + optional exterior nearby (called from game loop) */
  tickLeaks() {
    const now = Date.now();
    const { leakRespawnAt, openLeaks } = get();
    let changed = false;
    const nextOpen = [...openLeaks];
    const nextAt = { ...leakRespawnAt };
    for (const [id, t] of Object.entries(leakRespawnAt)) {
      if (t <= now && !nextOpen.includes(id)) {
        nextOpen.push(id);
        delete nextAt[id];
        changed = true;
        get().pushMessage('System', `💧 A pipe burst again near town! (${id.replace('leak-', '')})`, true);
      }
    }
    if (changed) {
      set({ openLeaks: nextOpen, leakRespawnAt: nextAt });
    }
  },

  /**
   * Seal a leak. creditPlayer: counts toward personal quest progress.
   */
  sealLeak(leakId, { by = 'player', silent = false } = {}) {
    const { openLeaks, personalFixes, player } = get();
    if (!openLeaks.includes(leakId)) return false;

    const leak = PIPE_LEAKS.find((l) => l.id === leakId);
    const nextOpen = openLeaks.filter((id) => id !== leakId);
    const respawnAt = {
      ...get().leakRespawnAt,
      [leakId]: Date.now() + randomRespawnMs(),
    };

    if (by === 'player') {
      const act = ACTIVITIES.fixpipe;
      const energyCost = Math.abs(act.energy);
      if (player.energy < energyCost) {
        sfx.error();
        get().pushMessage('System', "You're too tired! Rest at the cafe. ☕", true);
        return false;
      }
      const inventory = addInventoryItem(player.inventory, act.item);
      const nextPersonal = personalFixes + 1;
      set({
        openLeaks: nextOpen,
        leakRespawnAt: respawnAt,
        personalFixes: nextPersonal,
        player: {
          ...player,
          coins: player.coins + act.coins,
          energy: Math.max(0, Math.min(100, player.energy + act.energy)),
          inventory,
        },
      });
      get().grantXp(act.xp);
      sfx.coin();
      sfx.chop();
      if (!silent) {
        get().pushMessage(
          'System',
          `${act.message} (${leak?.name || 'Leak'}) · personal fixes: ${nextPersonal}`,
          true
        );
      }
      get().completeQuestIfNeeded('fixpipe');
      if (nextPersonal >= PERSONAL_FIXES_FOR_MASTER) {
        get().completeQuestIfNeeded('fixpipe-all');
      }
      get().save();
      return true;
    }

    // NPC / world fix — no personal quest credit
    set({ openLeaks: nextOpen, leakRespawnAt: respawnAt });
    if (!silent) {
      get().pushMessage(
        'System',
        `🔧 A plumber sealed ${leak?.name || 'a leak'}! (won’t count for your quest)`,
        true
      );
    }
    return true;
  },

  enterInterior(buildingId) {
    const b = BUILDINGS.find((x) => x.id === buildingId);
    const room = INTERIORS[buildingId];
    if (!b?.enterable || !room) return;
    const { player } = get();
    sfx.interact();
    setIndoorCamera(true);
    set({
      interiorId: buildingId,
      outdoorPos: { x: player.x, z: player.z },
      player: {
        ...player,
        x: room.spawn.x,
        z: room.spawn.z,
      },
      nearby: null,
    });
    get().showToast(`Entered ${room.name}`);
    get().pushMessage(
      'System',
      `You're inside ${room.emoji} ${room.name}. Walk onto the 🚪 mat (or Leave) to exit.`,
      true
    );
  },

  exitInterior() {
    const { interiorId, outdoorPos, player } = get();
    if (!interiorId) return;
    const b = BUILDINGS.find((x) => x.id === interiorId);
    sfx.interact();
    setIndoorCamera(false);
    // Place just outside the door
    const ox = b ? b.x : outdoorPos.x;
    const oz = b ? b.z + b.d / 2 + 1.5 : outdoorPos.z;
    set({
      interiorId: null,
      player: { ...player, x: ox, z: oz },
      nearby: null,
    });
    get().showToast('Back outside');
  },

  tickPickups() {
    const now = Date.now();
    const { pickupRespawnAt, collectedPickups } = get();
    let changed = false;
    const nextCollected = [...collectedPickups];
    const nextAt = { ...pickupRespawnAt };
    for (const [id, t] of Object.entries(pickupRespawnAt)) {
      if (t <= now) {
        const idx = nextCollected.indexOf(id);
        if (idx >= 0) {
          nextCollected.splice(idx, 1);
          changed = true;
        }
        delete nextAt[id];
      }
    }
    if (changed) set({ collectedPickups: nextCollected, pickupRespawnAt: nextAt });
  },

  collectPickup(pickupId) {
    const pickup = GROUND_PICKUPS.find((p) => p.id === pickupId);
    if (!pickup) return false;
    const { collectedPickups, personalPickups, player } = get();
    if (collectedPickups.includes(pickupId)) return false;

    const inventory = addInventoryItem(player.inventory, {
      id: `flower-${pickup.emoji}`,
      name: pickup.name,
      emoji: pickup.emoji,
    });
    const nextPersonal = personalPickups + 1;
    set({
      collectedPickups: [...collectedPickups, pickupId],
      pickupRespawnAt: {
        ...get().pickupRespawnAt,
        [pickupId]: Date.now() + randomPickupRespawnMs(),
      },
      personalPickups: nextPersonal,
      player: {
        ...player,
        coins: player.coins + (pickup.coins || 0),
        inventory,
      },
    });
    get().grantXp(pickup.xp || 2);
    sfx.coin();
    get().showToast(`${pickup.emoji} ${pickup.name} +${pickup.coins}💰`);
    get().pushMessage('System', `Picked ${pickup.emoji} ${pickup.name}!`, true);
    if (nextPersonal >= 5) get().completeQuestIfNeeded('pickup-5');
    get().save();
    return true;
  },

  /** Damage an NPC (arcade). Returns true if KO'd this hit. */
  damageNpc(npcId, amount) {
    const result = damageNpcRuntime(npcId, amount);
    if (!result) return false;
    const npc = NPCS.find((n) => n.id === npcId);
    if (!npc) return false;

    if (result.killed) {
      sfx.explosion();
      get().showToast(`${npc.name} KO!`);
      get().pushMessage(
        'System',
        `💥 ${npc.name} was knocked out! They’ll respawn in a few seconds.`,
        true
      );
      get().grantXp(8);
      return true;
    }

    // hit reaction chatter
    get().onNpcHit(npcId);
    return false;
  },

  updateNearby(px, pz) {
    let best = null;
    let bestDist = INTERACT_RANGE;
    const { openLeaks, interiorId, collectedPickups } = get();

    if (interiorId) {
      const room = INTERIORS[interiorId];
      bestDist = INTERIOR_INTERACT_RANGE;
      // exit door
      if (room && Math.abs(px) < 1.6 && pz > room.exitZ - 0.8) {
        best = {
          type: 'exit',
          id: 'exit',
          name: 'Door',
          emoji: '🚪',
          action: 'Leave',
        };
        bestDist = 0.5;
      }
      for (const obj of room?.interactables || []) {
        const dist = Math.hypot(px - obj.x, pz - obj.z);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            type: 'interior',
            id: obj.id,
            name: obj.name,
            emoji: obj.emoji,
            action: obj.action,
            activity: obj.activity,
          };
        }
      }
      set({ nearby: best });
      return;
    }

    // Ground pickups first (close range) so flowers are easy to grab
    for (const p of GROUND_PICKUPS) {
      if (collectedPickups.includes(p.id)) continue;
      const dist = Math.hypot(px - p.x, pz - p.z);
      if (dist < Math.min(bestDist, 2.2)) {
        bestDist = dist;
        best = {
          type: 'pickup',
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          action: 'Pick up',
        };
      }
    }

    for (const leak of PIPE_LEAKS) {
      if (!openLeaks.includes(leak.id)) continue;
      const dist = Math.hypot(px - leak.x, pz - leak.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'leak',
          id: leak.id,
          name: leak.name,
          emoji: leak.emoji,
          action: leak.action,
          activity: 'fixpipe',
          hint: leak.hint,
        };
      }
    }

    for (const b of BUILDINGS) {
      const dist = Math.hypot(px - b.x, pz - b.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'building',
          id: b.id,
          name: b.name,
          emoji: b.emoji,
          action: b.action,
          activity: b.activity,
          enterable: Boolean(b.enterable),
        };
      }
    }

    for (const n of NPCS) {
      if (!isNpcAlive(n.id)) continue;
      const pos = getNpcPos(n.id);
      const dist = Math.hypot(px - pos.x, pz - pos.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'npc',
          id: n.id,
          name: n.name,
          emoji: n.wheelchair ? '♿' : n.emoji,
          action: 'Talk',
          dialogue: n.dialogue,
          role: n.role,
          title: n.title,
        };
      }
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
    const { nearby, player, npcDialogueIndex, interiorId } = get();
    if (!nearby) return;
    if (player.hp <= 0) return;

    if (nearby.type === 'exit') {
      get().exitInterior();
      return;
    }

    if (nearby.type === 'npc') {
      const npc = NPCS.find((n) => n.id === nearby.id);
      sfx.talk();
      if (npc?.dialogues?.length) {
        const idx = npcDialogueIndex[npc.id] || 0;
        const line = npc.dialogues[idx % npc.dialogues.length];
        get().pushMessage(npc.name, line);
        set({
          npcDialogueIndex: {
            ...npcDialogueIndex,
            [npc.id]: (idx + 1) % npc.dialogues.length,
          },
        });
      } else {
        get().pushMessage(nearby.name, nearby.dialogue || '…');
      }

      if (npc?.id === 10) get().completeQuestIfNeeded('talk-nico');
      if (npc?.id === 6 || npc?.role === 'billy') get().completeQuestIfNeeded('talk-billy');
      get().save();
      return;
    }

    if (nearby.type === 'pickup') {
      get().collectPickup(nearby.id);
      return;
    }

    if (nearby.type === 'leak') {
      sfx.interact();
      get().sealLeak(nearby.id, { by: 'player' });
      return;
    }

    // Enter building (Pokemon style)
    if (nearby.type === 'building' && nearby.enterable && !interiorId) {
      get().enterInterior(nearby.id);
      return;
    }

    // Interior interactable or non-enterable outdoor activity
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
    if (activityKey === 'plumbhq') {
      sfx.interact();
      get().pushMessage(
        'System',
        'Pipeworks HQ! Talk to Nico & the crew outside — leaks keep coming back forever.',
        true
      );
      get().pushMessage(
        'Nico “The Wrench”',
        'Personal fixes only count for your Master Plumber quest. We help the town for free!'
      );
      return;
    }

    // outdoor non-enterable building activities (park, fish, chop)
    if (nearby.type === 'building' && !nearby.enterable) {
      get().runActivity(activityKey);
      return;
    }

    if (nearby.type === 'interior') {
      get().runActivity(activityKey);
      return;
    }

    get().runActivity(activityKey);
  },

  runActivity(activityKey) {
    const act = ACTIVITIES[activityKey];
    if (!act) return;
    const player = get().player;

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
    // cafe also heals a bit
    let hp = player.hp;
    if (activityKey === 'cafe') hp = Math.min(PLAYER_MAX_HP, hp + 15);

    set({
      player: {
        ...player,
        coins: player.coins + act.coins,
        energy: Math.max(0, Math.min(100, player.energy + act.energy)),
        inventory,
        hp,
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
    let ammo = player.ammo;
    let grenades = player.grenades;
    let hp = player.hp;

    if (item.id === 'snack') {
      energy = Math.min(100, energy + 15);
    } else if (item.id === 'ammo') {
      ammo += 20;
    } else if (item.id === 'grenades') {
      grenades += 3;
    } else if (item.id === 'medkit') {
      hp = PLAYER_MAX_HP;
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
        ammo,
        grenades,
        hp,
      },
    });
    get().pushMessage('System', `Bought ${item.emoji} ${item.name}!`, true);
    get().save();
  },

  tryFire() {
    const { equippedWeapon, player, interiorId } = get();
    if (player.hp <= 0) return;
    // no shooting indoors — keep cozy
    if (interiorId) {
      get().showToast('No weapons indoors!');
      return;
    }
    if (equippedWeapon === 'gun') {
      if (player.ammo <= 0) {
        sfx.error();
        get().showToast('Out of ammo — buy at the shop!');
        return;
      }
      set({
        player: { ...player, ammo: player.ammo - 1 },
        fireRequest: { kind: 'gun', id: Date.now() + Math.random() },
      });
      sfx.gunshot();
      return;
    }
    if (equippedWeapon === 'grenade') {
      if (player.grenades <= 0) {
        sfx.error();
        get().showToast('No grenades left!');
        return;
      }
      set({
        player: { ...player, grenades: player.grenades - 1 },
        fireRequest: { kind: 'grenade', id: Date.now() + Math.random() },
      });
      sfx.grenadeThrow();
    }
  },

  clearFireRequest() {
    set({ fireRequest: null });
  },

  addProjectile(p) {
    set((s) => ({ projectiles: [...s.projectiles, p] }));
  },

  setProjectiles(list) {
    set({ projectiles: list });
  },

  addExplosion(e) {
    set((s) => ({ explosions: [...s.explosions.slice(-8), e] }));
  },

  removeExplosion(id) {
    set((s) => ({ explosions: s.explosions.filter((x) => x.id !== id) }));
  },

  onNpcHit(npcId) {
    const npc = NPCS.find((n) => n.id === npcId);
    if (!npc) return;
    const lines = npc.wheelchair
      ? [
          'Hey! Watch the spokes!',
          'I’m undefeated in wheelchair races… not dodgeball!',
          'Oof — fair shot!',
        ]
      : npc.role === 'gardener'
        ? ['My flowers! Rude!', 'Emily says no shooting in the garden… oops.', 'Ow! At least water the roses after.']
        : [
            'Hey! Watch the pipes!',
            'Ow — that stung!',
            'I’m on break!',
            'Focus on the leaks… after you stop shooting me!',
            'Nico will hear about this…',
          ];
    get().pushMessage(npc.name, lines[Math.floor(Math.random() * lines.length)]);
  },

  /**
   * Apply arcade damage to local player (from remote projectile or hit packet).
   */
  takeDamage(amount, { fromName = 'Someone', fromPeerId = null, kind = 'gun' } = {}) {
    const { player, invulnUntil } = get();
    if (player.hp <= 0) return;
    if (Date.now() < invulnUntil) return;

    const dmg = Math.max(1, Math.round(amount));
    const hp = Math.max(0, player.hp - dmg);
    sfx.hit();
    set({
      player: { ...player, hp },
      invulnUntil: Date.now() + 280,
    });
    get().broadcastState();

    if (hp <= 0) {
      get().onPlayerKilled({ fromName, fromPeerId, kind });
    } else {
      get().showToast(`−${dmg} HP`);
    }
  },

  onPlayerKilled({ fromName = 'Someone', kind = 'gun' } = {}) {
    const { player } = get();
    sfx.explosion();
    set({ lastKiller: fromName });
    get().pushMessage(
      'System',
      `💀 You were eliminated by ${fromName}${kind === 'grenade' ? ' (grenade)' : ''}! Respawning…`,
      true
    );
    get().showToast(`Killed by ${fromName}`);
    // short delay then respawn
    setTimeout(() => {
      get().respawnPlayer();
    }, 1600);
    // keep player body "down" until respawn
    set({ player: { ...get().player, hp: 0 } });
    void player;
  },

  respawnPlayer() {
    const { outdoorPos, interiorId } = get();
    // Always respawn outside at fountain
    const x = 0;
    const z = 3;
    set({
      interiorId: null,
      player: {
        ...get().player,
        hp: PLAYER_MAX_HP,
        x,
        z,
        energy: Math.max(get().player.energy, 40),
      },
      invulnUntil: Date.now() + 2500,
    });
    get().showToast('Respawned! ❤️');
    get().pushMessage('System', 'You respawned at the town fountain. Invulnerable for a moment.', true);
    get().broadcastState({ x, z });
    get().save();
    void outdoorPos;
    void interiorId;
  },

  /**
   * Local shot hit a remote peer — tell them to take damage.
   */
  reportHitOnPeer(peerId, damage, kind = 'gun') {
    const { netSendHit, player, roomCode, remotePlayers } = get();
    const remote = remotePlayers[peerId];
    if (!remote || remote.alive === false) return;
    if (roomCode && netSendHit) {
      netSendHit({
        targetPeerId: peerId,
        damage,
        kind,
        fromName: player.name,
      });
    }
    // optimistic local HP update for remote sprite feedback
    const hp = Math.max(0, (remote.hp ?? PLAYER_MAX_HP) - damage);
    get().upsertRemotePlayer(peerId, {
      hp,
      alive: hp > 0,
    });
    if (hp <= 0) {
      get().showToast(`Eliminated ${remote.name}!`);
      get().pushMessage('System', `🎯 You eliminated ${remote.name}!`, true);
      get().grantXp(15);
      setTimeout(() => {
        // they will respawn on their client; show full HP after a bit if still present
        const still = get().remotePlayers[peerId];
        if (still) {
          get().upsertRemotePlayer(peerId, { hp: PLAYER_MAX_HP, alive: true });
        }
      }, 2200);
    } else {
      get().showToast(`Hit ${remote.name}!`);
    }
  },

  getAimDirection() {
    const { forwardX, forwardZ } = getLookBasis();
    return { x: forwardX, y: 0.12, z: forwardZ };
  },

  save() {
    const { player, completedQuests, muted, openLeaks, personalFixes, personalPickups } = get();
    const payload = {
      version: 5,
      savedAt: Date.now(),
      player: {
        name: player.name,
        avatar: player.avatar,
        coins: player.coins,
        level: player.level,
        xp: player.xp,
        energy: player.energy,
        hp: player.hp,
        inventory: player.inventory,
        x: player.x,
        z: player.z,
        ammo: player.ammo,
        grenades: player.grenades,
      },
      completedQuests,
      openLeaks,
      personalFixes,
      personalPickups,
      muted,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          name: player.name,
          avatar: player.avatar,
          level: player.level,
          coins: player.coins,
          savedAt: payload.savedAt,
        })
      );
    } catch {
      /* ignore */
    }
  },

  resetProgress() {
    const name = get().player.name;
    const avatar = get().player.avatar;
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem('cozy-town-v2');
    } catch {
      /* ignore */
    }
    setIndoorCamera(false);
    set({
      player: { ...defaultPlayer(), name, avatar, x: 0, z: 0 },
      completedQuests: [],
      personalFixes: 0,
      personalPickups: 0,
      openLeaks: defaultOpenLeaks(),
      leakRespawnAt: {},
      collectedPickups: [],
      pickupRespawnAt: {},
      interiorId: null,
      projectiles: [],
      explosions: [],
      fireRequest: null,
      nearby: null,
      npcDialogueIndex: {},
      messages: [
        {
          id: Date.now(),
          sender: 'System',
          text: 'World reset! Leaks & flowers are back, inventory cleared. 🔧🌷',
          system: true,
        },
      ],
    });
    get().save();
    get().showToast('World reset');
  },
}));

export { WEAPONS };
