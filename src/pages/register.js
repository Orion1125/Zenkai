// ══════════════════════════════════════════════
// ZENKAI — Single Page Registration
// Username + Tasks + Wallet in one flow
// ══════════════════════════════════════════════

import { navigate } from '../router.js';

const tasks = [
  {
    id: 'like',
    label: '<a href="https://x.com/zenkai/status/1" target="_blank" rel="noopener">Like, retweet and tag two members</a>',
    icon: '❤️',
  },
  {
    id: 'quote',
    label: 'Quote with caption "<a href="https://x.com/zenkai/status/1" target="_blank" rel="noopener">ZENKAI</a>"',
    icon: '🔁',
    requiresUrl: true,
  },
];

export function renderRegister(container) {
  const completed = new Set();
  const linkClicked = new Set();
  const quoteTweetUrls = {};

  const ethRegex = /^0x[a-fA-F0-9]{40}$/;

  const hasProvider = typeof window.ethereum !== 'undefined';

  const el = document.createElement('div');
  el.className = 'glass-panel';
  el.innerHTML = `
    <h1>Zenkai</h1>
    <h2>prove you're degen.</h2>

    <!-- ── Section 1: Identity ── -->
    <div class="register-section">
      <div class="section-number"><span class="section-num-badge">01</span><span class="section-num-label">identity</span></div>
      <div class="input-group">
        <label for="handle-input">username / x handle</label>
        <input
          type="text"
          id="handle-input"
          class="input-field"
          placeholder="@"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- ── Section 2: Tasks ── -->
    <div class="register-section">
      <div class="section-number"><span class="section-num-badge">02</span><span class="section-num-label">tasks</span></div>
      <ul class="task-list" id="task-list">
        ${tasks
          .map(
            (task) => `
          <li class="task-item" data-id="${task.id}">
            <div class="task-checkbox">
              <span class="task-checkbox-tick">✓</span>
            </div>
            <div class="task-content">
              <span class="task-icon">${task.icon}</span>
              <span class="task-label">${task.label}</span>
              ${task.caption ? `<span class="task-caption">${task.caption}</span>` : ''}
            </div>
            ${task.requiresUrl ? `<input class="quote-url-input" data-task-id="${task.id}" type="url" placeholder="paste your quote tweet link" autocomplete="off" />` : ''}
          </li>
        `
          )
          .join('')}
      </ul>
      <p class="task-hint" id="task-hint"></p>
    </div>

    <!-- ── Section 3: Wallet ── -->
    <div class="register-section">
      <div class="section-number"><span class="section-num-badge">03</span><span class="section-num-label">address</span></div>
      ${hasProvider ? `
      <button class="btn-primary btn-connect" id="connect-wallet-btn">
        <span>🔗 Connect Wallet</span>
      </button>
      <div class="divider-or"><span>or</span></div>
      ` : ''}
      <div class="input-group">
        <label for="wallet-input">paste evm address</label>
        <input
          type="text"
          id="wallet-input"
          class="input-field"
          placeholder="0x..."
          autocomplete="off"
          spellcheck="false"
        />
        <p class="input-error" id="wallet-error">enter a valid evm address (0x + 40 hex chars)</p>
      </div>
    </div>

    <!-- ── Submit ── -->
    <button class="btn-primary" id="submit-btn" disabled>
      <span>Submit</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  `;
  container.appendChild(el);

  // ── Refs ──
  const handleInput = document.getElementById('handle-input');
  const walletInput = document.getElementById('wallet-input');
  const walletError = document.getElementById('wallet-error');
  const submitBtn = document.getElementById('submit-btn');
  const hintEl = document.getElementById('task-hint');
  const connectBtn = document.getElementById('connect-wallet-btn');
  const taskItems = document.querySelectorAll('.task-item');

  // ── Validation ──
  function updateSubmit() {
    const handleOk = handleInput.value.trim().length >= 2;
    const tasksOk = completed.size >= tasks.length;
    const walletOk = ethRegex.test(walletInput.value.trim());
    submitBtn.disabled = !(handleOk && tasksOk && walletOk);
  }

  function showHint(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add('visible');
    clearTimeout(hintEl._timeout);
    hintEl._timeout = setTimeout(() => hintEl.classList.remove('visible'), 3000);
  }

  // ── Handle input ──
  handleInput.addEventListener('input', updateSubmit);

  // ── Tasks ──
  taskItems.forEach((item) => {
    const id = item.dataset.id;

    const link = item.querySelector('a');
    if (link) {
      link.addEventListener('click', () => {
        linkClicked.add(id);
        item.classList.add('link-visited');
      });
    }

    const urlInput = item.querySelector('.quote-url-input');
    if (urlInput) {
      urlInput.addEventListener('click', (e) => e.stopPropagation());
      urlInput.addEventListener('input', () => {
        quoteTweetUrls[id] = urlInput.value.trim();
      });
    }

    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      if (e.target.classList.contains('quote-url-input')) return;

      if (!linkClicked.has(id)) {
        showHint('click the link first, degen');
        item.classList.add('shake');
        setTimeout(() => item.classList.remove('shake'), 500);
        return;
      }

      const task = tasks.find((t) => t.id === id);
      if (task && task.requiresUrl && !quoteTweetUrls[id]) {
        showHint('paste your quote tweet link first');
        item.classList.add('shake');
        setTimeout(() => item.classList.remove('shake'), 500);
        if (urlInput) urlInput.focus();
        return;
      }

      if (completed.has(id)) {
        completed.delete(id);
        item.classList.remove('completed');
      } else {
        completed.add(id);
        item.classList.add('completed');
      }

      updateSubmit();
    });
  });

  // ── Wallet input ──
  walletInput.addEventListener('input', () => {
    walletInput.classList.remove('error');
    walletError.classList.remove('visible');
    updateSubmit();
  });

  walletInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
  });

  // ── Connect wallet ──
  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      try {
        connectBtn.innerHTML = '<span>connecting...</span>';
        connectBtn.disabled = true;

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          walletInput.value = addr;
          walletInput.classList.add('connected');
          connectBtn.innerHTML = '<span>✓ connected</span>';
          connectBtn.classList.add('btn-success');
          walletError.classList.remove('visible');
          updateSubmit();
        }
      } catch {
        connectBtn.innerHTML = '<span>🔗 Connect Wallet</span>';
        connectBtn.disabled = false;
        walletError.textContent = 'wallet connection rejected';
        walletError.classList.add('visible');
      }
    });
  }

  // ── Submit ──
  async function handleSubmit() {
    const handle = handleInput.value.trim();
    const address = walletInput.value.trim();
    const quoteUrl = quoteTweetUrls['quote'] || '';

    if (!ethRegex.test(address)) {
      walletInput.classList.add('error');
      walletError.textContent = 'enter a valid evm address (0x + 40 hex chars)';
      walletError.classList.add('visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>submitting...</span>';

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, handle, quoteUrl }),
      });

      const data = await res.json();

      if (res.ok || data.error === 'duplicate') {
        sessionStorage.setItem('zenkai_handle', handle);
        sessionStorage.setItem('zenkai_wallet', address);
        navigate('/confirmation');
      } else {
        walletError.textContent = data.message || 'submission failed. try again.';
        walletError.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      }
    } catch {
      walletError.textContent = 'network error. try again.';
      walletError.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Submit</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }
  }

  submitBtn.addEventListener('click', handleSubmit);
}
