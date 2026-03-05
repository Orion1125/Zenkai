// ZENKAI  Step 4: Submit Wallet + Turnstile challenge
import { navigate } from '../router.js';
import { renderTurnstile, executeChallenge } from '../turnstile.js';

export function renderStep4(container) {
  const handle = sessionStorage.getItem('zenkai_handle') || '@warrior';
  const result = sessionStorage.getItem('zenkai_result') || 'fcfs';

  if (result === 'fail') { navigate('/step5'); return; }

  const tierData = {
    gtd:  { badge: 'GTD',  badgeClass: 'gtd',  headline: 'GTD Allocation',  desc: 'Submit your wallet to lock in your Guaranteed allocation.' },
    fcfs: { badge: 'FCFS', badgeClass: 'fcfs', headline: 'FCFS Access',      desc: 'Submit your wallet to secure your FCFS spot.' },
  };
  const td = tierData[result];

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening protocol</div>

    <div class="step-indicator">
      <div class="step-node done">1</div>
      <div class="step-line done"></div>
      <div class="step-node done">2</div>
      <div class="step-line done"></div>
      <div class="step-node done">3</div>
      <div class="step-line done"></div>
      <div class="step-node active">4</div>
      <div class="step-line"></div>
      <div class="step-node">5</div>
    </div>

    <span class="share-result-badge ${td.badgeClass}">${td.badge}</span>

    <div class="step-title">${td.headline}</div>
    <p class="step-tagline">${td.desc}</p>

    <div class="input-group">
      <label for="wallet-input">EVM Wallet Address</label>
      <input
        type="text"
        id="wallet-input"
        class="input-field"
        placeholder="0x..."
        autocomplete="off"
        spellcheck="false"
        maxlength="42"
      />
      <p class="input-error" id="wallet-error">Enter a valid 0x wallet address</p>
    </div>

    <div class="wallet-handle-row">
      <span class="wallet-handle-label">Submitting as</span>
      <span class="wallet-handle-value">${handle}</span>
    </div>

    <div id="cf-widget-step4" style="display:none"></div>

    <button class="btn-gold" id="step4-submit" disabled>Submit Wallet</button>

    <p class="wallet-disclaimer">
      Only EVM-compatible wallets (Ethereum / Base / etc.). One wallet per handle.
    </p>
  `;
  container.appendChild(el);

  const input     = document.getElementById('wallet-input');
  const errorEl   = document.getElementById('wallet-error');
  const submitBtn = document.getElementById('step4-submit');

  const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

  //  Turnstile 
  let cfWidgetId = null;

  async function doSubmit(cfToken) {
    try {
      const res = await fetch('/api/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: input.value.trim(),
          handle,
          tier: result,
          cfToken,
        }),
      });

      const data = await res.json();

      if (res.ok || res.status === 409) {
        navigate('/step5');
      } else {
        input.classList.add('error');
        errorEl.textContent = data.message || 'Submission failed. Try again.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Wallet';
      }
    } catch {
      errorEl.textContent = 'Connection error. Check your network and retry.';
      errorEl.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Wallet';
    }
  }

  renderTurnstile('cf-widget-step4', {
    onSuccess: (token) => {
      doSubmit(token);
    },
    onError: () => {
      errorEl.textContent = 'Security check failed. Please refresh and try again.';
      errorEl.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Wallet';
    },
  }).then((id) => { cfWidgetId = id; });

  //  Input validation 
  input.addEventListener('input', () => {
    const val = input.value.trim();
    submitBtn.disabled = !ETH_RE.test(val);
    input.classList.remove('error');
    errorEl.classList.remove('visible');
  });

  //  Submit  trigger Turnstile 
  submitBtn.addEventListener('click', () => {
    const address = input.value.trim();
    if (!ETH_RE.test(address)) {
      input.classList.add('error');
      errorEl.classList.add('visible');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
    executeChallenge(cfWidgetId);
  });

  requestAnimationFrame(() => input.focus());
}