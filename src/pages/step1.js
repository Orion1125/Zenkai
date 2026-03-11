// ZENKAI — Step 1: X Username Entry
import { navigate } from '../router.js';

export function renderStep1(container) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening protocol</div>

    <div class="step-title">Begin Awakening</div>
    <p class="step-tagline">Enter your X username to begin awakening</p>

    <p class="nft-label">— collection preview —</p>
    <div class="nft-strip">
      <div class="nft-thumb" data-n="01"><img src="/photo_1_2026-03-04_13-34-11.jpg" alt="ZENKAI #01" /></div>
      <div class="nft-thumb" data-n="02"><img src="/photo_2_2026-03-04_13-34-11.jpg" alt="ZENKAI #02" /></div>
      <div class="nft-thumb" data-n="03"><img src="/photo_3_2026-03-04_13-34-11.jpg" alt="ZENKAI #03" /></div>
      <div class="nft-thumb" data-n="04"><img src="/photo_4_2026-03-04_13-34-11.jpg" alt="ZENKAI #04" /></div>
    </div>

    <div class="input-group">
      <label for="username-input">X Username</label>
      <input
        type="text"
        id="username-input"
        class="input-field"
        placeholder="@yourhandle"
        autocomplete="off"
        spellcheck="false"
        maxlength="50"
      />
      <p class="input-error" id="username-error">Enter a valid username</p>
    </div>

    <button class="btn-gold" id="step1-next" disabled>
      Begin &nbsp;
    </button>
  `;
  container.appendChild(el);

  const input = document.getElementById('username-input');
  const errorEl = document.getElementById('username-error');
  const nextBtn = document.getElementById('step1-next');

  input.addEventListener('input', () => {
    const val = input.value.trim().replace(/^@/, '');
    nextBtn.disabled = val.length < 1;
    errorEl.classList.remove('visible');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !nextBtn.disabled) nextBtn.click();
  });

  nextBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) { errorEl.classList.add('visible'); return; }
    const handle = val.startsWith('@') ? val : '@' + val;
    sessionStorage.setItem('zenkai_handle', handle);
    navigate('/step2');
  });

  requestAnimationFrame(() => input.focus());
}