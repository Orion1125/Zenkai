// ══════════════════════════════════════════════
// ZENKAI — Card Reveal
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { playCardReveal } from '../sound.js';

// ── Stat derivation (deterministic from tokenId) ────────────────────────────
export function deriveStats(tokenId) {
  const s  = String(tokenId);
  let   h  = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  h = Math.abs(h);

  const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  const rarityIdx = h % 100 < 50 ? 0 : h % 100 < 75 ? 1 : h % 100 < 90 ? 2 : h % 100 < 98 ? 3 : 4;

  return {
    pwr:    45 + (h * 7)  % 40,
    def:    30 + (h * 11) % 40,
    spd:    50 + (h * 13) % 30,
    rarity: RARITIES[rarityIdx],
    hue:    h % 360,
  };
}

const RARITY_COLOR = {
  COMMON:    '#888888',
  UNCOMMON:  '#00c0ff',
  RARE:      '#b040ff',
  EPIC:      '#ff9900',
  LEGENDARY: '#FFD000',
};

const NFT_CONTRACT = (import.meta.env.VITE_NFT_CONTRACT || '').toLowerCase();

// Try multiple chains — return results from whichever one has the NFT
const CHAINS = [
  'eth-mainnet',
  'base-mainnet',
  'polygon-mainnet',
  'arb-mainnet',
  'opt-mainnet',
];

async function fetchNFTs(address) {
  const key = import.meta.env.VITE_ALCHEMY_KEY;
  if (!key) return [];

  const buildUrl = (chain) => {
    let url = `https://${chain}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`
      + `?owner=${address}&withMetadata=true&pageSize=50`
      + `&includeFilters[]=SPAM`;          // include everything, don't auto-filter
    if (NFT_CONTRACT) url += `&contractAddresses[]=${NFT_CONTRACT}`;
    return url;
  };

  const parseNFTs = (data) =>
    (data.ownedNfts || []).map(n => ({
      tokenId:  n.tokenId || '0',
      name:     n.name    || `ZENKAI #${n.tokenId}`,
      image:    n.image?.cachedUrl || n.image?.originalUrl || '',
      contract: n.contract?.address || '',
    }));

  // Fire all chains in parallel, return first non-empty result
  try {
    const results = await Promise.all(
      CHAINS.map(chain =>
        fetch(buildUrl(chain))
          .then(r => r.json())
          .then(d => parseNFTs(d))
          .catch(() => [])
      )
    );
    // Return the first chain that has NFTs, or empty
    return results.find(r => r.length > 0) || [];
  } catch {
    return [];
  }
}

// ── Build card HTML ─────────────────────────────────────────────────────────
export function buildCardHTML(card) {
  const stats  = deriveStats(card.tokenId);
  const rColor = RARITY_COLOR[stats.rarity] || '#888';
  const level  = card.level  || 1;
  const xp     = card.xp     || 0;
  const xpNext = level * 100;
  const xpPct  = Math.min(100, Math.round((xp / xpNext) * 100));
  const shortAddr = card.owner
    ? `${card.owner.slice(0, 6)}…${card.owner.slice(-4)}`
    : '';

  return `
    <div class="zk-card" data-token="${card.tokenId}">
      <div class="zk-card-shine"></div>
      <div class="zk-card-header">
        <span class="zk-card-id">ZKN #${card.tokenId.toString().padStart(4, '0')}</span>
        <span class="zk-card-rarity" style="color:${rColor}">${stats.rarity}</span>
      </div>
      <div class="zk-card-art-wrap">
        ${card.image
          ? `<img class="zk-card-art" src="${card.image}" alt="${card.name}" onerror="this.style.display='none'" />`
          : `<div class="zk-card-art-blank"><span>?</span></div>`
        }
        <div class="zk-card-art-overlay"></div>
      </div>
      <div class="zk-card-body">
        <div class="zk-card-name">${card.name}</div>
        <div class="zk-stats">
          <div class="zk-stat pwr">
            <span class="zk-stat-label">PWR</span>
            <div class="zk-stat-bar"><div class="zk-stat-fill" style="width:${stats.pwr}%"></div></div>
            <span class="zk-stat-val">${stats.pwr}</span>
          </div>
          <div class="zk-stat def">
            <span class="zk-stat-label">DEF</span>
            <div class="zk-stat-bar"><div class="zk-stat-fill" style="width:${stats.def}%"></div></div>
            <span class="zk-stat-val">${stats.def}</span>
          </div>
          <div class="zk-stat spd">
            <span class="zk-stat-label">SPD</span>
            <div class="zk-stat-bar"><div class="zk-stat-fill" style="width:${stats.spd}%"></div></div>
            <span class="zk-stat-val">${stats.spd}</span>
          </div>
        </div>
        <div class="zk-level-row">
          <span class="zk-level-badge">LVL ${level}</span>
          <div class="zk-xp-track"><div class="zk-xp-fill" style="width:${xpPct}%"></div></div>
          <span class="zk-xp-text">${xp}/${xpNext} XP</span>
        </div>
      </div>
    </div>
  `;
}

// ── Render card back (face-down) ────────────────────────────────────────────
export function buildCardBack() {
  return `
    <div class="zk-card zk-card-back-face">
      <div class="zk-back-pattern"></div>
      <div class="zk-back-logo">ZENKAI</div>
    </div>
  `;
}

// ── Main render ─────────────────────────────────────────────────────────────
export async function renderCard(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let savedCard = null;
  try { savedCard = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}

  const el = document.createElement('div');
  el.className = 'card card-reveal-page';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">YOUR WARRIOR</div>
    <div id="card-content"><p class="step-tagline">Scanning wallet…</p></div>
  `;
  app.appendChild(el);

  const content = el.querySelector('#card-content');

  if (savedCard) {
    showReveal(content, savedCard, address);
    return;
  }

  const nfts = await fetchNFTs(address);

  if (nfts.length === 0) {
    content.innerHTML = `
      <div class="no-nft-wrap">
        <div class="no-nft-icon">✕</div>
        <h3 class="no-nft-title">NO ZENKAI NFT FOUND</h3>
        <p class="no-nft-msg">This wallet doesn't hold a Zenkai NFT.<br>Please purchase one and try again.</p>
        <a class="btn-gold" href="https://opensea.io/collection/zenkai" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;margin-top:4px">GET YOUR NFT</a>
        <button class="btn-ghost" id="btn-disc">DISCONNECT</button>
      </div>
    `;
    content.querySelector('#btn-disc').addEventListener('click', () => {
      localStorage.removeItem('zenkai_wallet');
      localStorage.removeItem('zenkai_card');
      navigate('/');
    });
    return;
  }

  if (nfts.length === 1) {
    showReveal(content, { ...nfts[0], owner: address }, address);
    return;
  }

  // Multi-NFT picker
  content.innerHTML = `
    <p class="step-tagline">Choose your warrior</p>
    <div class="nft-pick-grid" id="nft-grid"></div>
  `;
  const grid = content.querySelector('#nft-grid');
  nfts.forEach(nft => {
    const item = document.createElement('div');
    item.className = 'nft-pick-item';
    item.innerHTML = nft.image
      ? `<img src="${nft.image}" alt="${nft.name}" /><span>#${nft.tokenId}</span>`
      : `<div class="nft-pick-blank">?</div><span>#${nft.tokenId}</span>`;
    item.addEventListener('click', () => showReveal(content, { ...nft, owner: address }, address));
    grid.appendChild(item);
  });
}

// ── Card reveal sequence ────────────────────────────────────────────────────
function showReveal(container, card, address, isDemo = false) {
  const cardData = { ...card, level: card.level || 1, xp: card.xp || 0, owner: address };
  localStorage.setItem('zenkai_card', JSON.stringify(cardData));

  container.innerHTML = `
    <div id="reveal-stage">
      ${buildCardBack()}
    </div>
    ${isDemo ? '' : ''}
  `;

  const stage = container.querySelector('#reveal-stage');

  setTimeout(() => {
    playCardReveal();
    stage.innerHTML = buildCardHTML(cardData);
    const zkCard = stage.querySelector('.zk-card');
    zkCard.classList.add('zk-reveal-anim');

    setTimeout(() => {
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <button class="btn-gold" id="btn-arena">ENTER ARENA</button>
        <button class="btn-ghost" id="btn-change">CHANGE CARD</button>
      `;
      container.appendChild(actions);

      actions.querySelector('#btn-arena').addEventListener('click',  () => navigate('/arena'));
      actions.querySelector('#btn-change').addEventListener('click', () => {
        localStorage.removeItem('zenkai_card');
        navigate('/card');
      });
    }, 600);
  }, 500);
}
