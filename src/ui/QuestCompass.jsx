import { useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { getActiveQuest, resolveQuestTargetNearPlayer } from '../game/questTarget';
import { lookState } from '../game/lookState';

/**
 * Arrow + distance to the current incomplete quest objective.
 */
export default function QuestCompass() {
  const player = useGameStore((s) => s.player);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const fixedLeaks = useGameStore((s) => s.fixedLeaks);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const quest = getActiveQuest(completedQuests);
  if (!quest) {
    return (
      <div className="quest-compass done">
        <div className="qc-emoji">⭐</div>
        <div className="qc-meta">
          <div className="qc-title">All quests done!</div>
          <div className="qc-sub">Explore · hang out · make chaos</div>
        </div>
      </div>
    );
  }

  const target = resolveQuestTargetNearPlayer(quest, player, fixedLeaks);
  if (!target) {
    return (
      <div className="quest-compass">
        <div className="qc-emoji">📜</div>
        <div className="qc-meta">
          <div className="qc-title">{quest.title}</div>
          <div className="qc-sub">{quest.description}</div>
        </div>
      </div>
    );
  }

  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const dist = Math.hypot(dx, dz);
  // world angle: 0 = +Z south? our forward when yaw=0 is (0,-1) in xz = -Z
  // angle from player to target in world: atan2(dx, dz) but we use -Z as north-ish
  const worldAngle = Math.atan2(dx, dz);
  // camera yaw: offset is (sin(yaw), cos(yaw)) behind player looking toward -offset
  // forward angle = yaw + PI
  const camForward = lookState.yaw + Math.PI;
  // relative: rotate world bearing into camera space
  let rel = worldAngle - camForward;
  // normalize
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const deg = (rel * 180) / Math.PI;

  void tick; // force re-render for live arrow

  return (
    <div className="quest-compass">
      <div className="qc-arrow-wrap" style={{ transform: `rotate(${deg}deg)` }}>
        <div className="qc-arrow">▲</div>
      </div>
      <div className="qc-meta">
        <div className="qc-title">
          <span className="qc-obj">{target.emoji || '📜'}</span> {quest.title}
        </div>
        <div className="qc-sub">
          {quest.description} · {dist < 3 ? 'Here!' : `${Math.round(dist)}m`}
        </div>
      </div>
    </div>
  );
}
