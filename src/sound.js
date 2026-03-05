// ZENKAI — Wheel Spin Sound (Web Audio API)

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ══════════════════════════════════════════════
//  WHEEL SPIN SOUND — ticking that slows down
// ══════════════════════════════════════════════

let spinTickInterval = null;

export function startSpinSound() {
  const ctx = getCtx();
  let tickRate = 40;
  const maxRate = 350;

  function tick() {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 800 + Math.random() * 400;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    tickRate = Math.min(tickRate * 1.02, maxRate);
    spinTickInterval = setTimeout(tick, tickRate);
  }

  stopSpinSound();
  tick();
}

export function stopSpinSound() {
  if (spinTickInterval) {
    clearTimeout(spinTickInterval);
    spinTickInterval = null;
  }
}
