// ══════════════════════════════════════════════
// ZENKAI — Battle Arena (trait-based battle engine)
// ══════════════════════════════════════════════

import { navigate }              from '../router.js';
import { buildCardHTML, buildCardBack, deriveStats } from './card.js';
import { playBattleHit, playVictory, playDefeat }   from '../sound.js';
import { syncCard, enterQueue, pollQueue, cancelQueue } from '../api.js';
import { resolveBattle, calcXP, NPC_OPPONENTS }      from '../traits.js';
import { buildEquipmentCardView, getForgeShardReward, getFreeTrackLevels, getStarterLoadout } from '../game/equipment-system.js';

const HAS_SERVER = !!import.meta.env.VITE_API_URL;
const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Background queue worker ────────────────────────────────────────────────
let queueWorker = null;

function getQueueWorker() {
  if (!queueWorker) {
    queueWorker = new Worker(new URL('../queue-worker.js', import.meta.url), { type: 'module' });
  }
  return queueWorker;
}

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

  const wins   = Number(myCard.wins ?? localStorage.getItem('zenkai_wins') ?? 0);
  const losses = Number(myCard.losses ?? localStorage.getItem('zenkai_losses') ?? 0);
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;

  wrap.querySelector('#btn-battle').onclick = () => startBattle(wrap, myCard, address);

  // Resume queue if user navigated away and came back while still in queue
  if (HAS_SERVER) {
    try {
      const saved = JSON.parse(localStorage.getItem('zenkai_queue') || 'null');
      if (saved && saved.address === address && saved.ticketId && (Date.now() - saved.startedAt) < 90000) {
        pollQueue(address, saved.ticketId).then((data) => {
          if (data.status === 'matched') {
            localStorage.removeItem('zenkai_queue');
            // Auto-resume the matched battle
            startBattle(wrap, myCard, address);
          } else if (data.status === 'waiting') {
            startBattle(wrap, myCard, address);
          } else {
            localStorage.removeItem('zenkai_queue');
          }
        }).catch(() => localStorage.removeItem('zenkai_queue'));
      } else {
        localStorage.removeItem('zenkai_queue');
      }
    } catch { localStorage.removeItem('zenkai_queue'); }
  }
}

// ── Battle sequence ──────────────────────────────────────────────────────────
async function startBattle(wrap, myCard, address) {
  if (HAS_SERVER) return startBattleServerV2(wrap, myCard, address);
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
  let ticketId = result.ticketId || null;

  if (result.status === 'waiting') {
    let tries = 0;
    while (result.status === 'waiting' && tries < 45) {
      await wait(2000);
      tries++;
      btn.textContent = `SEARCHING… ${tries * 2}s`;
      result = await pollQueue(address, ticketId);
      ticketId = result.ticketId || ticketId;
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
  const previousForgeShards = parseInt(localStorage.getItem('zenkai_forge_shards') || String(myCard.forge_shards || 0), 10) || 0;

  if (won) playVictory(); else if (!draw) playDefeat();

  if (result.card) {
    myCard.level = result.card.level;
    myCard.xp    = result.card.xp;
    myCard.competitive_rating = result.card.competitive_rating;
    myCard.competitive_tier = result.card.competitive_tier;
    myCard.competitive_matches = result.card.competitive_matches;
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

async function startBattleServerV2(wrap, myCard, address) {
  const btn     = wrap.querySelector('#btn-battle');
  const log     = wrap.querySelector('#battle-log');
  const slotOpp = wrap.querySelector('#slot-opponent');
  const slotMe  = wrap.querySelector('#slot-player');
  const resetBattleButton = (label = 'FIND BATTLE') => {
    btn.disabled = false;
    btn.textContent = label;
    btn.onclick = () => startBattle(wrap, myCard, address);
  };
  const search = { cancelled: false, cancelResult: null, ticketId: null };

  btn.disabled    = true;
  btn.textContent = 'ENTERING QUEUE\u2026';
  log.innerHTML   = '';
  wrap._searchSession = search;

  await syncCard(address, myCard);

  let result = await enterQueue(address, myCard);
  let ticketId = result.ticketId || null;
  search.ticketId = ticketId;

  if (result.status === 'waiting') {
    // Persist queue state so we can resume after minimize/restore
    localStorage.setItem('zenkai_queue', JSON.stringify({ address, ticketId, startedAt: Date.now() }));

    btn.disabled = false;
    btn.textContent = 'CANCEL SEARCH';
    btn.onclick = async () => {
      if (search.cancelled) return;
      search.cancelled = true;
      btn.disabled = true;
      btn.textContent = 'CANCELLING\u2026';
      worker.postMessage({ type: 'stop' });
      try {
        search.cancelResult = await cancelQueue(address, search.ticketId);
      } catch {
        search.cancelResult = { status: 'cancelled', ticketId: search.ticketId };
      }
    };

    // Use Web Worker for background-safe polling
    const worker = getQueueWorker();
    const pollPromise = new Promise((resolve) => {
      const startedAt = Date.now();
      const onMessage = (e) => {
        if (search.cancelled) { worker.removeEventListener('message', onMessage); resolve(); return; }
        if (e.data.type === 'poll_result') {
          const data = e.data.data;
          ticketId = e.data.ticketId || ticketId;
          search.ticketId = ticketId;
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          btn.textContent = `CANCEL SEARCH \u2022 ${elapsed}s`;

          if (data.status === 'matched') {
            result = data;
            worker.removeEventListener('message', onMessage);
            resolve();
          } else if (data.status === 'superseded' || data.status === 'idle') {
            result = data;
            worker.removeEventListener('message', onMessage);
            resolve();
          }
          // Update localStorage so visibility handler can read latest ticket
          localStorage.setItem('zenkai_queue', JSON.stringify({ address, ticketId, startedAt }));
        }
      };
      worker.addEventListener('message', onMessage);

      // Also stop after 90s max
      setTimeout(() => { if (!search.cancelled && result.status === 'waiting') { worker.postMessage({ type: 'stop' }); resolve(); } }, 90000);
    });

    worker.postMessage({ type: 'start', baseUrl: API_BASE, address, ticketId, interval: 2000 });

    // Visibility API: when app comes back to foreground, do an instant poll
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || search.cancelled) return;
      try {
        const fresh = await pollQueue(address, search.ticketId);
        if (fresh.status === 'matched') {
          result = fresh;
          worker.postMessage({ type: 'stop' });
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVisible);

    await pollPromise;

    document.removeEventListener('visibilitychange', onVisible);
    localStorage.removeItem('zenkai_queue');
  }

  if (search.cancelled) {
    const cancelResult = search.cancelResult || { status: 'cancelled', ticketId };

    if (cancelResult.status === 'matched') {
      result = cancelResult;
    } else if (cancelResult.status === 'waiting' && cancelResult.phase) {
      btn.disabled = true;
      btn.textContent = 'FINALIZING MATCH\u2026';
      result = cancelResult;

      let gracePolls = 0;
      while (result.status === 'waiting' && gracePolls < 10) {
        await wait(1000);
        gracePolls++;
        result = await pollQueue(address, ticketId);
        ticketId = result.ticketId || ticketId;
      }
    } else {
      wrap._searchSession = null;
      resetBattleButton();
      const msg = document.createElement('div');
      msg.className = 'battle-round round-draw';
      msg.textContent = 'Search cancelled.';
      log.appendChild(msg);
      return;
    }
  }

  if (result.status !== 'matched') {
    wrap._searchSession = null;
    if (ticketId) {
      try { await cancelQueue(address, ticketId); } catch {}
    }
    resetBattleButton();
    const msg = document.createElement('div');
    msg.className = 'battle-round round-draw';
    msg.textContent = 'No opponent found. Try again.';
    log.appendChild(msg);
    return;
  }

  const opp = { ...result.opponent.card, level: result.opponent.card?.level || 1, xp: result.opponent.card?.xp || 0 };
  btn.disabled = true;
  btn.textContent = 'OPPONENT FOUND!';
  slotOpp.innerHTML = `<div class="arena-slot-label">OPPONENT</div>${buildCardHTML(opp)}`;
  slotOpp.querySelector('.zk-card').classList.add('zk-reveal-anim');

  await wait(1000);
  await animateRounds(log, slotMe, slotOpp, result.rounds);
  await wait(800);

  const won  = result.winner === 'p1';
  const draw = result.winner === 'draw';
  const previousForgeShards = parseInt(localStorage.getItem('zenkai_forge_shards') || String(myCard.forge_shards || 0), 10) || 0;

  if (won) playVictory(); else if (!draw) playDefeat();

  if (result.card) {
    myCard.level = result.card.level;
    myCard.xp    = result.card.xp;
    myCard.wins = result.card.wins ?? myCard.wins;
    myCard.losses = result.card.losses ?? myCard.losses;
    myCard.hp = result.card.hp ?? myCard.hp;
    myCard.equipmentLoadout = result.card.equipmentLoadout || myCard.equipmentLoadout;
    myCard.equipmentLevels = result.card.equipmentLevels || myCard.equipmentLevels;
    myCard.forge_shards = result.card.forge_shards ?? myCard.forge_shards;
    myCard.competitive_rating = result.card.competitive_rating ?? myCard.competitive_rating;
    myCard.competitive_tier = result.card.competitive_tier ?? myCard.competitive_tier;
    myCard.competitive_matches = result.card.competitive_matches ?? myCard.competitive_matches;
    if (result.card.forge_shards != null) {
      localStorage.setItem('zenkai_forge_shards', String(result.card.forge_shards));
    }
    localStorage.setItem('zenkai_card', JSON.stringify(myCard));
  }

  const totalWins   = result.card?.wins   ?? parseInt(localStorage.getItem('zenkai_wins')   || '0');
  const totalLosses = result.card?.losses ?? parseInt(localStorage.getItem('zenkai_losses') || '0');
  localStorage.setItem('zenkai_wins', String(totalWins));
  localStorage.setItem('zenkai_losses', String(totalLosses));

  showFinalResult(log, won, draw, myCard, opp, undefined, result.card?.forge_shards != null ? (result.card.forge_shards - previousForgeShards) : undefined);
  updateRecordDisplay(wrap, totalWins, totalLosses);

  slotMe.innerHTML = `<div class="arena-slot-label">YOU</div>${buildCardHTML(myCard)}`;
  wrap._searchSession = null;
  resetBattleButton('BATTLE AGAIN');
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

  const rawOpp   = pickOpponent(myCard.tokenId);
  const opp      = buildEquipmentCardView(
    rawOpp,
    getStarterLoadout(rawOpp.element),
    getFreeTrackLevels(rawOpp.element),
    rawOpp.element
  );
  const myStats  = deriveStats(myCard.tokenId, myCard.attributes);
  const myBattleCard = buildEquipmentCardView(
    { ...myCard, ...myStats, level: myCard.level || 1, ability: myStats.ability, rarity: myStats.rarity, element: myStats.element },
    myCard.equipmentLoadout,
    myCard.equipmentLevels,
    myStats.element
  );
  const oppStats = { ...opp };

  // Reveal opponent
  btn.textContent = 'OPPONENT FOUND!';
  slotOpp.innerHTML = `<div class="arena-slot-label">OPPONENT</div>${buildCardHTML(opp)}`;
  slotOpp.querySelector('.zk-card').classList.add('zk-reveal-anim');

  await wait(1000);

  btn.textContent = 'BATTLE!';

  // Resolve battle using trait engine
  const result = resolveBattle(myBattleCard, oppStats);

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
    myCard.wins = (myCard.wins || 0) + 1;
    localStorage.setItem('zenkai_wins', String(myCard.wins));
  } else if (!draw) {
    myCard.losses = (myCard.losses || 0) + 1;
    localStorage.setItem('zenkai_losses', String(myCard.losses));
  }

  const forgeReward = getForgeShardReward(won ? 'win' : draw ? 'draw' : 'loss', 1500, 1500);
  myCard.forge_shards = (parseInt(localStorage.getItem('zenkai_forge_shards') || String(myCard.forge_shards || 0), 10) || 0) + forgeReward;
  localStorage.setItem('zenkai_forge_shards', String(myCard.forge_shards));
  localStorage.setItem('zenkai_card', JSON.stringify(myCard));
  showFinalResult(log, won, draw, myCard, opp, xpEarned, forgeReward);

  const wins   = parseInt(localStorage.getItem('zenkai_wins') || '0');
  const losses = parseInt(localStorage.getItem('zenkai_losses') || '0');
  updateRecordDisplay(wrap, wins, losses);

  slotMe.innerHTML = `<div class="arena-slot-label">YOU</div>${buildCardHTML(myCard)}`;

  btn.disabled    = false;
  btn.textContent = 'BATTLE AGAIN';
  btn.onclick = () => { log.innerHTML = ''; startBattle(wrap, myCard, address); };
}

// ── Shared battle animation ─────────────────────────────────────────────────

async function animateRoundsLegacy(log, slotMe, slotOpp, rounds) {
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

function showFinalResultLegacy(log, won, draw, myCard, opp, xpEarned) {
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

async function animateRounds(log, slotMe, slotOpp, rounds) {
  const meCard  = slotMe.querySelector('.zk-card');
  const oppCard = slotOpp.querySelector('.zk-card');

  for (const round of rounds) {
    await wait(700);

    for (const action of round.actions || []) {
      playBattleHit();
      const actorCard = action.actor === 'p1' ? meCard : oppCard;
      const defenderCard = action.actor === 'p1' ? oppCard : meCard;
      actorCard.classList.add('card-hit-win');
      defenderCard.classList.add('card-hit-lose');
      setTimeout(() => {
        actorCard.classList.remove('card-hit-win');
        defenderCard.classList.remove('card-hit-lose');
      }, 450);
      await wait(180);
    }

    const actionLines = (round.actions || []).map((action) => {
      const actor = action.actor === 'p1' ? 'YOU' : 'OPP';
      const target = action.target === 'p1' ? 'YOU' : 'OPP';
      const notes = (action.notes || []).length ? ` • ${(action.notes || []).join(', ')}` : '';
      return `<div class="battle-round-line">${actor} → ${target} ${action.damage} dmg${action.heal ? ` • +${action.heal} heal` : ''}${notes}</div>`;
    }).join('');
    const startNotes = [...(round.start?.p1 || []), ...(round.start?.p2 || [])]
      .map((note) => `<div class="battle-round-note">${esc(note)}</div>`)
      .join('');
    const endNotes = (round.endNotes || [])
      .map((note) => `<div class="battle-round-note">${esc(note)}</div>`)
      .join('');
    const stateClass = round.leader === 'p1' ? 'round-win' : round.leader === 'p2' ? 'round-lose' : 'round-draw';

    const roundEl = document.createElement('div');
    roundEl.className = `battle-round battle-round-v2 ${stateClass}`;
    roundEl.innerHTML = `
      <div class="battle-round-head">
        <span class="battle-round-title">ROUND ${round.round}</span>
        <span class="battle-round-state">${round.leader === 'p1' ? 'YOU LEAD' : round.leader === 'p2' ? 'OPP LEADS' : 'DEAD EVEN'}</span>
      </div>
      ${startNotes}
      ${actionLines}
      ${endNotes}
      <div class="battle-round-foot">
        <span>YOU ${round.end?.p1?.hp || 0}/${round.end?.p1?.hpMax || 0} HP${round.end?.p1?.shield ? ` • SH ${round.end.p1.shield}` : ''}</span>
        <span>OPP ${round.end?.p2?.hp || 0}/${round.end?.p2?.hpMax || 0} HP${round.end?.p2?.shield ? ` • SH ${round.end.p2.shield}` : ''}</span>
      </div>
    `;
    log.appendChild(roundEl);
  }
}

function showFinalResult(log, won, draw, myCard, opp, xpEarned, forgeEarned) {
  const xp = xpEarned ?? (won ? 50 : draw ? 0 : 10);
  const shardText = forgeEarned != null ? ` • +${forgeEarned} FS` : '';
  const resultEl = document.createElement('div');
  resultEl.className = `battle-final ${won ? 'final-win' : draw ? 'final-draw' : 'final-lose'}`;
  resultEl.innerHTML = won
    ? `<span class="final-text">VICTORY</span><span class="final-xp">+${xp} XP${shardText}</span>`
    : draw
    ? `<span class="final-text">DRAW</span><span class="final-xp">+${xp} XP${shardText}</span>`
    : `<span class="final-text">DEFEAT</span><span class="final-xp">+${xp} XP${shardText}</span>`;
  log.appendChild(resultEl);
}

function updateRecordDisplay(wrap, wins, losses) {
  wrap.querySelector('#arena-record').innerHTML =
    `<span class="record-label">RECORD</span>
     <span class="record-wins">${wins}W</span>
     <span class="record-sep">/</span>
     <span class="record-losses">${losses}L</span>`;
}
