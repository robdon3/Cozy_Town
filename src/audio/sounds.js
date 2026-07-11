/**
 * Lightweight procedural audio — no external asset downloads required.
 */

let ctx = null;
let master = null;
let musicNodes = null;
let muted = false;
let unlocked = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = true;
}

export function setMuted(value) {
  muted = value;
  if (master) {
    master.gain.setTargetAtTime(value ? 0 : 0.45, getCtx().currentTime, 0.05);
  }
  if (value) stopMusic();
}

export function isMuted() {
  return muted;
}

function tone({
  freq = 440,
  type = 'sine',
  duration = 0.15,
  gain = 0.12,
  attack = 0.01,
  decay = 0.08,
  freqEnd = null,
  delay = 0,
}) {
  const c = getCtx();
  if (!c || muted || !unlocked) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, duration - decay));
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst({ duration = 0.12, gain = 0.08, filterFreq = 800 }) {
  const c = getCtx();
  if (!c || muted || !unlocked) return;

  const len = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
}

export const sfx = {
  click() {
    tone({ freq: 520, type: 'triangle', duration: 0.06, gain: 0.08 });
  },
  footstep() {
    noiseBurst({ duration: 0.06, gain: 0.04, filterFreq: 350 });
  },
  coin() {
    tone({ freq: 880, type: 'square', duration: 0.08, gain: 0.07 });
    tone({ freq: 1175, type: 'square', duration: 0.12, gain: 0.06, delay: 0.07 });
  },
  interact() {
    tone({ freq: 330, type: 'sine', duration: 0.1, gain: 0.1, freqEnd: 520 });
  },
  fish() {
    noiseBurst({ duration: 0.18, gain: 0.1, filterFreq: 1200 });
    tone({ freq: 280, type: 'sine', duration: 0.2, gain: 0.06, freqEnd: 180 });
  },
  chop() {
    noiseBurst({ duration: 0.1, gain: 0.1, filterFreq: 500 });
    tone({ freq: 120, type: 'triangle', duration: 0.12, gain: 0.08 });
  },
  mine() {
    tone({ freq: 180, type: 'sawtooth', duration: 0.08, gain: 0.05 });
    noiseBurst({ duration: 0.14, gain: 0.09, filterFreq: 900 });
  },
  cafe() {
    tone({ freq: 440, type: 'sine', duration: 0.12, gain: 0.07 });
    tone({ freq: 554, type: 'sine', duration: 0.14, gain: 0.05, delay: 0.08 });
  },
  quest() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'triangle', duration: 0.18, gain: 0.08, delay: i * 0.1 });
    });
  },
  levelUp() {
    const notes = [392, 523, 659, 784, 1046];
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'square', duration: 0.16, gain: 0.06, delay: i * 0.09 });
    });
  },
  error() {
    tone({ freq: 180, type: 'sawtooth', duration: 0.18, gain: 0.07, freqEnd: 90 });
  },
  talk() {
    tone({ freq: 300 + Math.random() * 80, type: 'triangle', duration: 0.07, gain: 0.06 });
    tone({ freq: 340 + Math.random() * 60, type: 'triangle', duration: 0.08, gain: 0.05, delay: 0.06 });
  },
  share() {
    tone({ freq: 600, type: 'sine', duration: 0.1, gain: 0.08 });
    tone({ freq: 900, type: 'sine', duration: 0.14, gain: 0.07, delay: 0.08 });
  },
  gunshot() {
    noiseBurst({ duration: 0.08, gain: 0.12, filterFreq: 2200 });
    tone({ freq: 180, type: 'square', duration: 0.06, gain: 0.06, freqEnd: 60 });
  },
  grenadeThrow() {
    tone({ freq: 220, type: 'triangle', duration: 0.12, gain: 0.07, freqEnd: 140 });
  },
  explosion() {
    noiseBurst({ duration: 0.35, gain: 0.18, filterFreq: 400 });
    tone({ freq: 90, type: 'sawtooth', duration: 0.3, gain: 0.1, freqEnd: 40 });
  },
  hit() {
    tone({ freq: 200, type: 'square', duration: 0.08, gain: 0.06 });
    noiseBurst({ duration: 0.06, gain: 0.05, filterFreq: 900 });
  },
};

export function startMusic() {
  const c = getCtx();
  if (!c || muted || !unlocked || musicNodes) return;

  const notes = [262, 294, 330, 392, 330, 294];
  let step = 0;
  const tempo = 0.55;

  const playStep = () => {
    if (!musicNodes || muted) return;
    const f = notes[step % notes.length];
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + tempo * 0.85);
    osc.connect(g);
    g.connect(musicNodes.bus);
    osc.start(t0);
    osc.stop(t0 + tempo);
    step += 1;
  };

  const bus = c.createGain();
  bus.gain.value = 0.55;
  bus.connect(master);

  const interval = setInterval(playStep, tempo * 1000);
  playStep();
  musicNodes = { bus, interval };
}

export function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.interval);
  try {
    musicNodes.bus.disconnect();
  } catch {
    /* ignore */
  }
  musicNodes = null;
}
