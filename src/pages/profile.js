// ══════════════════════════════════════════════
// ZENKAI — Player Profile Page
// ══════════════════════════════════════════════

import { navigate }                    from '../router.js';
import { getProfile, updateProfile }   from '../api.js';

const esc = (s) => String(s || '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function renderProfile(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  const wrap = document.createElement('div');
  wrap.className = 'profile-wrap stagger-in';
  wrap.innerHTML = `
    <div class="profile-header">
      <div class="brand-logo profile-logo">ZENKAI</div>
      <span class="profile-addr">${esc(address.slice(0, 6))}…${esc(address.slice(-4))}</span>
    </div>
    <div class="profile-loading">
      <div class="profile-spinner"></div>
      <p class="profile-loading-text">LOADING PROFILE…</p>
    </div>
  `;
  app.appendChild(wrap);

  const data = await loadProfile(address);
  renderProfileContent(wrap, address, data);
}

async function loadProfile(address) {
  try {
    return await getProfile(address);
  } catch {
    return { profile: null, card: null };
  }
}

function renderProfileContent(wrap, address, data) {
  const profile = data.profile || {};
  const card    = data.card    || {};

  const displayName = profile.display_name || '';
  const bio         = profile.bio          || '';
  const avatar      = profile.avatar_url   || card.image || '';
  const level       = card.level  || 1;
  const wins        = card.wins   || 0;
  const losses      = card.losses || 0;
  const xp          = card.xp     || 0;
  const xpNext      = level * 100;
  const xpPct       = Math.min(100, Math.round((xp / xpNext) * 100));
  const element     = card.element || '—';
  const rarity      = card.rarity  || 'Common';
  const totalBattles = wins + losses;
  const winRate     = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

  wrap.innerHTML = `
    <div class="profile-header">
      <div class="brand-logo profile-logo">ZENKAI</div>
      <span class="profile-addr">${esc(address.slice(0, 6))}…${esc(address.slice(-4))}</span>
    </div>

    <div class="profile-card stagger-in">
      <div class="profile-avatar-wrap">
        ${avatar
          ? `<img class="profile-avatar" src="${esc(avatar)}" alt="Avatar" />`
          : `<div class="profile-avatar-blank">戦</div>`
        }
        <div class="profile-level-badge">LV ${level}</div>
      </div>

      <h2 class="profile-name">${esc(displayName) || 'UNNAMED WARRIOR'}</h2>
      <p class="profile-bio">${esc(bio) || 'No bio set'}</p>

      <div class="profile-stats-grid">
        <div class="profile-stat-box">
          <span class="profile-stat-value stat-wins">${wins}</span>
          <span class="profile-stat-label">WINS</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-value stat-losses">${losses}</span>
          <span class="profile-stat-label">LOSSES</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-value">${winRate}%</span>
          <span class="profile-stat-label">WIN RATE</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-value">${totalBattles}</span>
          <span class="profile-stat-label">BATTLES</span>
        </div>
      </div>

      <div class="profile-xp-section">
        <div class="profile-xp-header">
          <span class="profile-xp-level">LEVEL ${level}</span>
          <span class="profile-xp-text">${xp} / ${xpNext} XP</span>
        </div>
        <div class="profile-xp-track">
          <div class="profile-xp-fill" style="width: ${xpPct}%"></div>
        </div>
      </div>

      <div class="profile-meta-row">
        <span class="profile-meta-badge element">${esc(element)}</span>
        <span class="profile-meta-badge rarity">${esc(rarity)}</span>
      </div>
    </div>

    <div class="profile-edit-section" id="profile-edit">
      <div class="divider">EDIT PROFILE</div>
      <div class="input-group">
        <label class="input-label">DISPLAY NAME</label>
        <input type="text" class="input-field" id="input-name" maxlength="50"
               placeholder="Enter your warrior name" value="${esc(displayName)}" />
      </div>
      <div class="input-group">
        <label class="input-label">BIO</label>
        <textarea class="input-field input-textarea" id="input-bio" maxlength="280"
                  placeholder="Tell the arena who you are…">${esc(bio)}</textarea>
      </div>
      <button class="btn-gold" id="btn-save-profile">SAVE PROFILE</button>
      <p class="profile-save-status" id="save-status"></p>
    </div>

    <div class="profile-nav">
      <button class="btn-ghost" id="btn-card">VIEW CARD</button>
      <button class="btn-ghost" id="btn-arena">ENTER ARENA</button>
    </div>
  `;

  wrap.querySelector('#btn-card')?.addEventListener('click', () => navigate('/card'));
  wrap.querySelector('#btn-arena')?.addEventListener('click', () => navigate('/arena'));

  wrap.querySelector('#btn-save-profile')?.addEventListener('click', async () => {
    const btn    = wrap.querySelector('#btn-save-profile');
    const status = wrap.querySelector('#save-status');
    const name   = wrap.querySelector('#input-name').value.trim();
    const bioVal = wrap.querySelector('#input-bio').value.trim();

    btn.disabled    = true;
    btn.textContent = 'SAVING…';

    try {
      const result = await updateProfile(address, { displayName: name, bio: bioVal });
      if (result.success) {
        status.textContent = 'Profile saved!';
        status.className = 'profile-save-status visible success';
      } else {
        status.textContent = result.message || 'Save failed';
        status.className = 'profile-save-status visible error';
      }
    } catch {
      status.textContent = 'Connection error — try again';
      status.className = 'profile-save-status visible error';
    }

    btn.disabled    = false;
    btn.textContent = 'SAVE PROFILE';
    setTimeout(() => { status.className = 'profile-save-status'; }, 3000);
  });
}
