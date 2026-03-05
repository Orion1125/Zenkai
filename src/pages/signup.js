// ZENKAI — Signup Page
import { navigate } from '../router.js';
import { saveAuth, getToken, persistCompletion, getRefCodeFromUrl } from '../auth.js';

export function renderSignup(container) {
  // Already logged in → go to step1
  if (getToken()) { navigate('/step1'); return; }

  const refCode = getRefCodeFromUrl() || sessionStorage.getItem('zenkai_ref') || '';

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">create account</div>

    <div class="step-title">Join the Protocol</div>
    <p class="step-tagline">Create an account to save your result and unlock your referral link.</p>

    <div class="input-group">
      <label for="su-username">Username</label>
      <input type="text" id="su-username" class="input-field" placeholder="your_handle"
        autocomplete="username" spellcheck="false" maxlength="50" />
    </div>

    <div class="input-group">
      <label for="su-password">Password</label>
      <div style="position:relative">
        <input type="password" id="su-password" class="input-field" placeholder="min. 6 characters"
          autocomplete="new-password" maxlength="100" style="padding-right:46px" />
        <button class="pw-toggle" id="su-pw-toggle" type="button" aria-label="Show password">
          <svg id="su-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>

    ${refCode ? `
    <div class="ref-prefill-row">
      <span class="ref-prefill-label">Referred by code</span>
      <span class="ref-prefill-value">${refCode}</span>
    </div>` : `
    <div class="input-group">
      <label for="su-ref">Referral Code <span style="opacity:.5;font-weight:400">(optional)</span></label>
      <input type="text" id="su-ref" class="input-field" placeholder="XXXXXX"
        autocomplete="off" spellcheck="false" maxlength="12" value="" />
    </div>`}

    <p class="input-error" id="su-error"></p>

    <button class="btn-gold" id="su-submit" disabled>Create Account</button>
    <button class="btn-ghost" id="su-login">Already have an account? Log in</button>
  `;
  container.appendChild(el);

  const usernameEl = document.getElementById('su-username');
  const passwordEl = document.getElementById('su-password');
  const refEl      = document.getElementById('su-ref');
  const errorEl    = document.getElementById('su-error');
  const submitBtn  = document.getElementById('su-submit');

  function validate() {
    const u = usernameEl.value.trim();
    const p = passwordEl.value;
    submitBtn.disabled = u.length < 3 || p.length < 6;
  }

  usernameEl.addEventListener('input', validate);
  passwordEl.addEventListener('input', validate);

  // Password toggle
  document.getElementById('su-pw-toggle')?.addEventListener('click', () => {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    document.getElementById('su-eye').style.opacity = isHidden ? '1' : '0.4';
  });

  submitBtn.addEventListener('click', async () => {
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    const referralCode = refCode || (refEl ? refEl.value.trim() : '');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.message || 'Signup failed.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }
      saveAuth(data.token, data.user);
      navigate('/step1');
    } catch {
      errorEl.textContent = 'Connection error. Try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  document.getElementById('su-login').addEventListener('click', () => navigate('/login'));
  requestAnimationFrame(() => usernameEl.focus());
}

// persistCompletion is imported from auth.js
