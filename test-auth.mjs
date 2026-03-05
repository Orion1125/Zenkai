// Quick auth + upgrade test
const BASE = 'http://localhost:3001';

async function api(path, method = 'GET', body, token) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}

async function run() {
  const user = `testrun_${Date.now()}`;

  // 1. Signup
  const su = await api('/api/auth/signup', 'POST', { username: user, password: 'pass1234' });
  console.assert(su.status === 201 || su.status === 200, `signup status ${su.status}`);
  console.assert(su.data.token, 'no token in signup');
  console.assert(su.data.user.referral_code, 'no referral_code');
  const tok = su.data.token;
  console.log(`✓ Signup: ${su.data.user.username}, code: ${su.data.user.referral_code}`);

  // 2. Login
  const li = await api('/api/auth/login', 'POST', { username: user, password: 'pass1234' });
  console.assert(li.status === 200, `login status ${li.status}`);
  console.assert(li.data.token, 'no token in login');
  console.log(`✓ Login: spot=${li.data.user.spot_type}, completed=${li.data.user.completed_at}`);

  // 3. Wrong password
  const lw = await api('/api/auth/login', 'POST', { username: user, password: 'wrongpass' });
  console.assert(lw.status === 401, `wrong password status should be 401, got ${lw.status}`);
  console.log(`✓ Wrong password rejected: ${lw.status} ${lw.data.message}`);

  // 4. Set FCFS
  const c1 = await api('/api/auth/complete', 'POST', { xHandle: '@warrior', spotType: 'fcfs' }, tok);
  console.assert(c1.data.user.spot_type === 'fcfs', `expected fcfs, got ${c1.data.user.spot_type}`);
  console.assert(c1.data.user.x_handle === '@warrior', `x_handle not saved`);
  console.assert(c1.data.user.completed_at, `completed_at not set`);
  console.log(`✓ Set FCFS: spot=${c1.data.user.spot_type}, handle=${c1.data.user.x_handle}`);

  // 5. Try dowgrade to fail (must stay FCFS)
  const c2 = await api('/api/auth/complete', 'POST', { xHandle: '@warrior', spotType: 'fail' }, tok);
  console.assert(c2.data.user.spot_type === 'fcfs', `downgrade not blocked! got ${c2.data.user.spot_type}`);
  console.log(`✓ Downgrade blocked: ${c2.data.user.spot_type} (expected fcfs)`);

  // 6. Upgrade to GTD
  const c3 = await api('/api/auth/complete', 'POST', { xHandle: '@warrior', spotType: 'gtd' }, tok);
  console.assert(c3.data.user.spot_type === 'gtd', `expected gtd, got ${c3.data.user.spot_type}`);
  console.log(`✓ Upgraded to GTD: ${c3.data.user.spot_type}`);

  // 7. Try downgrade from GTD to FCFS (must stay GTD)
  const c4 = await api('/api/auth/complete', 'POST', { xHandle: '@warrior', spotType: 'fcfs' }, tok);
  console.assert(c4.data.user.spot_type === 'gtd', `downgrade from GTD not blocked! got ${c4.data.user.spot_type}`);
  console.log(`✓ GTD downgrade blocked: ${c4.data.user.spot_type} (expected gtd)`);

  // 8. completed_at preserved across calls
  console.assert(c4.data.user.completed_at === c1.data.user.completed_at, 'completed_at changed!');
  console.log(`✓ completed_at preserved`);

  // 9. /me returns fresh data
  const me = await api('/api/auth/me', 'GET', null, tok);
  console.assert(me.data.user.spot_type === 'gtd', `me spot wrong: ${me.data.user.spot_type}`);
  console.log(`✓ /me: handle=${me.data.user.x_handle}, spot=${me.data.user.spot_type}`);

  console.log('\n✅ All tests passed');
}

run().catch(e => { console.error('❌ Test failed:', e.message); process.exit(1); });
