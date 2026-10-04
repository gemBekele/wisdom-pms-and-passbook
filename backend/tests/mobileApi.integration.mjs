// Strict adversarial integration test for the Ghion SACCOS mobile API.
// Run: node mobile_api_test.mjs
import { spawnSync } from 'node:child_process';

const BASE = 'http://127.0.0.1:5000';
const API = `${BASE}/api/v1/mobile`;
// Uses stdin (no shell) so bcrypt hashes containing "$" are not mangled.
const PG = (q) =>
  spawnSync(
    'psql',
    ['-U', 'postgres', '-h', 'localhost', '-p', '5432', '-d', 'sako_pms', '-t', '-A'],
    { input: q, env: { ...process.env, PGPASSWORD: 'postgres' } },
  ).stdout
    .toString()
    .trim();

const results = [];
// Clear server-side rate-limit buckets so the suite is repeatable (dev-only hook).
await fetch(`${API}/auth/request-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-reset-rate-limit': '1' }, body: JSON.stringify({ phone: '0912345678' }) }).catch(() => null);
const check = (name, cond, detail = '') => results.push({ name, pass: !!cond, detail });
let mainTok = null;

async function req(path, { method = 'GET', token, body, base = API, rawBody, headers: extra } = {}) {
  const headers = { ...(extra || {}) };
  if (!headers['Content-Type'] && !rawBody) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const resetOtp = () => PG('DELETE FROM mobile_otps;');

async function getMemberToken(phone = '0912345678', pin = '1234') {
  const r = await req('/auth/login', { method: 'POST', body: { phone, pin } });
  return r.json?.token;
}

// ---------- A. AUTH ----------
console.log('== A. Auth ==');
{
  // A1 invalid phones
  for (const [label, phone] of [
    ['missing', undefined],
    ['empty', ''],
    ['too short', '123'],
    ['letters', 'abcd'],
    ['zeroes', '000000000'],
    ['11 digits', '09123456789'],
  ]) {
    const r = await req('/auth/request-otp', { method: 'POST', body: { phone } });
    check(`A1 request-otp [${label}] rejected (${r.status})`, r.status === 400, JSON.stringify(r.json));
  }
  // A1b international format accepted & normalized to same member
  resetOtp();
  const intl = await req('/auth/request-otp', { method: 'POST', body: { phone: '+251912345678' } });
  check('A1b international +251 format accepted', intl.status === 200, `${intl.status} ${JSON.stringify(intl.json)}`);
  resetOtp();
  // A2 unknown phone
  resetOtp();
  let r = await req('/auth/request-otp', { method: 'POST', body: { phone: '0911111111' } });
  check('A2 request-otp unknown phone -> 404', r.status === 404, JSON.stringify(r.json));

  // A3 wrong otp
  resetOtp();
  await req('/auth/request-otp', { method: 'POST', body: { phone: '0912345678' } });
  r = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '000000' } });
  check('A3 wrong otp -> 401', r.status === 401, JSON.stringify(r.json));

  // A4 missing otp
  r = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678' } });
  check('A4 verify-otp missing otp -> 4xx', [400, 401].includes(r.status), JSON.stringify(r.json));

  // A5 verify without request
  resetOtp();
  r = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  check('A5 verify-otp with no issued otp -> 401', r.status === 401, JSON.stringify(r.json));

  // A6 otp single use (reuse blocked)
  resetOtp();
  await req('/auth/request-otp', { method: 'POST', body: { phone: '0912345678' } });
  const v1 = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  const v2 = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  check('A6a first verify ok', v1.status === 200, JSON.stringify(v1.json));
  check('A6b otp reuse blocked', v2.status === 401, JSON.stringify(v2.json));

  // A7 otp attempt lockout (5 wrong => correct also fails)
  resetOtp();
  await req('/auth/request-otp', { method: 'POST', body: { phone: '0912345678' } });
  for (let i = 0; i < 5; i++) {
    await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '999999' } });
  }
  r = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  check('A7 correct otp blocked after 5 wrong attempts -> 401', r.status === 401, JSON.stringify(r.json));

  // A8 expired otp
  resetOtp();
  await req('/auth/request-otp', { method: 'POST', body: { phone: '0912345678' } });
  PG(`UPDATE mobile_otps SET "expiresAt" = timezone('utc', now()) - interval '1 minute';`);
  r = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  check('A8 expired otp -> 401', r.status === 401, JSON.stringify(r.json));

  // A9 set-pin validation
  resetOtp();
  await req('/auth/request-otp', { method: 'POST', body: { phone: '0912345678' } });
  const vr = await req('/auth/verify-otp', { method: 'POST', body: { phone: '0912345678', otp: '123456' } });
  const vTok = vr.json?.token;
  for (const [label, pin] of [
    ['missing', undefined],
    ['empty', ''],
    ['short', '12'],
    ['letters', 'abcd'],
    ['null', null],
  ]) {
    r = await req('/auth/set-pin', { method: 'POST', token: vTok, body: { pin } });
    check(`A9 set-pin [${label}] rejected`, r.status === 400, JSON.stringify(r.json));
  }

  // A10 set-pin without token
  r = await req('/auth/set-pin', { method: 'POST', body: { pin: '1234' } });
  check('A10 set-pin without token -> 401', r.status === 401, JSON.stringify(r.json));

  // A11 login pin lockout -> 423
  for (let i = 0; i < 5; i++) {
    r = await req('/auth/login', { method: 'POST', body: { phone: '0912345678', pin: '9999' } });
  }
  r = await req('/auth/login', { method: 'POST', body: { phone: '0912345678', pin: '1234' } });
  check('A11 pin locked after 5 attempts (correct pin still 423)', r.status === 423, JSON.stringify(r.json));
  PG(`UPDATE members SET "pinAttempts"=0, "pinLockedUntil"=NULL WHERE "phoneNumber"='912345678';`);

  // A12 login unknown phone
  r = await req('/auth/login', { method: 'POST', body: { phone: '0999999999', pin: '1234' } });
  check('A12 login unknown phone -> 401', r.status === 401, JSON.stringify(r.json));

  // Reuse one valid token for the remaining sections (keeps login calls within rate limits)
  mainTok = await getMemberToken();
  check('A12b main token obtainable', !!mainTok, 'login failed');

  // A13 token required everywhere
  for (const path of ['/auth/me', '/overview', '/accounts', '/loans/products']) {
    r = await req(path);
    check(`A13 ${path} without token -> 401`, r.status === 401, JSON.stringify(r.json));
  }

  // A14 garbage / tampered tokens
  r = await req('/accounts', { token: 'garbage' });
  check('A14a garbage token -> 401', r.status === 401, JSON.stringify(r.json));
  r = await req('/accounts', { token: `${mainTok}x` });
  check('A14b tampered token -> 401', r.status === 401, JSON.stringify(r.json));
  r = await req('/accounts', { token: 'Bearer' });
  check('A14c malformed bearer -> 401', r.status === 401, JSON.stringify(r.json));

  // A15 audience separation: mobile token on staff routes
  const mobileTok = mainTok;
  r = await req('/api/auth/me', { base: BASE, token: mobileTok });
  check('A15a mobile token on staff /api/auth/me -> 401', r.status === 401, JSON.stringify(r.json));
  const admin = await req('/auth/login', { base: BASE, method: 'POST', body: { email: 'admin@sako.com', password: 'admin123' } });
  const staffTok = admin.json?.token;
  r = await req('/accounts', { token: staffTok });
  check('A15b staff token on mobile /accounts -> 401', r.status === 401, JSON.stringify(r.json));
  // A15c forged token (userId present, aud mobile, signed with JWT_SECRET) on staff route
  const jwt = (await import('/home/barch/projects/wisdom/Sacko-PMS/backend/node_modules/jsonwebtoken/index.js')).default;
  const SECRET = process.env.JWT_SECRET || 'sako-pms-super-secret-key-change-in-production-2024';
  const forged = jwt.sign({ userId: admin.json?.data?.id, aud: 'mobile' }, SECRET, { expiresIn: '1h' });
  r = await req('/api/auth/me', { base: BASE, token: forged });
  check('A15c forged userId+aud=mobile token on staff route -> 401', r.status === 401, JSON.stringify(r.json));
  r = await req('/accounts', { token: staffTok });
  check('A15d staff token on mobile route still 401 (separate secret)', r.status === 401, JSON.stringify(r.json));
}

// ---------- B. ACCOUNTS / IDOR ----------
console.log('== B. Accounts / IDOR ==');
{
  const tok = mainTok;
  let r = await req('/accounts', { token: tok });
  check('B1 accounts list ok (200, array)', r.status === 200 && Array.isArray(r.json?.data), JSON.stringify(r.json)?.slice(0, 200));
  const nums = (r.json?.data || []).map((a) => a.accountNumber);
  check('B2 seeded accounts present', nums.includes('GH0012345') && nums.includes('GH0045678'), JSON.stringify(nums));

  r = await req('/accounts/GH0012345', { token: tok });
  check('B3 owned account detail 200', r.status === 200, JSON.stringify(r.json)?.slice(0, 120));
  r = await req('/accounts/DOESNOTEXIST', { token: tok });
  check('B4 unknown account -> 404', r.status === 404, JSON.stringify(r.json));

  // B5 transactions + running balance integrity
  r = await req('/accounts/GH0012345/transactions', { token: tok });
  const txs = r.json?.data || [];
  check('B5a transactions 200 array', r.status === 200 && Array.isArray(txs), JSON.stringify(r.json)?.slice(0, 120));
  let okBalance = true;
  for (const tx of txs) {
    if (typeof tx.balanceAfter !== 'number' || typeof tx.amount !== 'number') okBalance = false;
  }
  check('B5b transaction shape has numeric amount/balanceAfter', okBalance && txs.length > 0, JSON.stringify(txs.slice(0, 2)));
  const last = txs[0]; // most recent first
  const acc = (await req('/accounts/GH0012345', { token: tok })).json?.data;
  check('B5c transactions not empty', Array.isArray(txs) && txs.length > 0, `len=${txs.length}`);
  if (last && acc) {
    check('B5d newest balanceAfter == current balance', Math.abs(last.balanceAfter - acc.balance) < 0.01, `${last.balanceAfter} vs ${acc.balance}`);
  }

  // B6 IDOR: second member must NOT see member-1 accounts
  const hash = (await import('/home/barch/projects/wisdom/Sacko-PMS/backend/node_modules/bcryptjs/index.js')).default;
  const pinHash = hash.hashSync('1234', 10);
  PG(`INSERT INTO members ("_id","phoneNumber","fullName","pinHash","pinAttempts","isActive","createdAt","updatedAt") VALUES (gen_random_uuid(),'999000111','Other Member','${pinHash}',0,true,now(),now()) ON CONFLICT ("phoneNumber") DO UPDATE SET "pinHash"=EXCLUDED."pinHash", "fullName"=EXCLUDED."fullName", "isActive"=true, "pinAttempts"=0, "pinLockedUntil"=NULL;`);
  const otherTok = await getMemberToken('0999000111', '1234');
  r = await req('/accounts/GH0012345', { token: otherTok });
  check('B6a IDOR: other member cannot read member-1 account -> 404', r.status === 404, JSON.stringify(r.json));
  r = await req('/accounts/GH0012345/transactions', { token: otherTok });
  check('B6b IDOR: other member cannot read member-1 transactions -> 404', r.status === 404, JSON.stringify(r.json));
  r = await req('/accounts', { token: otherTok });
  check('B6c other member sees own (empty) account list', r.status === 200, JSON.stringify(r.json?.data));

  // B7 SQL-ish injection in account number
  r = await req('/accounts/GH0012345%27%3B%20DROP%20TABLE%20members--', { token: tok });
  check('B7 SQL injection attempt does not crash (4xx)', r.status === 404, JSON.stringify(r.json));
  const alive = await req('/accounts', { token: tok });
  check('B7b members table intact after injection attempt', alive.status === 200, JSON.stringify(alive.json));
}

// ---------- C. LOANS ----------
console.log('== C. Loans ==');
{
  const tok = mainTok;
  let r = await req('/loans/eligibility', { token: tok });
  check('C1 eligibility 200', r.status === 200 && r.json?.data?.status === 'eligible', JSON.stringify(r.json));

  r = await req('/loans/products', { token: tok });
  check('C2 products 200 array', r.status === 200 && Array.isArray(r.json?.data), JSON.stringify(r.json));

  const cases = [
    ['below min', { productId: 'lp-conventional', amount: 100, termMonths: 12 }, 400],
    ['above max', { productId: 'lp-conventional', amount: 900000, termMonths: 12 }, 400],
    ['term above max', { productId: 'lp-conventional', amount: 10000, termMonths: 36 }, 400],
    ['negative amount', { productId: 'lp-conventional', amount: -5000, termMonths: 12 }, 400],
    ['zero amount', { productId: 'lp-conventional', amount: 0, termMonths: 12 }, 400],
    ['NaN amount', { productId: 'lp-conventional', amount: 'abc', termMonths: 12 }, 400],
    ['negative term', { productId: 'lp-conventional', amount: 10000, termMonths: -3 }, 400],
    ['zero term', { productId: 'lp-conventional', amount: 10000, termMonths: 0 }, 400],
    ['unknown product', { productId: 'nope', amount: 10000, termMonths: 12 }, 400],
    ['missing product', { amount: 10000, termMonths: 12 }, 400],
    ['missing amount', { productId: 'lp-conventional', termMonths: 12 }, 400],
    ['missing term', { productId: 'lp-conventional', amount: 10000 }, 400],
  ];
  for (const [label, body, want] of cases) {
    r = await req('/loans/requests', { method: 'POST', token: tok, body });
    check(`C3 create-request [${label}] -> ${want}`, r.status === want, `${r.status} ${JSON.stringify(r.json)}`);
  }

  r = await req('/loans/requests', { method: 'POST', token: tok, body: { productId: 'lp-conventional', amount: 60000, termMonths: 12 } });
  check('C4 valid create -> 201', r.status === 201, JSON.stringify(r.json));
  r = await req('/loans/requests', { token: tok });
  check('C5 list includes created', r.status === 200 && (r.json?.data || []).some((x) => x.amount === 60000), JSON.stringify(r.json));
}

// ---------- D. HTTP / robustness ----------
console.log('== D. HTTP robustness ==');
{
  const tok = mainTok;
  let r = await req('/auth/login', { method: 'POST', rawBody: '{bad json', headers: { 'Content-Type': 'application/json' } });
  check('D1 malformed JSON -> 400', r.status === 400, `${r.status} ${JSON.stringify(r.json)}`);
  r = await req('/auth/login', { method: 'POST', rawBody: 'x'.repeat(200000), headers: { 'Content-Type': 'application/json' } });
  check('D2 oversized body -> 413', r.status === 413, `${r.status} ${JSON.stringify(r.json)}`);
  r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, rawBody: 'hello' });
  check('D3 wrong content-type handled (4xx)', [400, 401].includes(r.status), `${r.status} ${JSON.stringify(r.json)}`);
  r = await req('/nope/unknown', { token: tok });
  check('D4 unknown mobile route -> 404', r.status === 404, `${r.status}`);
  r = await req('/accounts', { method: 'OPTIONS' });
  check('D5 CORS preflight -> 204/200', [200, 204].includes(r.status), `${r.status}`);
  r = await req('/auth/me', { token: tok, method: 'DELETE' });
  check('D6 wrong method -> 404/405', [404, 405].includes(r.status), `${r.status}`);

  // D7 rate limit on request-otp (per phone+ip)
  const burst = [];
  for (let i = 0; i < 16; i++) {
    burst.push((await req('/auth/request-otp', { method: 'POST', body: { phone: '0922222222' } })).status);
  }
  check('D7 request-otp rate limited (429 seen in burst of 16)', burst.includes(429), JSON.stringify(burst));

  // D8 rate limit on login
  const logins = [];
  for (let i = 0; i < 30; i++) {
    logins.push((await req('/auth/login', { method: 'POST', body: { phone: '0922333444', pin: '0000' } })).status);
  }
  check('D8 login rate limited (429 seen in burst of 30)', logins.includes(429), JSON.stringify(logins));
}

// ---------- E. Concurrency ----------
console.log('== E. Concurrency ==');
{
  const tok = mainTok;
  const before = (await req('/loans/requests', { token: tok })).json?.data || [];
  const beforeCount = before.filter((x) => x.amount === 30000 || x.amount === 40000).length;
  const [a, b] = await Promise.all([
    req('/loans/requests', { method: 'POST', token: tok, body: { productId: 'lp-ifb', amount: 30000, termMonths: 12 } }),
    req('/loans/requests', { method: 'POST', token: tok, body: { productId: 'lp-ifb', amount: 40000, termMonths: 18 } }),
  ]);
  check('E1 concurrent creates both succeed', a.status === 201 && b.status === 201, `${a.status} ${b.status}`);
  const r = await req('/loans/requests', { token: tok });
  const count = (r.json?.data || []).filter((x) => x.amount === 30000 || x.amount === 40000).length;
  check('E2 both persisted (delta 2)', count - beforeCount === 2, `${count} (before ${beforeCount})`);

  resetOtp();
  const [o1, o2] = await Promise.all([
    req('/auth/request-otp', { method: 'POST', body: { phone: '0999000111' } }),
    req('/auth/request-otp', { method: 'POST', body: { phone: '0999000111' } }),
  ]);
  check('E3 concurrent request-otp ok', o1.status === 200 && o2.status === 200, `${o1.status} ${o2.status}`);
}

// ---------- F. Response shape ----------
console.log('== F. Response shape ==');
{
  const tok = mainTok;
  for (const path of ['/overview', '/accounts', '/auth/me', '/loans/eligibility', '/loans/products', '/loans/requests']) {
    const r = await req(path, { token: tok });
    check(`F1 ${path} success envelope`, r.status === 200 && r.json?.success === true && 'data' in r.json, `${r.status}`);
  }
  const me = (await req('/auth/me', { token: tok })).json?.data;
  check('F2 profile shape', me && me.fullName && me.phone, JSON.stringify(me));
}

// ---------- REPORT ----------
console.log('\n========== REPORT ==========');
let fails = 0;
for (const { name, pass, detail } of results) {
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail && !pass ? '  -> ' + detail : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);