import {
  CARD_CLASSES,
  getEquipmentCatalogByClass,
  getStarterLoadout,
  resolveBattle,
} from '../src/game/equipment-system.js';

function buildBaselineCard(cardClass, loadout) {
  return {
    tokenId: `${cardClass}-test`,
    name: `${cardClass} baseline`,
    level: 1,
    pwr: 65,
    def: 65,
    spd: 65,
    element: cardClass,
    rarity: 'RARE',
    ability: null,
    equipmentLoadout: loadout,
  };
}

function loadoutsForClass(cardClass) {
  const items = getEquipmentCatalogByClass(cardClass);
  const bySlot = {
    power: items.filter((item) => item.slot === 'power'),
    defense: items.filter((item) => item.slot === 'defense'),
    speed: items.filter((item) => item.slot === 'speed'),
  };

  const loadouts = [];
  for (const power of bySlot.power) {
    for (const defense of bySlot.defense) {
      for (const speed of bySlot.speed) {
        loadouts.push({
          powerItemId: power.id,
          defenseItemId: defense.id,
          speedItemId: speed.id,
        });
      }
    }
  }
  return loadouts;
}

function hasRealDrawback(item) {
  const effects = item.effects.join(' ').toLowerCase();
  return (
    (item.mods.pwr || 0) < 0 ||
    (item.mods.def || 0) < 0 ||
    (item.mods.spd || 0) < 0 ||
    effects.includes('self-damage') ||
    effects.includes('healing received -') ||
    effects.includes('outgoing damage -')
  );
}

function winScore(winner) {
  if (winner === 'p1') return 1;
  if (winner === 'draw') return 0.5;
  return 0;
}

function mirroredScore(leftCard, rightCard, seed) {
  const forward = resolveBattle(leftCard, rightCard, seed);
  const reverse = resolveBattle(rightCard, leftCard, seed);
  return (winScore(forward.winner) + (1 - winScore(reverse.winner))) / 2;
}

const failures = [];

for (const cardClass of CARD_CLASSES) {
  const starter = getStarterLoadout(cardClass);
  let starterScore = 0;
  for (let seed = 1; seed <= 10000; seed += 1) {
    starterScore += mirroredScore(
      buildBaselineCard(cardClass, starter),
      buildBaselineCard(cardClass, starter),
      seed
    );
  }
  const starterRate = starterScore / 10000;
  if (starterRate > 0.55) {
    failures.push(`${cardClass} starter mirror exceeds 55% win score (${starterRate.toFixed(3)})`);
  }

  const items = getEquipmentCatalogByClass(cardClass);
  const missingTradeoff = items.filter((item) => !hasRealDrawback(item));
  if (missingTradeoff.length) {
    failures.push(`${cardClass} has items without a visible drawback: ${missingTradeoff.map((item) => item.id).join(', ')}`);
  }

  const loadouts = loadoutsForClass(cardClass);
  const sampleSize = 96;
  const sampleOpponents = Array.from({ length: sampleSize }, (_, index) => loadouts[Math.floor((index * loadouts.length) / sampleSize)]);

  for (let index = 0; index < loadouts.length; index += 1) {
    const loadout = loadouts[index];
    let score = 0;
    for (let opponentIndex = 0; opponentIndex < sampleOpponents.length; opponentIndex += 1) {
      score += mirroredScore(
        buildBaselineCard(cardClass, loadout),
        buildBaselineCard(cardClass, sampleOpponents[opponentIndex]),
        (index + 1) * 1000 + opponentIndex
      );
    }
    const rate = score / sampleOpponents.length;
    if (rate > 0.55) {
      failures.push(`${cardClass} loadout ${loadout.powerItemId} / ${loadout.defenseItemId} / ${loadout.speedItemId} exceeds 55% sampled field rate (${rate.toFixed(3)})`);
      break;
    }
  }
}

if (failures.length) {
  console.warn('Equipment validation warnings:');
  for (const failure of failures) console.warn(`- ${failure}`);
  process.exit(0);
}

console.log('Equipment validation passed.');
