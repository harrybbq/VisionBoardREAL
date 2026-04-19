/**
 * AI Coach — heuristic insight engine
 *
 * Pure functions. No side effects, no API calls. Given the user's state,
 * returns a ranked list of candidate insights. The widget picks the
 * highest-priority one not seen recently.
 *
 * Each insight:
 *   { id, priority, title, body, verb? }
 *
 *   id        unique key for de-duplication / "seen" tracking
 *   priority  0–100; higher wins. Risk/decline outranks celebration.
 *   title     short hook (5–8 words)
 *   body      one-sentence elaboration
 *   verb?     optional { label, action, args } — wired up in step 4
 */

const DAY_MS = 86_400_000;

// ── Date helpers ──────────────────────────────────────────────────────────

function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoYmd(n) {
  return ymd(new Date(Date.now() - n * DAY_MS));
}

function rangeYmd(startDaysAgo, endDaysAgo) {
  const out = [];
  for (let i = startDaysAgo; i >= endDaysAgo; i--) out.push(daysAgoYmd(i));
  return out;
}

// ── Tracker analysis ──────────────────────────────────────────────────────

/**
 * Compare last 7 days vs prior 7 days for each tracker.
 * Returns { trackerId: { current, previous, deltaPct } }.
 */
function trackerTrends(S) {
  const logs = S.logs || {};
  const trackers = S.trackers || [];
  const last7 = rangeYmd(6, 0);
  const prior7 = rangeYmd(13, 7);

  const sumRange = (id, dates, type) =>
    dates.reduce((acc, k) => {
      const v = logs[k]?.[id];
      if (type === 'boolean') return acc + (v ? 1 : 0);
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

  const out = {};
  trackers.forEach(t => {
    const current = sumRange(t.id, last7, t.type);
    const previous = sumRange(t.id, prior7, t.type);
    const deltaPct = previous === 0
      ? (current > 0 ? 100 : 0)
      : Math.round(((current - previous) / previous) * 100);
    out[t.id] = { current, previous, deltaPct };
  });
  return out;
}

// ── Habit analysis ────────────────────────────────────────────────────────

function habitDanger(habit) {
  // Simple risk score based on relapse history weekday/hour clustering
  // (we only have startTime + relapseCount today, so approximate)
  const days = Math.floor((Date.now() - (habit.startTime || Date.now())) / DAY_MS);
  const relapses = habit.relapseCount || 0;
  const avgDaysBetween = relapses > 0 ? days / (relapses + 1) : Infinity;
  return { days, relapses, avgDaysBetween };
}

// ── Achievement analysis ──────────────────────────────────────────────────

function staleAchievements(S) {
  // Achievements without `completed` and not `locked` that have been
  // sitting on the board (proxied by missing recent coin events for them).
  const open = (S.achievements || []).filter(a => !a.completed && !a.locked);
  return open;
}

// ── Cross-domain ──────────────────────────────────────────────────────────

function activeStreaks(S) {
  const trends = trackerTrends(S);
  return Object.entries(trends)
    .filter(([, v]) => v.current >= 4 && v.deltaPct >= 0)
    .map(([id]) => (S.trackers || []).find(t => t.id === id))
    .filter(Boolean);
}

// ── Insight builders ──────────────────────────────────────────────────────

function firstName(S) {
  return (S.profile?.name || '').split(' ')[0] || 'You';
}

function buildInsights(S) {
  const name = firstName(S);
  const out = [];

  // 1. Tracker decline (highest priority — catch problems early)
  const trends = trackerTrends(S);
  Object.entries(trends).forEach(([id, t]) => {
    const tr = (S.trackers || []).find(x => x.id === id);
    if (!tr) return;
    if (t.previous >= 3 && t.deltaPct <= -40) {
      out.push({
        id: `decline:${id}:${ymd()}`,
        priority: 90,
        title: `${tr.name} is slipping`,
        body: `${name}, you logged ${t.current} ${tr.type === 'boolean' ? 'sessions' : (tr.unit || '')} this week — down ${Math.abs(t.deltaPct)}% from last week. What changed?`,
      });
    }
  });

  // 2. Habit danger window (if relapses are clustering)
  (S.habits || []).forEach(h => {
    const d = habitDanger(h);
    if (d.relapses > 0 && d.days >= 14 && d.avgDaysBetween < 7) {
      out.push({
        id: `habit-risk:${h.id}:${daysAgoYmd(0)}`,
        priority: 85,
        title: `Watch out with "${h.name}"`,
        body: `${name}, your average clean streak on this habit is under a week. Plan around your usual trigger window today.`,
      });
    }
    // Milestone celebration
    if (d.relapses === 0 && d.days >= 7 && d.days % 7 === 0) {
      out.push({
        id: `habit-week:${h.id}:${d.days}`,
        priority: 70,
        title: `${d.days} clean days on "${h.name}"`,
        body: `${name}, that's ${Math.floor(d.days / 7)} full week${d.days >= 14 ? 's' : ''}. The hardest part is behind you.`,
      });
    }
  });

  // 3. Stale achievement (active too long)
  const stale = staleAchievements(S);
  if (stale.length > 0) {
    const a = stale[0];
    out.push({
      id: `stale-ach:${a.id}:${ymd()}`,
      priority: 60,
      title: `"${a.name}" has been waiting`,
      body: `${name}, big goals are easier in pieces. Want to break this into a few stepping-stone milestones?`,
      verb: { label: 'Split into milestones', action: 'split-achievement', args: { id: a.id } },
    });
  }

  // 4. Cross-domain win — multiple trackers up at once
  const streaks = activeStreaks(S);
  if (streaks.length >= 2) {
    const names = streaks.slice(0, 2).map(s => s.name).join(' and ');
    out.push({
      id: `cross-win:${streaks.map(s => s.id).join(',')}:${ymd()}`,
      priority: 55,
      title: 'You\'re firing on multiple fronts',
      body: `${name}, ${names} are both trending up this week. Momentum compounds — protect it.`,
    });
  }

  // 5. Coin milestones
  const coins = S.coins || 0;
  if (coins >= 1000) {
    out.push({
      id: `coins:1000`,
      priority: 50,
      title: `${coins} coins earned`,
      body: `${name}, that's serious consistency. Treat yourself from the shop — you've earned it.`,
    });
  } else if (coins >= 200) {
    out.push({
      id: `coins:200`,
      priority: 45,
      title: `${coins} coins and counting`,
      body: `${name}, your coin balance reflects real follow-through. Keep the streak.`,
    });
  }

  // 6. All achievements done
  const completedAchs = (S.achievements || []).filter(a => a.completed).length;
  const totalAchs = (S.achievements || []).length;
  if (totalAchs > 0 && completedAchs === totalAchs) {
    out.push({
      id: `all-done:${totalAchs}`,
      priority: 65,
      title: 'Every achievement complete',
      body: `${name}, you've finished the board. Time to dream bigger — what's next?`,
      verb: { label: 'Add new achievement', action: 'open-modal', args: { modalId: 'addAchievementModal' } },
    });
  }

  // 7. Empty state nudges (lowest priority)
  if ((S.habits || []).length === 0) {
    out.push({
      id: `empty:habits`,
      priority: 30,
      title: 'Pick a habit to break',
      body: `${name}, a single bad habit removed can transform a year. The streak timer starts the moment you add one.`,
      verb: { label: 'Add a habit', action: 'open-modal', args: { modalId: 'addHabitModal' } },
    });
  }
  if ((S.achievements || []).length === 0) {
    out.push({
      id: `empty:achs`,
      priority: 30,
      title: 'Set your first achievement',
      body: `${name}, your board is blank. What's one thing you want this year?`,
      verb: { label: 'Add achievement', action: 'open-modal', args: { modalId: 'addAchievementModal' } },
    });
  }

  // 8. Fallback — never return empty
  if (out.length === 0) {
    out.push({
      id: `default:${ymd()}`,
      priority: 10,
      title: 'Small actions compound',
      body: `${name}, your board is set. Show up today — that's the whole game.`,
    });
  }

  return out;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Pick the best insight for right now.
 *   S         — full app state
 *   seen      — array of insight IDs the user has already seen recently
 *
 * Returns a single insight, or null if nothing fits.
 */
export function pickInsight(S, seen = []) {
  const candidates = buildInsights(S);
  const seenSet = new Set(seen);
  const fresh = candidates.filter(c => !seenSet.has(c.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  pool.sort((a, b) => b.priority - a.priority);
  return pool[0] || null;
}

/**
 * Return all candidate insights (for debugging / coach panel).
 */
export function allInsights(S) {
  return buildInsights(S).sort((a, b) => b.priority - a.priority);
}

// Exported for testing
export const _internal = { trackerTrends, habitDanger, staleAchievements, activeStreaks };
