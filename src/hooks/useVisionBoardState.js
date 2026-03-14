import { useState, useCallback } from 'react';
import { DEFAULT_STATE } from '../data/initialState';

function loadState() {
  try {
    const r = localStorage.getItem('vb4_state');
    let state = { ...DEFAULT_STATE };
    if (r) {
      const d = JSON.parse(r);
      state = {
        ...state,
        ...d,
        calYear: new Date().getFullYear(),
        calMonth: new Date().getMonth(),
        ghCache: {},
        multiSelectedDays: [],
        multiSelectMode: false,
      };
    }
    const ph = localStorage.getItem('vb4_photo');
    if (ph) state.profile = { ...state.profile, photo: ph };
    return state;
  } catch (e) {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state) {
  try {
    const toSave = JSON.parse(JSON.stringify(state));
    toSave.profile = { ...toSave.profile, photo: null };
    toSave.ghCache = {};
    localStorage.setItem('vb4_state', JSON.stringify(toSave));
    if (state.profile.photo) localStorage.setItem('vb4_photo', state.profile.photo);
  } catch (e) {
    console.warn('Storage error', e);
  }
}

export function useVisionBoardState() {
  const [S, setS] = useState(() => loadState());

  const update = useCallback((updater) => {
    setS(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveState(next);
      return next;
    });
  }, []);

  return { S, update };
}
