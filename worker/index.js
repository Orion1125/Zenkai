// ══════════════════════════════════════════════
// ZENKAI — Cloudflare Worker API
// DB: D1 (SQLite)  |  No Express, no Neon
// ══════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function csvResponse(text, filename) {
  return new Response(text, {
    headers: {
      ...CORS,
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

// ── Stat derivation (must match frontend) ────────────────────────────────────

function deriveStats(tokenId) {
  const s = String(tokenId);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    pwr: 45 + (h * 7)  % 40,
    def: 30 + (h * 11) % 40,
    spd: 50 + (h * 13) % 30,
  };
}

function resolveBattle(p1TokenId, p2TokenId) {
  const s1 = deriveStats(p1TokenId);
  const s2 = deriveStats(p2TokenId);

  const rounds = [
    { stat: 'PWR', p1: s1.pwr, p2: s2.pwr },
    { stat: 'DEF', p1: s1.def, p2: s2.def },
    { stat: 'SPD', p1: s1.spd, p2: s2.spd },
  ].map(r => ({
    ...r,
    result: r.p1 > r.p2 ? 'p1' : r.p2 > r.p1 ? 'p2' : 'draw',
  }));

  const p1Wins = rounds.filter(r => r.result === 'p1').length;
  const p2Wins = rounds.filter(r => r.result === 'p2').length;

  return {
    rounds,
    winner: p1Wins > p2Wins ? 'p1' : p2Wins > p1Wins ? 'p2' : 'draw',
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
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
  const { address, tokenId, name, image } = await request.json();

  if (!address || !isValidEthAddress(address)) {
    return json({ error: 'invalid', message: 'Invalid Ethereum address' }, 400);
  }

  const addr = address.toLowerCase();

  // Upsert — update if already exists (but keep level/xp/wins/losses)
  const existing = await env.DB.prepare(
    'SELECT * FROM game_cards WHERE address = ?'
  ).bind(addr).first();

  if (existing) {
    await env.DB.prepare(
      'UPDATE game_cards SET token_id = ?, name = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?'
    ).bind(String(tokenId), name || null, image || null, addr).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO game_cards (address, token_id, name, image) VALUES (?, ?, ?, ?)'
    ).bind(addr, String(tokenId), name || null, image || null).run();
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

  // Clean up stale queue entries (older than 60s)
  await env.DB.prepare(
    "DELETE FROM battle_queue WHERE queued_at < datetime('now', '-60 seconds')"
  ).run();

  // Check for a waiting opponent (not yourself)
  const opponent = await env.DB.prepare(
    'SELECT * FROM battle_queue WHERE address != ? LIMIT 1'
  ).bind(addr).first();

  if (opponent) {
    // Pair found — resolve battle
    const p1Card   = card;
    const p2Card   = JSON.parse(opponent.card_json);
    const result   = resolveBattle(p1Card.tokenId, p2Card.tokenId);
    const battleId = crypto.randomUUID();
    const winner   = result.winner === 'p1' ? addr : result.winner === 'p2' ? opponent.address : null;

    await env.DB.prepare(
      'INSERT INTO battles (id, player1, player2, winner, p1_card, p2_card, rounds, status, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(
      battleId, addr, opponent.address, winner,
      JSON.stringify(p1Card), JSON.stringify(p2Card),
      JSON.stringify(result.rounds), 'resolved'
    ).run();

    // Update win/loss records
    if (winner) {
      const loser = winner === addr ? opponent.address : addr;
      await env.DB.prepare(
        'UPDATE game_cards SET wins = wins + 1, xp = xp + 50, updated_at = CURRENT_TIMESTAMP WHERE address = ?'
      ).bind(winner).run();
      await env.DB.prepare(
        'UPDATE game_cards SET losses = losses + 1, xp = xp + 10, updated_at = CURRENT_TIMESTAMP WHERE address = ?'
      ).bind(loser).run();
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
