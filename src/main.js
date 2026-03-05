// ══════════════════════════════════════════════
// ZENKAI — Main Entry
// ══════════════════════════════════════════════

import './style.css';
import { initScene } from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { getToken, getRefCodeFromUrl, authFetch } from './auth.js';
import { renderStep1 } from './pages/step1.js';
import { renderStep2 } from './pages/step2.js';
import { renderStep3 } from './pages/step3.js';
import { renderStep4 } from './pages/step4.js';
import { renderStep5 } from './pages/step5.js';
import { renderSignup } from './pages/signup.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';

// Capture referral code from URL before any navigation strips it
const _refCode = getRefCodeFromUrl();
if (_refCode) {
  localStorage.setItem('zenkai_ref_pending', _refCode);
  sessionStorage.setItem('zenkai_ref', _refCode); // fallback
}

// Initialize background scene
initScene();

// Root: smart redirect based on auth + progress
async function renderRoot() {
  if (_refCode) { navigate('/signup?ref=' + _refCode); return; }
  if (!getToken()) { navigate('/signup'); return; }

  // Logged in — check server state to resume where they left off
  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) { navigate('/signup'); return; }
    const { user } = await res.json();

    if (user.completed_at) { navigate('/dashboard'); return; }

    // Sync spin state to localStorage so step3 has it immediately
    if (typeof user.spins_used === 'number') localStorage.setItem('zenkai_spins_used', String(user.spins_used));
    if (user.best_result) localStorage.setItem('zenkai_best_result', user.best_result);
    if (user.x_handle) sessionStorage.setItem('zenkai_handle', user.x_handle);

    const spins = user.spins_used || 0;
    if (spins >= 2 && user.best_result && user.best_result !== 'fail') { navigate('/step4'); return; }
    if (spins >= 2) { navigate('/step5'); return; }
    if (spins > 0) { navigate('/step3'); return; }

    // No spins yet — start from step1
    navigate('/step1');
  } catch {
    navigate('/signup');
  }
}

// Register routes
registerRoute('/', renderRoot);
registerRoute('/step1', renderStep1);
registerRoute('/step2', renderStep2);
registerRoute('/step3', renderStep3);
registerRoute('/step4', renderStep4);
registerRoute('/step5', renderStep5);
registerRoute('/signup', renderSignup);
registerRoute('/login', renderLogin);
registerRoute('/dashboard', renderDashboard);

// Start router
initRouter();

