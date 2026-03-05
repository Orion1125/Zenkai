// ══════════════════════════════════════════════
// ZENKAI — Phase 4: Confirmation + Share CTA
// "wallet registered. you might be early."
// ══════════════════════════════════════════════

export function renderConfirmation(container) {
    const handle = sessionStorage.getItem('zenkai_handle') || '';
    const wallet = sessionStorage.getItem('zenkai_wallet') || '';
    const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '';

    const shareText = encodeURIComponent(
        `just registered for @zenkai 👾\n\nyou might be early.\n\nzenkai degen`
    );
    const shareUrl = encodeURIComponent('https://zenkai.xyz');

    const el = document.createElement('div');
    el.className = 'glass-panel confirmation-panel';
    el.innerHTML = `
    <div class="confirm-icon">👾</div>
    <h1>wallet registered.</h1>
    <p class="confirm-tagline">you might be early.</p>

    ${shortWallet ? `<p class="confirm-wallet">${shortWallet}</p>` : ''}

    <a
      href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}"
      target="_blank"
      rel="noopener"
      class="btn-primary btn-share"
      id="share-btn"
    >
      <span>share ZENKAI</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </a>

    <p class="confirm-footer">stay tuned. the orb watches.</p>
  `;
    container.appendChild(el);
}
