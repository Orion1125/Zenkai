// ══════════════════════════════════════════════
// ZENKAI — Background Queue Polling Web Worker
// Runs in a separate thread so browser tab throttling
// doesn't kill matchmaking when the app is minimized.
// ══════════════════════════════════════════════

let polling = false;
let pollInterval = 2000;
let baseUrl = '';
let address = '';
let ticketId = '';
let timer = null;

async function poll() {
  if (!polling || !address || !ticketId) return;

  try {
    const qs = ticketId ? `?ticketId=${encodeURIComponent(ticketId)}` : '';
    const res = await fetch(`${baseUrl}/api/game/queue/${address}${qs}`);
    const data = await res.json();

    ticketId = data.ticketId || ticketId;
    self.postMessage({ type: 'poll_result', data, ticketId });

    if (data.status === 'matched') {
      polling = false;
      return;
    }
    if (data.status === 'superseded' || data.status === 'idle') {
      polling = false;
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'poll_error', error: err.message });
  }

  if (polling) {
    timer = setTimeout(poll, pollInterval);
  }
}

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'start') {
    baseUrl = e.data.baseUrl || '';
    address = e.data.address || '';
    ticketId = e.data.ticketId || '';
    pollInterval = e.data.interval || 2000;
    polling = true;
    clearTimeout(timer);
    poll();
  }

  if (type === 'stop') {
    polling = false;
    clearTimeout(timer);
  }

  if (type === 'update_ticket') {
    ticketId = e.data.ticketId || ticketId;
  }
};
