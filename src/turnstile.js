// ══════════════════════════════════════════════
// ZENKAI — Cloudflare Turnstile helper (SPA)
// Invisible challenge — no user interaction required.
// ══════════════════════════════════════════════

const SITE_KEY = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY;

// Wait up to 5 s for the Turnstile script to load
function waitForTurnstile(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(); return; }
    const start = Date.now();
    const check = setInterval(() => {
      if (window.turnstile) { clearInterval(check); resolve(); return; }
      if (Date.now() - start > timeout) {
        clearInterval(check);
        reject(new Error('Turnstile not loaded'));
      }
    }, 60);
  });
}

/**
 * Render an invisible Turnstile widget inside `containerId`.
 * Returns the widget ID needed for `executeChallenge`.
 *
 * @param {string}   containerId  — DOM element id (no #)
 * @param {object}   callbacks
 * @param {function} callbacks.onSuccess(token)  — called with CF token
 * @param {function} [callbacks.onError]         — called on failure
 */
export async function renderTurnstile(containerId, { onSuccess, onError }) {
  try {
    await waitForTurnstile();
  } catch {
    // Turnstile script failed to load (ad-blocker / network).
    // Log a warning and short-circuit by calling onSuccess with a sentinel
    // so users aren't hard-blocked — server will still do IP/UA checks.
    console.warn('[Turnstile] Script unavailable — proceeding without CF verify');
    onError?.();
    return null;
  }

  const container = document.getElementById(containerId);
  if (!container) return null;

  const widgetId = window.turnstile.render(`#${containerId}`, {
    sitekey: SITE_KEY,
    size: 'invisible',
    callback: (token) => {
      onSuccess(token);
    },
    'error-callback': () => {
      console.warn('[Turnstile] Challenge error');
      onError?.();
    },
    'expired-callback': () => {
      // Token expired before use — reset so next execute gets a fresh one
      if (window.turnstile) window.turnstile.reset(widgetId);
    },
  });

  return widgetId;
}

/**
 * Trigger the invisible challenge. The `onSuccess` callback passed to
 * `renderTurnstile` will fire once Cloudflare issues the token.
 */
export function executeChallenge(widgetId) {
  if (!widgetId || !window.turnstile) return;
  window.turnstile.execute(widgetId);
}

/**
 * Clean up a widget — call this if the page is torn down manually.
 */
export function removeTurnstile(widgetId) {
  if (widgetId && window.turnstile) {
    try { window.turnstile.remove(widgetId); } catch { /* already removed */ }
  }
}
