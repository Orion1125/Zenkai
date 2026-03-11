// ══════════════════════════════════════════════
// ZENKAI — Express API Server
// ══════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, initDb } from './db.js';

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
        } catch (err) {
            // Ignore unique constraint violations — treat re-submission as success
            if (err.code !== '23505' && !(err.message && err.message.includes('unique'))) throw err;
        }
        return res.json({ success: true, message: 'Wallet added to allowlist' });
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
            return res.status(400).json({ error: 'invalid', message: 'Submissions are currently unavailable.' });
        }

        const normalizedAddress = address.toLowerCase();
        const cleanHandle = (handle || '').trim().slice(0, 100) || null;
        const sql = getDb();

        try {
            await sql`INSERT INTO allowlist_fcfs (address, handle, ip, user_agent) VALUES (${normalizedAddress}, ${cleanHandle}, ${clientIp}, ${userAgent})`;
        } catch (err) {
            // Ignore unique constraint violations — treat re-submission as success
            if (err.code !== '23505' && !(err.message && err.message.includes('unique'))) throw err;
        }
        return res.json({ success: true, message: 'Wallet added to allowlist' });
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
