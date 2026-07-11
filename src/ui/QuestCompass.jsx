import { useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { getActiveQuest, resolveQuestTargetNearPlayer } from '../game/questTarget';
import { lookState } from '../game/lookState';

/**
 * Slim quest strip with direction arrow. Hidden when all quests complete.
 */
export default function QuestCompass() {
  const player = useGameStore((s) => s.player);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const fixedLeaks = useGameStore((s) => s.fixedLeaks);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  const quest = getActiveQuest(completedQuests);
  // Free up screen when done
  if (!quest) return null;

  const target = resolveQuestTargetNearPlayer(quest, player, fixedLeaks);
  void tick;

  if (!target) {
    return (
      <div className="quest-compass slim">
        <span className="qc-emoji">📜</span>
        <span className="qc-line">
          <strong>{quest.title}</strong>
          <span className="qc-sep">·</span>
          {quest.description}
        </span>
      </div>
    );
  }

  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const dist = Math.hypot(dx, dz);
  const worldAngle = Math.atan2(dx, dz);
  const camForward = lookState.yaw + Math.PI;
  let rel = worldAngle - camForward;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const deg = (rel * 180) / Math.PI;

  return (
    <div className="quest-compass slim">
      <div className="qc-arrow-wrap" style={{ transform: `rotate(${deg}deg)` }}>
        <div className="qc-arrow">▲</div>
      </div>
      <span className="qc-line">
        <span className="qc-obj">{target.emoji || '📜'}</span>
        <strong>{quest.title}</strong>
        <span className="qc-sep">·</span>
        {dist < 3 ? 'Here!' : `${Math.round(dist)}m`}
      </span>
    </div>
  );
}
