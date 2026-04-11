// E2E tests for Friend Match / Private Lobby
// Runs against a local Vite dev server with API calls mocked via
// Playwright route interception so we exercise the full client flow.

import { test, expect } from 'playwright/test';

const APP = process.env.ZENKAI_LOCAL_URL || 'http://localhost:5173';
const API = 'https://zenkai-test-api.workers.dev'; // mocked, not real

const TEST_WALLET = '0xdeadbeef00000000000000000000000000001234';
const TEST_CARD = {
  tokenId: '42',
  name: 'Test Card',
  image: 'https://via.placeholder.com/200',
  element: 'FIRE',
  level: 1, xp: 0, wins: 0, losses: 0,
  pwr: 60, def: 50, spd: 55, hp: 100,
  rarity: 'COMMON',
  ability: 'ZENKAI SURGE',
  competitive_rating: 1500,
  competitive_tier: 'Gold',
  attributes: [],
};

function buildMatchedPayload(overrides = {}) {
  return {
    status: 'matched',
    ticketId: 'ticket-host-1',
    battleId: 'battle-abc',
    rounds: [
      {
        round: 1,
        actions: [
          { actor: 'p1', target: 'p2', damage: 20, notes: [] },
          { actor: 'p2', target: 'p1', damage: 15, notes: [] },
        ],
        start: { p1: [], p2: [] },
        end: {
          p1: { hp: 85, hpMax: 100, shield: 0, statuses: [] },
          p2: { hp: 80, hpMax: 100, shield: 0, statuses: [] },
        },
        leader: 'p1',
        endNotes: [],
      },
    ],
    winner: 'p1',
    won: true,
    opponent: {
      address: '0xf00dcafe00000000000000000000000000005678',
      card: { ...TEST_CARD, tokenId: '99', name: 'OPP Card', element: 'WATER' },
    },
    card: { ...TEST_CARD, wins: 1, level: 1, xp: 50 },
    ...overrides,
  };
}

async function installStubs(page, { lobbyStatusSequence = [], lobbyJoin = null } = {}) {
  let statusIdx = 0;
  // Stub syncCard and any /api/game/* calls that the arena expects
  await page.route('**/api/game/**', async (route, request) => {
    const url = request.url();
    const method = request.method();

    if (url.includes('/api/game/register')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ card: TEST_CARD }) });
    }

    if (url.includes('/api/game/lobby/create') && method === 'POST') {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          status: 'open',
          code: '123456',
          ticketId: 'ticket-host-1',
          expiresInSeconds: 600,
        }),
      });
    }

    if (url.includes('/api/game/lobby/join') && method === 'POST') {
      if (lobbyJoin) {
        return route.fulfill({ status: 200, body: JSON.stringify(lobbyJoin) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify(buildMatchedPayload({ ticketId: 'ticket-guest-1' })) });
    }

    if (url.includes('/api/game/lobby/cancel') && method === 'POST') {
      return route.fulfill({ status: 200, body: JSON.stringify({ status: 'cancelled', code: '123456' }) });
    }

    if (url.includes('/api/game/lobby/') && method === 'GET') {
      const next = lobbyStatusSequence[Math.min(statusIdx, lobbyStatusSequence.length - 1)];
      statusIdx += 1;
      return route.fulfill({ status: 200, body: JSON.stringify(next || { status: 'open', code: '123456' }) });
    }

    // Fallthrough — empty ok response
    return route.fulfill({ status: 200, body: JSON.stringify({}) });
  });
}

async function seedSession(page) {
  await page.addInitScript(({ wallet, card }) => {
    localStorage.setItem('zenkai_wallet', wallet);
    localStorage.setItem('zenkai_card', JSON.stringify(card));
  }, { wallet: TEST_WALLET, card: TEST_CARD });
}

test.describe('Private lobby (Friend Match)', () => {
  test('mode select renders both mode cards', async ({ page }) => {
    await seedSession(page);
    await installStubs(page);
    await page.goto(`${APP}/#/arena`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-testid="mode-ranked"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="mode-friend"]')).toBeVisible();
    await expect(page.locator('.mode-select-title')).toContainText('CHOOSE MODE');
  });

  test('clicking Ranked reveals the existing arena scene', async ({ page }) => {
    await seedSession(page);
    await installStubs(page);
    await page.goto(`${APP}/#/arena`, { waitUntil: 'domcontentloaded' });

    await page.locator('[data-testid="mode-ranked"]').click();
    await expect(page.locator('#btn-battle')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-battle')).toContainText('FIND BATTLE');
  });

  test('Friend Match → Create Room shows code and polls for guest', async ({ page }) => {
    await seedSession(page);
    await installStubs(page, {
      lobbyStatusSequence: [
        { status: 'open', code: '123456', ticketId: 'ticket-host-1' },
        { status: 'open', code: '123456', ticketId: 'ticket-host-1' },
        buildMatchedPayload(),
      ],
    });

    await page.goto(`${APP}/#/arena`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mode-friend"]').click();

    await expect(page.locator('[data-testid="create-room"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="create-room"]').click();

    // Room code appears
    const roomCode = page.locator('[data-testid="room-code"]');
    await expect(roomCode).toBeVisible({ timeout: 10000 });
    await expect(roomCode).toContainText('123456', { timeout: 10000 });

    // Cancel button should be visible
    await expect(page.locator('[data-testid="cancel-room"]')).toBeVisible();
  });

  test('Friend Match → Join Room inputs code and starts battle', async ({ page }) => {
    await seedSession(page);
    await installStubs(page);

    await page.goto(`${APP}/#/arena`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mode-friend"]').click();

    await expect(page.locator('[data-testid="join-room"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="join-room"]').click();

    const input = page.locator('[data-testid="room-code-input"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('123456');

    await page.locator('[data-testid="join-submit"]').click();

    // After join, the arena scene should appear with the VS badge
    await expect(page.locator('#vs-badge')).toBeVisible({ timeout: 20000 });
  });

  test('Join Room rejects non-numeric input and shows error', async ({ page }) => {
    await seedSession(page);
    await installStubs(page);

    await page.goto(`${APP}/#/arena`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="mode-friend"]').click();
    await page.locator('[data-testid="join-room"]').click();

    const input = page.locator('[data-testid="room-code-input"]');
    await input.fill('abc'); // sanitized to empty

    await page.locator('[data-testid="join-submit"]').click();
    await expect(page.locator('.friend-error')).toContainText(/valid/i);
  });
});
