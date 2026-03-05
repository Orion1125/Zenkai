// ZENKAI  Step 5: Screenshot & Share  then prompt to create/view account
import { navigate } from '../router.js';
import { getToken, persistCompletion } from '../auth.js';

export function renderStep5(container) {
  const result = sessionStorage.getItem('zenkai_result') || 'fcfs';
  const isLoggedIn = getToken();

  const resultData = {
    gtd: {
      badge: 'GTD',
      badgeClass: 'gtd',
      icon: '',
      headline: 'Evolution Successful',
      tweetText: 'I just spun the ZENKAI Awakening Wheel \n\nEvolution chose me. GTD Allocation secured.\n\nDid evolution choose you? ',
    },
    fcfs: {
      badge: 'FCFS Access',
      badgeClass: 'fcfs',
      icon: '',
      headline: 'Awakening Partial',
      tweetText: 'I just spun the ZENKAI Awakening Wheel \n\nAwakening Partial  FCFS access granted.\n\nDid evolution choose you? ',
    },
    fail: {
      badge: 'Try Again',
      badgeClass: 'fail',
      icon: '',
      headline: 'Energy Unstable',
      tweetText: 'I just spun the ZENKAI Awakening Wheel \n\nThe orb wasn\'t ready for me  yet.\n\nWill it choose you? ',
    },
  };

  const rd = resultData[result] || resultData.fcfs;
  const tweetFull = rd.tweetText + '\n\nhttps://zenkai.xyz';
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetFull);

  const el = document.createElement('div');
  el.className = 'card';

  const ctaHtml = isLoggedIn
    ? '<button class="btn-gold" id="step5-dashboard">View My Dashboard </button>'
    : '<div class="dash-cta-block"><p class="dash-cta-label">Save your result &amp; unlock referral spins</p><button class="btn-gold" id="step5-signup">Create Account</button><button class="btn-ghost" id="step5-login">Already have an account? Sign in</button></div>';

  el.innerHTML =
    '<div class="card-accent"></div>' +
    '<div class="brand-logo">ZENKAI</div>' +
    '<div class="brand-sub">awakening protocol</div>' +
    '<div class="step-indicator">' +
      '<div class="step-node done">1</div><div class="step-line done"></div>' +
      '<div class="step-node done">2</div><div class="step-line done"></div>' +
      '<div class="step-node done">3</div><div class="step-line done"></div>' +
      '<div class="step-node done">4</div><div class="step-line done"></div>' +
      '<div class="step-node active">5</div>' +
    '</div>' +
    '<span class="share-icon">' + rd.icon + '</span>' +
    '<span class="share-result-badge ' + rd.badgeClass + '">' + rd.badge + '</span>' +
    '<div class="step-title">' + rd.headline + '</div>' +
    '<p class="step-tagline" style="margin-bottom:16px">Share your result and prove evolution chose you.</p>' +
    '<div class="share-tweet-preview">' + rd.tweetText.replace(/\n/g, '<br>') + '<br><br><span style="color:var(--gold-dim)">https://zenkai.xyz</span></div>' +
    '<a href="' + twitterUrl + '" target="_blank" rel="noopener" class="btn-red" style="margin-bottom:14px">' +
      'Share Result on X &nbsp;' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
    '</a>' +
    ctaHtml +
    '<button class="btn-ghost" id="step5-restart" style="margin-top:8px">Spin Again </button>' +
    '<p style="font-size:0.72rem;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-top:18px;opacity:0.55">the awakening begins.</p>';

  container.appendChild(el);

  document.getElementById('step5-dashboard') && document.getElementById('step5-dashboard').addEventListener('click', async function() { await persistCompletion(); navigate('/dashboard'); });
  document.getElementById('step5-signup') && document.getElementById('step5-signup').addEventListener('click', function() { navigate('/signup'); });
  document.getElementById('step5-login') && document.getElementById('step5-login').addEventListener('click', function() { navigate('/login'); });

  document.getElementById('step5-restart').addEventListener('click', function() {
    sessionStorage.removeItem('zenkai_result');
    sessionStorage.removeItem('zenkai_spins_used');
    sessionStorage.removeItem('zenkai_best_result');
    navigate('/step3');
  });
}
