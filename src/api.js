import {
  attachLocalEquipmentToCard,
  getLocalEquipmentCatalog,
  getLocalEquipmentProgress,
  getLocalLoadout,
  purchaseLocalTrackLevel,
  saveLocalLoadout,
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
  if (!BASE) return attachLocalEquipmentToCard(address, card);

  const payload = {
    address,
    tokenId: card.tokenId || card.token_id,
    name: card.name,
    image: card.image,
    pwr: card.pwr ?? null,
    def: card.def ?? null,
    spd: card.spd ?? null,
    hp: card.hp ?? null,
    element: card.element ?? null,
    ability: card.ability ?? null,
    rarity: card.rarity ?? null,
    attributes: card.attributes ?? [],
  };

  try {
    const data = await apiPost('/api/game/register', payload);
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

export async function createLobby(address, card) {
  return apiPost('/api/game/lobby/create', { address, card });
}

export async function joinLobby(address, code, card) {
  return apiPost('/api/game/lobby/join', { address, code, card });
}

export async function getLobbyStatus(code, address) {
  const qs = address ? `?address=${encodeURIComponent(address)}` : '';
  return apiGet(`/api/game/lobby/${encodeURIComponent(code)}${qs}`);
}

export async function cancelLobby(address, code) {
  return apiPost('/api/game/lobby/cancel', { address, code });
}

export async function getLeaderboard() {
  return apiGet('/api/game/leaderboard');
}

export async function getPlayerCards(address) {
  if (!BASE) return { cards: [], activeTokenId: null };
  return apiGet(`/api/game/cards/${address}`);
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

export async function getEquipmentCatalog(classKey) {
  if (!BASE) return getLocalEquipmentCatalog(classKey);
  const qs = classKey ? `?class=${encodeURIComponent(classKey)}` : '';
  return apiGet(`/api/game/equipment/catalog${qs}`);
}

export async function getEquipmentProgress(address) {
  if (!BASE) return getLocalEquipmentProgress(address);
  return apiGet(`/api/game/equipment/progress/${address}`);
}

export async function purchaseEquipmentLevel(address, classKey, trackId) {
  if (!BASE) return purchaseLocalTrackLevel(address, classKey, trackId);
  return apiPost('/api/game/equipment/purchase', { address, classKey, trackId });
}

export async function getEquipmentLoadout(address, tokenId, classKey) {
  if (!BASE) return getLocalLoadout(address, tokenId, classKey);
  return apiGet(`/api/game/equipment/loadout/${address}/${encodeURIComponent(tokenId)}`);
}

export async function updateEquipmentLoadout(address, tokenId, loadout, classKey) {
  if (!BASE) return saveLocalLoadout(address, tokenId, classKey, loadout);
  return apiPost('/api/game/equipment/loadout', { address, tokenId, ...loadout });
}
