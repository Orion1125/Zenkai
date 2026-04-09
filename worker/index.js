import {
  CARD_CLASSES,
  buildEquipmentCardView,
  buildLoadoutView,
  calcXP as calcEquipmentXp,
  getEquipmentById,
  getEquipmentCatalogByClass,
  getForgeShardReward,
  getStarterLoadout,
  normalizeCardClass,
  resolveBattle as resolveEquipmentBattle,
} from '../src/game/equipment-system.js';

// ══════════════════════════════════════════════
// ZENKAI — Cloudflare Worker API
// DB: D1 (SQLite)  |  No Express, no Neon
// ══════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8787',
  'https://zenkai.io',
  'https://www.zenkai.io',
  'https://zenkai.pages.dev',
  'https://zenkai-omega.vercel.app',
];

function corsOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow any *.zenkai.pages.dev preview deploy
  if (/^https:\/\/[a-z0-9-]+\.zenkai\.pages\.dev$/.test(origin)) return origin;
  // Allow Vercel preview/production deploys
  if (/^https:\/\/zenkai[a-z0-9-]*\.vercel\.app$/.test(origin)) return origin;
  if (/^https:\/\/zenkai[a-z0-9-]*-orion1125s-projects\.vercel\.app$/.test(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin':  corsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ── URL sanitization (block javascript: and other dangerous schemes) ──────────

function sanitizeUrl(raw) {
  if (!raw) return null;
  try { const u = new URL(raw); return ['https:', 'http:'].includes(u.protocol) ? raw : null; }
  catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Per-request context holder (isolated via AsyncLocalStorage-like pattern)
let _currentRequest = null;

async function withRequest(request, fn) {
  const prev = _currentRequest;
  _currentRequest = request;
  try { return await fn(); } finally { _currentRequest = prev; }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function json(data, status = 200, request) {
  const req = request || _currentRequest;
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
  });
}

function csvResponse(text, filename, request) {
  const req = request || _currentRequest;
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] };
  return new Response(text, {
    headers: {
      ...cors,
      ...SECURITY_HEADERS,
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function isValidEthAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    // Compare against self to burn same time, then return false
    const dummy = new Uint8Array(a.length);
    const enc = new TextEncoder();
    const aBytes = enc.encode(a);
    let d = 0;
    for (let i = 0; i < aBytes.length; i++) d |= aBytes[i] ^ dummy[i];
    return false;
  }
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function requireAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'admin_not_configured' }, 503);
  const auth = request.headers.get('Authorization') || '';
  if (!timingSafeEqual(auth, `Bearer ${token}`)) return json({ error: 'unauthorized' }, 401);
  return null;
}

// ── Stat derivation (hash fallback — used when no attributes stored) ─────────

function deriveStatsFromHash(tokenId) {
  const s = String(tokenId);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    pwr:     45 + (h * 7)  % 40,
    def:     30 + (h * 11) % 40,
    spd:     50 + (h * 13) % 30,
    element: ['FIRE','WATER','EARTH','SHADOW','WIND','VOID'][h % 6],
    ability: ['ZENKAI SURGE','MIRROR COUNTER','AWAKENED','PREDATOR','BLOODLUST','FLASH','RESOLVE'][(h * 3) % 7],
    rarity:  'COMMON',
  };
}

// ── Element advantage chart ────────────────────────────────────────────────

const ELEMENT_ADVANTAGE = {
  FIRE:   'WIND',
  WIND:   'EARTH',
  EARTH:  'WATER',
  WATER:  'FIRE',
  SHADOW: null,
  VOID:   null,
};

// ── Seeded random (deterministic per battle) ────────────────────────────────

function seededRng(seed) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function battleSeed(p1id, p2id) {
  const combo = `${p1id}:${p2id}:${Date.now()}`;
  let h = 0;
  for (let i = 0; i < combo.length; i++) h = (Math.imul(31, h) + combo.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Full trait-based battle resolution (mirrors frontend traits.js) ──────────

function resolveBattle(p1, p2, seed) {
  return resolveEquipmentBattle(p1, p2, seed);
}

function calcXP(myRarity, oppRarity, won, draw) {
  return calcEquipmentXp(myRarity, oppRarity, won, draw);
}

const QUEUE_TICKET_TTL_SECONDS = 90;
const MATCH_ASSEMBLY_TTL_SECONDS = 15;
const MATCHED_TICKET_TTL_SECONDS = 180;
const DEFAULT_COMPETITIVE_RATING = 1500;
const DEFAULT_COMPETITIVE_RD = 350;
const DEFAULT_COMPETITIVE_VOLATILITY = 0.06;
const COMPETITIVE_TAU = 0.5;
const GLICKO2_SCALE = 173.7178;
const POWER_BUCKET_SIZE = 75;
const RARITY_RATING_BONUS = {
  COMMON: 0,
  UNCOMMON: 25,
  RARE: 55,
  EPIC: 95,
  LEGENDARY: 140,
};
const RARITY_COMPETITIVE_SEED = {
  COMMON: -40,
  UNCOMMON: -15,
  RARE: 20,
  EPIC: 60,
  LEGENDARY: 110,
};

let _matchmakingSchemaPromise = null;

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function applyBattleProgress(cardRow, xpEarned, outcome) {
  let level  = Math.max(1, Number(cardRow?.level) || 1);
  let xp     = Math.max(0, Number(cardRow?.xp) || 0) + xpEarned;
  let wins   = Math.max(0, Number(cardRow?.wins) || 0);
  let losses = Math.max(0, Number(cardRow?.losses) || 0);

  if (outcome === 'win') wins += 1;
  if (outcome === 'loss') losses += 1;

  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
  }

  return { level, xp, wins, losses };
}

function buildCardStats(cardRow, fallbackCard) {
  if (cardRow && cardRow.pwr != null) {
    return {
      pwr:     cardRow.pwr,
      def:     cardRow.def,
      hp:      cardRow.hp,
      spd:     cardRow.spd,
      element: cardRow.element,
      ability: cardRow.ability,
      rarity:  cardRow.rarity,
      level:   cardRow.level || 1,
    };
  }

  if (fallbackCard && fallbackCard.pwr != null) {
    return {
      pwr:     fallbackCard.pwr,
      def:     fallbackCard.def,
      hp:      fallbackCard.hp,
      spd:     fallbackCard.spd,
      element: fallbackCard.element,
      ability: fallbackCard.ability,
      rarity:  fallbackCard.rarity,
      level:   fallbackCard.level || cardRow?.level || 1,
    };
  }

  return {
    ...deriveStatsFromHash(fallbackCard?.tokenId),
    level: cardRow?.level || 1,
  };
}

function normalizeRarity(rarity) {
  const value = String(rarity || 'COMMON').toUpperCase();
  return RARITY_RATING_BONUS[value] != null ? value : 'COMMON';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseDbDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(String(value).replace(' ', 'T') + 'Z');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getCardPowerScore(cardRow, fallbackCard) {
  const stats  = buildCardStats(cardRow, fallbackCard);
  const level  = Math.max(1, Number(stats.level) || 1);
  const hpSeed = Number(stats.hp ?? (180 + ((Number(stats.def) || 50) * 3) + (level * 10)));
  const avg    = ((Number(stats.pwr) || 50) + (hpSeed / 8) + (Number(stats.spd) || 50)) / 3;
  const rarity = normalizeRarity(stats.rarity || fallbackCard?.rarity || cardRow?.rarity);
  return Math.round(level * 120 + avg * 6 + (RARITY_RATING_BONUS[rarity] || 0));
}

function seedCompetitiveRating(cardRow, fallbackCard) {
  const stats  = buildCardStats(cardRow, fallbackCard);
  const level  = Math.max(1, Number(stats.level) || 1);
  const hpSeed = Number(stats.hp ?? (180 + ((Number(stats.def) || 50) * 3) + (level * 10)));
  const avg    = ((Number(stats.pwr) || 50) + (hpSeed / 8) + (Number(stats.spd) || 50)) / 3;
  const rarity = normalizeRarity(stats.rarity || fallbackCard?.rarity || cardRow?.rarity);
  return clamp(
    Math.round(DEFAULT_COMPETITIVE_RATING + (avg - 50) * 4 + (level - 1) * 18 + (RARITY_COMPETITIVE_SEED[rarity] || 0)),
    1200,
    1800
  );
}

function getCompetitiveState(cardRow, fallbackCard) {
  const seededRating = seedCompetitiveRating(cardRow, fallbackCard);
  const powerScore   = getCardPowerScore(cardRow, fallbackCard);

  return {
    rating: Number(cardRow?.competitive_rating ?? cardRow?.rating ?? seededRating),
    rd: Number(cardRow?.competitive_rd ?? cardRow?.rd ?? DEFAULT_COMPETITIVE_RD),
    volatility: Number(cardRow?.competitive_volatility ?? cardRow?.volatility ?? DEFAULT_COMPETITIVE_VOLATILITY),
    matches: Math.max(0, Number(cardRow?.competitive_matches ?? cardRow?.matches) || 0),
    lastRatedAt: cardRow?.last_rated_at || cardRow?.lastRatedAt || null,
    powerScore,
    powerBucket: Math.floor(powerScore / POWER_BUCKET_SIZE),
  };
}

function competitiveTierFromRating(rating) {
  if (rating >= 2200) return 'Grandmaster';
  if (rating >= 2000) return 'Master';
  if (rating >= 1800) return 'Diamond';
  if (rating >= 1650) return 'Platinum';
  if (rating >= 1500) return 'Gold';
  if (rating >= 1350) return 'Silver';
  return 'Bronze';
}

function computeMatchProfile(cardRow, fallbackCard) {
  const state = getCompetitiveState(cardRow, fallbackCard);

  return {
    rating: Math.round(state.rating),
    bucketKey: state.powerBucket,
    ratingDeviation: Math.round(state.rd),
    matches: state.matches,
    tier: competitiveTierFromRating(state.rating),
  };
}

function toGlicko2Scale(rating) {
  return (rating - DEFAULT_COMPETITIVE_RATING) / GLICKO2_SCALE;
}

function fromGlicko2Scale(value) {
  return value * GLICKO2_SCALE + DEFAULT_COMPETITIVE_RATING;
}

function glickoG(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function glickoE(mu, opponentMu, opponentPhi) {
  return 1 / (1 + Math.exp(-glickoG(opponentPhi) * (mu - opponentMu)));
}

function inflateCompetitiveRd(state, nowMs = Date.now()) {
  const lastRatedAt = parseDbDate(state.lastRatedAt);
  if (!lastRatedAt) return state.rd;

  const elapsedDays = Math.floor((nowMs - lastRatedAt) / 86400000);
  if (elapsedDays <= 0) return state.rd;

  const phi = state.rd / GLICKO2_SCALE;
  const phiStar = Math.sqrt(phi * phi + elapsedDays * state.volatility * state.volatility);
  return clamp(phiStar * GLICKO2_SCALE, 30, DEFAULT_COMPETITIVE_RD);
}

function updateCompetitiveRating(playerState, opponentState, score) {
  const workingPlayer = {
    ...playerState,
    rd: inflateCompetitiveRd(playerState),
  };
  const workingOpponent = {
    ...opponentState,
    rd: inflateCompetitiveRd(opponentState),
  };

  const mu = toGlicko2Scale(workingPlayer.rating);
  const phi = workingPlayer.rd / GLICKO2_SCALE;
  const muJ = toGlicko2Scale(workingOpponent.rating);
  const phiJ = workingOpponent.rd / GLICKO2_SCALE;
  const g = glickoG(phiJ);
  const e = glickoE(mu, muJ, phiJ);
  const v = 1 / (g * g * e * (1 - e));
  const delta = v * g * (score - e);
  const sigma = workingPlayer.volatility;
  const a = Math.log(sigma * sigma);

  const f = (x) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * Math.pow(phi * phi + v + ex, 2)) - ((x - a) / (COMPETITIVE_TAU * COMPETITIVE_TAU));
  };

  let A = a;
  let B;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * COMPETITIVE_TAU) < 0) k += 1;
    B = a - k * COMPETITIVE_TAU;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > 0.000001) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }

  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt((1 / (phiStar * phiStar)) + (1 / v));
  const newMu = mu + (newPhi * newPhi) * g * (score - e);

  return {
    rating: clamp(fromGlicko2Scale(newMu), 900, 2600),
    rd: clamp(newPhi * GLICKO2_SCALE, 30, DEFAULT_COMPETITIVE_RD),
    volatility: newSigma,
    matches: workingPlayer.matches + 1,
    lastRatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
}

function attachCompetitiveMeta(cardRow, fallbackCard = cardRow) {
  if (!cardRow && !fallbackCard) return null;

  const state = getCompetitiveState(cardRow, fallbackCard);
  return {
    ...(cardRow || fallbackCard || {}),
    competitive_rating: Math.round(state.rating),
    competitive_rd: Math.round(state.rd),
    competitive_volatility: Number(state.volatility.toFixed(5)),
    competitive_matches: state.matches,
    competitive_tier: competitiveTierFromRating(state.rating),
  };
}

function attachCardLoadout(cardRow, loadout, trackLevels, fallbackClass = cardRow?.element) {
  if (!cardRow) return null;
  return buildEquipmentCardView(attachCompetitiveMeta(cardRow), loadout, trackLevels, fallbackClass);
}

async function getPlayerProgress(env, address) {
  await env.DB.prepare(
    `INSERT INTO player_progress (address, forge_shards, updated_at)
     VALUES (?, 0, CURRENT_TIMESTAMP)
     ON CONFLICT(address) DO NOTHING`
  ).bind(address).run();

  return env.DB.prepare(
    'SELECT * FROM player_progress WHERE address = ?'
  ).bind(address).first();
}

async function getTrackLevelsForClass(env, address, cardClass) {
  const normalized = normalizeCardClass(cardClass);
  // All equipment tracks are unlocked and level with the player's card level
  const cardRow = await env.DB.prepare(
    'SELECT level FROM game_cards WHERE address = ?'
  ).bind(address).first();
  const cardLevel = Math.max(1, Math.min(10, Number(cardRow?.level) || 1));
  const catalog = getEquipmentCatalogByClass(normalized);
  return Object.fromEntries(catalog.map((track) => [track.trackId, cardLevel]));
}

async function hasActiveQueueLock(env, address) {
  const row = await env.DB.prepare(
    "SELECT status FROM battle_queue WHERE address = ? AND status IN ('searching', 'matching') LIMIT 1"
  ).bind(address).first();
  return !!row;
}

async function getCardLoadoutRecord(env, address, tokenId, cardClass) {
  const normalizedClass = normalizeCardClass(cardClass);
  const existing = await env.DB.prepare(
    'SELECT * FROM card_loadouts WHERE address = ? AND token_id = ?'
  ).bind(address, String(tokenId)).first();

  const trackLevels = await getTrackLevelsForClass(env, address, normalizedClass);

  if (existing) {
    const normalized = {
      powerTrackId: existing.power_track_id || existing.power_item_id || getStarterLoadout(normalizedClass).powerTrackId,
      hpTrackId: existing.hp_track_id || (existing.defense_item_id ? String(existing.defense_item_id).replace('_defense_', '_hp_') : getStarterLoadout(normalizedClass).hpTrackId),
      speedTrackId: existing.speed_track_id || existing.speed_item_id || getStarterLoadout(normalizedClass).speedTrackId,
    };
    return buildLoadoutView(normalized, normalizedClass, trackLevels);
  }

  const starter = getStarterLoadout(normalizedClass);
  await env.DB.prepare(
    `INSERT INTO card_loadouts (address, token_id, power_track_id, hp_track_id, speed_track_id, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(address, token_id) DO NOTHING`
  ).bind(address, String(tokenId), starter.powerTrackId, starter.hpTrackId, starter.speedTrackId).run();

  return buildLoadoutView(starter, normalizedClass, trackLevels);
}

function buildEquipmentProgressPayload(address, cardClass, progressRow, trackLevels) {
  return {
    address,
    classKey: normalizeCardClass(cardClass),
    forgeShards: Number(progressRow?.forge_shards || 0),
    trackLevels,
  };
}

function buildResolvedBattlePayload(battle, address, myCard) {
  const isP1   = battle.player1 === address;
  const won    = battle.winner === address;
  const draw   = battle.winner === null;
  const winner = won ? 'p1' : draw ? 'draw' : 'p2';
  const mySnapshot = safeJsonParse(isP1 ? battle.p1_card : battle.p2_card, {});
  const oppSnapshot = safeJsonParse(isP1 ? battle.p2_card : battle.p1_card, {});

  let rounds = safeJsonParse(battle.rounds, []);
  if (!isP1) {
    rounds = rounds.map((round) => swapBattlePerspective(round));
  }

  return {
    status:   'matched',
    ticketId: isP1 ? battle.p1_ticket_id : battle.p2_ticket_id,
    battleId: battle.id,
    countdown: 5,
    battleDuration: rounds.length > 0 ? rounds[rounds.length - 1].round : 0,
    rounds,
    winner,
    won,
    opponent: {
      address: isP1 ? battle.player2 : battle.player1,
      card: buildEquipmentCardView(
        attachCompetitiveMeta(oppSnapshot),
        oppSnapshot.equipmentLoadout,
        oppSnapshot.equipmentLevels,
        oppSnapshot.element
      ),
    },
    card: buildEquipmentCardView(
      attachCompetitiveMeta(myCard, mySnapshot),
      mySnapshot.equipmentLoadout,
      mySnapshot.equipmentLevels,
      mySnapshot.element
    ) || null,
  };
}

function swapSide(value) {
  if (value === 'p1') return 'p2';
  if (value === 'p2') return 'p1';
  return value;
}

function cloneBattleSide(side) {
  return side && typeof side === 'object'
    ? {
      ...side,
      statuses: Array.isArray(side.statuses) ? [...side.statuses] : side.statuses,
    }
    : side;
}

function swapBattlePerspective(round) {
  if (!round || typeof round !== 'object') return round;

  const swapped = { ...round };

  if ('p1' in swapped || 'p2' in swapped) {
    swapped.p1 = round.p2;
    swapped.p2 = round.p1;
  }

  if (round.start && typeof round.start === 'object') {
    swapped.start = {
      p1: Array.isArray(round.start.p2) ? [...round.start.p2] : round.start.p2,
      p2: Array.isArray(round.start.p1) ? [...round.start.p1] : round.start.p1,
    };
  }

  if (round.end && typeof round.end === 'object') {
    swapped.end = {
      p1: cloneBattleSide(round.end.p2),
      p2: cloneBattleSide(round.end.p1),
    };
  }

  if (Array.isArray(round.actions)) {
    swapped.actions = round.actions.map((action) => ({
      ...action,
      actor: swapSide(action.actor),
      target: swapSide(action.target),
    }));
  }

  if ('leader' in swapped) {
    swapped.leader = swapSide(round.leader);
  }

  if ('result' in swapped) {
    swapped.result = swapSide(round.result);
  }

  return swapped;
}

async function findBattleByTicket(env, ticketId) {
  if (!ticketId) return null;

  return env.DB.prepare(
    `SELECT *
       FROM battles
      WHERE p1_ticket_id = ? OR p2_ticket_id = ?
      ORDER BY resolved_at DESC, created_at DESC
      LIMIT 1`
  ).bind(ticketId, ticketId).first();
}

async function ensureMatchmakingSchema(env) {
  if (!_matchmakingSchemaPromise) {
    _matchmakingSchemaPromise = (async () => {
      await env.DB.batch([
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS game_cards (
             address TEXT PRIMARY KEY,
             token_id TEXT NOT NULL,
             name TEXT,
             image TEXT,
             pwr INTEGER,
             def INTEGER,
             hp INTEGER,
             spd INTEGER,
             element TEXT,
             ability TEXT,
             rarity TEXT,
             traits_json TEXT,
             level INTEGER DEFAULT 1,
             xp INTEGER DEFAULT 0,
             wins INTEGER DEFAULT 0,
             losses INTEGER DEFAULT 0,
             competitive_rating REAL DEFAULT ${DEFAULT_COMPETITIVE_RATING},
             competitive_rd REAL DEFAULT ${DEFAULT_COMPETITIVE_RD},
             competitive_volatility REAL DEFAULT ${DEFAULT_COMPETITIVE_VOLATILITY},
             competitive_matches INTEGER DEFAULT 0,
             last_rated_at DATETIME,
             registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS battle_queue (
             address TEXT PRIMARY KEY,
             ticket_id TEXT UNIQUE,
             card_json TEXT NOT NULL,
             status TEXT DEFAULT 'searching',
             match_id TEXT,
             rating INTEGER DEFAULT 0,
             bucket_key INTEGER DEFAULT 0,
             queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             matched_at DATETIME,
             expires_at DATETIME,
             updated_at DATETIME
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS battles (
             id TEXT PRIMARY KEY,
             player1 TEXT NOT NULL,
             player2 TEXT NOT NULL,
             winner TEXT,
             p1_card TEXT,
             p2_card TEXT,
             rounds TEXT,
             status TEXT DEFAULT 'pending',
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             resolved_at DATETIME,
             p1_ticket_id TEXT,
             p2_ticket_id TEXT
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS profiles (
             address TEXT PRIMARY KEY,
             display_name TEXT,
             bio TEXT,
             avatar_url TEXT,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS player_progress (
             address TEXT PRIMARY KEY,
             forge_shards INTEGER DEFAULT 0,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS equipment_track_levels (
             address TEXT NOT NULL,
             class_key TEXT NOT NULL,
             track_id TEXT NOT NULL,
             current_level INTEGER DEFAULT 1,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             PRIMARY KEY (address, track_id)
           )`
        ),
        env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS card_loadouts (
             address TEXT NOT NULL,
             token_id TEXT NOT NULL,
             power_track_id TEXT,
             hp_track_id TEXT,
             speed_track_id TEXT,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             PRIMARY KEY (address, token_id)
           )`
        ),
      ]);

      const [queueInfo, battleInfo, cardInfo] = await env.DB.batch([
        env.DB.prepare('PRAGMA table_info(battle_queue)'),
        env.DB.prepare('PRAGMA table_info(battles)'),
        env.DB.prepare('PRAGMA table_info(game_cards)'),
      ]);

      const queueColumns  = new Set((queueInfo.results || []).map((row) => row.name));
      const battleColumns = new Set((battleInfo.results || []).map((row) => row.name));
      const cardColumns   = new Set((cardInfo.results || []).map((row) => row.name));
      const migrations    = [];

      if (!queueColumns.has('ticket_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN ticket_id TEXT'));
      }
      if (!queueColumns.has('status')) {
        migrations.push(env.DB.prepare("ALTER TABLE battle_queue ADD COLUMN status TEXT"));
      }
      if (!queueColumns.has('match_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN match_id TEXT'));
      }
      if (!queueColumns.has('matched_at')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN matched_at DATETIME'));
      }
      if (!queueColumns.has('expires_at')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN expires_at DATETIME'));
      }
      if (!queueColumns.has('updated_at')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN updated_at DATETIME'));
      }
      if (!queueColumns.has('rating')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN rating INTEGER'));
      }
      if (!queueColumns.has('bucket_key')) {
        migrations.push(env.DB.prepare('ALTER TABLE battle_queue ADD COLUMN bucket_key INTEGER'));
      }
      if (!battleColumns.has('p1_ticket_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE battles ADD COLUMN p1_ticket_id TEXT'));
      }
      if (!battleColumns.has('p2_ticket_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE battles ADD COLUMN p2_ticket_id TEXT'));
      }
      if (!cardColumns.has('competitive_rating')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN competitive_rating REAL'));
      }
      if (!cardColumns.has('pwr')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN pwr INTEGER'));
      }
      if (!cardColumns.has('def')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN def INTEGER'));
      }
      if (!cardColumns.has('hp')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN hp INTEGER'));
      }
      if (!cardColumns.has('spd')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN spd INTEGER'));
      }
      if (!cardColumns.has('element')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN element TEXT'));
      }
      if (!cardColumns.has('ability')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN ability TEXT'));
      }
      if (!cardColumns.has('rarity')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN rarity TEXT'));
      }
      if (!cardColumns.has('traits_json')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN traits_json TEXT'));
      }
      if (!cardColumns.has('competitive_rd')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN competitive_rd REAL'));
      }
      if (!cardColumns.has('competitive_volatility')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN competitive_volatility REAL'));
      }
      if (!cardColumns.has('competitive_matches')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN competitive_matches INTEGER'));
      }
      if (!cardColumns.has('last_rated_at')) {
        migrations.push(env.DB.prepare('ALTER TABLE game_cards ADD COLUMN last_rated_at DATETIME'));
      }
      const [loadoutInfo, progressTrackInfo] = await env.DB.batch([
        env.DB.prepare('PRAGMA table_info(card_loadouts)'),
        env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'equipment_track_levels'"),
      ]);
      const loadoutColumns = new Set((loadoutInfo.results || []).map((row) => row.name));
      if (!loadoutColumns.has('power_track_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE card_loadouts ADD COLUMN power_track_id TEXT'));
      }
      if (!loadoutColumns.has('hp_track_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE card_loadouts ADD COLUMN hp_track_id TEXT'));
      }
      if (!loadoutColumns.has('speed_track_id')) {
        migrations.push(env.DB.prepare('ALTER TABLE card_loadouts ADD COLUMN speed_track_id TEXT'));
      }
      if (!progressTrackInfo.results?.length) {
        migrations.push(env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS equipment_track_levels (
             address TEXT NOT NULL,
             class_key TEXT NOT NULL,
             track_id TEXT NOT NULL,
             current_level INTEGER DEFAULT 1,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             PRIMARY KEY (address, track_id)
           )`
        ));
      }

      if (migrations.length) {
        await env.DB.batch(migrations);
      }

      await env.DB.batch([
        env.DB.prepare(
          `UPDATE battle_queue
              SET ticket_id  = COALESCE(ticket_id, lower(hex(randomblob(16)))),
                  status     = COALESCE(status, 'searching'),
                  expires_at = COALESCE(expires_at, datetime(COALESCE(queued_at, CURRENT_TIMESTAMP), '+${QUEUE_TICKET_TTL_SECONDS} seconds')),
                  updated_at = COALESCE(updated_at, COALESCE(queued_at, CURRENT_TIMESTAMP)),
                  rating     = COALESCE(rating, 0),
                  bucket_key = COALESCE(bucket_key, 0)
            WHERE ticket_id IS NULL
               OR status IS NULL
               OR expires_at IS NULL
               OR updated_at IS NULL
               OR rating IS NULL
               OR bucket_key IS NULL`
        ),
        env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_queue_ticket_id ON battle_queue(ticket_id)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battle_queue_status_queued_at ON battle_queue(status, queued_at)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battle_queue_status_rating ON battle_queue(status, rating, queued_at)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battle_queue_bucket_key ON battle_queue(bucket_key, queued_at)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battle_queue_match_id ON battle_queue(match_id)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battles_p1_ticket_id ON battles(p1_ticket_id)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_battles_p2_ticket_id ON battles(p2_ticket_id)'),
        env.DB.prepare(
          `UPDATE game_cards
              SET hp = COALESCE(hp, 180 + (COALESCE(def, 50) * 3) + (COALESCE(level, 1) * 10))
            WHERE hp IS NULL`
        ),
        ...(loadoutColumns.has('power_item_id') || loadoutColumns.has('defense_item_id') || loadoutColumns.has('speed_item_id')
          ? [
            env.DB.prepare(
              `UPDATE card_loadouts
                  SET power_track_id = COALESCE(power_track_id, power_item_id),
                      hp_track_id = COALESCE(hp_track_id, REPLACE(defense_item_id, '_defense_', '_hp_')),
                      speed_track_id = COALESCE(speed_track_id, speed_item_id)
                WHERE power_track_id IS NULL
                   OR hp_track_id IS NULL
                   OR speed_track_id IS NULL`
            ),
          ]
          : []),
        env.DB.prepare(
          `UPDATE game_cards
              SET competitive_rating = COALESCE(competitive_rating, ${DEFAULT_COMPETITIVE_RATING}),
                  competitive_rd = COALESCE(competitive_rd, ${DEFAULT_COMPETITIVE_RD}),
                  competitive_volatility = COALESCE(competitive_volatility, ${DEFAULT_COMPETITIVE_VOLATILITY}),
                  competitive_matches = COALESCE(competitive_matches, 0)
            WHERE competitive_rating IS NULL
               OR competitive_rd IS NULL
               OR competitive_volatility IS NULL
               OR competitive_matches IS NULL`
        ),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_game_cards_competitive_rating ON game_cards(competitive_rating DESC, wins DESC)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_equipment_track_levels_class_key ON equipment_track_levels(address, class_key)'),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_card_loadouts_address ON card_loadouts(address, token_id)'),
      ]);
    })().catch((err) => {
      _matchmakingSchemaPromise = null;
      throw err;
    });
  }

  return _matchmakingSchemaPromise;
}

async function cleanupQueue(env) {
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM battle_queue WHERE status = 'searching' AND expires_at < CURRENT_TIMESTAMP"
    ),
    env.DB.prepare(
      `UPDATE battle_queue
          SET status = 'searching',
              match_id = NULL,
              matched_at = NULL,
              expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
              updated_at = CURRENT_TIMESTAMP
        WHERE status = 'matching' AND expires_at < CURRENT_TIMESTAMP`
    ),
    env.DB.prepare(
      `DELETE FROM battle_queue
        WHERE status = 'matched'
          AND matched_at < datetime('now', '-${MATCHED_TICKET_TTL_SECONDS} seconds')`
    ),
  ]);
}

async function loadQueueRow(env, address, ticketId = null) {
  if (ticketId) {
    return env.DB.prepare(
      'SELECT * FROM battle_queue WHERE address = ? AND ticket_id = ?'
    ).bind(address, ticketId).first();
  }

  return env.DB.prepare(
    'SELECT * FROM battle_queue WHERE address = ? ORDER BY updated_at DESC LIMIT 1'
  ).bind(address).first();
}

async function loadQueueBattlePayload(env, address, queueRow) {
  if (!queueRow?.match_id) return null;

  const battle = await env.DB.prepare(
    'SELECT * FROM battles WHERE id = ? LIMIT 1'
  ).bind(queueRow.match_id).first();

  if (!battle) return null;

  const myCard = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ?'
  ).bind(address).first();
  const progress = await getPlayerProgress(env, address);

  return buildResolvedBattlePayload(
    battle,
    address,
    myCard ? { ...myCard, forge_shards: Number(progress?.forge_shards || 0) } : myCard
  );
}

async function resolveQueuedBattle(env, selfQueueRow, opponentQueueRow, battleId) {
  const selfCard = safeJsonParse(selfQueueRow.card_json, {});
  const oppCard  = safeJsonParse(opponentQueueRow.card_json, {});
  const selfAddr = selfQueueRow.address;
  const oppAddr  = opponentQueueRow.address;

  const p1Row = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(selfAddr).first();
  const p2Row = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(oppAddr).first();
  const p1ProgressRow = await getPlayerProgress(env, selfAddr);
  const p2ProgressRow = await getPlayerProgress(env, oppAddr);

  const p1Stats = buildCardStats(p1Row, selfCard);
  const p2Stats = buildCardStats(p2Row, oppCard);
  const seed    = battleSeed(String(selfCard.tokenId), String(oppCard.tokenId));
  // Queue snapshots are built server-side from DB data + equipment loadout (see handleQueue).
  // Client stat overrides are stripped at queue entry, so snapshots are authoritative.
  const result  = resolveBattle(selfCard, oppCard, seed);
  const winner  = result.winner === 'p1' ? selfAddr : result.winner === 'p2' ? oppAddr : null;

  const p1XP       = calcXP(p1Stats.rarity, p2Stats.rarity, result.winner === 'p1', result.winner === 'draw');
  const p2XP       = calcXP(p2Stats.rarity, p1Stats.rarity, result.winner === 'p2', result.winner === 'draw');
  const p1Forge    = getForgeShardReward(result.winner === 'p1' ? 'win' : result.winner === 'draw' ? 'draw' : 'loss', Number(p1Row?.competitive_rating || DEFAULT_COMPETITIVE_RATING), Number(p2Row?.competitive_rating || DEFAULT_COMPETITIVE_RATING));
  const p2Forge    = getForgeShardReward(result.winner === 'p2' ? 'win' : result.winner === 'draw' ? 'draw' : 'loss', Number(p2Row?.competitive_rating || DEFAULT_COMPETITIVE_RATING), Number(p1Row?.competitive_rating || DEFAULT_COMPETITIVE_RATING));
  const p1Progress = applyBattleProgress(p1Row, p1XP, result.winner === 'p1' ? 'win' : result.winner === 'p2' ? 'loss' : 'draw');
  const p2Progress = applyBattleProgress(p2Row, p2XP, result.winner === 'p2' ? 'win' : result.winner === 'p1' ? 'loss' : 'draw');
  const p1Competitive = updateCompetitiveRating(
    getCompetitiveState(p1Row, selfCard),
    getCompetitiveState(p2Row, oppCard),
    result.winner === 'p1' ? 1 : result.winner === 'draw' ? 0.5 : 0
  );
  const p2Competitive = updateCompetitiveRating(
    getCompetitiveState(p2Row, oppCard),
    getCompetitiveState(p1Row, selfCard),
    result.winner === 'p2' ? 1 : result.winner === 'draw' ? 0.5 : 0
  );
  const writes     = [
    env.DB.prepare(
      `INSERT INTO battles (
         id, player1, player2, winner, p1_card, p2_card, rounds, status, resolved_at, p1_ticket_id, p2_ticket_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`
    ).bind(
      battleId,
      selfAddr,
      oppAddr,
      winner,
      JSON.stringify(selfCard),
      JSON.stringify(oppCard),
      JSON.stringify(result.rounds),
      'resolved',
      selfQueueRow.ticket_id,
      opponentQueueRow.ticket_id
    ),
  ];

  if (p1Row) {
    writes.push(
      env.DB.prepare(
        `UPDATE game_cards
            SET level = ?, xp = ?, wins = ?, losses = ?,
                competitive_rating = ?, competitive_rd = ?, competitive_volatility = ?, competitive_matches = ?, last_rated_at = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?`
      ).bind(
        p1Progress.level,
        p1Progress.xp,
        p1Progress.wins,
        p1Progress.losses,
        p1Competitive.rating,
        p1Competitive.rd,
        p1Competitive.volatility,
        p1Competitive.matches,
        p1Competitive.lastRatedAt,
        selfAddr
      )
    );
  }

  if (p2Row) {
    writes.push(
      env.DB.prepare(
        `UPDATE game_cards
            SET level = ?, xp = ?, wins = ?, losses = ?,
                competitive_rating = ?, competitive_rd = ?, competitive_volatility = ?, competitive_matches = ?, last_rated_at = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?`
      ).bind(
        p2Progress.level,
        p2Progress.xp,
        p2Progress.wins,
        p2Progress.losses,
        p2Competitive.rating,
        p2Competitive.rd,
        p2Competitive.volatility,
        p2Competitive.matches,
        p2Competitive.lastRatedAt,
        oppAddr
      )
    );
  }

  writes.push(
    env.DB.prepare(
      `INSERT INTO player_progress (address, forge_shards, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(address) DO UPDATE SET
         forge_shards = player_progress.forge_shards + excluded.forge_shards,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(selfAddr, p1Forge)
  );
  writes.push(
    env.DB.prepare(
      `INSERT INTO player_progress (address, forge_shards, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(address) DO UPDATE SET
         forge_shards = player_progress.forge_shards + excluded.forge_shards,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(oppAddr, p2Forge)
  );

  await env.DB.batch(writes);

  const myCard = attachCardLoadout(
    p1Row
      ? { ...p1Row, ...p1Progress, ...p1Competitive, forge_shards: Number(p1ProgressRow?.forge_shards || 0) + p1Forge }
      : { ...selfCard, ...p1Stats, ...p1Progress, ...p1Competitive, forge_shards: Number(p1ProgressRow?.forge_shards || 0) + p1Forge },
    selfCard.equipmentLoadout,
    selfCard.equipmentLevels,
    selfCard.element
  );
  const oppPayload = attachCardLoadout(
    p2Row
      ? { ...p2Row, ...p2Progress, ...p2Competitive, forge_shards: Number(p2ProgressRow?.forge_shards || 0) + p2Forge }
      : { ...oppCard, ...p2Stats, ...p2Progress, ...p2Competitive, forge_shards: Number(p2ProgressRow?.forge_shards || 0) + p2Forge },
    oppCard.equipmentLoadout,
    oppCard.equipmentLevels,
    oppCard.element
  );

  return {
    status:   'matched',
    ticketId: selfQueueRow.ticket_id,
    battleId,
    rounds:   result.rounds,
    winner:   result.winner,
    won:      result.winner === 'p1',
    opponent: { address: oppAddr, card: oppPayload },
    card:     myCard,
  };
}

async function attemptMatchForTicket(env, address, ticketId) {
  const queueRow = await loadQueueRow(env, address, ticketId);
  if (!queueRow || queueRow.status !== 'searching') return null;

  const battleId = crypto.randomUUID();
  const selfRow = await env.DB.prepare(
    `UPDATE battle_queue
        SET status = 'matching',
            match_id = ?,
            matched_at = NULL,
            expires_at = datetime('now', '+${MATCH_ASSEMBLY_TTL_SECONDS} seconds'),
            updated_at = CURRENT_TIMESTAMP
      WHERE address = ?
        AND ticket_id = ?
        AND status = 'searching'
      RETURNING address, ticket_id, card_json, rating, bucket_key`
  ).bind(battleId, address, ticketId).first();

  if (!selfRow) return null;

  const opponent = await env.DB.prepare(
    `UPDATE battle_queue
        SET status = 'matched',
            match_id = ?,
            matched_at = CURRENT_TIMESTAMP,
            expires_at = datetime('now', '+${MATCHED_TICKET_TTL_SECONDS} seconds'),
            updated_at = CURRENT_TIMESTAMP
      WHERE address = (
        SELECT address
          FROM battle_queue
         WHERE address != ?
           AND status = 'searching'
           AND expires_at > CURRENT_TIMESTAMP
           AND ABS(rating - ?) <= CASE
             WHEN (strftime('%s', 'now') - strftime('%s', queued_at)) >= 60 THEN 99999
             WHEN (strftime('%s', 'now') - strftime('%s', queued_at)) >= 45 THEN 500
             WHEN (strftime('%s', 'now') - strftime('%s', queued_at)) >= 30 THEN 300
             WHEN (strftime('%s', 'now') - strftime('%s', queued_at)) >= 15 THEN 180
             ELSE 100
           END
         ORDER BY ABS(rating - ?), ABS(bucket_key - ?), queued_at ASC
         LIMIT 1
      )
      RETURNING address, ticket_id, card_json, rating, bucket_key`
  ).bind(battleId, address, selfRow.rating, selfRow.rating, selfRow.bucket_key).first();

  if (!opponent) {
    await env.DB.prepare(
      `UPDATE battle_queue
          SET status = 'searching',
              match_id = NULL,
              matched_at = NULL,
              expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
              updated_at = CURRENT_TIMESTAMP
        WHERE address = ?
          AND ticket_id = ?
          AND status = 'matching'
          AND match_id = ?`
    ).bind(address, ticketId, battleId).run();

    return null;
  }

  const finalizedSelf = await env.DB.prepare(
    `UPDATE battle_queue
        SET status = 'matched',
            matched_at = CURRENT_TIMESTAMP,
            expires_at = datetime('now', '+${MATCHED_TICKET_TTL_SECONDS} seconds'),
            updated_at = CURRENT_TIMESTAMP
      WHERE address = ?
        AND ticket_id = ?
        AND status = 'matching'
        AND match_id = ?
      RETURNING address, ticket_id, card_json, rating, bucket_key`
  ).bind(address, ticketId, battleId).first();

  if (!finalizedSelf) {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE battle_queue
            SET status = 'searching',
                match_id = NULL,
                matched_at = NULL,
                expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?
            AND ticket_id = ?
            AND match_id = ?`
      ).bind(address, ticketId, battleId),
      env.DB.prepare(
        `UPDATE battle_queue
            SET status = 'searching',
                match_id = NULL,
                matched_at = NULL,
                expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?
            AND ticket_id = ?
            AND match_id = ?`
      ).bind(opponent.address, opponent.ticket_id, battleId),
    ]);

    return null;
  }

  try {
    return await resolveQueuedBattle(env, finalizedSelf, opponent, battleId);
  } catch (error) {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE battle_queue
            SET status = 'searching',
                match_id = NULL,
                matched_at = NULL,
                expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?
            AND ticket_id = ?
            AND match_id = ?`
      ).bind(address, ticketId, battleId),
      env.DB.prepare(
        `UPDATE battle_queue
            SET status = 'searching',
                match_id = NULL,
                matched_at = NULL,
                expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
                updated_at = CURRENT_TIMESTAMP
          WHERE address = ?
            AND ticket_id = ?
            AND match_id = ?`
      ).bind(opponent.address, opponent.ticket_id, battleId),
    ]).catch(() => {});

    throw error;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    return withRequest(request, async () => {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      if (path.startsWith('/api/game') || path.startsWith('/api/profile')) {
        await ensureMatchmakingSchema(env);
      }
      // ── Wallets ──────────────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/wallets') {
        return handleSubmitWallet(request, env);
      }
      if (method === 'GET' && path === '/api/wallets') {
        const denied = requireAdmin(request, env);
        if (denied) return denied;
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM wallets ORDER BY created_at ASC'
        ).all();
        return json({ count: rows.results.length, wallets: rows.results });
      }
      if (method === 'GET' && path === '/api/wallets/csv') {
        const denied = requireAdmin(request, env);
        if (denied) return denied;
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM wallets ORDER BY created_at ASC'
        ).all();
        let csv = 'address,handle,created_at\n';
        for (const r of rows.results) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        return csvResponse(csv, 'zenkai_wallets.csv');
      }

      // ── Allowlist ─────────────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/allowlist') {
        return handleAllowlist(request, env);
      }
      if (method === 'GET' && path === '/api/allowlist/fcfs/csv') {
        const denied = requireAdmin(request, env);
        if (denied) return denied;
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM allowlist_fcfs ORDER BY created_at ASC'
        ).all();
        let csv = 'address,handle,created_at\n';
        for (const r of rows.results) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        return csvResponse(csv, 'zenkai_fcfs.csv');
      }
      if (method === 'GET' && path === '/api/allowlist/gtd/csv') {
        const denied = requireAdmin(request, env);
        if (denied) return denied;
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM allowlist_gtd ORDER BY created_at ASC'
        ).all();
        let csv = 'address,handle,created_at\n';
        for (const r of rows.results) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        return csvResponse(csv, 'zenkai_gtd.csv');
      }

      // ── Game: Register card ───────────────────────────────────────────────
      if (method === 'POST' && path === '/api/game/register') {
        return handleGameRegister(request, env);
      }

      // ── Game: Get card ────────────────────────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/game/card/')) {
        const address = path.split('/').pop().toLowerCase();
        const row = await env.DB.prepare(
          'SELECT * FROM game_cards WHERE address = ?'
        ).bind(address).first();
        if (!row) return json({ error: 'not_found' }, 404);
        const loadout = await getCardLoadoutRecord(env, address, row.token_id, row.element);
        const trackLevels = await getTrackLevelsForClass(env, address, row.element);
        return json({ card: attachCardLoadout(row, loadout, trackLevels, row.element) });
      }

      // ── Game: Enter queue ─────────────────────────────────────────────────
      if (method === 'GET' && path === '/api/game/equipment/catalog') {
        const classKey = url.searchParams.get('class') || 'VOID';
        return handleEquipmentCatalog(classKey);
      }
      if (method === 'GET' && path.startsWith('/api/game/equipment/progress/')) {
        const address = path.split('/').pop().toLowerCase();
        return handleEquipmentProgress(address, env);
      }
      if (method === 'POST' && path === '/api/game/equipment/purchase') {
        return handleEquipmentPurchase(request, env);
      }
      if (method === 'POST' && path === '/api/game/equipment/unlock') {
        return handleEquipmentPurchase(request, env);
      }
      if (method === 'POST' && path === '/api/game/equipment/loadout') {
        return handleEquipmentLoadoutUpdate(request, env);
      }
      if (method === 'GET' && /^\/api\/game\/equipment\/loadout\/[^/]+\/[^/]+$/.test(path)) {
        const parts = path.split('/');
        const address = parts[5].toLowerCase();
        const tokenId = parts[6];
        return handleEquipmentLoadoutGet(address, tokenId, env);
      }

      if (method === 'POST' && path === '/api/game/queue') {
        return handleQueue(request, env);
      }
      if (method === 'POST' && path === '/api/game/queue/cancel') {
        return handleQueueCancel(request, env);
      }

      // ── Game: Queue status ────────────────────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/game/queue/')) {
        const address  = path.split('/').pop().toLowerCase();
        const ticketId = url.searchParams.get('ticketId') || null;
        return handleQueueStatus(address, ticketId, env);
      }

      // ── Game: Leaderboard ─────────────────────────────────────────────────
      if (method === 'GET' && path === '/api/game/leaderboard') {
        const rows = await env.DB.prepare(
          `SELECT address, level, xp, wins, losses, hp, competitive_rating, competitive_matches
             FROM game_cards
            ORDER BY wins DESC, losses ASC, level DESC, address ASC
            LIMIT 50`
        ).all();
        return json({
          leaderboard: rows.results.map((row) => ({
            ...row,
            competitive_rating: Math.round(Number(row.competitive_rating ?? DEFAULT_COMPETITIVE_RATING)),
            competitive_tier: competitiveTierFromRating(Number(row.competitive_rating ?? DEFAULT_COMPETITIVE_RATING)),
          })),
        });
      }

      // ── Profile: Get ──────────────────────────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/profile/')) {
        const address = path.split('/').pop().toLowerCase();
        if (!isValidEthAddress(address)) return json({ error: 'invalid' }, 400);
        const profile = await env.DB.prepare(
          'SELECT * FROM profiles WHERE address = ?'
        ).bind(address).first();
        const card = await env.DB.prepare(
          `SELECT token_id, level, xp, wins, losses, hp, name, image, element, rarity,
                  competitive_rating, competitive_rd, competitive_volatility, competitive_matches, last_rated_at
             FROM game_cards
            WHERE address = ?`
        ).bind(address).first();
        const progress = await getPlayerProgress(env, address);
        const loadout = card ? await getCardLoadoutRecord(env, address, card.token_id || card.tokenId || '', card.element) : null;
        const trackLevels = card ? await getTrackLevelsForClass(env, address, card.element) : null;
        return json({
          profile: profile || null,
          card: card ? attachCardLoadout(card, loadout, trackLevels, card.element) : null,
          forgeShards: Number(progress?.forge_shards || 0),
        });
      }

      // ── Profile: Upsert ───────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/profile') {
        return handleProfileUpsert(request, env);
      }

      return json({ error: 'not_found' }, 404);

    } catch (err) {
      console.error('[zenkai]', err?.message || err);
      return json({ error: 'server_error' }, 500);
    }
    }); // withRequest
  },
};

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleSubmitWallet(request, env) {
  const { address, handle, quoteUrl } = await request.json();

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }

  const addr        = address.toLowerCase();
  const cleanHandle = (handle || '').trim().slice(0, 100) || null;
  const cleanUrl    = sanitizeUrl((quoteUrl || '').trim().slice(0, 500));

  await env.DB.prepare(
    'INSERT INTO submissions (address, handle, quote_url) VALUES (?, ?, ?)'
  ).bind(addr, cleanHandle, cleanUrl).run();

  try {
    await env.DB.prepare(
      'INSERT INTO wallets (address, handle) VALUES (?, ?)'
    ).bind(addr, cleanHandle).run();
  } catch {
    // unique constraint — already registered, treat as success
  }

  return json({ success: true, message: 'Wallet added' });
}

async function handleAllowlist(request, env) {
  const { address, handle, tier } = await request.json();
  const ip        = getClientIp(request);
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 500);

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }
  if (!['fcfs'].includes(tier)) {
    return json({ error: 'invalid', message: 'Submissions are currently unavailable.' }, 400);
  }

  const addr        = address.toLowerCase();
  const cleanHandle = (handle || '').trim().slice(0, 100) || null;

  try {
    await env.DB.prepare(
      'INSERT INTO allowlist_fcfs (address, handle, ip, user_agent) VALUES (?, ?, ?, ?)'
    ).bind(addr, cleanHandle, ip, userAgent).run();
  } catch {
    // unique constraint — already registered
  }

  return json({ success: true, message: 'Added to allowlist' });
}

async function handleGameRegister(request, env) {
  await ensureMatchmakingSchema(env);

  const body = await request.json();
  const { address, tokenId, name, image, pwr, def, hp, spd, element, ability, rarity, attributes } = body;

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }

  const addr       = address.toLowerCase();
  const tid        = String(tokenId).slice(0, 78).replace(/[^0-9a-zA-Z_-]/g, '');
  if (!tid) return json({ error: 'invalid', message: 'Invalid tokenId' }, 400);
  const cleanName  = (name || '').slice(0, 200) || null;
  const cleanImage = sanitizeUrl((image || '').slice(0, 500));
  const traitsJson = attributes ? JSON.stringify(attributes).slice(0, 5000) : null;

  // Validate and clamp stat values to prevent arbitrary stat injection
  const VALID_ELEMENTS = ['FIRE', 'WATER', 'EARTH', 'SHADOW', 'WIND', 'VOID'];
  const VALID_RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  const clampStat = (v, min, max) => v != null ? Math.min(max, Math.max(min, Math.round(Number(v) || 0))) : null;
  const safePwr = clampStat(pwr, 1, 100);
  const safeDef = clampStat(def, 1, 100);
  const safeSpd = clampStat(spd, 1, 100);
  const safeElement = VALID_ELEMENTS.includes(String(element).toUpperCase()) ? String(element).toUpperCase() : null;
  const safeRarity = VALID_RARITIES.includes(String(rarity).toUpperCase()) ? String(rarity).toUpperCase() : 'COMMON';
  const safeAbility = ability ? String(ability).slice(0, 50) : null;

  const existing = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ?'
  ).bind(addr).first();
  const seedHp = clampStat(hp, 100, 1000) ?? (180 + ((Number(safeDef) || 50) * 3) + (((existing?.level || 1)) * 10));
  const seedCard = { tokenId: tid, pwr: safePwr, def: safeDef, hp: seedHp, spd: safeSpd, element: safeElement, ability: safeAbility, rarity: safeRarity, level: existing?.level || 1 };
  const seededState = getCompetitiveState(existing, seedCard);

  if (existing) {
    await env.DB.prepare(
      `UPDATE game_cards SET token_id = ?, name = ?, image = ?,
       pwr = COALESCE(?, pwr), def = COALESCE(?, def), hp = ?, spd = COALESCE(?, spd),
       element = COALESCE(?, element), ability = COALESCE(?, ability), rarity = COALESCE(?, rarity), traits_json = ?,
       competitive_rating = COALESCE(competitive_rating, ?),
       competitive_rd = COALESCE(competitive_rd, ?),
       competitive_volatility = COALESCE(competitive_volatility, ?),
       competitive_matches = COALESCE(competitive_matches, 0),
       updated_at = CURRENT_TIMESTAMP WHERE address = ?`
    ).bind(
      tid,
      cleanName,
      cleanImage,
      safePwr,
      safeDef,
      seedHp,
      safeSpd,
      safeElement,
      safeAbility,
      safeRarity,
      traitsJson,
      seededState.rating,
      seededState.rd,
      seededState.volatility,
      addr
    ).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO game_cards (
         address, token_id, name, image, pwr, def, hp, spd, element, ability, rarity, traits_json,
         competitive_rating, competitive_rd, competitive_volatility, competitive_matches
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      addr,
      tid,
      cleanName,
      cleanImage,
      safePwr,
      safeDef,
      seedHp,
      safeSpd,
      safeElement,
      safeAbility,
      safeRarity,
      traitsJson,
      seededState.rating,
      seededState.rd,
      seededState.volatility,
      seededState.matches
    ).run();
  }

  const card = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(addr).first();
  const progress = await getPlayerProgress(env, addr);
  const trackLevels = await getTrackLevelsForClass(env, addr, card?.element || seedCard.element);
  const loadout = await getCardLoadoutRecord(env, addr, tid, card?.element || seedCard.element);
  return json({
    success: true,
    card: {
      ...attachCardLoadout(card, loadout, trackLevels, card?.element || seedCard.element),
      forge_shards: Number(progress?.forge_shards || 0),
    },
  });
}

function handleEquipmentCatalog(cardClass) {
  const normalized = normalizeCardClass(cardClass);
  return json({
    classKey: normalized,
    starterLoadout: getStarterLoadout(normalized),
    tracks: getEquipmentCatalogByClass(normalized),
  });
}

async function handleEquipmentProgress(address, env) {
  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();
  const progress = await getPlayerProgress(env, addr);
  const trackLevelsByClass = Object.fromEntries(
    await Promise.all(CARD_CLASSES.map(async (cardClass) => [cardClass, await getTrackLevelsForClass(env, addr, cardClass)]))
  );

  return json({
    progress: {
      address: addr,
      forgeShards: Number(progress?.forge_shards || 0),
      trackLevelsByClass,
    },
  });
}

async function handleEquipmentPurchase(request, env) {
  return json({ error: 'disabled', message: 'Equipment levels advance automatically with your card level' }, 400);
}

async function handleEquipmentLoadoutGet(address, tokenId, env) {
  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();
  const cardRow = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ? AND token_id = ?'
  ).bind(addr, String(tokenId)).first();
  if (!cardRow) return json({ error: 'not_found' }, 404);

  await getPlayerProgress(env, addr);
  const loadout = await getCardLoadoutRecord(env, addr, tokenId, cardRow.element);
  const trackLevels = await getTrackLevelsForClass(env, addr, cardRow.element);
  return json({
    loadout,
    card: buildEquipmentCardView(attachCompetitiveMeta(cardRow), loadout, trackLevels, cardRow.element),
  });
}

async function handleEquipmentLoadoutUpdate(request, env) {
  const body = await request.json();
  const { address, tokenId, powerTrackId, hpTrackId, speedTrackId } = body;

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();
  if (await hasActiveQueueLock(env, addr)) {
    return json({ error: 'locked', message: 'Cannot change loadout while matchmaking is active' }, 409);
  }

  const cardRow = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ? AND token_id = ?'
  ).bind(addr, String(tokenId)).first();
  if (!cardRow) return json({ error: 'not_found' }, 404);

  const cardClass = normalizeCardClass(cardRow.element);
  const trackLevels = await getTrackLevelsForClass(env, addr, cardClass);
  const requested = { powerTrackId, hpTrackId, speedTrackId };
  const loadout = buildLoadoutView(requested, cardClass, trackLevels);

  await env.DB.prepare(
    `INSERT INTO card_loadouts (address, token_id, power_track_id, hp_track_id, speed_track_id, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(address, token_id) DO UPDATE SET
       power_track_id = excluded.power_track_id,
       hp_track_id = excluded.hp_track_id,
       speed_track_id = excluded.speed_track_id,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(addr, String(tokenId), loadout.powerTrackId, loadout.hpTrackId, loadout.speedTrackId).run();

  return json({
    success: true,
    loadout,
    card: buildEquipmentCardView(attachCompetitiveMeta(cardRow), loadout, trackLevels, cardRow.element),
  });
}

async function legacyHandleQueue(request, env) {
  const { address, card } = await request.json();

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();

  // Clean up stale queue entries (older than 120s)
  await env.DB.prepare(
    "DELETE FROM battle_queue WHERE queued_at < datetime('now', '-120 seconds')"
  ).run();

  // Check for a waiting opponent (not yourself)
  const opponent = await env.DB.prepare(
    'SELECT * FROM battle_queue WHERE address != ? ORDER BY queued_at ASC LIMIT 1'
  ).bind(addr).first();

  if (opponent) {
    // Pair found — resolve battle using stored stats
    const p1Card = card;
    const p2Card = JSON.parse(opponent.card_json);

    // Look up stored stats from game_cards, fall back to hash derivation
    const p1Row = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(addr).first();
    const p2Row = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(opponent.address).first();

    const p1Stats = p1Row && p1Row.pwr != null
      ? { pwr: p1Row.pwr, def: p1Row.def, spd: p1Row.spd, element: p1Row.element, ability: p1Row.ability, rarity: p1Row.rarity, level: p1Row.level || 1 }
      : { ...deriveStatsFromHash(p1Card.tokenId), level: p1Row?.level || 1 };

    const p2Stats = p2Row && p2Row.pwr != null
      ? { pwr: p2Row.pwr, def: p2Row.def, spd: p2Row.spd, element: p2Row.element, ability: p2Row.ability, rarity: p2Row.rarity, level: p2Row.level || 1 }
      : { ...deriveStatsFromHash(p2Card.tokenId), level: p2Row?.level || 1 };

    const seed   = battleSeed(p1Card.tokenId, p2Card.tokenId);
    const result = resolveBattle(p1Stats, p2Stats, seed);
    const battleId = crypto.randomUUID();
    const winner   = result.winner === 'p1' ? addr : result.winner === 'p2' ? opponent.address : null;

    await env.DB.prepare(
      'INSERT INTO battles (id, player1, player2, winner, p1_card, p2_card, rounds, status, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(
      battleId, addr, opponent.address, winner,
      JSON.stringify(p1Card), JSON.stringify(p2Card),
      JSON.stringify(result.rounds), 'resolved'
    ).run();

    // XP calculation using rarity
    const p1XP = calcXP(p1Stats.rarity, p2Stats.rarity, result.winner === 'p1', result.winner === 'draw');
    const p2XP = calcXP(p2Stats.rarity, p1Stats.rarity, result.winner === 'p2', result.winner === 'draw');

    // Update records
    if (result.winner === 'p1') {
      await env.DB.prepare('UPDATE game_cards SET wins = wins + 1, xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p1XP, addr).run();
      await env.DB.prepare('UPDATE game_cards SET losses = losses + 1, xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p2XP, opponent.address).run();
    } else if (result.winner === 'p2') {
      await env.DB.prepare('UPDATE game_cards SET losses = losses + 1, xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p1XP, addr).run();
      await env.DB.prepare('UPDATE game_cards SET wins = wins + 1, xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p2XP, opponent.address).run();
    } else {
      await env.DB.prepare('UPDATE game_cards SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p1XP, addr).run();
      await env.DB.prepare('UPDATE game_cards SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?').bind(p2XP, opponent.address).run();
    }

    // Level up check
    for (const a of [addr, opponent.address]) {
      const gc = await env.DB.prepare('SELECT level, xp FROM game_cards WHERE address = ?').bind(a).first();
      if (gc) {
        const xpNext = gc.level * 100;
        if (gc.xp >= xpNext) {
          await env.DB.prepare(
            'UPDATE game_cards SET level = level + 1, xp = xp - ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?'
          ).bind(xpNext, a).run();
        }
      }
    }

    // Remove opponent from queue
    await env.DB.prepare('DELETE FROM battle_queue WHERE address = ?').bind(opponent.address).run();

    const myCard = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(addr).first();

    return json({
      status:   'matched',
      battleId,
      rounds:   result.rounds,
      winner:   result.winner,         // 'p1'|'p2'|'draw'
      won:      result.winner === 'p1',
      opponent: { address: opponent.address, card: p2Card },
      card:     myCard,
    });
  }

  // No opponent — add to queue
  await env.DB.prepare(
    'INSERT INTO battle_queue (address, card_json) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET card_json = excluded.card_json, queued_at = CURRENT_TIMESTAMP'
  ).bind(addr, JSON.stringify(card)).run();

  return json({ status: 'waiting' });
}

async function legacyHandleQueueStatus(address, env) {
  // Check if a battle was resolved for this player recently
  const battle = await env.DB.prepare(
    "SELECT * FROM battles WHERE (player1 = ? OR player2 = ?) AND status = 'resolved' AND resolved_at > datetime('now', '-120 seconds') ORDER BY resolved_at DESC LIMIT 1"
  ).bind(address, address).first();

  if (battle) {
    const isP1   = battle.player1 === address;
    const won    = battle.winner === address;
    const draw   = battle.winner === null;
    // Return 'p1'/'p2'/'draw' relative to the polling player (they are always "p1" from their perspective)
    const winner = won ? 'p1' : draw ? 'draw' : 'p2';

    const myCard = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(address).first();

    // Rounds are stored relative to the POST caller (player1 in DB).
    // If the polling player was player2, swap p1/p2 in rounds so "p1" always means "me".
    let rounds = JSON.parse(battle.rounds);
    if (!isP1) {
      rounds = rounds.map(r => ({
        ...r,
        p1: r.p2,
        p2: r.p1,
        result: r.result === 'p1' ? 'p2' : r.result === 'p2' ? 'p1' : r.result,
      }));
    }

    return json({
      status:  'matched',
      battleId: battle.id,
      rounds,
      winner,
      won,
      opponent: {
        address: isP1 ? battle.player2 : battle.player1,
        card:    JSON.parse(isP1 ? battle.p2_card : battle.p1_card),
      },
      card: myCard,
    });
  }

  const inQueue = await env.DB.prepare(
    'SELECT * FROM battle_queue WHERE address = ?'
  ).bind(address).first();

  return json({ status: inQueue ? 'waiting' : 'idle' });
}

async function handleQueue(request, env) {
  await ensureMatchmakingSchema(env);
  await cleanupQueue(env);

  const { address, card } = await request.json();

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }
  if (!card || !card.tokenId) {
    return json({ error: 'invalid', message: 'Card is required for matchmaking' }, 400);
  }

  const addr     = address.toLowerCase();
  const ticketId = crypto.randomUUID();
  const cardRow  = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(addr).first();
  if (!cardRow) return json({ error: 'not_registered', message: 'Register a card first' }, 400);
  // DB is authoritative, but fall back to client element/tokenId if DB has nulls (legacy registrations)
  const resolvedElement = cardRow.element || card.element || 'VOID';
  const resolvedTokenId = cardRow.token_id || card.tokenId;
  const trackLevels = await getTrackLevelsForClass(env, addr, resolvedElement);
  const loadout  = await getCardLoadoutRecord(env, addr, resolvedTokenId, resolvedElement);
  const queuedCard = attachCardLoadout({ ...cardRow, element: resolvedElement }, loadout, trackLevels, resolvedElement);
  const cardJson = JSON.stringify(queuedCard);
  const profile  = computeMatchProfile(cardRow, queuedCard);

  await env.DB.prepare(
    `INSERT INTO battle_queue (
       address, ticket_id, card_json, status, match_id, queued_at, matched_at, expires_at, updated_at, rating, bucket_key
     ) VALUES (
       ?, ?, ?, 'searching', NULL, CURRENT_TIMESTAMP, NULL, datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'), CURRENT_TIMESTAMP, ?, ?
     )
     ON CONFLICT(address) DO UPDATE SET
       ticket_id  = excluded.ticket_id,
       card_json  = excluded.card_json,
       status     = 'searching',
       match_id   = NULL,
       queued_at  = CURRENT_TIMESTAMP,
       matched_at = NULL,
       expires_at = datetime('now', '+${QUEUE_TICKET_TTL_SECONDS} seconds'),
       updated_at = CURRENT_TIMESTAMP,
       rating     = excluded.rating,
       bucket_key = excluded.bucket_key`
  ).bind(addr, ticketId, cardJson, profile.rating, profile.bucketKey).run();

  const matched = await attemptMatchForTicket(env, addr, ticketId);
  if (matched) return json(matched);

  return json({
    status:    'waiting',
    ticketId,
    rating:    profile.rating,
    bucketKey: profile.bucketKey,
    tier:      profile.tier,
  });
}

async function handleQueueStatus(address, ticketId, env) {
  await ensureMatchmakingSchema(env);
  await cleanupQueue(env);

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();
  const queueRow = await loadQueueRow(env, addr, ticketId);

  if (queueRow) {
    if (queueRow.status === 'matched' && queueRow.match_id) {
      const payload = await loadQueueBattlePayload(env, addr, queueRow);
      if (payload) return json(payload);

      return json({ status: 'waiting', ticketId: queueRow.ticket_id, phase: 'assembling', countdown: 5 });
    }

    if (queueRow.status === 'matching') {
      return json({ status: 'waiting', ticketId: queueRow.ticket_id, phase: 'matching', countdown: 5 });
    }

    if (queueRow.status === 'searching') {
      const matched = await attemptMatchForTicket(env, addr, queueRow.ticket_id);
      if (matched) return json({ ...matched, countdown: 5 });

      // Calculate seconds elapsed since queue entry for client timer display
      const queuedAt = queueRow.queued_at ? new Date(queueRow.queued_at + 'Z').getTime() : Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - queuedAt) / 1000));

      return json({
        status:    'waiting',
        ticketId:  queueRow.ticket_id,
        rating:    queueRow.rating,
        bucketKey: queueRow.bucket_key,
        tier:      competitiveTierFromRating(queueRow.rating),
        matchTimer: elapsedSeconds,
      });
    }
  }

  const battle = await findBattleByTicket(env, ticketId);
  if (battle) {
    const myCard = await env.DB.prepare(
      'SELECT * FROM game_cards WHERE address = ?'
    ).bind(addr).first();
    const progress = await getPlayerProgress(env, addr);

    return json(buildResolvedBattlePayload(
      battle,
      addr,
      myCard ? { ...myCard, forge_shards: Number(progress?.forge_shards || 0) } : myCard
    ));
  }

  return json({ status: ticketId ? 'superseded' : 'idle', ticketId: ticketId || null });
}

async function handleQueueCancel(request, env) {
  await ensureMatchmakingSchema(env);
  await cleanupQueue(env);

  const { address, ticketId } = await request.json();

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid address' }, 400);
  }

  const addr = address.toLowerCase();
  const queueRow = await loadQueueRow(env, addr, ticketId || null);

  if (!queueRow) {
    const battle = await findBattleByTicket(env, ticketId || null);
    if (battle) {
      const myCard = await env.DB.prepare(
        'SELECT * FROM game_cards WHERE address = ?'
      ).bind(addr).first();
      const progress = await getPlayerProgress(env, addr);

      return json(buildResolvedBattlePayload(
        battle,
        addr,
        myCard ? { ...myCard, forge_shards: Number(progress?.forge_shards || 0) } : myCard
      ));
    }

    return json({ status: ticketId ? 'superseded' : 'idle', ticketId: ticketId || null });
  }

  if (ticketId && queueRow.ticket_id !== ticketId) {
    return json({ status: 'superseded', ticketId });
  }

  if (queueRow.status === 'matched' && queueRow.match_id) {
    const payload = await loadQueueBattlePayload(env, addr, queueRow);
    if (payload) return json(payload);
    return json({ status: 'waiting', ticketId: queueRow.ticket_id, phase: 'assembling' });
  }

  if (queueRow.status === 'matching') {
    return json({ status: 'waiting', ticketId: queueRow.ticket_id, phase: 'matching' });
  }

  const deleted = await env.DB.prepare(
    "DELETE FROM battle_queue WHERE address = ? AND ticket_id = ? AND status = 'searching'"
  ).bind(addr, queueRow.ticket_id).run();

  const removed = Number(deleted.meta?.changes || deleted.meta?.rows_written || 0) > 0;
  return json({
    status: removed ? 'cancelled' : 'waiting',
    ticketId: queueRow.ticket_id,
  });
}

async function handleProfileUpsert(request, env) {
  const body = await request.json();
  const { address, displayName, bio, avatarUrl } = body;

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }

  const addr      = address.toLowerCase();
  const cleanName = (displayName || '').trim().slice(0, 50) || null;
  const cleanBio  = (bio || '').trim().slice(0, 280) || null;
  const cleanUrl  = sanitizeUrl((avatarUrl || '').trim().slice(0, 500));

  const existing = await env.DB.prepare(
    'SELECT * FROM profiles WHERE address = ?'
  ).bind(addr).first();

  if (existing) {
    await env.DB.prepare(
      `UPDATE profiles SET display_name = ?, bio = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?`
    ).bind(cleanName, cleanBio, cleanUrl, addr).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO profiles (address, display_name, bio, avatar_url) VALUES (?, ?, ?, ?)`
    ).bind(addr, cleanName, cleanBio, cleanUrl).run();
  }

  const profile = await env.DB.prepare(
    'SELECT * FROM profiles WHERE address = ?'
  ).bind(addr).first();
  return json({ success: true, profile });
}
