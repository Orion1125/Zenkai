import { navigate } from '../router.js';
import { buildCardHTML, deriveStats } from './card.js';
import {
  getEquipmentCatalog,
  getEquipmentLoadout,
  getEquipmentProgress,
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
  });
}

function renderEquipmentContent(wrap, state) {
  const { address, card, classKey, tracks, trackLevels } = state;
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
          <span class="equipment-summary-label">CARD LEVEL</span>
          <span class="equipment-summary-value">LV ${card.level || 1}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">LOADOUT</span>
          <span class="equipment-summary-value equipment-summary-list">${(loadout.summary || []).map(esc).join(' \u2022 ')}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">DELTA</span>
          <span class="equipment-summary-value">PWR ${delta.pwr >= 0 ? '+' : ''}${delta.pwr} \u2022 HP ${delta.hp >= 0 ? '+' : ''}${delta.hp} \u2022 SPD ${delta.spd >= 0 ? '+' : ''}${delta.spd}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">INFO</span>
          <span class="equipment-summary-value" style="font-size:0.65rem;color:var(--text-dim)">All equipment levels up with your card. Win battles to level up!</span>
        </div>
      </div>
    </div>

    <div class="equipment-slot-block">
      ${['power', 'hp', 'speed'].map((slot) => `
        <section class="equipment-slot-panel">
          <div class="divider">${slot.toUpperCase()} TRACKS</div>
          <div class="equipment-grid">
            ${groups[slot].map((track) => {
              const current = Math.min(trackLevels[track.trackId] || 1, track.levels.length);
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
      `).join('')}
    </div>

    <p class="equipment-status" id="equipment-status"></p>

    <div class="profile-nav">
      <button class="btn-ghost" id="btn-home-equip">HOME</button>
      <button class="btn-ghost" id="btn-arena-equip">ENTER ARENA</button>
    </div>
  `;

  wrap.querySelector('#btn-home-equip')?.addEventListener('click', () => navigate('/home'));
  wrap.querySelector('#btn-arena-equip')?.addEventListener('click', () => navigate('/arena'));

  const statusEl = wrap.querySelector('#equipment-status');
  const allActions = wrap.querySelectorAll('.equipment-action');
  const tokenId = card.tokenId || card.token_id;

  if (!tokenId) {
    statusEl.textContent = 'Card token missing — return to dashboard and reload.';
    statusEl.className = 'equipment-status visible error';
    allActions.forEach((b) => { b.disabled = true; });
    return;
  }

  allActions.forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      const trackId = button.dataset.trackId;
      const slot = button.dataset.slot;
      const originalLabel = button.textContent;

      // Lock all action buttons during save to prevent stale-loadout races
      allActions.forEach((b) => { b.disabled = true; });
      button.textContent = 'SAVING...';
      statusEl.textContent = '';
      statusEl.className = 'equipment-status';

      const nextLoadout = {
        powerTrackId: slot === 'power' ? trackId : loadout.powerTrackId,
        hpTrackId: slot === 'hp' ? trackId : loadout.hpTrackId,
        speedTrackId: slot === 'speed' ? trackId : loadout.speedTrackId,
      };

      try {
        const saved = await updateEquipmentLoadout(address, tokenId, nextLoadout, classKey);
        if (saved && saved.error) {
          button.textContent = originalLabel;
          statusEl.textContent = saved.message || 'Could not save loadout.';
          statusEl.className = 'equipment-status visible error';
          allActions.forEach((b) => { b.disabled = b.classList.contains('equipped-lock'); });
          return;
        }

        const updatedCard = saved?.card
          ? { ...card, ...saved.card, tokenId, token_id: tokenId }
          : buildEquipmentCardView(card, saved?.loadout || nextLoadout, trackLevels, classKey);
        localStorage.setItem('zenkai_card', JSON.stringify(updatedCard));
        renderEquipmentContent(wrap, {
          ...state,
          card: updatedCard,
        });
        const nextStatus = wrap.querySelector('#equipment-status');
        if (nextStatus) {
          nextStatus.textContent = 'Loadout saved.';
          nextStatus.className = 'equipment-status visible success';
          setTimeout(() => {
            nextStatus.className = 'equipment-status';
          }, 2200);
        }
      } catch (err) {
        button.textContent = originalLabel;
        statusEl.textContent = 'Connection error — try again.';
        statusEl.className = 'equipment-status visible error';
        allActions.forEach((b) => { b.disabled = false; });
      }
    });
  });
}
