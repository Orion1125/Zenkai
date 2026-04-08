import { navigate } from '../router.js';
import { buildCardHTML, deriveStats } from './card.js';
import {
  getEquipmentCatalog,
  getEquipmentLoadout,
  getEquipmentProgress,
  purchaseEquipmentLevel,
  updateEquipmentLoadout,
} from '../api.js';
import { buildEquipmentCardView, getLoadoutStatDelta, normalizeCardClass } from '../game/equipment-system.js';

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function renderEquipment(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let card = null;
  try { card = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  if (!card) { navigate('/card'); return; }

  const classKey = normalizeCardClass(card.element || deriveStats(card.tokenId || card.token_id, card.attributes).element);
  const wrap = document.createElement('div');
  wrap.className = 'equipment-wrap';
  wrap.innerHTML = `<div class="profile-loading"><div class="profile-spinner"></div><p class="profile-loading-text">LOADING MARKET...</p></div>`;
  app.appendChild(wrap);

  const [catalogData, progressData, loadoutData] = await Promise.all([
    getEquipmentCatalog(classKey),
    getEquipmentProgress(address),
    getEquipmentLoadout(address, card.tokenId || card.token_id, classKey),
  ]);

  const tracks = catalogData.tracks || catalogData.items || [];
  const trackLevels = progressData.progress?.trackLevelsByClass?.[classKey] || {};
  const forgeShards = progressData.progress?.forgeShards || 0;
  const loadout = loadoutData.loadout || catalogData.starterLoadout || {};
  const enrichedCard = buildEquipmentCardView(card, loadout, trackLevels, classKey);
  localStorage.setItem('zenkai_card', JSON.stringify(enrichedCard));
  localStorage.setItem('zenkai_forge_shards', String(forgeShards));

  renderEquipmentContent(wrap, {
    address,
    card: enrichedCard,
    classKey,
    tracks,
    trackLevels,
    forgeShards,
    activeTab: 'loadout',
  });
}

function renderEquipmentContent(wrap, state) {
  const { address, card, classKey, tracks, trackLevels, forgeShards, activeTab } = state;
  const loadout = card.equipmentLoadout;
  const delta = getLoadoutStatDelta(loadout, classKey, trackLevels);
  const groups = {
    power: tracks.filter((track) => track.slot === 'power'),
    hp: tracks.filter((track) => track.slot === 'hp'),
    speed: tracks.filter((track) => track.slot === 'speed'),
  };

  wrap.innerHTML = `
    <div class="profile-header">
      <div class="brand-logo profile-logo">ZENKAI</div>
      <span class="profile-addr">${esc(address.slice(0, 6))}…${esc(address.slice(-4))}</span>
    </div>

    <div class="equipment-overview">
      <div class="equipment-card-preview">${buildCardHTML(card)}</div>
      <div class="equipment-summary">
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">CLASS</span>
          <span class="equipment-summary-value">${esc(classKey)}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">FORGE SHARDS</span>
          <span class="equipment-summary-value">${forgeShards}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">LOADOUT</span>
          <span class="equipment-summary-value equipment-summary-list">${loadout.summary.map(esc).join(' • ')}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">DELTA</span>
          <span class="equipment-summary-value">PWR ${delta.pwr >= 0 ? '+' : ''}${delta.pwr} • HP ${delta.hp >= 0 ? '+' : ''}${delta.hp} • SPD ${delta.spd >= 0 ? '+' : ''}${delta.spd}</span>
        </div>
      </div>
    </div>

    <div class="equipment-tab-row">
      <button class="btn-ghost equipment-tab${activeTab === 'loadout' ? ' active' : ''}" data-tab="loadout">LOADOUT</button>
      <button class="btn-ghost equipment-tab${activeTab === 'shop' ? ' active' : ''}" data-tab="shop">SHOP</button>
    </div>

    <div class="equipment-slot-block">
      ${activeTab === 'loadout'
        ? ['power', 'hp', 'speed'].map((slot) => `
          <section class="equipment-slot-panel">
            <div class="divider">${slot.toUpperCase()} TRACKS</div>
            <div class="equipment-grid">
              ${groups[slot].map((track) => {
                const current = trackLevels[track.trackId] || 1;
                const equipped = (
                  (slot === 'power' && loadout.powerTrackId === track.trackId) ||
                  (slot === 'hp' && loadout.hpTrackId === track.trackId) ||
                  (slot === 'speed' && loadout.speedTrackId === track.trackId)
                );
                return `
                  <article class="equipment-item${equipped ? ' equipped' : ''}">
                    <div class="equipment-item-head">
                      <span class="equipment-item-code">${esc(track.code)}</span>
                      <span class="equipment-item-name">${esc(track.familyName)} LV ${current}</span>
                    </div>
                    <div class="equipment-item-effects">
                      ${(track.levels[current - 1].effects || []).map((effect) => `<span class="equipment-effect-line">${esc(effect)}</span>`).join('')}
                    </div>
                    <button class="btn-gold equipment-action" data-mode="equip" data-slot="${slot}" data-track-id="${esc(track.trackId)}" ${equipped ? 'disabled' : ''}>${equipped ? 'EQUIPPED' : 'EQUIP'}</button>
                  </article>
                `;
              }).join('')}
            </div>
          </section>
        `).join('')
        : ['power', 'hp', 'speed'].map((slot) => `
          <section class="equipment-slot-panel">
            <div class="divider">${slot.toUpperCase()} SHOP</div>
            <div class="equipment-grid">
              ${groups[slot].map((track) => {
                const current = trackLevels[track.trackId] || 1;
                const next = track.levels[current] || null;
                return `
                  <article class="equipment-item">
                    <div class="equipment-item-head">
                      <span class="equipment-item-code">${esc(track.code)}</span>
                      <span class="equipment-item-name">${esc(track.familyName)}</span>
                    </div>
                    <div class="equipment-item-effects">
                      <span class="equipment-effect-line">Current LV ${current}</span>
                      ${(track.levels[current - 1].effects || []).map((effect) => `<span class="equipment-effect-line">${esc(effect)}</span>`).join('')}
                      ${next ? `<span class="equipment-effect-line equipment-next-line">Next LV ${next.level}: ${esc(next.effects[0] || 'Upgrade')}</span>` : '<span class="equipment-effect-line equipment-next-line">MAX LEVEL</span>'}
                    </div>
                    <button class="btn-gold equipment-action" data-mode="buy" data-track-id="${esc(track.trackId)}" ${!next ? 'disabled' : ''}>${next ? `BUY LV ${next.level} • ${next.price}` : 'MAXED'}</button>
                  </article>
                `;
              }).join('')}
            </div>
          </section>
        `).join('')}
    </div>

    <div class="profile-nav">
      <button class="btn-ghost" id="btn-home-equip">HOME</button>
      <button class="btn-ghost" id="btn-arena-equip">ENTER ARENA</button>
    </div>
  `;

  wrap.querySelector('#btn-home-equip')?.addEventListener('click', () => navigate('/home'));
  wrap.querySelector('#btn-arena-equip')?.addEventListener('click', () => navigate('/arena'));
  wrap.querySelectorAll('.equipment-tab').forEach((button) => {
    button.addEventListener('click', () => renderEquipmentContent(wrap, { ...state, activeTab: button.dataset.tab }));
  });

  wrap.querySelectorAll('.equipment-action').forEach((button) => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.mode;
      const trackId = button.dataset.trackId;
      const slot = button.dataset.slot;
      button.disabled = true;

      if (mode === 'buy') {
        const purchase = await purchaseEquipmentLevel(address, classKey, trackId);
        if (purchase.error) {
          button.disabled = false;
          button.textContent = purchase.message || 'FAILED';
          return;
        }
        const nextTrackLevels = purchase.progress.trackLevels || purchase.progress.trackLevelsByClass?.[classKey] || trackLevels;
        renderEquipmentContent(wrap, {
          ...state,
          trackLevels: nextTrackLevels,
          forgeShards: purchase.progress.forgeShards,
          card: (() => {
            const updatedCard = buildEquipmentCardView(
              { ...card, forge_shards: purchase.progress.forgeShards },
              loadout,
              nextTrackLevels,
              classKey
            );
            localStorage.setItem('zenkai_card', JSON.stringify(updatedCard));
            localStorage.setItem('zenkai_forge_shards', String(purchase.progress.forgeShards));
            return updatedCard;
          })(),
        });
        return;
      }

      const nextLoadout = {
        powerTrackId: slot === 'power' ? trackId : loadout.powerTrackId,
        hpTrackId: slot === 'hp' ? trackId : loadout.hpTrackId,
        speedTrackId: slot === 'speed' ? trackId : loadout.speedTrackId,
      };
      const saved = await updateEquipmentLoadout(address, card.tokenId || card.token_id, nextLoadout, classKey);
      if (saved.error) {
        button.disabled = false;
        button.textContent = saved.message || 'FAILED';
        return;
      }

      const updatedCard = buildEquipmentCardView(card, saved.loadout || nextLoadout, trackLevels, classKey);
      localStorage.setItem('zenkai_card', JSON.stringify(updatedCard));
      renderEquipmentContent(wrap, {
        ...state,
        card: updatedCard,
        activeTab: 'loadout',
      });
    });
  });
}
