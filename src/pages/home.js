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
  const wins = card.wins || 0;
  const losses = card.losses || 0;
  const totalBattles = wins + losses;
  const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
  const rating = card.competitive_rating || 1500;
  const tier = card.competitive_tier || 'Gold';
  const element = card.element || '???';

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
            <span class="home-qstat-val">${wins}W</span>
            <span class="home-qstat-label">WINS</span>
          </div>
          <div class="home-qstat">
            <span class="home-qstat-val">${esc(element)}</span>
            <span class="home-qstat-label">CLASS</span>
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

      <!-- Right: Nav buttons (expanded) -->
      <main class="home-main">
        <nav class="home-nav">
          <button class="home-nav-btn home-nav-primary home-nav-expanded" data-route="/arena">
            <div class="home-nav-icon">⚔️</div>
            <span class="home-nav-label">BATTLE</span>
            <span class="home-nav-desc">Enter the arena</span>
            <div class="home-nav-preview">
              <span class="home-nav-stat">${wins}W / ${losses}L</span>
              <span class="home-nav-stat">${winRate}% WIN RATE</span>
            </div>
          </button>
          <button class="home-nav-btn home-nav-expanded" data-route="/profile">
            <div class="home-nav-icon">👤</div>
            <span class="home-nav-label">PROFILE</span>
            <span class="home-nav-desc">Stats & settings</span>
            <div class="home-nav-preview">
              <span class="home-nav-stat">${esc(tier)} ${rating}</span>
              <span class="home-nav-stat">${totalBattles} BATTLES</span>
            </div>
          </button>
          <button class="home-nav-btn home-nav-expanded" data-route="/equipment">
            <div class="home-nav-icon">🃏</div>
            <span class="home-nav-label">INVENTORY</span>
            <span class="home-nav-desc">Loadout & gear</span>
            <div class="home-nav-preview">
              <span class="home-nav-stat">3 SLOTS EQUIPPED</span>
              <span class="home-nav-stat">LVL ${stats.level || 1} GEAR</span>
            </div>
          </button>
          <button class="home-nav-btn home-nav-expanded" data-route="/leaderboard">
            <div class="home-nav-icon">🏆</div>
            <span class="home-nav-label">LEADERBOARD</span>
            <span class="home-nav-desc">Top warriors</span>
            <div class="home-nav-preview">
              <span class="home-nav-stat">SEASON 1 RANKINGS</span>
              <span class="home-nav-stat">COMPETE & CLIMB</span>
            </div>
          </button>
        </nav>
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
