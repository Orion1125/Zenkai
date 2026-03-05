// ZENKAI — Login Page
import { navigate } from '../router.js';
import { saveAuth, getToken } from '../auth.js';

export function renderLogin(container) {
  // Already logged in → route based on completion status
  if (getToken()) {
    const u = JSON.parse(localStorage.getItem('zenkai_user') || 'null');
    if (u && u.completed_at) {
      if (u.extra_spins > 0) {
        if (u.x_handle) sessionStorage.setItem('zenkai_handle', u.x_handle);
        sessionStorage.removeItem('zenkai_spins_used');
        sessionStorage.removeItem('zenkai_best_result');
        sessionStorage.removeItem('zenkai_result');
        navigate('/step3');
      } else {
        navigate('/dashboard');
      }
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
    <p class="step-tagline">Sign in to view your allocation and referral dashboard.</p>

    <div class="input-group">
      <label for="li-username">Username</label>
      <input type="text" id="li-username" class="input-field" placeholder="your_handle"
        autocomplete="username" spellcheck="false" maxlength="50" />
    </div>

    <div class="input-group">
      <label for="li-password">Password</label>
      <div style="position:relative">
        <input type="password" id="li-password" class="input-field" placeholder="password"
          autocomplete="current-password" maxlength="100" style="padding-right:46px" />
        <button class="pw-toggle" id="li-pw-toggle" type="button" aria-label="Show password">
          <svg id="li-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>

    <p class="input-error" id="li-error"></p>

    <button class="btn-gold" id="li-submit" disabled>Sign In</button>
    <button class="btn-ghost" id="li-signup">No account? Create one</button>
  `;
  container.appendChild(el);

  const usernameEl = document.getElementById('li-username');
  const passwordEl = document.getElementById('li-password');
  const errorEl    = document.getElementById('li-error');
  const submitBtn  = document.getElementById('li-submit');

  function validate() {
    submitBtn.disabled = usernameEl.value.trim().length < 1 || passwordEl.value.length < 1;
  }

  usernameEl.addEventListener('input', validate);
  passwordEl.addEventListener('input', validate);

  document.getElementById('li-pw-toggle')?.addEventListener('click', () => {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    document.getElementById('li-eye').style.opacity = isHidden ? '1' : '0.4';
  });

  async function doLogin() {
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.message || 'Login failed.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        return;
      }
      saveAuth(data.token, data.user);
      // Route based on completion state
      const u = data.user;
      if (u.completed_at) {
        if (u.extra_spins > 0) {
          // Send them back to spin wheel; pre-fill handle from their account
          if (u.x_handle) sessionStorage.setItem('zenkai_handle', u.x_handle);
          sessionStorage.removeItem('zenkai_spins_used');
          sessionStorage.removeItem('zenkai_best_result');
          sessionStorage.removeItem('zenkai_result');
          navigate('/step3');
        } else {
          navigate('/dashboard');
        }
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
  passwordEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !submitBtn.disabled) doLogin(); });
  document.getElementById('li-signup').addEventListener('click', () => navigate('/signup'));
  requestAnimationFrame(() => usernameEl.focus());
}
