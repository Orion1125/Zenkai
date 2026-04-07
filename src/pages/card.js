// ══════════════════════════════════════════════
// ZENKAI — Card Reveal
// ══════════════════════════════════════════════

import { navigate } from '../router.js';
import { playCardReveal } from '../sound.js';
import { signOwnership } from '../wallet.js';
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

  const el = document.createElement('div');
  el.className = 'card card-reveal-page';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">YOUR WARRIOR</div>
    <div id="card-content"></div>
  `;
  app.appendChild(el);

  const content = el.querySelector('#card-content');

  // Check for previously verified card
  let savedCard = null;
  try { savedCard = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  const hasVerified = localStorage.getItem('zenkai_verified') === address;

  // If already verified + saved card, go straight to home
  if (savedCard && hasVerified) {
    navigate('/home');
    return;
  }

  // ── Step 1: Signature verification ──
  content.innerHTML = `
    <div class="verify-step">
      <div class="verify-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
          <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="verify-title">PROVE OWNERSHIP</h3>
      <p class="verify-msg">Sign a message to verify this wallet is yours.<br>No gas fee — just a signature.</p>
      <button class="btn-gold" id="btn-sign">🔐 SIGN MESSAGE</button>
      <p class="verify-status" id="verify-status"></p>
      <button class="btn-ghost" id="btn-disc-verify">DISCONNECT</button>
    </div>
  `;

  content.querySelector('#btn-disc-verify').addEventListener('click', () => {
    localStorage.removeItem('zenkai_wallet');
    localStorage.removeItem('zenkai_card');
    localStorage.removeItem('zenkai_verified');
    navigate('/');
  });

  const signBtn = content.querySelector('#btn-sign');
  const signStatus = content.querySelector('#verify-status');

  signBtn.addEventListener('click', async () => {
    signBtn.disabled = true;
    signBtn.textContent = 'WAITING FOR SIGNATURE...';
    signStatus.textContent = '';

    try {
      await signOwnership(address);
      localStorage.setItem('zenkai_verified', address);

      // ── Step 2: Scanning animation ──
      await showScanningPhase(content, address);

    } catch (err) {
      signBtn.disabled = false;
      signBtn.textContent = '🔐 SIGN MESSAGE';
      const msg = err.code === 4001 || err.code === 'ACTION_REJECTED'
        ? 'Signature rejected.'
        : (err.message || 'Signature failed.');
      signStatus.textContent = msg;
      signStatus.style.color = 'var(--red-bright, #ff4444)';
    }
  });
}

// ── Scanning phase (after signature) ──────────────────────────────────────────
async function showScanningPhase(content, address) {
  content.innerHTML = `
    <div class="scan-phase">
      <div class="scan-ring">
        <div class="scan-ring-inner"></div>
      </div>
      <p class="scan-text" id="scan-text">Verifying ownership...</p>
    </div>
  `;

  const scanText = content.querySelector('#scan-text');

  // Phase messages with delays for suspense
  await delay(800);
  scanText.textContent = 'Scanning wallet for NFTs...';

  // Actually fetch NFTs during the scanning animation
  const nftsPromise = fetchNFTs(address);

  await delay(1200);
  scanText.textContent = 'Analyzing card data...';

  const nfts = await nftsPromise;

  await delay(800);

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
      localStorage.removeItem('zenkai_verified');
      navigate('/');
    });
    return;
  }

  scanText.textContent = 'Warrior found! Preparing reveal...';
  await delay(1000);

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

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Element glyphs for reveal ────────────────────────────────────────────────
const ELEMENT_GLYPHS = {
  FIRE:   '🔥',
  WATER:  '💧',
  EARTH:  '⛰️',
  SHADOW: '🌑',
  WIND:   '🌀',
  VOID:   '✦',
};

// ── Card reveal sequence ────────────────────────────────────────────────────
function showReveal(container, card, address, isDemo = false) {
  const cardData = { ...card, level: card.level || 1, xp: card.xp || 0, owner: address, attributes: card.attributes || [] };
  localStorage.setItem('zenkai_card', JSON.stringify(cardData));

  const stats = deriveStats(cardData.tokenId, cardData.attributes);
  const element = stats.element || 'VOID';
  const elemColor = stats.elementColor || ELEMENT_COLORS[element] || '#ffcc00';
  const glyph = ELEMENT_GLYPHS[element] || '✦';

  container.innerHTML = `
    <div id="reveal-stage" class="reveal-stage">
      <div class="reveal-particles" id="reveal-particles"></div>
      <div class="reveal-flipper" id="reveal-flipper">
        <div class="reveal-face reveal-back">
          <div class="reveal-back-pattern"></div>
          <div class="reveal-element-glyph" style="--elem-color: ${elemColor}">${glyph}</div>
          <div class="reveal-back-title">ZENKAI</div>
        </div>
        <div class="reveal-face reveal-front" id="reveal-front"></div>
      </div>
    </div>
  `;

  const stage    = container.querySelector('#reveal-stage');
  const flipper  = container.querySelector('#reveal-flipper');
  const front    = container.querySelector('#reveal-front');
  const particles = container.querySelector('#reveal-particles');

  // Phase 1: glyph pulse (already animated via CSS)
  // Phase 2: spawn element particles, then flip
  setTimeout(() => {
    spawnParticles(particles, elemColor);
    playCardReveal();

    // Phase 3: flip the card
    setTimeout(() => {
      front.innerHTML = buildCardHTML(cardData);
      flipper.classList.add('reveal-flipped');

      // Phase 4: element glow settles
      setTimeout(() => {
        stage.classList.add('reveal-glow');
        stage.style.setProperty('--elem-color', elemColor);

        // Navigate to homepage after reveal settles
        setTimeout(() => {
          navigate('/home');
        }, 800);
      }, 600);
    }, 300);
  }, 800);
}

// ── Particle burst ──────────────────────────────────────────────────────────
function spawnParticles(container, color) {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'reveal-particle';
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const dist  = 80 + Math.random() * 60;
    const size  = 3 + Math.random() * 4;
    const dur   = 0.6 + Math.random() * 0.4;
    p.style.cssText = `
      --angle: ${angle}deg;
      --dist: ${dist}px;
      --size: ${size}px;
      --dur: ${dur}s;
      background: ${color};
    `;
    container.appendChild(p);
  }
}
