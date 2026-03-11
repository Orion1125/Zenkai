// ZENKAI  Completion: Share & Account
import { navigate } from '../router.js';
import { getToken, persistCompletion } from '../auth.js';

export function renderStep5(container) {
  const isLoggedIn = getToken();

  const tweetText = 'I just completed the ZENKAI Awakening Protocol \n\nEvolution awaits.\n\nAre you ready? ';
  const tweetFull = tweetText + '\n\nhttps://zenkai.art';
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetFull);

  const el = document.createElement('div');
  el.className = 'card';

  const ctaHtml = isLoggedIn
    ? '<button class="btn-gold" id="step5-dashboard" style="display:inline-flex;align-items:center;gap:6px">View My Dashboard <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>'
    : '<div class="dash-cta-block"><p class="dash-cta-label">Save your result &amp; unlock your referral link</p><button class="btn-gold" id="step5-signup">Create Account</button><button class="btn-ghost" id="step5-login">Already have an account? Sign in</button></div>';

  el.innerHTML =
    '<div class="card-accent"></div>' +
    '<div class="brand-logo">ZENKAI</div>' +
    '<div class="brand-sub">awakening protocol</div>' +
    '<span class="share-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="#FFD700"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></span>' +
    '<div class="step-title">Awakening Complete</div>' +
    '<p class="step-tagline" style="margin-bottom:16px">Share your result and spread the word.</p>' +
    '<div class="share-tweet-preview">' + tweetText.replace(/\n/g, '<br>') + '<br><br><span style="color:var(--gold-dim)">https://zenkai.art</span></div>' +
    '<a href="' + twitterUrl + '" target="_blank" rel="noopener" class="btn-red" style="margin-bottom:14px">' +
      'Share on X &nbsp;' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
    '</a>' +
    ctaHtml +
    '<p style="font-size:0.72rem;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-top:18px;opacity:0.55">the awakening begins.</p>';

  container.appendChild(el);

  document.getElementById('step5-dashboard') && document.getElementById('step5-dashboard').addEventListener('click', async function() { await persistCompletion(); navigate('/dashboard'); });
  document.getElementById('step5-signup') && document.getElementById('step5-signup').addEventListener('click', function() { navigate('/signup'); });
  document.getElementById('step5-login') && document.getElementById('step5-login').addEventListener('click', function() { navigate('/login'); });
}
