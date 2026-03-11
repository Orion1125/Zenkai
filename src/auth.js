// ══════════════════════════════════════════════
// ZENKAI — Frontend Auth Client
// ══════════════════════════════════════════════

const TOKEN_KEY = 'zenkai_token';
const USER_KEY  = 'zenkai_user';

export function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function isLoggedIn() {
    return !!getToken();
}

/** Authenticated fetch — automatically attaches Bearer token */
export async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) { clearAuth(); }
    return res;
}

/** Fetch fresh user data from server and update local storage */
export async function refreshUser() {
    try {
        const res = await authFetch('/api/auth/me');
        if (!res.ok) return null;
        const { user } = await res.json();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
    } catch {
        return null;
    }
}

/** Persist completion to the logged-in user's account */
export async function persistCompletion() {
    const xHandle  = sessionStorage.getItem('zenkai_handle');
    const spotType = 'fcfs';
    const token = getToken();
    if (!token) return;
    try {
        await fetch('/api/auth/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ xHandle, spotType }),
        });
    } catch { /* non-fatal */ }
}

/** Get referral code from URL (?ref=CODE) if present */
export function getRefCodeFromUrl() {
    // Check both location.search (for plain URLs) and location.hash (for hash-router URLs)
    const sources = [window.location.search, window.location.hash];
    for (const src of sources) {
        const match = src.match(/[?&]ref=([A-Za-z0-9]{4,16})/);
        if (match) return match[1].toUpperCase();
    }
    return null;
}
