// ══════════════════════════════════════════════
// ZENKAI — Home Dashboard
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { buildCardHTML } from './card.js';
import { disconnectWallet } from '../wallet.js';

const esc = (s) => String(s || '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderHome(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let card = null;
  try { card = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  if (!card) { navigate('/card'); return; }

  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;

  const el = document.createElement('div');
  el.className = 'card home-page';
  el.innerHTML = `
    <div class="card-accent"></div>

    <div class="home-top">
      <div class="brand-logo home-logo">ZENKAI</div>
      <span class="home-addr">${esc(shortAddr)}</span>
    </div>

    <div class="home-card-wrap" id="home-card"></div>

    <nav class="home-nav">
      <button class="home-nav-btn" data-route="/arena">
        <div class="home-nav-icon">⚔️</div>
        <span class="home-nav-label">BATTLE</span>
        <span class="home-nav-desc">Enter the arena</span>
      </button>
      <button class="home-nav-btn" data-route="/profile">
        <div class="home-nav-icon">👤</div>
        <span class="home-nav-label">PROFILE</span>
        <span class="home-nav-desc">Stats & settings</span>
      </button>
      <button class="home-nav-btn" data-route="/card">
        <div class="home-nav-icon">🃏</div>
        <span class="home-nav-label">INVENTORY</span>
        <span class="home-nav-desc">Change warrior</span>
      </button>
      <button class="home-nav-btn" data-route="/leaderboard">
        <div class="home-nav-icon">🏆</div>
        <span class="home-nav-label">LEADERBOARD</span>
        <span class="home-nav-desc">Top warriors</span>
      </button>
    </nav>

    <button class="btn-ghost home-disconnect" id="btn-disc-home">DISCONNECT</button>
  `;
  app.appendChild(el);

  // Inject the mini card
  const cardWrap = el.querySelector('#home-card');
  cardWrap.innerHTML = buildCardHTML(card);

  // Navigation
  el.querySelectorAll('.home-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  // Disconnect
  el.querySelector('#btn-disc-home').addEventListener('click', async () => {
    localStorage.removeItem('zenkai_wallet');
    localStorage.removeItem('zenkai_card');
    localStorage.removeItem('zenkai_verified');
    try { await disconnectWallet(); } catch {}
    navigate('/');
  });
}
