// ZENKAI — Web Audio API Sounds

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ── Wheel spin (legacy) ──────────────────────────────────────────────────────
let spinTickInterval = null;

export function startSpinSound() {
  const ctx = getCtx();
  let tickRate = 40;

  function tick() {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 800 + Math.random() * 400;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    tickRate = Math.min(tickRate * 1.02, 350);
    spinTickInterval = setTimeout(tick, tickRate);
  }

  stopSpinSound();
  tick();
}

export function stopSpinSound() {
  if (spinTickInterval) { clearTimeout(spinTickInterval); spinTickInterval = null; }
}

// ── Card reveal whoosh ───────────────────────────────────────────────────────
export function playCardReveal() {
  try {
    const ctx  = getCtx();
    const t    = ctx.currentTime;

    // Low swoosh
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);

    // Bright shimmer
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, t + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
    gain2.gain.setValueAtTime(0.0, t + 0.2);
    gain2.gain.linearRampToValueAtTime(0.18, t + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(t + 0.2);
    osc2.stop(t + 0.55);
  } catch { /* ignore */ }
}

// ── Battle hit ───────────────────────────────────────────────────────────────
export function playBattleHit() {
  try {
    const ctx  = getCtx();
    const t    = ctx.currentTime;

    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buf;
    filt.type  = 'bandpass';
    filt.frequency.value = 600;
    filt.Q.value = 0.8;
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start(t);
  } catch { /* ignore */ }
}

// ── Victory fanfare ──────────────────────────────────────────────────────────
export function playVictory() {
  try {
    const ctx   = getCtx();
    const t     = ctx.currentTime;
    const notes = [523, 659, 784, 1047];

    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const st   = t + i * 0.12;
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(st);
      osc.stop(st + 0.25);
    });
  } catch { /* ignore */ }
}

// ── Defeat sound ─────────────────────────────────────────────────────────────
export function playDefeat() {
  try {
    const ctx  = getCtx();
    const t    = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  } catch { /* ignore */ }
}
