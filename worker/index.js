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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Current request reference for CORS (set at top of each fetch)
let _req = null;

function json(data, status = 200) {
  const cors = _req ? corsHeaders(_req) : { 'Access-Control-Allow-Origin': '*' };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function csvResponse(text, filename) {
  const cors = _req ? corsHeaders(_req) : { 'Access-Control-Allow-Origin': '*' };
  return new Response(text, {
    headers: {
      ...cors,
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
  const rng = seededRng(seed || battleSeed(String(p1.pwr), String(p2.pwr)));

  const lvlBonus1 = (p1.level || 1) * 1.2;
  const lvlBonus2 = (p2.level || 1) * 1.2;

  let elemAdv1 = 0, elemAdv2 = 0;
  if (p1.element && p2.element) {
    if (ELEMENT_ADVANTAGE[p1.element] === p2.element) elemAdv1 = 8;
    if (ELEMENT_ADVANTAGE[p2.element] === p1.element) elemAdv2 = 8;
  }

  const shadowBonus = (el) => el === 'SHADOW' ? 5 : 0;
  const shadowPen   = (el) => el === 'SHADOW' ? 5 : 0;

  const STATS = ['PWR', 'DEF', 'SPD'];
  const rounds = [];
  let p1Score = 0, p2Score = 0;

  for (let i = 0; i < 3; i++) {
    const stat = STATS[i];
    let v1 = (p1[stat.toLowerCase()] || 50) + lvlBonus1 + elemAdv1 + shadowBonus(p1.element);
    let v2 = (p2[stat.toLowerCase()] || 50) + lvlBonus2 + elemAdv2 + shadowBonus(p2.element);

    v1 -= shadowPen(p1.element);
    v2 -= shadowPen(p2.element);

    // Apply abilities
    if (stat === 'PWR') {
      if (p1.ability === 'ZENKAI SURGE')  v1 += rng() < 0.3 ? 15 : 0;
      if (p2.ability === 'ZENKAI SURGE')  v2 += rng() < 0.3 ? 15 : 0;
      if (p1.ability === 'BLOODLUST')     v1 += 6;
      if (p2.ability === 'BLOODLUST')     v2 += 6;
      if (p1.ability === 'PREDATOR')      v1 += p2.pwr < p1.pwr ? 8 : 0;
      if (p2.ability === 'PREDATOR')      v2 += p1.pwr < p2.pwr ? 8 : 0;
    }
    if (stat === 'DEF') {
      if (p1.ability === 'AWAKENED')  v1 += 5;
      if (p2.ability === 'AWAKENED')  v2 += 5;
      if (p1.ability === 'RESOLVE' && i === 2) v1 += 10;
      if (p2.ability === 'RESOLVE' && i === 2) v2 += 10;
    }
    if (stat === 'SPD') {
      if (p1.ability === 'FLASH')  v1 += 7;
      if (p2.ability === 'FLASH')  v2 += 7;
    }

    // Variance
    v1 += Math.floor(rng() * 9);
    v2 += Math.floor(rng() * 9);

    v1 = Math.round(v1);
    v2 = Math.round(v2);

    let result;
    if (v1 > v2)      { result = 'p1'; p1Score++; }
    else if (v2 > v1) { result = 'p2'; p2Score++; }
    else               { result = 'draw'; }

    rounds.push({ stat, p1: v1, p2: v2, result });
  }

  // MIRROR COUNTER: post-battle reversal
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    if (r.result === 'p2' && p1.ability === 'MIRROR COUNTER' && rng() < 0.25) {
      r.result = 'p1'; r.stat += ' (MIRROR)'; p1Score++; p2Score--;
    } else if (r.result === 'p1' && p2.ability === 'MIRROR COUNTER' && rng() < 0.25) {
      r.result = 'p2'; r.stat += ' (MIRROR)'; p2Score++; p1Score--;
    }
  }

  return {
    rounds,
    winner: p1Score > p2Score ? 'p1' : p2Score > p1Score ? 'p2' : 'draw',
  };
}

// ── XP calculation (mirrors frontend) ────────────────────────────────────────

function calcXP(myRarity, oppRarity, won, draw) {
  const RARITY_VAL = { COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5 };
  const mine = RARITY_VAL[myRarity] || 1;
  const opp  = RARITY_VAL[oppRarity] || 1;
  const diff = opp - mine;
  if (won)  return Math.max(5, 50 + diff * 5);
  if (draw) return 15;
  return Math.max(5, 10 + diff * 3);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    _req = request;
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      // ── Wallets ──────────────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/wallets') {
        return handleSubmitWallet(request, env);
      }
      if (method === 'GET' && path === '/api/wallets') {
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM wallets ORDER BY created_at ASC'
        ).all();
        return json({ count: rows.results.length, wallets: rows.results });
      }
      if (method === 'GET' && path === '/api/wallets/csv') {
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
        const rows = await env.DB.prepare(
          'SELECT address, handle, created_at FROM allowlist_fcfs ORDER BY created_at ASC'
        ).all();
        let csv = 'address,handle,created_at\n';
        for (const r of rows.results) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        return csvResponse(csv, 'zenkai_fcfs.csv');
      }
      if (method === 'GET' && path === '/api/allowlist/gtd/csv') {
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
        return json({ card: row });
      }

      // ── Game: Enter queue ─────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/game/queue') {
        return handleQueue(request, env);
      }

      // ── Game: Queue status ────────────────────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/game/queue/')) {
        const address = path.split('/').pop().toLowerCase();
        return handleQueueStatus(address, env);
      }

      // ── Game: Leaderboard ─────────────────────────────────────────────────
      if (method === 'GET' && path === '/api/game/leaderboard') {
        const rows = await env.DB.prepare(
          'SELECT address, level, xp, wins, losses FROM game_cards ORDER BY wins DESC, level DESC LIMIT 50'
        ).all();
        return json({ leaderboard: rows.results });
      }

      // ── Profile: Get ──────────────────────────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/profile/')) {
        const address = path.split('/').pop().toLowerCase();
        if (!isValidEthAddress(address)) return json({ error: 'invalid' }, 400);
        const profile = await env.DB.prepare(
          'SELECT * FROM profiles WHERE address = ?'
        ).bind(address).first();
        const card = await env.DB.prepare(
          'SELECT level, xp, wins, losses, name, image, element, rarity FROM game_cards WHERE address = ?'
        ).bind(address).first();
        return json({ profile: profile || null, card: card || null });
      }

      // ── Profile: Upsert ───────────────────────────────────────────────────
      if (method === 'POST' && path === '/api/profile') {
        return handleProfileUpsert(request, env);
      }

      return json({ error: 'not_found' }, 404);

    } catch (err) {
      console.error(err);
      return json({ error: 'server_error', message: err.message }, 500);
    }
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
  const cleanUrl    = (quoteUrl || '').trim().slice(0, 500) || null;

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
  const body = await request.json();
  const { address, tokenId, name, image, pwr, def, spd, element, ability, rarity, attributes } = body;

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }

  const addr       = address.toLowerCase();
  const tid        = String(tokenId);
  const cleanName  = (name || '').slice(0, 200) || null;
  const cleanImage = (image || '').slice(0, 500) || null;
  const traitsJson = attributes ? JSON.stringify(attributes).slice(0, 5000) : null;

  const existing = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ?'
  ).bind(addr).first();

  if (existing) {
    await env.DB.prepare(
      `UPDATE game_cards SET token_id = ?, name = ?, image = ?,
       pwr = ?, def = ?, spd = ?, element = ?, ability = ?, rarity = ?, traits_json = ?,
       updated_at = CURRENT_TIMESTAMP WHERE address = ?`
    ).bind(tid, cleanName, cleanImage, pwr ?? null, def ?? null, spd ?? null, element ?? null, ability ?? null, rarity ?? null, traitsJson, addr).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO game_cards (address, token_id, name, image, pwr, def, spd, element, ability, rarity, traits_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(addr, tid, cleanName, cleanImage, pwr ?? null, def ?? null, spd ?? null, element ?? null, ability ?? null, rarity ?? null, traitsJson).run();
  }

  const card = await env.DB.prepare('SELECT * FROM game_cards WHERE address = ?').bind(addr).first();
  return json({ success: true, card });
}

async function handleQueue(request, env) {
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

async function handleQueueStatus(address, env) {
  // Check if a battle was resolved for this player recently
  const battle = await env.DB.prepare(
    "SELECT * FROM battles WHERE (player1 = ? OR player2 = ?) AND status = 'resolved' AND resolved_at > datetime('now', '-120 seconds') ORDER BY resolved_at DESC LIMIT 1"
  ).bind(address, address).first();

  if (battle) {
    const isP1   = battle.player1 === address;
    const winner = battle.winner === address ? 'won' : battle.winner === null ? 'draw' : 'lost';
    return json({
      status:  'matched',
      battleId: battle.id,
      rounds:  JSON.parse(battle.rounds),
      winner,
      isP1,
      opponent: {
        address: isP1 ? battle.player2 : battle.player1,
        card:    JSON.parse(isP1 ? battle.p2_card : battle.p1_card),
      },
    });
  }

  const inQueue = await env.DB.prepare(
    'SELECT * FROM battle_queue WHERE address = ?'
  ).bind(address).first();

  return json({ status: inQueue ? 'waiting' : 'idle' });
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
  const cleanUrl  = (avatarUrl || '').trim().slice(0, 500) || null;

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
