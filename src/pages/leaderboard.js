// ══════════════════════════════════════════════
// ZENKAI — Leaderboard
// ══════════════════════════════════════════════

import { navigate } from '../router.js';

const esc = (s) => String(s || '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function renderLeaderboard(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  const el = document.createElement('div');
  el.className = 'card leaderboard-page';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="lb-header">
      <button class="btn-ghost lb-back" id="lb-back">&larr;</button>
      <div class="brand-logo lb-logo">LEADERBOARD</div>
    </div>
    <div class="lb-list" id="lb-list">
      <div class="lb-loading">Loading...</div>
    </div>
  `;
  app.appendChild(el);

  el.querySelector('#lb-back').addEventListener('click', () => navigate('/home'));

  // Fetch leaderboard
  const list = el.querySelector('#lb-list');
  try {
    const API = import.meta.env.VITE_API_URL || 'https://zenkai-api.nawa-dev.workers.dev';
    const res = await fetch(`${API}/api/game/leaderboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.leaderboard || data.data || data || [];

    if (!Array.isArray(entries) || entries.length === 0) {
      list.innerHTML = `<div class="lb-empty">No warriors ranked yet.</div>`;
      return;
    }

    list.innerHTML = entries.map((e, i) => {
      const rank = i + 1;
      const medal = rank === 1 ? '&#x1F947;' : rank === 2 ? '&#x1F948;' : rank === 3 ? '&#x1F949;' : `#${rank}`;
      const addr = e.wallet || e.address || '';
      const short = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '???';
      const wins = e.wins ?? e.w ?? 0;
      const losses = e.losses ?? e.l ?? 0;
      const rating = e.competitive_rating ?? 1500;
      const tier = e.competitive_tier || 'Gold';
      const highlight = addr.toLowerCase() === address.toLowerCase() ? ' lb-you' : '';
      return `
        <div class="lb-row${highlight}">
          <span class="lb-rank">${medal}</span>
          <span class="lb-addr">${esc(short)} • ${esc(tier)} ${esc(rating)}</span>
          <span class="lb-record">${Number(wins)}W / ${Number(losses)}L</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div class="lb-empty">Failed to load leaderboard.</div>`;
  }
}
