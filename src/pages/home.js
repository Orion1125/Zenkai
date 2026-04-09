// ══════════════════════════════════════════════
// ZENKAI — Home Dashboard
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { buildCardHTML, fetchNFTs } from './card.js';
import { disconnectWallet } from '../wallet.js';
import { getPlayerCards, syncCard } from '../api.js';
import { mapTraitsToCard, deriveStatsFromHash } from '../traits.js';

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

        <button class="btn-ghost home-change-card" id="btn-change-card">🔄 CHANGE CARD</button>

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
              <span class="home-nav-stat">${esc(tier)} ${Number(rating) || 1500}</span>
              <span class="home-nav-stat">${totalBattles} BATTLES</span>
            </div>
          </button>
          <button class="home-nav-btn home-nav-expanded" data-route="/equipment">
            <div class="home-nav-icon">🃏</div>
            <span class="home-nav-label">INVENTORY</span>
            <span class="home-nav-desc">Loadout & gear</span>
            <div class="home-nav-preview">
              <span class="home-nav-stat">${(() => { const lo = card.equipmentLoadout; return lo ? Object.values({ p: lo.powerTrackId, h: lo.hpTrackId, s: lo.speedTrackId }).filter(Boolean).length : 0; })()} SLOTS EQUIPPED</span>
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

  // Change card — open NFT picker modal
  el.querySelector('#btn-change-card').addEventListener('click', () => {
    openChangeCardModal(address, card);
  });
}

// ── Change Card Modal ────────────────────────────────────────────────────────
function deriveCardStats(tokenId, attributes) {
  if (attributes && attributes.length > 0) return mapTraitsToCard(attributes);
  return deriveStatsFromHash(tokenId);
}

async function openChangeCardModal(address, currentCard) {
  const modal = document.createElement('div');
  modal.className = 'change-card-modal';
  modal.innerHTML = `
    <div class="change-card-backdrop" data-close></div>
    <div class="change-card-panel">
      <button class="change-card-close" data-close aria-label="Close">&times;</button>
      <h3 class="change-card-title">CHOOSE YOUR WARRIOR</h3>
      <p class="change-card-sub">Each card keeps its own progress.</p>
      <div class="change-card-grid" id="change-card-grid">
        <div class="change-card-loading">Loading your cards...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => { modal.remove(); };
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);

  const grid = modal.querySelector('#change-card-grid');

  // Fetch NFTs and saved progress in parallel
  let nfts = [];
  let progress = { cards: [], activeTokenId: null };
  try {
    [nfts, progress] = await Promise.all([
      fetchNFTs(address).catch(() => []),
      getPlayerCards(address).catch(() => ({ cards: [], activeTokenId: null })),
    ]);
  } catch {
    grid.innerHTML = '<div class="change-card-empty">Failed to load your cards. Try again.</div>';
    return;
  }

  if (!nfts || nfts.length === 0) {
    grid.innerHTML = '<div class="change-card-empty">No Zenkai NFTs found in this wallet.</div>';
    return;
  }

  const progressByToken = new Map();
  for (const p of progress.cards || []) {
    progressByToken.set(String(p.tokenId), p);
  }

  const activeTokenId = String(currentCard?.tokenId || currentCard?.token_id || progress.activeTokenId || '');

  grid.innerHTML = nfts.map((nft) => {
    const tokenId = String(nft.tokenId);
    const stats = deriveCardStats(tokenId, nft.attributes);
    const saved = progressByToken.get(tokenId);
    const level = saved?.level ?? 1;
    const wins = saved?.wins ?? 0;
    const losses = saved?.losses ?? 0;
    const isActive = tokenId === activeTokenId;
    const safeImg = nft.image && /^https?:\/\//i.test(nft.image) ? nft.image : '';
    return `
      <button class="change-card-item${isActive ? ' active' : ''}" data-token="${esc(tokenId)}">
        <div class="change-card-art">
          ${safeImg
            ? `<img src="${esc(safeImg)}" alt="${esc(nft.name)}" onerror="this.style.display='none'" />`
            : `<div class="change-card-art-blank">?</div>`}
        </div>
        <div class="change-card-info">
          <span class="change-card-name">#${esc(tokenId)}</span>
          <span class="change-card-element">${esc(stats.element || '')}</span>
          <div class="change-card-stats">
            <span>LVL ${level}</span>
            <span>${wins}W / ${losses}L</span>
          </div>
          ${isActive ? '<span class="change-card-badge">ACTIVE</span>' : ''}
        </div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.change-card-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetToken = btn.dataset.token;
      if (!targetToken || targetToken === activeTokenId) { close(); return; }

      // Lock buttons during switch
      grid.querySelectorAll('.change-card-item').forEach((b) => { b.disabled = true; });
      btn.classList.add('loading');

      const picked = nfts.find((n) => String(n.tokenId) === targetToken);
      if (!picked) { close(); return; }

      try {
        // Derive stats client-side so the worker has everything it needs for a fresh card row
        const stats = deriveCardStats(String(picked.tokenId), picked.attributes);
        const freshCard = await syncCard(address, {
          ...picked,
          ...stats,
          owner: address,
          attributes: picked.attributes || [],
        });
        const merged = freshCard
          ? {
            ...picked,
            ...freshCard,
            tokenId: freshCard.tokenId || freshCard.token_id || picked.tokenId,
            token_id: freshCard.token_id || picked.tokenId,
            owner: address,
            attributes: picked.attributes || [],
          }
          : { ...picked, owner: address, attributes: picked.attributes || [] };

        localStorage.setItem('zenkai_card', JSON.stringify(merged));
        localStorage.setItem('zenkai_wins', String(merged.wins || 0));
        localStorage.setItem('zenkai_losses', String(merged.losses || 0));
        localStorage.setItem('zenkai_forge_shards', String(merged.forge_shards || 0));
        close();
        document.removeEventListener('keydown', onKey);
        // Reload home to pick up the new active card
        navigate('/home');
      } catch {
        grid.querySelectorAll('.change-card-item').forEach((b) => { b.disabled = false; });
        btn.classList.remove('loading');
      }
    });
  });
}
