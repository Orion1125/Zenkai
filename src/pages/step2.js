// ZENKAI  Step 2: Follow & Tag Tasks
import { navigate } from '../router.js';

export function renderStep2(container) {
  const handle = sessionStorage.getItem('zenkai_handle') || '@warrior';
  const completed = new Set();
  const linkClicked = new Set();

  const tasks = [
    {
      id: 'follow',
      icon: '',
      label: 'Follow <a href="https://x.com/zenkai_ETH" target="_blank" rel="noopener">@zenkai_ETH</a> on X',
    },
    {
      id: 'like',
      icon: '',
      label: 'Like and Retweet <a href="https://x.com/zenkai_ETH" target="_blank" rel="noopener">this post</a>',
    },
    {
      id: 'quote',
      icon: '',
      label: 'Quote <a href="https://x.com/zenkai_ETH" target="_blank" rel="noopener">this post</a> and tag 2 allies (caption "zenkai")',
    },
  ];

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening protocol</div>

    <div class="step-indicator">
      <div class="step-node done">1</div>
      <div class="step-line done"></div>
      <div class="step-node active">2</div>
      <div class="step-line"></div>
      <div class="step-node">3</div>
      <div class="step-line"></div>
      <div class="step-node">4</div>
      <div class="step-line"></div>
      <div class="step-node">5</div>
    </div>

    <div class="step-title">Step 2 — Oath of Allegiance</div>

    <ul class="task-list" id="task-list">
      ${tasks.map(t => `
        <li class="task-item" data-id="${t.id}">
          <div class="task-checkbox">
            <span class="task-check-mark"></span>
          </div>
          <span class="task-label">${t.icon}&nbsp; ${t.label}</span>
        </li>
      `).join('')}
    </ul>

    <p class="task-hint" id="task-hint"></p>

    <button class="btn-gold" id="step2-next" disabled>
      Proceed to Wheel
    </button>
    <button class="btn-ghost" id="step2-back"> Back</button>
  `;
  container.appendChild(el);

  const hintEl  = document.getElementById('task-hint');
  const nextBtn = document.getElementById('step2-next');
  const backBtn = document.getElementById('step2-back');
  const taskItems = document.querySelectorAll('.task-item');

  function showHint(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add('visible');
    clearTimeout(hintEl._t);
    hintEl._t = setTimeout(() => hintEl.classList.remove('visible'), 3000);
  }

  function updateNext() {
    nextBtn.disabled = completed.size < tasks.length;
  }



  //  Tasks 
  taskItems.forEach((item) => {
    const id = item.dataset.id;
    const link = item.querySelector('a');

    if (link) {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        linkClicked.add(id);
        item.classList.add('link-visited');
      });
    }

    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;

      if (!linkClicked.has(id)) {
        showHint('Complete the action first, warrior');
        item.classList.add('shake');
        setTimeout(() => item.classList.remove('shake'), 500);
        return;
      }

      if (completed.has(id)) {
        completed.delete(id);
        item.classList.remove('completed');
      } else {
        completed.add(id);
        item.classList.add('completed');
      }
      updateNext();
    });
  });

  //  Navigation 
  nextBtn.addEventListener('click', () => {
    navigate('/step3');
  });

  backBtn.addEventListener('click', () => navigate('/'));
}