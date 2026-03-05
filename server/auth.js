// ══════════════════════════════════════════════
// ZENKAI — JWT Auth Helpers
// ══════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'zenkai-dev-secret-change-in-prod';
const EXPIRES = '30d';

export function signToken(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}

/** Express middleware — attaches req.user if valid Bearer token present */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'auth', message: 'Not authenticated' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'auth', message: 'Invalid or expired token' });
    req.user = payload;
    next();
}
