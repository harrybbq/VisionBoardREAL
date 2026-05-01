import { useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_STATE } from '../data/initialState';
import { supabase } from '../lib/supabase';

// Keys that are only relevant to the current session — never persisted
const TRANSIENT_KEYS = [
  'calYear', 'calMonth', 'ghCache', 'multiSelectedDays',
  'multiSelectMode', 'connectingFrom', 'selectedLogDate', 'shopFilter',
];

function addTransient(state) {
  return {
    ...state,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    ghCache: {},
    multiSelectedDays: [],
    multiSelectMode: false,
  };
}

function stripForSave(state) {
  const s = { ...state };
  TRANSIENT_KEYS.forEach(k => delete s[k]);
  // Photo stored in separate column
  s.profile = { ...s.profile, photo: null };
  return s;
}

// ── Cloud helpers ──────────────────────────────────────────────────────────
//
// History note (2026-05-01): the previous version of `loadFromCloud`
// returned a single null in three different cases:
//   1. row genuinely doesn't exist (PGRST116)
//   2. any other Supabase error (network blip, RLS hiccup, etc.)
//   3. row exists but `state` column is empty/missing
//
// init() then unconditionally called `saveToCloud(userId, DEFAULT_STATE)`
// on null. Result: a transient blip at login wiped a user's real data
// to defaults, with no warning, irreversibly.
//
// The new contract is a discriminated result: `{ kind, ... }`. Only
// `no_row` is safe to recover from with a default save. Anything else
// surfaces as a load error to the UI; we never auto-overwrite ambiguous
// state.

async function loadFromCloud(userId) {
  // maybeSingle() returns data:null + error:null when zero rows exist,
  // which lets us cleanly distinguish "no row" from "request failed".
  const { data, error } = await supabase
    .from('user_data')
    .select('state, photo')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // Anything from the network or RLS is unsafe to recover from
    // automatically. Throw — init() catches and parks the app in an
    // error state rather than overwriting with defaults.
    const e = new Error(error.message || 'Could not load your data.');
    e.cause = error;
    throw e;
  }

  if (!data) {
    // True "no row" — first-time login for this user. Caller will
    // create one with defaults (or migrated localStorage).
    return { kind: 'no_row' };
  }

  // Row exists. If `state` is null/missing/empty we treat it as
  // suspicious rather than auto-saving over it. This is the exact
  // shape that wiped the May 2026 row, and we will not let it
  // happen silently again.
  const stateOk =
    data.state &&
    typeof data.state === 'object' &&
    Object.keys(data.state).length > 0;

  if (!stateOk) {
    return { kind: 'empty_state', photo: data.photo };
  }

  const state = addTransient({ ...DEFAULT_STATE, ...data.state });
  if (data.photo) state.profile = { ...state.profile, photo: data.photo };
  return { kind: 'loaded', state };
}

async function saveToCloud(userId, state) {
  const stateToSave = stripForSave(state);
  const photo = state.profile?.photo || null;

  await supabase.from('user_data').upsert({
    id: userId,
    state: stateToSave,
    photo,
    updated_at: new Date().toISOString(),
  });
}

// ── localStorage fallback (migration source) ──────────────────────────────

function readLocalStorage() {
  try {
    const raw = localStorage.getItem('vb4_state');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = addTransient({ ...DEFAULT_STATE, ...parsed });
    const photo = localStorage.getItem('vb4_photo');
    if (photo) state.profile = { ...state.profile, photo };
    return state;
  } catch {
    return null;
  }
}

export function hasLocalStorageData() {
  return !!localStorage.getItem('vb4_state');
}

export function clearLocalStorageData() {
  localStorage.removeItem('vb4_state');
  localStorage.removeItem('vb4_photo');
}

// ── Main hook ─────────────────────────────────────────────────────────────

export function useVisionBoardState(userId) {
  const [S, setS] = useState(addTransient({ ...DEFAULT_STATE }));
  const [loading, setLoading] = useState(true);
  const [justMigrated, setJustMigrated] = useState(false);
  // loadError is null on success, otherwise an object the UI can use
  // to render an error screen. Specifically:
  //   { kind: 'load_failed', message }    — network / RLS / unknown
  //   { kind: 'empty_state', message }    — row exists but empty
  // Both states block any auto-save, so the user can hit "Try again"
  // (re-init) without risk.
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const saveTimer = useRef(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setLoadError(null);

      let result;
      try {
        result = await loadFromCloud(userId);
      } catch (e) {
        if (cancelled) return;
        setLoadError({
          kind: 'load_failed',
          message: e?.message || 'Could not reach the server. Check your connection and try again.',
        });
        setLoading(false);
        return;
      }

      if (cancelled) return;

      if (result.kind === 'loaded') {
        setS(result.state);
        setLoading(false);
        return;
      }

      if (result.kind === 'no_row') {
        // First-time user OR account that's never had data. Safe to
        // create a row with defaults (or migrated localStorage).
        const local = readLocalStorage();
        const initial = local ?? addTransient({ ...DEFAULT_STATE });
        try {
          await saveToCloud(userId, initial);
        } catch (e) {
          if (cancelled) return;
          setLoadError({
            kind: 'load_failed',
            message: e?.message || 'Could not create your initial data on the server.',
          });
          setLoading(false);
          return;
        }
        if (cancelled) return;
        if (local) setJustMigrated(true);
        setS(initial);
        setLoading(false);
        return;
      }

      // result.kind === 'empty_state' — row exists but state column
      // is empty/missing. Could be (a) corrupted save, (b) a recovery
      // operation in progress, (c) a user who explicitly cleared
      // their data. We refuse to overwrite. The UI prompts the user
      // to retry or escalate; "Start fresh" requires explicit consent.
      if (!cancelled) {
        setLoadError({
          kind: 'empty_state',
          message:
            'Your account exists but no saved data was found. ' +
            'This is unusual — refreshing may help. If the problem persists, ' +
            'please don\'t edit anything and reach out for help.',
        });
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  // reloadKey lets the user retry without unmounting the whole app.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reloadKey]);

  const update = useCallback((updater) => {
    setS(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };

      // Debounce cloud saves — 1.5 s after last change. Skip entirely
      // if we're parked on a load error: saving in that state could
      // overwrite the very data we're trying not to clobber.
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (userIdRef.current && !loadError) saveToCloud(userIdRef.current, next);
      }, 1500);

      return next;
    });
  }, [loadError]);

  function dismissMigrationBanner() {
    setJustMigrated(false);
  }

  function retryLoad() {
    setReloadKey(k => k + 1);
  }

  /**
   * Explicit user-confirmed reset. Only call this from a UI that has
   * shown the user the consequences (e.g. "Start fresh — this will
   * permanently overwrite any saved data"). Used to recover from the
   * `empty_state` error path when the user has decided to start over.
   */
  async function startFresh() {
    if (!userIdRef.current) return;
    const fresh = addTransient({ ...DEFAULT_STATE });
    try {
      await saveToCloud(userIdRef.current, fresh);
      setS(fresh);
      setLoadError(null);
    } catch (e) {
      setLoadError({
        kind: 'load_failed',
        message: e?.message || 'Could not save fresh state.',
      });
    }
  }

  return {
    S, update, loading, justMigrated, dismissMigrationBanner,
    loadError, retryLoad, startFresh,
  };
}
