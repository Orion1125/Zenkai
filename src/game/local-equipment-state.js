import {
  CARD_CLASSES,
  buildEquipmentCardView,
  buildLoadoutView,
  getEquipmentCatalogByClass,
  getEquipmentById,
  getFreeTrackLevels,
  getStarterLoadout,
  normalizeCardClass,
  normalizeTrackLevels,
} from './equipment-system.js';

const PROGRESS_KEY = 'zenkai_local_progress_v2';
const TRACK_LEVELS_KEY = 'zenkai_local_track_levels_v2';
const LOADOUTS_KEY = 'zenkai_local_track_loadouts_v2';

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

function progressStore() {
  return readJson(PROGRESS_KEY, {});
}

function trackStore() {
  return readJson(TRACK_LEVELS_KEY, {});
}

function loadoutStore() {
  return readJson(LOADOUTS_KEY, {});
}

export function ensureLocalProgress(address) {
  const store = progressStore();
  if (!store[address]) {
    store[address] = { forgeShards: 0 };
    writeJson(PROGRESS_KEY, store);
  }
  return store[address];
}

export function getLocalTrackLevels(address, classKey) {
  const normalized = normalizeCardClass(classKey);
  const store = trackStore();
  store[address] ||= {};
  store[address][normalized] = normalizeTrackLevels(store[address][normalized], normalized);
  writeJson(TRACK_LEVELS_KEY, store);
  return store[address][normalized];
}

export function getLocalEquipmentProgress(address) {
  const progress = ensureLocalProgress(address);
  const levelsByClass = {};

  for (const classKey of CARD_CLASSES) {
    levelsByClass[classKey] = getLocalTrackLevels(address, classKey);
  }

  localStorage.setItem('zenkai_forge_shards', String(progress.forgeShards));
  return {
    progress: {
      address,
      forgeShards: progress.forgeShards,
      trackLevelsByClass: levelsByClass,
    },
  };
}

export function purchaseLocalTrackLevel(address, classKey, trackId) {
  const progress = ensureLocalProgress(address);
  const normalized = normalizeCardClass(classKey);
  const track = getEquipmentById(trackId);
  if (!track || track.classKey !== normalized) {
    return { error: 'invalid', message: 'Track does not match the class' };
  }

  const levels = getLocalTrackLevels(address, normalized);
  const currentLevel = levels[trackId] || 1;
  if (currentLevel >= 10) {
    return { error: 'max_level', message: 'Track is already max level' };
  }

  const nextLevel = track.levels[currentLevel];
  if ((progress.forgeShards || 0) < nextLevel.price) {
    return { error: 'insufficient_forge_shards', message: 'Not enough Forge Shards' };
  }

  progress.forgeShards -= nextLevel.price;
  levels[trackId] = currentLevel + 1;
  const progressData = progressStore();
  progressData[address] = progress;
  writeJson(PROGRESS_KEY, progressData);
  const tracks = trackStore();
  tracks[address] ||= {};
  tracks[address][normalized] = levels;
  writeJson(TRACK_LEVELS_KEY, tracks);
  localStorage.setItem('zenkai_forge_shards', String(progress.forgeShards));
  return { success: true, ...getLocalEquipmentProgress(address) };
}

export function getLocalLoadout(address, tokenId, classKey) {
  const normalized = normalizeCardClass(classKey);
  const existing = loadoutStore()[address]?.[String(tokenId)];
  return {
    loadout: buildLoadoutView(existing || getStarterLoadout(normalized), normalized, getLocalTrackLevels(address, normalized)),
  };
}

export function saveLocalLoadout(address, tokenId, classKey, requestedLoadout) {
  const normalized = normalizeCardClass(classKey);
  const levels = getLocalTrackLevels(address, normalized);
  const loadout = buildLoadoutView(requestedLoadout, normalized, levels);
  const store = loadoutStore();
  store[address] ||= {};
  store[address][String(tokenId)] = {
    powerTrackId: loadout.powerTrackId,
    hpTrackId: loadout.hpTrackId,
    speedTrackId: loadout.speedTrackId,
  };
  writeJson(LOADOUTS_KEY, store);
  return { success: true, loadout };
}

export function attachLocalEquipmentToCard(address, card) {
  if (!card) return null;
  const cardClass = normalizeCardClass(card.element || card.cardClass || 'VOID');
  const levels = getLocalTrackLevels(address, cardClass);
  const loadout = getLocalLoadout(address, card.tokenId || card.token_id, cardClass).loadout;
  return {
    ...buildEquipmentCardView(card, loadout, levels, cardClass),
    forge_shards: ensureLocalProgress(address).forgeShards,
  };
}

export function getLocalEquipmentCatalog(classKey) {
  const normalized = normalizeCardClass(classKey);
  return {
    classKey: normalized,
    starterLoadout: getStarterLoadout(normalized),
    tracks: getEquipmentCatalogByClass(normalized),
  };
}
