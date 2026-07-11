/**
 * Live multiplayer via Trystero (WebRTC P2P).
 * Uses the BitTorrent strategy — more reliable for casual friend rooms than Nostr alone.
 */
import { joinRoom, selfId } from '@trystero-p2p/torrent';

const APP_ID = 'cozy-town-robdon3-v2';

/** @type {null | ReturnType<typeof createSessionShape>} */
let session = null;

export function getSelfId() {
  return selfId;
}

export function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function normalizeRoomCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function parseRoomFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeRoomCode(params.get('room') || params.get('r') || '');
  } catch {
    return '';
  }
}

export function roomInviteUrl(roomCode) {
  const base = window.location.href.split('?')[0].split('#')[0];
  return `${base}?room=${encodeURIComponent(roomCode)}`;
}

export function clearRoomFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('r');
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ignore */
  }
}

export function setRoomInUrl(roomCode) {
  try {
    const url = new URL(window.location.href);
    if (roomCode) {
      url.searchParams.set('room', roomCode);
    } else {
      url.searchParams.delete('room');
      url.searchParams.delete('r');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ignore */
  }
}

/**
 * Connect to a P2P room. Returns session controls or null.
 */
export function connectMultiplayer(roomCode, handlers = {}) {
  disconnectMultiplayer();

  const code = normalizeRoomCode(roomCode);
  if (!code || code.length < 4) return null;

  let room;
  try {
    room = joinRoom(
      {
        appId: APP_ID,
        // STUN helps friends on different home networks find each other
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' },
          ],
        },
      },
      `cozy-${code}`,
      {
        onJoinError: (err) => {
          console.warn('[cozy-mp] join error', err);
          handlers.onJoinError?.(err);
        },
      }
    );
  } catch (err) {
    console.warn('[cozy-mp] joinRoom threw', err);
    handlers.onJoinError?.({ error: String(err?.message || err) });
    return null;
  }

  // Trystero 0.25+: makeAction returns { send, onMessage, ... }
  const stateAction = room.makeAction('pstate');
  const chatAction = room.makeAction('pchat');
  const emoteAction = room.makeAction('pemote');
  const fireAction = room.makeAction('pfire');
  const hitAction = room.makeAction('phit');

  room.onPeerJoin = (peerId) => {
    handlers.onPeerJoin?.(peerId);
    if (session?.lastState) {
      stateAction.send(session.lastState, { target: peerId }).catch(() => {});
    }
  };

  room.onPeerLeave = (peerId) => {
    handlers.onPeerLeave?.(peerId);
  };

  stateAction.onMessage = (data, { peerId }) => {
    if (!data || typeof data !== 'object') return;
    handlers.onPlayerState?.(peerId, data);
  };

  chatAction.onMessage = (data, { peerId }) => {
    if (!data || typeof data !== 'object') return;
    handlers.onChat?.(peerId, data);
  };

  emoteAction.onMessage = (data, { peerId }) => {
    if (!data || typeof data !== 'object') return;
    handlers.onEmote?.(peerId, data);
  };

  fireAction.onMessage = (data, { peerId }) => {
    if (!data || typeof data !== 'object') return;
    handlers.onFire?.(peerId, data);
  };

  hitAction.onMessage = (data, { peerId }) => {
    if (!data || typeof data !== 'object') return;
    handlers.onHit?.(peerId, data);
  };

  session = {
    room,
    code,
    lastState: null,
    sendState(state) {
      if (!session) return Promise.resolve();
      session.lastState = state;
      return stateAction.send(state).catch(() => {});
    },
    sendChat(payload) {
      return chatAction.send(payload).catch(() => {});
    },
    sendEmote(payload) {
      return emoteAction.send(payload).catch(() => {});
    },
    sendFire(payload) {
      return fireAction.send(payload).catch(() => {});
    },
    sendHit(payload) {
      return hitAction.send(payload).catch(() => {});
    },
    leave() {
      return room.leave().catch(() => {});
    },
    peerCount() {
      try {
        return Object.keys(room.getPeers()).length;
      } catch {
        return 0;
      }
    },
  };

  handlers.onConnected?.(code, selfId);
  return session;
}

export function getMultiplayerSession() {
  return session;
}

export function disconnectMultiplayer() {
  if (!session) return;
  const s = session;
  session = null;
  try {
    s.leave();
  } catch {
    /* ignore */
  }
}

function createSessionShape() {
  return session;
}
