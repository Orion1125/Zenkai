import {
  attachLocalEquipmentToCard,
  getLocalEquipmentCatalog,
  getLocalEquipmentProgress,
  getLocalLoadout,
  saveLocalLoadout,
  unlockLocalEquipment,
} from './game/local-equipment-state.js';

const BASE = import.meta.env.VITE_API_URL || '';

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

export async function syncCard(address, card) {
  if (!BASE) {
    return attachLocalEquipmentToCard(address, card);
  }

  try {
    const stats = card.pwr != null ? card : {};
    const data = await apiPost('/api/game/register', {
      address,
      tokenId: card.tokenId,
      name: card.name,
      image: card.image,
      pwr: stats.pwr ?? null,
      def: stats.def ?? null,
      spd: stats.spd ?? null,
      element: stats.element ?? null,
      ability: stats.ability ?? null,
      rarity: stats.rarity ?? null,
      attributes: card.attributes ?? [],
    });
    return data.card || null;
  } catch {
    return null;
  }
}

export async function enterQueue(address, card) {
  return apiPost('/api/game/queue', { address, card });
}

export async function pollQueue(address, ticketId) {
  const qs = ticketId ? `?ticketId=${encodeURIComponent(ticketId)}` : '';
  return apiGet(`/api/game/queue/${address}${qs}`);
}

export async function cancelQueue(address, ticketId) {
  return apiPost('/api/game/queue/cancel', { address, ticketId });
}

export async function getLeaderboard() {
  return apiGet('/api/game/leaderboard');
}

export async function getProfile(address) {
  if (!BASE) {
    const progress = getLocalEquipmentProgress(address).progress;
    let localCard = null;
    try { localCard = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
    const card = attachLocalEquipmentToCard(address, localCard);
    return { profile: null, card, forgeShards: progress.forgeShards };
  }

  return apiGet(`/api/profile/${address}`);
}

export async function updateProfile(address, data) {
  return apiPost('/api/profile', { address, ...data });
}

export async function getEquipmentCatalog(cardClass) {
  if (!BASE) return getLocalEquipmentCatalog(cardClass);
  const qs = cardClass ? `?class=${encodeURIComponent(cardClass)}` : '';
  return apiGet(`/api/game/equipment/catalog${qs}`);
}

export async function getEquipmentProgress(address) {
  if (!BASE) return getLocalEquipmentProgress(address);
  return apiGet(`/api/game/equipment/progress/${address}`);
}

export async function unlockEquipment(address, classKey, equipmentId) {
  if (!BASE) return unlockLocalEquipment(address, classKey, equipmentId);
  return apiPost('/api/game/equipment/unlock', { address, classKey, equipmentId });
}

export async function getEquipmentLoadout(address, tokenId, cardClass) {
  if (!BASE) return getLocalLoadout(address, tokenId, cardClass);
  return apiGet(`/api/game/equipment/loadout/${address}/${encodeURIComponent(tokenId)}`);
}

export async function updateEquipmentLoadout(address, tokenId, loadout, cardClass) {
  if (!BASE) return saveLocalLoadout(address, tokenId, cardClass, loadout);
  return apiPost('/api/game/equipment/loadout', { address, tokenId, ...loadout });
}
