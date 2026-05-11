/**
 * Netlify serverless function: recompute-ratings
 *
 * FEATURE 5 Sprint 3 — Level 2 trust boundary for the ranked
 * categories system. Friends read profiles.{ratings, ratings_ovr}
 * — NOT a user's claimed S.ratings — so this function is the
 * single source of truth for what friends see.
 *
 * Flow:
 *   1. Client (useRatings) calls this with the user's Supabase JWT.
 *   2. We verify the JWT and pull the SAME user_data state the
 *      client sees (via service role — bypasses RLS only to read
 *      THIS user's own row).
 *   3. Run the same derive algorithm as src/lib/ratings/derive.js.
 *   4. Patch profiles.{ratings, ratings_ovr, ratings_computed_at}.
 *
 * Required Netlify env vars (existing):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Anti-gaming notes:
 *   - We derive from RAW user_data state — not whatever the client
 *     claims its ratings are. A user editing S.ratings = {ovr: 99}
 *     doesn't affect what friends see; we recompute from achievements,
 *     trackers, savings, visions, etc.
 *   - JWT auth means a user can only trigger recompute for themselves.
 *   - Rate limited per IP to prevent spam (one valid recompute per
 *     ~5s; bursts are absorbed but doesn't matter — the input data
 *     hasn't changed).
 */

// ── Constants ──────────────────────────────────────────────────────────────
// Mirror src/lib/ratings/derive.js. Update both in lockstep — drift
// is a silent rating bug. The reason we don't import is that Netlify
// functions and the Vite client are separate module graphs.

const DAY_MS = 86_400_000;
const TIME_SPACING_MS = 7 * DAY_MS;
const SAVINGS_MIN_TARGET = 10;
const SAVINGS_TOTAL_CAP = 25_000;
const TRACKER_HISTORY_DAYS = 30;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimits = new Map();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function checkRateLimit(ip) {
  const now = Date.now();
  const e = rateLimits.get(ip) || { count: 0, t: now };
  if (now - e.t > RATE_LIMIT_WINDOW_MS) {
    e.count = 0; e.t = now;
  }
  e.count++;
  rateLimits.set(ip, e);
  return e.count <= RATE_LIMIT_MAX;
}

function clamp(n, lo = 1, hi = 99) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function ymd(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function toRating(points, k = 1) {
  if (!Number.isFinite(points) || points <= 0) return 1;
  return clamp(1 + Math.sqrt(points * k));
}

// ── Derivation (mirrors src/lib/ratings/derive.js) ─────────────────────────

function achievementPoints(state, category) {
  const list = state.achievements || [];
  let points = 0;
  for (const a of list) {
    if (a.category !== category) continue;
    if (!a.completed) continue;
    if (a.createdAt && a.completedAt) {
      if ((a.completedAt - a.createdAt) < TIME_SPACING_MS) continue;
    }
    points += 1;
  }
  return points;
}

function trackerPoints(state, category) {
  const trackers = (state.trackers || []).filter(t => t.category === category);
  if (!trackers.length) return 0;
  const logs = state.logs || {};
  const today = Date.now();
  let total = 0;
  for (const t of trackers) {
    let hits = 0;
    for (let i = 0; i < TRACKER_HISTORY_DAYS; i++) {
      const k = ymd(today - i * DAY_MS);
      const v = logs[k]?.[t.id];
      const truthy = t.type === 'boolean' ? !!v : (Number(v) || 0) > 0;
      if (truthy) hits++;
    }
    total += (hits / TRACKER_HISTORY_DAYS) * 10;
  }
  return total;
}

function savingsPoints(state) {
  const goals = (state.savings || []).filter(g => (g.target || 0) >= SAVINGS_MIN_TARGET);
  if (!goals.length) return 0;
  let target = 0, current = 0;
  for (const g of goals) {
    const cap = SAVINGS_TOTAL_CAP - target;
    if (cap <= 0) break;
    const t = Math.min(g.target, cap);
    const c = Math.min(g.current || 0, t);
    target += t; current += c;
  }
  if (target <= 0) return 0;
  const completion = current / target;
  const scale = Math.min(1, target / SAVINGS_TOTAL_CAP);
  return completion * 30 * (0.5 + 0.5 * scale);
}

function brainScorePoints(state) {
  const bs = state.brainScore;
  if (!bs?.result) return 0;
  const result = Math.max(70, Math.min(130, bs.result));
  return ((result - 70) / 60) * 12 + 6;
}

function socialPoints(state, friendCount = 0) {
  const friends = Math.min(friendCount, 20);
  const logs = state.logs || {};
  const today = Date.now();
  let activeDays = 0;
  for (let i = 0; i < 30; i++) {
    const k = ymd(today - i * DAY_MS);
    if (logs[k] && Object.keys(logs[k]).length > 0) activeDays++;
  }
  return (friends / 20) * 12 + (activeDays / 30) * 16;
}

function visionPoints(state, category) {
  // Server doesn't import the visions definitions module (separate
  // module graph). We approximate by reading visions ids and giving
  // each unlocked vision 8pt (the average xp/4 from definitions).
  // Drift risk is small — if visions definitions get re-weighted the
  // server may lag by a constant factor until this file is updated.
  const stamped = state.visions || {};
  const count = Object.keys(stamped).length;
  // Without category mapping server-side, all visions split equally
  // across the 4 categories: 8pt × count / 4.
  return (8 * count) / 4;
}

function deriveRatings(state, friendCount = 0) {
  const brainPts =
    brainScorePoints(state) +
    trackerPoints(state, 'brain') * 1.0 +
    achievementPoints(state, 'brain') * 2.5 +
    visionPoints(state, 'brain');

  const financePts =
    savingsPoints(state) +
    trackerPoints(state, 'finance') * 1.0 +
    achievementPoints(state, 'finance') * 2.5 +
    visionPoints(state, 'finance');

  const fitnessPts =
    trackerPoints(state, 'fitness') * 1.2 +
    achievementPoints(state, 'fitness') * 2.5 +
    visionPoints(state, 'fitness');

  const socialPts =
    socialPoints(state, friendCount) +
    achievementPoints(state, 'social') * 2.5 +
    visionPoints(state, 'social');

  const brain   = toRating(brainPts);
  const finance = toRating(financePts);
  const fitness = toRating(fitnessPts);
  const social  = toRating(socialPts);
  const ovr     = clamp((brain + finance + fitness + social) / 4);

  return { brain, finance, fitness, social, ovr };
}

// ── Handler ────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'method not allowed' }) };
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'anon';
  if (!checkRateLimit(ip)) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'rate limited' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'supabase env missing' }) };
  }

  // ── Auth: verify the user's JWT ──
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'missing token' }) };
  }
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'invalid token' }) };
  }
  const user = await userRes.json();
  const userId = user?.id;
  if (!userId) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'no user id' }) };
  }

  // ── Read raw state ──
  const stateRes = await fetch(
    `${supabaseUrl}/rest/v1/user_data?id=eq.${userId}&select=state`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!stateRes.ok) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'state read failed' }) };
  }
  const stateRows = await stateRes.json();
  const state = stateRows?.[0]?.state || {};

  // ── Count accepted friendships for the social rating ──
  const friendsRes = await fetch(
    `${supabaseUrl}/rest/v1/friendships?status=eq.accepted&or=(requester_id.eq.${userId},addressee_id.eq.${userId})&select=requester_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const friends = friendsRes.ok ? (await friendsRes.json()).length : 0;

  // ── Derive ──
  const ratings = deriveRatings(state, friends);
  const now = new Date().toISOString();

  // ── Patch profiles ──
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ratings: ratings,
        ratings_ovr: ratings.ovr,
        ratings_computed_at: now,
      }),
    }
  );

  if (!patchRes.ok) {
    const detail = await patchRes.text().catch(() => '');
    return {
      statusCode: 500, headers: CORS,
      body: JSON.stringify({ error: 'profile patch failed', detail }),
    };
  }

  return {
    statusCode: 200, headers: CORS,
    body: JSON.stringify({ ok: true, ratings, computedAt: now }),
  };
};
