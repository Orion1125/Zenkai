// ══════════════════════════════════════════════
// ZENKAI — Main Entry
// ══════════════════════════════════════════════

import './style.css';
import { initScene } from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { getToken } from './auth.js';
import { renderStep1 } from './pages/step1.js';
import { renderStep2 } from './pages/step2.js';
import { renderStep3 } from './pages/step3.js';
import { renderStep4 } from './pages/step4.js';
import { renderStep5 } from './pages/step5.js';
import { renderSignup } from './pages/signup.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';

// Initialize background scene
initScene();

// Root: redirect to /signup or /step1 based on auth state
function renderRoot() {
  navigate(getToken() ? '/step1' : '/signup');
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

