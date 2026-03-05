// ZENKAI  Step 3: Awakening Wheel + 3-Spin Result Tracking
import { navigate } from '../router.js';

const SEGMENTS = [
  { id: 'gtd',  label: 'GTD SPOT',  color: '#C8900A', colorLight: '#FFD700', textColor: '#0A0000' },
  { id: 'fcfs', label: 'FCFS SPOT', color: '#9A0000', colorLight: '#FF2233', textColor: '#FFE0DC' },
  { id: 'fail', label: 'TRY AGAIN', color: '#1A0808', colorLight: '#5A2020', textColor: '#C07050' },
];

const SLICE = (2 * Math.PI) / 3;
const SEG_CENTERS = [Math.PI / 3, Math.PI, (5 * Math.PI) / 3];
const INITIAL_ROTATION = -5 * Math.PI / 6;
const MAX_SPINS = 3;

// Rarity rank  lower = better
const RANK = { gtd: 0, fcfs: 1, fail: 2 };
function bestOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] <= RANK[b] ? a : b;
}

export function renderStep3(container) {
  // Restore or initialise spin state
  let spinsUsed = parseInt(sessionStorage.getItem('zenkai_spins_used') || '0', 10);
  let bestResult = sessionStorage.getItem('zenkai_best_result') || null;

  // If somehow all spins already used, redirect forward
  if (spinsUsed >= MAX_SPINS) {
    if (bestResult && bestResult !== 'fail') navigate('/step4');
    else navigate('/step5');
    return;
  }

  const canvasSize = Math.min(300, window.innerWidth - 80);

  const spinsLeft = MAX_SPINS - spinsUsed;
  const btnLabel = spinsUsed === 0 ? 'Spin' : `Spin Again (${spinsLeft} left)`;

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening wheel</div>

    <div class="step-indicator">
      <div class="step-node done">1</div>
      <div class="step-line done"></div>
      <div class="step-node done">2</div>
      <div class="step-line done"></div>
      <div class="step-node active">3</div>
      <div class="step-line"></div>
      <div class="step-node">4</div>
      <div class="step-line"></div>
      <div class="step-node">5</div>
    </div>

    <div class="step-title">Spin the Awakening Wheel</div>

    <div class="spin-tracker" id="spin-tracker">
      ${[1,2,3].map(n => `<div class="spin-pip${n <= spinsUsed ? ' used' : ''}" id="pip-${n}"></div>`).join('')}
    </div>
    <p class="spin-tracker-label" id="spin-tracker-label">${spinsUsed === 0 ? '3 spins available' : `${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} remaining`}</p>

    <div class="wheel-container">
      <div class="wheel-pointer"></div>
      <canvas id="wheel-canvas" width="${canvasSize}" height="${canvasSize}"></canvas>
    </div>

    <button class="btn-gold" id="spin-btn">${btnLabel}</button>
    <button class="btn-ghost" id="step3-back" style="margin-top:10px"> Back</button>
  `;
  container.appendChild(el);

  const canvas = document.getElementById('wheel-canvas');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spin-btn');
  const backBtn = document.getElementById('step3-back');

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const r = canvasSize / 2 - 6;

  let rotation = INITIAL_ROTATION;
  let spinning = false;
  let animId = null;

  //  Draw 
  function drawWheel(rot) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const glowGrad = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 6);
    glowGrad.addColorStop(0, 'rgba(255,215,0,0.35)');
    glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    for (let i = 0; i < SEGMENTS.length; i++) {
      const seg = SEGMENTS[i];
      const startAngle = rot + i * SLICE;
      const endAngle = startAngle + SLICE;
      const midAngle = startAngle + SLICE / 2;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, seg.colorLight + '55');
      grad.addColorStop(0.6, seg.color);
      grad.addColorStop(1, seg.color + 'EE');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,215,0,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);
      ctx.translate(r * 0.62, 0);
      ctx.rotate(-midAngle);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const parts = seg.label.split(' ');
      const labelColor = i === 0 ? '#FFD700' : i === 1 ? '#FF9999' : '#806050';
      ctx.fillStyle = labelColor;
      ctx.font = `bold ${Math.floor(canvasSize * 0.048)}px Orbitron, sans-serif`;
      ctx.fillText(parts[0], 0, parts[1] ? -canvasSize * 0.025 : 0);
      if (parts[1]) {
        ctx.font = `600 ${Math.floor(canvasSize * 0.034)}px Orbitron, sans-serif`;
        ctx.fillText(parts[1], 0, canvasSize * 0.028);
      }

      ctx.restore();
    }

    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.14);
    hubGrad.addColorStop(0, '#FFE84D');
    hubGrad.addColorStop(0.5, '#C8900A');
    hubGrad.addColorStop(1, '#2A0A00');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold ${Math.floor(canvasSize * 0.07)}px Orbitron, sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', cx, cy + 1);
  }

  drawWheel(rotation);

  //  Spin tracker UI 
  function updateTracker() {
    for (let n = 1; n <= MAX_SPINS; n++) {
      const pip = document.getElementById(`pip-${n}`);
      if (pip) pip.className = `spin-pip${n <= spinsUsed ? ' used' : ''}`;
    }
    const lbl = document.getElementById('spin-tracker-label');
    const left = MAX_SPINS - spinsUsed;
    if (lbl) lbl.textContent = left > 0 ? `${left} spin${left !== 1 ? 's' : ''} remaining` : 'All spins used';
  }

  //  Easing 
  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  //  Spin 
  function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = 'Spinning...';

    // Weighted: GTD 5% | FCFS 45% | Fail 50%
    const roll = Math.random() * 100;
    const resultIdx = roll < 5 ? 0 : roll < 50 ? 1 : 2;
    const seg = SEGMENTS[resultIdx];
    const segCenter = SEG_CENTERS[resultIdx];

    const base = -Math.PI / 2 - segCenter;
    let targetRotation = base;
    const minTarget = rotation + (6 + Math.random() * 3) * 2 * Math.PI;
    while (targetRotation < minTarget) targetRotation += 2 * Math.PI;

    const startRotation = rotation;
    const totalDelta = targetRotation - startRotation;
    const duration = 4000 + Math.random() * 1500;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      rotation = startRotation + totalDelta * easeOut(t);
      drawWheel(rotation);

      if (t < 1) {
        animId = requestAnimationFrame(frame);
      } else {
        rotation = targetRotation;
        drawWheel(rotation);
        spinning = false;

        // Update persistent state
        spinsUsed++;
        sessionStorage.setItem('zenkai_spins_used', spinsUsed);
        bestResult = bestOf(bestResult, seg.id);
        sessionStorage.setItem('zenkai_best_result', bestResult);
        sessionStorage.setItem('zenkai_result', bestResult);

        updateTracker();
        setTimeout(() => showResultPopup(seg, spinsUsed), 300);
      }
    }

    animId = requestAnimationFrame(frame);
  }

  //  Result Popup 
  function showResultPopup(spinSeg, usedCount) {
    const isFinal = usedCount >= MAX_SPINS;
    const alreadyGtd = bestResult === 'gtd';

    const META = {
      gtd:  { label: 'GTD',       cls: 'gtd',  icon: '', headline: 'GTD Secured',     desc: 'Guaranteed allocation locked in. The path to Zenkai is yours.' },
      fcfs: { label: 'FCFS',      cls: 'fcfs', icon: '', headline: 'FCFS Access',      desc: 'First come first served access granted. Stay ready when the gate opens.' },
      fail: { label: 'TRY AGAIN', cls: 'fail', icon: '', headline: 'Energy Unstable',  desc: 'The orb rejected you.' },
    };

    const thisMeta = META[spinSeg.id];
    const bestMeta = META[bestResult] || thisMeta;
    const spinsLeft = MAX_SPINS - usedCount;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    if (isFinal) {
      // Final popup  show best result
      const isWinner = bestResult !== 'fail';
      overlay.innerHTML = `
        <div class="popup-card">
          <div class="popup-spin-badge">Final Result  Spin 3 / 3</div>
          <span class="popup-icon">${bestMeta.icon}</span>
          <div class="popup-result-label ${bestMeta.cls}">${bestMeta.label}</div>
          <div class="popup-headline">${bestMeta.headline}</div>
          <p class="popup-desc">${bestMeta.desc}</p>
          <div class="popup-actions">
            ${isWinner
              ? `<button class="btn-gold" id="popup-continue">Submit Wallet &nbsp;</button>`
              : `<button class="btn-ghost" id="popup-continue">See Your Result</button>`
            }
          </div>
        </div>
      `;
    } else {
      // Interim popup
      const bestDiffers = bestResult !== spinSeg.id;
      overlay.innerHTML = `
        <div class="popup-card">
          <div class="popup-spin-badge">Spin ${usedCount} / 3</div>
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
              ? `<button class="btn-gold" id="popup-continue">Claim GTD &nbsp;</button>`
              : `<button class="btn-gold" id="popup-spinagain">Spin Again (${spinsLeft} left)</button>`
            }
          </div>
        </div>
      `;
    }

    document.body.appendChild(overlay);

    const continueBtn = document.getElementById('popup-continue');
    const spinAgainBtn = document.getElementById('popup-spinagain');

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        overlay.remove();
        if (bestResult !== 'fail') navigate('/step4');
        else navigate('/step5');
      });
    }

    if (spinAgainBtn) {
      spinAgainBtn.addEventListener('click', () => {
        overlay.remove();
        rotation = INITIAL_ROTATION;
        drawWheel(rotation);
        spinning = false;
        spinBtn.disabled = false;
        spinBtn.textContent = `Spin Again (${spinsLeft} left)`;
      });
    }
  }

  spinBtn.addEventListener('click', spin);
  backBtn.addEventListener('click', () => navigate('/step2'));
}