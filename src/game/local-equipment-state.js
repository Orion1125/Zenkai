import {
  CARD_CLASSES,
  buildEquipmentCardView,
  buildLoadoutView,
  getEquipmentById,
  getEquipmentCatalogByClass,
  getStarterLoadout,
  getStarterUnlockedIds,
  normalizeCardClass,
} from './equipment-system.js';

const PROGRESS_KEY = 'zenkai_local_progress_v1';
const UNLOCKS_KEY = 'zenkai_local_unlocks_v1';
const LOADOUTS_KEY = 'zenkai_local_loadouts_v1';

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getProgressStore() {
  return readJson(PROGRESS_KEY, {});
}

function getUnlockStore() {
  return readJson(UNLOCKS_KEY, {});
}

function getLoadoutStore() {
  return readJson(LOADOUTS_KEY, {});
}

export function ensureLocalProgress(address) {
  const progress = getProgressStore();
  if (!progress[address]) {
    progress[address] = { forgeShards: 0 };
    writeJson(PROGRESS_KEY, progress);
  }
  return progress[address];
}

export function setLocalForgeShards(address, forgeShards) {
  const progress = getProgressStore();
  progress[address] = { forgeShards: Math.max(0, Number(forgeShards) || 0) };
  writeJson(PROGRESS_KEY, progress);
  localStorage.setItem('zenkai_forge_shards', String(progress[address].forgeShards));
  return progress[address];
}

export function awardLocalForgeShards(address, forgeShards) {
  const current = ensureLocalProgress(address);
  return setLocalForgeShards(address, current.forgeShards + forgeShards);
}

export function getLocalEquipmentProgress(address) {
  const current = ensureLocalProgress(address);
  const unlockStore = getUnlockStore();
  const byClass = {};

  for (const cardClass of CARD_CLASSES) {
    const unlocked = new Set([
      ...getStarterUnlockedIds(cardClass),
      ...((unlockStore[address]?.[cardClass]) || []),
    ]);
    byClass[cardClass] = Array.from(unlocked).sort();
  }

  localStorage.setItem('zenkai_forge_shards', String(current.forgeShards));
  return {
    progress: {
      address,
      forgeShards: current.forgeShards,
      unlockedByClass: byClass,
    },
  };
}

export function unlockLocalEquipment(address, classKey, equipmentId) {
  const normalized = normalizeCardClass(classKey);
  const item = getEquipmentById(equipmentId);
  if (!item || item.classKey !== normalized) {
    return { error: 'invalid', message: 'Equipment does not match the class' };
  }

  if (item.starter) {
    return { success: true, equipmentId, ...getLocalEquipmentProgress(address) };
  }

  const progress = ensureLocalProgress(address);
  if (progress.forgeShards < item.cost) {
    return { error: 'insufficient_forge_shards', message: 'Not enough Forge Shards' };
  }

  const unlockStore = getUnlockStore();
  unlockStore[address] ||= {};
  unlockStore[address][normalized] ||= [];
  if (!unlockStore[address][normalized].includes(equipmentId)) {
    unlockStore[address][normalized].push(equipmentId);
  }
  progress.forgeShards -= item.cost;
  writeJson(UNLOCKS_KEY, unlockStore);
  setLocalForgeShards(address, progress.forgeShards);

  return { success: true, equipmentId, ...getLocalEquipmentProgress(address) };
}

export function getLocalLoadout(address, tokenId, cardClass) {
  const normalized = normalizeCardClass(cardClass);
  const loadoutStore = getLoadoutStore();
  const existing = loadoutStore[address]?.[String(tokenId)];
  const loadout = buildLoadoutView(existing || {}, normalized);
  return { loadout };
}

export function saveLocalLoadout(address, tokenId, cardClass, requestedLoadout) {
  const normalized = normalizeCardClass(cardClass);
  const progress = getLocalEquipmentProgress(address);
  const unlocked = new Set(progress.progress.unlockedByClass[normalized] || []);
  const loadout = buildLoadoutView(requestedLoadout, normalized);

  for (const item of loadout.items) {
    if (!item || item.classKey !== normalized || (!item.starter && !unlocked.has(item.id))) {
      return { error: 'locked', message: 'Loadout contains locked equipment' };
    }
  }

  const loadoutStore = getLoadoutStore();
  loadoutStore[address] ||= {};
  loadoutStore[address][String(tokenId)] = {
    powerItemId: loadout.powerItemId,
    defenseItemId: loadout.defenseItemId,
    speedItemId: loadout.speedItemId,
  };
  writeJson(LOADOUTS_KEY, loadoutStore);
  return { success: true, loadout };
}

export function attachLocalEquipmentToCard(address, card) {
  if (!card) return null;
  const loadout = getLocalLoadout(address, card.tokenId || card.token_id, card.element).loadout;
  return buildEquipmentCardView(card, loadout, card.element);
}

export function getLocalEquipmentCatalog(cardClass) {
  return {
    classKey: normalizeCardClass(cardClass),
    starterLoadout: getStarterLoadout(cardClass),
    items: getEquipmentCatalogByClass(cardClass),
  };
}
