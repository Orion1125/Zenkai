// ══════════════════════════════════════════════
// ZENKAI — Home Page (Image Button)
// ══════════════════════════════════════════════

import { navigate } from '../router.js';

export function renderHome(container) {
  const el = document.createElement('div');
  el.className = 'home-hero';
  el.innerHTML = `
    <div class="orb-image-wrapper" id="orb-btn" role="button" tabindex="0" aria-label="Enter Zenkai">
      <img src="/zenkai.jpg" alt="Zenkai" class="orb-image" draggable="false" />
      <div class="orb-image-glow"></div>
    </div>
    <h1 class="home-title">ZENKAI</h1>
    <p class="home-tagline">enter the orb</p>
  `;
  container.appendChild(el);

  // Entrance animation
  requestAnimationFrame(() => {
    el.classList.add('visible');
  });

  const btn = document.getElementById('orb-btn');

  btn.addEventListener('click', () => {
    btn.classList.add('orb-clicked');
    setTimeout(() => navigate('/register'), 400);
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
}
