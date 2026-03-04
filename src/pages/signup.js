// ZENKAI — Signup Page
import { navigate } from '../router.js';
import { saveAuth, getToken, persistCompletion, getRefCodeFromUrl } from '../auth.js';

export function renderSignup(container) {
  // Already logged in → go to step1
  if (getToken()) { navigate('/step1'); return; }

  // Sybil protection: block second account from same browser
  const deviceAccount = localStorage.getItem('zenkai_device_account');
  if (deviceAccount) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="card-accent"></div>
      <div class="brand-logo">ZENKAI</div>
      <div class="brand-sub">access denied</div>
      <div class="step-title">One Warrior Per Device</div>
      <p class="step-tagline" style="margin-bottom:24px">This browser is already bound to an account. Only one account is allowed per device.</p>
      <button class="btn-gold" id="su-go-login">Sign In to Your Account</button>
    `;
    container.appendChild(el);
    document.getElementById('su-go-login').addEventListener('click', () => navigate('/login'));
    return;
  }

  // Read ref code: localStorage (most reliable) → hash query → sessionStorage
  const refCode = (() => {
    const fromStorage = localStorage.getItem('zenkai_ref_pending') || sessionStorage.getItem('zenkai_ref');
    if (fromStorage) return fromStorage;
    const hashQuery = window.location.hash.split('?')[1] || '';
    return new URLSearchParams(hashQuery).get('ref') || '';
  })();

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">create account</div>

    <div class="step-title">Join the Protocol</div>
    <p class="step-tagline">Enter your Gmail to create an account and unlock your referral link.</p>

    <div class="input-group">
      <label for="su-username">Gmail</label>
      <input type="email" id="su-username" class="input-field" placeholder="you@gmail.com"
        autocomplete="email" spellcheck="false" maxlength="254" />
    </div>

    <div class="input-group">
      <label for="su-ref">Referral Code <span style="opacity:.5;font-weight:400">(optional)</span></label>
      <input type="text" id="su-ref" class="input-field" placeholder="XXXXXX"
        autocomplete="off" spellcheck="false" maxlength="12" value="${refCode}" />
    </div>

    <p class="input-error" id="su-error"></p>

    <button class="btn-gold" id="su-submit" disabled>Create Account</button>
    <button class="btn-ghost" id="su-login">Already have an account? Log in</button>
  `;
  container.appendChild(el);

  const usernameEl = document.getElementById('su-username');
  const refEl      = document.getElementById('su-ref');
  const errorEl    = document.getElementById('su-error');
  const submitBtn  = document.getElementById('su-submit');

  const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  function validate() {
    const u = usernameEl.value.trim();
    submitBtn.disabled = !GMAIL_RE.test(u);
  }

  usernameEl.addEventListener('input', validate);

  submitBtn.addEventListener('click', async () => {
    const username = usernameEl.value.trim();
    const referralCode = refCode || (refEl ? refEl.value.trim() : '');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.message || 'Signup failed.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
      }
      saveAuth(data.token, data.user);
      // Bind this browser to the new account
      localStorage.setItem('zenkai_device_account', data.user.username);
      localStorage.removeItem('zenkai_ref_pending');
      sessionStorage.removeItem('zenkai_ref');
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
