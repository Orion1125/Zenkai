// ══════════════════════════════════════════════
// ZENKAI — Express API Server
// ══════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, initDb } from './db.js';
import { signToken, requireAuth } from './auth.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = new Set([
    'https://zenkai.art',
    'https://www.zenkai.art',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
]);

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) return cb(null, true);
        // Allow any LAN IP on typical Vite ports (for network testing)
        if (/^http:\/\/192\.168\.|^http:\/\/10\.|^http:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin) && /:(5173|5174|5175)$/.test(origin))
            return cb(null, true);
        if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────

/** Extract the real client IP — respects Cloudflare CF-Connecting-IP header */
function getClientIp(req) {
    return (
        req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

// ── Serve Vite-built static files ──
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ── POST /api/wallets — Submit a wallet + handle ──
app.post('/api/wallets', async (req, res) => {
    try {
        const { address, handle } = req.body;

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'invalid',
                message: 'Invalid Ethereum address',
            });
        }

        const normalizedAddress = address.toLowerCase();
        const cleanHandle = (handle || '').trim().slice(0, 100);
        const sql = getDb();

        const quoteUrl = (req.body.quoteUrl || '').trim().slice(0, 500) || null;

        // Always log to submissions table
        await sql`
        INSERT INTO submissions (address, handle, quote_url)
        VALUES (${normalizedAddress}, ${cleanHandle || null}, ${quoteUrl})
      `;

        try {
            await sql`
        INSERT INTO wallets (address, handle)
        VALUES (${normalizedAddress}, ${cleanHandle || null})
      `;
            return res.json({ success: true, message: 'Wallet added to allowlist' });
        } catch (err) {
            // Unique constraint violation
            if (err.code === '23505' || (err.message && err.message.includes('unique'))) {
                return res.status(409).json({
                    error: 'duplicate',
                    message: 'Wallet already on allowlist',
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Error submitting wallet:', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── POST /api/allowlist — Submit wallet to tier-specific list ──
app.post('/api/allowlist', async (req, res) => {
    try {
        const { address, handle, tier } = req.body;
        const clientIp = getClientIp(req);
        const userAgent = (req.headers['user-agent'] || '').slice(0, 500);

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'invalid', message: 'Invalid Ethereum address' });
        }
        if (!['fcfs'].includes(tier)) {
            return res.status(400).json({ error: 'invalid', message: 'GTD submissions are closed. Only FCFS is available.' });
        }

        const normalizedAddress = address.toLowerCase();
        const cleanHandle = (handle || '').trim().slice(0, 100) || null;
        const sql = getDb();

        try {
            await sql`INSERT INTO allowlist_fcfs (address, handle, ip, user_agent) VALUES (${normalizedAddress}, ${cleanHandle}, ${clientIp}, ${userAgent})`;
            return res.json({ success: true, message: 'Wallet added to FCFS allowlist' });
        } catch (err) {
            if (err.code === '23505' || (err.message && err.message.includes('unique'))) {
                return res.status(409).json({ error: 'duplicate', message: 'Wallet already on allowlist' });
            }
            throw err;
        }
    } catch (err) {
        console.error('Error submitting to allowlist:', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── GET /api/allowlist/gtd/csv ──
app.get('/api/allowlist/gtd/csv', async (req, res) => {
    try {
        const sql = getDb();
        const rows = await sql`SELECT address, handle, created_at FROM allowlist_gtd ORDER BY created_at ASC`;
        let csv = 'address,handle,created_at\n';
        for (const r of rows) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=zenkai_gtd.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: 'server', message: 'Failed to export GTD list' });
    }
});

// ── GET /api/allowlist/fcfs/csv ──
app.get('/api/allowlist/fcfs/csv', async (req, res) => {
    try {
        const sql = getDb();
        const rows = await sql`SELECT address, handle, created_at FROM allowlist_fcfs ORDER BY created_at ASC`;
        let csv = 'address,handle,created_at\n';
        for (const r of rows) csv += `${r.address},${(r.handle || '').replace(/,/g, '')},${r.created_at}\n`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=zenkai_fcfs.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: 'server', message: 'Failed to export FCFS list' });
    }
});

// ── GET /api/wallets/csv — Export wallets as CSV ──
app.get('/api/wallets/csv', async (req, res) => {
    try {
        const sql = getDb();
        const wallets = await sql`
      SELECT address, handle, created_at FROM wallets ORDER BY created_at ASC
    `;

        let csv = 'address,handle,created_at\n';
        for (const w of wallets) {
            const h = (w.handle || '').replace(/,/g, '');
            csv += `${w.address},${h},${w.created_at}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=zenkai_allowlist.csv');
        res.send(csv);
    } catch (err) {
        console.error('Error exporting CSV:', err);
        res.status(500).json({ error: 'server', message: 'Failed to export wallets' });
    }
});

// ── GET /api/wallets — List wallets (JSON) ──
app.get('/api/wallets', async (req, res) => {
    try {
        const sql = getDb();
        const wallets = await sql`
      SELECT address, handle, created_at FROM wallets ORDER BY created_at ASC
    `;
        res.json({ count: wallets.length, wallets });
    } catch (err) {
        console.error('Error listing wallets:', err);
        res.status(500).json({ error: 'server', message: 'Failed to list wallets' });
    }
});

// ──────────────────────────────────────────────────
// AUTH ROUTES
// ──────────────────────────────────────────────────

function makeReferralCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase() +
           Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ── POST /api/auth/signup ──
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, referralCode } = req.body;
        const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
        if (!username || !GMAIL_RE.test(username.trim()))
            return res.status(400).json({ error: 'invalid', message: 'Please enter a valid Gmail address (@gmail.com)' });

        const cleanUsername = username.trim().toLowerCase();

        const sql = getDb();
        const existing = await sql`SELECT id FROM users WHERE username = ${cleanUsername}`;
        if (existing.length > 0)
            return res.status(409).json({ error: 'duplicate', message: 'An account with this Gmail already exists' });

        const hash = 'email_only';
        let refCode = makeReferralCode();
        // Ensure uniqueness
        while ((await sql`SELECT id FROM users WHERE referral_code = ${refCode}`).length > 0)
            refCode = makeReferralCode();

        let referrerId = null;
        if (referralCode) {
            const referrer = await sql`SELECT id FROM users WHERE referral_code = ${referralCode.toUpperCase()}`;
            if (referrer.length > 0) referrerId = referrer[0].id;
        }

        const [user] = await sql`
            INSERT INTO users (username, password_hash, referral_code, referred_by)
            VALUES (${cleanUsername}, ${hash}, ${refCode}, ${referrerId})
            RETURNING id, username, referral_code, x_handle, spot_type, extra_spins, completed_at
        `;

        const token = signToken({ id: user.id, username: user.username });
        return res.json({ token, user });
    } catch (err) {
        console.error('[signup]', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── POST /api/auth/login ──
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username)
            return res.status(400).json({ error: 'invalid', message: 'Gmail is required' });

        const cleanUsername = username.trim().toLowerCase();
        const sql = getDb();
        const rows = await sql`SELECT * FROM users WHERE username = ${cleanUsername}`;
        if (rows.length === 0)
            return res.status(401).json({ error: 'auth', message: 'No account found with this Gmail' });

        const user = rows[0];

        const token = signToken({ id: user.id, username: user.username });
        return res.json({
            token,
            user: {
                id: user.id, username: user.username,
                referral_code: user.referral_code,
                x_handle: user.x_handle, spot_type: user.spot_type,
                extra_spins: user.extra_spins, completed_at: user.completed_at,
            },
        });
    } catch (err) {
        console.error('[login]', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── GET /api/auth/me ──
app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const sql = getDb();
        const rows = await sql`
            SELECT id, username, referral_code, x_handle, spot_type,
                   extra_spins, completed_at, created_at, spins_used, best_result FROM users WHERE id = ${req.user.id}
        `;
        if (rows.length === 0) return res.status(404).json({ error: 'not_found', message: 'User not found' });
        const user = rows[0];
        // Look up submitted wallet from allowlist tables (by handle)
        let submittedWallet = null;
        if (user.x_handle) {
            const walletRows = await sql`
                SELECT address FROM (
                    SELECT address, created_at FROM allowlist_gtd  WHERE handle = ${user.x_handle}
                    UNION ALL
                    SELECT address, created_at FROM allowlist_fcfs WHERE handle = ${user.x_handle}
                ) sub ORDER BY created_at DESC LIMIT 1
            `;
            submittedWallet = walletRows[0]?.address || null;
        }
        res.json({ user: { ...user, submitted_wallet: submittedWallet } });
    } catch (err) {
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── POST /api/auth/complete — Save x_handle + spot_type after completing the flow ──
// Upgrade-only via single atomic SQL: maps tiers to integers (gtd=1, fcfs=2, fail=3, null=4),
// takes LEAST(), maps back. Never downgrades in a single round-trip (no read-then-write race).
app.post('/api/auth/complete', requireAuth, async (req, res) => {
    try {
        const { xHandle, spotType } = req.body;
        if (!['gtd', 'fcfs', 'fail'].includes(spotType))
            return res.status(400).json({ error: 'invalid', message: 'Invalid spot type' });

        const sql = getDb();
        const handle = (xHandle || '').trim().slice(0, 100) || null;

        // Snapshot state BEFORE update so we know if this is first completion
        const [prev] = await sql`SELECT completed_at, referred_by, referral_credited FROM users WHERE id = ${req.user.id}`;
        const isFirstCompletion = !prev?.completed_at;

        // Single atomic UPDATE — no separate SELECT needed.
        // Rank: gtd=1, fcfs=2, fail=3, NULL→4 (worst). LEAST picks best tier.
        const [user] = await sql`
            UPDATE users
            SET
                x_handle     = COALESCE(${handle}, x_handle),
                completed_at = COALESCE(completed_at, NOW()),
                spot_type    = CASE LEAST(
                    COALESCE(
                        CASE spot_type
                            WHEN 'gtd'  THEN 1
                            WHEN 'fcfs' THEN 2
                            WHEN 'fail' THEN 3
                            ELSE 4
                        END,
                        4
                    ),
                    CASE ${spotType}::text
                        WHEN 'gtd'  THEN 1
                        WHEN 'fcfs' THEN 2
                        WHEN 'fail' THEN 3
                        ELSE 4
                    END
                )
                    WHEN 1 THEN 'gtd'
                    WHEN 2 THEN 'fcfs'
                    WHEN 3 THEN 'fail'
                    ELSE        'fail'
                END
            WHERE id = ${req.user.id}
            RETURNING id, username, referral_code, x_handle, spot_type, extra_spins, completed_at
        `;

        // Credit referrer +1 spin on the referred user's first ever spin completion
        if (isFirstCompletion && prev?.referred_by && !prev?.referral_credited) {
            await sql`UPDATE users SET extra_spins = LEAST(extra_spins + 1, 10) WHERE id = ${prev.referred_by}`;
            await sql`UPDATE users SET referral_credited = TRUE WHERE id = ${req.user.id}`;
        }

        res.json({ user });
    } catch (err) {
        console.error('[complete]', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── POST /api/auth/save-spin — Record spin result after each spin ──
app.post('/api/auth/save-spin', requireAuth, async (req, res) => {
    try {
        const { spinsUsed, bestResult } = req.body;
        if (typeof spinsUsed !== 'number' || spinsUsed < 0 || spinsUsed > 10)
            return res.status(400).json({ error: 'invalid', message: 'Invalid spins_used' });
        if (bestResult && !['gtd', 'fcfs', 'fail'].includes(bestResult))
            return res.status(400).json({ error: 'invalid', message: 'Invalid best_result' });

        const sql = getDb();
        const [user] = await sql`
            UPDATE users
            SET spins_used = ${spinsUsed}, best_result = ${bestResult || null}
            WHERE id = ${req.user.id}
            RETURNING spins_used, best_result
        `;
        res.json({ spins_used: user.spins_used, best_result: user.best_result });
    } catch (err) {
        console.error('[save-spin]', err);
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── POST /api/auth/extra-spin — Consume one extra spin ──
app.post('/api/auth/extra-spin', requireAuth, async (req, res) => {
    try {
        const sql = getDb();
        const rows = await sql`SELECT extra_spins FROM users WHERE id = ${req.user.id}`;
        if (!rows.length || rows[0].extra_spins < 1)
            return res.status(400).json({ error: 'none', message: 'No extra spins remaining' });
        // Deduct spin AND reset spin session so the user gets exactly 1 fresh spin
        const [user] = await sql`
            UPDATE users
            SET extra_spins = extra_spins - 1,
                spins_used  = 1,
                best_result = NULL
            WHERE id = ${req.user.id}
            RETURNING extra_spins, spins_used, best_result
        `;
        res.json({ extra_spins: user.extra_spins, spins_used: user.spins_used, best_result: user.best_result });
    } catch (err) {
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── GET /api/referral/:code — Validate a referral code ──
app.get('/api/referral/:code', async (req, res) => {
    try {
        const sql = getDb();
        const rows = await sql`SELECT id, username FROM users WHERE referral_code = ${req.params.code.toUpperCase()}`;
        if (rows.length === 0) return res.status(404).json({ error: 'not_found', message: 'Invalid referral code' });
        res.json({ valid: true, referrer: rows[0].username });
    } catch (err) {
        res.status(500).json({ error: 'server', message: 'Internal server error' });
    }
});

// ── SPA Fallback — serve index.html for all non-API routes ──
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        next();
    }
});

// ── Start ──
async function start() {
    try {
        await initDb();
    } catch (err) {
        console.warn('⚠ Database not connected (set DATABASE_URL in .env):', err.message);
    }

    app.listen(PORT, () => {
        console.log(`\n  ✦ Zenkai API running at http://localhost:${PORT}\n`);
    });
}

start();
