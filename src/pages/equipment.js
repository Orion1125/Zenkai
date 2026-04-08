import { navigate } from '../router.js';
import { deriveStats, buildCardHTML } from './card.js';
import {
  getEquipmentCatalog,
  getEquipmentLoadout,
  getEquipmentProgress,
  unlockEquipment,
  updateEquipmentLoadout,
} from '../api.js';
import { buildEquipmentCardView, getLoadoutStatDelta } from '../game/equipment-system.js';

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function renderEquipment(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let card = null;
  try { card = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  if (!card) { navigate('/card'); return; }

  const derived = deriveStats(card.tokenId, card.attributes);
  const cardClass = derived.element;
  const wrap = document.createElement('div');
  wrap.className = 'equipment-wrap';
  wrap.innerHTML = `
    <div class="profile-header">
      <div class="brand-logo profile-logo">ZENKAI</div>
      <span class="profile-addr">${esc(address.slice(0, 6))}…${esc(address.slice(-4))}</span>
    </div>
    <div class="profile-loading">
      <div class="profile-spinner"></div>
      <p class="profile-loading-text">LOADING LOADOUT…</p>
    </div>
  `;
  app.appendChild(wrap);

  const [catalogData, progressData, loadoutData] = await Promise.all([
    getEquipmentCatalog(cardClass),
    getEquipmentProgress(address),
    getEquipmentLoadout(address, card.tokenId, cardClass),
  ]);

  const items = catalogData.items || [];
  const progress = progressData.progress || { forgeShards: 0, unlockedByClass: {} };
  const loadout = loadoutData.loadout || catalogData.starterLoadout || {};
  const unlockedIds = new Set(progress.unlockedByClass?.[cardClass] || []);
  const enrichedCard = buildEquipmentCardView({ ...card, ...derived }, loadout, cardClass);
  localStorage.setItem('zenkai_card', JSON.stringify(enrichedCard));
  localStorage.setItem('zenkai_forge_shards', String(progress.forgeShards || 0));

  renderEquipmentContent(wrap, address, enrichedCard, cardClass, items, progress, loadout, unlockedIds);
}

function renderEquipmentContent(wrap, address, card, cardClass, items, progress, loadout, unlockedIds) {
  const delta = getLoadoutStatDelta(loadout, cardClass);
  const bySlot = {
    power: items.filter((item) => item.slot === 'power'),
    defense: items.filter((item) => item.slot === 'defense'),
    speed: items.filter((item) => item.slot === 'speed'),
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
          <span class="equipment-summary-value">${esc(cardClass)}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">FORGE SHARDS</span>
          <span class="equipment-summary-value">${progress.forgeShards || 0}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">LOADOUT</span>
          <span class="equipment-summary-value equipment-summary-list">${card.equipmentLoadout.summary.map(esc).join(' • ')}</span>
        </div>
        <div class="equipment-summary-row">
          <span class="equipment-summary-label">DELTA</span>
          <span class="equipment-summary-value">PWR ${delta.pwr >= 0 ? '+' : ''}${delta.pwr} • DEF ${delta.def >= 0 ? '+' : ''}${delta.def} • SPD ${delta.spd >= 0 ? '+' : ''}${delta.spd}</span>
        </div>
      </div>
    </div>

    <div class="equipment-slot-block">
      ${['power', 'defense', 'speed'].map((slot) => `
        <section class="equipment-slot-panel">
          <div class="divider">${slot.toUpperCase()} GEAR</div>
          <div class="equipment-grid">
            ${bySlot[slot].map((item) => {
              const equipped = (
                (slot === 'power' && loadout.powerItemId === item.id) ||
                (slot === 'defense' && loadout.defenseItemId === item.id) ||
                (slot === 'speed' && loadout.speedItemId === item.id)
              );
              const unlocked = item.starter || unlockedIds.has(item.id);
              const actionLabel = equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : `UNLOCK ${item.cost}`;
              const actionClass = equipped ? 'btn-ghost' : 'btn-gold';
              return `
                <article class="equipment-item${equipped ? ' equipped' : ''}">
                  <div class="equipment-item-head">
                    <span class="equipment-item-code">${esc(item.code)}</span>
                    <span class="equipment-item-name">${esc(item.name)}</span>
                  </div>
                  <div class="equipment-item-effects">
                    ${item.effects.map((effect) => `<span class="equipment-effect-line">${esc(effect)}</span>`).join('')}
                  </div>
                  <button class="${actionClass} equipment-action" data-item-id="${esc(item.id)}" data-slot="${slot}" ${equipped ? 'disabled' : ''}>
                    ${actionLabel}
                  </button>
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

  wrap.querySelectorAll('.equipment-action').forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.dataset.itemId;
      const slot = button.dataset.slot;
      const item = items.find((entry) => entry.id === itemId);
      if (!item) return;

      button.disabled = true;
      const original = button.textContent;
      button.textContent = item.starter || unlockedIds.has(item.id) ? 'EQUIPPING…' : 'UNLOCKING…';

      let nextProgress = progress;
      if (!item.starter && !unlockedIds.has(item.id)) {
        const unlockResult = await unlockEquipment(address, cardClass, item.id);
        if (!unlockResult.success) {
          button.disabled = false;
          button.textContent = unlockResult.message || 'FAILED';
          return;
        }
        nextProgress = unlockResult.progress || progress;
      }

      const nextLoadout = {
        powerItemId: slot === 'power' ? item.id : loadout.powerItemId,
        defenseItemId: slot === 'defense' ? item.id : loadout.defenseItemId,
        speedItemId: slot === 'speed' ? item.id : loadout.speedItemId,
      };
      const loadoutResult = await updateEquipmentLoadout(address, card.tokenId, nextLoadout, cardClass);
      if (!loadoutResult.success && loadoutResult.error) {
        button.disabled = false;
        button.textContent = loadoutResult.message || original;
        return;
      }

      const updatedCard = buildEquipmentCardView(card, nextLoadout, cardClass);
      localStorage.setItem('zenkai_card', JSON.stringify(updatedCard));
      localStorage.setItem('zenkai_forge_shards', String(nextProgress.forgeShards || progress.forgeShards || 0));
      renderEquipmentContent(
        wrap,
        address,
        updatedCard,
        cardClass,
        items,
        nextProgress,
        loadoutResult.loadout || nextLoadout,
        new Set(nextProgress.unlockedEquipmentIds || nextProgress.unlockedByClass?.[cardClass] || [...unlockedIds, item.id]),
      );
    });
  });
}
