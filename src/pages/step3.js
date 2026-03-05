// ZENKAI — Step 3: Awakening Wheel + 3-Spin Result Tracking
import { navigate } from '../router.js';

// ── Wheel design: 36 equal segments, 12 per type (casino roulette style) ──
// Arrangement: [gtd, fcfs, fail] × 12  — visually equal, probability is code-weighted
const SEG_COUNT   = 36;
const SLICE       = (2 * Math.PI) / SEG_COUNT;

// Build segment ring: gtd=0, fcfs=1, fail=2 repeating
const TYPE_DEF = [
  { id: 'gtd',  color: '#8B6800', colorLight: '#FFD700', rim: '#FFE84D' },
  { id: 'fcfs', color: '#7A0000', colorLight: '#FF2233', rim: '#FF6677' },
  { id: 'fail', color: '#0D0D0D', colorLight: '#2A1A1A', rim: '#3A1A1A' },
];
const WHEEL_SEGMENTS = Array.from({ length: SEG_COUNT }, (_, i) => TYPE_DEF[i % 3]);

// Lookup: for each type, which segment indices belong to it
const TYPE_INDICES = { gtd: [], fcfs: [], fail: [] };
WHEEL_SEGMENTS.forEach((s, i) => TYPE_INDICES[s.id].push(i));

// Starting rotation so segment 0 is nicely offset
const INITIAL_ROTATION = -(Math.PI / 2) + SLICE / 2;

const MAX_SPINS = 2;

// Rarity rank — lower = better
const RANK = { gtd: 0, fcfs: 1, fail: 2 };
function bestOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] <= RANK[b] ? a : b;
}

export function renderStep3(container) {
  let spinsUsed  = parseInt(localStorage.getItem('zenkai_spins_used') || '0', 10);
  let bestResult = localStorage.getItem('zenkai_best_result') || null;

  if (spinsUsed >= MAX_SPINS) {
    if (bestResult && bestResult !== 'fail') navigate('/step4');
    else navigate('/step5');
    return;
  }

  const canvasSize = Math.min(300, window.innerWidth - 80);
  const spinsLeft  = MAX_SPINS - spinsUsed;
  const btnLabel   = spinsUsed === 0 ? 'Spin' : `Spin Again (${spinsLeft} left)`;

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening wheel</div>

    <div class="step-indicator">
      <div class="step-node done">1</div><div class="step-line done"></div>
      <div class="step-node done">2</div><div class="step-line done"></div>
      <div class="step-node active">3</div><div class="step-line"></div>
      <div class="step-node">4</div><div class="step-line"></div>
      <div class="step-node">5</div>
    </div>

    <div class="step-title">Spin the Awakening Wheel</div>

    <div class="spin-tracker" id="spin-tracker">
      ${[1,2].map(n => `<div class="spin-pip${n <= spinsUsed ? ' used' : ''}" id="pip-${n}"></div>`).join('')}
    </div>
    <p class="spin-tracker-label" id="spin-tracker-label">${
      spinsUsed === 0 ? '2 spins available' : `${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} remaining`
    }</p>

    <div class="wheel-container">
      <div class="wheel-pointer"></div>
      <canvas id="wheel-canvas" width="${canvasSize}" height="${canvasSize}"></canvas>
    </div>

    <div class="wheel-legend">
      <span class="wl-item wl-gtd">GTD</span>
      <span class="wl-item wl-fcfs">FCFS</span>
      <span class="wl-item wl-fail">TRY AGAIN</span>
    </div>

    <button class="btn-gold" id="spin-btn">${btnLabel}</button>
    <button class="btn-ghost" id="step3-back" style="margin-top:10px;display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> Back</button>
  `;
  container.appendChild(el);

  const canvas  = document.getElementById('wheel-canvas');
  const ctx     = canvas.getContext('2d');
  const spinBtn = document.getElementById('spin-btn');
  const backBtn = document.getElementById('step3-back');

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const r  = canvasSize / 2 - 6;

  let rotation = INITIAL_ROTATION;
  let spinning = false;

  // â”€â”€ Draw wheel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawWheel(rot) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 8);
    glow.addColorStop(0, 'rgba(255,215,0,0.25)');
    glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    // Segments
    for (let i = 0; i < SEG_COUNT; i++) {
      const seg   = WHEEL_SEGMENTS[i];
      const start = rot + i * SLICE;
      const end   = start + SLICE;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Thin rim highlight on each segment edge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.strokeStyle = seg.rim + '55';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Outer arc accent band
      const arcMid = start + SLICE / 2;
      const arcR = r - 6;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, start + 0.02, end - 0.02);
      ctx.strokeStyle = seg.colorLight + '99';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Dividers between segments
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    for (let i = 0; i < SEG_COUNT; i++) {
      const angle = rot + i * SLICE;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.stroke();
    }

    // Outer border ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center hub
    const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.12);
    hub.addColorStop(0, '#FFE84D');
    hub.addColorStop(0.5, '#C8900A');
    hub.addColorStop(1, '#1A0500');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `bold ${Math.floor(canvasSize * 0.065)}px Orbitron, sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', cx, cy + 1);
  }

  drawWheel(rotation);

  // â”€â”€ Spin tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function updateTracker() {
    for (let n = 1; n <= MAX_SPINS; n++) {
      const pip = document.getElementById(`pip-${n}`);
      if (pip) pip.className = `spin-pip${n <= spinsUsed ? ' used' : ''}`;
    }
    const lbl  = document.getElementById('spin-tracker-label');
    const left = MAX_SPINS - spinsUsed;
    if (lbl) lbl.textContent = left > 0 ? `${left} spin${left !== 1 ? 's' : ''} remaining` : 'All spins used';
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  // â”€â”€ Spin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = 'Spinning...';

    // â”€â”€ Weighted outcome: GTD 2.5% | FCFS 47.5% | Fail 50% â”€â”€
    const roll   = Math.random() * 100;
    const typeId = roll < 2.5 ? 'gtd' : roll < 50 ? 'fcfs' : 'fail';

    // Pick a random visual segment of the winning type
    const validIdx  = TYPE_INDICES[typeId];
    const segIdx    = validIdx[Math.floor(Math.random() * validIdx.length)];

    // Compute the rotation target so that segment centre is at the top (−π/2)
    const segCentre = INITIAL_ROTATION + (segIdx + 0.5) * SLICE;
    const base      = -Math.PI / 2 - segCentre + INITIAL_ROTATION;
    // Normalise target so it always moves forward several full turns
    let target = rotation + ((base - rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    target    += (6 + Math.floor(Math.random() * 4)) * 2 * Math.PI;

    const startRotation = rotation;
    const totalDelta    = target - startRotation;
    const duration      = 4200 + Math.random() * 1400;
    const startTime     = performance.now();

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      rotation = startRotation + totalDelta * easeOut(t);
      drawWheel(rotation);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = target;
        drawWheel(rotation);
        spinning = false;

        spinsUsed++;
        localStorage.setItem('zenkai_spins_used', spinsUsed);
        bestResult = bestOf(bestResult, typeId);
        localStorage.setItem('zenkai_best_result', bestResult);
        localStorage.setItem('zenkai_result', bestResult);

        updateTracker();
        setTimeout(() => showResultPopup(typeId, spinsUsed), 300);
      }
    }

    requestAnimationFrame(frame);
  }

  // â”€â”€ Result popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function showResultPopup(thisTypeId, usedCount) {
    const isFinal   = usedCount >= MAX_SPINS;
    const alreadyGtd = bestResult === 'gtd';

    const META = {
      gtd:  { label: 'GTD',       cls: 'gtd',  icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#FFD700"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', headline: 'GTD Secured',    desc: 'Guaranteed allocation locked in. The path to Zenkai is yours.' },
      fcfs: { label: 'FCFS',      cls: 'fcfs', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#FF2233"><path d="M12 23c-4.97 0-9-3.58-9-8 0-2.53 1.19-4.78 3.06-6.32C6.58 7.72 7 6.39 7 5c0-.55.45-1 1-1 .28 0 .53.11.71.29C9.63 5.2 10 6.55 10 8c0 .55.45 1 1 1s1-.45 1-1V4c0-.55.45-1 1-1s1 .45 1 1v1c0 .55.45 1 1 1s1-.45 1-1V3c0-.55.45-1 1-1s1 .45 1 1v3c0 .55.45 1 1 1s1-.45 1-1V5c0-.55.45-1 1-1s1 .45 1 1c0 3.87-1.5 7.13-4 9.5V23h-5z"/></svg>', headline: 'FCFS Access',     desc: 'First come first served access granted. Stay ready when the gate opens.' },
      fail: { label: 'TRY AGAIN', cls: 'fail', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#666"><path d="M12 2a9 9 0 0 0-9 9c0 3.07 1.54 5.78 3.9 7.43L8 22h8l1.1-3.57A9 9 0 0 0 21 11a9 9 0 0 0-9-9zm-2.5 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-6 5h7s-1 2-3.5 2-3.5-2-3.5-2z"/></svg>', headline: 'Energy Unstable', desc: 'The orb rejected you.' },
    };

    const thisMeta = META[thisTypeId];
    const bestMeta = META[bestResult] || thisMeta;
    const spinsLeft = MAX_SPINS - usedCount;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    if (isFinal) {
      const isWinner = bestResult !== 'fail';
      overlay.innerHTML = `
        <div class="popup-card">
          <div class="popup-spin-badge">Final Result — Spin 2 / 2</div>
          <span class="popup-icon">${bestMeta.icon}</span>
          <div class="popup-result-label ${bestMeta.cls}">${bestMeta.label}</div>
          <div class="popup-headline">${bestMeta.headline}</div>
          <p class="popup-desc">${bestMeta.desc}</p>
          <div class="popup-actions">
            ${isWinner
              ? `<button class="btn-gold" id="popup-continue" style="display:inline-flex;align-items:center;gap:6px">Submit Wallet <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>`
              : `<button class="btn-ghost" id="popup-continue">See Your Result</button>`
            }
          </div>
        </div>`;
    } else {
      const bestDiffers = bestResult !== thisTypeId;
      overlay.innerHTML = `
        <div class="popup-card">
          <div class="popup-spin-badge">Spin ${usedCount} / ${MAX_SPINS}</div>
          <span class="popup-icon">${thisMeta.icon}</span>
          <div class="popup-result-label ${thisMeta.cls}">${thisMeta.label}</div>
          <div class="popup-headline">${thisMeta.headline}</div>
          ${bestDiffers
            ? `<p class="popup-desc" style="margin-bottom:6px">Best so far: <strong style="color:var(--gold)">${bestMeta.label}</strong></p>`
            : `<p class="popup-desc" style="margin-bottom:6px">&nbsp;</p>`
          }
          <p class="popup-spins-left">${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} remaining</p>
          <div class="popup-actions" style="margin-top:16px">
            ${alreadyGtd
              ? `<button class="btn-gold" id="popup-continue" style="display:inline-flex;align-items:center;gap:6px">Claim GTD <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>`
              : `<button class="btn-gold" id="popup-spinagain">Spin Again (${spinsLeft} left)</button>`
            }
          </div>
        </div>`;
    }

    document.body.appendChild(overlay);

    document.getElementById('popup-continue')?.addEventListener('click', () => {
      overlay.remove();
      navigate(bestResult !== 'fail' ? '/step4' : '/step5');
    });

    document.getElementById('popup-spinagain')?.addEventListener('click', () => {
      overlay.remove();
      rotation = INITIAL_ROTATION;
      drawWheel(rotation);
      spinning = false;
      spinBtn.disabled = false;
      spinBtn.textContent = `Spin Again (${spinsLeft} left)`;
    });
  }

  spinBtn.addEventListener('click', spin);
  backBtn.addEventListener('click', () => navigate('/step2'));
}

