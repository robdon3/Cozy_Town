import { useEffect } from 'react';
import {
  connectMultiplayer,
  disconnectMultiplayer,
  getMultiplayerSession,
  getSelfId,
} from './multiplayer';
import { useGameStore } from './store';
import { sfx } from '../audio/sounds';

/**
 * Manages P2P room lifecycle while the game is running with a room code.
 */
export default function MultiplayerBridge() {
  const roomCode = useGameStore((s) => s.roomCode);
  const started = useGameStore((s) => s.started);
  const setNetHandlers = useGameStore((s) => s.setNetHandlers);
  const setMpMeta = useGameStore((s) => s.setMpMeta);
  const upsertRemotePlayer = useGameStore((s) => s.upsertRemotePlayer);
  const removeRemotePlayer = useGameStore((s) => s.removeRemotePlayer);
  const clearRemotePlayers = useGameStore((s) => s.clearRemotePlayers);
  const pushMessage = useGameStore((s) => s.pushMessage);
  const showToast = useGameStore((s) => s.showToast);
  const broadcastState = useGameStore((s) => s.broadcastState);

  useEffect(() => {
    if (!started || !roomCode) {
      disconnectMultiplayer();
      setNetHandlers({});
      setMpMeta({ status: 'offline', peerCount: 0 });
      clearRemotePlayers();
      return undefined;
    }

    setMpMeta({ status: 'connecting', selfPeerId: getSelfId() });

    const session = connectMultiplayer(roomCode, {
      onConnected: (code) => {
        setMpMeta({ status: 'live', selfPeerId: getSelfId() });
        pushMessage('System', `You're in room ${code}. Friends can join with the invite link!`, true);
        showToast(`Room ${code} live`);
        // initial presence broadcast
        setTimeout(() => broadcastState(), 200);
      },
      onPeerJoin: (peerId) => {
        sfx.interact();
        const count = getMultiplayerSession()?.peerCount() ?? 0;
        setMpMeta({ peerCount: count });
        pushMessage('System', `A friend joined the town! 👋`, true);
        showToast('Friend joined!');
        // re-send our state so they see us
        broadcastState();
        // placeholder until we receive their state
        upsertRemotePlayer(peerId, { name: 'Friend…', x: 2, z: 2 });
      },
      onPeerLeave: (peerId) => {
        const remote = useGameStore.getState().remotePlayers[peerId];
        removeRemotePlayer(peerId);
        const count = getMultiplayerSession()?.peerCount() ?? 0;
        setMpMeta({ peerCount: count });
        pushMessage(
          'System',
          `${remote?.name || 'A friend'} left the town.`,
          true
        );
      },
      onPlayerState: (peerId, data) => {
        upsertRemotePlayer(peerId, {
          name: String(data.name || 'Friend').slice(0, 16),
          avatar: data.avatar || '😊',
          x: Number(data.x) || 0,
          z: Number(data.z) || 0,
          level: Number(data.level) || 1,
          color: data.color || '#F8A5C2',
          hp: data.hp != null ? Number(data.hp) : undefined,
          alive: data.alive !== false && (data.hp == null || Number(data.hp) > 0),
        });
        const count = getMultiplayerSession()?.peerCount() ?? 0;
        setMpMeta({ status: 'live', peerCount: count });
      },
      onChat: (_peerId, data) => {
        const name = String(data.name || 'Friend').slice(0, 16);
        const text = String(data.text || '').slice(0, 120);
        if (text) {
          sfx.talk();
          pushMessage(name, text, false);
        }
      },
      onFire: (_peerId, data) => {
        window.dispatchEvent(
          new CustomEvent('cozy-remote-fire', {
            detail: data,
          })
        );
      },
      onHit: (fromPeerId, data) => {
        // Only apply if this client is the target
        const selfId = getSelfId();
        if (data.targetPeerId && data.targetPeerId !== selfId) return;
        const remote = useGameStore.getState().remotePlayers[fromPeerId];
        const fromName =
          data.fromName || remote?.name || 'Friend';
        useGameStore.getState().takeDamage(Number(data.damage) || 28, {
          fromName: String(fromName).slice(0, 16),
          fromPeerId,
          kind: data.kind === 'grenade' ? 'grenade' : 'gun',
        });
      },
    });

    if (!session) {
      setMpMeta({ status: 'offline' });
      pushMessage('System', 'Could not join multiplayer room.', true);
      return undefined;
    }

    setNetHandlers({
      sendState: (state) => session.sendState(state),
      sendChat: (payload) => session.sendChat(payload),
      sendFire: (payload) => session.sendFire(payload),
      sendHit: (payload) => session.sendHit(payload),
    });

    // presence heartbeat (in case peers miss a packet)
    const beat = setInterval(() => {
      broadcastState();
      const count = getMultiplayerSession()?.peerCount() ?? 0;
      setMpMeta({ peerCount: count });
    }, 2000);

    return () => {
      clearInterval(beat);
      disconnectMultiplayer();
      setNetHandlers({});
      clearRemotePlayers();
      setMpMeta({ status: 'offline', peerCount: 0 });
    };
    // only re-run when room identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, roomCode]);

  return null;
}
