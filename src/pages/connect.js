// ══════════════════════════════════════════════
// ZENKAI — Connect Wallet (Web3Modal + MetaMask)
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { connectWallet } from '../wallet.js';

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

    <p class="connect-footer">WalletConnect · MetaMask · Coinbase · Any wallet</p>
  `;
  app.appendChild(el);

  const btn    = el.querySelector('#btn-connect');
  const status = el.querySelector('#connect-status');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'CONNECTING...';
    status.textContent = '';

    try {
      const address = await connectWallet();
      localStorage.setItem('zenkai_wallet', address);
      navigate('/card');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '⚡ CONNECT WALLET';
      const msg = err.code === 4001 ? 'Connection rejected.' : (err.message || 'Something went wrong.');
      status.textContent = msg;
      status.style.color = 'var(--red-bright)';
    }
  });
}
