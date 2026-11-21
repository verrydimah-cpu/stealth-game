// Shadow Ledger — sound: every effect is synthesised with WebAudio.
// One job: small bleeps and thumps, no audio files, no network.
let ctx = null;
let muted = false;

export function initAudio() {
  if (!ctx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  step() {
    tone(90, 0.07, 'sine', 0.05);
  },
  spotted() {
    // Two-note alarm sting when a guard's suspicion boils over.
    tone(620, 0.16, 'square', 0.06, 0, 880);
    tone(880, 0.22, 'square', 0.05, 0.14, 620);
  },
  investigate() {
    tone(440, 0.12, 'triangle', 0.05, 0, 520);
  },
  pickup() {
    // The ledger lifts: a bright little chime.
    tone(660, 0.12, 'sine', 0.07);
    tone(990, 0.18, 'sine', 0.06, 0.09);
    tone(1320, 0.24, 'sine', 0.05, 0.18);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, i * 0.12));
  },
  caught() {
    tone(220, 0.5, 'sawtooth', 0.07, 0, 110);
  },
  click() {
    tone(520, 0.05, 'sine', 0.04);
  },
};
