import { buildLoadoutView, normalizeCardClass } from './equipment-catalog.js';

const SIM_CAP_SECONDS = 180;
const CYCLE_SECONDS = 5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seedFromCards(p1, p2, seed) {
  if (seed != null) return Math.abs(Number(seed)) || 1;
  const raw = `${p1.tokenId || p1.token_id || 'p1'}:${p2.tokenId || p2.token_id || 'p2'}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

function createRng(seed) {
  let state = seedFromCards({ tokenId: seed }, { tokenId: 'zenkai' }, seed);
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function seedHp(card) {
  const level = Number(card.level) || 1;
  if (card.hp != null) return Number(card.hp);
  return 180 + ((Number(card.def) || 50) * 3) + (level * 10);
}

export function deriveCombatStats(card, loadout, trackLevels) {
  const classKey = normalizeCardClass(card.element || card.cardClass);
  const loadoutView = buildLoadoutView(loadout || card.equipmentLoadout || {}, classKey, trackLevels || card.equipmentLevels);
  const base = {
    pwr: Number(card.pwr) || 50,
    spd: Number(card.spd) || 50,
    hp: seedHp(card),
  };

  for (const item of loadoutView.items) {
    if (!item) continue;
    const cfg = item.currentConfig;
    base.pwr += (cfg.pwr || 0) - (cfg.pwrPenalty || 0);
    base.spd += (cfg.spd || 0) - (cfg.spdPenalty || 0);
    base.hp += (cfg.hp || 0) - (cfg.hpPenalty || 0);
  }

  return {
    classKey,
    pwr: Math.max(1, Math.round(base.pwr)),
    spd: Math.max(1, Math.round(base.spd)),
    hp: Math.max(40, Math.round(base.hp)),
    loadoutView,
  };
}

function createState(card, actorKey, seed) {
  const stats = deriveCombatStats(card);
  const speedCfg = stats.loadoutView.bySlot.speed?.currentConfig || {};
  return {
    actorKey,
    name: card.name || actorKey,
    tokenId: card.tokenId || card.token_id || actorKey,
    classKey: stats.classKey,
    loadout: stats.loadoutView,
    pwr: stats.pwr,
    spd: stats.spd,
    hpMax: stats.hp,
    hp: stats.hp,
    tempo: speedCfg.startTempo || 0,
    guard: 0,
    shield: 0,
    damageDealt: 0,
    openingUsed: false,
    surviveUsed: false,
    cycleActions: 0,
    lastActTick: 0,
    temporary: { pwr: 0, spd: 0, damageTakenMult: 0, exposeTicks: 0, fluxTicks: 0 },
    statuses: {
      burn: 0,
      bleed: 0,
      chill: 0,
      expose: 0,
    },
    rng: createRng(seed),
  };
}

function loadoutConfig(state, slot) {
  return state.loadout.bySlot[slot]?.currentConfig || {};
}

function applyHeal(state, amount) {
  if (amount <= 0 || state.hp <= 0) return 0;
  let penalty = state.statuses.burn > 0 ? 0.8 : 1;
  const powerCfg = loadoutConfig(state, 'power');
  if (powerCfg.healPenalty) penalty *= (1 - powerCfg.healPenalty);
  const healed = Math.min(state.hpMax - state.hp, Math.max(0, Math.floor(amount * penalty)));
  state.hp += healed;
  return healed;
}

function applyDirectDamage(state, amount) {
  if (amount <= 0 || state.hp <= 0) return 0;
  const dealt = Math.min(state.hp, Math.floor(amount));
  state.hp -= dealt;
  return dealt;
}

function applyCycleEffects(state, tick, notes) {
  const hpCfg = loadoutConfig(state, 'hp');
  const powerCfg = loadoutConfig(state, 'power');
  const speedCfg = loadoutConfig(state, 'speed');

  state.guard = hpCfg.guardPerCycle || 0;
  if (hpCfg.startShield && tick <= CYCLE_SECONDS) state.shield += hpCfg.startShield;

  // Regular regen
  if (hpCfg.regen) {
    const healed = applyHeal(state, hpCfg.regen + (state.classKey === 'WATER' ? 1 : 0));
    if (healed > 0) notes.push(`regen +${healed}`);
  }

  // Emergency regen (Laststand H8) — below 35% HP
  if (hpCfg.emergencyRegen && state.hp / state.hpMax <= 0.35) {
    const healed = applyHeal(state, hpCfg.emergencyRegen);
    if (healed > 0) notes.push(`emergency regen +${healed}`);
  }

  // Cleanse (Ward H9) — cooldown scales with level
  if (hpCfg.cleanseEvery && hpCfg.cleanseEvery > 0 && (tick % hpCfg.cleanseEvery === 0)) {
    state.statuses.burn = 0;
    state.statuses.bleed = 0;
    state.statuses.chill = 0;
    state.statuses.expose = 0;
    notes.push('cleanse');
  }

  // Status damage ticks
  if (state.statuses.burn > 0) notes.push(`burn ${applyDirectDamage(state, state.statuses.burn)}`);
  if (state.statuses.bleed > 0) notes.push(`bleed ${applyDirectDamage(state, state.statuses.bleed)}`);
  if (speedCfg.selfDot) notes.push(`overclock ${applyDirectDamage(state, speedCfg.selfDot)}`);

  // Flux pulse (Reactor P3)
  if (powerCfg.fluxPulse) {
    if (state.rng() > 0.5) {
      state.temporary.pwr = powerCfg.fluxPulse;
      state.temporary.spd = 0;
      notes.push(`flux +${powerCfg.fluxPulse} PWR`);
    } else {
      state.temporary.pwr = 0;
      state.temporary.spd = -powerCfg.fluxPulse;
      notes.push(`flux -${powerCfg.fluxPulse} SPD`);
    }
    state.temporary.fluxTicks = CYCLE_SECONDS;
  }
}

function effectivePwr(state) {
  const hpCfg = loadoutConfig(state, 'hp');
  const base = state.pwr + state.temporary.pwr;
  const penalty = hpCfg.outgoingPenalty ? (1 - hpCfg.outgoingPenalty) : 1;
  return Math.max(1, Math.floor(base * penalty));
}

function effectiveSpd(state) {
  const hpCfg = loadoutConfig(state, 'hp');
  const chillPenalty = state.statuses.chill > 0 ? Math.floor(state.spd * state.statuses.chill) : 0;
  let bonus = 0;
  if (hpCfg.lowHpSpeed && state.hp / state.hpMax <= 0.35) bonus += hpCfg.lowHpSpeed;
  if (state.classKey === 'WIND') bonus += 4;
  return Math.max(1, state.spd + state.temporary.spd - chillPenalty + bonus);
}

function applyStatus(defender, statusKey, value) {
  // EARTH statusResist: chance to resist status application
  if (defender.classKey === 'EARTH' && defender.rng() < 0.08) return false;
  defender.statuses[statusKey] = Math.max(defender.statuses[statusKey], value);
  // Adaptive H7: gain shield when debuffed
  const defHpCfg = loadoutConfig(defender, 'hp');
  if (defHpCfg.shieldOnDebuff) defender.shield += defHpCfg.shieldOnDebuff;
  return true;
}

function dealAttack(attacker, defender, secondInCycle, tick) {
  const notes = [];
  const powerCfg = loadoutConfig(attacker, 'power');
  const speedCfg = loadoutConfig(attacker, 'speed');
  const targetHpCfg = loadoutConfig(defender, 'hp');
  let damage = Math.max(4, Math.floor(effectivePwr(attacker) * 0.42));

  if (!attacker.openingUsed && powerCfg.openingBurst) {
    damage += powerCfg.openingBurst;
    attacker.openingUsed = true;
    notes.push(`opening +${powerCfg.openingBurst}`);
  }
  if (powerCfg.lowHpBonus && attacker.hp / attacker.hpMax <= 0.35) damage += powerCfg.lowHpBonus;
  if (speedCfg.firstStrike && secondInCycle === 0) damage += speedCfg.firstStrike;
  if (powerCfg.firstStrike && secondInCycle === 0) damage += powerCfg.firstStrike;
  if (powerCfg.shieldBreak && defender.shield > 0) damage += powerCfg.shieldBreak;
  if (powerCfg.shieldDamageBonus && defender.shield > 0) damage += powerCfg.shieldDamageBonus;

  // Momentum (Tempo S7): bonus PWR if attacker acted more recently than defender
  if (speedCfg.momentumPwr && attacker.lastActTick > defender.lastActTick) {
    damage += speedCfg.momentumPwr;
    notes.push(`momentum +${speedCfg.momentumPwr}`);
  }

  // Status application (with EARTH resist + Adaptive shield-on-debuff)
  if (attacker.classKey === 'FIRE' && attacker.rng() < 0.25) {
    if (applyStatus(defender, 'burn', 2)) notes.push('burn applied');
  }
  if (attacker.classKey === 'WATER') applyStatus(defender, 'chill', 0.08);

  let critChance = (speedCfg.critChance || 0) + (powerCfg.critChance || 0);
  if (attacker.classKey === 'SHADOW' && attacker.hp / attacker.hpMax >= 0.7) critChance += 0.04;
  const crit = attacker.rng() < critChance;
  if (crit) {
    damage = Math.floor(damage * 1.5);
    notes.push('crit');
    // FIRE class: crits apply burn
    if (attacker.classKey === 'FIRE') applyStatus(defender, 'burn', 3);
  }

  if (powerCfg.execute && defender.hp / defender.hpMax <= 0.25) damage += Math.floor(defender.hpMax * powerCfg.execute);

  // Expose — uses its own timer, not coupled to flux
  if (powerCfg.expose) {
    defender.temporary.damageTakenMult = Math.max(defender.temporary.damageTakenMult, powerCfg.expose);
    defender.temporary.exposeTicks = CYCLE_SECONDS;
  }

  if (speedCfg.chill) applyStatus(defender, 'chill', speedCfg.chill);
  if (speedCfg.dotPerCycle) applyStatus(defender, 'bleed', speedCfg.dotPerCycle);

  const defenderDodge = (loadoutConfig(defender, 'speed').dodge || 0) + (defender.classKey === 'WIND' ? 0.02 : 0);
  if (defender.rng() < defenderDodge) {
    notes.push('dodged');
    attacker.lastActTick = tick;
    return { actor: attacker.actorKey, target: defender.actorKey, damage: 0, notes };
  }

  if (defender.guard > 0) {
    const blocked = Math.min(defender.guard, damage);
    damage -= blocked;
    defender.guard = Math.max(0, defender.guard - blocked);
    if (blocked > 0) notes.push(`guard ${blocked}`);
    if (targetHpCfg.healOnGuard) applyHeal(defender, targetHpCfg.healOnGuard);
  }

  if (defender.shield > 0) {
    const shieldHit = Math.min(defender.shield, damage);
    defender.shield -= shieldHit;
    damage -= shieldHit;
    if (shieldHit > 0) notes.push(`shield ${shieldHit}`);
  }

  damage = Math.floor(damage * (1 + defender.temporary.damageTakenMult));
  let hpDamage = applyDirectDamage(defender, damage);

  // Survive once (Escape S8)
  if (defender.hp <= 0 && !defender.surviveUsed) {
    const defSpeedCfg = loadoutConfig(defender, 'speed');
    if (defSpeedCfg.surviveOnce) {
      defender.hp = 1;
      defender.surviveUsed = true;
      hpDamage = Math.max(0, hpDamage - 1);
      notes.push('survive!');
    }
  }

  attacker.damageDealt += hpDamage;

  const lifesteal = (powerCfg.lifesteal || 0) + (attacker.classKey === 'SHADOW' ? 0.04 : 0);
  if (lifesteal > 0 && hpDamage > 0) {
    const healed = applyHeal(attacker, Math.floor(hpDamage * lifesteal));
    if (healed > 0) notes.push(`lifesteal +${healed}`);
  }

  if (targetHpCfg.reflect) {
    const reflected = applyDirectDamage(attacker, targetHpCfg.reflect);
    if (reflected > 0) notes.push(`reflect ${reflected}`);
  }
  if (crit && targetHpCfg.critReflect) {
    const reflected = applyDirectDamage(attacker, targetHpCfg.critReflect);
    if (reflected > 0) notes.push(`mirror ${reflected}`);
  }
  if (speedCfg.shieldAfterAttack) attacker.shield += speedCfg.shieldAfterAttack;
  if (powerCfg.guardAfterAttack) attacker.guard += powerCfg.guardAfterAttack;
  if (powerCfg.selfDamage) applyDirectDamage(attacker, powerCfg.selfDamage);
  if (speedCfg.purgeShield && defender.shield > 0) defender.shield = Math.max(0, defender.shield - speedCfg.purgeShield);

  // Purge buff (Disruptor S9) — remove expose damage mult from defender's attacker (i.e., strip a temporary buff)
  if (speedCfg.purgeBuff && defender.temporary.fluxTicks > 0 && defender.temporary.pwr > 0) {
    defender.temporary.pwr = 0;
    defender.temporary.fluxTicks = 0;
    notes.push('purge buff');
  }

  if (attacker.classKey === 'VOID') {
    attacker.cycleActions += 1;
    if (attacker.cycleActions % 3 === 0) {
      const dealt = applyDirectDamage(defender, 4);
      if (dealt > 0) notes.push(`void +${dealt}`);
    }
  }

  attacker.lastActTick = tick;
  return { actor: attacker.actorKey, target: defender.actorKey, damage: hpDamage, notes, targetHp: defender.hp, targetShield: defender.shield };
}

export function resolveBattle(p1Card, p2Card, seed) {
  const resolvedSeed = seedFromCards(p1Card, p2Card, seed);
  const rng = createRng(resolvedSeed);
  const p1 = createState(p1Card, 'p1', resolvedSeed * 3 + 11);
  const p2 = createState(p2Card, 'p2', resolvedSeed * 7 + 37);
  const rounds = [];
  let tick = 0;

  while (tick < SIM_CAP_SECONDS && p1.hp > 0 && p2.hp > 0) {
    tick += 1;
    const cycleStart = ((tick - 1) % CYCLE_SECONDS) === 0;
    const p1CycleNotes = [];
    const p2CycleNotes = [];
    const actions = [];

    if (cycleStart) {
      applyCycleEffects(p1, tick, p1CycleNotes);
      if (p2.hp > 0) applyCycleEffects(p2, tick, p2CycleNotes);
    }

    p1.tempo += effectiveSpd(p1);
    p2.tempo += effectiveSpd(p2);

    let secondActions = 0;
    while ((p1.tempo >= 100 || p2.tempo >= 100) && p1.hp > 0 && p2.hp > 0) {
      const actor = (p1.tempo > p2.tempo || (p1.tempo === p2.tempo && rng() < 0.5)) ? p1 : p2;
      const defender = actor === p1 ? p2 : p1;
      actor.tempo -= 100;
      actions.push(dealAttack(actor, defender, secondActions, tick));
      secondActions += 1;
    }

    // Decay expose timer (independent of flux)
    for (const s of [p1, p2]) {
      if (s.temporary.exposeTicks > 0) {
        s.temporary.exposeTicks -= 1;
        if (s.temporary.exposeTicks === 0) s.temporary.damageTakenMult = 0;
      }
      if (s.temporary.fluxTicks > 0) {
        s.temporary.fluxTicks -= 1;
        if (s.temporary.fluxTicks === 0) { s.temporary.pwr = 0; s.temporary.spd = 0; }
      }
    }

    if (cycleStart || actions.length || tick === SIM_CAP_SECONDS || p1.hp <= 0 || p2.hp <= 0) {
      rounds.push({
        round: tick,
        cycleStart,
        start: { p1: cycleStart ? p1CycleNotes : [], p2: cycleStart ? p2CycleNotes : [] },
        actions,
        endNotes: [],
        end: {
          p1: { hp: p1.hp, hpMax: p1.hpMax, shield: p1.shield, statuses: [] },
          p2: { hp: p2.hp, hpMax: p2.hpMax, shield: p2.shield, statuses: [] },
        },
        leader: p1.hp === p2.hp ? 'draw' : p1.hp > p2.hp ? 'p1' : 'p2',
      });
    }
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
