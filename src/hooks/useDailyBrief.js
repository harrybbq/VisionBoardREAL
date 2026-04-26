import { useEffect, useRef, useState } from 'react';
import { buildSnapshot } from '../lib/coach/snapshot';

/**
 * Fetch the AI Coach daily brief once per UTC day per user, with the
 * cached result stored on the cloud state under `S.coachBrief`.
 *
 * Also maintains a rolling `coachBriefHistory` (last 7 briefs) so the
 * snapshot can include "what you said yesterday and the day before"
 * — without that, identical state two days running produces identical
 * advice from the model.
 *
 *   S         — full app state (must already be loaded)
 *   update    — useVisionBoardState updater (so we can persist the cache)
 *   isPro     — when false the hook is a no-op (saves API calls)
 *
 * Returns:
 *   { brief, loading, error, refresh }
 */
const HISTORY_LIMIT = 7;

export function useDailyBrief({ S, update, isPro }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const today = new Date().toISOString().slice(0, 10);
  const cached = S?.coachBrief;
  const cacheValid = cached && cached.date === today;
  const brief = cacheValid ? cached : null;

  async function fetchBrief(force = false) {
    if (!isPro) return;
    if (!force && cacheValid) return;
    if (inFlight.current) return;
    if (!S || !S.profile) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const snapshot = buildSnapshot(S);
      const res = await fetch('/.netlify/functions/ai-coach-daily', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coach request failed');
      const payload = { ...data, date: today };
      update(prev => {
        // Append to history, trim to the last N. If we already have an
        // entry for today (rare — happens on manual refresh) replace
        // it instead of duplicating.
        const prevHistory = Array.isArray(prev.coachBriefHistory) ? prev.coachBriefHistory : [];
        const filtered = prevHistory.filter(b => b.date !== today);
        const nextHistory = [
          ...filtered,
          { date: today, focus: payload.focus, watch: payload.watch, micro: payload.micro },
        ].slice(-HISTORY_LIMIT);
        return {
          ...prev,
          coachBrief: payload,
          coachBriefHistory: nextHistory,
        };
      });
    } catch (e) {
      setError(e.message || 'Coach unavailable');
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    fetchBrief(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, today, S?.profile?.name]);

  return { brief, loading, error, refresh: () => fetchBrief(true) };
}
