// ZENKAI  Submit Wallet
import { navigate } from '../router.js';

export function renderStep4(container) {
  const handle      = sessionStorage.getItem('zenkai_handle') || '@warrior';
  const prevWallet  = localStorage.getItem('zenkai_submitted_wallet') || null;

  // Truncate address for display  e.g. 0x1234...abcd
  const shortAddr = (addr) => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening protocol</div>

    <div class="step-title">Submit Your Wallet</div>
    <p class="step-tagline">Submit your wallet to secure your spot.</p>

    ${prevWallet ? `
    <!-- Previous wallet choice -->
    <div id="prev-wallet-block">
      <p class="step-tagline" style="margin-bottom:10px">You previously submitted a wallet. Would you like to continue with it or submit a different one?</p>
      <div class="wallet-handle-row" style="margin-bottom:14px">
        <span class="wallet-handle-label">Previous Wallet</span>
        <span class="wallet-handle-value" title="${prevWallet}">${shortAddr(prevWallet)}</span>
      </div>
      <button class="btn-gold" id="step4-use-prev" style="margin-bottom:10px">Continue with Previous Wallet</button>
      <button class="btn-ghost" id="step4-show-new">Submit a Different Wallet</button>
    </div>

    <!-- New wallet form (hidden initially) -->
    <div id="new-wallet-block" style="display:none">
    ` : ''}

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

    <button class="btn-gold" id="step4-submit" disabled>Submit Wallet</button>

    <p class="wallet-disclaimer">
      Only EVM-compatible wallets (Ethereum / Base / etc.). One wallet per handle.
    </p>

    ${prevWallet ? '</div>' : ''}
  `;
  container.appendChild(el);

  const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

  // ── Previous wallet choice handlers ─────────────────────────────
  if (prevWallet) {
    document.getElementById('step4-use-prev').addEventListener('click', () => {
      navigate('/step5');
    });

    document.getElementById('step4-show-new').addEventListener('click', () => {
      document.getElementById('prev-wallet-block').style.display = 'none';
      document.getElementById('new-wallet-block').style.display = '';
      requestAnimationFrame(() => document.getElementById('wallet-input')?.focus());
    });
  }

  const input     = document.getElementById('wallet-input');
  const errorEl   = document.getElementById('wallet-error');
  const submitBtn = document.getElementById('step4-submit');

  async function doSubmit() {
    const address = input.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try {
      const res = await fetch('/api/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, handle, tier: 'fcfs' }),
      });

      const data = await res.json();

      if (res.ok || res.status === 409) {
        localStorage.setItem('zenkai_submitted_wallet', address);
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

  //  Input validation 
  input?.addEventListener('input', () => {
    const val = input.value.trim();
    submitBtn.disabled = !ETH_RE.test(val);
    input.classList.remove('error');
    errorEl.classList.remove('visible');
  });

  //  Submit 
  submitBtn?.addEventListener('click', () => {
    const address = input.value.trim();
    if (!ETH_RE.test(address)) {
      input.classList.add('error');
      errorEl.classList.add('visible');
      return;
    }
    doSubmit();
  });

  if (!prevWallet) requestAnimationFrame(() => input?.focus());
}