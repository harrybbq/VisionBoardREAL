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

async function loadFromCloud(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('state, photo')
    .eq('id', userId)
    .single();

  // PGRST116 = no rows returned (new user)
  if (error?.code === 'PGRST116' || !data) return null;
  if (!data.state || Object.keys(data.state).length === 0) return null;

  const state = addTransient({ ...DEFAULT_STATE, ...data.state });
  if (data.photo) state.profile = { ...state.profile, photo: data.photo };
  return state;
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
  const saveTimer = useRef(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    async function init() {
      setLoading(true);

      let cloudState = await loadFromCloud(userId);

      if (!cloudState) {
        // First ever login — migrate existing localStorage data if present
        const local = readLocalStorage();
        cloudState = local ?? addTransient({ ...DEFAULT_STATE });
        await saveToCloud(userId, cloudState);
        if (local) setJustMigrated(true);
      }

      setS(cloudState);
      setLoading(false);
    }

    init();
  }, [userId]);

  const update = useCallback((updater) => {
    setS(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };

      // Debounce cloud saves — 1.5 s after last change
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (userIdRef.current) saveToCloud(userIdRef.current, next);
      }, 1500);

      return next;
    });
  }, []);

  function dismissMigrationBanner() {
    setJustMigrated(false);
  }

  return { S, update, loading, justMigrated, dismissMigrationBanner };
}
