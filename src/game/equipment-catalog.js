export const CARD_CLASSES = ['FIRE', 'WATER', 'EARTH', 'WIND', 'SHADOW', 'VOID'];

const CLASS_PREFIX = {
  FIRE: 'Ember',
  WATER: 'Tide',
  EARTH: 'Stone',
  WIND: 'Gale',
  SHADOW: 'Night',
  VOID: 'Rift',
};

export const PRICE_BY_LEVEL = {
  1: 0,
  2: 4,
  3: 8,
  4: 14,
  5: 22,
  6: 34,
  7: 48,
  8: 64,
  9: 84,
  10: 106,
};

const POSITIVE_SCALE = [0, 1.0, 1.08, 1.16, 1.24, 1.32, 1.42, 1.52, 1.63, 1.74, 1.85];
const NEGATIVE_SCALE = [0, 1.0, 0.96, 0.92, 0.88, 0.84, 0.78, 0.72, 0.66, 0.6, 0.55];

const CLASS_PASSIVES = {
  FIRE: { critBurn: 1 },
  WATER: { extraRegen: 1, chillOnCycleHit: 1 },
  EARTH: { startShield: 2, statusResist: 0.08 },
  WIND: { tempoGain: 4, dodge: 0.01 },
  SHADOW: { lifesteal: 0.03, bleedReflect: 1 },
  VOID: { trueDamageEveryThirdHit: 3, fluxDuration: 5 },
};

const POWER_TEMPLATES = [
  { key: 'fang', code: 'P1', name: 'Fang', pwr: 5, spdPenalty: 6, openingBurst: 4 },
  { key: 'maul', code: 'P2', name: 'Maul', pwr: 6, spdPenalty: 8, guardAfterAttack: 2 },
  { key: 'reactor', code: 'P3', name: 'Reactor', pwr: 8, hpPenalty: 18, critChance: 0.04, fluxPulse: 2, selfDamage: 5 },
  { key: 'reaver', code: 'P4', name: 'Reaver', pwr: 6, hpPenalty: 12, lifesteal: 0.06 },
  { key: 'breaker', code: 'P5', name: 'Breaker', pwr: 7, spdPenalty: 8, expose: 0.1 },
  { key: 'gambit', code: 'P6', name: 'Gambit', pwr: 9, hpPenalty: 18, lowHpBonus: 6 },
  { key: 'crusher', code: 'P7', name: 'Crusher', pwr: 8, spdPenalty: 8, shieldBreak: 6 },
  { key: 'duelist', code: 'P8', name: 'Duelist', pwr: 6, spd: 4, hpPenalty: 8, firstStrike: 3 },
  { key: 'siege', code: 'P9', name: 'Siege', pwr: 8, spdPenalty: 8, shieldDamageBonus: 6 },
  { key: 'tyrant', code: 'P10', name: 'Tyrant', pwr: 9, spdPenalty: 8, execute: 0.12, healPenalty: 0.3 },
];

const HP_TEMPLATES = [
  { key: 'bulwark', code: 'H1', name: 'Bulwark', hp: 18, spdPenalty: 7, startShield: 3 },
  { key: 'carapace', code: 'H2', name: 'Carapace', hp: 16, pwrPenalty: 5, reflect: 2 },
  { key: 'regenerator', code: 'H3', name: 'Regenerator', hp: 18, pwrPenalty: 8, regen: 2 },
  { key: 'bastion', code: 'H4', name: 'Bastion', hp: 16, spdPenalty: 10, guardPerCycle: 2 },
  { key: 'mirror', code: 'H5', name: 'Mirror', hp: 18, spdPenalty: 6, critReflect: 5 },
  { key: 'fortress', code: 'H6', name: 'Fortress', hp: 22, spdPenalty: 10, guardPerCycle: 2, outgoingPenalty: 0.20 },
  { key: 'adaptive', code: 'H7', name: 'Adaptive', hp: 20, pwrPenalty: 6, shieldOnDebuff: 3 },
  { key: 'laststand', code: 'H8', name: 'Laststand', hp: 16, pwrPenalty: 8, emergencyRegen: 4, lowHpSpeed: 6 },
  { key: 'ward', code: 'H9', name: 'Ward', hp: 18, spdPenalty: 6, cleanseEvery: 15 },
  { key: 'drainwall', code: 'H10', name: 'Drainwall', hp: 18, spdPenalty: 8, healOnGuard: 2 },
];

const SPEED_TEMPLATES = [
  { key: 'featherstep', code: 'S1', name: 'Featherstep', spd: 6, hpPenalty: 8, dodge: 0.03 },
  { key: 'booster', code: 'S2', name: 'Booster', spd: 8, pwrPenalty: 8, startTempo: 35 },
  { key: 'blink', code: 'S3', name: 'Blink', spd: 7, hpPenalty: 10, shieldAfterAttack: 2 },
  { key: 'pursuit', code: 'S4', name: 'Pursuit', spd: 5, pwr: 2, hpPenalty: 14, firstStrike: 2 },
  { key: 'harrier', code: 'S5', name: 'Harrier', spd: 6, pwrPenalty: 8, dotPerCycle: 2, chill: 0.08 },
  { key: 'slipstream', code: 'S6', name: 'Slipstream', spd: 8, hpPenalty: 16, critChance: 0.03 },
  { key: 'tempo', code: 'S7', name: 'Tempo', spd: 5, hpPenalty: 8, momentumPwr: 2 },
  { key: 'escape', code: 'S8', name: 'Escape', spd: 8, pwrPenalty: 8, surviveOnce: true },
  { key: 'disruptor', code: 'S9', name: 'Disruptor', spd: 6, hpPenalty: 10, purgeShield: 4, purgeBuff: 1 },
  { key: 'overclock', code: 'S10', name: 'Overclock', spd: 9, pwrPenalty: 14, firstStrike: 3, selfDot: 2 },
];

function scalePositive(base, level) {
  return Math.max(0, Math.round(base * POSITIVE_SCALE[level]));
}

function scaleNegative(base, level) {
  return Math.max(0, Math.round(base * NEGATIVE_SCALE[level]));
}

function scalePercent(base, level) {
  return Number((base * POSITIVE_SCALE[level]).toFixed(3));
}

function scalePercentNeg(base, level) {
  return Number((base * NEGATIVE_SCALE[level]).toFixed(3));
}

function scaleCooldown(base, level) {
  return Math.max(5, Math.round(base / POSITIVE_SCALE[level]));
}

function buildEffects(slot, levelConfig, classKey) {
  const effects = [];
  if (levelConfig.pwr) effects.push(`+${levelConfig.pwr} PWR`);
  if (levelConfig.hp) effects.push(`+${levelConfig.hp} HP`);
  if (levelConfig.spd) effects.push(`+${levelConfig.spd} SPD`);
  if (levelConfig.openingBurst) effects.push(`Opening strike +${levelConfig.openingBurst} damage`);
  if (levelConfig.guardAfterAttack) effects.push(`Gain Guard ${levelConfig.guardAfterAttack} after attacking`);
  if (levelConfig.critChance) effects.push(`+${Math.round(levelConfig.critChance * 100)}% crit chance`);
  if (levelConfig.fluxPulse) effects.push(`Every 5s, random +${levelConfig.fluxPulse} PWR or -${levelConfig.fluxPulse} SPD for 5s`);
  if (levelConfig.lifesteal) effects.push(`${Math.round(levelConfig.lifesteal * 100)}% lifesteal`);
  if (levelConfig.expose) effects.push(`Hits inflict Expose (+${Math.round(levelConfig.expose * 100)}% damage taken)`);
  if (levelConfig.lowHpBonus) effects.push(`Below 35% HP: +${levelConfig.lowHpBonus} damage`);
  if (levelConfig.shieldBreak) effects.push(`+${levelConfig.shieldBreak} bonus damage vs shields`);
  if (levelConfig.shieldDamageBonus) effects.push(`+${levelConfig.shieldDamageBonus} bonus damage vs shielded targets`);
  if (levelConfig.firstStrike) effects.push(`+${levelConfig.firstStrike} damage when acting before the target`);
  if (levelConfig.execute) effects.push(`+${Math.round(levelConfig.execute * 100)}% execute bonus under 25% enemy HP`);
  if (levelConfig.startShield) effects.push(`Start battle with Shield ${levelConfig.startShield}`);
  if (levelConfig.reflect) effects.push(`Reflect ${levelConfig.reflect} damage on hit`);
  if (levelConfig.regen) effects.push(`Regenerate ${levelConfig.regen} HP every 5s`);
  if (levelConfig.guardPerCycle) effects.push(`Gain Guard ${levelConfig.guardPerCycle} every 5s`);
  if (levelConfig.critReflect) effects.push(`Reflect ${levelConfig.critReflect} on crit taken`);
  if (levelConfig.shieldOnDebuff) effects.push(`Gain Shield ${levelConfig.shieldOnDebuff} when debuffed`);
  if (levelConfig.emergencyRegen) effects.push(`Below 35% HP: regenerate ${levelConfig.emergencyRegen} HP every 5s`);
  if (levelConfig.lowHpSpeed) effects.push(`Below 35% HP: +${levelConfig.lowHpSpeed} SPD`);
  if (levelConfig.cleanseEvery) effects.push(`Cleanse 1 debuff every ${levelConfig.cleanseEvery}s`);
  if (levelConfig.healOnGuard) effects.push(`Heal ${levelConfig.healOnGuard} when Guard prevents damage`);
  if (levelConfig.dodge) effects.push(`${Math.round(levelConfig.dodge * 100)}% dodge chance`);
  if (levelConfig.startTempo) effects.push(`Start battle with ${levelConfig.startTempo} tempo`);
  if (levelConfig.shieldAfterAttack) effects.push(`Gain Shield ${levelConfig.shieldAfterAttack} after attacking`);
  if (levelConfig.dotPerCycle) effects.push(`Inflict ${levelConfig.dotPerCycle} damage over time every 5s`);
  if (levelConfig.chill) effects.push(`Hits slow enemy tempo by ${Math.round(levelConfig.chill * 100)}% for 5s`);
  if (levelConfig.momentumPwr) effects.push(`If you act twice before the enemy, gain +${levelConfig.momentumPwr} PWR for 5s`);
  if (levelConfig.surviveOnce) effects.push('Survive one lethal hit at 1 HP');
  if (levelConfig.purgeShield) effects.push(`Remove ${levelConfig.purgeShield} shield on hit`);
  if (levelConfig.purgeBuff) effects.push(`Purge ${levelConfig.purgeBuff} enemy buff on hit`);
  if (levelConfig.selfDot) effects.push(`Lose ${levelConfig.selfDot} HP every 5s`);
  if (levelConfig.outgoingPenalty) effects.push(`Outgoing damage -${Math.round(levelConfig.outgoingPenalty * 100)}%`);
  if (levelConfig.healPenalty) effects.push(`Healing received -${Math.round(levelConfig.healPenalty * 100)}%`);
  if (levelConfig.hpPenalty) effects.push(`-${levelConfig.hpPenalty} HP`);
  if (levelConfig.pwrPenalty) effects.push(`-${levelConfig.pwrPenalty} PWR`);
  if (levelConfig.spdPenalty) effects.push(`-${levelConfig.spdPenalty} SPD`);

  const passive = CLASS_PASSIVES[classKey];
  if (passive.critBurn && slot === 'power') effects.push('Class: crits apply Burn');
  if (passive.extraRegen && slot === 'hp') effects.push(`Class: +${passive.extraRegen} bonus regen`);
  if (passive.chillOnCycleHit && slot === 'power') effects.push('Class: first cycle hit applies Chill');
  if (passive.startShield && slot === 'hp') effects.push(`Class: +${passive.startShield} starting shield`);
  if (passive.statusResist && slot === 'hp') effects.push(`Class: ${Math.round(passive.statusResist * 100)}% status resistance`);
  if (passive.tempoGain && slot === 'speed') effects.push(`Class: +${passive.tempoGain} tempo per cycle`);
  if (passive.dodge && slot === 'speed') effects.push(`Class: +${Math.round(passive.dodge * 100)}% dodge`);
  if (passive.lifesteal && slot === 'power') effects.push(`Class: +${Math.round(passive.lifesteal * 100)}% lifesteal`);
  if (passive.bleedReflect && slot === 'hp') effects.push('Class: first hit taken inflicts Bleed');
  if (passive.trueDamageEveryThirdHit && slot === 'power') effects.push(`Class: every third hit +${passive.trueDamageEveryThirdHit} true damage`);
  if (passive.fluxDuration && slot === 'speed') effects.push(`Class: invert one debuff for ${passive.fluxDuration}s once per fight`);
  return effects;
}

function resolveLevelConfig(slot, template, level) {
  const config = {};
  if (slot === 'power') {
    config.pwr = scalePositive(template.pwr || 0, level);
    config.spd = scalePositive(template.spd || 0, level);
    config.spdPenalty = scaleNegative(template.spdPenalty || 0, level);
    config.hpPenalty = scaleNegative(template.hpPenalty || 0, level);
    config.openingBurst = scalePositive(template.openingBurst || 0, level);
    config.guardAfterAttack = scalePositive(template.guardAfterAttack || 0, level);
    config.critChance = scalePercent(template.critChance || 0, level);
    config.fluxPulse = scalePositive(template.fluxPulse || 0, level);
    config.lifesteal = scalePercent(template.lifesteal || 0, level);
    config.expose = scalePercent(template.expose || 0, level);
    config.lowHpBonus = scalePositive(template.lowHpBonus || 0, level);
    config.shieldBreak = scalePositive(template.shieldBreak || 0, level);
    config.shieldDamageBonus = scalePositive(template.shieldDamageBonus || 0, level);
    config.firstStrike = scalePositive(template.firstStrike || 0, level);
    config.execute = scalePercent(template.execute || 0, level);
    config.selfDamage = scaleNegative(template.selfDamage || 0, level);
    config.healPenalty = scalePercentNeg(template.healPenalty || 0, level);
  } else if (slot === 'hp') {
    config.hp = scalePositive(template.hp || 0, level);
    config.spdPenalty = scaleNegative(template.spdPenalty || 0, level);
    config.pwrPenalty = scaleNegative(template.pwrPenalty || 0, level);
    config.startShield = scalePositive(template.startShield || 0, level);
    config.reflect = scalePositive(template.reflect || 0, level);
    config.regen = scalePositive(template.regen || 0, level);
    config.guardPerCycle = scalePositive(template.guardPerCycle || 0, level);
    config.critReflect = scalePositive(template.critReflect || 0, level);
    config.outgoingPenalty = scalePercentNeg(template.outgoingPenalty || 0, level);
    config.shieldOnDebuff = scalePositive(template.shieldOnDebuff || 0, level);
    config.emergencyRegen = scalePositive(template.emergencyRegen || 0, level);
    config.lowHpSpeed = scalePositive(template.lowHpSpeed || 0, level);
    config.cleanseEvery = template.cleanseEvery ? scaleCooldown(template.cleanseEvery, level) : 0;
    config.healOnGuard = scalePositive(template.healOnGuard || 0, level);
  } else {
    config.spd = scalePositive(template.spd || 0, level);
    config.hpPenalty = scaleNegative(template.hpPenalty || 0, level);
    config.pwrPenalty = scaleNegative(template.pwrPenalty || 0, level);
    config.dodge = scalePercent(template.dodge || 0, level);
    config.startTempo = scalePositive(template.startTempo || 0, level);
    config.shieldAfterAttack = scalePositive(template.shieldAfterAttack || 0, level);
    config.pwr = scalePositive(template.pwr || 0, level);
    config.firstStrike = scalePositive(template.firstStrike || 0, level);
    config.dotPerCycle = scalePositive(template.dotPerCycle || 0, level);
    config.chill = scalePercent(template.chill || 0, level);
    config.critChance = scalePercent(template.critChance || 0, level);
    config.momentumPwr = scalePositive(template.momentumPwr || 0, level);
    config.surviveOnce = !!template.surviveOnce;
    config.purgeShield = scalePositive(template.purgeShield || 0, level);
    config.purgeBuff = scalePositive(template.purgeBuff || 0, level);
    config.selfDot = scaleNegative(template.selfDot || 0, level);
  }
  return config;
}

function buildTrack(classKey, slot, template) {
  const prefix = CLASS_PREFIX[classKey];
  const slotPrefix = slot === 'power' ? 'power' : slot === 'hp' ? 'hp' : 'speed';
  const trackId = `${classKey.toLowerCase()}_${slotPrefix}_${template.key}`;
  const levels = [];
  for (let level = 1; level <= 10; level += 1) {
    const levelConfig = resolveLevelConfig(slot, template, level);
    levels.push({
      level,
      price: PRICE_BY_LEVEL[level],
      config: levelConfig,
      effects: buildEffects(slot, levelConfig, classKey),
    });
  }
  return {
    id: trackId,
    trackId,
    classKey,
    slot,
    code: template.code,
    name: `${prefix} ${template.name}`,
    familyName: `${prefix} ${template.name}`,
    levels,
  };
}

let catalogCache = null;
let trackMapCache = null;

function buildCatalog() {
  if (!catalogCache) {
    catalogCache = CARD_CLASSES.flatMap((classKey) => (
      [
        ...POWER_TEMPLATES.map((template) => buildTrack(classKey, 'power', template)),
        ...HP_TEMPLATES.map((template) => buildTrack(classKey, 'hp', template)),
        ...SPEED_TEMPLATES.map((template) => buildTrack(classKey, 'speed', template)),
      ]
    ));
  }
  return catalogCache;
}

export function normalizeCardClass(value) {
  const normalized = String(value || '').toUpperCase();
  return CARD_CLASSES.includes(normalized) ? normalized : 'VOID';
}

export function getEquipmentCatalog() {
  return buildCatalog();
}

export function getEquipmentCatalogByClass(classKey) {
  const normalized = normalizeCardClass(classKey);
  return buildCatalog().filter((track) => track.classKey === normalized);
}

export function getEquipmentById(trackId) {
  if (!trackMapCache) {
    trackMapCache = Object.fromEntries(buildCatalog().map((track) => [track.trackId, track]));
  }
  return trackMapCache[String(trackId || '')] || null;
}

export function getStarterLoadout(classKey) {
  const normalized = normalizeCardClass(classKey);
  const lower = normalized.toLowerCase();
  return {
    powerTrackId: `${lower}_power_fang`,
    hpTrackId: `${lower}_hp_bulwark`,
    speedTrackId: `${lower}_speed_featherstep`,
  };
}

export function getStarterUnlockedIds(classKey) {
  return getEquipmentCatalogByClass(classKey).map((track) => track.trackId);
}

export function isStarterEquipment(trackId, classKey) {
  return getStarterUnlockedIds(classKey).includes(trackId);
}

export function getFreeTrackLevels(classKey) {
  return Object.fromEntries(getStarterUnlockedIds(classKey).map((trackId) => [trackId, 1]));
}

export function calcXP(myRarity, oppRarity, won, draw) {
  if (draw) return 35;
  return won ? 50 : 20;
}

export function getForgeShardReward(outcome, playerRating, opponentRating) {
  const base = outcome === 'win' ? 12 : outcome === 'draw' ? 10 : 8;
  return base + (outcome === 'win' && (opponentRating - playerRating) >= 100 ? 2 : 0);
}

function pickLevel(track, level) {
  const safeLevel = Math.max(1, Math.min(10, Number(level) || 1));
  return track.levels[safeLevel - 1];
}

export function normalizeTrackLevels(trackLevels, classKey) {
  const normalized = { ...getFreeTrackLevels(classKey), ...(trackLevels || {}) };
  for (const track of getEquipmentCatalogByClass(classKey)) {
    normalized[track.trackId] = Math.max(1, Math.min(10, Number(normalized[track.trackId]) || 1));
  }
  return normalized;
}

export function normalizeLoadout(loadout, classKey) {
  const starter = getStarterLoadout(classKey);
  const requested = loadout || {};
  const normalized = {
    powerTrackId: requested.powerTrackId || requested.power_track_id || requested.powerItemId || starter.powerTrackId,
    hpTrackId: requested.hpTrackId || requested.hp_track_id || requested.defenseTrackId || requested.defense_item_id || starter.hpTrackId,
    speedTrackId: requested.speedTrackId || requested.speed_track_id || requested.speedItemId || starter.speedTrackId,
  };

  const checks = [
    ['powerTrackId', 'power'],
    ['hpTrackId', 'hp'],
    ['speedTrackId', 'speed'],
  ];
  for (const [key, slot] of checks) {
    const track = getEquipmentById(normalized[key]);
    if (!track || track.classKey !== normalizeCardClass(classKey) || track.slot !== slot) {
      normalized[key] = starter[key];
    }
  }
  return normalized;
}

function resolveTrack(trackId, level) {
  const track = getEquipmentById(trackId);
  if (!track) return null;
  const resolvedLevel = pickLevel(track, level);
  return {
    ...track,
    currentLevel: resolvedLevel.level,
    currentPrice: resolvedLevel.price,
    currentConfig: resolvedLevel.config,
    currentEffects: resolvedLevel.effects,
    nextLevel: resolvedLevel.level < 10 ? track.levels[resolvedLevel.level] : null,
  };
}

export function buildLoadoutView(loadout, classKey, trackLevels) {
  const normalizedLoadout = normalizeLoadout(loadout, classKey);
  const levels = normalizeTrackLevels(trackLevels, classKey);
  const power = resolveTrack(normalizedLoadout.powerTrackId, levels[normalizedLoadout.powerTrackId]);
  const hp = resolveTrack(normalizedLoadout.hpTrackId, levels[normalizedLoadout.hpTrackId]);
  const speed = resolveTrack(normalizedLoadout.speedTrackId, levels[normalizedLoadout.speedTrackId]);

  return {
    ...normalizedLoadout,
    items: [power, hp, speed].filter(Boolean),
    bySlot: { power, hp, speed },
    summary: [power?.familyName, hp?.familyName, speed?.familyName].filter(Boolean),
  };
}

export function buildEquipmentCardView(card, loadout, trackLevels, classKey = card?.element) {
  const normalizedLevels = normalizeTrackLevels(trackLevels, classKey);
  return {
    ...(card || {}),
    equipmentLevels: normalizedLevels,
    equipmentLoadout: buildLoadoutView(loadout || card?.equipmentLoadout || {}, classKey, normalizedLevels),
  };
}

export function getLoadoutStatDelta(loadout, classKey, trackLevels) {
  const view = buildLoadoutView(loadout, classKey, trackLevels);
  return [view.bySlot.power, view.bySlot.hp, view.bySlot.speed].reduce((acc, track) => {
    if (!track) return acc;
    acc.pwr += track.currentConfig.pwr || 0;
    acc.hp += track.currentConfig.hp || 0;
    acc.spd += track.currentConfig.spd || 0;
    acc.pwr -= track.currentConfig.pwrPenalty || 0;
    acc.hp -= track.currentConfig.hpPenalty || 0;
    acc.spd -= track.currentConfig.spdPenalty || 0;
    return acc;
  }, { pwr: 0, hp: 0, spd: 0 });
}

export function getTrackLevel(trackLevels, trackId, classKey) {
  const levels = normalizeTrackLevels(trackLevels, classKey);
  return levels[trackId] || 1;
}

export function resolveTrackForMarket(trackId, level, classKey) {
  const track = getEquipmentById(trackId);
  if (!track || track.classKey !== normalizeCardClass(classKey)) return null;
  return resolveTrack(trackId, level);
}
