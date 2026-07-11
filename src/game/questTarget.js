import { BUILDINGS, PIPE_LEAKS, QUESTS } from './data';
import { getNpcPos } from './npcRuntime';

function buildingPos(id) {
  const b = BUILDINGS.find((x) => x.id === id);
  return b ? { x: b.x, z: b.z, emoji: b.emoji, label: b.name } : null;
}

/**
 * Resolve the world position for a quest objective.
 */
export function resolveQuestTarget(quest, { openLeaks = [] } = {}) {
  if (!quest) return null;
  const key = quest.completeOn;

  if (key === 'townhall') return { ...buildingPos('townhall'), label: quest.title };
  if (key === 'cafe') return { ...buildingPos('cafe'), label: quest.title };
  if (key === 'fish') return { ...buildingPos('dock'), label: quest.title };
  if (key === 'chop') return { ...buildingPos('forest'), label: quest.title };
  if (key === 'mine') return { ...buildingPos('mine'), label: quest.title };
  if (key === 'talk-nico') {
    const pos = getNpcPos(10);
    return { x: pos.x, z: pos.z, emoji: '🧑‍🔧', label: quest.title };
  }
  if (key === 'talk-billy') {
    const pos = getNpcPos(6);
    return { x: pos.x, z: pos.z, emoji: '♿', label: quest.title };
  }
  if (key === 'fixpipe' || key === 'fixpipe-all') {
    const open = PIPE_LEAKS.filter((l) => openLeaks.includes(l.id));
    if (!open.length) return null;
    const leak = open[0];
    return { x: leak.x, z: leak.z, emoji: leak.emoji, label: quest.title };
  }
  return null;
}

/** First incomplete quest (quest list order). */
export function getActiveQuest(completedQuests = []) {
  return QUESTS.find((q) => !completedQuests.includes(q.id)) || null;
}

/** Prefer nearest incomplete open leak when that is the objective. */
export function resolveQuestTargetNearPlayer(quest, player, openLeaks = []) {
  if (!quest) return null;
  if (quest.completeOn === 'fixpipe' || quest.completeOn === 'fixpipe-all') {
    const open = PIPE_LEAKS.filter((l) => openLeaks.includes(l.id));
    if (!open.length) return null;
    let best = open[0];
    let bestD = Infinity;
    for (const l of open) {
      const d = Math.hypot(player.x - l.x, player.z - l.z);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    return { x: best.x, z: best.z, emoji: best.emoji, label: quest.title };
  }
  if (quest.completeOn === 'talk-nico') {
    const pos = getNpcPos(10);
    return { x: pos.x, z: pos.z, emoji: '🧑‍🔧', label: quest.title };
  }
  if (quest.completeOn === 'talk-billy') {
    const pos = getNpcPos(6);
    return { x: pos.x, z: pos.z, emoji: '♿', label: quest.title };
  }
  return resolveQuestTarget(quest, { openLeaks });
}
