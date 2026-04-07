// ══════════════════════════════════════════════
// ZENKAI — API client (points to CF Worker)
// ══════════════════════════════════════════════

const BASE = import.meta.env.VITE_API_URL || '';

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

// ── Game API ──────────────────────────────────────────────────────────────────

/** Register / sync card state with server */
export async function syncCard(address, card) {
  try {
    const stats = card.pwr != null ? card : {};
    const data = await apiPost('/api/game/register', {
      address,
      tokenId:    card.tokenId,
      name:       card.name,
      image:      card.image,
      pwr:        stats.pwr   ?? null,
      def:        stats.def   ?? null,
      spd:        stats.spd   ?? null,
      element:    stats.element    ?? null,
      ability:    stats.ability    ?? null,
      rarity:     stats.rarity     ?? null,
      attributes: card.attributes  ?? [],
    });
    return data.card || null;
  } catch {
    return null;
  }
}

/**
 * Enter matchmaking queue.
 * Returns { status: 'waiting' } or { status: 'matched', rounds, winner, opponent, card }
 */
export async function enterQueue(address, card) {
  return apiPost('/api/game/queue', { address, card });
}

/** Poll queue status for a player */
export async function pollQueue(address) {
  return apiGet(`/api/game/queue/${address}`);
}

/** Fetch leaderboard */
export async function getLeaderboard() {
  return apiGet('/api/game/leaderboard');
}
