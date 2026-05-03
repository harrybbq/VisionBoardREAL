/**
 * useCoachNudges — orchestrates proactive nudges from two sources:
 *
 *   1. SERVER nudges — written by the ai-coach-patterns Netlify
 *      scheduled function into the coach_nudges table. Pro-only.
 *      Until that function is enabled, this branch returns an empty
 *      list (the table just sits empty).
 *
 *   2. HEURISTIC nudges — generated client-side from the pattern
 *      snapshot (src/lib/coach/patterns.js → detectPatternsHeuristic).
 *      Free for all users. Cheap, deterministic, surfaces obvious
 *      patterns the LLM would also catch — but without API spend.
 *      Acts as a quality floor + free-tier value prop.
 *
 * Merge strategy: server nudges take priority and replace any
 * heuristic nudge with the same `signature`. Heuristic nudges fill
 * remaining slots up to MAX_VISIBLE.
 *
 * Mutations:
 *   - markSeen(id)      → sets seen_at on a server nudge (no-op for
 *                          heuristic nudges since they're ephemeral)
 *   - dismiss(id)       → sets dismissed_at on server nudges; for
 *                          heuristic nudges, stores the signature in
 *                          a localStorage skip-list so the same
 *                          heuristic doesn't re-fire next render
 *   - act(id, payload?) → sets acted_at + records what was tapped
 *
 * Returns: { nudges, dismiss, act, markSeen, loading, error }
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { buildPatternSnapshot, detectPatternsHeuristic } from '../lib/coach/patterns';

const MAX_VISIBLE = 3;
const HEURISTIC_DISMISS_KEY = 'vb4_coach_heuristic_dismissed';
const HEURISTIC_DISMISS_TTL_DAYS = 7;

// ── Local persistence for heuristic dismissals ──
function loadHeuristicDismissed() {
  try {
    const raw = localStorage.getItem(HEURISTIC_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Prune anything past TTL so dismissed nudges can resurface if
    // the underlying pattern is still true two weeks later.
    const cutoff = Date.now() - HEURISTIC_DISMISS_TTL_DAYS * 86_400_000;
    const out = {};
    for (const [sig, ts] of Object.entries(parsed)) {
      if (ts > cutoff) out[sig] = ts;
    }
    return out;
  } catch { return {}; }
}

function saveHeuristicDismissed(map) {
  try { localStorage.setItem(HEURISTIC_DISMISS_KEY, JSON.stringify(map)); } catch {}
}

// Heuristic nudges from detectPatternsHeuristic are plain strings.
// Wrap them in the same shape as server rows so the consumer doesn't
// have to switch on source.
function heuristicToNudge(text, idx) {
  // Stable signature so dismissals carry across renders. Includes
  // a short content hash so two different "Wednesday is your weakest"
  // strings (different trackers) get different signatures.
  const sig = 'heuristic:' + simpleHash(text);
  return {
    id: sig,
    user_id: null,
    family: 'heuristic',
    signature: sig,
    title: text.split('.')[0] + '.',  // first sentence is the headline
    body: text,
    verbs: [],
    detected_at: new Date().toISOString(),
    seen_at: null,
    dismissed_at: null,
    acted_at: null,
    feedback: null,
    _source: 'heuristic',
    _index: idx,
  };
}

function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

export function useCoachNudges(S, userId) {
  const [serverNudges, setServerNudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [heuristicDismissed, setHeuristicDismissed] = useState(loadHeuristicDismissed);

  // ── Pull server nudges ──
  // Driven by userId so we re-fetch on sign-in. Cheap query (RLS
  // limits to own rows; partial index keeps it fast).
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setServerNudges([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('coach_nudges_active')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Table or view may not exist yet — fall through to heuristics.
          // Don't surface as a fatal error.
          setError(null);
          setServerNudges([]);
        } else {
          setServerNudges((data || []).map(n => ({ ...n, _source: 'server' })));
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // ── Compute heuristic nudges from current state ──
  // Wrapped in useMemo so it doesn't recompute every render — only
  // when state shape changes. The pattern snapshot itself is O(N×M)
  // for N trackers × M days (default 90), so cheap but worth memoising.
  const heuristicNudges = useMemo(() => {
    if (!S || !S.trackers) return [];
    let snapshot;
    try { snapshot = buildPatternSnapshot(S, { days: 60 }); }
    catch { return []; }
    const strings = detectPatternsHeuristic(snapshot);
    return strings.map(heuristicToNudge).filter(n => !heuristicDismissed[n.signature]);
  }, [S, heuristicDismissed]);

  // ── Merge: server takes priority, then heuristic fills remaining slots ──
  const nudges = useMemo(() => {
    const seenSigs = new Set();
    const result = [];
    for (const n of serverNudges) {
      if (n.signature) seenSigs.add(n.signature);
      result.push(n);
      if (result.length >= MAX_VISIBLE) return result;
    }
    for (const n of heuristicNudges) {
      if (n.signature && seenSigs.has(n.signature)) continue;
      result.push(n);
      if (result.length >= MAX_VISIBLE) return result;
    }
    return result;
  }, [serverNudges, heuristicNudges]);

  // ── Mutations ──
  const dismiss = useCallback(async (id) => {
    const target = nudges.find(n => n.id === id);
    if (!target) return;

    if (target._source === 'heuristic') {
      // Local skip-list keyed by signature, with TTL pruning on read
      const next = { ...heuristicDismissed, [target.signature]: Date.now() };
      setHeuristicDismissed(next);
      saveHeuristicDismissed(next);
      return;
    }

    // Server nudge — patch dismissed_at. Optimistic local update.
    setServerNudges(prev => prev.filter(n => n.id !== id));
    try {
      await supabase
        .from('coach_nudges')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id);
    } catch {
      // Silent — worst case the nudge re-appears on next load and the
      // user dismisses again.
    }
  }, [nudges, heuristicDismissed]);

  const act = useCallback(async (id, payload) => {
    const target = nudges.find(n => n.id === id);
    if (!target) return;

    if (target._source === 'heuristic') {
      // Acting on a heuristic nudge counts as dismissing it for now —
      // no server row to update. The action handler upstream owns the
      // actual side effect (navigate, log a tracker, etc).
      return dismiss(id);
    }

    setServerNudges(prev => prev.filter(n => n.id !== id));
    try {
      await supabase
        .from('coach_nudges')
        .update({ acted_at: new Date().toISOString() })
        .eq('id', id);
    } catch {}
    return payload;
  }, [nudges, dismiss]);

  const markSeen = useCallback(async (id) => {
    const target = nudges.find(n => n.id === id);
    if (!target || target._source !== 'server' || target.seen_at) return;
    // Local-only optimistic update (don't reorder/re-render the list)
    setServerNudges(prev => prev.map(n =>
      n.id === id ? { ...n, seen_at: new Date().toISOString() } : n
    ));
    try {
      await supabase
        .from('coach_nudges')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', id);
    } catch {}
  }, [nudges]);

  return { nudges, dismiss, act, markSeen, loading, error };
}
