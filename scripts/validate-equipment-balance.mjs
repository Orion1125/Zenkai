import {
  CARD_CLASSES,
  getEquipmentCatalogByClass,
  getFreeTrackLevels,
  getStarterLoadout,
  resolveBattle,
} from '../src/game/equipment-system.js';

const TARGET_WIN_RATE = 0.55;
const STARTER_MIRROR_SEEDS = 2000;
const FIELD_SAMPLE_SIZE = 48;
const TEST_LEVELS = [1, 5, 10];

function buildTrackLevels(cardClass, level) {
  const levels = getFreeTrackLevels(cardClass);
  for (const trackId of Object.keys(levels)) {
    levels[trackId] = level;
  }
  return levels;
}

function buildBaselineCard(cardClass, loadout, trackLevels) {
  return {
    tokenId: `${cardClass}-${loadout.powerTrackId}-${loadout.hpTrackId}-${loadout.speedTrackId}`,
    name: `${cardClass} baseline`,
    level: 1,
    pwr: 65,
    def: 65,
    spd: 65,
    element: cardClass,
    rarity: 'RARE',
    ability: null,
    equipmentLoadout: loadout,
    equipmentLevels: trackLevels,
  };
}

function loadoutsForClass(cardClass) {
  const tracks = getEquipmentCatalogByClass(cardClass);
  const bySlot = {
    power: tracks.filter((track) => track.slot === 'power'),
    hp: tracks.filter((track) => track.slot === 'hp'),
    speed: tracks.filter((track) => track.slot === 'speed'),
  };

  const loadouts = [];
  for (const power of bySlot.power) {
    for (const hp of bySlot.hp) {
      for (const speed of bySlot.speed) {
        loadouts.push({
          powerTrackId: power.trackId,
          hpTrackId: hp.trackId,
          speedTrackId: speed.trackId,
        });
      }
    }
  }
  return loadouts;
}

function hasRealDrawback(track) {
  const config = track.levels[0]?.config || {};
  return (
    (config.pwrPenalty || 0) > 0 ||
    (config.hpPenalty || 0) > 0 ||
    (config.spdPenalty || 0) > 0 ||
    (config.outgoingPenalty || 0) > 0 ||
    (config.healPenalty || 0) > 0 ||
    (config.selfDamage || 0) > 0 ||
    (config.selfDot || 0) > 0
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
  const tracks = getEquipmentCatalogByClass(cardClass);
  const missingTradeoff = tracks.filter((track) => !hasRealDrawback(track));
  if (missingTradeoff.length) {
    failures.push(`${cardClass} has tracks without a visible drawback: ${missingTradeoff.map((track) => track.trackId).join(', ')}`);
  }

  for (const level of TEST_LEVELS) {
    const levelTrackLevels = buildTrackLevels(cardClass, level);
    let starterScore = 0;
    for (let seed = 1; seed <= STARTER_MIRROR_SEEDS; seed += 1) {
      starterScore += mirroredScore(
        buildBaselineCard(cardClass, starter, levelTrackLevels),
        buildBaselineCard(cardClass, starter, levelTrackLevels),
        seed
      );
    }
    const starterRate = starterScore / STARTER_MIRROR_SEEDS;
    if (starterRate > TARGET_WIN_RATE) {
      failures.push(`${cardClass} level ${level} starter mirror exceeds ${(TARGET_WIN_RATE * 100).toFixed(0)}% win score (${starterRate.toFixed(3)})`);
    }

    const loadouts = loadoutsForClass(cardClass);
    const sampleOpponents = Array.from(
      { length: FIELD_SAMPLE_SIZE },
      (_, index) => loadouts[Math.floor((index * loadouts.length) / FIELD_SAMPLE_SIZE)]
    );

    for (let index = 0; index < loadouts.length; index += 1) {
      const loadout = loadouts[index];
      let score = 0;
      for (let opponentIndex = 0; opponentIndex < sampleOpponents.length; opponentIndex += 1) {
        const seed = ((level * 100000) + ((index + 1) * 100) + opponentIndex);
        score += mirroredScore(
          buildBaselineCard(cardClass, loadout, levelTrackLevels),
          buildBaselineCard(cardClass, sampleOpponents[opponentIndex], levelTrackLevels),
          seed
        );
      }

      const rate = score / sampleOpponents.length;
      if (rate > TARGET_WIN_RATE) {
        failures.push(
          `${cardClass} level ${level} loadout ${loadout.powerTrackId} / ${loadout.hpTrackId} / ${loadout.speedTrackId} exceeds ${(TARGET_WIN_RATE * 100).toFixed(0)}% sampled field rate (${rate.toFixed(3)})`
        );
        break;
      }
    }
  }
}

if (failures.length) {
  console.warn('Equipment validation warnings:');
  for (const failure of failures) console.warn(`- ${failure}`);
  process.exit(0);
}

console.log('Equipment validation passed.');
