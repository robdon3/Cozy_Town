import { joinRoom, selfId } from 'trystero';

const APP_ID = 'cozy-town-robdon3-v1';

/** @type {null | ReturnType<typeof createSession>} */
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

/**
 * Connect to a P2P room. Returns controls or null on failure.
 */
export function connectMultiplayer(roomCode, handlers = {}) {
  disconnectMultiplayer();

  const code = normalizeRoomCode(roomCode);
  if (!code) return null;

  const room = joinRoom(
    {
      appId: APP_ID,
      // public STUN helps NAT traversal for friends on different networks
      rtcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    },
    `room-${code}`
  );

  const stateAction = room.makeAction('pstate');
  const chatAction = room.makeAction('pchat');
  const emoteAction = room.makeAction('pemote');

  room.onPeerJoin = (peerId) => {
    handlers.onPeerJoin?.(peerId);
    // greet new peer with our latest snapshot if we have one
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

  session = {
    room,
    code,
    lastState: null,
    sendState(state) {
      session.lastState = state;
      return stateAction.send(state).catch(() => {});
    },
    sendChat(payload) {
      return chatAction.send(payload).catch(() => {});
    },
    sendEmote(payload) {
      return emoteAction.send(payload).catch(() => {});
    },
    leave() {
      return room.leave().catch(() => {});
    },
    peerCount() {
      return Object.keys(room.getPeers()).length;
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
  s.leave();
}

function createSession() {
  return session;
}
