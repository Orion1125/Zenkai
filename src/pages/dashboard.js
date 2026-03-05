// ZENKAI — Dashboard (post-completion profile + referral hub)
import { navigate } from '../router.js';
import { getToken, getStoredUser, clearAuth, authFetch, refreshUser } from '../auth.js';

export async function renderDashboard(container) {
  // Guard: must be logged in
  if (!getToken()) { navigate('/login'); return; }

  // Show skeleton while we fetch fresh data
  const skeleton = document.createElement('div');
  skeleton.className = 'card';
  skeleton.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">dashboard</div>
    <p class="step-tagline" style="text-align:center;margin-top:30px">Loading your profile...</p>
  `;
  container.appendChild(skeleton);

  const user = await refreshUser();
  if (!user) {
    clearAuth();
    navigate('/login');
    return;
  }

  // Replace skeleton
  container.removeChild(skeleton);

  const spotType    = user.spot_type || null;
  const hasSpot     = spotType === 'gtd' || spotType === 'fcfs';
  const xHandle     = user.x_handle || '—';
  const extraSpins  = user.extra_spins || 0;
  const completed   = !!user.completed_at;

  // Build referral URL — use window.location.origin + hash router pattern
  const origin  = window.location.origin;
  const refLink = `${origin}/#/?ref=${user.referral_code}`;

  const spotBadgeClass = spotType === 'gtd' ? 'gtd' : spotType === 'fcfs' ? 'fcfs' : 'fail';
  const spotLabel      = spotType === 'gtd' ? 'GTD — Guaranteed' : spotType === 'fcfs' ? 'FCFS — First Come First Served' : 'No Spot Yet';

  const el = document.createElement('div');
  el.className = 'card dash-card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening dashboard</div>

    <!-- Profile block -->
    <div class="dash-profile">
      <div class="dash-profile-row">
        <span class="dash-field-label">Account</span>
        <span class="dash-field-value">${user.username}</span>
      </div>
      <div class="dash-profile-row">
        <span class="dash-field-label">X Handle</span>
        <span class="dash-field-value" style="color:var(--gold)">${xHandle}</span>
      </div>
      <div class="dash-profile-row">
        <span class="dash-field-label">Allocation</span>
        <span class="share-result-badge ${spotBadgeClass}" style="font-size:0.75rem;padding:3px 10px 1px">${spotLabel}</span>
      </div>
    </div>

    ${!completed ? `
    <div class="dash-warning">
      Complete the Awakening Protocol to lock in your allocation.
      <button class="btn-ghost" id="dash-go-spin" style="margin-top:10px;font-size:0.65rem">Spin Now →</button>
    </div>` : ''}

    <!-- Referral block -->
    <div class="dash-section-label">Referral Hub</div>
    <div class="dash-referral-card">
      <p class="dash-ref-intro">Share your link. Each referral gives you <strong style="color:var(--gold)">+1 extra spin</strong> (max 10).</p>

      <div class="dash-ref-link-row">
        <input type="text" class="input-field dash-ref-input" id="ref-link-input" value="${refLink}" readonly />
        <button class="btn-gold dash-ref-copy" id="ref-copy-btn" style="width:auto;padding:0 16px;clip-path:none">Copy</button>
      </div>

      <div class="dash-stats-row">
        <div class="dash-stat">
          <span class="dash-stat-value" style="color:var(--gold)">${user.referral_code}</span>
          <span class="dash-stat-label">Your Code</span>
        </div>
        <div class="dash-stat">
          <span class="dash-stat-value" style="color:${extraSpins > 0 ? 'var(--gold)' : 'var(--text-muted)'}">${extraSpins}</span>
          <span class="dash-stat-label">Extra Spins</span>
        </div>
      </div>

      ${extraSpins > 0 ? `
      <button class="btn-red" id="dash-use-spin" style="margin-top:14px">
        Use Extra Spin (${extraSpins} remaining)
      </button>` : `
      <p class="dash-no-spins">Refer warriors to earn extra spins.</p>`}
    </div>

    <div class="dash-actions">
      <button class="btn-ghost" id="dash-logout">Sign Out</button>
    </div>
  `;
  container.appendChild(el);

  // ── Copy referral link ──────────────────────────────────────────
  document.getElementById('ref-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      const btn = document.getElementById('ref-copy-btn');
      btn.textContent = 'Copied!';
      btn.style.background = 'var(--red)';
      setTimeout(() => { btn.textContent = 'Copy'; btn.style.background = ''; }, 2000);
    } catch {
      document.getElementById('ref-link-input').select();
    }
  });

  // ── Use extra spin ──────────────────────────────────────────────
  document.getElementById('dash-use-spin')?.addEventListener('click', async () => {
    const btn = document.getElementById('dash-use-spin');
    btn.disabled = true;
    btn.textContent = 'Activating spin...';

    const res = await authFetch('/api/auth/extra-spin', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      // Pre-fill handle so step3→step4→persistCompletion works correctly
      if (user.x_handle) sessionStorage.setItem('zenkai_handle', user.x_handle);
      sessionStorage.removeItem('zenkai_spins_used');
      sessionStorage.removeItem('zenkai_best_result');
      sessionStorage.removeItem('zenkai_result');
      navigate('/step3');
    } else {
      btn.disabled = false;
      btn.textContent = data.message || 'No extra spins available';
    }
  });

  // ── Go to spin flow ─────────────────────────────────────────────
  document.getElementById('dash-go-spin')?.addEventListener('click', () => {
    sessionStorage.removeItem('zenkai_spins_used');
    sessionStorage.removeItem('zenkai_best_result');
    sessionStorage.removeItem('zenkai_result');
    navigate('/step3');
  });

  // ── Logout ──────────────────────────────────────────────────────
  document.getElementById('dash-logout').addEventListener('click', () => {
    clearAuth();
    navigate('/');
  });
}
