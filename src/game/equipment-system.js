export const CARD_CLASSES = ['FIRE', 'WATER', 'EARTH', 'WIND', 'SHADOW', 'VOID'];
const CLASS_PREFIX = {
  FIRE: 'Ember',
  WATER: 'Tide',
  EARTH: 'Stone',
  WIND: 'Gale',
  SHADOW: 'Night',
  VOID: 'Rift',
};

const SLOT_LABELS = {
  power: 'Power',
  defense: 'Defense',
  speed: 'Speed',
};

const POWER_ARCHETYPES = [
  {
    key: 'fang',
    code: 'P1',
    name: 'Fang',
    effects: ['+2 PWR', 'First attack each battle: +1 damage', '-16 SPD'],
    mods: { pwr: 2, spd: -16 },
    config: { firstAttackBonusDamage: 1 },
  },
  {
    key: 'maul',
    code: 'P2',
    name: 'Maul',
    effects: ['+4 PWR', 'Gain Guard 1 after acting', '-20 SPD'],
    mods: { pwr: 4, spd: -20 },
    config: { guardAfterAct: 1 },
  },
  {
    key: 'reactor',
    code: 'P3',
    name: 'Reactor',
    effects: ['+18 PWR', '+4% crit', '-14 DEF', 'Take 5 self-damage after attacking'],
    mods: { pwr: 18, def: -14 },
    config: { critChanceBonus: 4, selfDamageAfterAttack: 5 },
  },
  {
    key: 'reaver',
    code: 'P4',
    name: 'Reaver',
    effects: ['+8 PWR', 'Lifesteal 6%', '-12 DEF'],
    mods: { pwr: 8, def: -12 },
    config: { lifestealPercent: 6 },
  },
  {
    key: 'breaker',
    code: 'P5',
    name: 'Breaker',
    effects: ['+10 PWR', 'First hit each round applies Expose', '-10 SPD'],
    mods: { pwr: 10, spd: -10 },
    config: { firstHitApplies: [{ type: 'Expose', stacks: 1 }] },
  },
  {
    key: 'gambit',
    code: 'P6',
    name: 'Gambit',
    effects: ['+24 PWR', '+12 damage below 40% HP', '-18 DEF'],
    mods: { pwr: 24, def: -18 },
    config: { lowHpBonusDamage: { threshold: 0.4, damage: 12 } },
  },
  {
    key: 'crusher',
    code: 'P7',
    name: 'Crusher',
    effects: ['+12 PWR', 'Ignore 25% of target DEF', '-10 SPD'],
    mods: { pwr: 12, spd: -10 },
    config: { defensePenetrationPercent: 25 },
  },
  {
    key: 'duelist',
    code: 'P8',
    name: 'Duelist',
    effects: ['+14 PWR', '+8 SPD', '+8 damage when acting first', '-10 DEF'],
    mods: { pwr: 14, spd: 8, def: -10 },
    config: { bonusDamageWhenActingFirst: 8 },
  },
  {
    key: 'siege',
    code: 'P9',
    name: 'Siege',
    effects: ['+18 PWR', '+12 damage vs shielded targets', '-16 SPD'],
    mods: { pwr: 18, spd: -16 },
    config: { bonusDamageVsShielded: 12 },
  },
  {
    key: 'tyrant',
    code: 'P10',
    name: 'Tyrant',
    effects: ['+20 PWR', '+10% lifesteal vs targets below 50% HP', '-8 SPD', 'Healing received -40%'],
    mods: { pwr: 20, spd: -8 },
    config: {
      lifestealPercentWhenTargetBelowHpPercent: { threshold: 0.5, percent: 10 },
      healingReceivedMultiplier: 0.6,
    },
  },
];

const DEFENSE_ARCHETYPES = [
  {
    key: 'bulwark',
    code: 'D1',
    name: 'Bulwark',
    effects: ['Start battle with Shield 1', '-12 SPD'],
    mods: { spd: -12 },
    config: { startShield: 1 },
  },
  {
    key: 'carapace',
    code: 'D2',
    name: 'Carapace',
    effects: ['+10 DEF', 'Reflect 1 damage on hit', '-10 PWR'],
    mods: { def: 10, pwr: -10 },
    config: { reflectOnHit: 1 },
  },
  {
    key: 'regenerator',
    code: 'D3',
    name: 'Regenerator',
    effects: ['+8 DEF', 'Heal 3 at round start', '-12 PWR'],
    mods: { def: 8, pwr: -12 },
    config: { healAtRoundStart: 3 },
  },
  {
    key: 'bastion',
    code: 'D4',
    name: 'Bastion',
    effects: ['First hit each round: Guard 1', '-18 SPD'],
    mods: { spd: -18 },
    config: { guardEachRound: 1 },
  },
  {
    key: 'mirror',
    code: 'D5',
    name: 'Mirror',
    effects: ['+6 DEF', 'Reflect 4 on crit taken', '-12 SPD'],
    mods: { def: 6, spd: -12 },
    config: { reflectOnCritTaken: 4 },
  },
  {
    key: 'fortress',
    code: 'D6',
    name: 'Fortress',
    effects: ['+4 DEF', 'Gain Guard 1 each round', 'Outgoing damage -40%', '-10 SPD'],
    mods: { def: 4, spd: -10 },
    config: { guardEachRound: 1, outgoingDamageMultiplier: 0.6 },
  },
  {
    key: 'adaptive',
    code: 'D7',
    name: 'Adaptive',
    effects: ['+8 DEF', 'Gain Shield 2 when debuffed', '-8 PWR'],
    mods: { def: 8, pwr: -8 },
    config: { shieldOnDebuffed: 2 },
  },
  {
    key: 'laststand',
    code: 'D8',
    name: 'Laststand',
    effects: ['+10 DEF', 'Below 40% HP: +14 DEF and +6 SPD', '-12 PWR'],
    mods: { def: 10, pwr: -12 },
    config: { lowHpMods: { threshold: 0.4, def: 14, spd: 6 } },
  },
  {
    key: 'ward',
    code: 'D9',
    name: 'Ward',
    effects: ['+8 DEF', 'Cleanse 1 debuff on round 6', '-12 SPD'],
    mods: { def: 8, spd: -12 },
    config: { cleanseRounds: [6] },
  },
  {
    key: 'drainwall',
    code: 'D10',
    name: 'Drainwall',
    effects: ['+8 DEF', 'Heal 1 when Guard prevents damage', '-10 SPD'],
    mods: { def: 8, spd: -10 },
    config: { healWhenGuardPrevents: 1 },
  },
];

const SPEED_ARCHETYPES = [
  {
    key: 'featherstep',
    code: 'S1',
    name: 'Featherstep',
    effects: ['+1 SPD', '1% dodge on first hit each round', '-10 DEF'],
    mods: { spd: 1, def: -10 },
    config: { dodgeFirstHitChance: 1 },
  },
  {
    key: 'booster',
    code: 'S2',
    name: 'Booster',
    effects: ['+6 SPD', 'Always acts first in round 1', '-12 PWR'],
    mods: { spd: 6, pwr: -12 },
    config: { forceActFirstRounds: [1] },
  },
  {
    key: 'blink',
    code: 'S3',
    name: 'Blink',
    effects: ['+8 SPD', 'Gain Shield 1 after acting', '-12 DEF'],
    mods: { spd: 8, def: -12 },
    config: { shieldAfterAct: 1 },
  },
  {
    key: 'pursuit',
    code: 'S4',
    name: 'Pursuit',
    effects: ['+10 SPD', '+4 PWR', '+1 damage when acting first', '-16 DEF'],
    mods: { spd: 10, pwr: 4, def: -16 },
    config: { bonusDamageWhenActingFirst: 1 },
  },
  {
    key: 'harrier',
    code: 'S5',
    name: 'Harrier',
    effects: ['+10 SPD', 'First hit each round applies Chill', '-12 PWR'],
    mods: { spd: 10, pwr: -12 },
    config: { firstHitApplies: [{ type: 'Chill', stacks: 1 }] },
  },
  {
    key: 'slipstream',
    code: 'S6',
    name: 'Slipstream',
    effects: ['+16 SPD', '+4% crit', '-18 DEF'],
    mods: { spd: 16, def: -18 },
    config: { critChanceBonus: 4 },
  },
  {
    key: 'tempo',
    code: 'S7',
    name: 'Tempo',
    effects: ['+4 SPD', 'Gain +1 PWR per consecutive round acted first, max +1', '-10 DEF'],
    mods: { spd: 4, def: -10 },
    config: { tempoPwrGain: 1, tempoPwrCap: 1 },
  },
  {
    key: 'escape',
    code: 'S8',
    name: 'Escape',
    effects: ['+14 SPD', 'Survive one lethal hit at 1 HP', '-12 PWR'],
    mods: { spd: 14, pwr: -12 },
    config: { surviveLethalOnce: true },
  },
  {
    key: 'disruptor',
    code: 'S9',
    name: 'Disruptor',
    effects: ['+8 SPD', 'Remove 1 Shield on hit', '-12 DEF'],
    mods: { spd: 8, def: -12 },
    config: { shieldBreakOnHit: 1 },
  },
  {
    key: 'overclock',
    code: 'S10',
    name: 'Overclock',
    effects: ['+24 SPD', '+6 damage on rounds 1-3', '-14 PWR', 'Take 4 self-damage at round end'],
    mods: { spd: 24, pwr: -14 },
    config: { bonusDamageOnRounds: [1, 2, 3], bonusDamageOnListedRounds: 6, selfDamageEndRound: 4 },
  },
];

const CLASS_RIDERS = {
  FIRE: {
    power: { effects: ['Class Rider: crits apply Burn 1'], config: { riderCritApplies: [{ type: 'Burn', stacks: 1 }] } },
    defense: { effects: ['Class Rider: below 50% HP gain +1 PWR'], config: { riderLowHpPwrBonus: { threshold: 0.5, pwr: 1 } } },
    speed: { effects: ['Class Rider: acting first grants +1 PWR, stacking to +2'], config: { riderActFirstPwrGain: 1, riderActFirstPwrCap: 2 } },
  },
  WATER: {
    power: { effects: ['Class Rider: first hit each round applies Chill'], config: { riderFirstHitApplies: [{ type: 'Chill', stacks: 1 }] } },
    defense: { effects: ['Class Rider: no extra healing'], config: { riderHealAtRoundStart: 0 } },
    speed: { effects: ['Class Rider: cleanse 1 debuff on rounds 3 and 6'], config: { riderCleanseRounds: [3, 6] } },
  },
  EARTH: {
    power: { effects: ['Class Rider: no bonus damage vs faster targets'], config: { riderBonusDamageVsFasterTarget: 0 } },
    defense: { effects: ['Class Rider: no extra Guard'], config: { riderGuardEachRound: 0 } },
    speed: { effects: ['Class Rider: if acting second, next hit +1 damage'], config: { riderBonusDamageWhenActingSecond: 1 } },
  },
  WIND: {
    power: { effects: ['Class Rider: +2 damage when acting first'], config: { riderBonusDamageWhenActingFirst: 2 } },
    defense: { effects: ['Class Rider: +2% dodge on first hit each round'], config: { riderDodgeFirstHitChance: 2 } },
    speed: { effects: ['Class Rider: gain +2 SPD on rounds 1, 4, and 7'], config: { riderRoundSpeedBonus: { rounds: [1, 4, 7], amount: 2 } } },
  },
  SHADOW: {
    power: { effects: ['Class Rider: +4% lifesteal'], config: { riderLifestealPercent: 4 } },
    defense: { effects: ['Class Rider: attacker gets Bleed 1 on first hit each round'], config: { riderBleedAttackerOnFirstHit: 1 } },
    speed: { effects: ['Class Rider: +4% crit while above 70% HP'], config: { riderCritWhileHealthy: { threshold: 0.7, bonus: 4 } } },
  },
  VOID: {
    power: { effects: ['Class Rider: every third hit gains +4 true damage'], config: { riderTrueDamageEveryThirdHit: 4 } },
    defense: { effects: ['Class Rider: start with Shield 4 and refresh Shield 3 on round 4'], config: { riderStartShield: 4, riderRefreshShieldOnRounds: { rounds: [4], amount: 3 } } },
    speed: { effects: ['Class Rider: once per battle invert Chill/Expose into +4 SPD/DEF for 2 rounds'], config: { riderInvertDebuffOnce: { amount: 4, turns: 2 } } },
  },
};

const RARITY_RANK = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };
const ELEMENT_ADVANTAGE = { FIRE: 'WIND', WIND: 'EARTH', EARTH: 'WATER', WATER: 'FIRE' };
const FORGE_REWARD_BY_OUTCOME = { win: 12, draw: 10, loss: 8 };
const EQUIPMENT_COST_BY_LEVEL = { 1: 0, 2: 8, 3: 12, 4: 16, 5: 22, 6: 30, 7: 40, 8: 52, 9: 68, 10: 88 };
const EQUIPMENT_STAT_BONUS_BY_LEVEL = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 3, 9: 4, 10: 4 };

let equipmentCatalogCache = null;
let equipmentMapCache = null;

function titleCase(value) {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeCardClass(value) {
  const normalized = String(value || '').toUpperCase();
  return CARD_CLASSES.includes(normalized) ? normalized : 'VOID';
}

function archetypeListForSlot(slot) {
  if (slot === 'power') return POWER_ARCHETYPES;
  if (slot === 'defense') return DEFENSE_ARCHETYPES;
  return SPEED_ARCHETYPES;
}

function buildEquipmentEntry(cardClass, slot, template) {
  const rider = CLASS_RIDERS[cardClass][slot];
  const prefix = CLASS_PREFIX[cardClass];
  const id = `${cardClass.toLowerCase()}_${slot}_${template.key}`;
  const level = Number(template.code.slice(1));
  const starter = (
    (slot === 'power' && template.key === 'fang') ||
    (slot === 'defense' && template.key === 'bulwark') ||
    (slot === 'speed' && template.key === 'featherstep')
  );
  const levelStatBonus = EQUIPMENT_STAT_BONUS_BY_LEVEL[level] || 0;
  const mods = { ...(template.mods || {}) };
  if (slot === 'power') mods.pwr = (mods.pwr || 0) + levelStatBonus;
  if (slot === 'defense') mods.def = (mods.def || 0) + levelStatBonus;
  if (slot === 'speed') mods.spd = (mods.spd || 0) + levelStatBonus;

  return {
    id,
    code: template.code,
    level,
    classKey: cardClass,
    classLabel: titleCase(cardClass.toLowerCase()),
    slot,
    slotLabel: SLOT_LABELS[slot],
    archetype: template.key,
    name: `${prefix} ${template.name}`,
    starter,
    cost: starter ? 0 : (EQUIPMENT_COST_BY_LEVEL[level] || 0),
    effects: [...template.effects, ...rider.effects],
    mods,
    config: { ...(template.config || {}) },
    riderConfig: { ...(rider.config || {}) },
  };
}

export function getEquipmentCatalog() {
  if (!equipmentCatalogCache) {
    equipmentCatalogCache = CARD_CLASSES.flatMap((cardClass) => (
      ['power', 'defense', 'speed'].flatMap((slot) => (
        archetypeListForSlot(slot).map((template) => buildEquipmentEntry(cardClass, slot, template))
      ))
    ));
  }

  return equipmentCatalogCache;
}

export function getEquipmentMap() {
  if (!equipmentMapCache) {
    equipmentMapCache = Object.fromEntries(getEquipmentCatalog().map((item) => [item.id, item]));
  }

  return equipmentMapCache;
}

export function getEquipmentById(id) {
  return getEquipmentMap()[String(id || '')] || null;
}

export function getEquipmentCatalogByClass(cardClass) {
  const normalized = normalizeCardClass(cardClass);
  return getEquipmentCatalog().filter((item) => item.classKey === normalized);
}

export function getStarterLoadout(cardClass) {
  const normalized = normalizeCardClass(cardClass);
  const lower = normalized.toLowerCase();
  return {
    powerItemId: `${lower}_power_fang`,
    defenseItemId: `${lower}_defense_bulwark`,
    speedItemId: `${lower}_speed_featherstep`,
  };
}

export function normalizeLoadout(loadout, cardClass) {
  const starter = getStarterLoadout(cardClass);
  const requested = loadout || {};
  const normalized = {
    powerItemId: requested.powerItemId || requested.power_item_id || requested.power || starter.powerItemId,
    defenseItemId: requested.defenseItemId || requested.defense_item_id || requested.defense || starter.defenseItemId,
    speedItemId: requested.speedItemId || requested.speed_item_id || requested.speed || starter.speedItemId,
  };

  const slots = [
    ['powerItemId', 'power'],
    ['defenseItemId', 'defense'],
    ['speedItemId', 'speed'],
  ];

  for (const [key, slot] of slots) {
    const item = getEquipmentById(normalized[key]);
    if (!item || item.classKey !== normalizeCardClass(cardClass) || item.slot !== slot) {
      normalized[key] = starter[key];
    }
  }

  return normalized;
}

export function buildLoadoutView(loadout, cardClass) {
  const normalized = normalizeLoadout(loadout, cardClass);
  const powerItem = getEquipmentById(normalized.powerItemId);
  const defenseItem = getEquipmentById(normalized.defenseItemId);
  const speedItem = getEquipmentById(normalized.speedItemId);

  return {
    ...normalized,
    items: [powerItem, defenseItem, speedItem],
    bySlot: {
      power: powerItem,
      defense: defenseItem,
      speed: speedItem,
    },
    summary: [powerItem?.name, defenseItem?.name, speedItem?.name].filter(Boolean),
  };
}

export function getLoadoutStatDelta(loadout, cardClass) {
  const view = buildLoadoutView(loadout, cardClass);
  return view.items.reduce((acc, item) => {
    if (!item) return acc;
    acc.pwr += item.mods.pwr || 0;
    acc.def += item.mods.def || 0;
    acc.spd += item.mods.spd || 0;
    return acc;
  }, { pwr: 0, def: 0, spd: 0 });
}

export function buildEquipmentCardView(card, loadout, cardClass = card?.element) {
  return {
    ...(card || {}),
    equipmentLoadout: buildLoadoutView(loadout || card?.equipmentLoadout || card, cardClass),
  };
}

export function getStarterUnlockedIds(cardClass) {
  const starter = getStarterLoadout(cardClass);
  return [starter.powerItemId, starter.defenseItemId, starter.speedItemId];
}

export function isStarterEquipment(equipmentId, cardClass) {
  return getStarterUnlockedIds(cardClass).includes(equipmentId);
}

export function calcXP(myRarity, oppRarity, won, draw) {
  if (draw) return 35;
  return won ? 50 : 20;
}

export function getForgeShardReward(outcome, playerRating, opponentRating) {
  const base = FORGE_REWARD_BY_OUTCOME[outcome] ?? FORGE_REWARD_BY_OUTCOME.loss;
  const upsetBonus = outcome === 'win' && (opponentRating - playerRating) >= 100 ? 2 : 0;
  return base + upsetBonus;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function battleSeed(p1, p2, seed) {
  if (seed != null) return Math.abs(Number(seed)) || 1;

  const raw = `${p1.tokenId || p1.name || 'p1'}:${p2.tokenId || p2.name || 'p2'}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

function seededRng(seed) {
  let state = battleSeed({ tokenId: seed }, { tokenId: 'zenkai' }, seed);
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildEffectConfig(item) {
  return {
    ...(item?.config || {}),
    ...(item?.riderConfig || {}),
  };
}

function getLowestStatKey(stats) {
  const entries = Object.entries(stats).sort((a, b) => a[1] - b[1]);
  return entries[0]?.[0] || 'pwr';
}

function capShield(value) {
  return clamp(Math.round(value), 0, 30);
}

function currentHpRatio(state) {
  return state.hpMax > 0 ? state.hp / state.hpMax : 0;
}

function hasAdvantage(attacker, defender) {
  return ELEMENT_ADVANTAGE[attacker.cardClass] === defender.cardClass;
}

function buildBattleState(card, actorKey, seed) {
  const cardClass = normalizeCardClass(card.element || card.cardClass);
  const loadout = buildLoadoutView(card.equipmentLoadout || card.loadout || card, cardClass);
  const items = loadout.bySlot;
  const mods = { pwr: 0, def: 0, spd: 0 };
  const configs = {
    power: buildEffectConfig(items.power),
    defense: buildEffectConfig(items.defense),
    speed: buildEffectConfig(items.speed),
  };

  for (const item of loadout.items) {
    if (!item) continue;
    mods.pwr += item.mods.pwr || 0;
    mods.def += item.mods.def || 0;
    mods.spd += item.mods.spd || 0;
  }

  const baseStats = {
    pwr: (Number(card.pwr) || 50) + mods.pwr,
    def: (Number(card.def) || 50) + mods.def,
    spd: (Number(card.spd) || 50) + mods.spd,
  };

  if (card.ability === 'ZENKAI SURGE') {
    const lowest = getLowestStatKey(baseStats);
    baseStats[lowest] += 12;
  }

  const hpMax = Math.round(220 + (baseStats.def * 2) + ((Number(card.level) || 1) * 8));
  const startShield = capShield(
    (configs.defense.startShield || 0) +
    (configs.defense.riderStartShield || 0)
  );

  return {
    actorKey,
    name: card.name || actorKey,
    tokenId: card.tokenId || card.token_id || actorKey,
    cardClass,
    level: Number(card.level) || 1,
    ability: card.ability || null,
    loadout,
    baseStats,
    hpMax,
    hp: hpMax,
    shield: startShield,
    guard: 0,
    burnStacks: 0,
    bleedStacks: 0,
    activeChill: 0,
    activeExpose: 0,
    pendingChill: 0,
    pendingExpose: 0,
    speedBuffTurns: 0,
    defenseBuffTurns: 0,
    escapeUsed: false,
    mirrorUsed: false,
    voidInvertUsed: false,
    tempoPwrBonus: 0,
    tempoFirstRounds: 0,
    fireFirstActPwrBonus: 0,
    hitsLanded: 0,
    damageDealt: 0,
    damageTakenThisRound: 0,
    tookDamageLastRound: false,
    firstAttackConsumed: false,
    firstHitAppliedThisRound: false,
    firstHitTakenThisRound: false,
    dodgeSpentThisRound: false,
    currentOrder: 0,
    rng: seededRng(seed + (actorKey === 'p1' ? 11 : 29)),
    configs,
  };
}

function applyHeal(state, amount) {
  const healingPenalty = 1 - (state.burnStacks * 0.25);
  const gearMultiplier = state.configs.power.healingReceivedMultiplier || 1;
  const effective = Math.max(0, Math.floor(amount * Math.max(0, healingPenalty) * gearMultiplier));
  if (effective <= 0) return 0;
  const before = state.hp;
  state.hp = Math.min(state.hpMax, state.hp + effective);
  return state.hp - before;
}

function applyShield(state, amount) {
  if (amount <= 0) return 0;
  const before = state.shield;
  state.shield = capShield(state.shield + amount);
  return state.shield - before;
}

function applyDirectHpDamage(state, amount) {
  if (amount <= 0 || state.hp <= 0) return 0;
  const incoming = Math.max(0, Math.floor(amount));
  let applied = incoming;
  if (incoming >= state.hp && state.configs.speed.surviveLethalOnce && !state.escapeUsed) {
    state.escapeUsed = true;
    applied = Math.max(0, state.hp - 1);
    state.hp = 1;
    return applied;
  }

  state.hp = Math.max(0, state.hp - incoming);
  return applied;
}

function applyPendingDebuff(target, type, stacks, notes) {
  if (type === 'Burn') {
    const next = Math.min(2, target.burnStacks + stacks);
    const applied = next - target.burnStacks;
    if (applied > 0) target.burnStacks = next;
    if (applied > 0) notes.push(`Burn +${applied}`);
    return applied > 0;
  }
  if (type === 'Bleed') {
    const next = Math.min(2, target.bleedStacks + stacks);
    const applied = next - target.bleedStacks;
    if (applied > 0) target.bleedStacks = next;
    if (applied > 0) notes.push(`Bleed +${applied}`);
    return applied > 0;
  }

  if (target.configs.speed.riderInvertDebuffOnce && !target.voidInvertUsed) {
    target.voidInvertUsed = true;
    const turns = target.configs.speed.riderInvertDebuffOnce.turns || 2;
    const amount = target.configs.speed.riderInvertDebuffOnce.amount || 8;
    if (type === 'Chill') {
      target.speedBuffTurns = Math.max(target.speedBuffTurns, turns);
      notes.push(`Inverted Chill into +${amount} SPD`);
    } else if (type === 'Expose') {
      target.defenseBuffTurns = Math.max(target.defenseBuffTurns, turns);
      notes.push(`Inverted Expose into +${amount} DEF`);
    }
    return true;
  }

  if (type === 'Chill') {
    const next = Math.min(2, target.pendingChill + stacks);
    const applied = next - target.pendingChill;
    if (applied > 0) target.pendingChill = next;
    if (applied > 0) notes.push(`Chill +${applied}`);
    return applied > 0;
  }

  if (type === 'Expose') {
    if (target.pendingExpose >= 1) return false;
    target.pendingExpose = 1;
    notes.push('Expose applied');
    return true;
  }

  return false;
}

function onDebuffed(target, applied, notes) {
  if (!applied) return;
  if (target.configs.defense.shieldOnDebuffed) {
    const gained = applyShield(target, target.configs.defense.shieldOnDebuffed);
    if (gained > 0) notes.push(`Adaptive shield +${gained}`);
  }
}

function applyStatuses(target, statusEntries, notes) {
  let appliedAny = false;
  for (const entry of statusEntries || []) {
    const applied = applyPendingDebuff(target, entry.type, entry.stacks || 1, notes);
    onDebuffed(target, applied, notes);
    appliedAny = appliedAny || applied;
  }
  return appliedAny;
}

function cleanseOneDebuff(state) {
  if (state.burnStacks > 0) {
    state.burnStacks -= 1;
    return 'Burn';
  }
  if (state.bleedStacks > 0) {
    state.bleedStacks -= 1;
    return 'Bleed';
  }
  if (state.activeChill > 0) {
    state.activeChill -= 1;
    return 'Chill';
  }
  if (state.pendingChill > 0) {
    state.pendingChill -= 1;
    return 'Chill';
  }
  if (state.activeExpose > 0) {
    state.activeExpose = 0;
    return 'Expose';
  }
  if (state.pendingExpose > 0) {
    state.pendingExpose = 0;
    return 'Expose';
  }
  return null;
}

function getEffectiveStats(state, round, opponent = null) {
  let pwr = state.baseStats.pwr;
  let def = state.baseStats.def;
  let spd = state.baseStats.spd;

  if (state.configs.speed.riderActFirstPwrCap) pwr += state.fireFirstActPwrBonus;
  if (state.configs.speed.tempoPwrCap) pwr += state.tempoPwrBonus;
  if (state.configs.defense.lowHpMods && currentHpRatio(state) <= state.configs.defense.lowHpMods.threshold) {
    def += state.configs.defense.lowHpMods.def || 0;
    spd += state.configs.defense.lowHpMods.spd || 0;
  }
  if (state.configs.defense.riderLowHpPwrBonus && currentHpRatio(state) <= state.configs.defense.riderLowHpPwrBonus.threshold) {
    pwr += state.configs.defense.riderLowHpPwrBonus.pwr || 0;
  }
  if (state.ability === 'AWAKENED' && round >= 6) {
    pwr += 6;
    def += 6;
    spd += 6;
  }
  if (state.ability === 'RESOLVE' && currentHpRatio(state) <= 0.4) def += 10;
  if (state.ability === 'FLASH' && (round === 3 || round === 6)) spd += 10;
  if (state.configs.speed.riderRoundSpeedBonus?.rounds?.includes(round)) {
    spd += state.configs.speed.riderRoundSpeedBonus.amount || 0;
  }
  if (state.speedBuffTurns > 0) spd += state.configs.speed.riderInvertDebuffOnce?.amount || 8;
  if (state.defenseBuffTurns > 0) def += state.configs.speed.riderInvertDebuffOnce?.amount || 8;
  if (state.activeChill > 0) spd -= 8 * state.activeChill;
  if (state.activeExpose > 0) def -= 10;
  return { pwr, def, spd };
}

function summarizeStatuses(state) {
  const tags = [];
  if (state.shield > 0) tags.push(`Shield ${state.shield}`);
  if (state.guard > 0) tags.push(`Guard ${state.guard}`);
  if (state.burnStacks > 0) tags.push(`Burn x${state.burnStacks}`);
  if (state.bleedStacks > 0) tags.push(`Bleed x${state.bleedStacks}`);
  if (state.activeChill > 0) tags.push(`Chill x${state.activeChill}`);
  if (state.activeExpose > 0) tags.push('Expose');
  return tags;
}

function startRound(state, round, notes) {
  state.guard = 0;
  state.firstHitAppliedThisRound = false;
  state.firstHitTakenThisRound = false;
  state.dodgeSpentThisRound = false;
  state.damageTakenThisRound = 0;
  state.activeChill = state.pendingChill;
  state.pendingChill = 0;
  state.activeExpose = state.pendingExpose;
  state.pendingExpose = 0;

  const heal = (state.configs.defense.healAtRoundStart || 0) + (state.configs.defense.riderHealAtRoundStart || 0);
  if (heal > 0) {
    const recovered = applyHeal(state, heal);
    if (recovered > 0) notes.push(`Recover ${recovered} HP`);
  }

  const cleanseRounds = [
    ...(state.configs.defense.cleanseRounds || []),
    ...(state.configs.speed.riderCleanseRounds || []),
  ];
  if (cleanseRounds.includes(round)) {
    const cleansed = cleanseOneDebuff(state);
    if (cleansed) notes.push(`Cleansed ${cleansed}`);
  }

  const guardGain = (state.configs.defense.guardEachRound || 0) + (state.configs.defense.riderGuardEachRound || 0);
  if (guardGain > 0) {
    state.guard += guardGain;
    notes.push(`Guard ${guardGain}`);
  }

  if (state.configs.defense.riderRefreshShieldOnRounds?.rounds?.includes(round)) {
    const gained = applyShield(state, state.configs.defense.riderRefreshShieldOnRounds.amount || 0);
    if (gained > 0) notes.push(`Shield +${gained}`);
  }
}

function endRound(state, notes) {
  if (state.hp <= 0) return;

  if (state.burnStacks > 0) {
    const burnDamage = applyDirectHpDamage(state, state.burnStacks * 5);
    if (burnDamage > 0) notes.push(`Burn ${burnDamage}`);
  }
  if (state.bleedStacks > 0) {
    const bleedDamage = applyDirectHpDamage(state, state.bleedStacks * 6);
    if (bleedDamage > 0) notes.push(`Bleed ${bleedDamage}`);
  }
  if (state.configs.speed.selfDamageEndRound) {
    const overclock = applyDirectHpDamage(state, state.configs.speed.selfDamageEndRound);
    if (overclock > 0) notes.push(`Overclock backlash ${overclock}`);
  }

  state.tookDamageLastRound = state.damageTakenThisRound > 0;
  if (state.speedBuffTurns > 0) state.speedBuffTurns -= 1;
  if (state.defenseBuffTurns > 0) state.defenseBuffTurns -= 1;
}

function determineTurnOrder(p1, p2, round, rng) {
  const priorityOverride = (state) => (
    state.configs.speed.forceActFirstRounds?.includes(round) ? 9999 : 0
  );
  const p1Speed = getEffectiveStats(p1, round, p2).spd + priorityOverride(p1);
  const p2Speed = getEffectiveStats(p2, round, p1).spd + priorityOverride(p2);

  if (p1Speed !== p2Speed) return p1Speed > p2Speed ? ['p1', 'p2'] : ['p2', 'p1'];

  const hpRatioDelta = currentHpRatio(p1) - currentHpRatio(p2);
  if (Math.abs(hpRatioDelta) > 0.0001) return hpRatioDelta > 0 ? ['p1', 'p2'] : ['p2', 'p1'];

  return rng() < 0.5 ? ['p1', 'p2'] : ['p2', 'p1'];
}

function performAttack(attacker, defender, round, roundOrderIndex, rng) {
  const notes = [];
  const isActingFirst = roundOrderIndex === 0;
  attacker.currentOrder = roundOrderIndex;

  if (attacker.configs.speed.tempoPwrCap) {
    if (isActingFirst) {
      attacker.tempoFirstRounds += 1;
      attacker.tempoPwrBonus = Math.min(attacker.configs.speed.tempoPwrCap, attacker.tempoFirstRounds * (attacker.configs.speed.tempoPwrGain || 4));
    } else {
      attacker.tempoFirstRounds = 0;
      attacker.tempoPwrBonus = 0;
    }
  }

  if (isActingFirst && attacker.configs.speed.riderActFirstPwrCap) {
    attacker.fireFirstActPwrBonus = Math.min(
      attacker.configs.speed.riderActFirstPwrCap,
      attacker.fireFirstActPwrBonus + (attacker.configs.speed.riderActFirstPwrGain || 2)
    );
  }

  const attackerStats = getEffectiveStats(attacker, round, defender);
  const defenderStats = getEffectiveStats(defender, round, attacker);
  let damage = Math.max(8, Math.floor((attackerStats.pwr * 0.48) + (attacker.level * 2) - (defenderStats.def * 0.22)));
  let trueDamage = 0;

  if (!attacker.firstAttackConsumed && attacker.configs.power.firstAttackBonusDamage) {
    damage += attacker.configs.power.firstAttackBonusDamage;
    attacker.firstAttackConsumed = true;
    notes.push(`Opening burst +${attacker.configs.power.firstAttackBonusDamage}`);
  }
  if (currentHpRatio(attacker) <= (attacker.configs.power.lowHpBonusDamage?.threshold || -1)) damage += attacker.configs.power.lowHpBonusDamage.damage || 0;
  if (defender.shield > 0) damage += attacker.configs.power.bonusDamageVsShielded || 0;
  if (isActingFirst) damage += (attacker.configs.power.bonusDamageWhenActingFirst || 0) + (attacker.configs.speed.bonusDamageWhenActingFirst || 0) + (attacker.configs.power.riderBonusDamageWhenActingFirst || 0);
  if (attacker.configs.speed.bonusDamageOnRounds?.includes(round)) damage += attacker.configs.speed.bonusDamageOnListedRounds || 0;
  if (roundOrderIndex === 1) damage += attacker.configs.speed.riderBonusDamageWhenActingSecond || 0;
  if (defenderStats.spd > attackerStats.spd) damage += attacker.configs.power.riderBonusDamageVsFasterTarget || 0;
  if (attacker.ability === 'PREDATOR' && defenderStats.spd > attackerStats.spd) damage += 10;
  if (attacker.ability === 'BLOODLUST' && attacker.tookDamageLastRound) damage += 8;
  if (hasAdvantage(attacker, defender)) damage += 8;

  const critChance = clamp(
    5 + Math.floor((attackerStats.spd - defenderStats.spd) / 8) +
      (attacker.configs.power.critChanceBonus || 0) +
      (attacker.configs.speed.critChanceBonus || 0) +
      ((attacker.configs.speed.riderCritWhileHealthy && currentHpRatio(attacker) >= attacker.configs.speed.riderCritWhileHealthy.threshold)
        ? attacker.configs.speed.riderCritWhileHealthy.bonus
        : 0),
    5,
    25
  );

  const dodgeChance = defender.firstHitTakenThisRound ? 0 : ((defender.configs.speed.dodgeFirstHitChance || 0) + (defender.configs.defense.riderDodgeFirstHitChance || 0));
  if (dodgeChance > 0 && !defender.firstHitTakenThisRound && rng() < dodgeChance / 100) {
    defender.firstHitTakenThisRound = true;
    defender.dodgeSpentThisRound = true;
    notes.push('Attack dodged');
    return {
      actor: attacker.actorKey,
      target: defender.actorKey,
      damage: 0,
      hpDamage: 0,
      shieldDamage: 0,
      trueDamage: 0,
      heal: 0,
      blocked: 0,
      crit: false,
      notes,
      targetHp: defender.hp,
      targetShield: defender.shield,
    };
  }

  const crit = rng() < critChance / 100;
  if (crit) {
    damage = Math.floor(damage * 1.5);
    notes.push('Critical hit');
  }

  if (attacker.configs.power.riderTrueDamageEveryThirdHit) {
    const projectedHit = attacker.hitsLanded + 1;
    if (projectedHit % 3 === 0) {
      trueDamage += attacker.configs.power.riderTrueDamageEveryThirdHit;
      notes.push(`Void strike +${trueDamage} true`);
    }
  }

  if (attacker.configs.speed.shieldBreakOnHit && defender.shield > 0) {
    const broken = Math.min(defender.shield, attacker.configs.speed.shieldBreakOnHit);
    defender.shield -= broken;
    if (broken > 0) notes.push(`Shield break ${broken}`);
  }

  let blocked = 0;
  if (defender.guard > 0) {
    blocked = Math.min(defender.guard, damage);
    damage -= blocked;
    defender.guard = 0;
    if (blocked > 0) notes.push(`Guard blocked ${blocked}`);
    if (blocked > 0 && defender.configs.defense.healWhenGuardPrevents) {
      const recovered = applyHeal(defender, defender.configs.defense.healWhenGuardPrevents);
      if (recovered > 0) notes.push(`Drainwall heal ${recovered}`);
    }
  }

  const shieldDamage = Math.min(defender.shield, damage);
  defender.shield -= shieldDamage;
  const wasFirstHitTaken = !defender.firstHitTakenThisRound;
  const hpDamage = applyDirectHpDamage(defender, damage - shieldDamage);
  const trueDamageApplied = applyDirectHpDamage(defender, trueDamage);
  const totalInflicted = shieldDamage + hpDamage + trueDamageApplied;
  attacker.damageDealt += totalInflicted;
  defender.damageTakenThisRound += totalInflicted;
  defender.firstHitTakenThisRound = true;

  const lifestealPercent = (attacker.configs.power.lifestealPercent || 0) +
    (attacker.configs.power.riderLifestealPercent || 0) +
    ((currentHpRatio(defender) <= (attacker.configs.power.lifestealPercentWhenTargetBelowHpPercent?.threshold || -1))
      ? attacker.configs.power.lifestealPercentWhenTargetBelowHpPercent.percent || 0
      : 0);
  const healed = lifestealPercent > 0 ? applyHeal(attacker, Math.floor(totalInflicted * (lifestealPercent / 100))) : 0;
  if (healed > 0) notes.push(`Lifesteal ${healed}`);

  if (defender.configs.defense.reflectOnHit && totalInflicted > 0) {
    const reflected = applyDirectHpDamage(attacker, defender.configs.defense.reflectOnHit);
    if (reflected > 0) notes.push(`Reflect ${reflected}`);
  }
  if (crit && defender.configs.defense.reflectOnCritTaken) {
    const reflectedCrit = applyDirectHpDamage(attacker, defender.configs.defense.reflectOnCritTaken);
    if (reflectedCrit > 0) notes.push(`Mirror punish ${reflectedCrit}`);
  }
  if (crit && defender.ability === 'MIRROR COUNTER' && !defender.mirrorUsed) {
    defender.mirrorUsed = true;
    const mirrored = applyDirectHpDamage(attacker, 10);
    if (mirrored > 0) notes.push(`Mirror counter ${mirrored}`);
  }

  const firstHitStatuses = [];
  if (!attacker.firstHitAppliedThisRound) {
    firstHitStatuses.push(...(attacker.configs.power.firstHitApplies || []));
    firstHitStatuses.push(...(attacker.configs.speed.firstHitApplies || []));
    firstHitStatuses.push(...(attacker.configs.power.riderFirstHitApplies || []));
    attacker.firstHitAppliedThisRound = true;
  }
  const critStatuses = crit ? [...(attacker.configs.power.riderCritApplies || [])] : [];
  applyStatuses(defender, [...firstHitStatuses, ...critStatuses], notes);

  if (wasFirstHitTaken && defender.configs.defense.riderBleedAttackerOnFirstHit) {
    applyStatuses(attacker, [{ type: 'Bleed', stacks: defender.configs.defense.riderBleedAttackerOnFirstHit }], notes);
  }

  if (attacker.configs.speed.shieldAfterAct) {
    const gained = applyShield(attacker, attacker.configs.speed.shieldAfterAct);
    if (gained > 0) notes.push(`Shield +${gained}`);
  }
  if (attacker.configs.power.guardAfterAct) {
    attacker.guard += attacker.configs.power.guardAfterAct;
    notes.push(`Guard ${attacker.configs.power.guardAfterAct}`);
  }
  if (attacker.configs.power.selfDamageAfterAttack) {
    const selfDamage = applyDirectHpDamage(attacker, attacker.configs.power.selfDamageAfterAttack);
    if (selfDamage > 0) notes.push(`Reactor backlash ${selfDamage}`);
  }

  if (totalInflicted > 0) attacker.hitsLanded += 1;

  return {
    actor: attacker.actorKey,
    target: defender.actorKey,
    damage: totalInflicted,
    hpDamage,
    shieldDamage,
    trueDamage: trueDamageApplied,
    heal: healed,
    blocked,
    crit,
    notes,
    targetHp: defender.hp,
    targetShield: defender.shield,
  };
}

function roundLeader(p1, p2) {
  if (p1.hp === p2.hp) return 'draw';
  return p1.hp > p2.hp ? 'p1' : 'p2';
}

export function resolveBattle(p1Card, p2Card, seed) {
  const rng = seededRng(seed || 1);
  const p1 = buildBattleState(p1Card, 'p1', (seed || 1) + 1);
  const p2 = buildBattleState(p2Card, 'p2', (seed || 1) + 7);
  const rounds = [];

  for (let round = 1; round <= 8; round += 1) {
    const p1RoundNotes = [];
    const p2RoundNotes = [];
    startRound(p1, round, p1RoundNotes);
    startRound(p2, round, p2RoundNotes);

    const order = determineTurnOrder(p1, p2, round, rng);
    const actions = [];

    for (let i = 0; i < order.length; i += 1) {
      const actor = order[i] === 'p1' ? p1 : p2;
      const defender = order[i] === 'p1' ? p2 : p1;
      if (actor.hp <= 0 || defender.hp <= 0) continue;
      actions.push(performAttack(actor, defender, round, i, rng));
      if (p1.hp <= 0 || p2.hp <= 0) break;
    }

    const endNotes = [];
    if (p1.hp > 0 && p2.hp > 0) {
      endRound(p1, endNotes);
      endRound(p2, endNotes);
    }

    rounds.push({
      round,
      order,
      start: { p1: p1RoundNotes, p2: p2RoundNotes },
      actions,
      endNotes,
      end: {
        p1: { hp: p1.hp, hpMax: p1.hpMax, shield: p1.shield, statuses: summarizeStatuses(p1) },
        p2: { hp: p2.hp, hpMax: p2.hpMax, shield: p2.shield, statuses: summarizeStatuses(p2) },
      },
      leader: roundLeader(p1, p2),
    });

    if (p1.hp <= 0 || p2.hp <= 0) break;
  }

  let winner = 'draw';
  if (p1.hp <= 0 && p2.hp > 0) winner = 'p2';
  else if (p2.hp <= 0 && p1.hp > 0) winner = 'p1';
  else if (p1.hp !== p2.hp) winner = p1.hp > p2.hp ? 'p1' : 'p2';
  else if (p1.damageDealt !== p2.damageDealt) winner = p1.damageDealt > p2.damageDealt ? 'p1' : 'p2';

  return {
    rounds,
    winner,
    summary: {
      p1: { hp: p1.hp, hpMax: p1.hpMax, damageDealt: p1.damageDealt },
      p2: { hp: p2.hp, hpMax: p2.hpMax, damageDealt: p2.damageDealt },
    },
  };
}
