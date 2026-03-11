// ══════════════════════════════════════════════
// ZENKAI — Main Entry
// ══════════════════════════════════════════════

import './style.css';
import { initScene } from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { getToken, getRefCodeFromUrl, authFetch } from './auth.js';
import { renderStep1 } from './pages/step1.js';
import { renderStep2 } from './pages/step2.js';
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
    if (user.x_handle) sessionStorage.setItem('zenkai_handle', user.x_handle);

    // Start from step1
    navigate('/step1');
  } catch {
    navigate('/signup');
  }
}

// Register routes
registerRoute('/', renderRoot);
registerRoute('/step1', renderStep1);
registerRoute('/step2', renderStep2);
registerRoute('/step4', renderStep4);
registerRoute('/step5', renderStep5);
registerRoute('/signup', renderSignup);
registerRoute('/login', renderLogin);
registerRoute('/dashboard', renderDashboard);

// Start router
initRouter();

