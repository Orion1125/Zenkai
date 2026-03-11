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
      label: 'Like and Retweet <a href="https://x.com/tracescott01/status/2031739603162386865" target="_blank" rel="noopener">this post</a> and tag 2 friends',
    },
    {
      id: 'quote',
      icon: '',
      label: 'Quote <a href="https://x.com/tracescott01/status/2031739603162386865" target="_blank" rel="noopener">this post</a> (caption "zenkai") and paste the link below',
    },
  ];

  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="card-accent"></div>
    <div class="brand-logo">ZENKAI</div>
    <div class="brand-sub">awakening protocol</div>

    <div class="step-title">Oath of Allegiance</div>

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
      Proceed to Wallet
    </button>
    <button class="btn-ghost" id="step2-back"> Back</button>
  `;
  container.appendChild(el);

  const hintEl  = document.getElementById('task-hint');
  const nextBtn = document.getElementById('step2-next');
  const backBtn = document.getElementById('step2-back');
  const taskItems = document.querySelectorAll('.task-item');
  const quoteLinkInput = document.getElementById('quote-link-input');

  const TWEET_RE = /https?:\/\/(www\.)?(x\.com|twitter\.com|mobile\.twitter\.com)\/\w+\/status\/\d+/i;

  function showHint(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add('visible');
    clearTimeout(hintEl._t);
    hintEl._t = setTimeout(() => hintEl.classList.remove('visible'), 3000);
  }

  function updateNext() {
    nextBtn.disabled = completed.size < tasks.length;
  }

  function checkQuoteInput() {
    const val = quoteLinkInput.value.trim();
    const quoteItem = document.querySelector('.task-item[data-id="quote"]');
    if (TWEET_RE.test(val)) {
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
  }

  // Auto-complete quote task when a valid link is entered
  quoteLinkInput.addEventListener('input', checkQuoteInput);
  quoteLinkInput.addEventListener('paste', () => setTimeout(checkQuoteInput, 0));
  quoteLinkInput.addEventListener('change', checkQuoteInput);

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
    navigate('/step4');
  });

  backBtn.addEventListener('click', () => navigate('/'));
}