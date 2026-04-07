// ══════════════════════════════════════════════
// ZENKAI — Card Reveal
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { playCardReveal } from '../sound.js';
import { mapTraitsToCard, deriveStatsFromHash, ELEMENT_COLORS } from '../traits.js';

const NFT_CONTRACT = (import.meta.env.VITE_NFT_CONTRACT || '').toLowerCase();

// ── Derive card stats (trait-based or hash fallback) ────────────────────────
export function deriveStats(tokenId, attributes) {
  if (attributes && attributes.length > 0) {
    return mapTraitsToCard(attributes);
  }
  return deriveStatsFromHash(tokenId);
}

async function fetchNFTs(address) {
  const key = import.meta.env.VITE_ALCHEMY_KEY;
  if (!key) {
    console.warn('[ZENKAI] VITE_ALCHEMY_KEY is empty — cannot fetch NFTs');
    return [];
  }
  if (!address || !address.startsWith('0x')) {
    console.warn('[ZENKAI] Invalid wallet address:', address);
    return [];
  }

  const parseNFTs = (data) =>
    (data.ownedNfts || []).map(n => ({
      tokenId:    n.tokenId || '0',
      name:       n.name    || `ZENKAI #${n.tokenId}`,
      image:      n.image?.cachedUrl || n.image?.originalUrl || '',
      contract:   (n.contract?.address || '').toLowerCase(),
      attributes: n.raw?.metadata?.attributes || [],
    }));

  // Strategy 1: fetch with contract filter on eth-mainnet (most common)
  const filteredUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`
    + `?owner=${encodeURIComponent(address)}&withMetadata=true&pageSize=50`
    + `&contractAddresses%5B%5D=${encodeURIComponent(NFT_CONTRACT)}`;

  try {
    const r = await fetch(filteredUrl);
    if (r.ok) {
      const data = await r.json();
      const nfts = parseNFTs(data);
      if (nfts.length > 0) return nfts;
    }
  } catch (err) {
    console.warn('[ZENKAI] Filtered fetch failed:', err.message);
  }

  // Strategy 2: fetch ALL NFTs for wallet on eth-mainnet, filter client-side
  const allUrl = `https://eth-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`
    + `?owner=${encodeURIComponent(address)}&withMetadata=true&pageSize=100`;

  try {
    const r = await fetch(allUrl);
    if (r.ok) {
      const data = await r.json();
      const all  = parseNFTs(data);
      const matched = NFT_CONTRACT
        ? all.filter(n => n.contract === NFT_CONTRACT)
        : all;
      if (matched.length > 0) return matched;
    }
  } catch (err) {
    console.warn('[ZENKAI] Unfiltered fetch failed:', err.message);
  }

  console.warn('[ZENKAI] No Zenkai NFTs found for', address);
  return [];
}

// ── Build card HTML ─────────────────────────────────────────────────────────
export function buildCardHTML(card) {
  const stats  = deriveStats(card.tokenId, card.attributes);
  const level  = card.level  || 1;
  const xp     = card.xp     || 0;
  const xpNext = level * 100;
  const xpPct  = Math.min(100, Math.round((xp / xpNext) * 100));
  const shortAddr = card.owner
    ? `${card.owner.slice(0, 6)}…${card.owner.slice(-4)}`
    : '';

  // Safe text escaping
  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const rColor = stats.rarityColor || '#888';
  const elemBadge = stats.element
    ? `<span class="zk-element-badge" style="background:${stats.elementColor}">${esc(stats.element)}</span>`
    : '';
  const abilityTag = stats.ability
    ? `<span class="zk-ability-tag" title="${esc(stats.abilityDesc)}">${esc(stats.ability)}</span>`
    : '';

  return `
    <div class="zk-card ${stats.rarity === 'LEGENDARY' ? 'zk-legendary' : stats.rarity === 'EPIC' ? 'zk-epic' : ''}" data-token="${esc(String(card.tokenId))}" data-element="${esc(stats.element)}">
      <div class="zk-card-shine"></div>
      <div class="zk-card-header">
        <a class="zk-card-id" href="https://opensea.io/assets/ethereum/${NFT_CONTRACT}/${card.tokenId}" target="_blank" rel="noopener">ZKN #${esc(String(card.tokenId).padStart(4, '0'))}</a>
        <span class="zk-card-rarity" style="color:${rColor}">${esc(stats.rarity)}</span>
      </div>
      <div class="zk-card-art-wrap">
        ${card.image
          ? `<img class="zk-card-art" src="${esc(card.image)}" alt="${esc(card.name)}" onerror="this.style.display='none'" />`
          : `<div class="zk-card-art-blank"><span>?</span></div>`
        }
        <div class="zk-card-art-overlay"></div>
      </div>
      <div class="zk-card-body">
        <a class="zk-card-name" href="https://opensea.io/assets/ethereum/${NFT_CONTRACT}/${card.tokenId}" target="_blank" rel="noopener">${esc(card.name)}</a>
        <div class="zk-card-meta">${elemBadge}${abilityTag}</div>
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
        <a class="btn-gold" href="https://opensea.io/collection/zenkai-eth" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;margin-top:4px">GET YOUR NFT</a>
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
    if (nft.image) {
      const img = document.createElement('img');
      img.src = nft.image;
      img.alt = nft.name;
      item.appendChild(img);
    } else {
      const blank = document.createElement('div');
      blank.className = 'nft-pick-blank';
      blank.textContent = '?';
      item.appendChild(blank);
    }
    const label = document.createElement('span');
    label.textContent = `#${nft.tokenId}`;
    item.appendChild(label);
    item.addEventListener('click', () => showReveal(content, { ...nft, owner: address }, address));
    grid.appendChild(item);
  });
}

// ── Card reveal sequence ────────────────────────────────────────────────────
function showReveal(container, card, address, isDemo = false) {
  const cardData = { ...card, level: card.level || 1, xp: card.xp || 0, owner: address, attributes: card.attributes || [] };
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
        <button class="btn-ghost" id="btn-profile">VIEW PROFILE</button>
        <button class="btn-ghost" id="btn-change">CHANGE CARD</button>
      `;
      container.appendChild(actions);

      actions.querySelector('#btn-arena').addEventListener('click',  () => navigate('/arena'));
      actions.querySelector('#btn-profile').addEventListener('click', () => navigate('/profile'));
      actions.querySelector('#btn-change').addEventListener('click', () => {
        localStorage.removeItem('zenkai_card');
        navigate('/card');
      });
    }, 600);
  }, 500);
}
