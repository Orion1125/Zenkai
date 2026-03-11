// ZENKAI — Login Page
import { navigate } from '../router.js';
import { saveAuth, getToken } from '../auth.js';

export function renderLogin(container) {
  // Already logged in → route based on completion status
  if (getToken()) {
    const u = JSON.parse(localStorage.getItem('zenkai_user') || 'null');
    if (u && u.completed_at) {
      navigate('/dashboard');
    } else {
      navigate('/step1');
    }
    return;
  }

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">sign in</div>

    <div class="step-title">Welcome Back</div>
    <p class="step-tagline">Sign in with your Gmail to view your allocation and referral dashboard.</p>

    <div class="input-group">
      <label for="li-username">Gmail</label>
      <input type="email" id="li-username" class="input-field" placeholder="you@gmail.com"
        autocomplete="email" spellcheck="false" maxlength="254" />
    </div>

    <p class="input-error" id="li-error"></p>

    <button class="btn-gold" id="li-submit" disabled>Sign In</button>
    <button class="btn-ghost" id="li-signup">No account? Create one</button>
  `;
  container.appendChild(el);

  const usernameEl = document.getElementById('li-username');
  const errorEl    = document.getElementById('li-error');
  const submitBtn  = document.getElementById('li-submit');

  function validate() {
    submitBtn.disabled = usernameEl.value.trim().length < 3;
  }

  usernameEl.addEventListener('input', validate);

  async function doLogin() {
    const username = usernameEl.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.message || 'Login failed.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        return;
      }
      // Sybil check: block login if browser is bound to a different account
      const deviceAccount = localStorage.getItem('zenkai_device_account');
      if (deviceAccount && deviceAccount !== data.user.username) {
        errorEl.textContent = 'This browser is registered to a different account.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        return;
      }
      saveAuth(data.token, data.user);
      // Bind browser to this account if not already set
      localStorage.setItem('zenkai_device_account', data.user.username);
      // Route based on completion state
      const u = data.user;
      if (u.completed_at) {
        navigate('/dashboard');
      } else {
        navigate('/step1');
      }
    } catch {
      errorEl.textContent = 'Connection error. Try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }

  submitBtn.addEventListener('click', doLogin);
  usernameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !submitBtn.disabled) doLogin(); });
  document.getElementById('li-signup').addEventListener('click', () => navigate('/signup'));
  requestAnimationFrame(() => usernameEl.focus());
}
