/**
 * Build a compact, PII-free snapshot of the user's state for the
 * AI Coach. Only sends what the LLM needs to reason about — no
 * photos, no email, no tagline text, no shopping prices, no notes.
 */

const DAY_MS = 86_400_000;

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function trackerSummary(t, logs) {
  // Sum last 7 vs prior 7
  const today = new Date();
  let last7 = 0, prior7 = 0;
  for (let i = 0; i < 14; i++) {
    const k = ymd(new Date(today - i * DAY_MS));
    const v = logs[k]?.[t.id];
    const n = t.type === 'boolean' ? (v ? 1 : 0) : (Number(v) || 0);
    if (i < 7) last7 += n; else prior7 += n;
  }
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    unit: t.unit || null,
    weekly_target: t.weeklyTarget || null,
    goal: t.goal || null,
    last_7_total: last7,
    prior_7_total: prior7,
  };
}

function habitSummary(h) {
  const days = Math.floor((Date.now() - (h.startTime || Date.now())) / DAY_MS);
  return {
    id: h.id,
    name: h.name,
    days_clean: days,
    relapse_count: h.relapseCount || 0,
  };
}

function achievementSummary(a) {
  return {
    id: a.id,
    name: a.name,
    completed: !!a.completed,
    locked: !!a.locked,
    coins: a.coins || 0,
  };
}

export function buildSnapshot(S) {
  const logs = S.logs || {};
  return {
    name: (S.profile?.name || '').split(' ')[0] || 'You',
    coins: S.coins || 0,
    habits: (S.habits || []).map(habitSummary),
    achievements: (S.achievements || []).map(achievementSummary),
    trackers: (S.trackers || []).map(t => trackerSummary(t, logs)),
    holiday_count: (S.holidays || []).length,
    shopping_open_count: (S.shopItems || []).filter(i => !i.bought).length,
  };
}
