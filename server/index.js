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

app.use(cors());
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

/** Verify a Cloudflare Turnstile token server-side */
async function verifyTurnstile(token, ip) {
    if (!token) return false;
    const secret = process.env.CF_TURNSTILE_SECRET;
    if (!secret) {
        console.warn('[Turnstile] CF_TURNSTILE_SECRET not set — skipping verification');
        return true; // dev fallback
    }
    try {
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, response: token, remoteip: ip }),
        });
        const data = await resp.json();
        return data.success === true;
    } catch (err) {
        console.error('[Turnstile] Verification fetch failed:', err.message);
        return false;
    }
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
        const { address, handle, tier, cfToken } = req.body;
        const clientIp = getClientIp(req);
        const userAgent = (req.headers['user-agent'] || '').slice(0, 500);

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'invalid', message: 'Invalid Ethereum address' });
        }
        if (!['gtd', 'fcfs'].includes(tier)) {
            return res.status(400).json({ error: 'invalid', message: 'Invalid tier' });
        }

        // ── Turnstile verification ──────────────────────────────────
        const humanVerified = await verifyTurnstile(cfToken, clientIp);
        if (!humanVerified) {
            return res.status(403).json({ error: 'bot', message: 'Human verification failed. Please refresh and try again.' });
        }

        const normalizedAddress = address.toLowerCase();
        const cleanHandle = (handle || '').trim().slice(0, 100) || null;
        const sql = getDb();

        // ── IP sybil check — flag if same IP already on any allowlist ──
        const ipCheck = await sql`
            SELECT COUNT(*) AS cnt FROM (
                SELECT ip FROM allowlist_gtd  WHERE ip = ${clientIp}
                UNION ALL
                SELECT ip FROM allowlist_fcfs WHERE ip = ${clientIp}
            ) sub
        `;
        if (parseInt(ipCheck[0]?.cnt, 10) >= 3) {
            // Log and reject — same IP submitted 3+ times across tiers
            await sql`
                INSERT INTO sybil_log (ip, user_agent, handle, address, reason)
                VALUES (${clientIp}, ${userAgent}, ${cleanHandle}, ${normalizedAddress}, 'ip_limit')
            `.catch(() => {});
            return res.status(429).json({ error: 'sybil', message: 'Submission limit reached for this network. Contact support if this is an error.' });
        }

        // ── UA sybil check — flag headless/bot UA strings ──────────────
        const suspiciousUA = /headless|phantomjs|puppeteer|selenium|curl|python-requests|wget|bot|crawler|spider/i.test(userAgent);
        if (suspiciousUA) {
            await sql`
                INSERT INTO sybil_log (ip, user_agent, handle, address, reason)
                VALUES (${clientIp}, ${userAgent}, ${cleanHandle}, ${normalizedAddress}, 'bot_ua')
            `.catch(() => {});
            return res.status(403).json({ error: 'bot', message: 'Automated submission detected.' });
        }

        try {
            if (tier === 'gtd') {
                await sql`INSERT INTO allowlist_gtd (address, handle, ip, user_agent) VALUES (${normalizedAddress}, ${cleanHandle}, ${clientIp}, ${userAgent})`;
            } else {
                await sql`INSERT INTO allowlist_fcfs (address, handle, ip, user_agent) VALUES (${normalizedAddress}, ${cleanHandle}, ${clientIp}, ${userAgent})`;
            }
            return res.json({ success: true, message: `Wallet added to ${tier.toUpperCase()} allowlist` });
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
        const { username, password, referralCode } = req.body;
        if (!username || username.length < 3 || username.length > 50)
            return res.status(400).json({ error: 'invalid', message: 'Username must be 3–50 characters' });
        if (!password || password.length < 6)
            return res.status(400).json({ error: 'invalid', message: 'Password must be at least 6 characters' });

        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanUsername)
            return res.status(400).json({ error: 'invalid', message: 'Username may only contain letters, numbers and underscores' });

        const sql = getDb();
        const existing = await sql`SELECT id FROM users WHERE username = ${cleanUsername}`;
        if (existing.length > 0)
            return res.status(409).json({ error: 'duplicate', message: 'Username already taken' });

        const hash = await bcrypt.hash(password, 12);
        let refCode = makeReferralCode();
        // Ensure uniqueness
        while ((await sql`SELECT id FROM users WHERE referral_code = ${refCode}`).length > 0)
            refCode = makeReferralCode();

        let referrerId = null;
        if (referralCode) {
            const referrer = await sql`SELECT id, extra_spins FROM users WHERE referral_code = ${referralCode.toUpperCase()}`;
            if (referrer.length > 0) {
                referrerId = referrer[0].id;
                // Give referrer +1 extra spin (max 10)
                const newSpins = Math.min((referrer[0].extra_spins || 0) + 1, 10);
                await sql`UPDATE users SET extra_spins = ${newSpins} WHERE id = ${referrerId}`;
            }
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
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'invalid', message: 'Username and password required' });

        const cleanUsername = username.trim().toLowerCase();
        const sql = getDb();
        const rows = await sql`SELECT * FROM users WHERE username = ${cleanUsername}`;
        if (rows.length === 0)
            return res.status(401).json({ error: 'auth', message: 'Invalid username or password' });

        const user = rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok)
            return res.status(401).json({ error: 'auth', message: 'Invalid username or password' });

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
                   extra_spins, completed_at, created_at FROM users WHERE id = ${req.user.id}
        `;
        if (rows.length === 0) return res.status(404).json({ error: 'not_found', message: 'User not found' });
        res.json({ user: rows[0] });
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
        res.json({ user });
    } catch (err) {
        console.error('[complete]', err);
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
        const [user] = await sql`
            UPDATE users SET extra_spins = extra_spins - 1 WHERE id = ${req.user.id}
            RETURNING extra_spins
        `;
        res.json({ extra_spins: user.extra_spins });
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
