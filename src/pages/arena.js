// ══════════════════════════════════════════════
// ZENKAI — Battle Arena (trait-based battle engine)
// ══════════════════════════════════════════════

import { navigate }              from '../router.js';
import { buildCardHTML, buildCardBack, deriveStats } from './card.js';
import { playBattleHit, playVictory, playDefeat }   from '../sound.js';
import { syncCard, enterQueue, pollQueue }           from '../api.js';
import { resolveBattle, calcXP, NPC_OPPONENTS }      from '../traits.js';

const HAS_SERVER = !!import.meta.env.VITE_API_URL;

function pickOpponent(excludeTokenId) {
  const pool = NPC_OPPONENTS.filter(o => o.tokenId !== excludeTokenId);
  const opp  = pool[Math.floor(Math.random() * pool.length)];
  return { ...opp, level: Math.max(1, Math.floor(Math.random() * 5)), xp: 0, attributes: [] };
}

// ── delay helper ────────────────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Safe text helper ────────────────────────────────────────────────────────
const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// ── Main render ─────────────────────────────────────────────────────────────
export function renderArena(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let myCard = null;
  try { myCard = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  if (!myCard) { navigate('/card'); return; }

  const wrap = document.createElement('div');
  wrap.className = 'arena-wrap';
  wrap.innerHTML = `
    <div class="arena-header">
      <div class="brand-logo arena-logo">ZENKAI</div>
      <div class="arena-wallet-row">
        <span class="arena-addr">${esc(address.slice(0,6))}…${esc(address.slice(-4))}</span>
        <button class="btn-ghost arena-disconnect" id="btn-profile">PROFILE</button>
        <button class="btn-ghost arena-disconnect" id="btn-disconnect">DISCONNECT</button>
      </div>
    </div>

    <div class="arena-scene" id="arena-scene">
      <div class="arena-slot arena-slot-player" id="slot-player">
        <div class="arena-slot-label">YOU</div>
        ${buildCardHTML(myCard)}
      </div>

      <div class="arena-center" id="arena-center">
        <div class="vs-badge" id="vs-badge">VS</div>
        <button class="btn-gold arena-battle-btn" id="btn-battle">FIND BATTLE</button>
        <div class="battle-log" id="battle-log"></div>
      </div>

      <div class="arena-slot arena-slot-opponent" id="slot-opponent">
        <div class="arena-slot-label">OPPONENT</div>
        <div class="arena-slot-unknown" id="slot-unknown">
          <div class="unknown-card">${buildCardBack()}</div>
          <p class="unknown-hint">Find a battle to reveal your opponent</p>
        </div>
      </div>
    </div>

    <div class="arena-record" id="arena-record"></div>
  `;
  app.appendChild(wrap);

  wrap.querySelector('#btn-disconnect').addEventListener('click', () => {
    localStorage.removeItem('zenkai_wallet');
    localStorage.removeItem('zenkai_card');
    navigate('/');
  });

  wrap.querySelector('#btn-profile').addEventListener('click', () => navigate('/profile'));

  const wins   = parseInt(localStorage.getItem('zenkai_wins') || '0');
  const losses = parseInt(localStorage.getItem('zenkai_losses') || '0');
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;

  wrap.querySelector('#btn-battle').addEventListener('click', () => startBattle(wrap, myCard, address));
}

// ── Battle sequence ──────────────────────────────────────────────────────────
async function startBattle(wrap, myCard, address) {
  if (HAS_SERVER) return startBattleServer(wrap, myCard, address);
  return startBattleLocal(wrap, myCard, address);
}

async function startBattleServer(wrap, myCard, address) {
  const btn     = wrap.querySelector('#btn-battle');
  const log     = wrap.querySelector('#battle-log');
  const slotOpp = wrap.querySelector('#slot-opponent');
  const slotMe  = wrap.querySelector('#slot-player');

  btn.disabled    = true;
  btn.textContent = 'SEARCHING…';
  log.innerHTML   = '';

  await syncCard(address, myCard);

  let result = await enterQueue(address, myCard);

  if (result.status === 'waiting') {
    let tries = 0;
    while (result.status === 'waiting' && tries < 15) {
      await wait(2000);
      tries++;
      result = await pollQueue(address);
    }
  }

  if (result.status !== 'matched') {
    btn.disabled    = false;
    btn.textContent = 'FIND BATTLE';
    const msg = document.createElement('div');
    msg.className = 'battle-round round-draw';
    msg.textContent = 'No opponent found. Try again.';
    log.appendChild(msg);
    return;
  }

  const opp = { ...result.opponent.card, level: result.opponent.card?.level || 1, xp: result.opponent.card?.xp || 0 };
  btn.textContent = 'OPPONENT FOUND!';
  slotOpp.innerHTML = `<div class="arena-slot-label">OPPONENT</div>${buildCardHTML(opp)}`;
  slotOpp.querySelector('.zk-card').classList.add('zk-reveal-anim');

  await wait(1000);

  await animateRounds(log, slotMe, slotOpp, result.rounds);

  await wait(800);

  const won  = result.winner === 'p1';
  const draw = result.winner === 'draw';

  if (won) playVictory(); else if (!draw) playDefeat();

  if (result.card) {
    myCard.level = result.card.level;
    myCard.xp    = result.card.xp;
    localStorage.setItem('zenkai_card', JSON.stringify(myCard));
  }

  const totalWins   = result.card?.wins   ?? parseInt(localStorage.getItem('zenkai_wins')   || '0');
  const totalLosses = result.card?.losses ?? parseInt(localStorage.getItem('zenkai_losses') || '0');

  showFinalResult(log, won, draw, myCard, opp);
  updateRecordDisplay(wrap, totalWins, totalLosses);

  slotMe.innerHTML = `<div class="arena-slot-label">YOU</div>${buildCardHTML(myCard)}`;

  btn.disabled    = false;
  btn.textContent = 'BATTLE AGAIN';
  btn.onclick = () => { log.innerHTML = ''; startBattle(wrap, myCard, address); };
}

async function startBattleLocal(wrap, myCard, address) {
  const btn     = wrap.querySelector('#btn-battle');
  const log     = wrap.querySelector('#battle-log');
  const slotOpp = wrap.querySelector('#slot-opponent');
  const slotMe  = wrap.querySelector('#slot-player');

  btn.disabled    = true;
  btn.textContent = 'SEARCHING…';
  log.innerHTML   = '';

  await wait(1200);

  const opp      = pickOpponent(myCard.tokenId);
  const myStats  = deriveStats(myCard.tokenId, myCard.attributes);
  const oppStats = { ...opp };

  // Reveal opponent
  btn.textContent = 'OPPONENT FOUND!';
  slotOpp.innerHTML = `<div class="arena-slot-label">OPPONENT</div>${buildCardHTML(opp)}`;
  slotOpp.querySelector('.zk-card').classList.add('zk-reveal-anim');

  await wait(1000);

  btn.textContent = 'BATTLE!';

  // Resolve battle using trait engine
  const p1 = { ...myStats, level: myCard.level || 1 };
  const p2 = { ...oppStats, level: opp.level || 1 };
  const result = resolveBattle(p1, p2);

  await animateRounds(log, slotMe, slotOpp, result.rounds);

  await wait(800);

  const won  = result.winner === 'p1';
  const draw = result.winner === 'draw';

  if (won) playVictory(); else if (!draw) playDefeat();

  // XP calculation using rarity
  const xpEarned = calcXP(myStats.rarity, oppStats.rarity, won, draw);
  myCard.xp = (myCard.xp || 0) + xpEarned;
  const xpNext = (myCard.level || 1) * 100;
  if (myCard.xp >= xpNext) {
    myCard.xp -= xpNext;
    myCard.level = (myCard.level || 1) + 1;
  }
  localStorage.setItem('zenkai_card', JSON.stringify(myCard));

  if (won) {
    localStorage.setItem('zenkai_wins', String(parseInt(localStorage.getItem('zenkai_wins') || '0') + 1));
  } else if (!draw) {
    localStorage.setItem('zenkai_losses', String(parseInt(localStorage.getItem('zenkai_losses') || '0') + 1));
  }

  showFinalResult(log, won, draw, myCard, opp, xpEarned);

  const wins   = parseInt(localStorage.getItem('zenkai_wins') || '0');
  const losses = parseInt(localStorage.getItem('zenkai_losses') || '0');
  updateRecordDisplay(wrap, wins, losses);

  slotMe.innerHTML = `<div class="arena-slot-label">YOU</div>${buildCardHTML(myCard)}`;

  btn.disabled    = false;
  btn.textContent = 'BATTLE AGAIN';
  btn.onclick = () => { log.innerHTML = ''; startBattle(wrap, myCard, address); };
}

// ── Shared battle animation ─────────────────────────────────────────────────

async function animateRounds(log, slotMe, slotOpp, rounds) {
  const meCard  = slotMe.querySelector('.zk-card');
  const oppCard = slotOpp.querySelector('.zk-card');

  for (const round of rounds) {
    await wait(800);
    playBattleHit();

    if (round.result === 'p1') {
      meCard.classList.add('card-hit-win'); oppCard.classList.add('card-hit-lose');
      setTimeout(() => { meCard.classList.remove('card-hit-win'); oppCard.classList.remove('card-hit-lose'); }, 500);
    } else if (round.result === 'p2') {
      oppCard.classList.add('card-hit-win'); meCard.classList.add('card-hit-lose');
      setTimeout(() => { oppCard.classList.remove('card-hit-win'); meCard.classList.remove('card-hit-lose'); }, 500);
    }

    const roundEl = document.createElement('div');
    roundEl.className = `battle-round ${round.result === 'p1' ? 'round-win' : round.result === 'p2' ? 'round-lose' : 'round-draw'}`;
    roundEl.innerHTML = `
      <span class="round-label">${esc(round.stat)}</span>
      <span class="round-me">${round.p1}</span>
      <span class="round-vs">vs</span>
      <span class="round-opp">${round.p2}</span>
      <span class="round-result">${round.result === 'p1' ? '▶ YOU WIN' : round.result === 'p2' ? '▶ OPP WINS' : '— DRAW'}</span>
    `;
    log.appendChild(roundEl);
  }
}

function showFinalResult(log, won, draw, myCard, opp, xpEarned) {
  const xp = xpEarned ?? (won ? 50 : draw ? 0 : 10);
  const resultEl = document.createElement('div');
  resultEl.className = `battle-final ${won ? 'final-win' : draw ? 'final-draw' : 'final-lose'}`;
  resultEl.innerHTML = won
    ? `<span class="final-text">VICTORY</span><span class="final-xp">+${xp} XP</span>`
    : draw
    ? `<span class="final-text">DRAW</span><span class="final-xp">+${xp} XP</span>`
    : `<span class="final-text">DEFEAT</span><span class="final-xp">+${xp} XP</span>`;
  log.appendChild(resultEl);
}

function updateRecordDisplay(wrap, wins, losses) {
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;
}
