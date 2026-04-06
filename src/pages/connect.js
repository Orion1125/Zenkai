// ══════════════════════════════════════════════
// ZENKAI — Connect Wallet
// ══════════════════════════════════════════════

import { navigate } from '../router.js';

export function renderConnect(app) {
  // Already connected — go straight to card
  if (localStorage.getItem('zenkai_wallet')) {
    navigate('/card');
    return;
  }

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">AWAKENING PROTOCOL</div>

    <div class="connect-art">
      <div class="connect-card-ghost">
        <div class="connect-card-inner">
          <span class="connect-card-q">?</span>
          <span class="connect-card-hint">YOUR CARD AWAITS</span>
        </div>
      </div>
    </div>

    <h2 class="step-title">CONNECT <span class="accent">WALLET</span></h2>
    <p class="step-tagline">Your NFT becomes your warrior.<br>Connect to reveal your card and enter the arena.</p>

    <button class="btn-gold" id="btn-connect">⚡ CONNECT WALLET</button>
    <p class="connect-status" id="connect-status"></p>

    <p class="connect-footer">Supports MetaMask and any injected wallet</p>
  `;
  app.appendChild(el);

  const btn    = el.querySelector('#btn-connect');
  const status = el.querySelector('#connect-status');

  btn.addEventListener('click', async () => {
    if (!window.ethereum) {
      status.textContent = '⚠ No wallet detected. Install MetaMask first.';
      status.style.color = 'var(--red-bright)';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'CONNECTING...';

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address  = accounts[0].toLowerCase();
      localStorage.setItem('zenkai_wallet', address);
      navigate('/card');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '⚡ CONNECT WALLET';
      status.textContent = err.code === 4001 ? 'Connection rejected.' : (err.message || 'Something went wrong.');
      status.style.color = 'var(--red-bright)';
    }
  });
}
