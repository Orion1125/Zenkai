// ══════════════════════════════════════════════
// ZENKAI — Battle Arena
// ══════════════════════════════════════════════

import { navigate }              from '../router.js';
import { buildCardHTML, buildCardBack, deriveStats } from './card.js';
import { playBattleHit, playVictory, playDefeat }   from '../sound.js';

// ── Opponent pool ────────────────────────────────────────────────────────────
const OPPONENTS = [
  { tokenId: '1337', name: 'SHADOW MONK',    image: '/77f70ec7-eb8e-44ed-9aee-af98932591af.jpg'  },
  { tokenId: '2048', name: 'IRON RONIN',     image: '/9c0a9206-d63d-4d34-bc9b-4188eb44dee3.jpg'  },
  { tokenId: '4096', name: 'VOID SAMURAI',   image: '/be87c65b-fe0d-4189-bacf-8fd22b8dd2db.jpg'  },
  { tokenId: '7777', name: 'BLOOD KNIGHT',   image: '/dafc48fc-9308-42d8-9361-bb2922edf03b.jpg'  },
  { tokenId: '0666', name: 'GHOST STRIKER',  image: '/77f70ec7-eb8e-44ed-9aee-af98932591af.jpg'  },
  { tokenId: '9001', name: 'TITAN WARDEN',   image: '/be87c65b-fe0d-4189-bacf-8fd22b8dd2db.jpg'  },
];

function pickOpponent(excludeTokenId) {
  const pool = OPPONENTS.filter(o => o.tokenId !== excludeTokenId);
  const opp  = pool[Math.floor(Math.random() * pool.length)];
  return { ...opp, level: Math.max(1, Math.floor(Math.random() * 5)), xp: 0 };
}

// ── Stat category battle (returns 'p1'|'p2'|'draw') ─────────────────────────
function statFight(a, b) {
  if (a > b) return 'p1';
  if (b > a) return 'p2';
  return 'draw';
}

// ── delay helper ────────────────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Main render ─────────────────────────────────────────────────────────────
export function renderArena(app) {
  const address = localStorage.getItem('zenkai_wallet');
  if (!address) { navigate('/'); return; }

  let myCard = null;
  try { myCard = JSON.parse(localStorage.getItem('zenkai_card') || 'null'); } catch {}
  if (!myCard) { navigate('/card'); return; }

  // ── Build layout ──────────────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'arena-wrap';
  wrap.innerHTML = `
    <div class="arena-header">
      <div class="brand-logo arena-logo">ZENKAI</div>
      <div class="arena-wallet-row">
        <span class="arena-addr">${address.slice(0,6)}…${address.slice(-4)}</span>
        <button class="btn-ghost arena-disconnect" id="btn-disconnect">DISCONNECT</button>
      </div>
    </div>

    <div class="arena-scene" id="arena-scene">
      <!-- Player card -->
      <div class="arena-slot arena-slot-player" id="slot-player">
        <div class="arena-slot-label">YOU</div>
        ${buildCardHTML(myCard)}
      </div>

      <!-- Center VS column -->
      <div class="arena-center" id="arena-center">
        <div class="vs-badge" id="vs-badge">VS</div>
        <button class="btn-gold arena-battle-btn" id="btn-battle">FIND BATTLE</button>
        <div class="battle-log" id="battle-log"></div>
      </div>

      <!-- Opponent slot -->
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

  // Disconnect
  wrap.querySelector('#btn-disconnect').addEventListener('click', () => {
    localStorage.removeItem('zenkai_wallet');
    localStorage.removeItem('zenkai_card');
    navigate('/');
  });

  // Show record
  const wins   = parseInt(localStorage.getItem('zenkai_wins') || '0');
  const losses = parseInt(localStorage.getItem('zenkai_losses') || '0');
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;

  // Battle flow
  wrap.querySelector('#btn-battle').addEventListener('click', () => startBattle(wrap, myCard, address));
}

// ── Battle sequence ──────────────────────────────────────────────────────────
async function startBattle(wrap, myCard, address) {
  const btn       = wrap.querySelector('#btn-battle');
  const log       = wrap.querySelector('#battle-log');
  const slotOpp   = wrap.querySelector('#slot-opponent');
  const slotMe    = wrap.querySelector('#slot-player');

  btn.disabled    = true;
  btn.textContent = 'SEARCHING…';
  log.innerHTML   = '';

  // Simulate matchmaking delay
  await wait(1200);

  const opp       = pickOpponent(myCard.tokenId);
  const myStats   = deriveStats(myCard.tokenId);
  const oppStats  = deriveStats(opp.tokenId);

  // Reveal opponent card
  btn.textContent = 'OPPONENT FOUND!';
  slotOpp.innerHTML = `
    <div class="arena-slot-label">OPPONENT</div>
    ${buildCardHTML(opp)}
  `;
  const oppCardEl = slotOpp.querySelector('.zk-card');
  oppCardEl.classList.add('zk-reveal-anim');

  await wait(1000);

  // Battle start
  btn.textContent = 'BATTLE!';

  const ROUNDS = [
    { label: 'PWR',  myVal: myStats.pwr,  oppVal: oppStats.pwr  },
    { label: 'DEF',  myVal: myStats.def,  oppVal: oppStats.def  },
    { label: 'SPD',  myVal: myStats.spd,  oppVal: oppStats.spd  },
  ];

  let myWins  = 0;
  let oppWins = 0;

  const meCard  = slotMe.querySelector('.zk-card');
  const oppCard = oppCardEl;

  for (const round of ROUNDS) {
    await wait(800);

    const result = statFight(round.myVal, round.oppVal);
    playBattleHit();

    if (result === 'p1') {
      myWins++;
      meCard.classList.add('card-hit-win');
      oppCard.classList.add('card-hit-lose');
      setTimeout(() => { meCard.classList.remove('card-hit-win'); oppCard.classList.remove('card-hit-lose'); }, 500);
    } else if (result === 'p2') {
      oppWins++;
      oppCard.classList.add('card-hit-win');
      meCard.classList.add('card-hit-lose');
      setTimeout(() => { oppCard.classList.remove('card-hit-win'); meCard.classList.remove('card-hit-lose'); }, 500);
    }

    const roundEl = document.createElement('div');
    roundEl.className = `battle-round ${result === 'p1' ? 'round-win' : result === 'p2' ? 'round-lose' : 'round-draw'}`;
    roundEl.innerHTML = `
      <span class="round-label">${round.label}</span>
      <span class="round-me">${round.myVal}</span>
      <span class="round-vs">vs</span>
      <span class="round-opp">${round.oppVal}</span>
      <span class="round-result">${result === 'p1' ? '▶ YOU WIN' : result === 'p2' ? '▶ OPP WINS' : '— DRAW'}</span>
    `;
    log.appendChild(roundEl);
  }

  // Final result
  await wait(800);

  const won = myWins > oppWins;
  const draw = myWins === oppWins;

  if (won) {
    playVictory();
    // Award XP and maybe level up
    myCard.xp    = (myCard.xp || 0) + 50;
    const xpNext = (myCard.level || 1) * 100;
    if (myCard.xp >= xpNext) {
      myCard.xp    -= xpNext;
      myCard.level  = (myCard.level || 1) + 1;
    }
    localStorage.setItem('zenkai_card', JSON.stringify(myCard));
    localStorage.setItem('zenkai_wins', String(parseInt(localStorage.getItem('zenkai_wins') || '0') + 1));
  } else if (!draw) {
    playDefeat();
    myCard.xp = (myCard.xp || 0) + 10;
    localStorage.setItem('zenkai_card', JSON.stringify(myCard));
    localStorage.setItem('zenkai_losses', String(parseInt(localStorage.getItem('zenkai_losses') || '0') + 1));
  }

  const resultEl = document.createElement('div');
  resultEl.className = `battle-final ${won ? 'final-win' : draw ? 'final-draw' : 'final-lose'}`;
  resultEl.innerHTML = won
    ? `<span class="final-text">VICTORY</span><span class="final-xp">+50 XP</span>`
    : draw
    ? `<span class="final-text">DRAW</span><span class="final-xp">+0 XP</span>`
    : `<span class="final-text">DEFEAT</span><span class="final-xp">+10 XP</span>`;
  log.appendChild(resultEl);

  // Update record display
  const wins   = parseInt(localStorage.getItem('zenkai_wins') || '0');
  const losses = parseInt(localStorage.getItem('zenkai_losses') || '0');
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;

  // Refresh player card display (show updated XP/level)
  slotMe.innerHTML = `<div class="arena-slot-label">YOU</div>${buildCardHTML(myCard)}`;

  // Re-battle button
  btn.disabled    = false;
  btn.textContent = 'BATTLE AGAIN';
  btn.onclick = () => {
    log.innerHTML = '';
    startBattle(wrap, myCard, address);
  };
}
