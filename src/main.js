// ══════════════════════════════════════════════
// ZENKAI — Main Entry
// ══════════════════════════════════════════════

import './style.css';
import { initScene } from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { renderStep1 } from './pages/step1.js';
import { renderStep2 } from './pages/step2.js';
import { renderStep4 } from './pages/step4.js';
import { renderStep5 } from './pages/step5.js';

// Initialize background scene
initScene();

// Register routes
registerRoute('/', () => navigate('/step1'));
registerRoute('/step1', renderStep1);
registerRoute('/step2', renderStep2);
registerRoute('/step4', renderStep4);
registerRoute('/step5', renderStep5);

// Start router
initRouter();

