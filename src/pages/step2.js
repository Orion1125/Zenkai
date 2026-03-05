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
      id: 'rt',
      icon: '',
      label: 'Retweet <a href="https://x.com/zenkai_ETH" target="_blank" rel="noopener">this post</a> and tag 2 friends',
    },
    {
      id: 'quote',
      icon: '',
      label: 'Quote <a href="https://x.com/zenkai_ETH" target="_blank" rel="noopener">this post</a> (caption "zenkai") and paste the link below',
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

    <div class="input-group" style="margin-top:8px">
      <label for="quote-link-input">Quote Tweet Link</label>
      <input type="url" id="quote-link-input" class="input-field" placeholder="https://x.com/..." autocomplete="off" spellcheck="false" />
    </div>

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
  const quoteLinkInput = document.getElementById('quote-link-input');

  const TWEET_RE = /^https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/i;

  function showHint(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add('visible');
    clearTimeout(hintEl._t);
    hintEl._t = setTimeout(() => hintEl.classList.remove('visible'), 3000);
  }

  function updateNext() {
    nextBtn.disabled = completed.size < tasks.length;
  }

  // Auto-complete quote task when a valid link is entered
  quoteLinkInput.addEventListener('input', () => {
    const quoteItem = document.querySelector('.task-item[data-id="quote"]');
    if (TWEET_RE.test(quoteLinkInput.value.trim())) {
      if (!completed.has('quote')) {
        completed.add('quote');
        quoteItem.classList.add('completed');
        updateNext();
      }
    } else {
      if (completed.has('quote')) {
        completed.delete('quote');
        quoteItem.classList.remove('completed');
        updateNext();
      }
    }
  });

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

      // Quote task is controlled by the input field, not clicks
      if (id === 'quote') {
        showHint('Paste your quote tweet link above');
        return;
      }

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
    // Store quote link for later submission
    sessionStorage.setItem('zenkai_quote_url', quoteLinkInput.value.trim());
    navigate('/step3');
  });

  backBtn.addEventListener('click', () => navigate('/'));
}