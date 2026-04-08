// ══════════════════════════════════════════════
// ZENKAI — Trait Engine
// Maps real NFT attributes → game stats, element, ability
// Rarity weights derived from metadata_final.csv (3,333 NFTs)
// ══════════════════════════════════════════════

// ── Rarity weights per trait value ──────────────────────────────────────────
// weight = 100 - (occurrences / 3333 × 100), clamped to [0, 100]
// Higher weight = rarer = stronger base stat contribution

const BG_WEIGHT = {
  'Iron balance':   91,  // ~300
  'Temple sand':    93,  // ~230
  'Deep blue':      93,  // ~220
  'Zen sand':       94,  // ~210
  'Silver calm':    95,  // ~150
  'Midnight black': 96,  // ~140
  'Forest zen':     96,  // ~130
  'Golden calm':    96,  // ~120
  'Silent mist':    97,  // ~100
  'Ancient earth':  97,  // ~90
  'Sakura pink':    97,  // ~90
  'Abyss night':    97,  // ~85
  'Zen rift':       99,  // ~30
  'Solar zen':      100, // ~10
};

const BASE_WEIGHT = {
  'Tan vessel':      87,  // ~430
  'Earth vessel':    91,  // ~300
  'Shadow vessel 2': 92,  // ~275
  'Azure vessel':    93,  // ~220
  'Bronze vessel':   94,  // ~200
  'Zen vessel':      96,  // ~130
  'Shadow vessel':   97,  // ~100
  'Cosmic vessel':   98,  // ~75
  'Demon vessel':    98,  // ~65
  'Golden vessel':   98,  // ~65
  'Inferno vessel':  98,  // ~55
  'Spirit vessel':   99,  // ~25
  'Dual vessel':     99,  // ~20
};

const CLOTH_WEIGHT = {
  'Sage Tee':               91, // ~300
  'Basic Tee':              92, // ~260
  'Ocean Tee':              93, // ~230
  'Zen suit':               93, // ~230
  'Classic black hoodie':   93, // ~220
  'Shadow hoodie':          93, // ~220
  'Earth Tee':              94, // ~200
  'Ocean track jacket':     94, // ~200
  'Dark blue kimono':       95, // ~170
  'Stone tank':             95, // ~160
  'Stone turtleneck':       96, // ~140
  'Snow petals kimono':     97, // ~110
  'Crimson hoodie':         97, // ~110
  'Bloodstain tank':        97, // ~100
  'Onyx tank':              97, // ~100
  'Firefighter v':          97, // ~100
  'Shadow scout jacket':    97, // ~90
  'Zenith bomber':          98, // ~70
  'Golden bomber':          98, // ~70
  'Stealth utility jacket': 98, // ~70
  'Scarlet button shirt':   98, // ~50
  'Royal suit':             98, // ~40
  'Ranger bomber':          99, // ~30
  'Neon circuit jacket':    99, // ~25
  'Graffiti hoodie':        99, // ~25
  'Akatsuki cloak':         100, // ~8
  'Orange gi':              100, // ~6
  'Aurora gi':              100, // ~5
};

const FACE_WEIGHT = {
  'Neutral face 1':       95, // ~170
  'Sharp eyes 4':         95, // ~155
  'Focused Ocean eyes':   96, // ~135
  'Closed eyes':          96, // ~125
  'Sharp eyes':           97, // ~100
  'Sharp eyes 2':         97, // ~100
  'Sharp eyes 3':         97, // ~90
  'Calm':                 97, // ~100
  'Determined blue eyes': 97, // ~80
  'Red eyes':             98, // ~70
  'Closed eyes 2':        98, // ~60
  'Ocean calm eyes':      98, // ~60
  'Calm eyes Ocean':      98, // ~50
  'Focused':              98, // ~50
  'Determined eyes':      98, // ~55
  'Closed eyes 3':        98, // ~45
  'Glowing eyes':         99, // ~30
  'Predator eyes':        99, // ~20
  'Forest eyes':          99, // ~15
  'Angry red eyes':       99, // ~10
  'Midnight eyes':        99, // ~10
  'Neon eyes':            99, // ~10
  'Sharigan':             100, // ~8
  'Sharigan 2':           100, // ~6
  'Sharigan eyes':        100, // ~5
  'Rinnegan':             100, // ~5
};

const HAIR_WEIGHT = {
  'Spiked Shag – Golden Blonde':  95, // ~160
  'Top Knot Flow – Neon Pink':    96, // ~115
  'Sugegasa':                     97, // ~90
  'Sugegasa 2':                   97, // ~80
  'Spiked Shag – Dark Violet':    98, // ~75
  'Short Afro – Black':           98, // ~72
  'Short Afro – Indigo':          98, // ~60
  'Curly Fade – Platinum':        98, // ~62
  'Zen Bob – Shadow Black':       98, // ~62
  'Messy Flow – Blonde':          98, // ~55
  'Top Knot Flow – Silver Ash':   98, // ~40
  'Top Knot Flow – navy blue':    98, // ~40
  'Curly Fade – Brown':           98, // ~52
  'Green cap':                    98, // ~45
  'Zen Beanie - Gold Splatter':   99, // ~28
  'Frost Snow Beanie':            99, // ~28
  'Curly Fade – ZENKAI Headband': 99, // ~28
  'Ocean fade':                   99, // ~22
  'Phantom sweep':                99, // ~18
  'Gold side sweep':              99, // ~15
  'Messy Flow – Crimson':         99, // ~15
  'Straw Hat':                    99, // ~12
  'Short Fringe – Caramel':       99, // ~18
  'Golden Ronin Straw Hat':       99, // ~12
  'Ronin Straw Hat':              99, // ~8
  'Curly Fade – Ember':           99, // ~12
  'Brick grey cap':               99, // ~6
  'Messy Fringe – Teal':          99, // ~6
  'Purple Camo Beanie':           99, // ~6
  'Curly Top – Chain Bandana':    99, // ~6
  'Short Fringe – Lilac':         99, // ~6
  'Toxic sweep':                  100, // ~3
  'Ghost sweep':                  100, // ~3
  'Sakura fade':                  100, // ~3
  'Ascended Spikes – Emerald Surge': 100, // ~4
  'Ascended Spikes – Crimson Pulse': 100, // ~2
};

const MOUTH_WEIGHT = {
  'Neutral':          90, // ~350+
  'Neutral 2':        93, // ~230
  'Neutral 3':        96, // ~120
  'Calm':             96, // ~100
  'Smiling':          97, // ~90
  'Smirk':            97, // ~90
  'Nostril mask':     97, // ~80
  'Nosemask 1':       98, // ~50
  'Nosemask 2':       98, // ~50
  'Fangs out':        98, // ~65
  'Wide Evil Smirk':  98, // ~40
  'Clown 1':          99, // ~20
  'Clown 2':          99, // ~20
  'Evil Grin':        99, // ~18
  'Bubblegum 2':      99, // ~18
  'Blue Bubble Gum':  99, // ~18
  'Pink bubble Gum':  99, // ~18
  'Red tongue':       99, // ~20
  'Bear Mouth Mask':  99, // ~12
  'Sad Mouth':        99, // ~15
  'Hellfire Mask':    100, // ~10
};

const TATTOO_WEIGHT = {
  '':             87, // ~3150+ (no tattoo — most common, lowest weight)
  'Web tattoo':   99, // ~25
  'Black tattoo': 99, // ~15
  'Red tattoo':   99, // ~12
  'Tattoo 1':     100, // ~8
};

const FACEMASK_WEIGHT = {
  '':                         87, // ~3170+ (no facemask)
  'Nosemask 1':               98, // ~20
  'Nosemask 2':               98, // ~20
  'Glasses':                  99, // ~5
  'Hellfire Mask':            99, // ~8
  'Bear Mouth Mask':          99, // ~8
  'Frost Potara Earrings':    100, // ~6
  'Obsidian Potara Earrings': 100, // ~6
  'Solar Potara Earrings':    100, // ~3
  'Gold Cross Earrings':      100, // ~4
  'Silver Cross Earrings':    100, // ~4
  'Hanafuda Earrings':        100, // ~3
};

const WEIGHT_TABLES = {
  Background: BG_WEIGHT,
  Base:       BASE_WEIGHT,
  Cloth:      CLOTH_WEIGHT,
  Face:       FACE_WEIGHT,
  Hair:       HAIR_WEIGHT,
  Mouth:      MOUTH_WEIGHT,
  Tattoo:     TATTOO_WEIGHT,
  Facemask:   FACEMASK_WEIGHT,
};

// ── Element mapping (from Background) ───────────────────────────────────────

const ELEMENT_MAP = {
  'Temple sand':    'FIRE',
  'Zen sand':       'FIRE',
  'Golden calm':    'FIRE',
  'Deep blue':      'WATER',
  'Forest zen':     'WATER',
  'Iron balance':   'EARTH',
  'Ancient earth':  'EARTH',
  'Midnight black': 'SHADOW',
  'Abyss night':    'SHADOW',
  'Sakura pink':    'WIND',
  'Silent mist':    'WIND',
  'Silver calm':    'WIND',
  'Zen rift':       'VOID',
  'Solar zen':      'VOID',
};

const ELEMENT_ADVANTAGE = {
  FIRE:   'WIND',
  WIND:   'EARTH',
  EARTH:  'WATER',
  WATER:  'FIRE',
  // SHADOW and VOID have no standard advantage
};

export const ELEMENT_COLORS = {
  FIRE:   '#ff5722',
  WATER:  '#2196f3',
  EARTH:  '#8d6e34',
  SHADOW: '#9c27b0',
  WIND:   '#00e1a2',
  VOID:   '#ffcc00',
};

// ── Ability mapping (from Face) ─────────────────────────────────────────────

const ABILITY_MAP = {
  'Rinnegan':             { name: 'ZENKAI SURGE',   desc: '+12 to lowest stat all rounds' },
  'Sharigan':             { name: 'MIRROR COUNTER',  desc: 'Losing by ≤5 → draw' },
  'Sharigan 2':           { name: 'MIRROR COUNTER',  desc: 'Losing by ≤5 → draw' },
  'Sharigan eyes':        { name: 'MIRROR COUNTER',  desc: 'Losing by ≤5 → draw' },
  'Glowing eyes':         { name: 'AWAKENED',        desc: '+6 all stats in round 3' },
  'Predator eyes':        { name: 'PREDATOR',        desc: '+10 PWR in round 1' },
  'Red eyes':             { name: 'BLOODLUST',       desc: '+8 after losing a round' },
  'Angry red eyes':       { name: 'BLOODLUST',       desc: '+8 after losing a round' },
  'Neon eyes':            { name: 'FLASH',           desc: '+10 SPD in round 3' },
  'Focused Ocean eyes':   { name: 'RESOLVE',         desc: '+10 in round 3 if losing' },
  'Focused':              { name: 'RESOLVE',         desc: '+10 in round 3 if losing' },
  'Determined blue eyes': { name: 'RESOLVE',         desc: '+10 in round 3 if losing' },
  'Determined eyes':      { name: 'RESOLVE',         desc: '+10 in round 3 if losing' },
};

// ── Bonus stat mapping (Tattoo and Facemask) ────────────────────────────────

const TATTOO_BONUS = {
  '':             { pwr: 0, def: 0, spd: 0 },
  'Web tattoo':   { pwr: 0, def: 3, spd: 0 },
  'Black tattoo': { pwr: 3, def: 0, spd: 0 },
  'Red tattoo':   { pwr: 4, def: 0, spd: 0 },
  'Tattoo 1':     { pwr: 0, def: 0, spd: 3 },
};

const FACEMASK_BONUS = {
  '':                         { pwr: 0, def: 0, spd: 0 },
  'Nosemask 1':               { pwr: 0, def: 2, spd: 0 },
  'Nosemask 2':               { pwr: 0, def: 2, spd: 0 },
  'Glasses':                  { pwr: 0, def: 0, spd: 2 },
  'Hellfire Mask':            { pwr: 4, def: 0, spd: 0 },
  'Bear Mouth Mask':          { pwr: 0, def: 4, spd: 0 },
  'Frost Potara Earrings':    { pwr: 3, def: 3, spd: 3 },
  'Obsidian Potara Earrings': { pwr: 5, def: 5, spd: 5 },
  'Solar Potara Earrings':    { pwr: 4, def: 4, spd: 4 },
  'Gold Cross Earrings':      { pwr: 3, def: 3, spd: 0 },
  'Silver Cross Earrings':    { pwr: 2, def: 2, spd: 2 },
  'Hanafuda Earrings':        { pwr: 4, def: 0, spd: 4 },
};

// ── Rarity tiers ────────────────────────────────────────────────────────────

const RARITY_TIERS = [
  { name: 'COMMON',    max: 93.5, color: '#888888' },
  { name: 'UNCOMMON',  max: 96.0, color: '#00c0ff' },
  { name: 'RARE',      max: 98.0, color: '#b040ff' },
  { name: 'EPIC',      max: 99.2, color: '#ff9900' },
  { name: 'LEGENDARY', max: 101,  color: '#FFD000' },
];

function getRarityTier(score) {
  for (const tier of RARITY_TIERS) {
    if (score <= tier.max) return tier;
  }
  return RARITY_TIERS[RARITY_TIERS.length - 1];
}

// ── Lookup helper (fuzzy match for trait values not in table) ────────────────

function lookupWeight(table, value) {
  if (!value || value.trim() === '') return table[''] ?? 95;
  if (table[value] != null) return table[value];
  // Fuzzy: try case-insensitive match
  const lower = value.toLowerCase();
  for (const [k, v] of Object.entries(table)) {
    if (k.toLowerCase() === lower) return v;
  }
  // Unknown trait — assign a moderate weight (slightly above common)
  return 96;
}

// ── Core: map NFT attributes → full card data ───────────────────────────────

/**
 * @param {Array<{trait_type: string, value: string}>} attributes
 * @returns {{ pwr, def, spd, element, elementColor, ability, abilityDesc, rarity, rarityColor, rarityScore, bonuses }}
 */
export function mapTraitsToCard(attributes) {
  const traits = {};
  for (const attr of (attributes || [])) {
    const type  = attr.trait_type || '';
    const value = attr.value || '';
    traits[type] = value;
  }

  // Look up rarity weights for each category
  const bgW    = lookupWeight(BG_WEIGHT,    traits.Background);
  const baseW  = lookupWeight(BASE_WEIGHT,  traits.Base);
  const clothW = lookupWeight(CLOTH_WEIGHT, traits.Cloth);
  const faceW  = lookupWeight(FACE_WEIGHT,  traits.Face);
  const hairW  = lookupWeight(HAIR_WEIGHT,  traits.Hair);
  const mouthW = lookupWeight(MOUTH_WEIGHT, traits.Mouth);
  const tattooW = lookupWeight(TATTOO_WEIGHT, traits.Tattoo);
  const fmaskW  = lookupWeight(FACEMASK_WEIGHT, traits.Facemask);

  // Stat derivation:
  //   basePWR = cloth×0.5 + base×0.3 + tattoo×0.2
  //   baseDEF = base×0.5  + cloth×0.3 + bg×0.2
  //   baseSPD = hair×0.5  + mouth×0.3 + face×0.2
  // Normalize from the 87-100 weight range to 0-100, then scale to 40-95
  const normalize = (w) => Math.max(0, Math.min(100, (w - 87) * (100 / 13)));

  const rawPwr = normalize(clothW) * 0.5  + normalize(baseW) * 0.3  + normalize(tattooW) * 0.2;
  const rawDef = normalize(baseW) * 0.5   + normalize(clothW) * 0.3 + normalize(bgW) * 0.2;
  const rawSpd = normalize(hairW) * 0.5   + normalize(mouthW) * 0.3 + normalize(faceW) * 0.2;

  // Bonus from tattoo + facemask
  const tBonus = TATTOO_BONUS[traits.Tattoo]  || TATTOO_BONUS[''];
  const fBonus = FACEMASK_BONUS[traits.Facemask] || FACEMASK_BONUS[''];

  const pwr = Math.min(99, 40 + Math.round(rawPwr * 0.55) + tBonus.pwr + fBonus.pwr);
  const def = Math.min(99, 40 + Math.round(rawDef * 0.55) + tBonus.def + fBonus.def);
  const spd = Math.min(99, 40 + Math.round(rawSpd * 0.55) + tBonus.spd + fBonus.spd);

  // Element (from background)
  const element = ELEMENT_MAP[traits.Background] || 'VOID';
  const elementColor = ELEMENT_COLORS[element] || '#888';

  // Ability (from face)
  const abilityEntry = ABILITY_MAP[traits.Face] || null;
  const ability     = abilityEntry ? abilityEntry.name : null;
  const abilityDesc = abilityEntry ? abilityEntry.desc : null;

  // Overall rarity score (average of all weights)
  const weights = [bgW, baseW, clothW, faceW, hairW, mouthW, tattooW, fmaskW];
  const rarityScore = weights.reduce((a, b) => a + b, 0) / weights.length;
  const tier = getRarityTier(rarityScore);

  return {
    pwr, def, spd,
    element, elementColor,
    ability, abilityDesc,
    rarity:      tier.name,
    rarityColor: tier.color,
    rarityScore: Math.round(rarityScore * 10) / 10,
    hue:         element === 'FIRE' ? 15 : element === 'WATER' ? 210 : element === 'EARTH' ? 35 : element === 'SHADOW' ? 280 : element === 'WIND' ? 160 : 50,
  };
}

// ── Hash-based fallback (for NFTs without metadata) ─────────────────────────

export function deriveStatsFromHash(tokenId) {
  const s = String(tokenId);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  h = Math.abs(h);

  const ELEMENTS = ['FIRE', 'WATER', 'EARTH', 'SHADOW', 'WIND', 'VOID'];
  const element = ELEMENTS[h % ELEMENTS.length];

  const pwr = 45 + (h * 7) % 40;
  const def = 30 + (h * 11) % 40;
  const spd = 50 + (h * 13) % 30;
  const total = pwr + def + spd;

  let rarity, rarityColor;
  if (total >= 205) { rarity = 'LEGENDARY'; rarityColor = '#FFD000'; }
  else if (total >= 185) { rarity = 'EPIC'; rarityColor = '#ff9900'; }
  else if (total >= 165) { rarity = 'RARE'; rarityColor = '#b040ff'; }
  else if (total >= 145) { rarity = 'UNCOMMON'; rarityColor = '#00c0ff'; }
  else { rarity = 'COMMON'; rarityColor = '#888888'; }

  return {
    pwr, def, spd,
    element,
    elementColor: ELEMENT_COLORS[element] || '#888',
    ability: null, abilityDesc: null,
    rarity, rarityColor,
    rarityScore: 0,
    hue: h % 360,
  };
}

// ── Battle engine ───────────────────────────────────────────────────────────

/**
 * Resolve a 3-round battle between two cards.
 * @param {{ pwr, def, spd, element, ability, level? }} p1
 * @param {{ pwr, def, spd, element, ability, level? }} p2
 * @param {number} [seed] optional seed for deterministic variance (server)
 * @returns {{ rounds: Array, winner: string, p1Wins: number, p2Wins: number }}
 */
export function resolveBattleLegacy(p1, p2, seed) {
  const lvlBonus1 = Math.min(10, (p1.level || 1) - 1);
  const lvlBonus2 = Math.min(10, (p2.level || 1) - 1);

  const s1 = { pwr: p1.pwr + lvlBonus1, def: p1.def + lvlBonus1, spd: p1.spd + lvlBonus1 };
  const s2 = { pwr: p2.pwr + lvlBonus2, def: p2.def + lvlBonus2, spd: p2.spd + lvlBonus2 };

  // Apply ZENKAI SURGE: +12 to lowest stat for all rounds
  if (p1.ability === 'ZENKAI SURGE') {
    const min = Math.min(s1.pwr, s1.def, s1.spd);
    if (s1.pwr === min) s1.pwr += 12;
    else if (s1.def === min) s1.def += 12;
    else s1.spd += 12;
  }
  if (p2.ability === 'ZENKAI SURGE') {
    const min = Math.min(s2.pwr, s2.def, s2.spd);
    if (s2.pwr === min) s2.pwr += 12;
    else if (s2.def === min) s2.def += 12;
    else s2.spd += 12;
  }

  // PREDATOR: +10 PWR round 1
  if (p1.ability === 'PREDATOR') s1.pwr += 10;
  if (p2.ability === 'PREDATOR') s2.pwr += 10;

  // Element bonus helper
  function elemBonus(attacker, defender, stat) {
    if (attacker === 'SHADOW') return 5;  // glass cannon: always +5
    if (ELEMENT_ADVANTAGE[attacker] === defender) return 8;
    return 0;
  }
  function elemPenalty(defender, attacker) {
    if (defender === 'SHADOW') return 5;  // takes +5 from everyone
    return 0;
  }

  // Seeded random for server determinism
  let rngState = seed ?? Math.floor(Math.random() * 2147483647);
  function nextRandom() {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }
  function variance() {
    return Math.floor(nextRandom() * 9); // 0–8
  }

  const STATS = [
    { label: 'PWR', key: 'pwr' },
    { label: 'DEF', key: 'def' },
    { label: 'SPD', key: 'spd' },
  ];

  const rounds = [];
  let p1Wins = 0, p2Wins = 0;
  let p1LostPrev = false, p2LostPrev = false;

  for (let i = 0; i < 3; i++) {
    const { label, key } = STATS[i];
    let v1 = s1[key];
    let v2 = s2[key];

    // Element bonuses
    v1 += elemBonus(p1.element, p2.element, key);
    v2 += elemBonus(p2.element, p1.element, key);
    v1 -= elemPenalty(p1.element, p2.element);
    v2 -= elemPenalty(p2.element, p1.element);

    // BLOODLUST: +8 after losing previous round
    if (p1.ability === 'BLOODLUST' && p1LostPrev) v1 += 8;
    if (p2.ability === 'BLOODLUST' && p2LostPrev) v2 += 8;

    // Round 3 abilities
    if (i === 2) {
      // AWAKENED: +6 all stats round 3
      if (p1.ability === 'AWAKENED') v1 += 6;
      if (p2.ability === 'AWAKENED') v2 += 6;

      // FLASH: +10 SPD round 3
      if (p1.ability === 'FLASH' && key === 'spd') v1 += 10;
      if (p2.ability === 'FLASH' && key === 'spd') v2 += 10;

      // RESOLVE: +10 if losing 0-2 after round 2
      if (p1.ability === 'RESOLVE' && p1Wins < p2Wins) v1 += 10;
      if (p2.ability === 'RESOLVE' && p2Wins < p1Wins) v2 += 10;
    }

    // Battle variance
    v1 += variance();
    v2 += variance();

    let result;
    if (v1 > v2) result = 'p1';
    else if (v2 > v1) result = 'p2';
    else result = 'draw';

    // MIRROR COUNTER: if losing by ≤5, flip to draw
    if (p1.ability === 'MIRROR COUNTER' && result === 'p2' && (v2 - v1) <= 5) result = 'draw';
    if (p2.ability === 'MIRROR COUNTER' && result === 'p1' && (v1 - v2) <= 5) result = 'draw';

    if (result === 'p1') p1Wins++;
    if (result === 'p2') p2Wins++;
    p1LostPrev = result === 'p2';
    p2LostPrev = result === 'p1';

    rounds.push({ stat: label, p1: v1, p2: v2, result });
  }

  return {
    rounds,
    winner: p1Wins > p2Wins ? 'p1' : p2Wins > p1Wins ? 'p2' : 'draw',
    p1Wins,
    p2Wins,
  };
}

// ── XP calculation ──────────────────────────────────────────────────────────

const RARITY_RANK = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };

export function calcXPLegacy(myRarity, oppRarity, won, draw) {
  const myR  = RARITY_RANK[myRarity]  ?? 0;
  const oppR = RARITY_RANK[oppRarity] ?? 0;

  if (draw) return 15;
  if (won) {
    if (oppR > myR)  return 75; // beat higher rarity
    if (oppR === myR) return 50;
    return 35;                  // beat lower rarity
  }
  // Lost
  if (oppR > myR)  return 20;  // lost to higher
  if (oppR === myR) return 10;
  return 5;                    // lost to lower
}

// ── NPC opponents for local mode ────────────────────────────────────────────

export function resolveBattle(p1, p2, seed) {
  return resolveEquipmentBattle(p1, p2, seed);
}

export function calcXP(myRarity, oppRarity, won, draw) {
  return calcEquipmentXP(myRarity, oppRarity, won, draw);
}

export const NPC_OPPONENTS = [
  { tokenId: '1337', name: 'SHADOW MONK',   image: '/77f70ec7-eb8e-44ed-9aee-af98932591af.jpg',  pwr: 48, def: 55, spd: 52, element: 'SHADOW', ability: 'RESOLVE',        abilityDesc: '+10 in round 3 if losing', rarity: 'COMMON',   rarityColor: '#888888', elementColor: '#9c27b0' },
  { tokenId: '2048', name: 'IRON RONIN',    image: '/9c0a9206-d63d-4d34-bc9b-4188eb44dee3.jpg',  pwr: 60, def: 58, spd: 55, element: 'EARTH',  ability: null,             abilityDesc: null, rarity: 'UNCOMMON', rarityColor: '#00c0ff', elementColor: '#8d6e34' },
  { tokenId: '4096', name: 'VOID SAMURAI',  image: '/be87c65b-fe0d-4189-bacf-8fd22b8dd2db.jpg',  pwr: 62, def: 65, spd: 68, element: 'VOID',   ability: 'FLASH',          abilityDesc: '+10 SPD in round 3', rarity: 'RARE',     rarityColor: '#b040ff', elementColor: '#ffcc00' },
  { tokenId: '7777', name: 'BLOOD KNIGHT',  image: '/dafc48fc-9308-42d8-9361-bb2922edf03b.jpg',  pwr: 75, def: 68, spd: 70, element: 'FIRE',   ability: 'BLOODLUST',      abilityDesc: '+8 after losing a round', rarity: 'EPIC',     rarityColor: '#ff9900', elementColor: '#ff5722' },
  { tokenId: '0666', name: 'GHOST STRIKER', image: '/77f70ec7-eb8e-44ed-9aee-af98932591af.jpg',  pwr: 54, def: 52, spd: 62, element: 'WIND',   ability: 'MIRROR COUNTER', abilityDesc: 'Losing by ≤5 → draw', rarity: 'UNCOMMON', rarityColor: '#00c0ff', elementColor: '#00e1a2' },
  { tokenId: '9001', name: 'TITAN WARDEN',  image: '/be87c65b-fe0d-4189-bacf-8fd22b8dd2db.jpg',  pwr: 78, def: 72, spd: 65, element: 'EARTH',  ability: 'PREDATOR',       abilityDesc: '+10 PWR in round 1', rarity: 'EPIC',     rarityColor: '#ff9900', elementColor: '#8d6e34' },
];

// ── Lookup tables export (for worker to copy) ───────────────────────────────

export { ELEMENT_ADVANTAGE, ABILITY_MAP, WEIGHT_TABLES };
import { resolveBattle as resolveEquipmentBattle, calcXP as calcEquipmentXP } from './game/equipment-system.js';
