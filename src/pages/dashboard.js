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

  const spotType      = user.spot_type || null;
  const hasSpot       = spotType === 'gtd' || spotType === 'fcfs';
  const xHandle       = user.x_handle || '\u2014';
  const completed     = !!user.completed_at;
  // Wallet: prefer server value, fall back to localStorage
  const submittedWallet = user.submitted_wallet || localStorage.getItem('zenkai_submitted_wallet') || null;
  if (submittedWallet) localStorage.setItem('zenkai_submitted_wallet', submittedWallet);
  const shortWallet = submittedWallet ? submittedWallet.slice(0, 6) + '...' + submittedWallet.slice(-4) : null;

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
        <span class="dash-field-label">Gmail</span>
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
      ${submittedWallet ? `
      <div class="dash-profile-row">
        <span class="dash-field-label">Wallet</span>
        <span class="dash-field-value" style="font-family:monospace;font-size:0.75rem;word-break:break-all">${submittedWallet}</span>
      </div>` : ''}
    </div>

    ${!completed ? `
    <div class="dash-warning">
      Complete the Awakening Protocol to lock in your allocation.
      <button class="btn-ghost" id="dash-go-start" style="margin-top:10px;font-size:0.65rem">Start Now →</button>
    </div>` : ''}

    <!-- Referral block -->
    <div class="dash-section-label">Referral Hub</div>
    <div class="dash-referral-card">
      <p class="dash-ref-intro">Share your link to spread the word.</p>

      <div class="dash-ref-link-row">
        <input type="text" class="input-field dash-ref-input" id="ref-link-input" value="${refLink}" readonly />
        <button class="btn-gold dash-ref-copy" id="ref-copy-btn" style="width:auto;padding:0 16px;clip-path:none">Copy</button>
      </div>

      <div class="dash-stats-row">
        <div class="dash-stat">
          <span class="dash-stat-value" style="color:var(--gold)">${user.referral_code}</span>
          <span class="dash-stat-label">Your Code</span>
        </div>
      </div>
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
  // (Removed — wheel spinning no longer available)

  // ── Go to start flow ─────────────────────────────────────────────
  document.getElementById('dash-go-start')?.addEventListener('click', () => {
    navigate('/step1');
  });

  // ── Logout ──────────────────────────────────────────────────────
  document.getElementById('dash-logout').addEventListener('click', () => {
    clearAuth();
    navigate('/');
  });
}
