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
  const stats = card.level ? card : { level: 1, xp: 0 };
  const xpNext = (stats.level || 1) * 100;
  const xpPct = Math.min(100, Math.round(((stats.xp || 0) / xpNext) * 100));

  const el = document.createElement('div');
  el.className = 'home-page';
  el.innerHTML = `
    <!-- Top bar -->
    <header class="home-topbar">
      <div class="brand-logo home-logo">ZENKAI</div>
      <div class="home-topbar-right">
        <div class="home-status-pill">
          <span class="home-status-dot"></span>
          <span class="home-addr">${esc(shortAddr)}</span>
        </div>
        <button class="btn-ghost home-disconnect" id="btn-disc-home">DISCONNECT</button>
      </div>
    </header>

    <!-- Dashboard grid -->
    <div class="home-grid">

      <!-- Left: Card + stats sidebar -->
      <aside class="home-sidebar">
        <div class="home-card-wrap" id="home-card"></div>

        <div class="home-stats-banner">
          <div class="home-qstat">
            <span class="home-qstat-val">LVL ${stats.level || 1}</span>
            <span class="home-qstat-label">RANK</span>
          </div>
          <div class="home-qstat">
            <span class="home-qstat-val">${stats.xp || 0}</span>
            <span class="home-qstat-label">XP</span>
          </div>
          <div class="home-qstat">
            <span class="home-qstat-val">0W</span>
            <span class="home-qstat-label">WINS</span>
          </div>
          <div class="home-qstat">
            <span class="home-qstat-val">--</span>
            <span class="home-qstat-label">STREAK</span>
          </div>
        </div>

        <div class="home-xp-row">
          <div class="home-xp-track">
            <div class="home-xp-fill" style="width:${xpPct}%"></div>
          </div>
          <span class="home-xp-text">${stats.xp || 0} / ${xpNext} XP</span>
        </div>

        <div class="home-season-bar">
          <span class="home-season-label">SEASON 1</span>
          <span class="home-season-sep">&bull;</span>
          <span class="home-season-text">GENESIS</span>
        </div>
      </aside>

      <!-- Right: Nav + feed -->
      <main class="home-main">
        <nav class="home-nav">
          <button class="home-nav-btn home-nav-primary" data-route="/arena">
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

        <div class="home-section">
          <div class="home-section-header">
            <span class="home-section-title">RECENT ACTIVITY</span>
            <span class="home-section-badge">LIVE</span>
          </div>
          <div class="home-feed" id="home-feed">
            <div class="home-feed-item">
              <span class="feed-icon">⚡</span>
              <span class="feed-text">Warrior awakened</span>
              <span class="feed-time">just now</span>
            </div>
            <div class="home-feed-item feed-dim">
              <span class="feed-icon">🔗</span>
              <span class="feed-text">Wallet connected</span>
              <span class="feed-time">just now</span>
            </div>
            <div class="home-feed-item feed-dim">
              <span class="feed-icon">✍️</span>
              <span class="feed-text">Ownership verified</span>
              <span class="feed-time">just now</span>
            </div>
          </div>
        </div>
      </main>

    </div>
  `;
  app.appendChild(el);

  // Inject the card
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
